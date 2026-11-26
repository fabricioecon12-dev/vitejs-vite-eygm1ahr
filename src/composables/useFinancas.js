
import { ref, watch } from 'vue'
import { calcularLimiteCartao } from '../utils/calcularLimiteCartao.js'
import { usePreferencias } from './usePreferencias.js'
import { contasValidas, vinculosTransacoesValidos } from '../services/contasService.js'
import {
  migrarDadosParaContas,
  VERSAO_DADOS_CONTAS
} from '../services/migracaoContasService.js'

// =====================================================
// NEXUS FINANÇAS — ESTADO FINANCEIRO COMPARTILHADO
// =====================================================

// Manter esta chave para preservar os dados existentes.
const CHAVE_ARMAZENAMENTO = 'nexus-financas-dados-v1'

let bloqueioPersistencia = false
let aplicandoOperacaoFinanceira = false
let proximoId = 1
let financasInicializadas = false
let dadosRecuperados = false
let armazenamentoInicializado = false
let leituraArmazenamentoConcluida = false
let armazenamentoVazioConfirmado = false

const hoje = new Date()

const mesSelecionado = ref(
  new Date(hoje.getFullYear(), hoje.getMonth(), 1)
)

const saldoInicial = ref(5380)
const transacoes = ref([])
const transferencias = ref([])
const tentativasTransferenciaRecusadas = ref([])
const pendenciasTecnicasTransferencia = ref([])
const bloqueiosTecnicosTransferencia = ref([])
const historicoRegularizacoesTecnicas = ref([])
const inconsistenciasPendenciasTecnicas = ref([])
const limites = ref({})
const contas = ref([])
const cartoesCredito = ref([])
const comprasCartao = ref([])
const faturasCartao = ref([])
const pagamentosFatura = ref([])
const pagamentosAntecipadosFatura = ref([])
const tentativasPagamentoFaturaRecusadas = ref([])
const fechamentosFatura = ref([])
const obrigacoesComplementaresFatura = ref([])
const pagamentosObrigacoesComplementares = ref([])

const categoriasDespesa = ref([
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Lazer',
  'Outros'
])

const categoriasReceita = ref([
  'Salário',
  'Serviços',
  'Investimentos',
  'Vendas',
  'Freelance',
  'Aluguéis',
  'Comissões',
  'Bonificações',
  'Aposentadoria',
  'Pensão',
  'Reembolsos',
  'Presentes e doações',
  'Restituições',
  'Outros'
])

const limiteEditando = ref('4.000,00')
const aviso = ref('')
const resultadoTecnicoTransferencia = ref(null)
const armazenamentoProtegido = ref(false)

// =====================================================
// VALIDAÇÕES
// =====================================================

function dataArmazenadaValida(data) {
  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    return false
  }

  const [ano, mes, dia] = data.split('-').map(Number)

  if (ano < 2000 || ano > 2100) {
    return false
  }

  const dataVerificada = new Date(0)
  dataVerificada.setFullYear(ano, mes - 1, dia)

  return (
    dataVerificada.getFullYear() === ano &&
    dataVerificada.getMonth() === mes - 1 &&
    dataVerificada.getDate() === dia
  )
}

function transacaoArmazenadaValida(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    Number.isSafeInteger(item.id) &&
    item.id > 0 &&
    typeof item.descricao === 'string' &&
    item.descricao.trim().length > 0 &&
    typeof item.valor === 'number' &&
    Number.isFinite(item.valor) &&
    item.valor > 0 &&
    (item.tipo === 'receita' || item.tipo === 'despesa') &&
    typeof item.categoria === 'string' &&
    item.categoria.trim().length > 0 &&
    dataArmazenadaValida(item.data)
  )
}

function converterCentavos(numero) {
  if (typeof numero !== 'number' || !Number.isFinite(numero)) {
    return null
  }

  const convertido = Math.round(numero * 100)

  if (
    !Number.isSafeInteger(convertido) ||
    Math.abs(numero * 100 - convertido) > 1e-7
  ) {
    return null
  }

  return convertido
}

function transferenciaArmazenadaValida(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    Number.isSafeInteger(item.id) &&
    item.id > 0 &&
    Number.isSafeInteger(item.contaOrigemId) &&
    item.contaOrigemId > 0 &&
    Number.isSafeInteger(item.contaDestinoId) &&
    item.contaDestinoId > 0 &&
    item.contaOrigemId !== item.contaDestinoId &&
    converterCentavos(item.valor) !== null &&
    converterCentavos(item.valor) > 0 &&
    converterCentavos(item.tarifa) !== null &&
    converterCentavos(item.tarifa) >= 0 &&
    Number.isSafeInteger(
      converterCentavos(item.valor) + converterCentavos(item.tarifa)
    ) &&
    dataArmazenadaValida(item.data) &&
    item.status === 'executada'
  )
}
function categoriasArmazenadasValidas(lista) {
  return (
    Array.isArray(lista) &&
    lista.every(
      nome =>
        typeof nome === 'string' &&
        nome.trim().length > 0 &&
        nome.length <= 40
    )
  )
}

function identificadoresUnicos(lista) {
  if (!Array.isArray(lista)) {
    return false
  }

  const ids = lista.map(item => item?.id)

  return new Set(ids).size === ids.length
}

function limitesArmazenadosValidos(dados) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    return false
  }

  return Object.entries(dados).every(([mes, valor]) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
      return false
    }

    return (
      typeof valor === 'number' &&
      Number.isFinite(valor) &&
      valor >= 0
    )
  })
}

// =====================================================
// INICIALIZAÇÃO E RECUPERAÇÃO DOS DADOS
// =====================================================

function inicializarFinancas() {
  if (financasInicializadas) {
    return
  }

  financasInicializadas = true
  bloqueioPersistencia = true
  armazenamentoProtegido.value = true

  dadosRecuperados = carregarDadosLocais()

  if (dadosRecuperados) {
    armazenamentoProtegido.value = false
    bloqueioPersistencia = false

    limiteEditando.value = Number(
      limiteAtual()
    ).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })

    aviso.value = ''

    // Fechar somente faturas vencidas apos recuperacao valida.
    fecharFaturasVencidas()

    return
  }

  const armazenamentoVazio =
    leituraArmazenamentoConcluida &&
    armazenamentoVazioConfirmado

  if (armazenamentoVazio) {
    armazenamentoProtegido.value = false
    bloqueioPersistencia = false

    demonstracao({ confirmar: false })

    if (!armazenamentoProtegido.value) {
      armazenamentoInicializado = true
    }

    return
  }

  aviso.value =
    'Não foi possível recuperar os dados armazenados. ' +
    'Os registros existentes foram preservados.'
}

function recuperarColecoesTecnicas(dados) {
  const nomes = [
    'pendenciasTecnicasTransferencia',
    'bloqueiosTecnicosTransferencia',
    'historicoRegularizacoesTecnicas',
    'inconsistenciasPendenciasTecnicas'
  ]

  const recuperadas = {}

  for (const nome of nomes) {
    const colecao = dados[nome]

    // Compatibilidade com dados anteriores.
    if (colecao === undefined) {
      recuperadas[nome] = []
      continue
    }

    if (
      !Array.isArray(colecao) ||
      !colecao.every(item =>
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item)
      )
    ) {
      throw new Error(
        `Colecao tecnica invalida: ${nome}.`
      )
    }

    recuperadas[nome] = colecao
  }

  const ids = new Set()

  for (const pendencia of recuperadas.pendenciasTecnicasTransferencia) {
    const id = pendencia.idTentativa

    if (
      typeof id !== 'string' ||
      id.trim().length === 0 ||
      ids.has(id.trim())
    ) {
      throw new Error(
        'Identificador de pendencia tecnica invalido ou duplicado.'
      )
    }

    ids.add(id.trim())
  }

  return recuperadas
}
function fechamentoFaturaArmazenadoValido(item) {
  if (
    !item ||
    typeof item !== 'object' ||
    Array.isArray(item) ||
    !(
      (typeof item.id === 'string' && item.id.trim().length > 0) ||
      (Number.isSafeInteger(item.id) && item.id > 0)
    ) ||
    !Number.isSafeInteger(item.faturaId) ||
    item.faturaId <= 0 ||
    !Number.isSafeInteger(item.cartaoId) ||
    item.cartaoId <= 0 ||
    typeof item.competencia !== 'string' ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.competencia) ||
    typeof item.fechamentoPrevisto !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(item.fechamentoPrevisto) ||
    typeof item.fechamentoEfetivoEm !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(item.fechamentoEfetivoEm) ||
    !Number.isFinite(Date.parse(item.fechamentoEfetivoEm)) ||
    !Number.isSafeInteger(item.valorConsolidadoCentavos) ||
    item.valorConsolidadoCentavos < 0 ||
    item.status !== 'confirmado'
  ) {
    return false
  }

  if (
    Object.prototype.hasOwnProperty.call(
      item,
      'configuracaoEncargosFechamento'
    )
  ) {
    const configuracao = item.configuracaoEncargosFechamento
    const validacao = normalizarConfiguracaoEncargosCartao(
      configuracao
    )

    if (
      !configuracao ||
      !validacao.valido ||
      JSON.stringify(configuracao) !==
        JSON.stringify(validacao.valor)
    ) {
      return false
    }
  }

  return true
}
function construirTentativaPagamentoFaturaRecusada(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return null
  }

  const normalizarReferencia = valor =>
    Number.isSafeInteger(valor) && valor > 0
      ? valor
      : null

  const camposOriginais = [
    'faturaId',
    'cartaoId',
    'contaId',
    'valorSolicitado'
  ]

  const dadosOriginais = {}

  for (const campo of camposOriginais) {
    if (!Object.prototype.hasOwnProperty.call(dados, campo)) {
      return null
    }

    const valor = dados[campo]

    if (
      valor !== null &&
      typeof valor !== 'string' &&
      typeof valor !== 'number' &&
      typeof valor !== 'boolean'
    ) {
      return null
    }

    if (
      (typeof valor === 'number' && !Number.isFinite(valor)) ||
      (typeof valor === 'string' && valor.length > 10000)
    ) {
      return null
    }

    dadosOriginais[campo] = valor
  }

  const registro = {
    id: dados.id,
    dataHora: dados.dataHora,
    dadosOriginais,
    faturaId: normalizarReferencia(dados.faturaId),
    cartaoId: normalizarReferencia(dados.cartaoId),
    contaId: normalizarReferencia(dados.contaId),
    valorSolicitadoCentavos:
      Number.isSafeInteger(dados.valorSolicitadoCentavos)
        ? dados.valorSolicitadoCentavos
        : null,
    saldoDisponivelCentavos:
      Number.isSafeInteger(dados.saldoDisponivelCentavos)
        ? dados.saldoDisponivelCentavos
        : null,
    motivo: dados.motivo,
    resultado: 'recusado'
  }

  if (Object.prototype.hasOwnProperty.call(dados, 'modalidade')) {
    if (
      dados.modalidade !== 'convencional' &&
      dados.modalidade !== 'antecipado'
    ) {
      return null
    }

    registro.modalidade = dados.modalidade
  }

  if (Object.prototype.hasOwnProperty.call(dados, 'tentativaId')) {
    registro.tentativaId = dados.tentativaId
  }

  if (Object.prototype.hasOwnProperty.call(dados, 'operacaoId')) {
    registro.operacaoId = dados.operacaoId
  }

  return tentativaPagamentoFaturaRecusadaArmazenadaValida(registro)
    ? registro
    : null
}

function tentativaPagamentoFaturaRecusadaArmazenadaValida(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false
  }

  const idValido =
    (typeof item.id === 'string' && item.id.trim().length > 0) ||
    (Number.isSafeInteger(item.id) && item.id > 0)

  const dataHoraValida =
    typeof item.dataHora === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(item.dataHora) &&
    Number.isFinite(Date.parse(item.dataHora))

  const referenciaNormalizadaValida = valor =>
    valor === null ||
    (Number.isSafeInteger(valor) && valor > 0)

  const camposOriginais = [
    'faturaId',
    'cartaoId',
    'contaId',
    'valorSolicitado'
  ]

  const dadosOriginais = item.dadosOriginais

  const valorOriginalValido = valor =>
    valor === null ||
    (
      typeof valor === 'string' &&
      valor.length <= 10000
    ) ||
    (
      typeof valor === 'number' &&
      Number.isFinite(valor)
    ) ||
    typeof valor === 'boolean'

  const dadosOriginaisValidos =
    dadosOriginais &&
    typeof dadosOriginais === 'object' &&
    !Array.isArray(dadosOriginais) &&
    camposOriginais.every(campo =>
      Object.prototype.hasOwnProperty.call(dadosOriginais, campo) &&
      valorOriginalValido(dadosOriginais[campo])
    ) &&
    Object.keys(dadosOriginais).every(campo =>
      camposOriginais.includes(campo)
    )

  const modalidadeValida =
    !Object.prototype.hasOwnProperty.call(item, 'modalidade') ||
    item.modalidade === 'convencional' ||
    item.modalidade === 'antecipado'

  const operacaoIdValido =
    !Object.prototype.hasOwnProperty.call(item, 'operacaoId') ||
    (
      typeof item.operacaoId === 'string' &&
      item.operacaoId.trim().length > 0 &&
      item.operacaoId.length <= 200 &&
      item.operacaoId === item.operacaoId.trim()
    )

  const tentativaIdValido =
    !Object.prototype.hasOwnProperty.call(item, 'tentativaId') ||
    (
      typeof item.tentativaId === 'string' &&
      item.tentativaId.trim().length > 0 &&
      item.tentativaId.length <= 200
    )

  return (
    modalidadeValida &&
    tentativaIdValido &&
    operacaoIdValido &&
    idValido &&
    dataHoraValida &&
    dadosOriginaisValidos &&
    referenciaNormalizadaValida(item.faturaId) &&
    referenciaNormalizadaValida(item.cartaoId) &&
    referenciaNormalizadaValida(item.contaId) &&
    (
      item.valorSolicitadoCentavos === null ||
      Number.isSafeInteger(item.valorSolicitadoCentavos)
    ) &&
    (
      item.saldoDisponivelCentavos === null ||
      Number.isSafeInteger(item.saldoDisponivelCentavos)
    ) &&
    typeof item.motivo === 'string' &&
    item.motivo.trim().length > 0 &&
    item.resultado === 'recusado'
  )
}
function pagamentoFaturaArmazenadoValido(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false
  }

  const idValido = valor =>
    (typeof valor === 'string' && valor.trim().length > 0) ||
    (Number.isSafeInteger(valor) && valor > 0)

  return (
    idValido(item.id) &&
    typeof item.operacaoId === 'string' &&
    item.operacaoId.trim().length > 0 &&
    Number.isSafeInteger(item.faturaId) &&
    item.faturaId > 0 &&
    Number.isSafeInteger(item.cartaoId) &&
    item.cartaoId > 0 &&
    Number.isSafeInteger(item.contaId) &&
    item.contaId > 0 &&
    Number.isSafeInteger(item.transacaoId) &&
    item.transacaoId > 0 &&
    Number.isSafeInteger(item.valorPagoCentavos) &&
    item.valorPagoCentavos > 0 &&
    typeof item.dataHora === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(item.dataHora) &&
    Number.isFinite(Date.parse(item.dataHora)) &&
    item.status === 'confirmado'
  )
}
function pagamentoAntecipadoFaturaArmazenadoValido(item) {
  if (!pagamentoFaturaArmazenadoValido(item)) {
    return false
  }

  return item.tipo === 'antecipado'
}
function obrigacaoComplementarFaturaArmazenadaValida(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false
  }

  const idValido = valor =>
    (typeof valor === 'string' && valor.trim().length > 0) ||
    (Number.isSafeInteger(valor) && valor > 0)

  return (
    idValido(item.id) &&
    typeof item.operacaoId === 'string' &&
    item.operacaoId.trim().length > 0 &&
    Number.isSafeInteger(item.faturaId) &&
    item.faturaId > 0 &&
    Number.isSafeInteger(item.cartaoId) &&
    item.cartaoId > 0 &&
    Number.isSafeInteger(item.valorOriginalCentavos) &&
    item.valorOriginalCentavos > 0 &&
    typeof item.origem === 'string' &&
    item.origem.trim().length > 0 &&
    typeof item.natureza === 'string' &&
    item.natureza.trim().length > 0 &&
    typeof item.competencia === 'string' &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(item.competencia) &&
    typeof item.dataHora === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(item.dataHora) &&
    Number.isFinite(Date.parse(item.dataHora)) &&
    ['pendente', 'confirmada'].includes(item.status)
  )
}
function vinculosObrigacaoComplementarFaturaValidos(
  obrigacao,
  colecoes
) {
  if (
    !obrigacaoComplementarFaturaArmazenadaValida(obrigacao) ||
    !colecoes ||
    !Array.isArray(colecoes.faturasCartao) ||
    !Array.isArray(colecoes.cartoesCredito) ||
    !Array.isArray(colecoes.fechamentosFatura)
  ) {
    return false
  }

  const fatura = colecoes.faturasCartao.find(
    item => item.id === obrigacao.faturaId
  )

  if (
    !fatura ||
    fatura.cartaoId !== obrigacao.cartaoId ||
    fatura.competencia !== obrigacao.competencia ||
    fatura.status !== 'fechada'
  ) {
    return false
  }

  const cartao = colecoes.cartoesCredito.find(
    item => item.id === obrigacao.cartaoId
  )

  if (!cartao) {
    return false
  }

  const fechamentos = colecoes.fechamentosFatura.filter(
    item => item.faturaId === obrigacao.faturaId
  )

  return (
    fechamentos.length === 1 &&
    fechamentoFaturaArmazenadoValido(fechamentos[0]) &&
    fechamentos[0].cartaoId === obrigacao.cartaoId &&
    fechamentos[0].competencia === obrigacao.competencia
  )
}
function obrigacoesComplementaresFaturaSemDuplicidades(
  obrigacoes
) {
  if (!Array.isArray(obrigacoes)) {
    return false
  }

  const ids = new Set()
  const operacoes = new Set()

  for (const obrigacao of obrigacoes) {
    if (!obrigacaoComplementarFaturaArmazenadaValida(obrigacao)) {
      return false
    }

    const chaveId = String(obrigacao.id)
    const chaveOperacao = obrigacao.operacaoId.trim()

    if (
      ids.has(chaveId) ||
      operacoes.has(chaveOperacao)
    ) {
      return false
    }

    ids.add(chaveId)
    operacoes.add(chaveOperacao)
  }

  return true
}
function pagamentoObrigacaoComplementarArmazenadoValido(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return false
  }

  const idValido = valor =>
    (typeof valor === 'string' && valor.trim().length > 0) ||
    (Number.isSafeInteger(valor) && valor > 0)

  return (
    idValido(item.id) &&
    idValido(item.obrigacaoId) &&
    typeof item.operacaoId === 'string' &&
    item.operacaoId.trim().length > 0 &&
    Number.isSafeInteger(item.faturaId) &&
    item.faturaId > 0 &&
    Number.isSafeInteger(item.cartaoId) &&
    item.cartaoId > 0 &&
    Number.isSafeInteger(item.contaId) &&
    item.contaId > 0 &&
    Number.isSafeInteger(item.transacaoId) &&
    item.transacaoId > 0 &&
    Number.isSafeInteger(item.valorPagoCentavos) &&
    item.valorPagoCentavos > 0 &&
    typeof item.dataHora === 'string' &&
    /^\d{4}-\d{2}-\d{2}T/.test(item.dataHora) &&
    Number.isFinite(Date.parse(item.dataHora)) &&
    item.status === 'confirmado'
  )
}
function pagamentosObrigacoesComplementaresSemDuplicidades(
  pagamentos
) {
  if (!Array.isArray(pagamentos)) {
    return false
  }

  const ids = new Set()
  const operacoes = new Set()
  const transacoes = new Set()

  for (const pagamento of pagamentos) {
    if (!pagamentoObrigacaoComplementarArmazenadoValido(pagamento)) {
      return false
    }

    const chaveId = `${typeof pagamento.id}:${pagamento.id}`
    const chaveOperacao = pagamento.operacaoId.trim()
    const chaveTransacao = pagamento.transacaoId

    if (
      ids.has(chaveId) ||
      operacoes.has(chaveOperacao) ||
      transacoes.has(chaveTransacao)
    ) {
      return false
    }

    ids.add(chaveId)
    operacoes.add(chaveOperacao)
    transacoes.add(chaveTransacao)
  }

  return true
}
function vinculosPagamentoObrigacaoComplementarValidos(
  pagamento,
  colecoes
) {
  if (
    !pagamentoObrigacaoComplementarArmazenadoValido(pagamento) ||
    !colecoes ||
    !Array.isArray(colecoes.obrigacoesComplementaresFatura)
  ) {
    return false
  }

  const obrigacao = colecoes.obrigacoesComplementaresFatura.find(
    item => item.id === pagamento.obrigacaoId
  )

  if (!obrigacao || obrigacao.status !== 'confirmada') {
    return false
  }

  return (
    obrigacao.faturaId === pagamento.faturaId &&
    obrigacao.cartaoId === pagamento.cartaoId
  )
}
function calcularSituacaoFinanceiraObrigacaoComplementar(
  obrigacao,
  pagamentos
) {
  if (
    !obrigacaoComplementarFaturaArmazenadaValida(obrigacao) ||
    !Array.isArray(pagamentos)
  ) {
    return null
  }

  let totalPagoCentavos = 0

  for (const pagamento of pagamentos) {
    if (
      !pagamentoObrigacaoComplementarArmazenadoValido(pagamento) ||
      pagamento.obrigacaoId !== obrigacao.id ||
      pagamento.faturaId !== obrigacao.faturaId ||
      pagamento.cartaoId !== obrigacao.cartaoId ||
      obrigacao.status !== 'confirmada'
    ) {
      return null
    }

    const novoTotal = totalPagoCentavos + pagamento.valorPagoCentavos

    if (
      !Number.isSafeInteger(novoTotal) ||
      novoTotal > obrigacao.valorOriginalCentavos
    ) {
      return null
    }

    totalPagoCentavos = novoTotal
  }

  const saldoRestanteCentavos =
    obrigacao.valorOriginalCentavos - totalPagoCentavos

  const situacaoFinanceira =
    saldoRestanteCentavos === 0
      ? 'quitada'
      : totalPagoCentavos > 0
        ? 'parcialmente_paga'
        : 'nao_paga'

  return {
    obrigacaoId: obrigacao.id,
    valorOriginalCentavos: obrigacao.valorOriginalCentavos,
    totalPagoCentavos,
    saldoRestanteCentavos,
    situacaoFinanceira
  }
}
function recuperarColecoesCartoes(dados) {
  const nomes = [
    'cartoesCredito',
    'comprasCartao',
    'faturasCartao',
    'pagamentosFatura',
    'pagamentosAntecipadosFatura',
    'tentativasPagamentoFaturaRecusadas',
    'fechamentosFatura',
    'obrigacoesComplementaresFatura',
    'pagamentosObrigacoesComplementares'
  ]

  const colecoes = {}

  for (const nome of nomes) {
    const lista = dados[nome] === undefined ? [] : dados[nome]

    if (!Array.isArray(lista)) {
      throw new Error(`Colecao de cartoes invalida: ${nome}`)
    }

    const ids = new Set()

    for (const item of lista) {
      if (
        !item ||
        typeof item !== 'object' ||
        Array.isArray(item) ||
        !(
          (typeof item.id === 'string' && item.id.trim().length > 0) ||
          (Number.isSafeInteger(item.id) && item.id > 0)
        )
      ) {
        throw new Error(`Registro invalido na colecao: ${nome}`)
      }

      const chaveId = `${typeof item.id}:${item.id}`

      if (ids.has(chaveId)) {
        throw new Error(`Identificador duplicado na colecao: ${nome}`)
      }

      ids.add(chaveId)
    }

    if (nome === 'pagamentosFatura') {
      const operacoes = new Set()
      const transacoesVinculadas = new Set()

      for (const pagamento of lista) {
        if (!pagamentoFaturaArmazenadoValido(pagamento)) {
          throw new Error('Registro de pagamento de fatura invalido.')
        }

        if (operacoes.has(pagamento.operacaoId)) {
          throw new Error('Operacao de pagamento duplicada.')
        }

        if (transacoesVinculadas.has(pagamento.transacaoId)) {
          throw new Error('Transacao vinculada a pagamentos duplicados.')
        }

        operacoes.add(pagamento.operacaoId)
        transacoesVinculadas.add(pagamento.transacaoId)
      }
    }
    if (nome === 'pagamentosAntecipadosFatura') {
      const operacoes = new Set()
      const transacoesVinculadas = new Set()

      for (const pagamento of lista) {
        if (!pagamentoAntecipadoFaturaArmazenadoValido(pagamento)) {
          throw new Error('Registro de pagamento antecipado invalido.')
        }

        if (operacoes.has(pagamento.operacaoId)) {
          throw new Error('Operacao de pagamento antecipado duplicada.')
        }

        if (transacoesVinculadas.has(pagamento.transacaoId)) {
          throw new Error('Transacao de pagamento antecipado duplicada.')
        }

        operacoes.add(pagamento.operacaoId)
        transacoesVinculadas.add(pagamento.transacaoId)
      }
    }
    if (nome === 'tentativasPagamentoFaturaRecusadas') {
      for (const tentativa of lista) {
        if (!tentativaPagamentoFaturaRecusadaArmazenadaValida(tentativa)) {
          throw new Error(
            'Tentativa recusada de pagamento de fatura invalida.'
          )
        }
      }
    }

    if (nome === 'obrigacoesComplementaresFatura') {
      if (!obrigacoesComplementaresFaturaSemDuplicidades(lista)) {
        throw new Error(
          'Obrigacoes complementares invalidas ou duplicadas.'
        )
      }
    }

    if (nome === 'pagamentosObrigacoesComplementares') {
      if (!pagamentosObrigacoesComplementaresSemDuplicidades(lista)) {
        throw new Error(
          'Pagamentos complementares invalidos ou duplicados.'
        )
      }
    }

    colecoes[nome] = lista
  }

  const operacoesConvencionais = new Set(
    colecoes.pagamentosFatura.map(pagamento => pagamento.operacaoId)
  )

  const transacoesConvencionais = new Set(
    colecoes.pagamentosFatura.map(pagamento => pagamento.transacaoId)
  )

  for (const pagamento of colecoes.pagamentosAntecipadosFatura) {
    if (operacoesConvencionais.has(pagamento.operacaoId)) {
      throw new Error(
        'Operacao reutilizada entre pagamentos convencionais e antecipados.'
      )
    }

    if (transacoesConvencionais.has(pagamento.transacaoId)) {
      throw new Error(
        'Transacao reutilizada entre pagamentos convencionais e antecipados.'
      )
    }
  }

  const operacoesAntecipadasRecusadas = new Set(
    colecoes.tentativasPagamentoFaturaRecusadas
      .filter(tentativa =>
        tentativa.modalidade === 'antecipado' &&
        Object.prototype.hasOwnProperty.call(tentativa, 'operacaoId')
      )
      .map(tentativa => tentativa.operacaoId)
  )

  const pagamentosConfirmados = [
    ...colecoes.pagamentosFatura,
    ...colecoes.pagamentosAntecipadosFatura
  ]

  for (const pagamento of pagamentosConfirmados) {
    if (operacoesAntecipadasRecusadas.has(pagamento.operacaoId)) {
      throw new Error(
        'Operacao antecipada simultaneamente recusada e confirmada.'
      )
    }
  }
  const pagamentosPorFatura = new Map()
  const transacoesPagamento = new Set()

  for (const pagamento of colecoes.pagamentosFatura) {
    const fatura = colecoes.faturasCartao.find(
      item => item.id === pagamento.faturaId
    )

    const cartao = colecoes.cartoesCredito.find(
      item => item.id === pagamento.cartaoId
    )

    const conta = Array.isArray(dados.contas)
      ? dados.contas.find(item => item.id === pagamento.contaId)
      : null

    const fechamentos = colecoes.fechamentosFatura.filter(
      item =>
        item.faturaId === pagamento.faturaId &&
        item.cartaoId === pagamento.cartaoId &&
        item.status === 'confirmado'
    )

    const transacoes = Array.isArray(dados.transacoes)
      ? dados.transacoes.filter(
          item => item.id === pagamento.transacaoId
        )
      : []

    if (
      !fatura ||
      fatura.status !== 'fechada' ||
      fatura.cartaoId !== pagamento.cartaoId ||
      !cartao ||
      !conta ||
      fechamentos.length !== 1 ||
      transacoes.length !== 1
    ) {
      throw new Error('Vinculos financeiros do pagamento invalidos.')
    }

    const transacao = transacoes[0]

    if (
      !transacaoArmazenadaValida(transacao) ||
      transacao.tipo !== 'despesa' ||
      transacao.contaId !== pagamento.contaId ||
      converterCentavos(transacao.valor) !== pagamento.valorPagoCentavos ||
      transacoesPagamento.has(transacao.id)
    ) {
      throw new Error('Transacao bancaria do pagamento inconsistente.')
    }

    transacoesPagamento.add(transacao.id)

    const acumulado =
      pagamentosPorFatura.get(pagamento.faturaId) ?? 0

    const novoTotal = acumulado + pagamento.valorPagoCentavos

    if (!Number.isSafeInteger(novoTotal)) {
      throw new Error('Total de pagamentos excede limite seguro.')
    }

    pagamentosPorFatura.set(pagamento.faturaId, novoTotal)
  }

  for (const pagamento of colecoes.pagamentosAntecipadosFatura) {
    const fatura = colecoes.faturasCartao.find(
      item => item.id === pagamento.faturaId
    )

    const cartao = colecoes.cartoesCredito.find(
      item => item.id === pagamento.cartaoId
    )

    const conta = Array.isArray(dados.contas)
      ? dados.contas.find(item => item.id === pagamento.contaId)
      : null

    const transacoes = Array.isArray(dados.transacoes)
      ? dados.transacoes.filter(
          item => item.id === pagamento.transacaoId
        )
      : []

    if (
      !fatura ||
      !['aberta', 'fechada'].includes(fatura.status) ||
      fatura.cartaoId !== pagamento.cartaoId ||
      !cartao ||
      !conta ||
      transacoes.length !== 1
    ) {
      throw new Error('Vinculos do pagamento antecipado invalidos.')
    }

    const transacao = transacoes[0]

    if (
      !transacaoArmazenadaValida(transacao) ||
      transacao.tipo !== 'despesa' ||
      transacao.contaId !== pagamento.contaId ||
      converterCentavos(transacao.valor) !== pagamento.valorPagoCentavos ||
      transacoesPagamento.has(transacao.id)
    ) {
      throw new Error('Transacao do pagamento antecipado inconsistente.')
    }

    transacoesPagamento.add(transacao.id)
  }
  for (const pagamento of colecoes.pagamentosAntecipadosFatura) {
    const acumulado =
      pagamentosPorFatura.get(pagamento.faturaId) ?? 0

    const novoTotal = acumulado + pagamento.valorPagoCentavos

    if (!Number.isSafeInteger(novoTotal)) {
      throw new Error('Total de pagamentos antecipados excede limite seguro.')
    }

    pagamentosPorFatura.set(pagamento.faturaId, novoTotal)
  }
  for (const [faturaId, totalPago] of pagamentosPorFatura) {
    const fatura = colecoes.faturasCartao.find(
      item => item.id === faturaId
    )

    if (!fatura) {
      throw new Error('Fatura vinculada aos pagamentos nao encontrada.')
    }

    if (fatura.status === 'fechada') {
      const fechamento = colecoes.fechamentosFatura.find(
        item => item.faturaId === faturaId
      )

      if (
        !fechamentoFaturaArmazenadoValido(fechamento) ||
        totalPago > fechamento.valorConsolidadoCentavos
      ) {
        throw new Error('Pagamentos excedem o valor consolidado da fatura.')
      }
    } else if (fatura.status === 'aberta') {
      const consolidacao = consolidarFaturaCartao(fatura, colecoes)

      if (
        !consolidacao.valido ||
        totalPago > consolidacao.valorConsolidadoCentavos
      ) {
        throw new Error(
          'Pagamentos antecipados excedem o valor da fatura aberta ou a consolidacao e invalida.'
        )
      }
    } else {
      throw new Error('Situacao da fatura vinculada aos pagamentos invalida.')
    }
  }

  const idsFaturas = new Map(
    colecoes.faturasCartao.map(fatura => [fatura.id, fatura])
  )

  const idsCartoes = new Set(
    colecoes.cartoesCredito.map(cartao => cartao.id)
  )

  const faturasFechadas = new Set()

  for (const evento of colecoes.fechamentosFatura) {
    if (!fechamentoFaturaArmazenadoValido(evento)) {
      throw new Error('Evento de fechamento de fatura invalido.')
    }

    const fatura = idsFaturas.get(evento.faturaId)

    if (
      !fatura ||
      !idsCartoes.has(evento.cartaoId) ||
      fatura.cartaoId !== evento.cartaoId ||
      fatura.competencia !== evento.competencia ||
      fatura.fechamento !== evento.fechamentoPrevisto ||
      faturasFechadas.has(evento.faturaId)
    ) {
      throw new Error('Vinculo de fechamento de fatura invalido.')
    }

    faturasFechadas.add(evento.faturaId)
  }

  // Validacao bidirecional entre faturas e fechamentos.
  for (const fatura of colecoes.faturasCartao) {
    const possuiFechamento = faturasFechadas.has(fatura.id)

    if (fatura.status === 'fechada' && !possuiFechamento) {
      throw new Error(
        'Fatura fechada sem evento de fechamento confirmado.'
      )
    }

    if (fatura.status === 'aberta' && possuiFechamento) {
      throw new Error(
        'Fatura aberta com evento de fechamento confirmado.'
      )
    }
  }

  for (const obrigacao of colecoes.obrigacoesComplementaresFatura) {
    if (!vinculosObrigacaoComplementarFaturaValidos(
      obrigacao,
      colecoes
    )) {
      throw new Error(
        'Vinculos financeiros da obrigacao complementar invalidos.'
      )
    }
  }

  const pagamentosPorObrigacaoComplementar = new Map()

  for (const pagamento of colecoes.pagamentosObrigacoesComplementares) {
    const conta = Array.isArray(dados.contas)
      ? dados.contas.find(item => item.id === pagamento.contaId)
      : null

    const transacoes = Array.isArray(dados.transacoes)
      ? dados.transacoes.filter(
          item => item.id === pagamento.transacaoId
        )
      : []

    if (!conta || transacoes.length !== 1) {
      throw new Error(
        'Vinculos bancarios do pagamento complementar invalidos.'
      )
    }

    const transacao = transacoes[0]

    if (
      !transacaoArmazenadaValida(transacao) ||
      transacao.tipo !== 'despesa' ||
      transacao.contaId !== pagamento.contaId ||
      converterCentavos(transacao.valor) !== pagamento.valorPagoCentavos ||
      transacoesPagamento.has(transacao.id)
    ) {
      throw new Error(
        'Transacao bancaria do pagamento complementar inconsistente.'
      )
    }

    transacoesPagamento.add(transacao.id)

    if (!vinculosPagamentoObrigacaoComplementarValidos(
      pagamento,
      colecoes
    )) {
      throw new Error(
        'Vinculos do pagamento complementar invalidos.'
      )
    }

    const obrigacao = colecoes.obrigacoesComplementaresFatura.find(
      item => item.id === pagamento.obrigacaoId
    )

    const acumulado =
      pagamentosPorObrigacaoComplementar.get(pagamento.obrigacaoId) ?? 0

    const novoTotal = acumulado + pagamento.valorPagoCentavos

    if (
      !obrigacao ||
      !Number.isSafeInteger(novoTotal) ||
      novoTotal > obrigacao.valorOriginalCentavos
    ) {
      throw new Error(
        'Total de pagamentos complementares excede o valor da obrigacao.'
      )
    }

    pagamentosPorObrigacaoComplementar.set(
      pagamento.obrigacaoId,
      novoTotal
    )
  }

  return colecoes
}
function carregarDadosLocais() {
  try {
    const dadosSalvos = localStorage.getItem(
      CHAVE_ARMAZENAMENTO
    )

    leituraArmazenamentoConcluida = true
    armazenamentoVazioConfirmado = dadosSalvos === null

    if (dadosSalvos === null) {
      return false
    }

    const dados = JSON.parse(dadosSalvos)

    if (
      !dados ||
      !Array.isArray(dados.transacoes) ||
      !dados.transacoes.every(transacaoArmazenadaValida) ||
      !identificadoresUnicos(dados.transacoes) ||
      !limitesArmazenadosValidos(dados.limites) ||
      !Number.isFinite(dados.saldoInicial)
    ) {
      throw new Error('Estrutura de dados inválida.')
    }

    const colecoesCartoesRecuperadas =
      recuperarColecoesCartoes(dados)
    // Validar a revisao administrativa antes de recuperar
    // colecoes tecnicas ou executar qualquer migracao.
    // A ausencia do campo representa revisao legada zero.
    validarRevisaoAdministrativaTransferencias(dados)

    // Registros anteriores podem nao possuir a colecao.
    // Uma colecao existente e invalida nunca e descartada.
    const transferenciasRecuperadas =
      dados.transferencias === undefined
        ? []
        : dados.transferencias

    if (
      !Array.isArray(transferenciasRecuperadas) ||
      !transferenciasRecuperadas.every(
        transferenciaArmazenadaValida
      ) ||
      !identificadoresUnicos(transferenciasRecuperadas)
    ) {
      throw new Error('Estrutura de transferencias invalida.')
    }

    // Historico de recusas: compatibilidade com dados anteriores.
    const tentativasRecuperadas =
      dados.tentativasTransferenciaRecusadas === undefined
        ? []
        : dados.tentativasTransferenciaRecusadas

    if (
      !Array.isArray(tentativasRecuperadas) ||
      !tentativasRecuperadas.every(
        tentativa =>
          tentativa !== null &&
          typeof tentativa === 'object' &&
          !Array.isArray(tentativa) &&
          typeof tentativa.id === 'string' &&
          tentativa.id.trim().length > 0 &&
          typeof tentativa.dataHora === 'string' &&
          !Number.isNaN(Date.parse(tentativa.dataHora)) &&
          tentativa.resultado === 'recusada' &&
          typeof tentativa.motivoCodigo === 'string' &&
          tentativa.motivoCodigo.trim().length > 0
      ) ||
      new Set(
        tentativasRecuperadas.map(tentativa => tentativa.id)
      ).size !== tentativasRecuperadas.length
    ) {
      throw new Error(
        'Estrutura do historico de tentativas recusadas invalida.'
      )
    }

    // Validar os campos tecnicos antes de qualquer migracao.
    // Em caso de inconsistencia, preservar o armazenamento original.
    const colecoesTecnicasRecuperadas =
      recuperarColecoesTecnicas(dados)

    // Migracao segura: persistir antes de liberar o estado.
    // Identificar tambem colecoes obrigatorias ausentes.
    const colecoesCartaoObrigatorias = [
      'cartoesCredito',
      'comprasCartao',
      'faturasCartao',
      'pagamentosFatura',
      'pagamentosAntecipadosFatura',
      'tentativasPagamentoFaturaRecusadas',
      'fechamentosFatura',
      'obrigacoesComplementaresFatura',
      'pagamentosObrigacoesComplementares'
    ]

    const precisaMigrar =
      !Array.isArray(dados.contas) ||
      colecoesCartaoObrigatorias.some(
        nome => !Array.isArray(dados[nome])
      )

    const dadosIntegrados = {
      ...migrarDadosParaContas(
        dados,
        new Date().toISOString().slice(0, 10)
      ),
      ...colecoesCartoesRecuperadas,
      transferencias: transferenciasRecuperadas,
      tentativasTransferenciaRecusadas: tentativasRecuperadas,
      ...colecoesTecnicasRecuperadas
    }

    if (!contasValidas(dadosIntegrados.contas)) {
      throw new Error('Contas bancarias invalidas.')
    }

    const idsContas = new Set(
      dadosIntegrados.contas.map(conta => conta.id)
    )

    if (
      transferenciasRecuperadas.some(
        item =>
          !idsContas.has(item.contaOrigemId) ||
          !idsContas.has(item.contaDestinoId)
      )
    ) {
      throw new Error(
        'Transferencia vinculada a conta inexistente.'
      )
    }

    if (precisaMigrar) {
      localStorage.setItem(
        CHAVE_ARMAZENAMENTO,
        JSON.stringify(dadosIntegrados)
      )
    }

    // Restaurar os estados tecnicos antes dos financeiros.
    pendenciasTecnicasTransferencia.value =
      colecoesTecnicasRecuperadas.pendenciasTecnicasTransferencia

    bloqueiosTecnicosTransferencia.value =
      colecoesTecnicasRecuperadas.bloqueiosTecnicosTransferencia

    historicoRegularizacoesTecnicas.value =
      colecoesTecnicasRecuperadas.historicoRegularizacoesTecnicas

    inconsistenciasPendenciasTecnicas.value =
      colecoesTecnicasRecuperadas.inconsistenciasPendenciasTecnicas

    cartoesCredito.value = colecoesCartoesRecuperadas.cartoesCredito
    comprasCartao.value = colecoesCartoesRecuperadas.comprasCartao
    faturasCartao.value = colecoesCartoesRecuperadas.faturasCartao
    pagamentosFatura.value = colecoesCartoesRecuperadas.pagamentosFatura
    pagamentosAntecipadosFatura.value = colecoesCartoesRecuperadas.pagamentosAntecipadosFatura
    tentativasPagamentoFaturaRecusadas.value =
      colecoesCartoesRecuperadas.tentativasPagamentoFaturaRecusadas
    fechamentosFatura.value = colecoesCartoesRecuperadas.fechamentosFatura
    obrigacoesComplementaresFatura.value =
      colecoesCartoesRecuperadas.obrigacoesComplementaresFatura
    pagamentosObrigacoesComplementares.value =
      colecoesCartoesRecuperadas.pagamentosObrigacoesComplementares

    contas.value = dadosIntegrados.contas
    transferencias.value = transferenciasRecuperadas
    tentativasTransferenciaRecusadas.value = tentativasRecuperadas
    dados.transacoes = dadosIntegrados.transacoes
    const maiorId = dados.transacoes.reduce(
      (maior, item) => Math.max(maior, item.id),
      0
    )

    const novoProximoId = Math.max(
      maiorId + 1,
      Number.isSafeInteger(dados.proximoId) &&
      dados.proximoId > 0
        ? dados.proximoId
        : 1
    )

    if (!Number.isSafeInteger(novoProximoId)) {
      throw new Error(
        'Limite de identificadores de transações atingido.'
      )
    }

    transacoes.value = dados.transacoes
    limites.value = dados.limites
    saldoInicial.value = dados.saldoInicial
    proximoId = novoProximoId

    // Mantém as categorias padrão e recupera as
    // categorias personalizadas já cadastradas.

    if (
      categoriasArmazenadasValidas(
        dados.categoriasDespesa
      )
    ) {
      categoriasDespesa.value = [
        ...new Set([
          ...categoriasDespesa.value,
          ...dados.categoriasDespesa
        ])
      ]
    }

    if (
      categoriasArmazenadasValidas(
        dados.categoriasReceita
      )
    ) {
      categoriasReceita.value = [
        ...new Set([
          ...categoriasReceita.value,
          ...dados.categoriasReceita
        ])
      ]
    }

    return true
  } catch (erro) {
    console.error(
      'Não foi possível recuperar os dados do Nexus Finanças:',
      erro
    )

    return false
  }
}

