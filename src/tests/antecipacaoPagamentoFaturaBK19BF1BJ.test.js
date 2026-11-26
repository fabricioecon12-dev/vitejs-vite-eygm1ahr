import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarCenario(saldoInicial = 1000) {
  const parcela = {
    compraId: 1,
    numero: 1,
    total: 1,
    valor: 200,
    competencia: '2026-11'
  }

  return {
    transacoes: [],
    limites: {},
    saldoInicial,
    proximoId: 20,
    categoriasDespesa: [
      'Alimentação', 'Moradia', 'Transporte',
      'Saúde', 'Lazer', 'Outros'
    ],
    categoriasReceita: [
      'Salário', 'Serviços', 'Investimentos',
      'Vendas', 'Freelance', 'Aluguéis',
      'Comissões', 'Bonificações', 'Aposentadoria',
      'Pensão', 'Reembolsos', 'Presentes e doações',
      'Restituições', 'Outros'
    ],
    versaoDados: 2,
    contas: [{
      id: 1,
      nome: 'Conta principal',
      instituicao: 'Banco A',
      tipo: 'corrente',
      agencia: '',
      numero: '',
      saldoInicial,
      ativa: true,
      principal: true,
      dataCriacao: '2026-11-01'
    }],
    cartoesCredito: [{
      id: 1,
      nome: 'Cartao teste',
      status: 'ativo',
      limiteTotal: 5000,
      diaFechamento: 20,
      diaVencimento: 28
    }],
    comprasCartao: [{
      id: 1,
      cartaoId: 1,
      descricao: 'Compra de teste',
      valor: 200,
      data: '2026-11-10',
      quantidadeParcelas: 1,
      parcelas: [{ ...parcela }]
    }],
    faturasCartao: [{
      id: 10,
      cartaoId: 1,
      competencia: '2026-11',
      fechamento: '2026-11-20',
      vencimento: '2026-11-28',
      status: 'aberta',
      parcelas: [{ ...parcela }]
    }],
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

async function preparar(saldoInicial = 1000) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-18T12:00:00.000Z'))

  const dados = criarCenario(saldoInicial)
  let texto = JSON.stringify(dados)

  const getItem = vi.fn(chave => (
    chave === CHAVE ? texto : null
  ))

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
  expect(typeof financas.anteciparPagamentoFaturaCartao).toBe('function')
  expect(financas.faturasCartao.value[0].status).toBe('aberta')

  setItem.mockClear()

  return {
    financas,
    setItem,
    ler: () => JSON.parse(texto),
    dadosOriginais: dados
  }
}

function solicitar(financas, operacaoId, tentativaId, valor) {
  return financas.anteciparPagamentoFaturaCartao({
    operacaoId,
    tentativaId,
    tentativaDataHora: '2026-11-18T12:00:00.000Z',
    faturaId: 10,
    contaId: 1,
    valor
  })
}

function verificarPersistencia(cenario, valorCentavos) {
  const { financas, ler, dadosOriginais } = cenario
  const persistidos = ler()

  expect(persistidos.pagamentosAntecipadosFatura).toHaveLength(1)
  expect(persistidos.transacoes).toHaveLength(1)
  expect(persistidos.pagamentosFatura).toHaveLength(0)
  expect(persistidos.proximoId).toBe(21)

  const pagamento = persistidos.pagamentosAntecipadosFatura[0]
  const transacao = persistidos.transacoes[0]

  expect(pagamento.tipo).toBe('antecipado')
  expect(pagamento.status).toBe('confirmado')
  expect(pagamento.faturaId).toBe(10)
  expect(pagamento.cartaoId).toBe(1)
  expect(pagamento.contaId).toBe(1)
  expect(pagamento.transacaoId).toBe(transacao.id)
  expect(pagamento.valorPagoCentavos).toBe(valorCentavos)

  expect(transacao.id).toBe(20)
  expect(transacao.tipo).toBe('despesa')
  expect(transacao.contaId).toBe(1)
  expect(Math.round(transacao.valor * 100)).toBe(valorCentavos)

  expect(financas.pagamentosAntecipadosFatura.value)
    .toEqual(persistidos.pagamentosAntecipadosFatura)

  expect(financas.transacoes.value)
    .toEqual(persistidos.transacoes)

  expect(persistidos.comprasCartao)
    .toEqual(dadosOriginais.comprasCartao)

  expect(persistidos.faturasCartao)
    .toEqual(dadosOriginais.faturasCartao)

  expect(persistidos.faturasCartao[0].status).toBe('aberta')

  return { pagamento, transacao }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('BK.19-BF.1-BJ - antecipacao de fatura', () => {
  it('T01 - confirma antecipacao integral e debito bancario', async () => {
    const cenario = await preparar()

    const validacaoInicial =
      cenario.financas.validarSolicitacaoPagamentoAntecipadoFatura({
        faturaId: 10,
        contaId: 1,
        valor: 200
      })

    expect(validacaoInicial.valido).toBe(true)
    expect(validacaoInicial.valorOriginalCentavos).toBe(20000)
    expect(validacaoInicial.valorPendenteCentavos).toBe(20000)

    const resultado = solicitar(
      cenario.financas,
      'operacao-bj-t01',
      'tentativa-bj-t01',
      200
    )

    expect(resultado.sucesso).toBe(true)
    expect(resultado.motivo).toBeNull()

    const { pagamento } = verificarPersistencia(cenario, 20000)

    expect(resultado.pagamento).toEqual(pagamento)
    expect(pagamento.operacaoId).toBe('operacao-bj-t01')

    const validacaoFinal =
      cenario.financas.validarSolicitacaoPagamentoAntecipadoFatura({
        faturaId: 10,
        contaId: 1,
        valor: 1
      })

    expect(validacaoFinal.valido).toBe(false)
    expect(validacaoFinal.motivo).toBe('FATURA_SEM_SALDO_ANTECIPAVEL')
    expect(validacaoFinal.valorAntecipadoCentavos).toBe(20000)
    expect(validacaoFinal.valorPendenteCentavos).toBe(0)

    expect(cenario.setItem).toHaveBeenCalled()
  })

  it('T02 - confirma antecipacao parcial e saldo remanescente', async () => {
    const cenario = await preparar()

    const resultado = solicitar(
      cenario.financas,
      'operacao-bj-t02',
      'tentativa-bj-t02',
      80
    )

    expect(resultado.sucesso).toBe(true)
    expect(resultado.motivo).toBeNull()

    const { pagamento } = verificarPersistencia(cenario, 8000)

    expect(resultado.pagamento).toEqual(pagamento)
    expect(pagamento.operacaoId).toBe('operacao-bj-t02')

    const validacaoFinal =
      cenario.financas.validarSolicitacaoPagamentoAntecipadoFatura({
        faturaId: 10,
        contaId: 1,
        valor: 120
      })

    expect(validacaoFinal.valido).toBe(true)
    expect(validacaoFinal.valorOriginalCentavos).toBe(20000)
    expect(validacaoFinal.valorAntecipadoCentavos).toBe(8000)
    expect(validacaoFinal.valorPendenteCentavos).toBe(12000)

    expect(cenario.setItem).toHaveBeenCalled()
  })
})
describe('BK.19-BF.1-BK - bloqueios de antecipacao', () => {
  it('T03 - bloqueia valor superior ao saldo pendente', async () => {
    const cenario = await preparar()
    const antes = cenario.ler()

    const resultado = solicitar(
      cenario.financas,
      'operacao-bk-t03',
      'tentativa-bk-t03',
      250
    )

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('VALOR_SUPERIOR_AO_PENDENTE')
    expect(resultado.pagamento).toBeNull()

    const depois = cenario.ler()

    expect(depois.pagamentosAntecipadosFatura)
      .toEqual(antes.pagamentosAntecipadosFatura)

    expect(depois.transacoes).toEqual(antes.transacoes)
    expect(depois.proximoId).toBe(antes.proximoId)
    expect(depois.comprasCartao).toEqual(antes.comprasCartao)
    expect(depois.faturasCartao).toEqual(antes.faturasCartao)

    expect(cenario.financas.pagamentosAntecipadosFatura.value)
      .toHaveLength(0)

    expect(cenario.financas.transacoes.value).toHaveLength(0)

    expect(depois.tentativasPagamentoFaturaRecusadas.length)
      .toBeGreaterThanOrEqual(1)
  })

  it('T04 - bloqueia saldo insuficiente', async () => {
    const cenario = await preparar(50)
    const antes = cenario.ler()

    expect(antes.contas[0].saldoInicial).toBe(50)
    expect(antes.saldoInicial).toBe(50)

    const resultado = solicitar(
      cenario.financas,
      'operacao-bk-t04',
      'tentativa-bk-t04',
      80
    )

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('SALDO_INSUFICIENTE')
    expect(resultado.pagamento).toBeNull()

    const depois = cenario.ler()

    expect(depois.pagamentosAntecipadosFatura)
      .toEqual(antes.pagamentosAntecipadosFatura)

    expect(depois.transacoes).toEqual(antes.transacoes)
    expect(depois.proximoId).toBe(antes.proximoId)
    expect(depois.contas).toEqual(antes.contas)
    expect(depois.comprasCartao).toEqual(antes.comprasCartao)
    expect(depois.faturasCartao).toEqual(antes.faturasCartao)

    expect(cenario.financas.pagamentosAntecipadosFatura.value)
      .toHaveLength(0)

    expect(cenario.financas.transacoes.value).toHaveLength(0)

    expect(depois.tentativasPagamentoFaturaRecusadas.length)
      .toBeGreaterThanOrEqual(1)
  })
})

describe('BK.19-BF.1-BL - idempotencia e conflitos', () => {
  it('T05 - repete antecipacao confirmada sem duplicidade', async () => {
    const cenario = await preparar()

    const primeira = solicitar(
      cenario.financas,
      'operacao-bl-t05',
      'tentativa-bl-t05',
      80
    )

    expect(primeira.sucesso).toBe(true)
    expect(primeira.motivo).toBeNull()

    const antesRepeticao = cenario.ler()
    const chamadasAntes = cenario.setItem.mock.calls.length

    expect(antesRepeticao.pagamentosAntecipadosFatura)
      .toHaveLength(1)

    expect(antesRepeticao.transacoes).toHaveLength(1)
    expect(antesRepeticao.proximoId).toBe(21)

    const repeticao = solicitar(
      cenario.financas,
      'operacao-bl-t05',
      'tentativa-bl-t05',
      80
    )

    expect(repeticao.sucesso).toBe(true)
    expect(repeticao.motivo).toBeNull()
    expect(repeticao.pagamento).toEqual(primeira.pagamento)

    const depoisRepeticao = cenario.ler()

    expect(depoisRepeticao).toEqual(antesRepeticao)

    expect(cenario.setItem.mock.calls.length)
      .toBe(chamadasAntes)

    expect(depoisRepeticao.pagamentosAntecipadosFatura)
      .toHaveLength(1)

    expect(depoisRepeticao.transacoes).toHaveLength(1)
    expect(depoisRepeticao.proximoId).toBe(21)

    expect(cenario.financas.pagamentosAntecipadosFatura.value)
      .toEqual(depoisRepeticao.pagamentosAntecipadosFatura)

    expect(cenario.financas.transacoes.value)
      .toEqual(depoisRepeticao.transacoes)

    expect(cenario.financas.armazenamentoProtegido.value)
      .toBe(false)
  })

  it('T06 - recusa operacaoId com valor conflitante', async () => {
    const cenario = await preparar()

    const primeira = solicitar(
      cenario.financas,
      'operacao-bl-t06',
      'tentativa-bl-t06-original',
      80
    )

    expect(primeira.sucesso).toBe(true)
    expect(primeira.motivo).toBeNull()

    const antesConflito = cenario.ler()
    const chamadasAntes = cenario.setItem.mock.calls.length

    expect(antesConflito.pagamentosAntecipadosFatura)
      .toHaveLength(1)

    expect(antesConflito.transacoes).toHaveLength(1)
    expect(antesConflito.proximoId).toBe(21)

    const conflito = solicitar(
      cenario.financas,
      'operacao-bl-t06',
      'tentativa-bl-t06-conflito',
      100
    )

    expect(conflito.sucesso).toBe(false)
    expect(conflito.motivo).toBe('OPERACAO_ID_CONFLITANTE')
    expect(conflito.pagamento).toBeNull()

    const depoisConflito = cenario.ler()

    expect(depoisConflito).toEqual(antesConflito)

    expect(cenario.setItem.mock.calls.length)
      .toBe(chamadasAntes)

    expect(depoisConflito.pagamentosAntecipadosFatura)
      .toHaveLength(1)

    expect(depoisConflito.transacoes).toHaveLength(1)
    expect(depoisConflito.proximoId).toBe(21)

    expect(depoisConflito.pagamentosAntecipadosFatura[0])
      .toEqual(primeira.pagamento)

    expect(cenario.financas.pagamentosAntecipadosFatura.value)
      .toEqual(depoisConflito.pagamentosAntecipadosFatura)

    expect(cenario.financas.transacoes.value)
      .toEqual(depoisConflito.transacoes)

    expect(cenario.financas.armazenamentoProtegido.value)
      .toBe(false)
  })
})

describe('BK.19-BF.1-BM - falhas de persistencia', () => {
  it('T07 - bloqueia antecipacao quando a gravacao falha', async () => {
    const cenario = await preparar()

    const antes = cenario.ler()

    expect(antes.pagamentosAntecipadosFatura).toHaveLength(0)
    expect(antes.transacoes).toHaveLength(0)
    expect(antes.proximoId).toBe(20)

    const erroSimulado = new Error(
      'Falha simulada de persistencia T07'
    )

    cenario.setItem.mockImplementation(() => {
      throw erroSimulado
    })

    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    let resultado

    try {
      resultado = solicitar(
        cenario.financas,
        'operacao-bm-t07',
        'tentativa-bm-t07',
        80
      )
    } finally {
      consoleError.mockRestore()
    }

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo).toBe('PERSISTENCIA_NAO_CONFIRMADA')
    expect(resultado.pagamento).toBeNull()

    const depois = cenario.ler()

    expect(depois).toEqual(antes)

    expect(depois.pagamentosAntecipadosFatura).toHaveLength(0)
    expect(depois.transacoes).toHaveLength(0)
    expect(depois.proximoId).toBe(20)
    expect(depois.contas).toEqual(antes.contas)
    expect(depois.comprasCartao).toEqual(antes.comprasCartao)
    expect(depois.faturasCartao).toEqual(antes.faturasCartao)

    expect(cenario.financas.pagamentosAntecipadosFatura.value)
      .toHaveLength(0)

    expect(cenario.financas.transacoes.value)
      .toHaveLength(0)

    expect(cenario.financas.armazenamentoProtegido.value)
      .toBe(true)

    expect(cenario.setItem).toHaveBeenCalled()

    const segundaTentativa = solicitar(
      cenario.financas,
      'operacao-bm-t07-segunda',
      'tentativa-bm-t07-segunda',
      50
    )

    expect(segundaTentativa.sucesso).toBe(false)
    expect(segundaTentativa.motivo)
      .toBe('OPERACAO_FINANCEIRA_BLOQUEADA')

    expect(cenario.ler()).toEqual(antes)
  })
})

describe('BK.19-BF.1-BM.6 - falha na memoria', () => {
  it('T08 - protege persistencia confirmada apos falha de memoria', async () => {
    const cenario = await preparar()
    const { financas, setItem, ler } = cenario

    const antes = ler()

    const referencia = financas.transacoes
    const prototipo = Object.getPrototypeOf(referencia)

    const descritor = Object.getOwnPropertyDescriptor(
      prototipo,
      'value'
    )

    expect(descritor).toBeDefined()
    expect(typeof descritor.get).toBe('function')
    expect(typeof descritor.set).toBe('function')
    expect(Object.isExtensible(referencia)).toBe(true)

    let falhaSimulada = false
    let resultado

    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      Object.defineProperty(referencia, 'value', {
        configurable: true,
        enumerable: descritor.enumerable,

        get() {
          return descritor.get.call(referencia)
        },

        set(novoValor) {
          if (!falhaSimulada) {
            falhaSimulada = true

            throw new Error(
              'Falha simulada de atualizacao da memoria T08'
            )
          }

          return descritor.set.call(referencia, novoValor)
        }
      })

      resultado = solicitar(
        financas,
        'operacao-bm-t08',
        'tentativa-bm-t08',
        80
      )

    } finally {
      delete referencia.value
      consoleError.mockRestore()
    }

    expect(falhaSimulada).toBe(true)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo)
      .toBe('ANTECIPACAO_REQUER_VERIFICACAO')

    expect(resultado.pagamento).toBeNull()

    expect(financas.armazenamentoProtegido.value).toBe(true)

    const depois = ler()

    expect(depois).not.toEqual(antes)

    expect(depois.pagamentosAntecipadosFatura)
      .toHaveLength(1)

    expect(depois.transacoes).toHaveLength(1)

    expect(depois.proximoId).toBe(21)

    expect(depois.contas).toEqual(antes.contas)
    expect(depois.comprasCartao).toEqual(antes.comprasCartao)
    expect(depois.faturasCartao).toEqual(antes.faturasCartao)

    expect(setItem).toHaveBeenCalledTimes(1)

    expect(
      Object.prototype.hasOwnProperty.call(referencia, 'value')
    ).toBe(false)

    const segundaTentativa = solicitar(
      financas,
      'operacao-bm-t08-segunda',
      'tentativa-bm-t08-segunda',
      50
    )

    expect(segundaTentativa.sucesso).toBe(false)
    expect(segundaTentativa.motivo)
      .toBe('OPERACAO_FINANCEIRA_BLOQUEADA')

    expect(ler()).toEqual(depois)

    expect(setItem).toHaveBeenCalledTimes(1)
  })
})

