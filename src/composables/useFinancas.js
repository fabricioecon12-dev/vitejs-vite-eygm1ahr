
import { ref, watch } from 'vue'
// Mesma chave utilizada pelo App.vue original.
// Não alterar: preserva a compatibilidade com os dados existentes.
const CHAVE_ARMAZENAMENTO = 'nexus-financas-dados-v1'
// Impede a gravação quando os dados armazenados
// não puderem ser recuperados com segurança.
let bloqueioPersistencia = false
let aplicandoOperacaoFinanceira = false


// Verifica se uma data armazenada existe no calendário.
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

  // Verifica a integridade de cada transação armazenada.
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
// Valida as listas de categorias armazenadas.
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
// Verifica se os identificadores das transações são únicos.
function identificadoresUnicos(transacoesArmazenadas) {
    if (!Array.isArray(transacoesArmazenadas)) {
      return false
    }
  
    const identificadores = transacoesArmazenadas.map(
      item => item?.id
    )
  
    return new Set(identificadores).size === identificadores.length
  }
  
// Verifica a integridade dos limites mensais armazenados.
function limitesArmazenadosValidos(limitesArmazenados) {
    if (
      !limitesArmazenados ||
      typeof limitesArmazenados !== 'object' ||
      Array.isArray(limitesArmazenados)
    ) {
      return false
    }
  
    return Object.entries(limitesArmazenados).every(
      ([mes, valor]) => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {

          return false
        }
  
        return (
          typeof valor === 'number' &&
          Number.isFinite(valor) &&
          valor >= 0
        )
      }
    )
  }
  // NEXUS FINANÇAS — Estado financeiro compartilhado

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
// Controla o próximo identificador disponível para novas transações.
let proximoId = 1
// Controla a inicialização única do estado financeiro.
let financasInicializadas = false

// Indica se os dados foram recuperados com sucesso.
let dadosRecuperados = false

// Controla o salvamento após a criação dos dados iniciais.
let armazenamentoInicializado = false

let leituraArmazenamentoConcluida = false
let armazenamentoVazioConfirmado = false

