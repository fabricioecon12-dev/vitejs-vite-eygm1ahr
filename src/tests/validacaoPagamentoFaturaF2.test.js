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



async function preparar(dados = criarCenarioValido()) {
  let texto = JSON.stringify(dados)
  const original = texto

  const getItem = vi.fn(chave =>
    chave === CHAVE ? texto : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (chave === CHAVE) texto = valor
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value).toBe(false)

  return {
    financas,
    setItem,
    original,
    ler: () => texto
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Validacao previa de pagamentos de fatura - F.2', () => {
  it('autoriza pagamento parcial com saldo suficiente', async () => {
    const { financas } = await preparar()

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 25
    })

    expect(resultado).toMatchObject({
      valido: true,
      motivo: null,
      valorSolicitadoCentavos: 2500,
      valorPendenteCentavos: 5000
    })
  })

  it('autoriza pagamento integral do saldo pendente', async () => {
    const { financas } = await preparar()

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 50
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.valorPendenteCentavos).toBe(5000)
  })

  it('recusa pagamento com saldo insuficiente', async () => {
    const dados = criarCenarioValido()
    dados.contas[0].saldoInicial = 100

    const { financas } = await preparar(dados)

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 50
    })

    expect(resultado).toMatchObject({
      valido: false,
      motivo: 'SALDO_INSUFICIENTE',
      valorSolicitadoCentavos: 5000,
      saldoDisponivelCentavos: -5000
    })
  })

  it('recusa pagamento por conta inativa', async () => {
    const dados = criarCenarioValido()
    dados.contas[0].ativa = false

    const { financas } = await preparar(dados)

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 50
    })

    expect(resultado.motivo).toBe('CONTA_INATIVA')
  })

  it('recusa pagamento de fatura aberta', async () => {
    const { financas } = await preparar()
    financas.faturasCartao.value[0].status = 'aberta'

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 50
    })

    expect(resultado.motivo).toBe('FATURA_NAO_FECHADA')
  })

  it('recusa fechamento inconsistente', async () => {
    const { financas } = await preparar()
    financas.fechamentosFatura.value[0].cartaoId = 999

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 50
    })

    expect(resultado.motivo).toBe('FECHAMENTO_NAO_CONFIRMADO')
  })

  it('recusa valor superior ao saldo pendente', async () => {
    const { financas } = await preparar()

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 60
    })

    expect(resultado.motivo).toBe('VALOR_SUPERIOR_AO_PENDENTE')
  })

  it('recusa pagamento de fatura quitada', async () => {
    const { financas } = await preparar()
    financas.fechamentosFatura.value[0]
      .valorConsolidadoCentavos = 15000

    const resultado = financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 1
    })

    expect(resultado.motivo).toBe('FATURA_QUITADA')
  })

  it('nao altera dados financeiros nem persistencia', async () => {
    const { financas, setItem, ler } = await preparar()

    const antes = {
      transacoes: JSON.stringify(financas.transacoes.value),
      pagamentos: JSON.stringify(financas.pagamentosFatura.value),
      contas: JSON.stringify(financas.contas.value),
      faturas: JSON.stringify(financas.faturasCartao.value),
      fechamentos: JSON.stringify(financas.fechamentosFatura.value),
      armazenamento: ler()
    }

    setItem.mockClear()

    financas.validarSolicitacaoPagamentoFatura({
      faturaId: 10,
      contaId: 1,
      valor: 25
    })

    expect(JSON.stringify(financas.transacoes.value))
      .toBe(antes.transacoes)
    expect(JSON.stringify(financas.pagamentosFatura.value))
      .toBe(antes.pagamentos)
    expect(JSON.stringify(financas.contas.value))
      .toBe(antes.contas)
    expect(JSON.stringify(financas.faturasCartao.value))
      .toBe(antes.faturas)
    expect(JSON.stringify(financas.fechamentosFatura.value))
      .toBe(antes.fechamentos)
    expect(ler()).toBe(antes.armazenamento)
    expect(setItem).not.toHaveBeenCalled()
  })
})