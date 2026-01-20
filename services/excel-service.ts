import * as XLSX from "xlsx"
import { supabase } from "@/lib/supabase"

export interface PrestadorExcelADM {
  nome: string
  documento: string
  documento2?: string
  empresa: string
  validaAte: string // Data de validade da checagem
  dataInicial: string // Data inicial do último acesso
  dataFinal: string // Data final do último acesso
  status: "aprovado" | "reprovado" | "pendente" | "excecao"
  cadastro: "ok" | "vencida" | "pendente" | "urgente"
}

export interface PrestadorExcelSolicitante {
  nome: string
  documento: string
  documento2?: string
  empresa: string
}

export class ExcelService {
  // 📊 PROCESSAR EXCEL PARA ADM (Histórico Completo)
  static async processarExcelADM(arquivo: File): Promise<{
    sucesso: boolean
    erro: string
    prestadores: PrestadorExcelADM[]
    totalProcessados: number
  }> {
    try {
      console.log("📊 ADM - Processando arquivo Excel para histórico...")

      const buffer = await arquivo.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      // Converter para JSON
      const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (dados.length < 2) {
        return {
          sucesso: false,
          erro: "Arquivo Excel deve ter pelo menos 2 linhas (cabeçalho + dados)",
          prestadores: [],
          totalProcessados: 0,
        }
      }

      // Primeira linha deve ser o cabeçalho
      const cabecalho = dados[0].map((col: any) => String(col).toLowerCase().trim())
      console.log("📋 ADM - Cabeçalho detectado:", cabecalho)

      // Mapear colunas esperadas
      const colunas = {
        nome: this.encontrarColuna(cabecalho, ["nome", "name"]),
        documento: this.encontrarColuna(cabecalho, ["doc1", "documento", "rg", "document"]),
        documento2: this.encontrarColuna(cabecalho, ["doc2", "documento2", "cpf", "cnh"]),
        empresa: this.encontrarColuna(cabecalho, ["empresa", "company"]),
        validaAte: this.encontrarColuna(cabecalho, ["valida ate", "válida até", "validade", "valid until"]),
        dataInicial: this.encontrarColuna(cabecalho, ["data inicial", "inicio", "start date"]),
        dataFinal: this.encontrarColuna(cabecalho, ["data final", "fim", "end date"]),
        status: this.encontrarColuna(cabecalho, ["status", "checagem"]),
        cadastro: this.encontrarColuna(cabecalho, ["cadastro", "liberacao", "liberação"]),
      }

      console.log("🗂️ ADM - Mapeamento de colunas:", colunas)

      // Verificar colunas obrigatórias
      const colunasObrigatorias = ["nome", "documento", "empresa", "status", "cadastro"]
      for (const coluna of colunasObrigatorias) {
        if (colunas[coluna as keyof typeof colunas] === -1) {
          return {
            sucesso: false,
            erro: `Coluna obrigatória não encontrada: ${coluna}`,
            prestadores: [],
            totalProcessados: 0,
          }
        }
      }

      const prestadores: PrestadorExcelADM[] = []

      // Processar dados (pular cabeçalho)
      for (let i = 1; i < dados.length; i++) {
        const linha = dados[i]

        if (!linha || linha.length === 0) continue

        try {
          const prestador: PrestadorExcelADM = {
            nome: this.extrairValor(linha, colunas.nome),
            documento: this.extrairValor(linha, colunas.documento),
            documento2: this.extrairValor(linha, colunas.documento2) || undefined,
            empresa: this.extrairValor(linha, colunas.empresa),
            validaAte: this.formatarData(this.extrairValor(linha, colunas.validaAte)),
            dataInicial: this.formatarData(this.extrairValor(linha, colunas.dataInicial)),
            dataFinal: this.formatarData(this.extrairValor(linha, colunas.dataFinal)),
            status: this.normalizarStatus(this.extrairValor(linha, colunas.status)),
            cadastro: this.normalizarCadastro(this.extrairValor(linha, colunas.cadastro)),
          }

          // Validar dados obrigatórios
          if (prestador.nome && prestador.documento && prestador.empresa) {
            prestadores.push(prestador)
          } else {
            console.warn(`⚠️ ADM - Linha ${i + 1} ignorada - dados incompletos:`, prestador)
          }
        } catch (error) {
          console.error(`❌ ADM - Erro na linha ${i + 1}:`, error)
        }
      }

      console.log(`✅ ADM - ${prestadores.length} prestadores processados do Excel`)

      return {
        sucesso: true,
        erro: "",
        prestadores,
        totalProcessados: prestadores.length,
      }
    } catch (error: any) {
      console.error("💥 ADM - Erro ao processar Excel:", error)
      return {
        sucesso: false,
        erro: `Erro ao processar arquivo: ${error.message}`,
        prestadores: [],
        totalProcessados: 0,
      }
    }
  }