// =====================================================
// PERSISTÊNCIA FINANCEIRA
// =====================================================

function validarRevisaoAdministrativaTransferencias(dados) {
  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados)
  ) {
    throw new Error('Estrutura administrativa invalida.')
  }

  const revisao = dados.revisaoAdministrativaTransferencias

  if (revisao === undefined) {
    return 0
  }

  if (
    !Number.isSafeInteger(revisao) ||
    revisao < 0
  ) {
    throw new Error('Revisao administrativa invalida.')
  }

  return revisao
}
function prepararProximaRevisaoAdministrativaTransferencias(revisaoEsperada) {
  if (
    !Number.isSafeInteger(revisaoEsperada) ||
    revisaoEsperada < 0
  ) {
    throw new Error('Revisao administrativa esperada invalida.')
  }

  const textoPersistido = localStorage.getItem(
    CHAVE_ARMAZENAMENTO
  )

  if (typeof textoPersistido !== 'string' || !textoPersistido) {
    throw new Error('Armazenamento administrativo indisponivel.')
  }

  const dadosPersistidos = JSON.parse(textoPersistido)

  const revisaoAtual =
    validarRevisaoAdministrativaTransferencias(dadosPersistidos)

  if (revisaoAtual !== revisaoEsperada) {
    throw new Error('Conflito de revisao administrativa.')
  }

  if (revisaoAtual === Number.MAX_SAFE_INTEGER) {
    throw new Error('Limite de revisoes administrativas atingido.')
  }

  return {
    revisaoEsperada,
    revisaoAtual,
    proximaRevisao: revisaoAtual + 1
  }
}
function comporDadosFinanceirosPersistidos(sobrescritas = {}) {
  // Enquanto nao houver restauracao validada, preservar os
  // campos tecnicos diretamente do armazenamento existente.
  const camposTecnicos = [
    'pendenciasTecnicasTransferencia',
    'bloqueiosTecnicosTransferencia',
    'historicoRegularizacoesTecnicas',
    'inconsistenciasPendenciasTecnicas'
  ]

  const dadosSalvos = localStorage.getItem(CHAVE_ARMAZENAMENTO)
  let dadosAnteriores = {}

  if (dadosSalvos !== null) {
    const dadosLidos = JSON.parse(dadosSalvos)

    if (
      !dadosLidos ||
      typeof dadosLidos !== 'object' ||
      Array.isArray(dadosLidos)
    ) {
      throw new Error('Armazenamento existente invalido.')
    }

    dadosAnteriores = dadosLidos
  }

  const revisaoAdministrativa =
    validarRevisaoAdministrativaTransferencias(dadosAnteriores)

  const tecnicosPreservados = {}

  for (const campo of camposTecnicos) {
    if (Object.prototype.hasOwnProperty.call(dadosAnteriores, campo)) {
      tecnicosPreservados[campo] = dadosAnteriores[campo]
    }
  }

  return {
    transacoes: transacoes.value,
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId,
    categoriasDespesa: categoriasDespesa.value,
    categoriasReceita: categoriasReceita.value,
    versaoDados: VERSAO_DADOS_CONTAS,
    contas: contas.value,
    cartoesCredito: cartoesCredito.value,
    comprasCartao: comprasCartao.value,
    faturasCartao: faturasCartao.value,
    pagamentosFatura: pagamentosFatura.value,
    pagamentosAntecipadosFatura: pagamentosAntecipadosFatura.value,
    tentativasPagamentoFaturaRecusadas: tentativasPagamentoFaturaRecusadas.value,
    fechamentosFatura: fechamentosFatura.value,
    obrigacoesComplementaresFatura: obrigacoesComplementaresFatura.value,
    pagamentosObrigacoesComplementares: pagamentosObrigacoesComplementares.value,
    transferencias: transferencias.value,
    tentativasTransferenciaRecusadas: tentativasTransferenciaRecusadas.value,
    pendenciasTecnicasTransferencia: pendenciasTecnicasTransferencia.value,
    bloqueiosTecnicosTransferencia: bloqueiosTecnicosTransferencia.value,
    historicoRegularizacoesTecnicas: historicoRegularizacoesTecnicas.value,
    inconsistenciasPendenciasTecnicas: inconsistenciasPendenciasTecnicas.value,
    ...tecnicosPreservados,
    ...sobrescritas,
    revisaoAdministrativaTransferencias: revisaoAdministrativa
  }
}
function salvarDadosLocais() {
  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    console.warn(
      'Salvamento bloqueado: os dados armazenados estão protegidos.'
    )

    return false
  }

  try {
    const dados = comporDadosFinanceirosPersistidos()

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify(dados)
    )

    return true
  } catch (erro) {
    console.error(
      'Não foi possível salvar os dados do Nexus Finanças:',
      erro
    )

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Não foi possível salvar os dados financeiros. ' +
      'Novas alterações foram bloqueadas para evitar perda de dados.'

    return false
  }
}

function registrarTentativaPagamentoFaturaRecusada(dados) {
  const protegerAuditoria = mensagem => {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true
    aviso.value = mensagem
    return false
  }

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    aviso.value =
      'Registro de tentativa recusada bloqueado: armazenamento protegido.'
    return false
  }

  const registro = construirTentativaPagamentoFaturaRecusada(dados)

  if (!registro) {
    return protegerAuditoria(
      'Nao foi possivel construir o registro obrigatorio da tentativa recusada.'
    )
  }

  const mesmoConteudo = (primeiro, segundo) =>
    JSON.stringify(primeiro) === JSON.stringify(segundo)

  try {
    const textoPersistido = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoPersistido === null) {
      return protegerAuditoria(
        'Armazenamento financeiro ausente. Registro bloqueado.'
      )
    }

    const dadosPersistidos = JSON.parse(textoPersistido)

    if (
      !dadosPersistidos ||
      typeof dadosPersistidos !== 'object' ||
      Array.isArray(dadosPersistidos)
    ) {
      return protegerAuditoria(
        'Armazenamento financeiro invalido. Registro bloqueado.'
      )
    }

    const historicoPersistido =
      dadosPersistidos.tentativasPagamentoFaturaRecusadas ?? []

    const historicoAtual = tentativasPagamentoFaturaRecusadas.value

    if (
      !Array.isArray(historicoPersistido) ||
      !Array.isArray(historicoAtual)
    ) {
      return protegerAuditoria(
        'Historico de tentativas recusadas invalido.'
      )
    }

    const validarHistorico = historico => {
      const ids = new Set()
      const operacoesAntecipadas = new Set()

      for (const tentativa of historico) {
        if (!tentativaPagamentoFaturaRecusadaArmazenadaValida(tentativa)) {
          return false
        }

        const chaveId = String(tentativa.id)

        if (ids.has(chaveId)) {
          return false
        }

        ids.add(chaveId)

        if (
          tentativa.modalidade === 'antecipado' &&
          Object.prototype.hasOwnProperty.call(tentativa, 'operacaoId')
        ) {
          if (operacoesAntecipadas.has(tentativa.operacaoId)) {
            return false
          }

          operacoesAntecipadas.add(tentativa.operacaoId)
        }
      }

      return true
    }

    if (
      !validarHistorico(historicoPersistido) ||
      !validarHistorico(historicoAtual)
    ) {
      return protegerAuditoria(
        'Historico de tentativas recusadas inconsistente.'
      )
    }

    if (!mesmoConteudo(historicoPersistido, historicoAtual)) {
      return protegerAuditoria(
        'Divergencia entre historico persistido e memoria. ' +
        'Verificacao necessaria antes de registrar novas tentativas.'
      )
    }

    const existente = historicoPersistido.find(
      tentativa => String(tentativa.id) === String(registro.id)
    )

    if (existente) {
      if (mesmoConteudo(existente, registro)) {
        return true
      }

      return protegerAuditoria(
        'Conflito de identificador no historico de tentativas recusadas.'
      )
    }

    if (
      registro.modalidade === 'antecipado' &&
      Object.prototype.hasOwnProperty.call(registro, 'operacaoId') &&
      historicoPersistido.some(tentativa =>
        tentativa.modalidade === 'antecipado' &&
        tentativa.operacaoId === registro.operacaoId
      )
    ) {
      return protegerAuditoria(
        'Conflito de operacaoId entre tentativas recusadas.'
      )
    }

    const novoHistorico = [
      ...historicoPersistido,
      registro
    ]

    const dadosEsperados = comporDadosFinanceirosPersistidos({
      tentativasPagamentoFaturaRecusadas: novoHistorico
    })

    const dadosAnterioresSemRecusas = {
      ...dadosPersistidos
    }

    const dadosEsperadosSemRecusas = {
      ...dadosEsperados
    }

    delete dadosAnterioresSemRecusas.tentativasPagamentoFaturaRecusadas
    delete dadosEsperadosSemRecusas.tentativasPagamentoFaturaRecusadas

    const mesmoConteudoFinanceiro = (primeiro, segundo) => {
      if (Object.is(primeiro, segundo)) {
        return true
      }

      if (primeiro === null || segundo === null) {
        return false
      }

      if (typeof primeiro !== typeof segundo) {
        return false
      }

      if (typeof primeiro !== 'object') {
        return false
      }

      const primeiroArray = Array.isArray(primeiro)
      const segundoArray = Array.isArray(segundo)

      if (primeiroArray !== segundoArray) {
        return false
      }

      if (primeiroArray) {
        return (
          primeiro.length === segundo.length &&
          primeiro.every((valor, indice) =>
            mesmoConteudoFinanceiro(valor, segundo[indice])
          )
        )
      }

      const chavesPrimeiro = Object.keys(primeiro)
      const chavesSegundo = Object.keys(segundo)

      return (
        chavesPrimeiro.length === chavesSegundo.length &&
        chavesPrimeiro.every(chave =>
          Object.prototype.hasOwnProperty.call(segundo, chave) &&
          mesmoConteudoFinanceiro(primeiro[chave], segundo[chave])
        )
      )
    }

    if (!mesmoConteudoFinanceiro(
      dadosAnterioresSemRecusas,
      dadosEsperadosSemRecusas
    )) {
      return protegerAuditoria(
        'Divergencia em dados financeiros nao relacionados ' +
        'ao registro de tentativas recusadas.'
      )
    }

    if (!persistirOperacaoFinanceira({
      tentativasPagamentoFaturaRecusadas: novoHistorico
    })) {
      return false
    }

    const textoConfirmacao = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoConfirmacao === null) {
      return protegerAuditoria(
        'Gravacao sem confirmacao. Verificacao administrativa necessaria.'
      )
    }

    const dadosConfirmados = JSON.parse(textoConfirmacao)

    if (
      !dadosConfirmados ||
      typeof dadosConfirmados !== 'object' ||
      Array.isArray(dadosConfirmados) ||
      !mesmoConteudo(dadosConfirmados, dadosEsperados)
    ) {
      return protegerAuditoria(
        'Resultado da persistencia indeterminado. Operacoes bloqueadas.'
      )
    }

    tentativasPagamentoFaturaRecusadas.value = novoHistorico

    return true
  } catch (erro) {
    console.error(
      'Falha ao registrar tentativa recusada de pagamento:',
      erro
    )

    return protegerAuditoria(
      'Falha na auditoria de pagamento. ' +
      'Operacoes bloqueadas ate verificacao.'
    )
  }
}
function persistirOperacaoFinanceira(novosDados) {
  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return false
  }

  try {
    const dados = comporDadosFinanceirosPersistidos(novosDados)

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify(dados)
    )

    return true
  } catch (erro) {
    console.error(
      'Falha na persistência da operação financeira:',
      erro
    )

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Não foi possível salvar os dados financeiros. ' +
      'A operação não foi aplicada e novas alterações foram bloqueadas.'

    return false
  }
}