describe('BK.19-BF.1-BN.2 - divergencia na confirmacao', () => {
  it('T09 - protege antecipacao com releitura divergente', async () => {
    const cenario = await preparar()
    const { financas, setItem, ler } = cenario

    const antes = ler()
    const memoriaTransacoesAntes = [...financas.transacoes.value]
    const memoriaPagamentosAntes = [
      ...financas.pagamentosAntecipadosFatura.value
    ]

    const getItemOriginal = localStorage.getItem
    let leiturasAposGravacao = 0
    let gravacaoRealizada = false
    let divergenciaSimulada = false

    const setItemOriginal = setItem.getMockImplementation()

    setItem.mockImplementation((chave, valor) => {
      setItemOriginal(chave, valor)

      if (chave === CHAVE) {
        gravacaoRealizada = true
      }
    })

    const getItemInterceptado = vi.fn(chave => {
      const textoReal = getItemOriginal(chave)

      if (chave === CHAVE && gravacaoRealizada) {
        leiturasAposGravacao++

        if (leiturasAposGravacao === 1) {
          divergenciaSimulada = true

          const documentoDivergente = JSON.parse(textoReal)

          documentoDivergente.proximoId = 999

          return JSON.stringify(documentoDivergente)
        }
      }

      return textoReal
    })

    localStorage.getItem = getItemInterceptado

    let resultado

    try {
      resultado = solicitar(
        financas,
        'operacao-bn-t09',
        'tentativa-bn-t09',
        80
      )
    } finally {
      localStorage.getItem = getItemOriginal
    }

    expect(gravacaoRealizada).toBe(true)
    expect(divergenciaSimulada).toBe(true)
    expect(leiturasAposGravacao).toBeGreaterThanOrEqual(1)

    expect(resultado.sucesso).toBe(false)
    expect(resultado.motivo)
      .toBe('ANTECIPACAO_REQUER_VERIFICACAO')
    expect(resultado.pagamento).toBeNull()

    const depois = ler()

    expect(depois).not.toEqual(antes)

    expect(depois.pagamentosAntecipadosFatura)
      .toHaveLength(1)

    expect(depois.transacoes).toHaveLength(1)
    expect(depois.proximoId).toBe(21)

    expect(depois.contas).toEqual(antes.contas)
    expect(depois.comprasCartao).toEqual(antes.comprasCartao)
    expect(depois.faturasCartao).toEqual(antes.faturasCartao)

    expect(financas.transacoes.value)
      .toEqual(memoriaTransacoesAntes)

    expect(financas.pagamentosAntecipadosFatura.value)
      .toEqual(memoriaPagamentosAntes)

    expect(financas.armazenamentoProtegido.value)
      .toBe(true)

    expect(setItem).toHaveBeenCalledTimes(1)

    const segundaTentativa = solicitar(
      financas,
      'operacao-bn-t09-segunda',
      'tentativa-bn-t09-segunda',
      50
    )

    expect(segundaTentativa.sucesso).toBe(false)
    expect(segundaTentativa.motivo)
      .toBe('OPERACAO_FINANCEIRA_BLOQUEADA')

    expect(ler()).toEqual(depois)
    expect(setItem).toHaveBeenCalledTimes(1)
  })
})

