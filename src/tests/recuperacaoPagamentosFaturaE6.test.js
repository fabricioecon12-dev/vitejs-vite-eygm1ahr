import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

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

function criarTentativaAntecipadaRecusada(
  operacaoId = 'operacao-001',
  incluirOperacaoId = true
) {
  const tentativa = {
    id: 'tentativa-antecipacao-tentativa-001',
    tentativaId: 'tentativa-001',
    dataHora: '2026-11-19T14:00:00.000Z',
    dadosOriginais: {
      faturaId: 10,
      cartaoId: 2,
      contaId: 1,
      valorSolicitado: 150
    },
    faturaId: 10,
    cartaoId: 2,
    contaId: 1,
    valorSolicitadoCentavos: 15000,
    saldoDisponivelCentavos: 10000,
    motivo: 'SALDO_INSUFICIENTE',
    resultado: 'recusado',
    modalidade: 'antecipado'
  }

  if (incluirOperacaoId) {
    tentativa.operacaoId = operacaoId
  }

  return tentativa
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

async function recuperar(dados) {
  let texto = JSON.stringify(dados)

  vi.stubGlobal('localStorage', {
    getItem: vi.fn(chave => chave === CHAVE ? texto : null),
    setItem: vi.fn((chave, valor) => {
      if (chave === CHAVE) texto = valor
    })
  })

  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  return {
    financas,
    ler: () => JSON.parse(texto)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Recuperacao de pagamentos de fatura - E.6', () => {
  it('recupera pagamento valido', async () => {
    const { financas } = await recuperar(criarCenarioValido())

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.pagamentosFatura.value).toHaveLength(1)
    expect(financas.pagamentosFatura.value[0].operacaoId)
      .toBe('operacao-001')
  })

  it('bloqueia pagamento de fatura aberta', async () => {
    const dados = criarCenarioValido()
    dados.faturasCartao[0].status = 'aberta'

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('bloqueia pagamento sem fechamento confirmado', async () => {
    const dados = criarCenarioValido()
    dados.fechamentosFatura = []

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('bloqueia transacao bancaria incompatível', async () => {
    const dados = criarCenarioValido()
    dados.transacoes[0].valor = 100

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('bloqueia operacao de pagamento duplicada', async () => {
    const dados = criarCenarioValido()

    dados.pagamentosFatura.push(
      criarPagamento('pagamento-002', 'operacao-001')
    )

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('bloqueia operacao antecipada simultaneamente recusada e confirmada', async () => {
    const dados = criarCenarioValido()

    dados.tentativasPagamentoFaturaRecusadas.push(
      criarTentativaAntecipadaRecusada('operacao-001')
    )

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('permite recuperacao quando as operacoes possuem identificadores diferentes', async () => {
    const dados = criarCenarioValido()

    dados.tentativasPagamentoFaturaRecusadas.push(
      criarTentativaAntecipadaRecusada('operacao-002')
    )

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.pagamentosFatura.value).toHaveLength(1)
    expect(financas.tentativasPagamentoFaturaRecusadas.value).toHaveLength(1)
  })

  it('preserva compatibilidade com tentativa historica sem operacaoId', async () => {
    const dados = criarCenarioValido()

    dados.tentativasPagamentoFaturaRecusadas.push(
      criarTentativaAntecipadaRecusada(undefined, false)
    )

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.pagamentosFatura.value).toHaveLength(1)
    expect(financas.tentativasPagamentoFaturaRecusadas.value).toHaveLength(1)
  })

  it('bloqueia pagamento acima do valor consolidado', async () => {
    const dados = criarCenarioValido()
    dados.fechamentosFatura[0].valorConsolidadoCentavos = 10000

    const { financas } = await recuperar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })
})