function registrarPendenciaTecnicaTransferencia(dadosPendencia) {
  const idTentativa = dadosPendencia?.idTentativa

  if (
    typeof idTentativa !== 'string' ||
    !idTentativa.trim()
  ) {
    armazenamentoProtegido.value = true
    bloqueioPersistencia = true
    aviso.value =
      'Identificacao tecnica invalida. Operacoes financeiras bloqueadas.'
    return false
  }

  const pendencia = {
    idTentativa,
    situacao: 'verificacao_pendente',
    situacaoPersistencia:
      dadosPendencia?.situacaoPersistencia ?? 'indeterminada',
    motivoCodigo: dadosPendencia?.motivoCodigo ?? null,
    dataHora: new Date().toISOString()
  }

  const preservarEvidencia = motivo => {
    const existente = pendenciasTecnicasTransferencia.value.find(
      item => item.idTentativa === idTentativa
    )

    if (!existente) {
      pendenciasTecnicasTransferencia.value = [
        ...pendenciasTecnicasTransferencia.value,
        {
          ...pendencia,
          situacaoPersistencia: 'indeterminada'
        }
      ]
    }

    armazenamentoProtegido.value = true
    bloqueioPersistencia = true

    aviso.value =
      'Pendencia tecnica sem confirmacao segura: ' +
      motivo +
      '. Operacoes financeiras bloqueadas.'

    return false
  }

  try {
    if (
      bloqueioPersistencia ||
      armazenamentoProtegido.value
    ) {
      return preservarEvidencia('armazenamento protegido')
    }

    const textoPersistido = localStorage.getItem(
      CHAVE_ARMAZENAMENTO
    )

    if (textoPersistido === null) {
      return preservarEvidencia('armazenamento indisponivel')
    }

    const dadosPersistidos = JSON.parse(textoPersistido)

    if (
      !dadosPersistidos ||
      typeof dadosPersistidos !== 'object' ||
      Array.isArray(dadosPersistidos)
    ) {
      return preservarEvidencia('estrutura persistida invalida')
    }

    const pendenciasPersistidas =
      dadosPersistidos.pendenciasTecnicasTransferencia ?? []

    if (
      !Array.isArray(pendenciasPersistidas) ||
      pendenciasPersistidas.some(
        item =>
          !item ||
          typeof item !== 'object' ||
          Array.isArray(item) ||
          typeof item.idTentativa !== 'string' ||
          !item.idTentativa.trim()
      )
    ) {
      return preservarEvidencia('colecao persistida invalida')
    }

    const idsPersistidos = pendenciasPersistidas.map(
      item => item.idTentativa
    )

    if (
      new Set(idsPersistidos).size !== idsPersistidos.length ||
      JSON.stringify(pendenciasPersistidas) !==
        JSON.stringify(pendenciasTecnicasTransferencia.value)
    ) {
      return preservarEvidencia('divergencia entre memoria e armazenamento')
    }

    const existente = pendenciasPersistidas.find(
      item => item.idTentativa === idTentativa
    )

    if (existente) {
      const dadosCompativeis =
        existente.situacao === 'verificacao_pendente' &&
        existente.situacaoPersistencia ===
          pendencia.situacaoPersistencia &&
        existente.motivoCodigo === pendencia.motivoCodigo

      if (!dadosCompativeis) {
        return preservarEvidencia('duplicidade conflitante')
      }

      return true
    }

    const novasPendencias = [
      ...pendenciasPersistidas,
      pendencia
    ]

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify({
        ...dadosPersistidos,
        pendenciasTecnicasTransferencia: novasPendencias
      })
    )

    const textoConfirmacao = localStorage.getItem(
      CHAVE_ARMAZENAMENTO
    )

    if (textoConfirmacao === null) {
      return preservarEvidencia('gravacao nao confirmada')
    }

    const dadosConfirmados = JSON.parse(textoConfirmacao)

    if (
      JSON.stringify(
        dadosConfirmados?.pendenciasTecnicasTransferencia
      ) !== JSON.stringify(novasPendencias)
    ) {
      return preservarEvidencia('resultado da gravacao divergente')
    }

    pendenciasTecnicasTransferencia.value = novasPendencias

    return true
  } catch (erro) {
    console.error(
      'Falha ao registrar pendencia tecnica de transferencia:',
      erro
    )

    return preservarEvidencia('falha de persistencia')
  }
}
async function registrarAnaliseAdministrativaTransferencia(dadosAnalise) {
  return executarComExclusividadeAdministrativa(async () => {
  const idTentativa = dadosAnalise?.idTentativa?.trim?.()
  const responsavel = dadosAnalise?.responsavel?.trim?.()
  const justificativa = dadosAnalise?.justificativa?.trim?.()
  const evidencias = dadosAnalise?.evidencias

  if (
    typeof idTentativa !== 'string' ||
    !idTentativa ||
    typeof responsavel !== 'string' ||
    !responsavel ||
    typeof justificativa !== 'string' ||
    !justificativa ||
    !Array.isArray(evidencias) ||
    evidencias.length === 0 ||
    !evidencias.every(
      item => typeof item === 'string' && item.trim()
    )
  ) {
    aviso.value =
      'Analise administrativa invalida: informe identificacao, ' +
      'responsavel, justificativa e evidencias.'
    return false
  }

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value
  ) {
    aviso.value =
      'Armazenamento protegido. Analise administrativa nao registrada.'
    return false
  }

  try {
    const textoPersistido = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoPersistido === null) {
      throw new Error('Armazenamento financeiro indisponivel.')
    }

    const dadosPersistidos = JSON.parse(textoPersistido)

    if (
      !dadosPersistidos ||
      typeof dadosPersistidos !== 'object' ||
      Array.isArray(dadosPersistidos)
    ) {
      throw new Error('Estrutura persistida invalida.')
    }

    const revisaoAdministrativaAtual =
      validarRevisaoAdministrativaTransferencias(dadosPersistidos)

    const controleRevisao =
      prepararProximaRevisaoAdministrativaTransferencias(
        revisaoAdministrativaAtual
      )
    const nomesColecoes = [
      'pendenciasTecnicasTransferencia',
      'bloqueiosTecnicosTransferencia',
      'historicoRegularizacoesTecnicas',
      'inconsistenciasPendenciasTecnicas'
    ]

    const estados = {
      pendenciasTecnicasTransferencia,
      bloqueiosTecnicosTransferencia,
      historicoRegularizacoesTecnicas,
      inconsistenciasPendenciasTecnicas
    }

    for (const nome of nomesColecoes) {
      const persistidos = dadosPersistidos[nome] ?? []

      if (
        !Array.isArray(persistidos) ||
        !persistidos.every(
          item =>
            item !== null &&
            typeof item === 'object' &&
            !Array.isArray(item)
        ) ||
        JSON.stringify(persistidos) !==
          JSON.stringify(estados[nome].value)
      ) {
        throw new Error(`Divergencia na colecao: ${nome}.`)
      }
    }

    const pendencias = dadosPersistidos.pendenciasTecnicasTransferencia ?? []

    const correspondentes = pendencias.filter(
      item => item.idTentativa === idTentativa
    )

    if (
      correspondentes.length !== 1 ||
      correspondentes[0].situacao !== 'verificacao_pendente'
    ) {
      aviso.value =
        'Pendencia administrativa inexistente, duplicada ou invalida.'
      return false
    }

    const historico = dadosPersistidos.historicoRegularizacoesTecnicas ?? []

    const idAnalise = dadosAnalise?.idAnalise?.trim?.()

    if (typeof idAnalise !== 'string' || !idAnalise) {
      aviso.value = 'Identificador da analise administrativa invalido.'
      return false
    }

    if (historico.some(item => item.idAnalise === idAnalise)) {
      aviso.value = 'Identificador de analise administrativa ja utilizado.'
      return false
    }

    const novaAnalise = {
      idAnalise,
      idTentativa,
      responsavel,
      justificativa,
      evidencias: evidencias.map(item => item.trim()),
      dataHora: new Date().toISOString(),
      situacao: 'analise_registrada',
      liberaOperacoes: false
    }

    const novoHistorico = [...historico, novaAnalise]

    const novosDados = {
      ...dadosPersistidos,
      historicoRegularizacoesTecnicas: novoHistorico,
      revisaoAdministrativaTransferencias:
        controleRevisao.proximaRevisao
    }

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify(novosDados)
    )

    const textoConfirmacao = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoConfirmacao === null) {
      throw new Error('Gravacao administrativa nao confirmada.')
    }

    const dadosConfirmados = JSON.parse(textoConfirmacao)

    if (JSON.stringify(dadosConfirmados) !== JSON.stringify(novosDados)) {
      throw new Error('Divergencia na confirmacao administrativa.')
    }

    historicoRegularizacoesTecnicas.value = novoHistorico

    aviso.value = 'Analise administrativa registrada. Pendencia mantida.'
    return true
  } catch (erro) {
    console.error('Falha no registro administrativo:', erro)

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Falha ou divergencia administrativa. ' +
      'Operacoes financeiras permanecem bloqueadas.'

    return false
  }
  })
}
async function executarComExclusividadeAdministrativa(operacao) {
  const gerenciador =
    typeof navigator !== 'undefined'
      ? navigator.locks
      : undefined

  if (
    !gerenciador ||
    typeof gerenciador.request !== 'function' ||
    typeof operacao !== 'function'
  ) {
    aviso.value =
      'Exclusividade administrativa indisponivel. Operacao bloqueada.'
    return false
  }

  try {
    return await gerenciador.request(
      'nexus-financas-reconciliacao-administrativa',
      {
        mode: 'exclusive',
        ifAvailable: true
      },
      async bloqueio => {
        if (!bloqueio) {
          aviso.value =
            'Outra operacao administrativa esta em andamento.'
          return false
        }

        return await operacao()
      }
    )
  } catch {
    aviso.value =
      'Falha no controle de exclusividade administrativa.'
    return false
  }
}
function validarCadeiaHistoricaAdministrativa(historico) {
  if (
    !Array.isArray(historico) ||
    !historico.every(
      item => item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item)
    )
  ) {
    return false
  }

  const normalizar = valor =>
    typeof valor === 'string' ? valor.trim() : ''

  const registrosPorId = new Map()

  for (const registro of historico) {
    const idAnalise = normalizar(registro.idAnalise)
    const idReconciliacao = normalizar(registro.idReconciliacao)

    if (idAnalise && idReconciliacao) {
      return false
    }

    const identificador = idAnalise || idReconciliacao

    if (!identificador || registrosPorId.has(identificador)) {
      return false
    }

    registrosPorId.set(identificador, registro)
  }

  const visitados = new Set()
  const emAnalise = new Set()

  const verificarRegistro = identificador => {
    if (emAnalise.has(identificador)) {
      return false
    }

    if (visitados.has(identificador)) {
      return true
    }

    const registro = registrosPorId.get(identificador)

    if (!registro) {
      return false
    }

    emAnalise.add(identificador)

    if (registro.idAnaliseAnterior !== undefined) {
      const idAnterior = normalizar(registro.idAnaliseAnterior)

      if (!idAnterior) {
        return false
      }

      const registroAnterior = registrosPorId.get(idAnterior)

      if (
        !registroAnterior ||
        normalizar(registroAnterior.idTentativa) !==
          normalizar(registro.idTentativa) ||
        !verificarRegistro(idAnterior)
      ) {
        return false
      }
    }

    emAnalise.delete(identificador)
    visitados.add(identificador)

    return true
  }

  return [...registrosPorId.keys()].every(verificarRegistro)
}
async function registrarReconciliacaoAdministrativaTransferencia(dadosReconciliacao) {
  return executarComExclusividadeAdministrativa(async () => {
    if (
      bloqueioPersistencia ||
      armazenamentoProtegido.value
    ) {
      aviso.value =
        'Persistencia protegida. Reconciliacao administrativa bloqueada.'
      return false
    }

    let dadosPersistidos

    try {
      const textoPersistido = localStorage.getItem(CHAVE_ARMAZENAMENTO)

      if (typeof textoPersistido !== 'string' || !textoPersistido) {
        aviso.value =
          'Dados persistidos indisponiveis para reconciliacao.'
        return false
      }

      dadosPersistidos = JSON.parse(textoPersistido)
    } catch {
      aviso.value =
        'Falha na leitura dos dados administrativos persistidos.'
      return false
    }

    if (
      !dadosPersistidos ||
      typeof dadosPersistidos !== 'object' ||
      Array.isArray(dadosPersistidos)
    ) {
      aviso.value = 'Estrutura persistida invalida.'
      return false
    }

    const colecoesAdministrativas = [
      'pendenciasTecnicasTransferencia',
      'bloqueiosTecnicosTransferencia',
      'historicoRegularizacoesTecnicas',
      'inconsistenciasPendenciasTecnicas'
    ]

    const colecoesValidas = colecoesAdministrativas.every(
      nome => {
        const persistida = dadosPersistidos[nome]
        return Array.isArray(persistida)
      }
    )

    if (!colecoesValidas) {
      aviso.value =
        'Colecoes administrativas persistidas invalidas.'
      return false
    }

    const colecoesAtuais = {
      pendenciasTecnicasTransferencia:
        pendenciasTecnicasTransferencia.value,
      bloqueiosTecnicosTransferencia:
        bloqueiosTecnicosTransferencia.value,
      historicoRegularizacoesTecnicas:
        historicoRegularizacoesTecnicas.value,
      inconsistenciasPendenciasTecnicas:
        inconsistenciasPendenciasTecnicas.value
    }

    const estadoConsistente = colecoesAdministrativas.every(
      nome =>
        JSON.stringify(dadosPersistidos[nome]) ===
        JSON.stringify(colecoesAtuais[nome])
    )

    if (!estadoConsistente) {
      aviso.value =
        'Divergencia entre estado administrativo e armazenamento.'
      return false
    }

  const normalizar = valor =>
    typeof valor === 'string' ? valor.trim() : ''

  const idReconciliacao = normalizar(dadosReconciliacao?.idReconciliacao)
  const idTentativa = normalizar(dadosReconciliacao?.idTentativa)
  const responsavel = normalizar(dadosReconciliacao?.responsavel)
  const justificativa = normalizar(dadosReconciliacao?.justificativa)
  const resultado = normalizar(dadosReconciliacao?.resultado)

  const referenciaInformada =
    dadosReconciliacao?.idAnaliseAnterior !== undefined

  const idAnaliseAnterior = referenciaInformada
    ? normalizar(dadosReconciliacao.idAnaliseAnterior)
    : undefined

  const evidencias = dadosReconciliacao?.evidencias

  const resultadosPermitidos = [
    'inconclusiva',
    'execucao_comprovada',
    'nao_execucao_comprovada',
    'inconsistencia_identificada'
  ]

  const identificadoresValidos =
    idReconciliacao.length > 0 &&
    idTentativa.length > 0 &&
    responsavel.length > 0 &&
    justificativa.length > 0

  const evidenciasValidas =
    Array.isArray(evidencias) &&
    evidencias.length > 0 &&
    evidencias.every(
      item => typeof item === 'string' && item.trim().length > 0
    )

  if (
    !identificadoresValidos ||
    !evidenciasValidas ||
    !resultadosPermitidos.includes(resultado) ||
    (referenciaInformada && !idAnaliseAnterior)
  ) {
    aviso.value =
      'Reconciliacao administrativa invalida: dados ou resultado incorretos.'
    return false
  }

  if (referenciaInformada && idAnaliseAnterior === idReconciliacao) {
    aviso.value =
      'Referencia administrativa circular nao permitida.'
    return false
  }

  const pendencias = pendenciasTecnicasTransferencia.value
  const historico = historicoRegularizacoesTecnicas.value

  if (!Array.isArray(pendencias) || !Array.isArray(historico)) {
    aviso.value = 'Estrutura administrativa invalida.'
    return false
  }

  const correspondentes = pendencias.filter(
    item =>
      item !== null &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      item.idTentativa === idTentativa
  )

  if (
    correspondentes.length !== 1 ||
    correspondentes[0].situacao !== 'verificacao_pendente'
  ) {
    aviso.value =
      'Pendencia tecnica inexistente, duplicada ou fora de verificacao.'
    return false
  }

  const historicoValido = historico.every(
    item =>
      item !== null &&
      typeof item === 'object' &&
      !Array.isArray(item)
  )

  if (!historicoValido) {
    aviso.value = 'Historico administrativo invalido.'
    return false
  }

  const identificadorUtilizado = historico.some(
    item =>
      normalizar(item.idReconciliacao) === idReconciliacao ||
      normalizar(item.idAnalise) === idReconciliacao
  )

  if (identificadorUtilizado) {
    aviso.value = 'Identificador administrativo ja utilizado.'
    return false
  }

  if (referenciaInformada) {
    const anteriores = historico.filter(
      item =>
        normalizar(item.idTentativa) === idTentativa &&
        (
          normalizar(item.idAnalise) === idAnaliseAnterior ||
          normalizar(item.idReconciliacao) === idAnaliseAnterior
        )
    )

    if (anteriores.length !== 1) {
      aviso.value =
        'Referencia administrativa anterior inexistente ou ambigua.'
      return false
    }
  }

  if (!validarCadeiaHistoricaAdministrativa(historico)) {
    aviso.value =
      'Historico administrativo inconsistente ou com referencias invalidas.'
    return false
  }
  // Persistencia controlada, sem liberacao de operacoes financeiras.
  try {
    const revisaoEsperada =
      validarRevisaoAdministrativaTransferencias(dadosPersistidos)

    const controleRevisao =
      prepararProximaRevisaoAdministrativaTransferencias(
        revisaoEsperada
      )

    const novaReconciliacao = {
      tipo: 'reconciliacao_administrativa',
      idReconciliacao,
      idTentativa,
      responsavel,
      justificativa,
      evidencias: evidencias.map(item => item.trim()),
      resultado,
      dataHora: new Date().toISOString(),
      liberaOperacoes: false,
      ...(referenciaInformada ? { idAnaliseAnterior } : {})
    }

    const novoHistorico = [
      ...historico,
      novaReconciliacao
    ]

    const novosDados = {
      ...dadosPersistidos,
      historicoRegularizacoesTecnicas: novoHistorico,
      revisaoAdministrativaTransferencias:
        controleRevisao.proximaRevisao
    }

    // Revalidar a revisao imediatamente antes da escrita.
    prepararProximaRevisaoAdministrativaTransferencias(
      revisaoEsperada
    )

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify(novosDados)
    )

    const textoConfirmacao =
      localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (typeof textoConfirmacao !== 'string' || !textoConfirmacao) {
      throw new Error('Confirmacao administrativa indisponivel.')
    }

    const dadosConfirmados = JSON.parse(textoConfirmacao)

    if (
      JSON.stringify(dadosConfirmados) !==
      JSON.stringify(novosDados)
    ) {
      throw new Error('Divergencia na confirmacao da reconciliacao.')
    }

    historicoRegularizacoesTecnicas.value = novoHistorico

    aviso.value =
      'Reconciliacao administrativa registrada. ' +
      'Pendencia e bloqueios tecnicos preservados.'

    return true
  } catch (erro) {
    console.error('Falha na reconciliacao administrativa:', erro)

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Persistencia administrativa nao confirmada. ' +
      'Operacoes financeiras permanecem bloqueadas.'

    return false
  }
  })
}
async function recuperarConfirmacaoReconciliacaoAdministrativaTransferencia(
  dadosReconciliacao
) {
  return executarComExclusividadeAdministrativa(async () => {
    const normalizar = valor =>
      typeof valor === 'string' ? valor.trim() : ''

    const idReconciliacao =
      normalizar(dadosReconciliacao?.idReconciliacao)

    const idTentativa =
      normalizar(dadosReconciliacao?.idTentativa)

    const responsavel =
      normalizar(dadosReconciliacao?.responsavel)

    const justificativa =
      normalizar(dadosReconciliacao?.justificativa)

    const resultado =
      normalizar(dadosReconciliacao?.resultado)

    const referenciaInformada =
      dadosReconciliacao?.idAnaliseAnterior !== undefined

    const idAnaliseAnterior =
      normalizar(dadosReconciliacao?.idAnaliseAnterior)

    const evidencias = dadosReconciliacao?.evidencias

    if (
      !idReconciliacao ||
      !idTentativa ||
      !responsavel ||
      !justificativa ||
      !resultado ||
      (referenciaInformada && !idAnaliseAnterior) ||
      !Array.isArray(evidencias) ||
      evidencias.length === 0 ||
      !evidencias.every(
        item => typeof item === 'string' && item.trim()
      )
    ) {
      aviso.value = 'Dados de recuperacao administrativa invalidos.'
      return false
    }

    try {
      const textoPersistido =
        localStorage.getItem(CHAVE_ARMAZENAMENTO)

      if (typeof textoPersistido !== 'string' || !textoPersistido) {
        throw new Error('Armazenamento administrativo indisponivel.')
      }

      const dados = JSON.parse(textoPersistido)

      validarRevisaoAdministrativaTransferencias(dados)

      const colecoes = [
        'pendenciasTecnicasTransferencia',
        'bloqueiosTecnicosTransferencia',
        'historicoRegularizacoesTecnicas',
        'inconsistenciasPendenciasTecnicas'
      ]

      if (!colecoes.every(nome => Array.isArray(dados[nome]))) {
        throw new Error('Colecoes administrativas invalidas.')
      }

      const historico = dados.historicoRegularizacoesTecnicas

      if (!validarCadeiaHistoricaAdministrativa(historico)) {
        throw new Error('Cadeia historica administrativa inconsistente.')
      }

      if (!historico.every(
        item => item && typeof item === 'object' &&
          !Array.isArray(item)
      )) {
        throw new Error('Historico administrativo invalido.')
      }

      const correspondentes = historico.filter(
        item =>
          normalizar(item.idReconciliacao) === idReconciliacao ||
          normalizar(item.idAnalise) === idReconciliacao
      )

      if (correspondentes.length !== 1) {
        throw new Error('Identificador inexistente ou ambiguo.')
      }

      const registro = correspondentes[0]

      const evidenciasNormalizadas =
        evidencias.map(item => item.trim())

      const valido =
        registro.tipo === 'reconciliacao_administrativa' &&
        normalizar(registro.idReconciliacao) === idReconciliacao &&
        normalizar(registro.idTentativa) === idTentativa &&
        normalizar(registro.responsavel) === responsavel &&
        normalizar(registro.justificativa) === justificativa &&
        normalizar(registro.resultado) === resultado &&
        registro.liberaOperacoes === false &&
        typeof registro.dataHora === 'string' &&
        !Number.isNaN(Date.parse(registro.dataHora)) &&
        Array.isArray(registro.evidencias) &&
        JSON.stringify(registro.evidencias) ===
          JSON.stringify(evidenciasNormalizadas) &&
        (
          referenciaInformada
            ? normalizar(registro.idAnaliseAnterior) ===
                idAnaliseAnterior
            : registro.idAnaliseAnterior === undefined
        )

      if (!valido) {
        throw new Error('Registro administrativo divergente.')
      }

      const pendencias = dados.pendenciasTecnicasTransferencia.filter(
        item =>
          item &&
          typeof item === 'object' &&
          !Array.isArray(item) &&
          item.idTentativa === idTentativa &&
          item.situacao === 'verificacao_pendente'
      )

      if (pendencias.length !== 1) {
        throw new Error('Pendencia administrativa nao comprovada.')
      }

      const textoConfirmacao =
        localStorage.getItem(CHAVE_ARMAZENAMENTO)

      if (textoConfirmacao !== textoPersistido) {
        throw new Error('Armazenamento alterado durante a verificacao.')
      }

      aviso.value =
        'Registro administrativo persistido identificado. ' +
        'Bloqueios financeiros preservados.'

      return true
    } catch (erro) {
      console.error('Falha na recuperacao administrativa:', erro)

      bloqueioPersistencia = true
      armazenamentoProtegido.value = true

      aviso.value =
        'Integridade administrativa nao comprovada. ' +
        'Operacoes financeiras permanecem bloqueadas.'

      return false
    }
  })
}
function existemImpedimentosTecnicosTransferencia() {
  return (
    pendenciasTecnicasTransferencia.value.length > 0 ||
    bloqueiosTecnicosTransferencia.value.length > 0 ||
    inconsistenciasPendenciasTecnicas.value.length > 0
  )
}
function executarOperacaoFinanceira(novosDados, mensagem) {
  if (existemImpedimentosTecnicosTransferencia()) {
    aviso.value =
      'Operacao bloqueada: existem pendencias ou impedimentos ' +
      'tecnicos de transferencia que exigem verificacao administrativa.'

    return false
  }

  if (!persistirOperacaoFinanceira(novosDados)) {
    return false
  }

  aplicandoOperacaoFinanceira = true

  try {
    transacoes.value = novosDados.transacoes
    limites.value = novosDados.limites
    saldoInicial.value = novosDados.saldoInicial
    proximoId = novosDados.proximoId
    if (novosDados.contas) {
      contas.value = novosDados.contas
    }
    if (novosDados.transferencias) {
      transferencias.value = novosDados.transferencias
    }
    if (Object.prototype.hasOwnProperty.call(novosDados, 'pagamentosFatura')) {
      pagamentosFatura.value = novosDados.pagamentosFatura
    }
  } finally {
    aplicandoOperacaoFinanceira = false
  }

  aviso.value = mensagem

  return true
}

// Observa alterações realizadas diretamente
// nos estados financeiros compartilhados.

watch(
  [transacoes, limites, saldoInicial, contas, transferencias, tentativasTransferenciaRecusadas],
  () => {
    if (
      financasInicializadas &&
      (dadosRecuperados || armazenamentoInicializado) &&
      !bloqueioPersistencia &&
      !aplicandoOperacaoFinanceira
    ) {
      salvarDadosLocais()
    }
  },
  {
    deep: true,
    flush: 'sync'
  }
)

// =====================================================
// CATEGORIAS PERSONALIZADAS
// =====================================================

function adicionarCategoria(nome, tipo) {
  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    aviso.value =
      'Cadastro bloqueado: armazenamento protegido.'

    return false
  }

  const nomeFormatado = String(nome).trim()

  if (
    !nomeFormatado ||
    nomeFormatado.length > 40 ||
    !['receita', 'despesa'].includes(tipo)
  ) {
    return false
  }

  const lista =
    tipo === 'receita'
      ? categoriasReceita
      : categoriasDespesa

  const jaExiste = lista.value.some(
    item =>
      item.toLowerCase() === nomeFormatado.toLowerCase()
  )

  if (jaExiste) {
    return false
  }

  const novasCategorias = [
    ...lista.value,
    nomeFormatado
  ]

  try {
    const novosDados = comporDadosFinanceirosPersistidos({
      categoriasDespesa:
        tipo === 'despesa'
          ? novasCategorias
          : categoriasDespesa.value,
      categoriasReceita:
        tipo === 'receita'
          ? novasCategorias
          : categoriasReceita.value
    })

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify(novosDados)
    )
  } catch (erro) {
    console.error(
      'Erro ao salvar categoria:',
      erro
    )

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Não foi possível salvar a categoria. ' +
      'Novas alterações foram bloqueadas para proteger os dados.'

    return false
  }

  lista.value = novasCategorias

  aviso.value =
    'Categoria cadastrada com sucesso!'

  return true
}

// =====================================================
// FORMATAÇÃO E NAVEGAÇÃO TEMPORAL
// =====================================================

function moeda(valor) {
  const { mostrarCentavos } = usePreferencias()

  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: mostrarCentavos.value ? 2 : 0,
    maximumFractionDigits: mostrarCentavos.value ? 2 : 0
  })
}

function mesChave(data = mesSelecionado.value) {
  const ano = data.getFullYear()

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, '0')

  return `${ano}-${mes}`
}

