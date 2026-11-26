import { describe, it, expect, vi, afterEach } from 'vitest'

function criarDadosFinanceirosValidos() {
  return {
    transacoes: [],
    limites: {},
    saldoInicial: 1000,
    proximoId: 1,
    categoriasDespesa: [
      'Alimentação',
      'Moradia',
      'Transporte',
      'Saúde',
      'Lazer',
      'Outros'
    ],
    categoriasReceita: [
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
    ],
    versaoDados: 2,
    contas: [
      {
        id: 1,
        nome: 'Conta principal',
        instituicao: 'Banco A',
        tipo: 'corrente',
        agencia: '',
        numero: '',
        saldoInicial: 1000,
        ativa: true,
        principal: true,
        dataCriacao: '2026-11-01'
      }
    ],
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: [],
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: [],
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
    revisaoAdministrativaTransferencias: 0
  }
}


function criarPagamento(id = 'pagamento-001', operacaoId = 'operacao-001') {
  return {
    id,
    operacaoId,
    faturaId: 10,
    cartaoId: 2,
    contaId: 1,
    transacaoId: 20,
    valorPagoCentavos: 15000,
    dataHora: '2026-11-19T15:00:00.000Z',
    status: 'confirmado'
  }
}

function criarCenarioValido() {
  const dados = criarDadosFinanceirosValidos()

  dados.cartoesCredito = [{
    id: 2,
    nome: 'Cartao teste',
    status: 'ativo',
    limiteTotal: 5000,
    diaFechamento: 10,
    diaVencimento: 20
  }]

  dados.faturasCartao = [{
    id: 10,
    cartaoId: 2,
    competencia: '2026-11',
    fechamento: '2026-11-10',
    vencimento: '2026-11-20',
    status: 'fechada',
    parcelas: []
  }]

  dados.fechamentosFatura = [{
    id: 'fechamento-10',
    faturaId: 10,
    cartaoId: 2,
    competencia: '2026-11',
    fechamentoPrevisto: '2026-11-10',
    fechamentoEfetivoEm: '2026-11-10T12:00:00.000Z',
    valorConsolidadoCentavos: 20000,
    status: 'confirmado'
  }]

  dados.transacoes = [{
    id: 20,
    descricao: 'Pagamento de fatura',
    valor: 150,
    tipo: 'despesa',
    categoria: 'Outros',
    data: '2026-11-19',
    contaId: 1
  }]

  dados.pagamentosFatura = [criarPagamento()]
  dados.proximoId = 21

  return dados
}



const CHAVE = 'nexus-financas-dados-v1'

function cenarioSemPagamento() {
  const dados = criarCenarioValido()
  dados.transacoes = []
  dados.pagamentosFatura = []
  dados.proximoId = 21
  return dados
}