// Bloqueia operações quando os dados existentes estão protegidos.
const armazenamentoProtegido = ref(false)
// Inicializa o estado financeiro somente uma vez.
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

    limiteEditando.value = Number(limiteAtual()).toLocaleString('pt-BR', {
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
    'Não foi possível recuperar os dados armazenados. Os registros existentes foram preservados.'
}
// Recupera as informações financeiras armazenadas.
function carregarDadosLocais() {
    try {
      const dadosSalvos = localStorage.getItem(CHAVE_ARMAZENAMENTO)

      leituraArmazenamentoConcluida = true
      armazenamentoVazioConfirmado = dadosSalvos === null
  
      // Primeiro acesso: ainda não existem dados armazenados.
      if (dadosSalvos === null) {
        return false
      }
  
      const dados = JSON.parse(dadosSalvos)
  
      // Verifica a integridade dos dados antes de utilizá-los.
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
  
      transacoes.value = dados.transacoes
      limites.value = dados.limites
      saldoInicial.value = dados.saldoInicial
      // Recupera categorias personalizadas, mantendo
// compatibilidade com dados salvos anteriormente.
if (categoriasArmazenadasValidas(dados.categoriasDespesa)) {
  categoriasDespesa.value = [
    ...new Set([
      ...categoriasDespesa.value,
      ...dados.categoriasDespesa
    ])
  ]
}

if (categoriasArmazenadasValidas(dados.categoriasReceita)) {
  categoriasReceita.value = [
    ...new Set([
      ...categoriasReceita.value,
      ...dados.categoriasReceita
    ])
  ]
}
  
      // Evita reutilizar identificadores de transações.
      const maiorId = transacoes.value.reduce(
        (maior, item) => Math.max(maior, Number(item.id) || 0),
        0
      )
  
      proximoId = Math.max(
        maiorId + 1,
        Number.isSafeInteger(dados.proximoId) ? dados.proximoId : 1
      )
  
      return true
    } catch (erro) {
      console.error(
        'Não foi possível recuperar os dados do Nexus Finanças:',
        erro
      )
  
      return false
    }
  }

// Salva as informações financeiras no navegador.
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
  
/**
 * Persiste uma versão completa dos dados financeiros.
 * Somente após o sucesso da gravação o estado reativo
 * poderá ser atualizado pela operação chamadora.
 */
function persistirOperacaoFinanceira(novosDados) {
  if (bloqueioPersistencia || armazenamentoProtegido.value) {
    return false
  }

  try {
    const dados = {
      transacoes: novosDados.transacoes,
      limites: novosDados.limites,
      saldoInicial: novosDados.saldoInicial,
      proximoId: novosDados.proximoId,
    
      // Preserva as categorias cadastradas
      // durante as operações financeiras.
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
// Cadastra uma categoria com persistência protegida.
function adicionarCategoria(nome, tipo) {
  if (bloqueioPersistencia || armazenamentoProtegido.value) {
    aviso.value = 'Cadastro bloqueado: armazenamento protegido.'
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

  const lista = tipo === 'receita'
    ? categoriasReceita
    : categoriasDespesa

  const jaExiste = lista.value.some(
    item => item.toLowerCase() === nomeFormatado.toLowerCase()
  )

  if (jaExiste) {
    return false
  }

  const novasCategorias = [...lista.value, nomeFormatado]

  const novosDados = {
    transacoes: transacoes.value,
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId,
    categoriasDespesa: tipo === 'despesa'
      ? novasCategorias
      : categoriasDespesa.value,
    categoriasReceita: tipo === 'receita'
      ? novasCategorias
      : categoriasReceita.value
  }

  try {
    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify(novosDados)
    )
  } catch (erro) {
    console.error('Erro ao salvar categoria:', erro)

    bloqueioPersistencia = true
    armazenamentoProtegido.value = true

    aviso.value =
      'Não foi possível salvar a categoria. ' +
      'Novas alterações foram bloqueadas para proteger os dados.'

    return false
  }

  lista.value = novasCategorias
  aviso.value = 'Categoria cadastrada com sucesso!'

  return true
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



  // Observa alterações financeiras e salva somente após a inicialização.

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
    { deep: true, flush: 'sync' }
  )
  
// Formata valores monetários no padrão brasileiro.
function moeda(valor) {
    return Number(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  }
  
// Retorna a identificação do mês no formato AAAA-MM.
function mesChave(data = mesSelecionado.value) {
    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
  
    return `${ano}-${mes}`
  }
  
// Retorna o nome do mês e o ano em português.
function nomeMes() {
    const nome = mesSelecionado.value.toLocaleDateString(
      'pt-BR',
      { month: 'long', year: 'numeric' }
    )
  
    return nome.charAt(0).toUpperCase() + nome.slice(1)
  }
  
  // Gera uma data no formato AAAA-MM-DD para os dados demonstrativos.
function dataMes(dia, deslocamento = 0) {
  const data = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + deslocamento,
    dia,
    12
  )

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const diaFormatado = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${diaFormatado}`
}
// Avança ou retrocede o mês selecionado.
function mudarMes(direcao) {
  mesSelecionado.value = new Date(
    mesSelecionado.value.getFullYear(),
    mesSelecionado.value.getMonth() + direcao,
    1
  )

  limiteEditando.value = Number(limiteAtual()).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  aviso.value = ''
}
     
     export function useFinancas() {
       inicializarFinancas()

      return {
      // Estados reativos
     // Estados reativos
        mesSelecionado,
        saldoInicial,
        transacoes,
        limites,
        categoriasDespesa,
        categoriasReceita,
        limiteEditando,
        aviso,
      // Inicialização e proteção dos dados
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
  
      // Ações financeiras
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
  
  
// DADOS DEMONSTRATIVOS
function demonstracao({ confirmar = true } = {}) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Restauração bloqueada: os dados armazenados precisam ser verificados.'
    return
  }

  if (
    confirmar &&
    !confirm(
      'Deseja realmente restaurar os dados demonstrativos? ' +
      'As transações e os limites financeiros atuais serão substituídos.'
    )
  ) {
    return
  }

  const mesDemonstracao = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1
  )

  const exemplos = [
    { descricao: 'Salário', valor: 4500, tipo: 'receita', categoria: 'Salário', data: dataMes(25) },
    { descricao: 'Freelance', valor: 1000, tipo: 'receita', categoria: 'Serviços', data: dataMes(18) },
    { descricao: 'Supermercado', valor: 760, tipo: 'despesa', categoria: 'Alimentação', data: dataMes(23) },
    { descricao: 'Aluguel', valor: 620, tipo: 'despesa', categoria: 'Moradia', data: dataMes(20) },
    { descricao: 'Transporte', valor: 260, tipo: 'despesa', categoria: 'Transporte', data: dataMes(16) },
    { descricao: 'Farmácia', valor: 180, tipo: 'despesa', categoria: 'Saúde', data: dataMes(12) },
    { descricao: 'Lazer', valor: 140, tipo: 'despesa', categoria: 'Lazer', data: dataMes(10) },
    { descricao: 'Outros gastos', valor: 220, tipo: 'despesa', categoria: 'Outros', data: dataMes(8) },
    { descricao: 'Internet', valor: 100, tipo: 'despesa', categoria: 'Moradia', data: dataMes(5) },
    { descricao: 'Compra anterior', valor: 150, tipo: 'despesa', categoria: 'Outros', data: dataMes(14, -1) }
  ]

  const novosDados = {
    transacoes: exemplos.map((item, indice) => ({
      ...item,
      id: indice + 1
    })),
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
    return
  }

  mesSelecionado.value = mesDemonstracao
  limiteEditando.value = '4.000,00'
}  // CÁLCULOS FINANCEIROS

// Retorna as transações do mês selecionado.
function doMes() {
    return transacoes.value
      .filter(item => item.data.slice(0, 7) === mesChave())
      .sort((a, b) =>
        b.data.localeCompare(a.data) || b.id - a.id
      )
  }
  
  // Soma as transações conforme o tipo informado.
  function somar(lista, tipo) {
    return lista
      .filter(item => item.tipo === tipo)
      .reduce((total, item) => total + item.valor, 0)
  }
  
// Calcula o total de receitas do mês selecionado.
function receitas() {
    return somar(doMes(), 'receita')
  }
  
  // Calcula o total de despesas do mês selecionado.
  function despesas() {
    return somar(doMes(), 'despesa')
  }
  
  // Calcula a diferença entre receitas e despesas.
  function resultado() {
    return receitas() - despesas()
  }
  
// Calcula o saldo acumulado até o final do mês selecionado.
function saldo() {
    const ultimoDia = new Date(
      mesSelecionado.value.getFullYear(),
      mesSelecionado.value.getMonth() + 1,
      0
    )
  
    const ano = ultimoDia.getFullYear()
    const mes = String(ultimoDia.getMonth() + 1).padStart(2, '0')
    const dia = String(ultimoDia.getDate()).padStart(2, '0')
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
  
// Retorna o limite de orçamento do mês selecionado.
function limiteAtual() {
    return limites.value[mesChave()] || 0
  }
  
// Agrupa as despesas do mês por categoria.
function categorias() {
  const mapa = {}

  doMes()
    .filter(item => item.tipo === 'despesa')
    .forEach(item => {
      mapa[item.categoria] =
        (mapa[item.categoria] || 0) + item.valor
    })

  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor }))
}

// Retorna o maior valor entre as categorias de despesas.
function maxCategoria() {
  return Math.max(
    ...categorias().map(item => item.valor),
    1
  )
}
  
// Cadastra uma nova transação financeira.

function adicionar(transacao) {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Cadastro bloqueado: não foi possível recuperar os dados armazenados.'
    return
  }

  const dataInformada = transacao.data

  if (
    typeof dataInformada !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dataInformada)
  ) {
    aviso.value = 'Data inválida. Transação não cadastrada.'
    return
  }

  const [ano, mes, dia] = dataInformada.split('-').map(Number)

  const dataVerificada = new Date(0)
  dataVerificada.setFullYear(ano, mes - 1, dia)

  if (
    ano < 2000 ||
    ano > 2100 ||
    dataVerificada.getFullYear() !== ano ||
    dataVerificada.getMonth() !== mes - 1 ||
    dataVerificada.getDate() !== dia
  ) {
    aviso.value = 'Data inválida. Verifique a data informada.'
    return
  }

  const novaTransacao = {
    ...transacao,
    id: proximoId
  }

  const novosDados = {
    transacoes: [...transacoes.value, novaTransacao],
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
  
  mesSelecionado.value = new Date(ano, mes - 1, 1)
  limiteEditando.value = String(limiteAtual())
  
  return true
  }

/**
 * Atualiza uma transação existente com persistência protegida.
 * Mantém o identificador original e não duplica lançamentos.
 */
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
    item => item.id === id ? transacaoEditada : item
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

  if (!sucesso) return false

  const [ano, mes] = transacaoEditada.data
    .split('-')
    .map(Number)

  mesSelecionado.value = new Date(ano, mes - 1, 1)

  return true
}

  
// Exclui uma transação após confirmação do usuário.

function excluir(id) {
  if (armazenamentoProtegido.value) {
    aviso.value = 'Operação bloqueada: os dados armazenados precisam ser verificados.'
    return
  }

  if (!confirm('Deseja realmente excluir esta transação?')) {
    return
  }

  const novasTransacoes = transacoes.value.filter(
    transacao => transacao.id !== id
  )

  if (novasTransacoes.length === transacoes.value.length) {
    aviso.value = 'Transação não encontrada.'
    return
  }

  const novosDados = {
    transacoes: novasTransacoes,
    limites: limites.value,
    saldoInicial: saldoInicial.value,
    proximoId
  }

  executarOperacaoFinanceira(
    novosDados,
    'Transação excluída com sucesso.'
  )
}

// Limpa as transações e os orçamentos após confirmação.

function limpar() {
  if (armazenamentoProtegido.value) {
    aviso.value = 'Operação bloqueada: os dados armazenados precisam ser verificados.'
    return
  }

  if (!confirm('Deseja realmente apagar todos os dados financeiros?')) {
    return
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
    return
  }

  limiteEditando.value = '0,00'
}

  

// FUNÇÕES AUXILIARES

// Converte valores monetários brasileiros em números.
function converterLimiteMonetario(valorInformado) {
  const texto = String(valorInformado).trim()

  if (!texto) return NaN

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

// Formata o limite monetário no padrão brasileiro.
function formatarLimiteMonetario() {
  const valor = converterLimiteMonetario(limiteEditando.value)

  // Não formata valores inválidos.
  if (!Number.isFinite(valor) || valor < 0) {
    return
  }

  limiteEditando.value = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// Salva o limite de orçamento do mês selecionado.

function salvarLimite() {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Alteração bloqueada: não foi possível recuperar os dados armazenados.'
    return
  }

  const valor = converterLimiteMonetario(limiteEditando.value)

  if (!Number.isFinite(valor) || valor < 0) {
    aviso.value = 'Informe um limite válido.'
    return
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

  executarOperacaoFinanceira(
    novosDados,
    'Limite mensal atualizado.'
  )
}
