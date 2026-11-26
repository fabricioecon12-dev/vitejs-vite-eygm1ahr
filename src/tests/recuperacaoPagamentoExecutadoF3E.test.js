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



async function reiniciarComDadosPersistidos(dados) {
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

  return {
    financas,
    setItem,
    ler: () => JSON.parse(texto)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Recuperacao de pagamento executado - F.3-E', () => {
  it('recupera pagamento parcial e transacao vinculada', async () => {
    const { financas, ler } = await preparar()

    expect(solicitar(financas, 'f3e-parcial', 80).sucesso)
      .toBe(true)

    const persistidos = ler()
    const recuperado = await reiniciarComDadosPersistidos(persistidos)

    expect(recuperado.financas.armazenamentoProtegido.value)
      .toBe(false)
    expect(recuperado.financas.pagamentosFatura.value)
      .toHaveLength(1)
    expect(recuperado.financas.transacoes.value)
      .toHaveLength(1)

    const pagamento =
      recuperado.financas.pagamentosFatura.value[0]

    const transacao =
      recuperado.financas.transacoes.value.find(
        item => item.id === pagamento.transacaoId
      )

    expect(pagamento.valorPagoCentavos).toBe(8000)
    expect(transacao.valor).toBe(80)
    expect(transacao.contaId).toBe(pagamento.contaId)
  })

  it('recupera pagamento integral sem perder registros', async () => {
    const { financas, ler } = await preparar()

    expect(solicitar(financas, 'f3e-integral', 200).sucesso)
      .toBe(true)

    const recuperado = await reiniciarComDadosPersistidos(ler())

    expect(recuperado.financas.armazenamentoProtegido.value)
      .toBe(false)
    expect(recuperado.financas.pagamentosFatura.value[0]
      .valorPagoCentavos).toBe(20000)
    expect(recuperado.financas.transacoes.value[0].valor)
      .toBe(200)
  })

  it('preserva pagamentos parciais sucessivos', async () => {
    const { financas, ler } = await preparar()

    expect(solicitar(financas, 'f3e-primeiro', 80).sucesso)
      .toBe(true)
    expect(solicitar(financas, 'f3e-segundo', 70).sucesso)
      .toBe(true)

    const recuperado = await reiniciarComDadosPersistidos(ler())

    expect(recuperado.financas.armazenamentoProtegido.value)
      .toBe(false)
    expect(recuperado.financas.pagamentosFatura.value)
      .toHaveLength(2)
    expect(recuperado.financas.transacoes.value)
      .toHaveLength(2)

    const total = recuperado.financas.pagamentosFatura.value
      .reduce((soma, item) => soma + item.valorPagoCentavos, 0)

    expect(total).toBe(15000)
  })

  it('impede repeticao de pagamento apos reinicializacao', async () => {
    const { financas, ler } = await preparar()

    expect(solicitar(financas, 'f3e-unico', 50).sucesso)
      .toBe(true)

    const recuperado = await reiniciarComDadosPersistidos(ler())

    expect(recuperado.financas.armazenamentoProtegido.value)
      .toBe(false)

    const repeticao = solicitar(
      recuperado.financas,
      'f3e-unico',
      50
    )

    expect(repeticao.sucesso).toBe(false)
    expect(repeticao.motivo).toBe('OPERACAO_JA_REGISTRADA')
    expect(recuperado.ler().pagamentosFatura).toHaveLength(1)
    expect(recuperado.ler().transacoes).toHaveLength(1)
  })

  it('preserva historico de recusas apos reinicializacao', async () => {
    const dados = cenarioSemPagamento()
    dados.contas[0].saldoInicial = 30

    const { financas, ler } = await preparar(dados)

    const recusa = solicitar(financas, 'f3e-recusa', 50)

    expect(recusa.motivo).toBe('SALDO_INSUFICIENTE')

    const recuperado = await reiniciarComDadosPersistidos(ler())

    expect(recuperado.financas.armazenamentoProtegido.value)
      .toBe(false)
    expect(
      recuperado.financas.tentativasPagamentoFaturaRecusadas.value
    ).toHaveLength(1)
    expect(recuperado.financas.transacoes.value)
      .toHaveLength(0)
    expect(recuperado.financas.pagamentosFatura.value)
      .toHaveLength(0)
  })

  it('bloqueia recuperacao com pagamento duplicado', async () => {
    const { financas, ler } = await preparar()

    expect(solicitar(financas, 'f3e-duplicado', 50).sucesso)
      .toBe(true)

    const persistidos = ler()

    persistidos.pagamentosFatura.push({
      ...persistidos.pagamentosFatura[0],
      id: 'pagamento-duplicado'
    })

    const erroEsperado = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    const recuperado =
      await reiniciarComDadosPersistidos(persistidos)

    expect(recuperado.financas.armazenamentoProtegido.value)
      .toBe(true)

    erroEsperado.mockRestore()
  })
})