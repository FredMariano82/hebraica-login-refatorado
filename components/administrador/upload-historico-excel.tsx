"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { ExcelService, type PrestadorExcelADM } from "@/services/excel-service"

interface UploadHistoricoExcelProps {
  onUploadCompleto?: (totalSalvos: number) => void
}

export default function UploadHistoricoExcel({ onUploadCompleto }: UploadHistoricoExcelProps) {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [progresso, setProgresso] = useState(0)
  const [resultado, setResultado] = useState<{
    sucesso: boolean
    erro: string
    totalProcessados: number
    totalSalvos: number
    totalErros: number
    prestadores: PrestadorExcelADM[]
  } | null>(null)
  const [mostrarPreview, setMostrarPreview] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type.includes("sheet") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        setArquivo(file)
        setResultado(null)
        setMostrarPreview(false)
      } else {
        alert("Por favor, selecione um arquivo Excel (.xlsx ou .xls)")
      }
    }
  }

  const processarArquivo = async () => {
    if (!arquivo) return

    setCarregando(true)
    setProgresso(10)

    try {
      // Processar Excel
      console.log("📊 ADM - Iniciando processamento do Excel...")
      const resultadoProcessamento = await ExcelService.processarExcelADM(arquivo)
      setProgresso(50)

      if (!resultadoProcessamento.sucesso) {
        setResultado({
          sucesso: false,
          erro: resultadoProcessamento.erro,
          totalProcessados: 0,
          totalSalvos: 0,
          totalErros: 0,
          prestadores: [],
        })
        setCarregando(false)
        return
      }

      console.log(`✅ ADM - ${resultadoProcessamento.prestadores.length} prestadores processados`)
      setProgresso(70)

      // Salvar no Supabase
      console.log("💾 ADM - Salvando no Supabase...")
      const resultadoSalvamento = await ExcelService.salvarHistoricoSupabase(resultadoProcessamento.prestadores)
      setProgresso(100)

      setResultado({
        sucesso: resultadoSalvamento.sucesso,
        erro: resultadoSalvamento.erro,
        totalProcessados: resultadoProcessamento.totalProcessados,
        totalSalvos: resultadoSalvamento.totalSalvos,
        totalErros: resultadoSalvamento.totalErros,
        prestadores: resultadoProcessamento.prestadores,
      })

      if (resultadoSalvamento.sucesso && onUploadCompleto) {
        onUploadCompleto(resultadoSalvamento.totalSalvos)
      }
    } catch (error: any) {
      console.error("💥 ADM - Erro no processamento:", error)
      setResultado({
        sucesso: false,
        erro: `Erro inesperado: ${error.message}`,
        totalProcessados: 0,
        totalSalvos: 0,
        totalErros: 0,
        prestadores: [],
      })
    } finally {
      setCarregando(false)
      setProgresso(0)
    }
  }

  const limparUpload = () => {
    setArquivo(null)
    setResultado(null)
    setMostrarPreview(false)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          Upload de Histórico Excel (ADM)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Instruções */}
        <Alert className="border-blue-200 bg-blue-50">
          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <div className="space-y-2">
              <p>
                <strong>📊 Colunas esperadas no Excel:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <strong>Nome</strong> - Nome completo do prestador
                </li>
                <li>
                  <strong>Doc1</strong> - RG ou documento principal
                </li>
                <li>
                  <strong>Doc2</strong> - CPF, CNH ou documento secundário (opcional)
                </li>
                <li>
                  <strong>Empresa</strong> - Nome da empresa
                </li>
                <li>
                  <strong>Válida até</strong> - Data de validade da checagem
                </li>
                <li>
                  <strong>Data inicial</strong> - Data inicial do último acesso
                </li>
                <li>
                  <strong>Data final</strong> - Data final do último acesso
                </li>
                <li>
                  <strong>Status</strong> - aprovado/reprovado/pendente/exceção
                </li>
                <li>
                  <strong>Cadastro</strong> - ok/vencida/pendente/urgente
                </li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        {/* Upload */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />

            <Button
              onClick={() => inputRef.current?.click()}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Selecionar Arquivo Excel
            </Button>

            {arquivo && (
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">{arquivo.name}</span>
                <Button onClick={limparUpload} variant="ghost" size="sm" className="text-red-600 hover:bg-red-50">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {arquivo && !resultado && (
            <Button
              onClick={processarArquivo}
              disabled={carregando}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {carregando ? "Processando..." : "Processar e Salvar Histórico"}
            </Button>
          )}
        </div>

        {/* Progress */}
        {carregando && (
          <div className="space-y-2">
            <Progress value={progresso} className="w-full" />
            <p className="text-sm text-slate-600 text-center">
              {progresso < 50
                ? "Processando Excel..."
                : progresso < 100
                  ? "Salvando no banco de dados..."
                  : "Finalizando..."}
            </p>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <Alert className={resultado.sucesso ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {resultado.sucesso ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={resultado.sucesso ? "text-green-700" : "text-red-700"}>
              <div className="space-y-2">
                {resultado.sucesso ? (
                  <>
                    <p>
                      <strong>✅ Upload concluído com sucesso!</strong>
                    </p>
                    <ul className="text-sm space-y-1">
                      <li>📊 Total processados: {resultado.totalProcessados}</li>
                      <li>💾 Total salvos: {resultado.totalSalvos}</li>
                      {resultado.totalErros > 0 && <li>❌ Total com erro: {resultado.totalErros}</li>}
                    </ul>
                  </>
                ) : (
                  <>
                    <p>
                      <strong>❌ Erro no upload:</strong>
                    </p>
                    <p className="text-sm">{resultado.erro}</p>
                  </>
                )}

                {resultado.prestadores.length > 0 && (
                  <Button
                    onClick={() => setMostrarPreview(!mostrarPreview)}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    {mostrarPreview ? "Ocultar" : "Ver"} Preview dos Dados
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Preview dos dados */}
        {mostrarPreview && resultado?.prestadores && (
          <div className="border rounded-lg p-4 bg-slate-50">
            <h4 className="font-medium mb-3">Preview dos Primeiros 5 Prestadores:</h4>
            <div className="space-y-2 text-sm">
              {resultado.prestadores.slice(0, 5).map((prestador, index) => (
                <div key={index} className="bg-white p-2 rounded border">
                  <p>
                    <strong>Nome:</strong> {prestador.nome}
                  </p>
                  <p>
                    <strong>Doc1:</strong> {prestador.documento} | <strong>Doc2:</strong>{" "}
                    {prestador.documento2 || "N/A"}
                  </p>
                  <p>
                    <strong>Empresa:</strong> {prestador.empresa}
                  </p>
                  <p>
                    <strong>Status:</strong> {prestador.status} | <strong>Cadastro:</strong> {prestador.cadastro}
                  </p>
                  <p>
                    <strong>Válida até:</strong> {prestador.validaAte || "N/A"}
                  </p>
                </div>
              ))}
              {resultado.prestadores.length > 5 && (
                <p className="text-slate-600">... e mais {resultado.prestadores.length - 5} prestadores</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
