import { describe, it, expect, vi, afterEach } from 'vitest'

function criarDadosFinanceiros() {
  return {
    transacoes: [],
    limites: {},
    saldoInicial: 1000,
    proximoId: 1,
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
    obrigacoesComplementaresFatura: [{
      id: 'obrigacao-10',
      operacaoId: 'criacao-obrigacao-10',
      faturaId: 10,
      cartaoId: 2,
      valorOriginalCentavos: 15000,
      origem: 'conciliacao',
      natureza: 'encargo',
      competencia: '2026-11',
      dataHora: '2026-11-19T12:00:00.000Z',
      status: 'confirmada'
    }],
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
    setItem
  }
}

function solicitar(financas, operacaoId, valor) {
  return financas.pagarObrigacaoComplementarFatura({
    operacaoId,
    obrigacaoId: 'obrigacao-10',
    contaId: 1,
    valor
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('AF.11-J.25-E.6 - Pagamento de obrigacao complementar', () => {
  it('T01 - confirma pagamento integral', async () => {
    const { financas, ler } = await preparar()

    const resultado = solicitar(financas, 'pagamento-integral', 150)

    expect(resultado.sucesso).toBe(true)

    const dados = ler()

    expect(dados.pagamentosObrigacoesComplementares).toHaveLength(1)
    expect(dados.pagamentosObrigacoesComplementares[0].valorPagoCentavos)
      .toBe(15000)

    expect(dados.transacoes).toHaveLength(1)
    expect(dados.transacoes[0].valor).toBe(150)

    const resumo =
      financas.consultarSituacaoFinanceiraObrigacaoComplementar(
        'obrigacao-10'
      )

    expect(resumo.saldoRestanteCentavos).toBe(0)
    expect(resumo.situacaoFinanceira).toBe('quitada')
  })

  it('T02 - confirma pagamento parcial', async () => {
    const { financas, ler } = await preparar()

    const resultado = solicitar(financas, 'pagamento-parcial', 60)

    expect(resultado.sucesso).toBe(true)

    const resumo =
      financas.consultarSituacaoFinanceiraObrigacaoComplementar(
        'obrigacao-10'
      )

    expect(resumo.totalPagoCentavos).toBe(6000)
    expect(resumo.saldoRestanteCentavos).toBe(9000)
    expect(resumo.situacaoFinanceira).toBe('parcialmente_paga')

    expect(ler().transacoes[0].valor).toBe(60)
  })

  it('T03 - recusa pagamento com saldo insuficiente', async () => {
    const dados = criarDadosFinanceiros()
    dados.contas[0].saldoInicial = 50
    dados.saldoInicial = 50

    const { financas, ler, setItem } = await preparar(dados)

    const resultado = solicitar(financas, 'saldo-insuficiente', 150)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('SALDO_INSUFICIENTE')

    expect(ler().transacoes).toHaveLength(0)
    expect(ler().pagamentosObrigacoesComplementares).toHaveLength(0)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('T04 - recusa valor superior ao pendente', async () => {
    const { financas, ler, setItem } = await preparar()

    const resultado = solicitar(financas, 'valor-excedente', 151)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('VALOR_SUPERIOR_AO_PENDENTE')

    expect(ler().transacoes).toHaveLength(0)
    expect(ler().pagamentosObrigacoesComplementares).toHaveLength(0)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('T05 - impede duplicidade de operacao', async () => {
    const { financas, ler } = await preparar()

    const primeiro = solicitar(financas, 'operacao-unica', 60)
    expect(primeiro.sucesso).toBe(true)

    const segundo = solicitar(financas, 'operacao-unica', 60)

    expect(segundo.sucesso).toBe(false)
    expect(segundo.motivo).toBe('OPERACAO_JA_REGISTRADA')

    expect(ler().transacoes).toHaveLength(1)
    expect(ler().pagamentosObrigacoesComplementares).toHaveLength(1)
  })

  it('T06 - preserva fatura, fechamento e obrigacao originais', async () => {
    const dadosOriginais = criarDadosFinanceiros()

    const faturaOriginal = structuredClone(dadosOriginais.faturasCartao)
    const fechamentoOriginal = structuredClone(dadosOriginais.fechamentosFatura)
    const obrigacaoOriginal = structuredClone(
      dadosOriginais.obrigacoesComplementaresFatura
    )

    const { financas, ler } = await preparar(dadosOriginais)

    const resultado = solicitar(financas, 'preservacao-historica', 60)

    expect(resultado.sucesso).toBe(true)

    const persistidos = ler()

    expect(persistidos.faturasCartao).toEqual(faturaOriginal)
    expect(persistidos.fechamentosFatura).toEqual(fechamentoOriginal)
    expect(persistidos.obrigacoesComplementaresFatura)
      .toEqual(obrigacaoOriginal)

    expect(persistidos.pagamentosObrigacoesComplementares)
      .toHaveLength(1)
  })
})