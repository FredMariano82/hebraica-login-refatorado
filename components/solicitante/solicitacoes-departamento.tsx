"use client"

import { useState, useEffect } from "react"
import {
  Filter,
  Search,
  Users,
  AlertTriangle,
  RotateCcw,
  Eye,
  Columns,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "../../contexts/auth-context"
import {
  StatusChecagemBadge,
  StatusChecagemIcon,
  StatusCadastroBadge,
  StatusCadastroIcon,
  getChecagemStatus,
  getCadastroStatus,
} from "../ui/status-badges"
import { isDateExpired } from "../../utils/date-helpers"
import { isAccessExpiringSoon } from "../../utils/status-helpers"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSolicitacoesByDepartamento } from "../../services/solicitacoes-service"
import { formatarDataParaBR } from "../../utils/date-helpers"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DataInicialIndicator } from "../../utils/date-indicators"

// Definir todas as colunas disponíveis para o Solicitante
const COLUNAS_DISPONIVEIS = [
  { key: "numero", label: "Número" },
  { key: "dataSolicitacao", label: "Data Solicitação" },
  { key: "empresa", label: "Empresa" },
  { key: "prestador", label: "Prestador" },
  { key: "documento", label: "Documento" },
  { key: "documento2", label: "Documento2" },
  { key: "dataInicial", label: "Data Inicial" },
  { key: "dataFinal", label: "Data Final" },
  { key: "liberacao", label: "Liberação" },
  { key: "checagem", label: "Checagem" },
  { key: "validaAte", label: "Válida até" },
  { key: "observacoes", label: "Observações" },
]