function nomeMes() {
  const nome = mesSelecionado.value.toLocaleDateString(
    'pt-BR',
    {
      month: 'long',
      year: 'numeric'
    }
  )

  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function dataMes(dia, deslocamento = 0) {
  const data = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + deslocamento,
    dia,
    12
  )

  const ano = data.getFullYear()

  const mes = String(
    data.getMonth() + 1
  ).padStart(2, '0')

  const diaFormatado = String(
    data.getDate()
  ).padStart(2, '0')

  return `${ano}-${mes}-${diaFormatado}`
}

function mudarMes(direcao) {
  mesSelecionado.value = new Date(
    mesSelecionado.value.getFullYear(),
    mesSelecionado.value.getMonth() + direcao,
    1
  )

  limiteEditando.value = Number(
    limiteAtual()
  ).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  aviso.value = ''
}

// =====================================================
// CÁLCULOS FINANCEIROS
// =====================================================

function doMes() {
  return transacoes.value
    .filter(
      item =>
        item.data.slice(0, 7) === mesChave()
    )
    .sort(
      (a, b) =>
        b.data.localeCompare(a.data) ||
        b.id - a.id
    )
}

function somar(lista, tipo) {
  return lista
    .filter(item => item.tipo === tipo)
    .reduce(
      (total, item) => total + item.valor,
      0
    )
}

function receitas() {
  return somar(doMes(), 'receita')
}

function despesas() {
  return somar(doMes(), 'despesa')
}

function resultado() {
  return receitas() - despesas()
}

function saldo() {
  const ultimoDia = new Date(
    mesSelecionado.value.getFullYear(),
    mesSelecionado.value.getMonth() + 1,
    0
  )

  const ano = ultimoDia.getFullYear()

  const mes = String(
    ultimoDia.getMonth() + 1
  ).padStart(2, '0')

  const dia = String(
    ultimoDia.getDate()
  ).padStart(2, '0')

  const limiteData = `${ano}-${mes}-${dia}`

  const ateMes = transacoes.value.filter(
    item => item.data <= limiteData
  )

  return (
    contas.value.reduce(
      (total, conta) => total + conta.saldoInicial,
      0
    ) +
    somar(ateMes, 'receita') -
    somar(ateMes, 'despesa') -
    transferencias.value
      .filter(item =>
        item.status === 'executada' &&
        item.data <= limiteData
      )
      .reduce((total, item) => total + item.tarifa, 0)
  )
}

function saldoOperacionalDaConta(contaId) {
  const conta = contas.value.find(item => item.id === contaId)

  if (!conta) return null

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  const limiteData = `${ano}-${mes}-${dia}`

  const saldoInicialCentavos = converterCentavos(conta.saldoInicial)

  if (saldoInicialCentavos === null) return null

  let saldoCentavos = saldoInicialCentavos

  for (const item of transacoes.value) {
    if (item.contaId !== contaId || item.data > limiteData) continue

    const centavos = converterCentavos(item.valor)

    if (centavos === null) return null

    if (item.tipo === 'receita') {
      saldoCentavos += centavos
    } else if (item.tipo === 'despesa') {
      saldoCentavos -= centavos
    } else {
      return null
    }

    if (!Number.isSafeInteger(saldoCentavos)) return null
  }

  for (const item of transferencias.value) {
    if (item.status !== 'executada' || item.data > limiteData) continue

    if (
      item.contaOrigemId !== contaId &&
      item.contaDestinoId !== contaId
    ) {
      continue
    }

    const valorCentavos = converterCentavos(item.valor)
    const tarifaCentavos = converterCentavos(item.tarifa)

    if (
      valorCentavos === null ||
      valorCentavos <= 0 ||
      tarifaCentavos === null ||
      tarifaCentavos < 0
    ) {
      return null
    }

    if (item.contaOrigemId === contaId) {
      saldoCentavos -= valorCentavos + tarifaCentavos
    } else {
      saldoCentavos += valorCentavos
    }

    if (!Number.isSafeInteger(saldoCentavos)) return null
  }

  return saldoCentavos / 100
}
function saldoDaConta(contaId) {
  const conta = contas.value.find(item => item.id === contaId)

  if (!conta) {
    return null
  }

  const ultimoDia = new Date(
    mesSelecionado.value.getFullYear(),
    mesSelecionado.value.getMonth() + 1,
    0
  )

  const ano = ultimoDia.getFullYear()
  const mes = String(ultimoDia.getMonth() + 1).padStart(2, '0')
  const dia = String(ultimoDia.getDate()).padStart(2, '0')
  const limiteData = `${ano}-${mes}-${dia}`

  const movimentacoesDaConta = transacoes.value.filter(
    item => item.contaId === contaId && item.data <= limiteData
  )

  return (
    conta.saldoInicial +
    somar(movimentacoesDaConta, 'receita') -
    somar(movimentacoesDaConta, 'despesa') +
    transferencias.value
      .filter(item =>
        item.status === 'executada' &&
        item.data <= limiteData
      )
      .reduce((total, item) => {
        if (item.contaOrigemId === contaId) {
          return total - item.valor - item.tarifa
        }

        if (item.contaDestinoId === contaId) {
          return total + item.valor
        }

        return total
      }, 0)
  )
}
function limiteAtual() {
  return limites.value[mesChave()] || 0
}

function categorias() {
  const mapa = {}

  doMes()
    .filter(item => item.tipo === 'despesa')
    .forEach(item => {
      mapa[item.categoria] =
        (mapa[item.categoria] || 0) +
        item.valor
    })

  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({
      nome,
      valor
    }))
}

function maxCategoria() {
  return Math.max(
    ...categorias().map(item => item.valor),
    1
  )
}

// =====================================================
// CADASTRO DE CONTAS BANCÁRIAS
// =====================================================

function normalizarConfiguracaoEncargosCartao(configuracao) {
  if (
    configuracao === null ||
    configuracao === undefined
  ) {
    return {
      valido: true,
      valor: {
        jurosRotativoMensal: null,
        jurosMoraMensal: null,
        multaAtraso: null
      }
    }
  }

  if (
    typeof configuracao !== 'object' ||
    Array.isArray(configuracao)
  ) {
    return { valido: false }
  }

  const campos = [
    'jurosRotativoMensal',
    'jurosMoraMensal',
    'multaAtraso'
  ]

  if (
    Object.keys(configuracao).some(
      campo => !campos.includes(campo)
    )
  ) {
    return { valido: false }
  }

  const valor = {}

  for (const campo of campos) {
    const taxa = configuracao[campo] ?? null

    if (
      taxa !== null &&
      (
        typeof taxa !== 'number' ||
        !Number.isFinite(taxa) ||
        taxa < 0 ||
        taxa > 100 ||
        Math.abs(
          taxa * 10000 - Math.round(taxa * 10000)
        ) > 0.000001
      )
    ) {
      return { valido: false }
    }

    valor[campo] = taxa
  }

  return { valido: true, valor }
}

function editarCartao(id, dadosAtualizados) {
  if (armazenamentoProtegido.value) {
    aviso.value = 'Edicao de cartao bloqueada: armazenamento protegido.'
    return false
  }

  if (!Number.isSafeInteger(id) || id <= 0) {
    aviso.value = 'Identificador de cartao invalido.'
    return false
  }

  const cartaoOriginal = cartoesCredito.value.find(
    cartao => cartao.id === id
  )

  if (!cartaoOriginal) {
    aviso.value = 'Cartao de credito nao encontrado.'
    return false
  }

  if (
    !dadosAtualizados ||
    typeof dadosAtualizados !== 'object' ||
    Array.isArray(dadosAtualizados)
  ) {
    aviso.value = 'Dados de edicao invalidos.'
    return false
  }

  const camposPermitidos = [
    'nome',
    'instituicao',
    'bandeira',
    'diaFechamento',
    'diaVencimento',
    'ultimosDigitos',
    'contaId',
    'configuracaoEncargos'
  ]

  const camposInformados = Object.keys(dadosAtualizados)

  if (
    camposInformados.length === 0 ||
    camposInformados.some(campo => !camposPermitidos.includes(campo))
  ) {
    aviso.value = 'A edicao contem campos nao permitidos ou esta vazia.'
    return false
  }

  const cartaoEditado = {
    ...cartaoOriginal,
    ...dadosAtualizados
  }

  for (const campo of ['nome', 'instituicao', 'bandeira']) {
    if (
      typeof cartaoEditado[campo] !== 'string' ||
      !cartaoEditado[campo].trim()
    ) {
      aviso.value = 'Nome, instituicao e bandeira sao obrigatorios.'
      return false
    }

    cartaoEditado[campo] = cartaoEditado[campo].trim()
  }

  for (const campo of ['diaFechamento', 'diaVencimento']) {
    const dia = cartaoEditado[campo]

    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      aviso.value = 'Fechamento e vencimento devem estar entre 1 e 31.'
      return false
    }
  }

  if (
    typeof cartaoEditado.ultimosDigitos !== 'string' ||
    (
      cartaoEditado.ultimosDigitos !== '' &&
      !/^\d{4}$/.test(cartaoEditado.ultimosDigitos)
    )
  ) {
    aviso.value = 'Informe quatro digitos numericos ou deixe o campo vazio.'
    return false
  }

  if (
    cartaoEditado.contaId !== null &&
    !contas.value.some(conta => conta.id === cartaoEditado.contaId)
  ) {
    aviso.value = 'Conta bancaria vinculada nao encontrada.'
    return false
  }

  if (
    Object.prototype.hasOwnProperty.call(
      dadosAtualizados,
      'configuracaoEncargos'
    )
  ) {
    const validacaoEncargos =
      normalizarConfiguracaoEncargosCartao(
        dadosAtualizados.configuracaoEncargos
      )

    if (!validacaoEncargos.valido) {
      aviso.value = 'Configuracao de encargos invalida.'
      return false
    }

    cartaoEditado.configuracaoEncargos =
      validacaoEncargos.valor
  }

  const novosCartoes = cartoesCredito.value.map(cartao =>
    cartao.id === id ? cartaoEditado : cartao
  )

  if (!persistirOperacaoFinanceira({ cartoesCredito: novosCartoes })) {
    return false
  }

  cartoesCredito.value = novosCartoes
  aviso.value = 'Cartao de credito atualizado com sucesso!'
  return true
}

// =====================================================
// CADASTRO DE CARTOES DE CREDITO
// =====================================================
function adicionarCartao(dadosCartao) {
  if (armazenamentoProtegido.value) {
    aviso.value = 'Cadastro de cartao bloqueado: armazenamento protegido.'
    return false
  }

  const texto = valor =>
    typeof valor === 'string' ? valor.trim() : ''

  const nome = texto(dadosCartao?.nome)
  const instituicao = texto(dadosCartao?.instituicao)
  const bandeira = texto(dadosCartao?.bandeira)
  const limiteTotal = dadosCartao?.limiteTotal
  const diaFechamento = dadosCartao?.diaFechamento
  const diaVencimento = dadosCartao?.diaVencimento
  const ultimosDigitos = texto(dadosCartao?.ultimosDigitos)
  const contaId = dadosCartao?.contaId ?? null

  const validacaoEncargos =
    normalizarConfiguracaoEncargosCartao(
      dadosCartao?.configuracaoEncargos
    )

  if (!validacaoEncargos.valido) {
    aviso.value = 'Configuracao de encargos invalida.'
    return false
  }

  if (!nome || !instituicao || !bandeira) {
    aviso.value = 'Informe nome, instituicao e bandeira do cartao.'
    return false
  }

  if (
    typeof limiteTotal !== 'number' ||
    !Number.isFinite(limiteTotal) ||
    limiteTotal <= 0 ||
    !Number.isSafeInteger(Math.round(limiteTotal * 100)) ||
    Math.abs(limiteTotal * 100 - Math.round(limiteTotal * 100)) > 0.000001
  ) {
    aviso.value = 'Informe um limite total positivo com ate duas casas decimais.'
    return false
  }

  if (
    !Number.isInteger(diaFechamento) ||
    diaFechamento < 1 ||
    diaFechamento > 31 ||
    !Number.isInteger(diaVencimento) ||
    diaVencimento < 1 ||
    diaVencimento > 31
  ) {
    aviso.value = 'Informe dias de fechamento e vencimento entre 1 e 31.'
    return false
  }

  if (ultimosDigitos && !/^\d{4}$/.test(ultimosDigitos)) {
    aviso.value = 'Os quatro ultimos digitos devem conter exatamente quatro numeros.'
    return false
  }

  if (
    contaId !== null &&
    !contas.value.some(conta => conta.id === contaId)
  ) {
    aviso.value = 'A conta bancaria vinculada nao foi encontrada.'
    return false
  }

  const ids = cartoesCredito.value.map(cartao => cartao.id)

  if (
    ids.some(id => !Number.isSafeInteger(id) || id <= 0)
  ) {
    aviso.value = 'Identificadores de cartoes invalidos. Cadastro bloqueado.'
    return false
  }

  const maiorId = Math.max(0, ...ids)

  if (maiorId >= Number.MAX_SAFE_INTEGER) {
    aviso.value = 'Nao foi possivel gerar um identificador valido.'
    return false
  }

  const novoCartao = {
    id: maiorId + 1,
    nome,
    instituicao,
    bandeira,
    limiteTotal,
    diaFechamento,
    diaVencimento,
    contaId,
    ultimosDigitos,
    configuracaoEncargos: validacaoEncargos.valor,
    status: 'ativo',
    dataCriacao: new Date().toISOString()
  }

  const novosCartoes = [...cartoesCredito.value, novoCartao]

  if (!persistirOperacaoFinanceira({ cartoesCredito: novosCartoes })) {
    return false
  }

  cartoesCredito.value = novosCartoes
  aviso.value = 'Cartao de credito cadastrado com sucesso!'
  return true
}

// =====================================================
// CADASTRO DE CONTAS BANCARIAS
// =====================================================
function adicionarConta(dadosConta) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Cadastro bancário bloqueado: os dados armazenados precisam ser verificados.'
    return false
  }

  const maiorId = Math.max(
    0,
    ...contas.value.map(conta => conta.id)
  )

  if (
    !Number.isSafeInteger(maiorId) ||
    maiorId >= Number.MAX_SAFE_INTEGER
  ) {
    aviso.value = 'Não foi possível gerar um identificador bancário válido.'
    return false
  }

  const novaConta = {
    id: maiorId + 1,
    nome: dadosConta?.nome?.trim(),
    instituicao: dadosConta?.instituicao?.trim(),
    tipo: dadosConta?.tipo,
    agencia: dadosConta?.agencia ?? '',
    numero: dadosConta?.numero ?? '',
    saldoInicial: dadosConta?.saldoInicial,
    ativa: true,
    principal: false,
    dataCriacao: new Date().toISOString().slice(0, 10)
  }

  const novasContas = [
    ...contas.value,
    novaConta
  ]

  if (!contasValidas(novasContas)) {
    aviso.value =
      'Dados bancários inválidos. Verifique os campos informados.'
    return false
  }

  const novosDados = {
    transacoes: transacoes.value,
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId,
    contas: novasContas
  }

  return executarOperacaoFinanceira(
    novosDados,
    'Conta bancária cadastrada com sucesso!'
  )
}
// =====================================================
// EDIÇÃO DE CONTAS BANCÁRIAS
// =====================================================

function editarConta(id, dadosAtualizados) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Edição bancária bloqueada: os dados armazenados precisam ser verificados.'
    return false
  }

  const contaOriginal = contas.value.find(
    conta => conta.id === id
  )

  if (!contaOriginal) {
    aviso.value = 'Conta bancária não encontrada.'
    return false
  }

  const contaEditada = {
    ...contaOriginal,
    nome: dadosAtualizados?.nome?.trim(),
    instituicao: dadosAtualizados?.instituicao?.trim(),
    tipo: dadosAtualizados?.tipo,
    agencia: dadosAtualizados?.agencia,
    numero: dadosAtualizados?.numero
  }

  const novasContas = contas.value.map(conta =>
    conta.id === id ? contaEditada : conta
  )

  if (!contasValidas(novasContas)) {
    aviso.value =
      'Dados bancários inválidos. A conta original foi preservada.'
    return false
  }

  return executarOperacaoFinanceira(
    {
      transacoes: transacoes.value,
      limites: limites.value,
      saldoInicial: saldoInicial.value,
      proximoId,
      contas: novasContas
    },
    'Conta bancária atualizada com sucesso!'
  )
}
// =====================================================
// ATIVAÇÃO E DESATIVAÇÃO DE CONTAS
// =====================================================

function alterarSituacaoConta(id, ativa) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Alteração bancária bloqueada: os dados armazenados precisam ser verificados.'
    return false
  }

  if (typeof ativa !== 'boolean') {
    aviso.value = 'Situação bancária inválida.'
    return false
  }

  const contaOriginal = contas.value.find(
    conta => conta.id === id
  )

  if (!contaOriginal) {
    aviso.value = 'Conta bancária não encontrada.'
    return false
  }

  if (contaOriginal.principal && !ativa) {
    aviso.value =
      'A conta principal não pode ser desativada. Defina outra conta principal primeiro.'
    return false
  }

  if (contaOriginal.ativa === ativa) {
    aviso.value = 'A conta já possui a situação informada.'
    return false
  }

  const novasContas = contas.value.map(conta =>
    conta.id === id
      ? { ...conta, ativa }
      : conta
  )

  if (!contasValidas(novasContas)) {
    aviso.value =
      'Não foi possível validar a alteração bancária.'
    return false
  }

  return executarOperacaoFinanceira(
    {
      transacoes: transacoes.value,
      limites: limites.value,
      saldoInicial: saldoInicial.value,
      proximoId,
      contas: novasContas
    },
    ativa
      ? 'Conta bancária ativada com sucesso!'
      : 'Conta bancária desativada com sucesso!'
  )
}
// =====================================================
// ALTERAÇÃO DA CONTA PRINCIPAL
// =====================================================

function definirContaPrincipal(id) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Alteração da conta principal bloqueada: os dados armazenados precisam ser verificados.'
    return false
  }

  const contaDestino = contas.value.find(
    conta => conta.id === id
  )

  if (!contaDestino) {
    aviso.value = 'Conta bancária não encontrada.'
    return false
  }

  if (!contaDestino.ativa) {
    aviso.value =
      'Uma conta inativa não pode ser definida como principal.'
    return false
  }

  if (contaDestino.principal) {
    aviso.value = 'Esta conta já é a principal.'
    return false
  }

  const novasContas = contas.value.map(conta => ({
    ...conta,
    principal: conta.id === id
  }))

  if (!contasValidas(novasContas)) {
    aviso.value =
      'Não foi possível validar a nova conta principal.'
    return false
  }

  return executarOperacaoFinanceira(
    {
      transacoes: transacoes.value,
      limites: limites.value,
      saldoInicial: saldoInicial.value,
      proximoId,
      contas: novasContas
    },
    'Conta principal alterada com sucesso!'
  )
}
// =====================================================
// CADASTRO DE TRANSAÇÕES
// =====================================================

function adicionar(transacao) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Cadastro bloqueado: não foi possível recuperar os dados armazenados.'

    return false
  }

  const dataInformada = transacao?.data

  if (
    typeof dataInformada !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dataInformada)
  ) {
    aviso.value =
      'Data inválida. Transação não cadastrada.'

    return false
  }

  if (!dataArmazenadaValida(dataInformada)) {
    aviso.value =
      'Data inválida. Verifique a data informada.'

    return false
  }

  if (
    !Number.isSafeInteger(proximoId) ||
    proximoId <= 0 ||
    proximoId >= Number.MAX_SAFE_INTEGER
  ) {
    aviso.value =
      'Não foi possível gerar um identificador válido para a transação.'

    return false
  }

  const contaDestino = contas.value.find(
    conta => conta.id === transacao?.contaId
  ) || (
    transacao?.contaId == null
      ? contas.value.find(conta => conta.principal)
      : null
  )

  if (!contaDestino || !contaDestino.ativa) {
    aviso.value =
      'Selecione uma conta bancária ativa para registrar a transação.'

    return false
  }

  const novaTransacao = {
    ...transacao,
    id: proximoId,
    contaId: contaDestino.id
  }

  if (!transacaoArmazenadaValida(novaTransacao)) {
    aviso.value =
      'Dados inválidos. Verifique a descrição, o valor, o tipo e a categoria.'

    return false
  }

  const novosDados = {
    transacoes: [
      ...transacoes.value,
      novaTransacao
    ],
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId: proximoId + 1
  }

  const sucesso = executarOperacaoFinanceira(
    novosDados,
    'Transação adicionada com sucesso!'
  )

  if (!sucesso) {
    return false
  }

  const [ano, mes] = dataInformada
    .split('-')
    .map(Number)

  mesSelecionado.value = new Date(
    ano,
    mes - 1,
    1
  )

  limiteEditando.value = Number(
    limiteAtual()
  ).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return true
}

// =====================================================
// EDIÇÃO DE TRANSAÇÕES
// =====================================================

function editar(id, dadosAtualizados) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Edição bloqueada: os dados armazenados precisam ser verificados.'

    return false
  }

  const indice = transacoes.value.findIndex(
    item => item.id === id
  )

  if (indice === -1) {
    aviso.value = 'Transação não encontrada.'
    return false
  }

  const contaOriginalId = transacoes.value[indice].contaId
  const contaDestinoId = dadosAtualizados?.contaId ?? contaOriginalId

  const contaDestino = contas.value.find(
    conta => conta.id === contaDestinoId
  )

  if (!contaDestino) {
    aviso.value =
      'Conta bancária de destino não encontrada. A transação original foi preservada.'
    return false
  }

  if (
    contaDestinoId !== contaOriginalId &&
    !contaDestino.ativa
  ) {
    aviso.value =
      'A conta bancária de destino está inativa. A transação original foi preservada.'
    return false
  }
  const transacaoEditada = {
    id,
    contaId: contaDestinoId,
    descricao: dadosAtualizados?.descricao,
    valor: dadosAtualizados?.valor,
    tipo: dadosAtualizados?.tipo,
    categoria: dadosAtualizados?.categoria,
    data: dadosAtualizados?.data
  }

  if (!transacaoArmazenadaValida(transacaoEditada)) {
    aviso.value =
      'Dados inválidos. A transação original foi preservada.'

    return false
  }

  const novasTransacoes = transacoes.value.map(
    item =>
      item.id === id
        ? transacaoEditada
        : item
  )

  const novosDados = {
    transacoes: novasTransacoes,
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId
  }

  const sucesso = executarOperacaoFinanceira(
    novosDados,
    'Transação atualizada com sucesso!'
  )

  if (!sucesso) {
    return false
  }

  const [ano, mes] = transacaoEditada.data
    .split('-')
    .map(Number)

  mesSelecionado.value = new Date(
    ano,
    mes - 1,
    1
  )

  return true
}

// =====================================================
// EXCLUSÃO DE TRANSAÇÕES
// =====================================================

function excluir(id) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Operação bloqueada: os dados armazenados precisam ser verificados.'

    return false
  }

  if (
    usePreferencias().confirmarExclusao.value &&
    !confirm('Deseja realmente excluir esta transação?')
  ) {
    return false
  }

  const novasTransacoes = transacoes.value.filter(
    transacao => transacao.id !== id
  )

  if (
    novasTransacoes.length ===
    transacoes.value.length
  ) {
    aviso.value = 'Transação não encontrada.'
    return false
  }

  const novosDados = {
    transacoes: novasTransacoes,
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId
  }

  return executarOperacaoFinanceira(
    novosDados,
    'Transação excluída com sucesso.'
  )
}

// =====================================================
// LIMPEZA DOS DADOS
// =====================================================

function limpar() {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Operação bloqueada: os dados armazenados precisam ser verificados.'

    return false
  }

  if (!confirm('Deseja realmente apagar todos os dados financeiros?')) {
    return false
  }

  const novosDados = {
    transacoes: [],
    limites: {},
    saldoInicial: 0,
    proximoId: 1,
    contas: contas.value.map(conta => ({
      ...conta,
      saldoInicial: 0
    }))
  }

  const sucesso = executarOperacaoFinanceira(
    novosDados,
    'Todos os dados financeiros foram apagados.'
  )

  if (!sucesso) {
    return false
  }

  limiteEditando.value = '0,00'

  return true
}

// =====================================================
// ORÇAMENTO — FORMATAÇÃO MONETÁRIA
// =====================================================

function converterLimiteMonetario(valorInformado) {
  const texto = String(valorInformado).trim()

  if (!texto) {
    return NaN
  }

  const formatoValido =
    /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/

  if (!formatoValido.test(texto)) {
    return NaN
  }

  const valorNormalizado = texto
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(valorNormalizado)
}

function formatarLimiteMonetario() {
  const valor = converterLimiteMonetario(
    limiteEditando.value
  )

  if (
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    return
  }

  limiteEditando.value = valor.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  )
}

// =====================================================
// ORÇAMENTO — SALVAR LIMITE
// =====================================================

function salvarLimite() {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Alteração bloqueada: não foi possível recuperar os dados armazenados.'

    return false
  }

  const valor = converterLimiteMonetario(
    limiteEditando.value
  )

  if (
    !Number.isFinite(valor) ||
    valor < 0
  ) {
    aviso.value = 'Informe um limite válido.'
    return false
  }

  const novosDados = {
    transacoes: transacoes.value,
    limites: {
      ...limites.value,
      [mesChave()]: valor
    },
    saldoInicial: saldoInicial.value,
    proximoId
  }

  return executarOperacaoFinanceira(
    novosDados,
    'Limite mensal atualizado.'
  )
}

// =====================================================
// DADOS DEMONSTRATIVOS
// =====================================================

function demonstracao({ confirmar = true } = {}) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Restauração bloqueada: os dados armazenados precisam ser verificados.'

    return false
  }

  if (
    confirmar &&
    !confirm(
      'Deseja realmente restaurar os dados demonstrativos? ' +
      'As transações, transferências e limites financeiros atuais serão substituídos.'
    )
  ) {
    return false
  }

  const mesDemonstracao = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1
  )

  const exemplos = [
    {
      descricao: 'Salário',
      valor: 4500,
      tipo: 'receita',
      categoria: 'Salário',
      data: dataMes(25)
    },
    {
      descricao: 'Freelance',
      valor: 1000,
      tipo: 'receita',
      categoria: 'Serviços',
      data: dataMes(18)
    },
    {
      descricao: 'Supermercado',
      valor: 760,
      tipo: 'despesa',
      categoria: 'Alimentação',
      data: dataMes(23)
    },
    {
      descricao: 'Aluguel',
      valor: 620,
      tipo: 'despesa',
      categoria: 'Moradia',
      data: dataMes(20)
    },
    {
      descricao: 'Transporte',
      valor: 260,
      tipo: 'despesa',
      categoria: 'Transporte',
      data: dataMes(16)
    },
    {
      descricao: 'Farmácia',
      valor: 180,
      tipo: 'despesa',
      categoria: 'Saúde',
      data: dataMes(12)
    },
    {
      descricao: 'Lazer',
      valor: 140,
      tipo: 'despesa',
      categoria: 'Lazer',
      data: dataMes(10)
    },
    {
      descricao: 'Outros gastos',
      valor: 220,
      tipo: 'despesa',
      categoria: 'Outros',
      data: dataMes(8)
    },
    {
      descricao: 'Internet',
      valor: 100,
      tipo: 'despesa',
      categoria: 'Moradia',
      data: dataMes(5)
    },
    {
      descricao: 'Compra anterior',
      valor: 150,
      tipo: 'despesa',
      categoria: 'Outros',
      data: dataMes(14, -1)
    }
  ]

  const contasDisponiveis = contas.value.length > 0
    ? contas.value
    : [{
        id: 1,
        nome: 'Conta principal',
        instituicao: 'Não informada',
        tipo: 'corrente',
        agencia: '',
        numero: '',
        saldoInicial: 5380,
        ativa: true,
        principal: true,
        dataCriacao: new Date().toISOString().slice(0, 10)
      }]

  const contaPrincipal = contasDisponiveis.find(
    conta => conta.principal && conta.ativa
  )

  if (!contaPrincipal) {
    aviso.value =
      'Não foi possível restaurar a demonstração: conta principal ativa não encontrada.'
    return false
  }

  const novosDados = {
    transacoes: exemplos.map(
      (item, indice) => ({
        ...item,
        id: indice + 1,
        contaId: contaPrincipal.id
      })
    ),
    limites: {
      [mesChave(mesDemonstracao)]: 4000
    },
    saldoInicial: 5380,
    proximoId: exemplos.length + 1,
    transferencias: [],
    contas: contasDisponiveis.map(conta => ({
      ...conta,
      saldoInicial: conta.id === contaPrincipal.id ? 5380 : 0
    }))
  }

  const sucesso = executarOperacaoFinanceira(
    novosDados,
    'Dados demonstrativos restaurados.'
  )

  if (!sucesso) {
    return false
  }

  mesSelecionado.value = mesDemonstracao
  limiteEditando.value = '4.000,00'

  return true
}