describe('BK.19-BF.1-BO.2 - alteracao antes da gravacao', () => {
  it('T10 - bloqueia alteracao externa entre leitura e gravacao', async () => {
    const cenario = await preparar()
    const { financas, setItem, ler } = cenario

    const antes = ler()

    const memoriaTransacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )

    const memoriaPagamentosAntes = JSON.parse(
      JSON.stringify(financas.pagamentosAntecipadosFatura.value)
    )

    const getItemOriginal = localStorage.getItem
    const setItemOriginal = setItem.getMockImplementation()

    let leituras = 0
    let alteracaoExternaRealizada = false
    let documentoExterno = null

    const getItemInterceptado = vi.fn(chave => {
      if (chave === CHAVE) {
        leituras++

        if (leituras === 2 && !alteracaoExternaRealizada) {
          const documentoAtual = JSON.parse(
            getItemOriginal(chave)
          )

          documentoAtual.limites = {
            ...documentoAtual.limites,
            marcadorConcorrenciaT10: 1
          }

          documentoExterno = documentoAtual

          setItemOriginal(
            CHAVE,
            JSON.stringify(documentoAtual)
          )

          alteracaoExternaRealizada = true
        }
      }

      return getItemOriginal(chave)
    })

    localStorage.getItem = getItemInterceptado

    let resultado

    try {
      resultado = solicitar(
        financas,
        'operacao-bo-t10',
        'tentativa-bo-t10',
        80
      )
    } finally {
      localStorage.getItem = getItemOriginal
    }

    expect(alteracaoExternaRealizada).toBe(true)
    expect(leituras).toBeGreaterThanOrEqual(2)

    expect(resultado.sucesso).toBe(false)

    expect(resultado.motivo)
      .toBe('ANTECIPACAO_REQUER_VERIFICACAO')

    expect(resultado.pagamento).toBeNull()

    expect(financas.armazenamentoProtegido.value)
      .toBe(true)

    const depois = ler()

    expect(depois).toEqual(documentoExterno)

    expect(depois.limites.marcadorConcorrenciaT10)
      .toBe(1)

    expect(depois.transacoes)
      .toEqual(antes.transacoes)

    expect(depois.pagamentosAntecipadosFatura)
      .toEqual(antes.pagamentosAntecipadosFatura)

    expect(depois.proximoId)
      .toBe(antes.proximoId)

    expect(financas.transacoes.value)
      .toEqual(memoriaTransacoesAntes)

    expect(financas.pagamentosAntecipadosFatura.value)
      .toEqual(memoriaPagamentosAntes)

    expect(setItem).not.toHaveBeenCalled()

    const segundaTentativa = solicitar(
      financas,
      'operacao-bo-t10-segunda',
      'tentativa-bo-t10-segunda',
      50
    )

    expect(segundaTentativa.sucesso).toBe(false)

    expect(segundaTentativa.motivo)
      .toBe('OPERACAO_FINANCEIRA_BLOQUEADA')

    expect(ler()).toEqual(depois)
    expect(setItem).not.toHaveBeenCalled()
  })
})