  // 📝 PROCESSAR EXCEL PARA SOLICITANTE (Lista Nova)
  static async processarExcelSolicitante(arquivo: File): Promise<{
    sucesso: boolean
    erro: string
    prestadores: PrestadorExcelSolicitante[]
    totalProcessados: number
  }> {
    try {
      console.log("📝 SOLICITANTE - Processando arquivo Excel para nova solicitação...")

      const buffer = await arquivo.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]

      const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      if (dados.length < 2) {
        return {
          sucesso: false,
          erro: "Arquivo Excel deve ter pelo menos 2 linhas (cabeçalho + dados)",
          prestadores: [],
          totalProcessados: 0,
        }
      }

      const cabecalho = dados[0].map((col: any) => String(col).toLowerCase().trim())
      console.log("📋 SOLICITANTE - Cabeçalho detectado:", cabecalho)

      const colunas = {
        nome: this.encontrarColuna(cabecalho, ["nome", "name"]),
        documento: this.encontrarColuna(cabecalho, ["doc1", "documento", "rg", "document"]),
        documento2: this.encontrarColuna(cabecalho, ["doc2", "documento2", "cpf", "cnh"]),
        empresa: this.encontrarColuna(cabecalho, ["empresa", "company"]),
      }

      console.log("🗂️ SOLICITANTE - Mapeamento de colunas:", colunas)

      // 🎯 CORREÇÃO CRÍTICA: Verificar se tem pelo menos Nome E (Doc1 OU Doc2)
      const colunasObrigatorias = ["nome"]
      for (const coluna of colunasObrigatorias) {
        if (colunas[coluna as keyof typeof colunas] === -1) {
          return {
            sucesso: false,
            erro: `Coluna obrigatória não encontrada: ${coluna}`,
            prestadores: [],
            totalProcessados: 0,
          }
        }
      }

      // Verificar se tem pelo menos uma coluna de documento
      if (colunas.documento === -1 && colunas.documento2 === -1) {
        return {
          sucesso: false,
          erro: "Deve haver pelo menos uma coluna de documento (Doc1 ou Doc2)",
          prestadores: [],
          totalProcessados: 0,
        }
      }

      const prestadores: PrestadorExcelSolicitante[] = []

      for (let i = 1; i < dados.length; i++) {
        const linha = dados[i]

        if (!linha || linha.length === 0) continue

        try {
          const prestador: PrestadorExcelSolicitante = {
            nome: this.extrairValor(linha, colunas.nome),
            documento: this.extrairValor(linha, colunas.documento),
            documento2: this.extrairValor(linha, colunas.documento2) || undefined,
            empresa: this.extrairValor(linha, colunas.empresa) || "",
          }

          // 🎯 CORREÇÃO CRÍTICA: Aceitar prestador com Nome E (Doc1 OU Doc2)
          const temNome = prestador.nome.trim()
          const temDoc1 = prestador.documento.trim()
          const temDoc2 = prestador.documento2?.trim()
          const temAlgumDoc = temDoc1 || temDoc2

          console.log(
            `🔍 SOLICITANTE - Linha ${i + 1}: Nome="${temNome}" Doc1="${temDoc1}" Doc2="${temDoc2}" TemAlgumDoc=${!!temAlgumDoc}`,
          )

          if (temNome && temAlgumDoc) {
            prestadores.push(prestador)
            console.log(`✅ SOLICITANTE - Prestador aceito: ${prestador.nome}`)
          } else {
            console.warn(`⚠️ SOLICITANTE - Linha ${i + 1} ignorada - dados incompletos:`, prestador)
            console.warn(`   Motivo: Nome="${!!temNome}" AlgumDoc="${!!temAlgumDoc}"`)
          }
        } catch (error) {
          console.error(`❌ SOLICITANTE - Erro na linha ${i + 1}:`, error)
        }
      }

      console.log(`✅ SOLICITANTE - ${prestadores.length} prestadores processados do Excel`)

      return {
        sucesso: true,
        erro: "",
        prestadores,
        totalProcessados: prestadores.length,
      }
    } catch (error: any) {
      console.error("💥 SOLICITANTE - Erro ao processar Excel:", error)
      return {
        sucesso: false,
        erro: `Erro ao processar arquivo: ${error.message}`,
        prestadores: [],
        totalProcessados: 0,
      }
    }
  }

  // 💾 SALVAR HISTÓRICO NO SUPABASE (ADM)
  static async salvarHistoricoSupabase(prestadores: PrestadorExcelADM[]): Promise<{
    sucesso: boolean
    erro: string
    totalSalvos: number
    totalErros: number
  }> {
    try {
      console.log(`💾 ADM - Salvando ${prestadores.length} prestadores no Supabase...`)

      let totalSalvos = 0
      let totalErros = 0
      const batchSize = 100 // Processar em lotes de 100

      for (let i = 0; i < prestadores.length; i += batchSize) {
        const lote = prestadores.slice(i, i + batchSize)

        const dadosParaInserir = lote.map((p) => ({
          nome: p.nome,
          documento: p.documento,
          documento2: p.documento2 || null,
          empresa: p.empresa,
          checagem_valida_ate: p.validaAte || null,
          data_inicial: p.dataInicial || null,
          data_final: p.dataFinal || null,
          status: p.status,
          cadastro: p.cadastro,
          data_avaliacao: new Date().toISOString(),
          aprovado_por: "Upload Excel ADM",
          solicitacao_id: null, // Histórico não tem solicitação específica
        }))

        const { data, error } = await supabase.from("prestadores").insert(dadosParaInserir).select()

        if (error) {
          console.error(`❌ ADM - Erro no lote ${Math.floor(i / batchSize) + 1}:`, error)
          totalErros += lote.length
        } else {
          console.log(`✅ ADM - Lote ${Math.floor(i / batchSize) + 1} salvo com sucesso`)
          totalSalvos += lote.length
        }
      }

      return {
        sucesso: totalSalvos > 0,
        erro: totalErros > 0 ? `${totalErros} prestadores não foram salvos` : "",
        totalSalvos,
        totalErros,
      }
    } catch (error: any) {
      console.error("💥 ADM - Erro ao salvar no Supabase:", error)
      return {
        sucesso: false,
        erro: `Erro ao salvar: ${error.message}`,
        totalSalvos: 0,
        totalErros: prestadores.length,
      }
    }
  }

  // 🔧 FUNÇÕES AUXILIARES
  private static encontrarColuna(cabecalho: string[], possiveisNomes: string[]): number {
    for (const nome of possiveisNomes) {
      const index = cabecalho.findIndex((col) => col.includes(nome))
      if (index !== -1) return index
    }
    return -1
  }

  private static extrairValor(linha: any[], indice: number): string {
    if (indice === -1 || !linha[indice]) return ""
    return String(linha[indice]).trim()
  }

  private static formatarData(valor: string): string {
    if (!valor) return ""

    try {
      // Tentar diferentes formatos de data
      const data = new Date(valor)
      if (!isNaN(data.getTime())) {
        return data.toISOString().split("T")[0]
      }

      // Se for formato DD/MM/YYYY
      if (valor.includes("/")) {
        const [dia, mes, ano] = valor.split("/")
        return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`
      }

      return valor
    } catch {
      return valor
    }
  }

  private static normalizarStatus(valor: string): "aprovado" | "reprovado" | "pendente" | "excecao" {
    const v = valor.toLowerCase()
    if (v.includes("aprovado") || v.includes("ok") || v.includes("válido")) return "aprovado"
    if (v.includes("reprovado") || v.includes("negado")) return "reprovado"
    if (v.includes("exceção") || v.includes("excecao")) return "excecao"
    return "pendente"
  }

  private static normalizarCadastro(valor: string): "ok" | "vencida" | "pendente" | "urgente" {
    const v = valor.toLowerCase()
    if (v.includes("ok") || v.includes("liberado")) return "ok"
    if (v.includes("vencida") || v.includes("expirado")) return "vencida"
    if (v.includes("urgente")) return "urgente"
    return "pendente"
  }
}
