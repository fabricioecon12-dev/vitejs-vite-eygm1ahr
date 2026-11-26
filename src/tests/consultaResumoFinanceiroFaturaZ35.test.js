import { describe, it, expect, vi, afterEach } from 'vitest'

function criarDadosFinanceiros() {
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
    contas: [{
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
    }],
    cartoesCredito: [{
      id: 2,
      nome: 'Cartao teste',
      status: 'ativo',
      limiteTotal: 5000,
      diaFechamento: 10,
      diaVencimento: 20
    }],
    comprasCartao: [],
    faturasCartao: [{
      id: 10,
      cartaoId: 2,
      competencia: '2026-11',
      fechamento: '2026-11-10',
      vencimento: '2026-11-20',
      status: 'fechada',
      parcelas: []
    }],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [{
      id: 'fechamento-10',
      faturaId: 10,
      cartaoId: 2,
      competencia: '2026-11',
      fechamentoPrevisto: '2026-11-10',
      fechamentoEfetivoEm: '2026-11-10T12:00:00.000Z',
      valorConsolidadoCentavos: 20000,
      status: 'confirmado'
    }],
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: [],
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
    revisaoAdministrativaTransferencias: 0
  }
}

function criarTransacao(id, valor) {
  return {
    id,
    descricao: 'Pagamento de fatura',
    valor,
    tipo: 'despesa',
    categoria: 'Outros',
    data: '2026-11-19',
    contaId: 1
  }
}

function criarPagamento(id, operacaoId, transacaoId, valorCentavos, antecipado = false) {
  return {
    id,
    operacaoId,
    faturaId: 10,
    cartaoId: 2,
    contaId: 1,
    transacaoId,
    valorPagoCentavos: valorCentavos,
    dataHora: '2026-11-19T15:00:00.000Z',
    status: 'confirmado',
    ...(antecipado ? { tipo: 'antecipado' } : {})
  }
}

async function preparar(dados = criarDadosFinanceiros()) {
  let texto = JSON.stringify(dados)

  const getItem = vi.fn(() => texto)
  const setItem = vi.fn((chave, valor) => {
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
    ler: () => JSON.parse(texto),
    alterarPersistencia: valor => {
      texto = JSON.stringify(valor)
    },
    setItem
  }
}

function esperarCampo(resumo, nome, valor) {
  expect(resumo.campos[nome]).toEqual({
    valido: true,
    valorCentavos: valor,
    motivo: null
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Z.35 - Consulta do resumo financeiro da fatura', () => {

  it('T01 - Consulta fatura fechada sem pagamentos', async () => {
    const { financas } = await preparar()

    const resumo = financas.consultarResumoFinanceiroFatura(10)

    expect(resumo.valido).toBe(true)

    esperarCampo(resumo, 'valorOriginal', 20000)
    esperarCampo(resumo, 'valorAntecipado', 0)
    esperarCampo(resumo, 'valorPagoConvencional', 0)
    esperarCampo(resumo, 'valorPendente', 20000)
  })

  it('T02 - Consulta fatura com antecipacao e pagamento convencional', async () => {
    const dados = criarDadosFinanceiros()

    dados.transacoes = [
      criarTransacao(20, 30),
      criarTransacao(21, 70)
    ]

    dados.pagamentosAntecipadosFatura = [
      criarPagamento(
        'antecipado-001',
        'operacao-antecipada-001',
        20,
        3000,
        true
      )
    ]

    dados.pagamentosFatura = [
      criarPagamento(
        'convencional-001',
        'operacao-convencional-001',
        21,
        7000
      )
    ]

    dados.proximoId = 22

    const { financas } = await preparar(dados)

    const resumo = financas.consultarResumoFinanceiroFatura(10)

    expect(resumo.valido).toBe(true)

    esperarCampo(resumo, 'valorOriginal', 20000)
    esperarCampo(resumo, 'valorAntecipado', 3000)
    esperarCampo(resumo, 'valorPagoConvencional', 7000)
    esperarCampo(resumo, 'valorPendente', 10000)
  })

  it('T03 - Consulta fatura aberta sem pagamentos e sem fechamento', async () => {
    const dados = criarDadosFinanceiros()

    dados.faturasCartao[0].competencia = '2026-12'
    dados.faturasCartao[0].fechamento = '2026-12-10'
    dados.faturasCartao[0].vencimento = '2026-12-20'
    dados.faturasCartao[0].status = 'aberta'
    dados.fechamentosFatura = []

    const { financas } = await preparar(dados)

    const resumo = financas.consultarResumoFinanceiroFatura(10)

    expect(resumo.valido).toBe(true)

    esperarCampo(resumo, 'valorOriginal', 0)
    esperarCampo(resumo, 'valorAntecipado', 0)
    esperarCampo(resumo, 'valorPagoConvencional', 0)
    esperarCampo(resumo, 'valorPendente', 0)
  })

  it('T04 - Recusa identificador de fatura invalido', async () => {
    const { financas } = await preparar()

    const resumo = financas.consultarResumoFinanceiroFatura(-1)

    expect(resumo.valido).toBe(false)

    for (const campo of Object.values(resumo.campos)) {
      expect(campo.valido).toBe(false)
      expect(campo.valorCentavos).toBeNull()
      expect(campo.motivo).toBe('FATURA_ID_INVALIDO')
    }
  })

  it('T05 - Bloqueia consulta diante de divergencia na persistencia', async () => {
    const { financas, ler, alterarPersistencia } = await preparar()

    const persistidos = ler()

    persistidos.transacoes.push(
      criarTransacao(999, 10)
    )

    alterarPersistencia(persistidos)

    const resumo = financas.consultarResumoFinanceiroFatura(10)

    expect(resumo.valido).toBe(false)

    for (const campo of Object.values(resumo.campos)) {
      expect(campo.valido).toBe(false)
      expect(campo.valorCentavos).toBeNull()
      expect(campo.motivo).toBe('DIVERGENCIA_PERSISTENCIA')
    }
  })

})
