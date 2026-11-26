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



afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Auditoria automatica de pagamento - F.3-D', () => {
  it('registra recusa por saldo insuficiente sem debito', async () => {
    const dados = cenarioSemPagamento()
    dados.contas[0].saldoInicial = 30

    const { financas, ler } = await preparar(dados)

    const resultado = solicitar(financas, 'audit-saldo', 50)
    const persistidos = ler()

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('SALDO_INSUFICIENTE')
    expect(persistidos.transacoes).toHaveLength(0)
    expect(persistidos.pagamentosFatura).toHaveLength(0)
    expect(persistidos.tentativasPagamentoFaturaRecusadas)
      .toHaveLength(1)

    const tentativa =
      persistidos.tentativasPagamentoFaturaRecusadas[0]

    expect(tentativa.motivo).toBe('SALDO_INSUFICIENTE')
    expect(tentativa.resultado).toBe('recusado')
    expect(tentativa.valorSolicitadoCentavos).toBe(5000)
    expect(tentativa.faturaId).toBe(10)
    expect(tentativa.contaId).toBe(1)
  })

  it('registra recusa por fatura aberta sem debito', async () => {
    const dados = cenarioSemPagamento()
    dados.faturasCartao[0].status = 'aberta'
    dados.fechamentosFatura = []

    const { financas, ler } = await preparar(dados)

    const resultado = solicitar(financas, 'audit-aberta', 50)

    expect(resultado.sucesso).toBe(false)
    expect(ler().transacoes).toHaveLength(0)
    expect(ler().pagamentosFatura).toHaveLength(0)
    expect(ler().tentativasPagamentoFaturaRecusadas)
      .toHaveLength(1)
  })

  it('preserva tentativas distintas no historico', async () => {
    const dados = cenarioSemPagamento()
    dados.contas[0].saldoInicial = 30

    const { financas, ler } = await preparar(dados)

    solicitar(financas, 'audit-primeira', 50)
    solicitar(financas, 'audit-segunda', 60)

    const historico =
      ler().tentativasPagamentoFaturaRecusadas

    expect(historico).toHaveLength(2)
    expect(new Set(historico.map(item => item.id)).size)
      .toBe(2)
    expect(ler().transacoes).toHaveLength(0)
  })

  it('bloqueia operacao quando auditoria nao persiste', async () => {
    const dados = cenarioSemPagamento()
    dados.contas[0].saldoInicial = 30

    const { financas } = await preparar(
      dados,
      { falharGravacao: true }
    )

    const resultado = solicitar(financas, 'audit-falha', 50)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('AUDITORIA_NAO_CONFIRMADA')
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.transacoes.value).toHaveLength(0)
    expect(financas.pagamentosFatura.value).toHaveLength(0)
  })

  it('nao registra recusa em pagamento aprovado', async () => {
    const { financas, ler } = await preparar()

    const resultado = solicitar(financas, 'audit-aprovado', 50)

    expect(resultado.sucesso).toBe(true)
    expect(ler().tentativasPagamentoFaturaRecusadas ?? [])
      .toHaveLength(0)
  })

  it('nao cria nova recusa para operacao ja confirmada', async () => {
    const { financas, ler } = await preparar()

    expect(solicitar(financas, 'audit-unico', 50).sucesso)
      .toBe(true)

    const repeticao = solicitar(financas, 'audit-unico', 50)

    expect(repeticao.motivo).toBe('OPERACAO_JA_REGISTRADA')
    expect(ler().tentativasPagamentoFaturaRecusadas ?? [])
      .toHaveLength(0)
    expect(ler().transacoes).toHaveLength(1)
  })

  it('nao duplica auditoria com identificador repetido', async () => {
    const dados = cenarioSemPagamento()
    dados.contas[0].saldoInicial = 30

    const { financas, ler } = await preparar(dados)

    solicitar(financas, 'audit-repetida', 50)
    const repeticao = solicitar(financas, 'audit-repetida', 50)

    expect(repeticao.sucesso).toBe(false)
    expect(ler().tentativasPagamentoFaturaRecusadas)
      .toHaveLength(1)
    expect(ler().transacoes).toHaveLength(0)
  })
})