// =====================================================
// COMPOSABLE — INTERFACE PÚBLICA
// =====================================================

const tentativasRecusadasPendentesDeVerificacao = new Map()

function preservarTentativaRecusadaPendente(registro) {
  if (
    !registro ||
    typeof registro.id !== 'string' ||
    !registro.id.trim()
  ) {
    return false
  }

  const existente = tentativasRecusadasPendentesDeVerificacao.get(
    registro.id
  )

  const copia = JSON.parse(JSON.stringify(registro))

  if (existente) {
    return JSON.stringify(existente) === JSON.stringify(copia)
  }

  tentativasRecusadasPendentesDeVerificacao.set(
    registro.id,
    copia
  )

  return true
}

function limparTentativaRecusadaConfirmada(id) {
  if (typeof id !== 'string' || !id.trim()) {
    return false
  }

  return tentativasRecusadasPendentesDeVerificacao.delete(id)
}

function registrarTentativaTransferenciaRecusada(dadosTentativa, registroOriginal = null, recuperacaoControlada = false) {
  const resultadoFalha = {
    registrada: false,
    requerVerificacao: false
  }

  const excecaoRecuperacao =
    recuperacaoControlada === true &&
    registroOriginal !== null &&
    typeof registroOriginal === 'object' &&
    !Array.isArray(registroOriginal) &&
    typeof registroOriginal.id === 'string' &&
    tentativasRecusadasPendentesDeVerificacao.has(registroOriginal.id)

  if (
    (bloqueioPersistencia || armazenamentoProtegido.value) &&
    !excecaoRecuperacao
  ) {
    return {
      ...resultadoFalha,
      requerVerificacao: true
    }
  }

  const id = dadosTentativa?.id ||
    (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : null)

  if (typeof id !== 'string' || !id.trim()) {
    return {
      ...resultadoFalha,
      requerVerificacao: true
    }
  }

  const existentes = tentativasTransferenciaRecusadas.value

  const origem = contas.value.find(
    conta => conta.id === dadosTentativa?.contaOrigemId
  )

  const destino = contas.value.find(
    conta => conta.id === dadosTentativa?.contaDestinoId
  )

  const numeroOuNull = valor =>
    typeof valor === 'number' && Number.isFinite(valor)
      ? valor
      : null

  const identificacaoOriginalValida = identificacao =>
    identificacao === null ||
    (
      typeof identificacao === 'object' &&
      !Array.isArray(identificacao) &&
      Object.keys(identificacao).length === 2 &&
      Object.prototype.hasOwnProperty.call(identificacao, 'nome') &&
      Object.prototype.hasOwnProperty.call(identificacao, 'instituicao') &&
      (identificacao.nome === null ||
        typeof identificacao.nome === 'string') &&
      (identificacao.instituicao === null ||
        typeof identificacao.instituicao === 'string')
    )

  const possuiOrigemOriginal =
    Object.prototype.hasOwnProperty.call(
      dadosTentativa ?? {},
      'contaOrigemIdentificacao'
    )

  const possuiDestinoOriginal =
    Object.prototype.hasOwnProperty.call(
      dadosTentativa ?? {},
      'contaDestinoIdentificacao'
    )

  const possuiIdentificacaoOriginal =
    possuiOrigemOriginal && possuiDestinoOriginal

  if (possuiOrigemOriginal !== possuiDestinoOriginal) {
    return {
      ...resultadoFalha,
      requerVerificacao: true
    }
  }

  if (
    possuiIdentificacaoOriginal &&
    (
      !identificacaoOriginalValida(
        dadosTentativa.contaOrigemIdentificacao
      ) ||
      !identificacaoOriginalValida(
        dadosTentativa.contaDestinoIdentificacao
      )
    )
  ) {
    return {
      ...resultadoFalha,
      requerVerificacao: true
    }
  }

  const dataHoraTentativa =
    dadosTentativa?.dataHora ?? new Date().toISOString()

  if (
    typeof dataHoraTentativa !== 'string' ||
    Number.isNaN(Date.parse(dataHoraTentativa))
  ) {
    return {
      ...resultadoFalha,
      requerVerificacao: true
    }
  }

  const registro = {
    id,
    dataHora: dataHoraTentativa,
    contaOrigemId: dadosTentativa?.contaOrigemId ?? null,
    contaDestinoId: dadosTentativa?.contaDestinoId ?? null,
    contaOrigemIdentificacao: possuiIdentificacaoOriginal
      ? dadosTentativa.contaOrigemIdentificacao
      : origem
        ? {
            nome: origem.nome ?? null,
            instituicao: origem.instituicao ?? null
          }
        : null,
    contaDestinoIdentificacao: possuiIdentificacaoOriginal
      ? dadosTentativa.contaDestinoIdentificacao
      : destino
        ? {
            nome: destino.nome ?? null,
            instituicao: destino.instituicao ?? null
          }
        : null,
    valor: numeroOuNull(dadosTentativa?.valor),
    tarifa: numeroOuNull(dadosTentativa?.tarifa),
    saldoDisponivel: numeroOuNull(dadosTentativa?.saldoDisponivel),
    totalNecessario: numeroOuNull(dadosTentativa?.totalNecessario),
    motivoCodigo: dadosTentativa?.motivoCodigo,
    motivoDescricao: dadosTentativa?.motivoDescricao ?? '',
    resultado: 'recusada'
  }

  if (registroOriginal !== null) {
    const camposRegistro = [
      'id',
      'dataHora',
      'contaOrigemId',
      'contaDestinoId',
      'contaOrigemIdentificacao',
      'contaDestinoIdentificacao',
      'valor',
      'tarifa',
      'saldoDisponivel',
      'totalNecessario',
      'motivoCodigo',
      'motivoDescricao',
      'resultado'
    ]

    const valoresIguais = (a, b) => {
      if (
        a !== null &&
        typeof a === 'object' &&
        b !== null &&
        typeof b === 'object'
      ) {
        return (
          !Array.isArray(a) &&
          !Array.isArray(b) &&
          Object.keys(a).length === Object.keys(b).length &&
          Object.keys(a).every(
            chave =>
              Object.prototype.hasOwnProperty.call(b, chave) &&
              valoresIguais(a[chave], b[chave])
          )
        )
      }

      return Object.is(a, b)
    }

    if (
      !registroOriginal ||
      typeof registroOriginal !== 'object' ||
      Array.isArray(registroOriginal) ||
      Object.keys(registroOriginal).length !== camposRegistro.length ||
      camposRegistro.some(
        campo =>
          !Object.prototype.hasOwnProperty.call(registroOriginal, campo) ||
          !valoresIguais(registro[campo], registroOriginal[campo])
      )
    ) {
      return {
        ...resultadoFalha,
        requerVerificacao: true,
        situacaoPersistencia: 'divergente',
        id
      }
    }
  }

  if (
    typeof registro.motivoCodigo !== 'string' ||
    !registro.motivoCodigo.trim()
  ) {
    return {
      ...resultadoFalha,
      requerVerificacao: true
    }
  }

  try {
    const dadosSalvos = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (dadosSalvos === null) {
      return {
        ...resultadoFalha,
        requerVerificacao: true
      }
    }

    const dadosPersistidos = JSON.parse(dadosSalvos)

    if (
      !dadosPersistidos ||
      typeof dadosPersistidos !== 'object' ||
      Array.isArray(dadosPersistidos)
    ) {
      return {
        ...resultadoFalha,
        requerVerificacao: true
      }
    }

    const historicoPersistido =
      dadosPersistidos.tentativasTransferenciaRecusadas === undefined
        ? []
        : dadosPersistidos.tentativasTransferenciaRecusadas

    if (!Array.isArray(historicoPersistido)) {
      return {
        ...resultadoFalha,
        requerVerificacao: true
      }
    }

    const ids = historicoPersistido.map(item => item?.id)

    if (
      historicoPersistido.some(
        item =>
          !item ||
          typeof item !== 'object' ||
          Array.isArray(item) ||
          typeof item.id !== 'string' ||
          !item.id.trim() ||
          typeof item.dataHora !== 'string' ||
          Number.isNaN(Date.parse(item.dataHora)) ||
          item.resultado !== 'recusada' ||
          typeof item.motivoCodigo !== 'string' ||
          !item.motivoCodigo.trim()
      ) ||
      new Set(ids).size !== ids.length
    ) {
      return {
        ...resultadoFalha,
        requerVerificacao: true
      }
    }

    const registroPersistido = historicoPersistido.find(
      item => item.id === id
    )

    if (registroPersistido) {
      const registroMemoria = existentes.find(
        item => item.id === id
      )

      const historicosConsistentes =
        historicoPersistido.length === existentes.length &&
        historicoPersistido.every(
          (item, indice) =>
            JSON.stringify(item) === JSON.stringify(existentes[indice])
        )

      if (
        JSON.stringify(registroPersistido) === JSON.stringify(registro) &&
        registroMemoria &&
        JSON.stringify(registroMemoria) === JSON.stringify(registro) &&
        historicosConsistentes
      ) {
        limparTentativaRecusadaConfirmada(id)

        return {
          registrada: true,
          requerVerificacao: false,
          recuperada: true,
          id
        }
      }

      return {
        registrada: false,
        requerVerificacao: true,
        duplicidade: true,
        situacaoPersistencia: 'divergente',
        id
      }
    }

    if (existentes.some(item => item.id === id)) {
      return {
        registrada: false,
        requerVerificacao: true,
        situacaoPersistencia: 'divergente',
        id
      }
    }

    if (
      historicoPersistido.length !== existentes.length ||
      historicoPersistido.some(
        (item, indice) =>
          JSON.stringify(item) !== JSON.stringify(existentes[indice])
      )
    ) {
      return {
        ...resultadoFalha,
        requerVerificacao: true
      }
    }

    const novoHistorico = [...historicoPersistido, registro]

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify({
        ...dadosPersistidos,
        tentativasTransferenciaRecusadas: novoHistorico
      })
    )

    const estadoAnteriorAplicacao = aplicandoOperacaoFinanceira
    aplicandoOperacaoFinanceira = true

    try {
      tentativasTransferenciaRecusadas.value = novoHistorico
    } finally {
      aplicandoOperacaoFinanceira = estadoAnteriorAplicacao
    }

    limparTentativaRecusadaConfirmada(id)

    return {
      registrada: true,
      requerVerificacao: false,
      id
    }
  } catch (erro) {
    console.error(
      'Falha ao registrar tentativa de transferencia recusada:',
      erro
    )

    const tentativaPreservada =
      preservarTentativaRecusadaPendente(registro)

    if (!tentativaPreservada) {
      console.error(
        'Nao foi possivel preservar a tentativa recusada para verificacao.'
      )
    }

    let situacaoPersistencia = 'indeterminada'

    try {
      const dadosAposFalha = localStorage.getItem(
        CHAVE_ARMAZENAMENTO
      )

      if (dadosAposFalha !== null) {
        const dadosVerificados = JSON.parse(dadosAposFalha)
        const historicoVerificado =
          dadosVerificados?.tentativasTransferenciaRecusadas

        if (Array.isArray(historicoVerificado)) {
          const registrosEncontrados = historicoVerificado.filter(
            item => item?.id === id
          )

          if (registrosEncontrados.length === 0) {
            situacaoPersistencia = 'nao_confirmada'
          } else if (
            registrosEncontrados.length === 1 &&
            JSON.stringify(registrosEncontrados[0]) ===
              JSON.stringify(registro)
          ) {
            situacaoPersistencia = 'confirmada'
          } else {
            situacaoPersistencia = 'divergente'
          }
        }
      }
    } catch (erroVerificacao) {
      console.error(
        'Nao foi possivel verificar o resultado da gravacao:',
        erroVerificacao
      )
    }

    return {
      registrada: false,
      requerVerificacao: true,
      situacaoPersistencia,
      id
    }
  }
}
function recuperarHistoricoTransferenciaRecusada(identificacaoTentativa) {
  const falha = {
    registrada: false,
    requerVerificacao: true
  }

  let registroOriginal = identificacaoTentativa

  if (typeof identificacaoTentativa === 'string') {
    const id = identificacaoTentativa.trim()

    if (!id) {
      return falha
    }

    const registroPendente =
      tentativasRecusadasPendentesDeVerificacao.get(id)

    if (!registroPendente) {
      const registroMemoria =
        tentativasTransferenciaRecusadas.value.find(
          item => item.id === id
        )

      if (!registroMemoria) {
        return {
          ...falha,
          situacaoPersistencia: 'nao_confirmada',
          id
        }
      }

      try {
        const dadosSalvos = localStorage.getItem(
          CHAVE_ARMAZENAMENTO
        )

        if (dadosSalvos === null) {
          return {
            ...falha,
            situacaoPersistencia: 'indeterminada',
            id
          }
        }

        const dadosPersistidos = JSON.parse(dadosSalvos)

        if (
          !dadosPersistidos ||
          typeof dadosPersistidos !== 'object' ||
          Array.isArray(dadosPersistidos) ||
          !Array.isArray(
            dadosPersistidos.tentativasTransferenciaRecusadas
          )
        ) {
          return {
            ...falha,
            situacaoPersistencia: 'indeterminada',
            id
          }
        }

        const historicoPersistido =
          dadosPersistidos.tentativasTransferenciaRecusadas

        const historicoMemoria =
          tentativasTransferenciaRecusadas.value

        const ids = historicoPersistido.map(item => item?.id)

        const historicoValido =
          historicoPersistido.every(
            item =>
              item &&
              typeof item === 'object' &&
              !Array.isArray(item) &&
              typeof item.id === 'string' &&
              item.id.trim() &&
              typeof item.dataHora === 'string' &&
              !Number.isNaN(Date.parse(item.dataHora)) &&
              item.resultado === 'recusada' &&
              typeof item.motivoCodigo === 'string' &&
              item.motivoCodigo.trim()
          ) &&
          new Set(ids).size === ids.length

        const historicosConsistentes =
          historicoPersistido.length === historicoMemoria.length &&
          historicoPersistido.every(
            (item, indice) =>
              JSON.stringify(item) ===
              JSON.stringify(historicoMemoria[indice])
          )

        const registroPersistido = historicoPersistido.find(
          item => item.id === id
        )

        if (
          !historicoValido ||
          !historicosConsistentes ||
          !registroPersistido ||
          JSON.stringify(registroPersistido) !==
            JSON.stringify(registroMemoria)
        ) {
          return {
            ...falha,
            situacaoPersistencia: 'divergente',
            id
          }
        }

        return {
          registrada: true,
          requerVerificacao: false,
          recuperada: true,
          situacaoPersistencia: 'confirmada',
          id
        }
      } catch (erro) {
        console.error(
          'Falha ao verificar tentativa recusada ja confirmada:',
          erro
        )

        return {
          ...falha,
          situacaoPersistencia: 'indeterminada',
          id
        }
      }
    }

    registroOriginal = JSON.parse(
      JSON.stringify(registroPendente)
    )
  }

  if (
    !registroOriginal ||
    typeof registroOriginal !== 'object' ||
    Array.isArray(registroOriginal)
  ) {
    return falha
  }

  const camposObrigatorios = [
    'id',
    'dataHora',
    'contaOrigemId',
    'contaDestinoId',
    'contaOrigemIdentificacao',
    'contaDestinoIdentificacao',
    'valor',
    'tarifa',
    'saldoDisponivel',
    'totalNecessario',
    'motivoCodigo',
    'motivoDescricao',
    'resultado'
  ]

  if (
    Object.keys(registroOriginal).length !== camposObrigatorios.length ||
    camposObrigatorios.some(
      campo => !Object.prototype.hasOwnProperty.call(
        registroOriginal,
        campo
      )
    ) ||
    registroOriginal.resultado !== 'recusada' ||
    typeof registroOriginal.id !== 'string' ||
    !registroOriginal.id.trim() ||
    typeof registroOriginal.dataHora !== 'string' ||
    Number.isNaN(Date.parse(registroOriginal.dataHora)) ||
    typeof registroOriginal.motivoCodigo !== 'string' ||
    !registroOriginal.motivoCodigo.trim() ||
    typeof registroOriginal.motivoDescricao !== 'string'
  ) {
    return falha
  }

  for (const campo of [
    'valor',
    'tarifa',
    'saldoDisponivel',
    'totalNecessario'
  ]) {
    const valor = registroOriginal[campo]

    if (
      valor !== null &&
      (typeof valor !== 'number' || !Number.isFinite(valor))
    ) {
      return falha
    }
  }

  const registroConhecido =
    tentativasTransferenciaRecusadas.value.some(
      item => item.id === registroOriginal.id
    )

  const registroPendente =
    tentativasRecusadasPendentesDeVerificacao.get(
      registroOriginal.id
    )

  if (!registroConhecido && !registroPendente) {
    return {
      ...falha,
      situacaoPersistencia: 'nao_confirmada',
      id: registroOriginal.id
    }
  }

  if (!registroConhecido && registroPendente) {
    const camposIguais = camposObrigatorios.every(
      campo =>
        JSON.stringify(registroOriginal[campo]) ===
        JSON.stringify(registroPendente[campo])
    )

    if (!camposIguais) {
      return {
        ...falha,
        situacaoPersistencia: 'divergente',
        id: registroOriginal.id
      }
    }

    try {
      const dadosSalvos = localStorage.getItem(
        CHAVE_ARMAZENAMENTO
      )

      if (dadosSalvos === null) {
        return {
          ...falha,
          situacaoPersistencia: 'indeterminada',
          id: registroOriginal.id
        }
      }

      const dadosPersistidos = JSON.parse(dadosSalvos)

      if (
        !dadosPersistidos ||
        typeof dadosPersistidos !== 'object' ||
        Array.isArray(dadosPersistidos)
      ) {
        return {
          ...falha,
          situacaoPersistencia: 'indeterminada',
          id: registroOriginal.id
        }
      }

      const historicoPersistido =
        dadosPersistidos.tentativasTransferenciaRecusadas

      if (!Array.isArray(historicoPersistido)) {
        return {
          ...falha,
          situacaoPersistencia: 'indeterminada',
          id: registroOriginal.id
        }
      }

      const ids = historicoPersistido.map(item => item?.id)

      const historicoValido =
        historicoPersistido.every(
          item =>
            item &&
            typeof item === 'object' &&
            !Array.isArray(item) &&
            typeof item.id === 'string' &&
            item.id.trim() &&
            typeof item.dataHora === 'string' &&
            !Number.isNaN(Date.parse(item.dataHora)) &&
            item.resultado === 'recusada' &&
            typeof item.motivoCodigo === 'string' &&
            item.motivoCodigo.trim()
        ) &&
        new Set(ids).size === ids.length

      if (!historicoValido) {
        return {
          ...falha,
          situacaoPersistencia: 'divergente',
          id: registroOriginal.id
        }
      }

      const registroPersistido = historicoPersistido.find(
        item => item.id === registroOriginal.id
      )

      const registrosMemoria =
        tentativasTransferenciaRecusadas.value

      const memoriaConsistente =
        historicoPersistido.length === registrosMemoria.length &&
        historicoPersistido.every(
          (item, indice) =>
            JSON.stringify(item) ===
            JSON.stringify(registrosMemoria[indice])
        )

      if (registroPersistido) {
        const registroIdentico =
          JSON.stringify(registroPersistido) ===
          JSON.stringify(registroPendente)

        if (!registroIdentico) {
          return {
            ...falha,
            situacaoPersistencia: 'divergente',
            id: registroOriginal.id
          }
        }

        if (memoriaConsistente) {
          limparTentativaRecusadaConfirmada(registroOriginal.id)

          return {
            registrada: true,
            requerVerificacao: false,
            recuperada: true,
            situacaoPersistencia: 'confirmada',
            id: registroOriginal.id
          }
        }

        const historicoSemRegistro =
          historicoPersistido.filter(
            item => item.id !== registroOriginal.id
          )

        const memoriaSemRegistro =
          registrosMemoria.filter(
            item => item.id !== registroOriginal.id
          )

        const registroAusenteNaMemoria =
          !registrosMemoria.some(
            item => item.id === registroOriginal.id
          )

        const restanteConsistente =
          historicoSemRegistro.length === memoriaSemRegistro.length &&
          historicoSemRegistro.every(
            (item, indice) =>
              JSON.stringify(item) ===
              JSON.stringify(memoriaSemRegistro[indice])
          )

        if (
          !registroAusenteNaMemoria ||
          !restanteConsistente ||
          historicoPersistido.length !== registrosMemoria.length + 1
        ) {
          return {
            ...falha,
            situacaoPersistencia: 'divergente',
            id: registroOriginal.id
          }
        }

        const estadoAnteriorAplicacao =
          aplicandoOperacaoFinanceira

        aplicandoOperacaoFinanceira = true

        try {
          tentativasTransferenciaRecusadas.value =
            historicoPersistido
        } finally {
          aplicandoOperacaoFinanceira =
            estadoAnteriorAplicacao
        }

        limparTentativaRecusadaConfirmada(registroOriginal.id)

        return {
          registrada: true,
          requerVerificacao: false,
          recuperada: true,
          situacaoPersistencia: 'confirmada',
          id: registroOriginal.id
        }
      }

      if (!memoriaConsistente) {
        return {
          ...falha,
          situacaoPersistencia: 'divergente',
          id: registroOriginal.id
        }
      }

      const resultadoRecuperacao =
        registrarTentativaTransferenciaRecusada(
          { ...registroPendente },
          registroPendente,
          true
        )

      if (!resultadoRecuperacao.registrada) {
        return {
          ...resultadoRecuperacao,
          situacaoPersistencia:
            resultadoRecuperacao.situacaoPersistencia ??
            'indeterminada',
          id: registroOriginal.id
        }
      }

      limparTentativaRecusadaConfirmada(registroOriginal.id)

      return {
        ...resultadoRecuperacao,
        recuperada: true,
        situacaoPersistencia: 'confirmada',
        id: registroOriginal.id
      }
    } catch (erro) {
      console.error(
        'Falha ao verificar tentativa pendente:',
        erro
      )

      return {
        ...falha,
        situacaoPersistencia: 'indeterminada',
        id: registroOriginal.id
      }
    }
  }

  return registrarTentativaTransferenciaRecusada(
    { ...registroOriginal },
    registroOriginal
  )
}
function executarTransferencia(dadosTransferencia) {
  resultadoTecnicoTransferencia.value = null

  const recusarTransferencia = (
    motivoCodigo,
    motivoDescricao,
    detalhes = {}
  ) => {
    const mensagemOriginal = motivoDescricao

    aviso.value = mensagemOriginal

    const resultadoRegistro = registrarTentativaTransferenciaRecusada({
      id: dadosTransferencia?.idTentativa ?? detalhes.idTentativa,
      contaOrigemId: dadosTransferencia?.contaOrigemId,
      contaDestinoId: dadosTransferencia?.contaDestinoId,
      valor: dadosTransferencia?.valor,
      tarifa: dadosTransferencia?.tarifa,
      saldoDisponivel: detalhes.saldoDisponivel,
      totalNecessario: detalhes.totalNecessario,
      motivoCodigo,
      motivoDescricao: mensagemOriginal
    })

    resultadoTecnicoTransferencia.value = {
      idTentativa: resultadoRegistro.id ??
        dadosTransferencia?.idTentativa ??
        detalhes.idTentativa ??
        null,
      situacao: resultadoRegistro.registrada
        ? 'recusa_registrada'
        : resultadoRegistro.situacaoPersistencia === 'divergente'
          ? 'divergente'
          : 'verificacao_pendente',
      registrada: resultadoRegistro.registrada,
      requerVerificacao: resultadoRegistro.requerVerificacao,
      situacaoPersistencia:
        resultadoRegistro.situacaoPersistencia ?? null,
      motivoCodigo
    }

    if (
      !resultadoRegistro.registrada &&
      resultadoTecnicoTransferencia.value.requerVerificacao === true
    ) {
      const identificadorPendente =
        resultadoTecnicoTransferencia.value.idTentativa

      if (
        typeof identificadorPendente === 'string' &&
        identificadorPendente.trim()
      ) {
        const pendenciaRegistrada =
          registrarPendenciaTecnicaTransferencia({
            idTentativa: identificadorPendente,
            situacaoPersistencia:
              resultadoTecnicoTransferencia.value
                .situacaoPersistencia ?? 'indeterminada',
            motivoCodigo
          })

        if (!pendenciaRegistrada) {
          resultadoTecnicoTransferencia.value = {
            ...resultadoTecnicoTransferencia.value,
            situacao: 'verificacao_pendente',
            requerVerificacao: true
          }
        }
      } else {
        armazenamentoProtegido.value = true
        bloqueioPersistencia = true

        resultadoTecnicoTransferencia.value = {
          ...resultadoTecnicoTransferencia.value,
          situacao: 'verificacao_pendente',
          requerVerificacao: true
        }
      }
    }

    if (!resultadoRegistro.registrada) {
      const situacao = resultadoRegistro.situacaoPersistencia

      const complemento =
        situacao === 'confirmada'
          ? ' O registro foi encontrado no armazenamento, mas requer verificacao de integridade.'
          : situacao === 'divergente'
            ? ' Foram encontrados dados divergentes no historico. Verificacao administrativa necessaria.'
            : situacao === 'nao_confirmada'
              ? ' Nao foi possivel confirmar o registro no historico.'
              : ' O registro da tentativa requer verificacao de integridade.'

      aviso.value = mensagemOriginal + complemento
    }

    return false
  }
  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    aviso.value =
      'Transferência bloqueada: existem impedimentos técnicos ' +
      'ou dados financeiros que exigem verificação.'
    return false
  }

  const contaOrigemId = dadosTransferencia?.contaOrigemId
  const contaDestinoId = dadosTransferencia?.contaDestinoId
  const valor = dadosTransferencia?.valor
  const tarifa = dadosTransferencia?.tarifa

  if (
    !Number.isSafeInteger(contaOrigemId) ||
    contaOrigemId <= 0 ||
    !Number.isSafeInteger(contaDestinoId) ||
    contaDestinoId <= 0
  ) {
    return recusarTransferencia(
      'CONTAS_IDENTIFICACAO_INVALIDA',
      'Identificação das contas inválida.'
    )
  }

  if (contaOrigemId === contaDestinoId) {
    return recusarTransferencia(
      'CONTAS_IGUAIS',
      'A conta de origem deve ser diferente da conta de destino.'
    )
  }

  const origem = contas.value.find(
    conta => conta.id === contaOrigemId
  )

  const destino = contas.value.find(
    conta => conta.id === contaDestinoId
  )

  if (!origem || !destino) {
    return recusarTransferencia(
      'CONTA_NAO_ENCONTRADA',
      'Conta de origem ou destino não encontrada.'
    )
  }

  if (!origem.ativa || !destino.ativa) {
    return recusarTransferencia(
      'CONTA_INATIVA',
      'Transferências exigem contas de origem e destino ativas.'
    )
  }

  // Converte valores monetarios em centavos inteiros seguros.
  // Rejeita valores com precisao superior a duas casas decimais.

  const valorCentavos = converterCentavos(valor)
  const tarifaCentavos = converterCentavos(tarifa)

  if (valorCentavos === null || valorCentavos <= 0) {
    return recusarTransferencia(
      'VALOR_INVALIDO',
      'Valor da transferência inválido.'
    )
  }

  if (tarifaCentavos === null || tarifaCentavos < 0) {
    return recusarTransferencia(
      'TARIFA_INVALIDA',
      'Tarifa da transferência inválida.'
    )
  }

  const totalCentavos = valorCentavos + tarifaCentavos

  if (!Number.isSafeInteger(totalCentavos)) {
    return recusarTransferencia(
      'TOTAL_LIMITE_SEGURO',
      'Valor total da transferência excede o limite seguro.'
    )
  }

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')
  const data = `${ano}-${mes}-${dia}`

  // Saldo operacional compartilhado com o formulario.
  // Considera somente movimentacoes efetivadas ate hoje.
  const saldoOperacional = saldoOperacionalDaConta(contaOrigemId)
  const saldoCentavos = converterCentavos(saldoOperacional)

  if (saldoCentavos === null) {
    aviso.value =
      'Nao foi possivel validar o saldo operacional da conta. ' +
      'Verifique a integridade dos dados financeiros.'
    return false
  }
  if (saldoCentavos < totalCentavos) {
    const mensagemRecusa =
      `Saldo insuficiente. Disponível: ${moeda(saldoCentavos / 100)}. ` +
      `Necessário: ${moeda(totalCentavos / 100)}.`

    return recusarTransferencia(
      'SALDO_INSUFICIENTE',
      mensagemRecusa,
      {
        saldoDisponivel: saldoCentavos / 100,
        totalNecessario: totalCentavos / 100
      }
    )
  }

  const maiorId = Math.max(
    0,
    ...transferencias.value.map(item => item.id)
  )

  if (
    !Number.isSafeInteger(maiorId) ||
    maiorId >= Number.MAX_SAFE_INTEGER
  ) {
    aviso.value = 'Não foi possível gerar o identificador da transferência.'
    return false
  }

  const novaTransferencia = {
    id: maiorId + 1,
    contaOrigemId,
    contaDestinoId,
    valor,
    tarifa,
    data,
    status: 'executada'
  }

  const novasTransferencias = [
    ...transferencias.value,
    novaTransferencia
  ]

  return executarOperacaoFinanceira(
    {
      transacoes: transacoes.value,
      limites: limites.value,
      saldoInicial: saldoInicial.value,
      proximoId,
      transferencias: novasTransferencias
    },
    'Transferência bancária executada com sucesso!'
  )
}
function consultarDadosAdministrativos() {
  const resultado = (estado, mensagem, revisao = null, colecoes = null) => ({
    estado,
    revisao,
    colecoes,
    mensagem
  })

  let texto

  try {
    texto = localStorage.getItem(CHAVE_ARMAZENAMENTO)
  } catch {
    return resultado('falha', 'Falha ao acessar o armazenamento local.')
  }

  if (texto === null) {
    return resultado('vazio', 'Nenhum dado persistido encontrado.')
  }

  let dados

  try {
    dados = JSON.parse(texto)
  } catch {
    return resultado('inconsistente', 'JSON persistido invalido.')
  }

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados) ||
    !Array.isArray(dados.transacoes) ||
    !dados.transacoes.every(transacaoArmazenadaValida) ||
    !identificadoresUnicos(dados.transacoes) ||
    !limitesArmazenadosValidos(dados.limites) ||
    !Number.isFinite(dados.saldoInicial)
  ) {
    return resultado('inconsistente', 'Estrutura financeira invalida.')
  }

  let revisao
  let colecoes

  try {
    revisao = validarRevisaoAdministrativaTransferencias(dados)
    colecoes = recuperarColecoesTecnicas(dados)
  } catch {
    return resultado('inconsistente', 'Estrutura administrativa invalida.')
  }

  if (!Array.isArray(dados.contas)) {
    return resultado(
      'inconsistente',
      'Dados legados exigem migracao bancaria.'
    )
  }

  if (!contasValidas(dados.contas)) {
    return resultado('inconsistente', 'Contas bancarias invalidas.')
  }

  if (!vinculosTransacoesValidos(dados.transacoes, dados.contas)) {
    return resultado(
      'inconsistente',
      'Transacoes sem vinculos bancarios validos ou dados legados.'
    )
  }

  const transferenciasPersistidas =
    dados.transferencias === undefined ? [] : dados.transferencias

  if (
    !Array.isArray(transferenciasPersistidas) ||
    !transferenciasPersistidas.every(transferenciaArmazenadaValida) ||
    !identificadoresUnicos(transferenciasPersistidas)
  ) {
    return resultado('inconsistente', 'Transferencias invalidas.')
  }

  const idsContas = new Set(dados.contas.map(conta => conta.id))

  if (
    transferenciasPersistidas.some(item =>
      !idsContas.has(item.contaOrigemId) ||
      !idsContas.has(item.contaDestinoId)
    )
  ) {
    return resultado(
      'inconsistente',
      'Transferencia vinculada a conta inexistente.'
    )
  }

  const tentativas =
    dados.tentativasTransferenciaRecusadas === undefined
      ? []
      : dados.tentativasTransferenciaRecusadas

  if (
    !Array.isArray(tentativas) ||
    !tentativas.every(item =>
      item !== null &&
      typeof item === 'object' &&
      !Array.isArray(item) &&
      typeof item.id === 'string' &&
      item.id.trim().length > 0 &&
      typeof item.dataHora === 'string' &&
      !Number.isNaN(Date.parse(item.dataHora)) &&
      item.resultado === 'recusada' &&
      typeof item.motivoCodigo === 'string' &&
      item.motivoCodigo.trim().length > 0
    ) ||
    new Set(tentativas.map(item => item.id)).size !== tentativas.length
  ) {
    return resultado(
      'inconsistente',
      'Historico de tentativas recusadas invalido.'
    )
  }

  const historico = colecoes.historicoRegularizacoesTecnicas

  if (
    !historico.every(item =>
      typeof item.idAnalise === 'string' ||
      typeof item.idReconciliacao === 'string'
    ) ||
    !validarCadeiaHistoricaAdministrativa(historico)
  ) {
    return resultado(
      'inconsistente',
      'Historico administrativo invalido ou incompativel.'
    )
  }

  return resultado(
    'valido',
    'Consulta administrativa validada.',
    revisao,
    colecoes
  )
}
function dataCompraCartaoValida(valor) {
  if (typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  return data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
}

function dataCicloCartao(ano, mes, dia) {
  if (!Number.isInteger(ano) ||
      !Number.isInteger(mes) ||
      !Number.isInteger(dia) ||
      mes < 1 || mes > 12 ||
      dia < 1 || dia > 31) {
    return null
  }

  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const diaAjustado = Math.min(dia, ultimoDia)

  return [
    String(ano).padStart(4, '0'),
    String(mes).padStart(2, '0'),
    String(diaAjustado).padStart(2, '0')
  ].join('-')
}

function adicionarMesesCartao(competencia, quantidade) {
  if (typeof competencia !== 'string' ||
      !/^\d{4}-\d{2}$/.test(competencia) ||
      !Number.isInteger(quantidade)) {
    return null
  }

  const [ano, mes] = competencia.split('-').map(Number)

  if (mes < 1 || mes > 12) return null

  const data = new Date(Date.UTC(ano, mes - 1 + quantidade, 1))

  return [
    String(data.getUTCFullYear()).padStart(4, '0'),
    String(data.getUTCMonth() + 1).padStart(2, '0')
  ].join('-')
}

function calcularCicloCompraCartao(dataCompra, diaFechamento) {
  if (!dataCompraCartaoValida(dataCompra) ||
      !Number.isInteger(diaFechamento) ||
      diaFechamento < 1 || diaFechamento > 31) {
    return null
  }

  const [ano, mes] = dataCompra.split('-').map(Number)
  const fechamento = dataCicloCartao(ano, mes, diaFechamento)

  if (!fechamento) return null

  const competencia = dataCompra < fechamento
    ? dataCompra.slice(0, 7)
    : adicionarMesesCartao(dataCompra.slice(0, 7), 1)

  return competencia
}

function calcularVencimentoCartao(
  competencia,
  diaVencimento,
  diaFechamento
) {
  if (typeof competencia !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia) ||
      !Number.isInteger(diaVencimento) ||
      diaVencimento < 1 || diaVencimento > 31 ||
      !Number.isInteger(diaFechamento) ||
      diaFechamento < 1 || diaFechamento > 31) {
    return null
  }

  const [ano, mes] = competencia.split('-').map(Number)

  const fechamento = dataCicloCartao(
    ano,
    mes,
    diaFechamento
  )

  let vencimento = dataCicloCartao(
    ano,
    mes,
    diaVencimento
  )

  if (!fechamento || !vencimento) return null

  if (vencimento <= fechamento) {
    const proximaCompetencia = adicionarMesesCartao(
      competencia,
      1
    )

    if (!proximaCompetencia) return null

    const [proximoAno, proximoMes] =
      proximaCompetencia.split('-').map(Number)

    vencimento = dataCicloCartao(
      proximoAno,
      proximoMes,
      diaVencimento
    )
  }

  return vencimento && vencimento > fechamento
    ? vencimento
    : null
}