async function preparar(dados = cenarioSemPagamento(), comportamento = {}) {
  let texto = JSON.stringify(dados)

  const getItem = vi.fn(() => {
    if (comportamento.falharLeitura) {
      throw new Error('Falha simulada de leitura')
    }
    return texto
  })

  const setItem = vi.fn((chave, valor) => {
    if (comportamento.falharGravacao) {
      throw new Error('Falha simulada de gravacao')
    }

    if (comportamento.gravacaoInconsistente) {
      texto = JSON.stringify({
        ...JSON.parse(valor),
        proximoId: 999
      })
      return
    }

    texto = valor
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value).toBe(false)

  setItem.mockClear()

  return {
    financas,
    setItem,
    ler: () => JSON.parse(texto),
    textoInicial: JSON.stringify(dados)
  }
}

function solicitar(financas, operacaoId, valor) {
  return financas.pagarFaturaCartao({
    operacaoId,
    faturaId: 10,
    contaId: 1,
    valor
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Pagamento efetivo de fatura - F.3-C', () => {
  it('registra pagamento parcial e despesa bancaria juntos', async () => {
    const { financas, ler, setItem } = await preparar()

    const resultado = solicitar(financas, 'f3c-parcial', 80)
    const dados = ler()

    expect(resultado.sucesso).toBe(true)
    expect(dados.pagamentosFatura).toHaveLength(1)
    expect(dados.transacoes).toHaveLength(1)
    expect(dados.pagamentosFatura[0].valorPagoCentavos).toBe(8000)
    expect(dados.pagamentosFatura[0].transacaoId)
      .toBe(dados.transacoes[0].id)
    expect(dados.transacoes[0]).toMatchObject({
      tipo: 'despesa',
      contaId: 1,
      valor: 80
    })
    expect(dados.proximoId).toBe(22)
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('registra pagamento integral da fatura', async () => {
    const { financas, ler } = await preparar()

    const resultado = solicitar(financas, 'f3c-integral', 200)

    expect(resultado.sucesso).toBe(true)
    expect(ler().pagamentosFatura[0].valorPagoCentavos)
      .toBe(20000)
  })

  it('impede debito duplicado com o mesmo identificador', async () => {
    const { financas, ler, setItem } = await preparar()

    expect(solicitar(financas, 'f3c-unico', 50).sucesso)
      .toBe(true)

    const repeticao = solicitar(financas, 'f3c-unico', 50)

    expect(repeticao.sucesso).toBe(false)
    expect(repeticao.motivo).toBe('OPERACAO_JA_REGISTRADA')
    expect(ler().pagamentosFatura).toHaveLength(1)
    expect(ler().transacoes).toHaveLength(1)
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('recusa saldo insuficiente sem debito', async () => {
    const dados = cenarioSemPagamento()
    dados.contas[0].saldoInicial = 30

    const { financas, ler, setItem } = await preparar(dados)

    const resultado = solicitar(financas, 'f3c-saldo', 50)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('SALDO_INSUFICIENTE')
    expect(ler().transacoes).toHaveLength(0)
    expect(ler().pagamentosFatura).toHaveLength(0)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(ler().tentativasPagamentoFaturaRecusadas).toHaveLength(1)
  })

  it('recusa pagamento acima do pendente sem debito', async () => {
    const { financas, ler, setItem } = await preparar()

    const resultado = solicitar(financas, 'f3c-excesso', 201)

    expect(resultado.motivo).toBe('VALOR_SUPERIOR_AO_PENDENTE')
    expect(ler().transacoes).toHaveLength(0)
    expect(ler().pagamentosFatura).toHaveLength(0)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(ler().tentativasPagamentoFaturaRecusadas).toHaveLength(1)
  })

  it('preserva estado reativo quando gravacao falha', async () => {
    const { financas, setItem } = await preparar(
      cenarioSemPagamento(),
      { falharGravacao: true }
    )

    const resultado = solicitar(financas, 'f3c-falha', 50)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('PERSISTENCIA_NAO_CONFIRMADA')
    expect(financas.transacoes.value).toHaveLength(0)
    expect(financas.pagamentosFatura.value).toHaveLength(0)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('bloqueia novas operacoes quando confirmacao diverge', async () => {
    const { financas } = await preparar(
      cenarioSemPagamento(),
      { gravacaoInconsistente: true }
    )

    const resultado = solicitar(financas, 'f3c-incerto', 50)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('PAGAMENTO_REQUER_VERIFICACAO')
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.transacoes.value).toHaveLength(0)
    expect(financas.pagamentosFatura.value).toHaveLength(0)

    const repeticao = solicitar(financas, 'f3c-incerto', 50)

    expect(repeticao.motivo)
      .toBe('OPERACAO_FINANCEIRA_BLOQUEADA')
  })

  it('mantem vinculos recuperaveis apos pagamento', async () => {
    const { financas, ler } = await preparar()

    const resultado = solicitar(financas, 'f3c-recuperacao', 50)

    expect(resultado.sucesso).toBe(true)

    const persistidos = ler()
    const pagamento = persistidos.pagamentosFatura[0]
    const transacao = persistidos.transacoes.find(
      item => item.id === pagamento.transacaoId
    )

    expect(pagamento.status).toBe('confirmado')
    expect(transacao).toBeDefined()
    expect(transacao.valor * 100)
      .toBe(pagamento.valorPagoCentavos)
    expect(transacao.contaId).toBe(pagamento.contaId)
  })
})