export default function SolicitacoesDepartamento() {
  const { usuario } = useAuth()
  const router = useRouter()
  const [filtroStatus, setFiltroStatus] = useState<string>("todos")
  const [filtroCadastro, setFiltroCadastro] = useState<string>("todos")
  const [filtroSolicitante, setFiltroSolicitante] = useState<string>("todos")
  const [buscaGeral, setBuscaGeral] = useState<string>("")
  const [solicitacoesReais, setSolicitacoesReais] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [prestadorSelecionado, setPrestadorSelecionado] = useState<{
    solicitacao: any
    prestador: any
  } | null>(null)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const PRESTADORES_POR_PAGINA = 10

  // Estados para configuração de colunas
  const [modalColunasAberto, setModalColunasAberto] = useState(false)
  const [carregandoDownload, setCarregandoDownload] = useState(false)
  const [colunasVisiveis, setColunasVisiveis] = useState<Record<string, boolean>>(() => {
    // Tentar carregar do localStorage
    if (typeof window !== "undefined") {
      const salvas = localStorage.getItem("solicitante-departamento-colunas-visiveis")
      if (salvas) {
        return JSON.parse(salvas)
      }
    }
    // Estado inicial: todas as colunas visíveis
    const estadoInicial = COLUNAS_DISPONIVEIS.reduce(
      (acc, coluna) => {
        acc[coluna.key] = true
        return acc
      },
      {} as Record<string, boolean>,
    )
    return estadoInicial
  })

  // Salvar preferências no localStorage sempre que mudar
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("solicitante-departamento-colunas-visiveis", JSON.stringify(colunasVisiveis))
    }
  }, [colunasVisiveis])

  // Função para alternar visibilidade da coluna
  const toggleColuna = (chaveColuna: string) => {
    setColunasVisiveis((prev) => ({
      ...prev,
      [chaveColuna]: !prev[chaveColuna],
    }))
  }

  // Função para mostrar/esconder todas as colunas
  const toggleTodasColunas = (mostrar: boolean) => {
    const novoEstado = COLUNAS_DISPONIVEIS.reduce(
      (acc, coluna) => {
        acc[coluna.key] = mostrar
        return acc
      },
      {} as Record<string, boolean>,
    )
    setColunasVisiveis(novoEstado)
  }

  const normalizeString = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
  }

  const getPrioridade = (prestador: any) => {
    if (prestador.status === "pendente" && prestador.cadastro === "urgente") return 1
    if (prestador.status === "pendente" && prestador.cadastro === "pendente") return 2
    return 3
  }

  const buscarSolicitacoesDepartamento = async () => {
    try {
      setCarregando(true)
      if (usuario?.departamento) {
        const solicitacoes = await getSolicitacoesByDepartamento(usuario.departamento)
        setSolicitacoesReais(solicitacoes)
      }
    } catch (error) {
      console.error("Erro ao buscar solicitações:", error)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    buscarSolicitacoesDepartamento()
  }, [usuario?.departamento])

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPaginaAtual(1)
  }, [filtroStatus, filtroCadastro, filtroSolicitante, buscaGeral])

  if (carregando) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-600"></div>
      </div>
    )
  }

  const solicitantesDepartamento = Array.from(
    new Set(solicitacoesReais.filter((s) => s.departamento === usuario?.departamento).map((s) => s.solicitante)),
  ).sort()

  const dadosFiltrados = solicitacoesReais
    .filter((solicitacao) => solicitacao.departamento === usuario?.departamento)
    .map((solicitacao) => {
      const solicitanteMatch = filtroSolicitante === "todos" || solicitacao.solicitante === filtroSolicitante
      if (!solicitanteMatch) return null

      let buscaMatch = true
      if (buscaGeral) {
        const buscaNormalizada = normalizeString(buscaGeral)
        const solicitacaoNormalizada = normalizeString(JSON.stringify(solicitacao))
        buscaMatch = solicitacaoNormalizada.includes(buscaNormalizada)
      }
      if (!buscaMatch) return null

      const prestadoresFiltrados = solicitacao.prestadores.filter((prestador: any) => {
        const checagemStatusReal = getChecagemStatus(prestador)
        const cadastroStatusReal = getCadastroStatus(prestador, solicitacao.dataFinal)

        let statusMatch = filtroStatus === "todos"
        if (filtroStatus === "vencida") statusMatch = checagemStatusReal === "vencida"
        else if (filtroStatus !== "todos") statusMatch = prestador.status === filtroStatus

        let cadastroMatch = filtroCadastro === "todos"
        if (filtroCadastro === "vencida") cadastroMatch = cadastroStatusReal === "vencida"
        else if (filtroCadastro !== "todos") cadastroMatch = prestador.cadastro === filtroCadastro

        return statusMatch && cadastroMatch
      })

      if (prestadoresFiltrados.length > 0) {
        return { ...solicitacao, prestadores: prestadoresFiltrados }
      }
      return null
    })
    .filter((s) => s !== null)

  const dadosOrdenados = dadosFiltrados
    .flatMap((solicitacao) =>
      solicitacao.prestadores.map((prestador) => ({
        solicitacao,
        prestador,
        prioridade: getPrioridade(prestador),
      })),
    )
    .sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade
      const dataA = new Date(a.solicitacao.dataSolicitacao.split("/").reverse().join("-"))
      const dataB = new Date(b.solicitacao.dataSolicitacao.split("/").reverse().join("-"))
      return dataB.getTime() - dataA.getTime()
    })

  // Calcular paginação
  const totalPrestadores = dadosOrdenados.length
  const totalPaginas = Math.ceil(totalPrestadores / PRESTADORES_POR_PAGINA)
  const indiceInicio = (paginaAtual - 1) * PRESTADORES_POR_PAGINA
  const indiceFim = indiceInicio + PRESTADORES_POR_PAGINA
  const dadosPaginados = dadosOrdenados.slice(indiceInicio, indiceFim)

  const handlePaginaAnterior = () => {
    if (paginaAtual > 1) {
      setPaginaAtual(paginaAtual - 1)
    }
  }

  const handleProximaPagina = () => {
    if (paginaAtual < totalPaginas) {
      setPaginaAtual(paginaAtual + 1)
    }
  }

  const totalSolicitacoesDepartamento = solicitacoesReais.filter((s) => s.departamento === usuario?.departamento).length
  const minhasSolicitacoes = dadosPaginados.filter(({ solicitacao }) => solicitacao.solicitante === usuario?.nome)
  const outrassolicitacoes = dadosPaginados.filter(({ solicitacao }) => solicitacao.solicitante !== usuario?.nome)
  const totalPrestadoresFiltrados = dadosOrdenados.length

  const deveExibirBotaoRenovar = (prestador: any, dataFinal: string) => {
    const checagemStatus = getChecagemStatus(prestador)
    const cadastroStatus = getCadastroStatus(prestador, dataFinal)
    if (checagemStatus === "vencida" || cadastroStatus === "vencida") return true
    if (prestador.checagemValidaAte && isDateExpired(prestador.checagemValidaAte)) return false
    if (prestador.checagemValidaAte && isAccessExpiringSoon(prestador.checagemValidaAte)) return true
    if (dataFinal && isAccessExpiringSoon(dataFinal)) return true
    return false
  }

  const handleRenovar = (solicitacao: any) => {
    const dadosRenovacao = {
      tipoSolicitacao: solicitacao.tipoSolicitacao,
      local: solicitacao.local,
      empresa: solicitacao.empresa,
      prestadores: solicitacao.prestadores.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        documento: p.documento,
      })),
      dataInicial: "",
      dataFinal: "",
    }

    // Save to sessionStorage and navigate
    if (typeof window !== "undefined") {
      sessionStorage.setItem("renovacao_temp", JSON.stringify(dadosRenovacao))
    }
    router.push("/solicitante/nova-solicitacao")
  }
  const handleVisualizarSolicitacao = (solicitacao: any, prestador: any) => {
    setPrestadorSelecionado({ solicitacao, prestador })
    setDialogAberto(true)
  }

  const handleDownloadExcel = async () => {
    try {
      setCarregandoDownload(true)
      console.log("📊 Iniciando download Excel - Solicitante Departamento")

      // Importar XLSX dinamicamente
      const XLSX = await import("xlsx")

      // Configurar XLSX para browser
      XLSX.set_fs({})

      // Preparar dados para Excel
      const dadosParaExportar = dadosOrdenados.map((item, index) => ({
        "#": index + 1,
        Prestador: item.prestador.nome,
        Documento: item.prestador.documento,
        Documento2: item.prestador.documento2 || "-",
        "Data Inicial": item.solicitacao.dataInicial,
        "Data Final": item.solicitacao.dataFinal,
        "Status Liberação": getCadastroStatus(item.prestador, item.solicitacao.dataFinal),
        "Status Checagem": getChecagemStatus(item.prestador),
        "Válida até": item.prestador.checagemValidaAte ? formatarDataParaBR(item.prestador.checagemValidaAte) : "-",
        Observações: item.prestador.observacoes || "-",
        Departamento: item.solicitacao.departamento,
        "Número da Solicitação": item.solicitacao.numero,
      }))

      // Criar workbook
      const wb = XLSX.utils.book_new()

      // Criar worksheet com os dados
      const ws = XLSX.utils.json_to_sheet(dadosParaExportar)

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, "Dados")

      // Criar aba de resumo
      const resumo = [
        { Métrica: "Total de Prestadores", Valor: dadosParaExportar.length },
        { Métrica: "Departamento", Valor: usuario?.departamento || "-" },
        { Métrica: "Data de Geração", Valor: new Date().toLocaleString("pt-BR") },
        { Métrica: "Usuário", Valor: usuario?.nome || "-" },
      ]

      const wsResumo = XLSX.utils.json_to_sheet(resumo)
      XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo")

      // Gerar nome do arquivo
      const agora = new Date()
      const dataFormatada = agora.toLocaleDateString("pt-BR").replace(/\//g, "-")
      const nomeArquivo = `solicitacoes_departamento_${dataFormatada}.xlsx`

      // Gerar e baixar arquivo Excel
      const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([arrayBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", nomeArquivo)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log("✅ Download Excel concluído:", dadosParaExportar.length, "registros")
    } catch (error) {
      console.error("❌ Erro no download Excel:", error)
      alert("Erro ao gerar arquivo Excel. Tente novamente.")
    } finally {
      setCarregandoDownload(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-slate-800 text-center flex items-center justify-center gap-2">
              <Users className="h-6 w-6" />
              Solicitações do Departamento {usuario?.departamento}
            </CardTitle>
            <div className="w-24 h-1 bg-slate-600 mx-auto rounded-full"></div>
          </CardHeader>

          <CardContent>
            <Alert className="mb-6 border-slate-200 bg-slate-50">
              <Users className="h-4 w-4 text-slate-600" />
              <AlertDescription className="text-slate-700">
                Visualizando solicitações do departamento <strong>{usuario?.departamento}</strong>. Total:{" "}
                <strong>{totalSolicitacoesDepartamento}</strong> solicitações ({minhasSolicitacoes.length} suas,{" "}
                {outrassolicitacoes.length} de outros colegas)
              </AlertDescription>
            </Alert>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-slate-600" />
                <Label className="text-lg font-medium text-slate-700">Filtros</Label>

                {/* Botão Modal de Colunas */}
                <Button
                  onClick={() => setModalColunasAberto(true)}
                  variant="outline"
                  size="sm"
                  className="ml-auto border-slate-600 text-slate-600 hover:bg-slate-50"
                >
                  <Columns className="h-4 w-4 mr-1" />
                  Colunas
                </Button>

                {/* Botão Download */}
                <Button
                  onClick={handleDownloadExcel}
                  disabled={carregandoDownload}
                  variant="outline"
                  size="sm"
                  className="ml-2 border-slate-600 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  {carregandoDownload ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-green-600 mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </>
                  )}
                </Button>

                {/* Modal de Colunas */}
                {modalColunasAberto && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Overlay */}
                    <div
                      className="fixed inset-0 bg-black bg-opacity-50"
                      onClick={() => setModalColunasAberto(false)}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-blue-800">🔧 Configurar Colunas</h2>
                        <Button
                          onClick={() => setModalColunasAberto(false)}
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {/* Botões para selecionar/deselecionar todas */}
                        <div className="flex gap-2 pb-2 border-b border-blue-200">
                          <Button
                            onClick={() => toggleTodasColunas(true)}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-green-600 text-green-600 hover:bg-green-50"
                          >
                            ✅ Mostrar Todas
                          </Button>
                          <Button
                            onClick={() => toggleTodasColunas(false)}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                          >
                            ❌ Esconder Todas
                          </Button>
                        </div>

                        {/* Lista de checkboxes para cada coluna */}
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {COLUNAS_DISPONIVEIS.map((coluna) => (
                            <div key={coluna.key} className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                id={coluna.key}
                                checked={colunasVisiveis[coluna.key] || false}
                                onChange={() => toggleColuna(coluna.key)}
                                className="h-4 w-4 text-blue-600 border-blue-300 rounded focus:ring-blue-500"
                              />
                              <label htmlFor={coluna.key} className="text-sm font-medium text-blue-700 cursor-pointer">
                                {coluna.label}
                              </label>
                            </div>
                          ))}
                        </div>

                        {/* Resumo */}
                        <div className="pt-2 border-t border-blue-200 text-center">
                          <p className="text-xs text-blue-600">
                            {Object.values(colunasVisiveis).filter(Boolean).length} de {COLUNAS_DISPONIVEIS.length}{" "}
                            colunas visíveis
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Checagem */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Status Checagem</Label>
                  <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="aprovado">Aprovado</SelectItem>
                      <SelectItem value="reprovado">Reprovado</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Status Liberação</Label>
                  <Select value={filtroCadastro} onValueChange={setFiltroCadastro}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Selecione o cadastro" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="ok">Ok</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="vencida">Vencida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Solicitante é</Label>
                  <Select value={filtroSolicitante} onValueChange={setFiltroSolicitante}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Selecione o solicitante" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {solicitantesDepartamento.map((solicitante) => (
                        <SelectItem key={solicitante} value={solicitante}>
                          {solicitante}
                          {solicitante === usuario?.nome && " (Você)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Busca Geral */}
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Busca Geral</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Buscar..."
                      value={buscaGeral}
                      onChange={(e) => setBuscaGeral(e.target.value)}
                      className="border-slate-300 pr-10"
                    />
                    <Search className="h-4 w-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Informações de Paginação */}
            <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
              <div>
                <strong>
                  Mostrando {indiceInicio + 1} - {Math.min(indiceFim, totalPrestadores)} de {totalPrestadores}{" "}
                  prestadores
                </strong>
              </div>
              <div>
                <strong>
                  Página {paginaAtual} de {totalPaginas}
                </strong>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-x-auto">
              <Table className="min-w-[1530px]">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    {colunasVisiveis.numero && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[120px] whitespace-nowrap">
                        Número
                      </TableHead>
                    )}
                    {colunasVisiveis.dataSolicitacao && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[110px] whitespace-nowrap">
                        Data Solicitação
                      </TableHead>
                    )}
                    {colunasVisiveis.empresa && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[180px]">Empresa</TableHead>
                    )}
                    {colunasVisiveis.prestador && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[160px]">
                        Prestador
                      </TableHead>
                    )}
                    {colunasVisiveis.documento && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[130px]">
                        Documento
                      </TableHead>
                    )}
                    {colunasVisiveis.documento2 && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[130px]">
                        Documento2
                      </TableHead>
                    )}
                    {colunasVisiveis.dataInicial && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[100px] whitespace-nowrap">
                        Data Inicial
                      </TableHead>
                    )}
                    {colunasVisiveis.dataFinal && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[100px] whitespace-nowrap">
                        Data Final
                      </TableHead>
                    )}
                    {colunasVisiveis.liberacao && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[90px]">Liberação</TableHead>
                    )}
                    {colunasVisiveis.checagem && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[100px]">Checagem</TableHead>
                    )}
                    {colunasVisiveis.validaAte && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[130px] whitespace-nowrap">
                        Válida até
                      </TableHead>
                    )}
                    <TableHead className="font-semibold text-slate-800 text-center min-w-[80px]">Ações</TableHead>
                    {colunasVisiveis.observacoes && (
                      <TableHead className="font-semibold text-slate-800 text-center min-w-[200px]">
                        Observações
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosPaginados.map(({ solicitacao, prestador, prioridade }, index) => {
                    const prestadorIndex = solicitacao.prestadores.findIndex((p) => p.id === prestador.id)
                    // Remover esta linha:
                    // const isFirstPrestadorOfSolicitacao = index === 0 || dadosOrdenados[index - 1].solicitacao.id !== solicitacao.id
                    const checagemStatus = getChecagemStatus(prestador)
                    const cadastroStatus = getCadastroStatus(prestador, solicitacao.dataFinal)

                    return (
                      <TableRow
                        key={`${solicitacao.id}-${prestador.id}`}
                        className={`hover:bg-slate-50 ${solicitacao.solicitante === usuario?.nome ? "bg-slate-25 border-l-4 border-l-slate-500" : ""
                          } ${prestadorIndex > 0 ? "border-l-4 border-l-slate-200 bg-slate-25" : ""}`}
                      >
                        {colunasVisiveis.numero && (
                          <TableCell className="font-medium text-sm whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Indicador de prioridade */}
                              {prestador.status === "pendente" && prestador.cadastro === "urgente" && (
                                <div
                                  className="w-2 h-2 bg-red-500 rounded-full"
                                  title="Prioridade ALTA - Urgente"
                                ></div>
                              )}
                              {prestador.status === "pendente" && prestador.cadastro === "pendente" && (
                                <div className="w-2 h-2 bg-slate-500 rounded-full" title="Prioridade NORMAL"></div>
                              )}
                              {solicitacao.numero}
                              {solicitacao.solicitante === usuario?.nome && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Minha
                                </Badge>
                              )}
                              {solicitacao.statusGeral === "parcial" && (
                                <AlertTriangle
                                  className="h-4 w-4 text-orange-500"
                                  title="Status misto entre prestadores"
                                />
                              )}
                            </div>
                          </TableCell>
                        )}
                        {colunasVisiveis.dataSolicitacao && (
                          <TableCell className="text-sm whitespace-nowrap text-center">
                            {solicitacao.dataSolicitacao}
                          </TableCell>
                        )}
                        {colunasVisiveis.empresa && (
                          <TableCell className="text-sm text-center">{solicitacao.empresa}</TableCell>
                        )}
                        {colunasVisiveis.prestador && (
                          <TableCell className="text-sm text-center">
                            <div className="whitespace-nowrap font-medium flex items-center justify-center gap-2">
                              {/* Indicador de prioridade no nome do prestador */}
                              {prestador.status === "pendente" && prestador.cadastro === "urgente" && (
                                <div
                                  className="w-2 h-2 bg-red-500 rounded-full"
                                  title="Prioridade ALTA - Urgente"
                                ></div>
                              )}
                              {prestador.status === "pendente" && prestador.cadastro === "pendente" && (
                                <div className="w-2 h-2 bg-slate-500 rounded-full" title="Prioridade NORMAL"></div>
                              )}
                              {prestador.nome}
                            </div>
                          </TableCell>
                        )}
                        {colunasVisiveis.documento && (
                          <TableCell className="text-sm text-center">
                            <div className="text-xs font-mono whitespace-nowrap">{prestador.documento}</div>
                          </TableCell>
                        )}
                        {colunasVisiveis.documento2 && (
                          <TableCell className="text-sm text-center">
                            <div className="text-xs font-mono whitespace-nowrap">{prestador.documento2 || "-"}</div>
                          </TableCell>
                        )}
                        {colunasVisiveis.dataInicial && (
                          <TableCell className="text-sm whitespace-nowrap text-center">
                            <DataInicialIndicator
                              dataInicial={solicitacao.dataInicial}
                              isReprovado={prestador.status === "reprovado"}
                            />
                          </TableCell>
                        )}
                        {colunasVisiveis.dataFinal && (
                          <TableCell className="text-sm whitespace-nowrap text-center">
                            {prestador.status === "reprovado" ? (
                              <span className="text-slate-400">-</span>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  className={isDateExpired(solicitacao.dataFinal) ? "text-red-600 font-medium" : ""}
                                >
                                  {solicitacao.dataFinal}
                                </span>
                                {isDateExpired(solicitacao.dataFinal) && (
                                  <AlertTriangle className="h-4 w-4 text-red-600" title="Acesso vencido" />
                                )}
                              </div>
                            )}
                          </TableCell>
                        )}
                        {colunasVisiveis.liberacao && (
                          <TableCell className="whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <StatusCadastroIcon status={cadastroStatus} />
                              <StatusCadastroBadge status={cadastroStatus} />
                            </div>
                          </TableCell>
                        )}
                        {colunasVisiveis.checagem && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                              <StatusChecagemIcon status={checagemStatus} />
                              <StatusChecagemBadge status={checagemStatus} />
                            </div>
                          </TableCell>
                        )}
                        {colunasVisiveis.validaAte && (
                          <TableCell className="text-sm whitespace-nowrap text-center">
                            {prestador.checagemValidaAte ? (
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  className={
                                    isDateExpired(prestador.checagemValidaAte) ? "text-red-600 font-medium" : ""
                                  }
                                >
                                  {formatarDataParaBR(prestador.checagemValidaAte)}
                                </span>
                                {isDateExpired(prestador.checagemValidaAte) && (
                                  <AlertTriangle className="h-4 w-4 text-red-600" title="Checagem vencida" />
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {/* Botão Visualizar - sempre aparece */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVisualizarSolicitacao(solicitacao, prestador)}
                              className="h-7 w-7 p-0"
                              title="Visualizar detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Botão Renovar - aparece para prestadores específicos */}
                            {deveExibirBotaoRenovar(prestador, solicitacao.dataFinal) && (
                              <Button
                                onClick={() => handleRenovar(solicitacao)}
                                variant="outline"
                                size="sm"
                                className="border-green-600 text-green-600 hover:bg-green-50 h-7 w-7 p-0 ml-1"
                                title="Renovar solicitação"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        {colunasVisiveis.observacoes && (
                          <TableCell className="text-sm text-center max-w-[200px]">
                            {prestador.observacoes ? (
                              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200 whitespace-pre-wrap break-words">
                                {prestador.observacoes}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {dadosFiltrados.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>Nenhum prestador encontrado com os filtros aplicados.</p>
              </div>
            )}

            <div className="mt-6 text-sm text-slate-600 flex justify-between">
              <span>
                Mostrando <strong>{totalPrestadores}</strong> prestadores de{" "}
                <strong>{totalSolicitacoesDepartamento}</strong> solicitações do departamento
              </span>
              <span>
                <strong>{minhasSolicitacoes.length}</strong> seus prestadores •{" "}
                <strong>{outrassolicitacoes.length}</strong> de colegas (nesta página)
              </span>
            </div>

            {/* Controles de Paginação */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <strong>Total:</strong> {totalPrestadores} prestadores
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handlePaginaAnterior}
                  disabled={paginaAtual === 1}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-600 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>

                <span className="text-sm text-slate-600 px-3">
                  {paginaAtual} / {totalPaginas}
                </span>

                <Button
                  onClick={handleProximaPagina}
                  disabled={paginaAtual === totalPaginas}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-600 disabled:opacity-50"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Dialog para visualização - igual ao do GESTOR */}
      <Dialog
        open={dialogAberto}
        onOpenChange={(open) => {
          setDialogAberto(open)
          if (!open) {
            setPrestadorSelecionado(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
          </DialogHeader>

          {prestadorSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold">Número da Solicitação:</h4>
                  <p>{prestadorSelecionado.solicitacao.numero}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Solicitante:</h4>
                  <p>{prestadorSelecionado.solicitacao.solicitante}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Departamento:</h4>
                  <p>{prestadorSelecionado.solicitacao.departamento}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Empresa:</h4>
                  <p>{prestadorSelecionado.solicitacao.empresa}</p>
                </div>
                <div>
                  <h4 className="font-semibold">Local:</h4>
                  <p>{prestadorSelecionado.solicitacao.local}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold">Prestador:</h4>
                <p>
                  {prestadorSelecionado.prestador.nome} - {prestadorSelecionado.prestador.documento}
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Status da Checagem:</h4>
                <div className="flex items-center gap-2">
                  <StatusChecagemIcon status={getChecagemStatus(prestadorSelecionado.prestador)} />
                  <StatusChecagemBadge status={getChecagemStatus(prestadorSelecionado.prestador)} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
