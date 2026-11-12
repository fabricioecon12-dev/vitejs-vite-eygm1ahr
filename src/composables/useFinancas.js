
import { ref, watch } from 'vue'
import { usePreferencias } from './usePreferencias.js'

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
const limites = ref({})

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

function salvarDadosLocais() {
  if (bloqueioPersistencia) {
    console.warn(
      'Salvamento bloqueado: os dados armazenados estão protegidos.'
    )

    return false
  }

  try {
    const dados = {
      transacoes: transacoes.value,
      limites: limites.value,
      saldoInicial: saldoInicial.value,
      proximoId,
      categoriasDespesa: categoriasDespesa.value,
      categoriasReceita: categoriasReceita.value
    }

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

function persistirOperacaoFinanceira(novosDados) {
  if (
    bloqueioPersistencia ||
    armazenamentoProtegido.value
  ) {
    return false
  }

  try {
    const dados = {
      transacoes: novosDados.transacoes,
      limites: novosDados.limites,
      saldoInicial: novosDados.saldoInicial,
      proximoId: novosDados.proximoId,
      categoriasDespesa: categoriasDespesa.value,
      categoriasReceita: categoriasReceita.value
    }

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

function executarOperacaoFinanceira(novosDados, mensagem) {
  if (!persistirOperacaoFinanceira(novosDados)) {
    return false
  }

  aplicandoOperacaoFinanceira = true

  try {
    transacoes.value = novosDados.transacoes
    limites.value = novosDados.limites
    saldoInicial.value = novosDados.saldoInicial
    proximoId = novosDados.proximoId
  } finally {
    aplicandoOperacaoFinanceira = false
  }

  aviso.value = mensagem

  return true
}

// Observa alterações realizadas diretamente
// nos estados financeiros compartilhados.

watch(
  [transacoes, limites, saldoInicial],
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
    armazenamentoProtegido.value
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

  const novosDados = {
    transacoes: transacoes.value,
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId,
    categoriasDespesa:
      tipo === 'despesa'
        ? novasCategorias
        : categoriasDespesa.value,
    categoriasReceita:
      tipo === 'receita'
        ? novasCategorias
        : categoriasReceita.value
  }

  try {
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
    saldoInicial.value +
    somar(ateMes, 'receita') -
    somar(ateMes, 'despesa')
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

  const novaTransacao = {
    ...transacao,
    id: proximoId
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

  const transacaoEditada = {
    id,
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

  if (!confirm('Deseja realmente excluir esta transação?')) {
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
    proximoId: 1
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
      'As transações e os limites financeiros atuais serão substituídos.'
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

  const novosDados = {
    transacoes: exemplos.map(
      (item, indice) => ({
        ...item,
        id: indice + 1
      })
    ),
    limites: {
      [mesChave(mesDemonstracao)]: 4000
    },
    saldoInicial: 5380,
    proximoId: exemplos.length + 1
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

export function useFinancas() {
  inicializarFinancas()

  return {
    // Estados reativos
    mesSelecionado,
    saldoInicial,
    transacoes,
    limites,
    categoriasDespesa,
    categoriasReceita,
    limiteEditando,
    aviso,

    // Inicialização e proteção
    inicializarFinancas,
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
    limiteAtual,
    categorias,
    maxCategoria,

    // Operações financeiras
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