function consolidarFaturaCartao(
  fatura,
  colecoes = {
    cartoesCredito: cartoesCredito.value,
    comprasCartao: comprasCartao.value,
    faturasCartao: faturasCartao.value
  }
) {
  const invalido = motivo => ({ valido: false, motivo })

  const emCentavos = valor => {
    if (typeof valor !== 'number' ||
        !Number.isFinite(valor) || valor < 0) return null

    const calculado = valor * 100
    const arredondado = Math.round(calculado)

    return Number.isSafeInteger(arredondado) &&
      Math.abs(calculado - arredondado) <= 0.000001
      ? arredondado
      : null
  }

  if (
    !fatura ||
    typeof fatura !== 'object' ||
    Array.isArray(fatura) ||
    !Number.isSafeInteger(fatura.id) ||
    fatura.id <= 0 ||
    !Number.isSafeInteger(fatura.cartaoId) ||
    fatura.cartaoId <= 0 ||
    typeof fatura.competencia !== 'string' ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(fatura.competencia) ||
    typeof fatura.fechamento !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fatura.fechamento) ||
    fatura.status !== 'aberta' ||
    !Array.isArray(fatura.parcelas)
  ) {
    return invalido('Estrutura da fatura invalida.')
  }

  const [ano, mes, dia] = fatura.fechamento.split('-').map(Number)
  const dataFechamento = new Date(Date.UTC(ano, mes - 1, dia))

  if (
    dataFechamento.getUTCFullYear() !== ano ||
    dataFechamento.getUTCMonth() + 1 !== mes ||
    dataFechamento.getUTCDate() !== dia
  ) {
    return invalido('Data de fechamento invalida.')
  }

  const cartoes = colecoes.cartoesCredito.filter(
    item => item.id === fatura.cartaoId
  )

  if (cartoes.length !== 1) {
    return invalido('Cartao vinculado inexistente ou duplicado.')
  }

  const faturasMesmoId = colecoes.faturasCartao.filter(
    item => item.id === fatura.id
  )

  if (faturasMesmoId.length !== 1) {
    return invalido('Identificador de fatura inconsistente.')
  }

  const identificadores = new Set()
  let totalCentavos = 0

  for (const parcela of fatura.parcelas) {
    if (
      !parcela ||
      typeof parcela !== 'object' ||
      Array.isArray(parcela) ||
      !Number.isSafeInteger(parcela.compraId) ||
      parcela.compraId <= 0 ||
      !Number.isSafeInteger(parcela.numero) ||
      parcela.numero <= 0 ||
      !Number.isSafeInteger(parcela.total) ||
      parcela.total <= 0 ||
      parcela.numero > parcela.total ||
      parcela.competencia !== fatura.competencia
    ) {
      return invalido('Parcela da fatura invalida.')
    }

    const compras = colecoes.comprasCartao.filter(
      item => item.id === parcela.compraId
    )

    if (compras.length !== 1 ||
        compras[0].cartaoId !== fatura.cartaoId ||
        !Array.isArray(compras[0].parcelas)) {
      return invalido('Compra vinculada invalida.')
    }

    const compra = compras[0]

    if (
      !Number.isSafeInteger(compra.quantidadeParcelas) ||
      parcela.total !== compra.quantidadeParcelas
    ) {
      return invalido('Quantidade de parcelas inconsistente.')
    }

    const originais = compra.parcelas.filter(
      item => item.numero === parcela.numero
    )

    if (originais.length !== 1) {
      return invalido('Parcela original ausente ou duplicada.')
    }

    const original = originais[0]
    const centavos = emCentavos(parcela.valor)
    const centavosOriginais = emCentavos(original.valor)

    if (
      original.compraId !== parcela.compraId ||
      original.total !== parcela.total ||
      original.competencia !== parcela.competencia ||
      centavos === null ||
      centavosOriginais === null ||
      centavos !== centavosOriginais
    ) {
      return invalido('Dados da parcela divergem da compra original.')
    }

    const chave = `${parcela.compraId}:${parcela.numero}`

    if (identificadores.has(chave)) {
      return invalido('Parcela duplicada na fatura.')
    }

    identificadores.add(chave)

    const ocorrencias = colecoes.faturasCartao.reduce(
      (total, item) => total + (
        Array.isArray(item.parcelas)
          ? item.parcelas.filter(
              p => p.compraId === parcela.compraId &&
                   p.numero === parcela.numero
            ).length
          : 0
      ),
      0
    )

    if (ocorrencias !== 1) {
      return invalido('Parcela vinculada a faturas conflitantes.')
    }

    if (!Number.isSafeInteger(totalCentavos + centavos)) {
      return invalido('Valor consolidado excede limite seguro.')
    }

    totalCentavos += centavos
  }

  return {
    valido: true,
    faturaId: fatura.id,
    cartaoId: fatura.cartaoId,
    competencia: fatura.competencia,
    fechamentoPrevisto: fatura.fechamento,
    valorConsolidadoCentavos: totalCentavos
  }
}

function fecharFaturaCartao(faturaId, agora = new Date()) {
  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return false
  }

  if (!(agora instanceof Date) ||
      !Number.isFinite(agora.getTime())) {
    return false
  }

  if (!Number.isSafeInteger(faturaId) || faturaId <= 0) {
    return false
  }

  const bloquearFechamentoPorDivergencia = motivo => {
    console.error(
      'Fechamento bloqueado por inconsistencia financeira:',
      motivo
    )

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Divergencia nos dados financeiros. ' +
      'Fechamentos e alteracoes bloqueados ate verificacao.'

    return false
  }

  try {
    const textoPersistido = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoPersistido === null) {
      return bloquearFechamentoPorDivergencia(
        'Armazenamento financeiro ausente.'
      )
    }

    const dadosPersistidos = JSON.parse(textoPersistido)

    if (
      !dadosPersistidos ||
      typeof dadosPersistidos !== 'object' ||
      Array.isArray(dadosPersistidos)
    ) {
      return bloquearFechamentoPorDivergencia(
        'Estrutura financeira persistida invalida.'
      )
    }

    const colecoesFinanceiras = {
      transacoes,
      cartoesCredito,
      comprasCartao,
      faturasCartao,
      pagamentosFatura,
      pagamentosAntecipadosFatura,
      fechamentosFatura
    }

    for (const [nome, estado] of Object.entries(colecoesFinanceiras)) {
      if (
        !Array.isArray(dadosPersistidos[nome]) ||
        JSON.stringify(dadosPersistidos[nome]) !==
          JSON.stringify(estado.value)
      ) {
        return bloquearFechamentoPorDivergencia(
          `Divergencia na colecao financeira: ${nome}.`
        )
      }
    }
  } catch (erro) {
    return bloquearFechamentoPorDivergencia(
      erro instanceof Error ? erro.message : String(erro)
    )
  }

  const correspondentes = faturasCartao.value.filter(
    item => item.id === faturaId
  )

  if (correspondentes.length !== 1) {
    return false
  }

  const fatura = correspondentes[0]

  if (fatura.status !== 'aberta') {
    return false
  }

  if (fechamentosFatura.value.some(
    evento => evento.faturaId === faturaId
  )) {
    return false
  }

  const consolidacao = consolidarFaturaCartao(fatura)

  if (!consolidacao.valido) {
    return false
  }

  let totalAntecipadoCentavos = 0
  const operacoesAntecipadas = new Set()
  const transacoesAntecipadas = new Set()

  for (const pagamento of pagamentosAntecipadosFatura.value) {
    if (pagamento.faturaId !== faturaId) continue

    if (
      !pagamentoAntecipadoFaturaArmazenadoValido(pagamento) ||
      pagamento.cartaoId !== fatura.cartaoId ||
      operacoesAntecipadas.has(pagamento.operacaoId) ||
      transacoesAntecipadas.has(pagamento.transacaoId)
    ) {
      return false
    }

    const transacoesCorrespondentes = transacoes.value.filter(
      item => item.id === pagamento.transacaoId
    )

    if (
      transacoesCorrespondentes.length !== 1 ||
      !transacaoArmazenadaValida(transacoesCorrespondentes[0]) ||
      transacoesCorrespondentes[0].tipo !== 'despesa' ||
      transacoesCorrespondentes[0].contaId !== pagamento.contaId ||
      converterCentavos(transacoesCorrespondentes[0].valor) !==
        pagamento.valorPagoCentavos
    ) {
      return false
    }

    operacoesAntecipadas.add(pagamento.operacaoId)
    transacoesAntecipadas.add(pagamento.transacaoId)

    const novoTotal =
      totalAntecipadoCentavos + pagamento.valorPagoCentavos

    if (!Number.isSafeInteger(novoTotal)) {
      return false
    }

    totalAntecipadoCentavos = novoTotal
  }

  if (
    totalAntecipadoCentavos >
    consolidacao.valorConsolidadoCentavos
  ) {
    return false
  }

  const hoje = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, '0'),
    String(agora.getDate()).padStart(2, '0')
  ].join('-')

  if (hoje < consolidacao.fechamentoPrevisto) {
    return false
  }

  const identificadores = new Set(
    fechamentosFatura.value.map(item => String(item.id))
  )

  let idEvento = `fechamento-${faturaId}`

  if (identificadores.has(idEvento)) {
    return false
  }

  const cartoesCorrespondentes = cartoesCredito.value.filter(
    cartao => cartao.id === consolidacao.cartaoId
  )

  if (cartoesCorrespondentes.length !== 1) {
    return false
  }

  const configuracaoValidada =
    normalizarConfiguracaoEncargosCartao(
      cartoesCorrespondentes[0].configuracaoEncargos
    )

  if (!configuracaoValidada.valido) {
    return false
  }

  const configuracaoEncargosFechamento = {
    ...configuracaoValidada.valor
  }

  const evento = {
    id: idEvento,
    faturaId,
    cartaoId: consolidacao.cartaoId,
    competencia: consolidacao.competencia,
    fechamentoPrevisto: consolidacao.fechamentoPrevisto,
    fechamentoEfetivoEm: agora.toISOString(),
    valorConsolidadoCentavos:
      consolidacao.valorConsolidadoCentavos,
    configuracaoEncargosFechamento,
    status: 'confirmado'
  }

  const novasFaturas = faturasCartao.value.map(item =>
    item.id === faturaId
      ? { ...item, status: 'fechada' }
      : item
  )

  const novosFechamentos = [
    ...fechamentosFatura.value,
    evento
  ]

  if (!persistirOperacaoFinanceira({
    faturasCartao: novasFaturas,
    fechamentosFatura: novosFechamentos
  })) {
    return false
  }

  faturasCartao.value = novasFaturas
  fechamentosFatura.value = novosFechamentos

  return true
}

function fecharFaturasVencidas(agora = new Date()) {
  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia() ||
    !(agora instanceof Date) ||
    !Number.isFinite(agora.getTime())
  ) {
    return 0
  }

  const hoje = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, '0'),
    String(agora.getDate()).padStart(2, '0')
  ].join('-')

  const idsPendentes = faturasCartao.value
    .filter(fatura =>
      fatura &&
      fatura.status === 'aberta' &&
      Number.isSafeInteger(fatura.id) &&
      fatura.id > 0 &&
      typeof fatura.fechamento === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(fatura.fechamento) &&
      fatura.fechamento <= hoje
    )
    .sort((a, b) =>
      a.fechamento.localeCompare(b.fechamento) ||
      a.id - b.id
    )
    .map(fatura => fatura.id)

  let fechadas = 0

  for (const id of idsPendentes) {
    if (
      bloqueioPersistencia ||
      armazenamentoProtegido.value ||
      existemImpedimentosTecnicosTransferencia()
    ) {
      break
    }

    const sucesso = fecharFaturaCartao(id, agora)

    if (sucesso) {
      fechadas++
      continue
    }

    // Uma fatura inconsistente nao impede a analise
    // das demais. Falhas tecnicas interrompem o processo.
    if (
      bloqueioPersistencia ||
      armazenamentoProtegido.value ||
      existemImpedimentosTecnicosTransferencia()
    ) {
      break
    }
  }

  return fechadas
}

function registrarCompraCartao(dadosCompra) {
  if (!dadosCompra ||
      typeof dadosCompra !== 'object' ||
      Array.isArray(dadosCompra)) {
    return false
  }

  const {
    cartaoId,
    descricao,
    data,
    valor,
    parcelas: quantidadeParcelas = 1
  } = dadosCompra

  const cartao = cartoesCredito.value.find(item => item.id === cartaoId)

  if (!cartao || cartao.status !== 'ativo') {
    return false
  }

  if (typeof descricao !== 'string' || !descricao.trim()) {
    return false
  }

  if (!dataCompraCartaoValida(data)) {
    return false
  }

  if (!Number.isInteger(quantidadeParcelas) ||
      quantidadeParcelas < 1 ||
      quantidadeParcelas > 120) {
    return false
  }

  const valorCentavos = converterCentavos(valor)
  const limiteCentavos = converterCentavos(cartao.limiteTotal)

  if (!Number.isSafeInteger(valorCentavos) ||
      valorCentavos <= 0 ||
      !Number.isSafeInteger(limiteCentavos) ||
      limiteCentavos <= 0) {
    return false
  }

  if (valorCentavos < quantidadeParcelas) {
    return false
  }

  const resultadoLimite = calcularLimiteCartao({
    cartao,
    compras: comprasCartao.value,
    faturas: faturasCartao.value,
    pagamentos: [
      ...pagamentosFatura.value,
      ...pagamentosAntecipadosFatura.value
    ]
  })

  if (
    !resultadoLimite.valido ||
    !Number.isSafeInteger(resultadoLimite.limiteDisponivel) ||
    valorCentavos > resultadoLimite.limiteDisponivel
  ) {
    return false
  }

  const competenciaInicial = calcularCicloCompraCartao(
    data,
    cartao.diaFechamento
  )

  if (!competenciaInicial) {
    return false
  }

  const agoraCompra = new Date()
  const hojeCompra = [
    agoraCompra.getFullYear(),
    String(agoraCompra.getMonth() + 1).padStart(2, '0'),
    String(agoraCompra.getDate()).padStart(2, '0')
  ].join('-')

  // Fechamentos confirmados permanecem independentes da compra.
  fecharFaturasVencidas(agoraCompra)

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return false
  }

  // Nao prosseguir com faturas vencidas ainda abertas neste cartao.
  if (faturasCartao.value.some(fatura =>
    fatura.cartaoId === cartaoId &&
    fatura.status === 'aberta' &&
    (
      typeof fatura.fechamento !== 'string' ||
      fatura.fechamento <= hojeCompra
    )
  )) {
    return false
  }

  const idsCompras = comprasCartao.value.map(item => item.id)
  const idsFaturas = faturasCartao.value.map(item => item.id)

  if ([...idsCompras, ...idsFaturas].some(id =>
    !Number.isSafeInteger(id) || id <= 0
  )) {
    return false
  }

  const novoIdCompra = Math.max(0, ...idsCompras) + 1

  if (!Number.isSafeInteger(novoIdCompra)) {
    return false
  }

  const novasCompras = [...comprasCartao.value]
  const novasFaturas = faturasCartao.value.map(item => ({
    ...item,
    parcelas: Array.isArray(item.parcelas)
      ? item.parcelas.map(parcela => ({ ...parcela }))
      : item.parcelas
  }))

  const parcelas = []
  const base = Math.floor(valorCentavos / quantidadeParcelas)
  const resto = valorCentavos % quantidadeParcelas

  let proximoIdFatura = Math.max(0, ...idsFaturas) + 1

  for (let indice = 0; indice < quantidadeParcelas; indice++) {
    const competencia = adicionarMesesCartao(
      competenciaInicial,
      indice
    )

    if (!competencia) {
      return false
    }

    const valorParcelaCentavos = base + (indice < resto ? 1 : 0)
    const valorParcela = valorParcelaCentavos / 100

    let fatura = novasFaturas.find(item =>
      item.cartaoId === cartaoId &&
      item.competencia === competencia
    )

    if (fatura && (
        fatura.status !== 'aberta' ||
        !Array.isArray(fatura.parcelas) ||
        typeof fatura.fechamento !== 'string' ||
        fatura.fechamento <= hojeCompra
    )) {
      return false
    }

    if (!fatura) {
      const [ano, mes] = competencia.split('-').map(Number)
      const fechamento = dataCicloCartao(
        ano,
        mes,
        cartao.diaFechamento
      )
      const vencimento = calcularVencimentoCartao(
        competencia,
        cartao.diaVencimento,
        cartao.diaFechamento
      )

      if (!fechamento || !vencimento ||
          !Number.isSafeInteger(proximoIdFatura) ||
          fechamento <= hojeCompra) {
        return false
      }

      fatura = {
        id: proximoIdFatura++,
        cartaoId,
        competencia,
        fechamento,
        vencimento,
        configuracaoCiclo: {
          diaFechamento: cartao.diaFechamento,
          diaVencimento: cartao.diaVencimento
        },
        status: 'aberta',
        parcelas: []
      }

      novasFaturas.push(fatura)
    }

    const parcela = {
      compraId: novoIdCompra,
      numero: indice + 1,
      total: quantidadeParcelas,
      valor: valorParcela,
      competencia
    }

    parcelas.push({ ...parcela })
    fatura.parcelas.push({ ...parcela })
  }

  const compra = {
    id: novoIdCompra,
    cartaoId,
    descricao: descricao.trim(),
    data,
    valor: valorCentavos / 100,
    quantidadeParcelas,
    parcelas,
    status: 'ativa',
    dataCriacao: new Date().toISOString()
  }

  novasCompras.push(compra)

  if (!persistirOperacaoFinanceira({
    comprasCartao: novasCompras,
    faturasCartao: novasFaturas
  })) {
    return false
  }

  comprasCartao.value = novasCompras
  faturasCartao.value = novasFaturas

  return true
}
function validarSolicitacaoPagamentoAntecipadoFatura(dados) {
  const resultado = {
    valido: false,
    motivo: null,
    valorSolicitadoCentavos: null,
    valorOriginalCentavos: null,
    valorAntecipadoCentavos: null,
    valorPendenteCentavos: null,
    saldoDisponivelCentavos: null
  }

  const recusar = motivo => ({
    ...resultado,
    valido: false,
    motivo
  })

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return recusar('OPERACAO_FINANCEIRA_BLOQUEADA')
  }

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return recusar('SOLICITACAO_INVALIDA')
  }

  const { faturaId, contaId, valor } = dados

  if (
    !Number.isSafeInteger(faturaId) ||
    faturaId <= 0 ||
    !Number.isSafeInteger(contaId) ||
    contaId <= 0
  ) {
    return recusar('IDENTIFICADORES_INVALIDOS')
  }

  const faturas = faturasCartao.value.filter(
    item => item.id === faturaId
  )

  if (faturas.length !== 1) {
    return recusar('FATURA_INVALIDA')
  }

  const fatura = faturas[0]

  if (fatura.status !== 'aberta') {
    return recusar('FATURA_NAO_ABERTA')
  }

  const consolidacao = consolidarFaturaCartao(fatura)

  if (!consolidacao.valido) {
    return recusar('CONSOLIDACAO_INVALIDA')
  }

  resultado.valorOriginalCentavos =
    consolidacao.valorConsolidadoCentavos

  let antecipadoCentavos = 0
  const operacoes = new Set()
  const transacoesVinculadas = new Set()

  for (const pagamento of pagamentosAntecipadosFatura.value) {
    if (pagamento.faturaId !== faturaId) continue

    if (
      !pagamentoAntecipadoFaturaArmazenadoValido(pagamento) ||
      pagamento.cartaoId !== fatura.cartaoId ||
      operacoes.has(pagamento.operacaoId) ||
      transacoesVinculadas.has(pagamento.transacaoId)
    ) {
      return recusar('HISTORICO_ANTECIPACOES_INCONSISTENTE')
    }

    const transacoesCorrespondentes = transacoes.value.filter(
      item => item.id === pagamento.transacaoId
    )

    if (
      transacoesCorrespondentes.length !== 1 ||
      !transacaoArmazenadaValida(transacoesCorrespondentes[0]) ||
      transacoesCorrespondentes[0].tipo !== 'despesa' ||
      transacoesCorrespondentes[0].contaId !== pagamento.contaId ||
      converterCentavos(transacoesCorrespondentes[0].valor) !==
        pagamento.valorPagoCentavos
    ) {
      return recusar('HISTORICO_ANTECIPACOES_INCONSISTENTE')
    }

    operacoes.add(pagamento.operacaoId)
    transacoesVinculadas.add(pagamento.transacaoId)

    antecipadoCentavos += pagamento.valorPagoCentavos

    if (!Number.isSafeInteger(antecipadoCentavos)) {
      return recusar('HISTORICO_ANTECIPACOES_INCONSISTENTE')
    }
  }

  if (antecipadoCentavos > resultado.valorOriginalCentavos) {
    return recusar('HISTORICO_ANTECIPACOES_INCONSISTENTE')
  }

  resultado.valorAntecipadoCentavos = antecipadoCentavos
  resultado.valorPendenteCentavos =
    resultado.valorOriginalCentavos - antecipadoCentavos

  if (resultado.valorPendenteCentavos === 0) {
    return recusar('FATURA_SEM_SALDO_ANTECIPAVEL')
  }

  const contasCorrespondentes = contas.value.filter(
    item => item.id === contaId
  )

  if (contasCorrespondentes.length !== 1) {
    return recusar('CONTA_INVALIDA')
  }

  if (contasCorrespondentes[0].ativa !== true) {
    return recusar('CONTA_INATIVA')
  }

  const valorCentavos = converterCentavos(valor)

  if (
    !Number.isSafeInteger(valorCentavos) ||
    valorCentavos <= 0
  ) {
    return recusar('VALOR_INVALIDO')
  }

  resultado.valorSolicitadoCentavos = valorCentavos

  if (valorCentavos > resultado.valorPendenteCentavos) {
    return recusar('VALOR_SUPERIOR_AO_PENDENTE')
  }

  const saldoCentavos = converterCentavos(
    saldoOperacionalDaConta(contaId)
  )

  if (!Number.isSafeInteger(saldoCentavos)) {
    return recusar('SALDO_INCONSISTENTE')
  }

  resultado.saldoDisponivelCentavos = saldoCentavos

  if (saldoCentavos < valorCentavos) {
    return recusar('SALDO_INSUFICIENTE')
  }

  return {
    ...resultado,
    valido: true,
    motivo: null
  }
}
function validarSolicitacaoPagamentoFatura(dados) {
  const resultado = {
    valido: false,
    motivo: null,
    valorSolicitadoCentavos: null,
    valorPendenteCentavos: null,
    saldoDisponivelCentavos: null
  }

  const recusar = motivo => ({
    ...resultado,
    valido: false,
    motivo
  })

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return recusar('OPERACAO_FINANCEIRA_BLOQUEADA')
  }

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return recusar('SOLICITACAO_INVALIDA')
  }

  const { faturaId, contaId, valor } = dados

  if (
    !Number.isSafeInteger(faturaId) ||
    faturaId <= 0 ||
    !Number.isSafeInteger(contaId) ||
    contaId <= 0
  ) {
    return recusar('IDENTIFICADORES_INVALIDOS')
  }

  const faturas = faturasCartao.value.filter(
    item => item.id === faturaId
  )

  if (faturas.length !== 1) {
    return recusar('FATURA_INVALIDA')
  }

  const fatura = faturas[0]

  if (fatura.status !== 'fechada') {
    return recusar('FATURA_NAO_FECHADA')
  }

  const cartoes = cartoesCredito.value.filter(
    item => item.id === fatura.cartaoId
  )

  if (cartoes.length !== 1) {
    return recusar('CARTAO_INVALIDO')
  }

  const fechamentos = fechamentosFatura.value.filter(
    item => item.faturaId === faturaId
  )

  if (
    fechamentos.length !== 1 ||
    !fechamentoFaturaArmazenadoValido(fechamentos[0]) ||
    fechamentos[0].cartaoId !== fatura.cartaoId ||
    fechamentos[0].competencia !== fatura.competencia ||
    fechamentos[0].fechamentoPrevisto !== fatura.fechamento
  ) {
    return recusar('FECHAMENTO_NAO_CONFIRMADO')
  }

  const totalCentavos =
    fechamentos[0].valorConsolidadoCentavos

  let pagoCentavos = 0
  const operacoes = new Set()
  const transacoesVinculadas = new Set()

  for (const pagamento of pagamentosFatura.value) {
    if (pagamento.faturaId !== faturaId) continue

    if (
      !pagamentoFaturaArmazenadoValido(pagamento) ||
      pagamento.cartaoId !== fatura.cartaoId ||
      operacoes.has(pagamento.operacaoId) ||
      transacoesVinculadas.has(pagamento.transacaoId)
    ) {
      return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
    }

    const transacoesCorrespondentes = transacoes.value.filter(
      item => item.id === pagamento.transacaoId
    )

    if (
      transacoesCorrespondentes.length !== 1 ||
      !transacaoArmazenadaValida(transacoesCorrespondentes[0]) ||
      transacoesCorrespondentes[0].tipo !== 'despesa' ||
      transacoesCorrespondentes[0].contaId !== pagamento.contaId ||
      converterCentavos(transacoesCorrespondentes[0].valor) !==
        pagamento.valorPagoCentavos
    ) {
      return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
    }

    operacoes.add(pagamento.operacaoId)
    transacoesVinculadas.add(pagamento.transacaoId)

    pagoCentavos += pagamento.valorPagoCentavos

    if (!Number.isSafeInteger(pagoCentavos)) {
      return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
    }
  }

  for (const pagamento of pagamentosAntecipadosFatura.value) {
    if (pagamento.faturaId !== faturaId) continue

    if (
      !pagamentoAntecipadoFaturaArmazenadoValido(pagamento) ||
      pagamento.cartaoId !== fatura.cartaoId ||
      operacoes.has(pagamento.operacaoId) ||
      transacoesVinculadas.has(pagamento.transacaoId)
    ) {
      return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
    }

    const transacoesCorrespondentes = transacoes.value.filter(
      item => item.id === pagamento.transacaoId
    )

    if (
      transacoesCorrespondentes.length !== 1 ||
      !transacaoArmazenadaValida(transacoesCorrespondentes[0]) ||
      transacoesCorrespondentes[0].tipo !== 'despesa' ||
      transacoesCorrespondentes[0].contaId !== pagamento.contaId ||
      converterCentavos(transacoesCorrespondentes[0].valor) !==
        pagamento.valorPagoCentavos
    ) {
      return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
    }

    operacoes.add(pagamento.operacaoId)
    transacoesVinculadas.add(pagamento.transacaoId)

    pagoCentavos += pagamento.valorPagoCentavos

    if (!Number.isSafeInteger(pagoCentavos)) {
      return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
    }
  }
  if (pagoCentavos > totalCentavos) {
    return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
  }

  resultado.valorPendenteCentavos = totalCentavos - pagoCentavos

  if (resultado.valorPendenteCentavos === 0) {
    return recusar('FATURA_QUITADA')
  }

  const contasCorrespondentes = contas.value.filter(
    item => item.id === contaId
  )

  if (contasCorrespondentes.length !== 1) {
    return recusar('CONTA_INVALIDA')
  }

  if (contasCorrespondentes[0].ativa !== true) {
    return recusar('CONTA_INATIVA')
  }

  const valorCentavos = converterCentavos(valor)

  if (
    !Number.isSafeInteger(valorCentavos) ||
    valorCentavos <= 0
  ) {
    return recusar('VALOR_INVALIDO')
  }

  resultado.valorSolicitadoCentavos = valorCentavos

  if (valorCentavos > resultado.valorPendenteCentavos) {
    return recusar('VALOR_SUPERIOR_AO_PENDENTE')
  }

  const saldo = saldoOperacionalDaConta(contaId)
  const saldoCentavos = converterCentavos(saldo)

  if (!Number.isSafeInteger(saldoCentavos)) {
    return recusar('SALDO_INCONSISTENTE')
  }

  resultado.saldoDisponivelCentavos = saldoCentavos

  if (saldoCentavos < valorCentavos) {
    return recusar('SALDO_INSUFICIENTE')
  }

  return {
    ...resultado,
    valido: true,
    motivo: null
  }
}
function anteciparPagamentoFaturaCartao(dados) {
  const recusar = motivo => ({
    sucesso: false,
    motivo,
    pagamento: null
  })

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados) ||
    typeof dados.operacaoId !== 'string' ||
    !dados.operacaoId.trim() ||
    dados.operacaoId.length > 200
  ) {
    return recusar('OPERACAO_INVALIDA')
  }

  if (
    typeof dados.tentativaId !== 'string' ||
    !dados.tentativaId.trim() ||
    dados.tentativaId.length > 200
  ) {
    return recusar('TENTATIVA_INVALIDA')
  }

  if (
    typeof dados.tentativaDataHora !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(dados.tentativaDataHora) ||
    !Number.isFinite(Date.parse(dados.tentativaDataHora)) ||
    new Date(dados.tentativaDataHora).toISOString() !== dados.tentativaDataHora
  ) {
    return recusar('DATA_HORA_TENTATIVA_INVALIDA')
  }

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return recusar('OPERACAO_FINANCEIRA_BLOQUEADA')
  }

  const operacaoId = dados.operacaoId.trim()
  const tentativaId = dados.tentativaId.trim()
  const tentativaRecusadaId = `tentativa-antecipacao-${tentativaId}`

  const recuperarTentativaRecusada = () => {
    try {
      const textoPersistido = localStorage.getItem(CHAVE_ARMAZENAMENTO)

      if (textoPersistido === null) {
        return { encontrada: false, inconsistente: true }
      }

      const documento = JSON.parse(textoPersistido)

      if (!documento || typeof documento !== 'object' ||
          Array.isArray(documento)) {
        return { encontrada: false, inconsistente: true }
      }

      const historico = documento.tentativasPagamentoFaturaRecusadas ?? []

      if (!Array.isArray(historico) ||
          !Array.isArray(tentativasPagamentoFaturaRecusadas.value) ||
          JSON.stringify(historico) !==
            JSON.stringify(tentativasPagamentoFaturaRecusadas.value)) {
        return { encontrada: false, inconsistente: true }
      }

      const registros = historico.filter(item =>
        item?.id === tentativaRecusadaId ||
        item?.tentativaId === tentativaId
      )

      const conflitosOperacao = historico.filter(item =>
        item?.modalidade === 'antecipado' &&
        item?.operacaoId === operacaoId &&
        item?.id !== tentativaRecusadaId
      )

      if (conflitosOperacao.length > 0) {
        return { encontrada: true, inconsistente: true }
      }

      if (registros.length === 0) {
        return { encontrada: false, inconsistente: false }
      }

      if (registros.length !== 1) {
        return { encontrada: true, inconsistente: true }
      }

      const registro = registros[0]

      if (!tentativaPagamentoFaturaRecusadaArmazenadaValida(registro) ||
          registro.id !== tentativaRecusadaId ||
          registro.tentativaId !== tentativaId) {
        return { encontrada: true, inconsistente: true }
      }

      const originais = registro.dadosOriginais

      const possuiVinculo = Object.prototype.hasOwnProperty.call(
        registro,
        'operacaoId'
      )

      const vinculoCompativel =
        possuiVinculo &&
        registro.operacaoId === operacaoId

      const compativel =
        registro.modalidade === 'antecipado' &&
        registro.dataHora === dados.tentativaDataHora &&
        originais.faturaId === dados.faturaId &&
        originais.contaId === dados.contaId &&
        originais.valorSolicitado === dados.valor &&
        vinculoCompativel

      return {
        encontrada: true,
        inconsistente: false,
        possuiVinculo,
        compativel,
        motivo: registro.motivo
      }
    } catch (erro) {
      console.error('Falha ao recuperar tentativa recusada:', erro)
      return { encontrada: false, inconsistente: true }
    }
  }

  const recusarComAuditoria = (motivo, validacao = null) => {
    const fatura = faturasCartao.value.find(
      item => item.id === dados.faturaId
    )

    const valorOriginal = dados.valor

    const valorSolicitado =
      valorOriginal === null ||
      typeof valorOriginal === 'string' ||
      typeof valorOriginal === 'number' ||
      typeof valorOriginal === 'boolean'
        ? valorOriginal
        : null

    const valorCentavos =
      Number.isSafeInteger(validacao?.valorSolicitadoCentavos)
        ? validacao.valorSolicitadoCentavos
        : converterCentavos(valorOriginal)

    const tentativa = {
      id: `tentativa-antecipacao-${dados.tentativaId.trim()}`,
      tentativaId: dados.tentativaId.trim(),
      operacaoId,
      modalidade: 'antecipado',
      dataHora: dados.tentativaDataHora,
      faturaId: dados.faturaId ?? null,
      cartaoId: fatura?.cartaoId ?? null,
      contaId: dados.contaId ?? null,
      valorSolicitado,
      valorSolicitadoCentavos: valorCentavos,
      saldoDisponivelCentavos:
        validacao?.saldoDisponivelCentavos ?? null,
      motivo
    }

    if (!registrarTentativaPagamentoFaturaRecusada(tentativa)) {
      return recusar('AUDITORIA_NAO_CONFIRMADA')
    }

    return recusar(motivo)
  }

  let persistidos

  try {
    const textoAnterior =
      localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoAnterior === null) {
      return recusar('ARMAZENAMENTO_NAO_CONFIRMADO')
    }

    persistidos = JSON.parse(textoAnterior)
  } catch (erro) {
    console.error(
      'Falha na leitura financeira da antecipacao:',
      erro
    )

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  if (
    !persistidos ||
    typeof persistidos !== 'object' ||
    Array.isArray(persistidos) ||
    !Array.isArray(persistidos.transacoes) ||
    !Array.isArray(persistidos.pagamentosFatura) ||
    !Array.isArray(persistidos.pagamentosAntecipadosFatura) ||
    !Number.isSafeInteger(persistidos.proximoId)
  ) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const dadosEmMemoriaConsistentes =
    JSON.stringify(persistidos.transacoes) ===
      JSON.stringify(transacoes.value) &&
    JSON.stringify(persistidos.pagamentosFatura) ===
      JSON.stringify(pagamentosFatura.value) &&
    JSON.stringify(persistidos.pagamentosAntecipadosFatura) ===
      JSON.stringify(pagamentosAntecipadosFatura.value) &&
    persistidos.proximoId === proximoId

  if (!dadosEmMemoriaConsistentes) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const pagamentosPersistidosValidos =
    persistidos.pagamentosFatura.every(
      pagamentoFaturaArmazenadoValido
    ) &&
    persistidos.pagamentosAntecipadosFatura.every(
      pagamentoAntecipadoFaturaArmazenadoValido
    )

  if (!pagamentosPersistidosValidos) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const todosPagamentosPersistidos = [
    ...persistidos.pagamentosFatura,
    ...persistidos.pagamentosAntecipadosFatura
  ]

  const idsPagamentos = new Set()
  const idsOperacoes = new Set()
  const idsTransacoes = new Set()

  let identificadoresDuplicados = false

  for (const pagamento of todosPagamentosPersistidos) {
    if (
      idsPagamentos.has(pagamento.id) ||
      idsOperacoes.has(pagamento.operacaoId) ||
      idsTransacoes.has(pagamento.transacaoId)
    ) {
      identificadoresDuplicados = true
      break
    }

    idsPagamentos.add(pagamento.id)
    idsOperacoes.add(pagamento.operacaoId)
    idsTransacoes.add(pagamento.transacaoId)
  }

  if (identificadoresDuplicados) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const vinculosBancariosValidos =
    todosPagamentosPersistidos.every(pagamento => {
      const transacoesVinculadas =
        persistidos.transacoes.filter(
          transacao => transacao?.id === pagamento.transacaoId
        )

      if (transacoesVinculadas.length !== 1) {
        return false
      }

      const transacao = transacoesVinculadas[0]
      const valorTransacaoCentavos =
        converterCentavos(transacao.valor)

      return (
        transacao.tipo === 'despesa' &&
        transacao.contaId === pagamento.contaId &&
        valorTransacaoCentavos === pagamento.valorPagoCentavos
      )
    })

  if (!vinculosBancariosValidos) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const identificadorSequencialValido =
    Number.isSafeInteger(proximoId) &&
    proximoId > 0 &&
    proximoId < Number.MAX_SAFE_INTEGER &&
    persistidos.transacoes.every(
      transacao =>
        Number.isSafeInteger(transacao?.id) &&
        transacao.id > 0 &&
        transacao.id < proximoId
    )

  if (!identificadorSequencialValido) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const tentativaAnterior = recuperarTentativaRecusada()

  if (tentativaAnterior.inconsistente) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true
    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }
  const pagamentosComMesmaOperacao = [
    ...persistidos.pagamentosFatura,
    ...persistidos.pagamentosAntecipadosFatura
  ].filter(item => item?.operacaoId === operacaoId)

  if (
    tentativaAnterior.encontrada &&
    pagamentosComMesmaOperacao.length > 0
  ) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true
    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  if (tentativaAnterior.encontrada) {
    if (!tentativaAnterior.possuiVinculo) {
      return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
    }

    return recusar(
      tentativaAnterior.compativel
        ? tentativaAnterior.motivo
        : 'TENTATIVA_ID_CONFLITANTE'
    )
  }
  if (pagamentosComMesmaOperacao.length > 1) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  if (pagamentosComMesmaOperacao.length === 1) {
    const pagamentoExistente = pagamentosComMesmaOperacao[0]

    if (
      pagamentoExistente.tipo !== 'antecipado' ||
      !pagamentoAntecipadoFaturaArmazenadoValido(pagamentoExistente)
    ) {
      return recusar('OPERACAO_ID_CONFLITANTE')
    }

    const valorSolicitadoCentavos = converterCentavos(dados.valor)

    if (
      !Number.isSafeInteger(valorSolicitadoCentavos) ||
      valorSolicitadoCentavos <= 0
    ) {
      return recusar('VALOR_SOLICITADO_INVALIDO')
    }

    const solicitacaoCompativel =
      pagamentoExistente.faturaId === dados.faturaId &&
      pagamentoExistente.contaId === dados.contaId &&
      pagamentoExistente.valorPagoCentavos === valorSolicitadoCentavos

    if (!solicitacaoCompativel) {
      return recusar('OPERACAO_ID_CONFLITANTE')
    }

    return {
      sucesso: true,
      motivo: null,
      pagamento: pagamentoExistente
    }
  }

  const validacao =
    validarSolicitacaoPagamentoAntecipadoFatura(dados)

  if (!validacao.valido) {
    return recusarComAuditoria(validacao.motivo, validacao)
  }

  const agora = new Date()
  const dataLocal = [
    agora.getFullYear(),
    String(agora.getMonth() + 1).padStart(2, '0'),
    String(agora.getDate()).padStart(2, '0')
  ].join('-')

  const fatura = faturasCartao.value.find(
    item => item.id === dados.faturaId
  )

  const transacaoAntecipacao = {
    id: proximoId,
    descricao: `Antecipacao da fatura ${dados.faturaId}`,
    valor: validacao.valorSolicitadoCentavos / 100,
    tipo: 'despesa',
    categoria: 'Outros',
    data: dataLocal,
    contaId: dados.contaId
  }

  const pagamentoAntecipado = {
    id: `antecipacao-${operacaoId}`,
    operacaoId,
    faturaId: dados.faturaId,
    cartaoId: fatura.cartaoId,
    contaId: dados.contaId,
    transacaoId: transacaoAntecipacao.id,
    valorPagoCentavos: validacao.valorSolicitadoCentavos,
    dataHora: agora.toISOString(),
    status: 'confirmado',
    tipo: 'antecipado'
  }

  if (
    !transacaoArmazenadaValida(transacaoAntecipacao) ||
    !pagamentoAntecipadoFaturaArmazenadoValido(
      pagamentoAntecipado
    )
  ) {
    return recusarComAuditoria(
      'REGISTROS_FINANCEIROS_INVALIDOS',
      validacao
    )
  }

  const idsTransacoesPersistidas =
    persistidos.transacoes.map(item => item?.id)

  const transacoesPersistidasSemDuplicidade =
    idsTransacoesPersistidas.every(
      id => Number.isSafeInteger(id) && id > 0
    ) &&
    new Set(idsTransacoesPersistidas).size ===
      idsTransacoesPersistidas.length

  if (!transacoesPersistidasSemDuplicidade) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const identificadoresAntecipacaoDisponiveis =
    !transacoes.value.some(
      item => item.id === transacaoAntecipacao.id
    ) &&
    ![
      ...pagamentosFatura.value,
      ...pagamentosAntecipadosFatura.value
    ].some(
      item =>
        item.id === pagamentoAntecipado.id ||
        item.operacaoId === pagamentoAntecipado.operacaoId ||
        item.transacaoId === pagamentoAntecipado.transacaoId
    )

  if (!identificadoresAntecipacaoDisponiveis) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const novosDadosAntecipacao = {
    transacoes: [
      ...transacoes.value,
      transacaoAntecipacao
    ],
    pagamentosAntecipadosFatura: [
      ...pagamentosAntecipadosFatura.value,
      pagamentoAntecipado
    ],
    proximoId: proximoId + 1
  }

  const documentoEsperadoAntecipacao =
    comporDadosFinanceirosPersistidos(
      novosDadosAntecipacao
    )

  const documentoAntecipacaoValido =
    documentoEsperadoAntecipacao &&
    typeof documentoEsperadoAntecipacao === 'object' &&
    !Array.isArray(documentoEsperadoAntecipacao) &&
    Array.isArray(documentoEsperadoAntecipacao.transacoes) &&
    Array.isArray(documentoEsperadoAntecipacao.pagamentosFatura) &&
    Array.isArray(
      documentoEsperadoAntecipacao.pagamentosAntecipadosFatura
    ) &&
    documentoEsperadoAntecipacao.transacoes.length ===
      transacoes.value.length + 1 &&
    documentoEsperadoAntecipacao.pagamentosAntecipadosFatura.length ===
      pagamentosAntecipadosFatura.value.length + 1 &&
    JSON.stringify(documentoEsperadoAntecipacao.pagamentosFatura) ===
      JSON.stringify(pagamentosFatura.value) &&
    documentoEsperadoAntecipacao.proximoId === proximoId + 1 &&
    JSON.stringify(
      documentoEsperadoAntecipacao.transacoes.at(-1)
    ) === JSON.stringify(transacaoAntecipacao) &&
    JSON.stringify(
      documentoEsperadoAntecipacao.pagamentosAntecipadosFatura.at(-1)
    ) === JSON.stringify(pagamentoAntecipado)

  if (!documentoAntecipacaoValido) {
    return recusarComAuditoria(
      'DOCUMENTO_FINANCEIRO_INVALIDO',
      validacao
    )
  }

  const registrosAnterioresPreservados =
    JSON.stringify(
      documentoEsperadoAntecipacao.transacoes.slice(0, -1)
    ) === JSON.stringify(transacoes.value) &&
    JSON.stringify(
      documentoEsperadoAntecipacao.pagamentosAntecipadosFatura.slice(0, -1)
    ) === JSON.stringify(pagamentosAntecipadosFatura.value) &&
    JSON.stringify(
      documentoEsperadoAntecipacao.pagamentosFatura
    ) === JSON.stringify(pagamentosFatura.value)

  if (!registrosAnterioresPreservados) {
    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
  }

  const confirmarPersistenciaAntecipacao = () => {
    const textoConfirmado =
      localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoConfirmado === null) {
      return false
    }

    const documentoConfirmado = JSON.parse(textoConfirmado)

    return (
      JSON.stringify(documentoConfirmado) ===
      JSON.stringify(documentoEsperadoAntecipacao)
    )
  }

  const persistirAntecipacaoProtegida = () => {
    try {
      const textoAtual =
        localStorage.getItem(CHAVE_ARMAZENAMENTO)

      if (
        textoAtual === null ||
        JSON.stringify(JSON.parse(textoAtual)) !==
          JSON.stringify(persistidos)
      ) {
        bloqueioPersistencia = true
        armazenamentoProtegido.value = true

        return {
          confirmado: false,
          motivo: 'ANTECIPACAO_REQUER_VERIFICACAO'
        }
      }

      if (!persistirOperacaoFinanceira(novosDadosAntecipacao)) {
        bloqueioPersistencia = true
        armazenamentoProtegido.value = true

        return {
          confirmado: false,
          motivo: 'PERSISTENCIA_NAO_CONFIRMADA'
        }
      }

      if (!confirmarPersistenciaAntecipacao()) {
        bloqueioPersistencia = true
        armazenamentoProtegido.value = true

        return {
          confirmado: false,
          motivo: 'ANTECIPACAO_REQUER_VERIFICACAO'
        }
      }

      return {
        confirmado: true,
        motivo: null
      }
    } catch (erro) {
      console.error(
        'Falha na persistencia da antecipacao:',
        erro
      )

      bloqueioPersistencia = true
      armazenamentoProtegido.value = true

      return {
        confirmado: false,
        motivo: 'ANTECIPACAO_REQUER_VERIFICACAO'
      }
    }
  }

  const atualizarMemoriaAntecipacaoConfirmada = () => {
    aplicandoOperacaoFinanceira = true

    try {
      transacoes.value = novosDadosAntecipacao.transacoes
      pagamentosAntecipadosFatura.value =
        novosDadosAntecipacao.pagamentosAntecipadosFatura
      proximoId = novosDadosAntecipacao.proximoId
    } finally {
      aplicandoOperacaoFinanceira = false
    }
  }

  const concluirAntecipacaoConfirmada = () => {
    const resultadoPersistencia =
      persistirAntecipacaoProtegida()

    if (!resultadoPersistencia.confirmado) {
      return recusar(resultadoPersistencia.motivo)
    }

    try {
      atualizarMemoriaAntecipacaoConfirmada()
    } catch (erro) {
      console.error(
        'Falha na atualizacao da memoria da antecipacao:',
        erro
      )

      bloqueioPersistencia = true
      armazenamentoProtegido.value = true

      return recusar('ANTECIPACAO_REQUER_VERIFICACAO')
    }

    aviso.value = 'Pagamento antecipado de fatura confirmado.'

    return {
      sucesso: true,
      motivo: null,
      pagamento: pagamentoAntecipado
    }
  }

  return concluirAntecipacaoConfirmada()
}
function pagarFaturaCartao(dados) {
  const recusar = motivo => ({
    sucesso: false,
    motivo,
    pagamento: null
  })

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados) ||
    typeof dados.operacaoId !== 'string' ||
    !dados.operacaoId.trim() ||
    dados.operacaoId.length > 200
  ) {
    return recusar('OPERACAO_INVALIDA')
  }

  const operacaoId = dados.operacaoId.trim()

  const recusarComAuditoria = (motivo, validacao = null) => {
    const fatura = faturasCartao.value.find(
      item => item.id === dados.faturaId
    )

    const valorOriginal = dados.valor

    const valorSolicitado =
      valorOriginal === null ||
      typeof valorOriginal === 'string' ||
      typeof valorOriginal === 'number' ||
      typeof valorOriginal === 'boolean'
        ? valorOriginal
        : null

    const valorCentavos =
      Number.isSafeInteger(validacao?.valorSolicitadoCentavos)
        ? validacao.valorSolicitadoCentavos
        : converterCentavos(valorOriginal)

    const tentativa = {
      id: `tentativa-pagamento-${operacaoId}`,
      modalidade: 'convencional',
      dataHora: new Date().toISOString(),
      faturaId: dados.faturaId ?? null,
      cartaoId: fatura?.cartaoId ?? null,
      contaId: dados.contaId ?? null,
      valorSolicitado,
      valorSolicitadoCentavos: valorCentavos,
      saldoDisponivelCentavos:
        validacao?.saldoDisponivelCentavos ?? null,
      motivo
    }

    if (!registrarTentativaPagamentoFaturaRecusada(tentativa)) {
      return recusar('AUDITORIA_NAO_CONFIRMADA')
    }

    return recusar(motivo)
  }

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return recusar('OPERACAO_FINANCEIRA_BLOQUEADA')
  }

  try {
    const textoAnterior = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoAnterior === null) {
      return recusar('ARMAZENAMENTO_NAO_CONFIRMADO')
    }

    const persistidos = JSON.parse(textoAnterior)

    if (
      !persistidos ||
      typeof persistidos !== 'object' ||
      Array.isArray(persistidos) ||
      !Array.isArray(persistidos.transacoes) ||
      !Array.isArray(persistidos.pagamentosFatura) ||
      !Number.isSafeInteger(persistidos.proximoId)
    ) {
      throw new Error('Estrutura financeira persistida invalida.')
    }

    if (!Array.isArray(persistidos.pagamentosAntecipadosFatura)) {
      throw new Error('Colecao de antecipacoes persistida invalida.')
    }

    if (
      JSON.stringify(persistidos.pagamentosAntecipadosFatura) !==
        JSON.stringify(pagamentosAntecipadosFatura.value)
    ) {
      throw new Error('Divergencia no historico de antecipacoes.')
    }

    const pagamentosExistentes = [
      ...persistidos.pagamentosFatura,
      ...persistidos.pagamentosAntecipadosFatura
    ].filter(
      item => item.operacaoId === operacaoId
    )

    if (pagamentosExistentes.length > 0) {
      return recusar('OPERACAO_JA_REGISTRADA')
    }

    if (
      JSON.stringify(persistidos.transacoes) !==
        JSON.stringify(transacoes.value) ||
      JSON.stringify(persistidos.pagamentosFatura) !==
        JSON.stringify(pagamentosFatura.value) ||
      persistidos.proximoId !== proximoId
    ) {
      throw new Error('Divergencia entre dados persistidos e memoria.')
    }

    const validacao = validarSolicitacaoPagamentoFatura(dados)

    if (!validacao.valido) {
      return recusarComAuditoria(validacao.motivo, validacao)
    }

    if (
      !Number.isSafeInteger(proximoId) ||
      proximoId <= 0 ||
      proximoId >= Number.MAX_SAFE_INTEGER ||
      transacoes.value.some(item => item.id === proximoId)
    ) {
      return recusarComAuditoria('IDENTIFICADOR_TRANSACAO_INVALIDO')
    }

    const agora = new Date()
    const dataLocal = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, '0'),
      String(agora.getDate()).padStart(2, '0')
    ].join('-')

    const valor = validacao.valorSolicitadoCentavos / 100

    const transacao = {
      id: proximoId,
      descricao: `Pagamento da fatura ${dados.faturaId}`,
      valor,
      tipo: 'despesa',
      categoria: 'Outros',
      data: dataLocal,
      contaId: dados.contaId
    }

    const pagamento = {
      id: `pagamento-${operacaoId}`,
      operacaoId,
      faturaId: dados.faturaId,
      cartaoId: faturasCartao.value.find(
        item => item.id === dados.faturaId
      ).cartaoId,
      contaId: dados.contaId,
      transacaoId: transacao.id,
      valorPagoCentavos: validacao.valorSolicitadoCentavos,
      dataHora: agora.toISOString(),
      status: 'confirmado'
    }

    if (
      !transacaoArmazenadaValida(transacao) ||
      !pagamentoFaturaArmazenadoValido(pagamento) ||
      [
        ...pagamentosFatura.value,
        ...pagamentosAntecipadosFatura.value
      ].some(
        item => item.id === pagamento.id ||
          item.operacaoId === operacaoId ||
          item.transacaoId === transacao.id
      )
    ) {
      return recusarComAuditoria('REGISTROS_FINANCEIROS_INVALIDOS')
    }

    const novosDados = {
      transacoes: [...transacoes.value, transacao],
      pagamentosFatura: [...pagamentosFatura.value, pagamento],
      proximoId: proximoId + 1
    }

    const documentoEsperado =
      comporDadosFinanceirosPersistidos(novosDados)

    if (!persistirOperacaoFinanceira(novosDados)) {
      return recusar('PERSISTENCIA_NAO_CONFIRMADA')
    }

    const textoConfirmado =
      localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (
      textoConfirmado === null ||
      JSON.stringify(JSON.parse(textoConfirmado)) !==
        JSON.stringify(documentoEsperado)
    ) {
      throw new Error('Confirmacao de persistencia inconsistente.')
    }

    aplicandoOperacaoFinanceira = true

    try {
      transacoes.value = novosDados.transacoes
      pagamentosFatura.value = novosDados.pagamentosFatura
      proximoId = novosDados.proximoId
    } finally {
      aplicandoOperacaoFinanceira = false
    }

    aviso.value = 'Pagamento de fatura confirmado.'

    return {
      sucesso: true,
      motivo: null,
      pagamento
    }
  } catch (erro) {
    console.error(
      'Falha ou resultado indeterminado no pagamento da fatura:',
      erro
    )

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true
    aviso.value =
      'Pagamento com resultado indeterminado. ' +
      'Operacoes bloqueadas ate verificacao.'

    return recusar('PAGAMENTO_REQUER_VERIFICACAO')
  }
}
function consultarResumoFinanceiroFatura(faturaId) {
  const indisponivel = motivo => ({
    valido: false,
    valorCentavos: null,
    motivo
  })

  const disponivel = valorCentavos => ({
    valido: true,
    valorCentavos,
    motivo: null
  })

  const campos = {
    valorOriginal: indisponivel('NAO_VERIFICADO'),
    valorAntecipado: indisponivel('NAO_VERIFICADO'),
    valorPagoConvencional: indisponivel('NAO_VERIFICADO'),
    valorPendente: indisponivel('DEPENDENCIAS_INVALIDAS')
  }

  const finalizar = () => ({
    faturaId,
    valido: Object.values(campos).every(campo => campo.valido),
    campos
  })

  const invalidarTodos = motivo => {
    for (const nome of Object.keys(campos)) {
      campos[nome] = indisponivel(motivo)
    }
    return finalizar()
  }

  if (!Number.isSafeInteger(faturaId) || faturaId <= 0) {
    return invalidarTodos('FATURA_ID_INVALIDO')
  }

  try {
    const texto = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (texto === null) {
      return invalidarTodos('ARMAZENAMENTO_AUSENTE')
    }

    const persistido = JSON.parse(texto)

    if (
      !persistido ||
      typeof persistido !== 'object' ||
      Array.isArray(persistido)
    ) {
      return invalidarTodos('ARMAZENAMENTO_INVALIDO')
    }

    const fontes = {
      transacoes,
      cartoesCredito,
      comprasCartao,
      faturasCartao,
      pagamentosFatura,
      pagamentosAntecipadosFatura,
      fechamentosFatura
    }

    const snapshot = {}

    for (const [nome, referencia] of Object.entries(fontes)) {
      const registros = persistido[nome]

      if (
        !Array.isArray(registros) ||
        !Array.isArray(referencia.value)
      ) {
        return invalidarTodos('COLECAO_INVALIDA')
      }

      if (
        JSON.stringify(registros) !==
        JSON.stringify(referencia.value)
      ) {
        return invalidarTodos('DIVERGENCIA_PERSISTENCIA')
      }

      snapshot[nome] = registros
    }

    const faturas = snapshot.faturasCartao.filter(
      item => item?.id === faturaId
    )

    if (faturas.length !== 1) {
      return invalidarTodos('FATURA_AUSENTE_OU_DUPLICADA')
    }

    const fatura = faturas[0]

    if (fatura.status === 'aberta') {
      const eventos = snapshot.fechamentosFatura.filter(
        item => item?.faturaId === faturaId
      )

      if (eventos.length !== 0) {
        campos.valorOriginal = indisponivel(
          'FECHAMENTO_INCOMPATIVEL'
        )
      } else {
        const consolidacao = consolidarFaturaCartao(
          fatura,
          snapshot
        )

        const valor = consolidacao.valorConsolidadoCentavos

        campos.valorOriginal =
          consolidacao.valido &&
          Number.isSafeInteger(valor) &&
          valor >= 0
            ? disponivel(valor)
            : indisponivel(
                consolidacao.motivo || 'CONSOLIDACAO_INVALIDA'
              )
      }
    } else if (fatura.status === 'fechada') {
      const eventos = snapshot.fechamentosFatura.filter(
        item => item?.faturaId === faturaId
      )

      const evento = eventos[0]

      const confirmado =
        eventos.length === 1 &&
        fechamentoFaturaArmazenadoValido(evento) &&
        evento.cartaoId === fatura.cartaoId &&
        evento.competencia === fatura.competencia &&
        evento.fechamentoPrevisto === fatura.fechamento &&
        Number.isSafeInteger(
          evento.valorConsolidadoCentavos
        ) &&
        evento.valorConsolidadoCentavos >= 0

      campos.valorOriginal = confirmado
        ? disponivel(evento.valorConsolidadoCentavos)
        : indisponivel('FECHAMENTO_NAO_CONFIRMADO')
    } else {
      campos.valorOriginal = indisponivel(
        'STATUS_FATURA_INVALIDO'
      )
    }

    const modalidades = [
      {
        nome: 'valorAntecipado',
        antecipado: true,
        lista: snapshot.pagamentosAntecipadosFatura
      },
      {
        nome: 'valorPagoConvencional',
        antecipado: false,
        lista: snapshot.pagamentosFatura
      }
    ]

    const operacoes = new Map()
    const transacoesUsadas = new Map()

    for (const modalidade of modalidades) {
      for (const pagamento of modalidade.lista) {
        if (
          !pagamento ||
          typeof pagamento !== 'object' ||
          Array.isArray(pagamento)
        ) {
          continue
        }

        for (const [indice, chave] of [
          [operacoes, pagamento.operacaoId],
          [transacoesUsadas, pagamento.transacaoId]
        ]) {
          if (chave === null || chave === undefined) {
            continue
          }

          indice.set(chave, (indice.get(chave) || 0) + 1)
        }
      }
    }

    for (const modalidade of modalidades) {
      let total = 0
      let motivo = null

      const pagamentos = modalidade.lista.filter(
        item => item?.faturaId === faturaId
      )

      if (
        !modalidade.antecipado &&
        fatura.status === 'aberta' &&
        pagamentos.length > 0
      ) {
        motivo = 'PAGAMENTO_INCOMPATIVEL_COM_FATURA_ABERTA'
      }

      for (const pagamento of pagamentos) {
        const estruturaValida = modalidade.antecipado
          ? pagamentoAntecipadoFaturaArmazenadoValido(
              pagamento
            )
          : pagamentoFaturaArmazenadoValido(pagamento)

        if (
          !estruturaValida ||
          pagamento.cartaoId !== fatura.cartaoId
        ) {
          motivo ||= 'PAGAMENTO_INVALIDO'
          continue
        }

        if (
          operacoes.get(pagamento.operacaoId) !== 1 ||
          transacoesUsadas.get(pagamento.transacaoId) !== 1
        ) {
          motivo ||= 'IDENTIFICADOR_FINANCEIRO_DUPLICADO'
          continue
        }

        const vinculadas = snapshot.transacoes.filter(
          item => item?.id === pagamento.transacaoId
        )

        const transacao = vinculadas[0]

        if (
          vinculadas.length !== 1 ||
          !transacaoArmazenadaValida(transacao) ||
          transacao.tipo !== 'despesa' ||
          transacao.contaId !== pagamento.contaId ||
          converterCentavos(transacao.valor) !==
            pagamento.valorPagoCentavos
        ) {
          motivo ||= 'VINCULO_BANCARIO_INCONSISTENTE'
          continue
        }

        const novoTotal = total + pagamento.valorPagoCentavos

        if (!Number.isSafeInteger(novoTotal)) {
          motivo ||= 'TOTAL_FORA_DO_LIMITE_SEGURO'
          continue
        }

        total = novoTotal
      }

      campos[modalidade.nome] = motivo
        ? indisponivel(motivo)
        : disponivel(total)
    }

    const original = campos.valorOriginal
    const antecipado = campos.valorAntecipado
    const convencional = campos.valorPagoConvencional

    if (
      original.valido &&
      antecipado.valido &&
      convencional.valido
    ) {
      const totalPago =
        antecipado.valorCentavos +
        convencional.valorCentavos

      const pendente = original.valorCentavos - totalPago

      campos.valorPendente =
        Number.isSafeInteger(totalPago) &&
        Number.isSafeInteger(pendente) &&
        pendente >= 0
          ? disponivel(pendente)
          : indisponivel('SALDO_FINANCEIRO_INCONSISTENTE')
    } else {
      campos.valorPendente = indisponivel(
        'DEPENDENCIAS_FINANCEIRAS_INVALIDAS'
      )
    }

    return finalizar()
  } catch {
    return invalidarTodos('CONSULTA_FINANCEIRA_INDISPONIVEL')
  }
}

function validarSolicitacaoPagamentoObrigacaoComplementar(dados) {
  const resultado = {
    valido: false,
    motivo: null,
    valorSolicitadoCentavos: null,
    valorPendenteCentavos: null,
    saldoDisponivelCentavos: null
  }

  const recusar = motivo => ({
    ...resultado,
    motivo
  })

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return recusar('OPERACAO_FINANCEIRA_BLOQUEADA')
  }

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return recusar('SOLICITACAO_INVALIDA')
  }

  const { obrigacaoId, contaId, valor } = dados

  if (
    (typeof obrigacaoId !== 'string' &&
      (!Number.isSafeInteger(obrigacaoId) || obrigacaoId <= 0)) ||
    (typeof obrigacaoId === 'string' && !obrigacaoId.trim()) ||
    !Number.isSafeInteger(contaId) ||
    contaId <= 0
  ) {
    return recusar('IDENTIFICADORES_INVALIDOS')
  }

  const obrigacoes = obrigacoesComplementaresFatura.value.filter(
    item => item.id === obrigacaoId
  )

  if (obrigacoes.length !== 1) {
    return recusar('OBRIGACAO_INVALIDA')
  }

  const obrigacao = obrigacoes[0]

  if (!obrigacaoComplementarFaturaArmazenadaValida(obrigacao)) {
    return recusar('OBRIGACAO_INCONSISTENTE')
  }

  if (obrigacao.status !== 'confirmada') {
    return recusar('OBRIGACAO_NAO_CONFIRMADA')
  }

  const resumo = consultarSituacaoFinanceiraObrigacaoComplementar(
    obrigacaoId
  )

  if (!resumo) {
    return recusar('HISTORICO_PAGAMENTOS_INCONSISTENTE')
  }

  resultado.valorPendenteCentavos = resumo.saldoRestanteCentavos

  if (resumo.saldoRestanteCentavos <= 0) {
    return recusar('OBRIGACAO_QUITADA')
  }

  const contasCorrespondentes = contas.value.filter(
    item => item.id === contaId
  )

  if (contasCorrespondentes.length !== 1) {
    return recusar('CONTA_INVALIDA')
  }

  if (contasCorrespondentes[0].ativa !== true) {
    return recusar('CONTA_INATIVA')
  }

  const valorCentavos = converterCentavos(valor)

  if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
    return recusar('VALOR_INVALIDO')
  }

  resultado.valorSolicitadoCentavos = valorCentavos

  if (valorCentavos > resumo.saldoRestanteCentavos) {
    return recusar('VALOR_SUPERIOR_AO_PENDENTE')
  }

  const saldoCentavos = converterCentavos(
    saldoOperacionalDaConta(contaId)
  )

  if (!Number.isSafeInteger(saldoCentavos)) {
    return recusar('SALDO_INCONSISTENTE')
  }

  resultado.saldoDisponivelCentavos = saldoCentavos

  if (saldoCentavos < valorCentavos) {
    return recusar('SALDO_INSUFICIENTE')
  }

  return {
    ...resultado,
    valido: true,
    motivo: null
  }
}
function pagarObrigacaoComplementarFatura(dados) {
  const recusar = motivo => ({
    sucesso: false,
    motivo,
    pagamento: null
  })

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados) ||
    typeof dados.operacaoId !== 'string' ||
    !dados.operacaoId.trim() ||
    dados.operacaoId.length > 200
  ) {
    return recusar('OPERACAO_INVALIDA')
  }

  const operacaoId = dados.operacaoId.trim()

  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value ||
    existemImpedimentosTecnicosTransferencia()
  ) {
    return recusar('OPERACAO_FINANCEIRA_BLOQUEADA')
  }

  try {
    const textoAnterior = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (textoAnterior === null) {
      return recusar('ARMAZENAMENTO_NAO_CONFIRMADO')
    }

    const persistidos = JSON.parse(textoAnterior)

    if (
      !persistidos ||
      typeof persistidos !== 'object' ||
      Array.isArray(persistidos) ||
      !Number.isSafeInteger(persistidos.proximoId)
    ) {
      throw new Error('Estrutura financeira persistida invalida.')
    }

    const colecoes = {
      transacoes,
      pagamentosFatura,
      pagamentosAntecipadosFatura,
      pagamentosObrigacoesComplementares,
      obrigacoesComplementaresFatura,
      contas,
      faturasCartao,
      cartoesCredito,
      fechamentosFatura
    }

    for (const [nome, referencia] of Object.entries(colecoes)) {
      if (
        !Array.isArray(persistidos[nome]) ||
        JSON.stringify(persistidos[nome]) !==
          JSON.stringify(referencia.value)
      ) {
        throw new Error(`Divergencia na colecao ${nome}.`)
      }
    }

    const todosPagamentos = [
      ...persistidos.pagamentosFatura,
      ...persistidos.pagamentosAntecipadosFatura,
      ...persistidos.pagamentosObrigacoesComplementares
    ]

    if (todosPagamentos.some(
      item => item.operacaoId === operacaoId
    )) {
      return recusar('OPERACAO_JA_REGISTRADA')
    }

    if (
      persistidos.proximoId !== proximoId ||
      !Number.isSafeInteger(proximoId) ||
      proximoId <= 0 ||
      proximoId >= Number.MAX_SAFE_INTEGER
    ) {
      throw new Error('Identificador financeiro inconsistente.')
    }

    const validacao =
      validarSolicitacaoPagamentoObrigacaoComplementar(dados)

    if (!validacao.valido) {
      return recusar(validacao.motivo)
    }

    const obrigacoes = obrigacoesComplementaresFatura.value.filter(
      item => item.id === dados.obrigacaoId
    )

    if (
      obrigacoes.length !== 1 ||
      obrigacoes[0].status !== 'confirmada'
    ) {
      return recusar('OBRIGACAO_NAO_CONFIRMADA')
    }

    const obrigacao = obrigacoes[0]

    if (
      !vinculosObrigacaoComplementarFaturaValidos(
        obrigacao,
        {
          cartoesCredito: cartoesCredito.value,
          faturasCartao: faturasCartao.value,
          fechamentosFatura: fechamentosFatura.value
        }
      )
    ) {
      return recusar('VINCULOS_OBRIGACAO_INVALIDOS')
    }

    if (
      transacoes.value.some(item => item.id === proximoId) ||
      todosPagamentos.some(
        item =>
          item.transacaoId === proximoId ||
          item.id === `pagamento-complementar-${operacaoId}`
      )
    ) {
      return recusar('REGISTROS_FINANCEIROS_DUPLICADOS')
    }

    const agora = new Date()
    const dataLocal = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, '0'),
      String(agora.getDate()).padStart(2, '0')
    ].join('-')

    const transacao = {
      id: proximoId,
      descricao: `Pagamento complementar da fatura ${obrigacao.faturaId}`,
      valor: validacao.valorSolicitadoCentavos / 100,
      tipo: 'despesa',
      categoria: 'Outros',
      data: dataLocal,
      contaId: dados.contaId
    }

    const pagamento = {
      id: `pagamento-complementar-${operacaoId}`,
      operacaoId,
      obrigacaoId: obrigacao.id,
      faturaId: obrigacao.faturaId,
      cartaoId: obrigacao.cartaoId,
      contaId: dados.contaId,
      transacaoId: transacao.id,
      valorPagoCentavos: validacao.valorSolicitadoCentavos,
      dataHora: agora.toISOString(),
      status: 'confirmado'
    }

    if (
      !transacaoArmazenadaValida(transacao) ||
      !pagamentoObrigacaoComplementarArmazenadoValido(pagamento)
    ) {
      return recusar('REGISTROS_FINANCEIROS_INVALIDOS')
    }

    const novosDados = {
      transacoes: [...transacoes.value, transacao],
      pagamentosObrigacoesComplementares: [
        ...pagamentosObrigacoesComplementares.value,
        pagamento
      ],
      proximoId: proximoId + 1
    }

    const documentoEsperado =
      comporDadosFinanceirosPersistidos(novosDados)

    if (!persistirOperacaoFinanceira(novosDados)) {
      return recusar('PERSISTENCIA_NAO_CONFIRMADA')
    }

    const textoConfirmado =
      localStorage.getItem(CHAVE_ARMAZENAMENTO)

    if (
      textoConfirmado === null ||
      JSON.stringify(JSON.parse(textoConfirmado)) !==
        JSON.stringify(documentoEsperado)
    ) {
      throw new Error('Confirmacao de persistencia inconsistente.')
    }

    aplicandoOperacaoFinanceira = true

    try {
      transacoes.value = novosDados.transacoes
      pagamentosObrigacoesComplementares.value =
        novosDados.pagamentosObrigacoesComplementares
      proximoId = novosDados.proximoId
    } finally {
      aplicandoOperacaoFinanceira = false
    }

    aviso.value = 'Pagamento complementar confirmado.'

    return {
      sucesso: true,
      motivo: null,
      pagamento
    }
  } catch (erro) {
    console.error(
      'Falha ou resultado indeterminado no pagamento complementar:',
      erro
    )

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Pagamento complementar com resultado indeterminado. ' +
      'Operacoes bloqueadas ate verificacao.'

    return recusar('PAGAMENTO_REQUER_VERIFICACAO')
  }
}
function consultarSituacaoFinanceiraObrigacaoComplementar(obrigacaoId) {
  const obrigacao = obrigacoesComplementaresFatura.value.find(
    item => item.id === obrigacaoId
  )

  if (!obrigacao) {
    return null
  }

  const pagamentos = pagamentosObrigacoesComplementares.value.filter(
    item => item.obrigacaoId === obrigacaoId
  )

  const resumo = calcularSituacaoFinanceiraObrigacaoComplementar(
    obrigacao,
    pagamentos
  )

  if (!resumo) {
    return null
  }

  return {
    ...resumo,
    statusAdministrativo: obrigacao.status
  }
}

function consultarObrigacoesComplementaresFatura(faturaId) {
  if (!Number.isSafeInteger(faturaId) || faturaId <= 0) {
    return []
  }

  return obrigacoesComplementaresFatura.value
    .filter(item => item.faturaId === faturaId)
    .map(obrigacao => ({
      ...obrigacao,
      resumoFinanceiro:
        consultarSituacaoFinanceiraObrigacaoComplementar(obrigacao.id)
    }))
}
export function useFinancas() {
  inicializarFinancas()

  return {
    // Estados reativos
    mesSelecionado,
    saldoInicial,
    transacoes,
    transferencias,
    tentativasTransferenciaRecusadas,
    pendenciasTecnicasTransferencia,
    bloqueiosTecnicosTransferencia,
    historicoRegularizacoesTecnicas,
    inconsistenciasPendenciasTecnicas,
    limites,
    contas,
    cartoesCredito,
    comprasCartao,
    faturasCartao,
    pagamentosFatura,
    pagamentosAntecipadosFatura,
    tentativasPagamentoFaturaRecusadas,
    fechamentosFatura,
    obrigacoesComplementaresFatura,
    pagamentosObrigacoesComplementares,
    categoriasDespesa,
    categoriasReceita,
    limiteEditando,
    aviso,
    resultadoTecnicoTransferencia,

    consultarResumoFinanceiroFatura,
    consultarSituacaoFinanceiraObrigacaoComplementar,
    consultarObrigacoesComplementaresFatura,

    // Inicialização e proteção
    inicializarFinancas,
    consultarDadosAdministrativos,
    armazenamentoProtegido,

    // Formatação e navegação temporal
    moeda,
    mesChave,
    nomeMes,
    mudarMes,
    dataMes,

    // Cálculos financeiros
    doMes,
    somar,
    receitas,
    despesas,
    resultado,
    saldo,
    saldoDaConta,
    saldoOperacionalDaConta,
    limiteAtual,
    categorias,
    maxCategoria,

    // Operações financeiras
    validarSolicitacaoPagamentoAntecipadoFatura,
    anteciparPagamentoFaturaCartao,
    validarSolicitacaoPagamentoFatura,
    pagarObrigacaoComplementarFatura,
    validarSolicitacaoPagamentoObrigacaoComplementar,
    pagarFaturaCartao,
    registrarTentativaPagamentoFaturaRecusada,
    executarTransferencia,
    registrarPendenciaTecnicaTransferencia,
    registrarAnaliseAdministrativaTransferencia,
    registrarReconciliacaoAdministrativaTransferencia,
    recuperarConfirmacaoReconciliacaoAdministrativaTransferencia,

    // Recuperação administrativa do histórico
    recuperarHistoricoTransferenciaRecusada,
    editarCartao,
    adicionarCartao,
    fecharFaturaCartao,
    fecharFaturasVencidas,
    registrarCompraCartao,
    adicionarConta,
    editarConta,
    alterarSituacaoConta,
    definirContaPrincipal,
    adicionar,
    adicionarCategoria,
    editar,
    excluir,
    limpar,
    salvarLimite,
    demonstracao,

    // Formatação monetária
    converterLimiteMonetario,
    formatarLimiteMonetario
  }
}
