import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarDados() {
  return {
    versaoDados: 2,
    saldoInicial: 500,
    proximoId: 1,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [],
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    contas: [
      {
        id: 1,
        nome: 'Conta A',
        instituicao: 'Banco A',
        tipo: 'corrente',
        agencia: '',
        numero: '',
        saldoInicial: 500,
        ativa: true,
        principal: true,
        dataCriacao: '2026-11-01'
      },
      {
        id: 2,
        nome: 'Conta B',
        instituicao: 'Banco B',
        tipo: 'poupanca',
        agencia: '',
        numero: '',
        saldoInicial: 300,
        ativa: true,
        principal: false,
        dataCriacao: '2026-11-01'
      }
    ]
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Integracao — execucao valida apos recusa', () => {
  it('permite nova transferencia apos tentativa recusada', async () => {
    let armazenamentoAtual = JSON.stringify(criarDados())

    const getItem = vi.fn(chave =>
      chave === CHAVE ? armazenamentoAtual : null
    )

    const setItem = vi.fn((chave, valor) => {
      if (chave === CHAVE) armazenamentoAtual = valor
    })

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()
    financas.mesSelecionado.value = new Date()

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.saldoDaConta(1)).toBe(500)
    expect(financas.saldoDaConta(2)).toBe(300)
    expect(financas.saldo()).toBe(800)

    const armazenamentoInicial = armazenamentoAtual
    const chamadasIniciais = setItem.mock.calls.length

    // Primeira tentativa: total necessario de 905.
    // Saldo disponivel de apenas 500.
    const recusada = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(recusada).toBe(false)

    expect(financas.saldoDaConta(1)).toBe(500)
    expect(financas.saldoDaConta(2)).toBe(300)
    expect(financas.saldo()).toBe(800)

    expect(financas.transferencias.value).toHaveLength(0)
    expect(financas.transacoes.value).toEqual([])

    expect(setItem.mock.calls.length).toBeGreaterThan(chamadasIniciais)

    const dadosAposRecusa = JSON.parse(armazenamentoAtual)

    expect(dadosAposRecusa.transferencias).toEqual([])
    expect(dadosAposRecusa.transacoes).toEqual([])
    expect(dadosAposRecusa.tentativasTransferenciaRecusadas).toHaveLength(1)

    expect(dadosAposRecusa.tentativasTransferenciaRecusadas[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5,
      saldoDisponivel: 500,
      totalNecessario: 905,
      motivoCodigo: 'SALDO_INSUFICIENTE',
      resultado: 'recusada'
    })

    expect(armazenamentoAtual).not.toBe(armazenamentoInicial)

    // Segunda tentativa: transferencia valida.
    const executada = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2
    })

    expect(executada).toBe(true)

    expect(financas.saldoDaConta(1)).toBe(398)
    expect(financas.saldoDaConta(2)).toBe(400)
    expect(financas.saldo()).toBe(798)

    expect(financas.transferencias.value).toHaveLength(1)
    expect(financas.transacoes.value).toEqual([])

    expect(setItem.mock.calls.length).toBeGreaterThan(chamadasIniciais)

    const dadosPersistidos = JSON.parse(armazenamentoAtual)

    expect(dadosPersistidos.transferencias).toHaveLength(1)
    expect(dadosPersistidos.transacoes).toEqual([])

    expect(dadosPersistidos.transferencias[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2,
      status: 'executada'
    })

    // Recuperacao do armazenamento persistido.
    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)
    expect(recuperado.saldoDaConta(1)).toBe(398)
    expect(recuperado.saldoDaConta(2)).toBe(400)
    expect(recuperado.saldo()).toBe(798)

    expect(recuperado.transferencias.value).toHaveLength(1)
    expect(recuperado.transacoes.value).toEqual([])
    expect(recuperado.tentativasTransferenciaRecusadas.value).toHaveLength(1)
    expect(
      recuperado.tentativasTransferenciaRecusadas.value[0].motivoCodigo
    ).toBe('SALDO_INSUFICIENTE')
  })
})

describe('Integracao — motivos de recusas submetidas', () => {
  const cenarios = [
    {
      codigo: 'CONTAS_IDENTIFICACAO_INVALIDA',
      dados: {
        contaOrigemId: 0,
        contaDestinoId: 2,
        valor: 10,
        tarifa: 0
      }
    },
    {
      codigo: 'CONTAS_IGUAIS',
      dados: {
        contaOrigemId: 1,
        contaDestinoId: 1,
        valor: 10,
        tarifa: 0
      }
    },
    {
      codigo: 'CONTA_NAO_ENCONTRADA',
      dados: {
        contaOrigemId: 1,
        contaDestinoId: 999,
        valor: 10,
        tarifa: 0
      }
    },
    {
      codigo: 'VALOR_INVALIDO',
      dados: {
        contaOrigemId: 1,
        contaDestinoId: 2,
        valor: 0,
        tarifa: 0
      }
    },
    {
      codigo: 'TARIFA_INVALIDA',
      dados: {
        contaOrigemId: 1,
        contaDestinoId: 2,
        valor: 10,
        tarifa: -1
      }
    },
    {
      codigo: 'TOTAL_LIMITE_SEGURO',
      dados: {
        contaOrigemId: 1,
        contaDestinoId: 2,
        valor: Number.MAX_SAFE_INTEGER / 100,
        tarifa: Number.MAX_SAFE_INTEGER / 100
      }
    },
    {
      codigo: 'CONTA_INATIVA',
      dados: {
        contaOrigemId: 1,
        contaDestinoId: 2,
        valor: 10,
        tarifa: 0
      },
      preparar: dados => {
        dados.contas[1].ativa = false
      }
    }
  ]

  for (const cenario of cenarios) {
    it(`registra recusa ${cenario.codigo} sem movimentacao financeira`, async () => {
      const dadosIniciais = criarDados()
      cenario.preparar?.(dadosIniciais)

      let armazenamentoAtual = JSON.stringify(dadosIniciais)

      const getItem = vi.fn(chave =>
        chave === CHAVE ? armazenamentoAtual : null
      )

      const setItem = vi.fn((chave, valor) => {
        if (chave === CHAVE) armazenamentoAtual = valor
      })

      vi.stubGlobal('localStorage', { getItem, setItem })
      vi.resetModules()

      const { useFinancas } = await import(
        '../composables/useFinancas.js'
      )

      const financas = useFinancas()

      expect(financas.armazenamentoProtegido.value).toBe(false)

      const saldoOrigem = financas.saldoOperacionalDaConta(1)
      const saldoDestino = financas.saldoOperacionalDaConta(2)
      const transacoesAntes = JSON.parse(
        JSON.stringify(financas.transacoes.value)
      )
      const transferenciasAntes = JSON.parse(
        JSON.stringify(financas.transferencias.value)
      )

      const resultado = financas.executarTransferencia(cenario.dados)

      expect(resultado).toBe(false)
      expect(financas.saldoOperacionalDaConta(1)).toBe(saldoOrigem)
      expect(financas.saldoOperacionalDaConta(2)).toBe(saldoDestino)
      expect(financas.transacoes.value).toEqual(transacoesAntes)
      expect(financas.transferencias.value).toEqual(transferenciasAntes)

      const dadosPersistidos = JSON.parse(armazenamentoAtual)

      expect(dadosPersistidos.transacoes).toEqual(transacoesAntes)
      expect(dadosPersistidos.transferencias).toEqual(transferenciasAntes)
      expect(dadosPersistidos.tentativasTransferenciaRecusadas).toHaveLength(1)

      const tentativa = dadosPersistidos.tentativasTransferenciaRecusadas[0]

      expect(tentativa).toMatchObject({
        contaOrigemId: cenario.dados.contaOrigemId,
        contaDestinoId: cenario.dados.contaDestinoId,
        valor: cenario.dados.valor,
        tarifa: cenario.dados.tarifa,
        motivoCodigo: cenario.codigo,
        resultado: 'recusada'
      })

      expect(typeof tentativa.id).toBe('string')
      expect(tentativa.id.length).toBeGreaterThan(0)
      expect(Number.isNaN(Date.parse(tentativa.dataHora))).toBe(false)
      expect(tentativa.motivoDescricao.length).toBeGreaterThan(0)
      expect(financas.tentativasTransferenciaRecusadas.value).toHaveLength(1)
    })
  }
})




describe('Recuperacao administrativa de recusas', () => {
  async function prepararCenario() {
    let armazenamentoAtual = JSON.stringify(criarDados())

    const getItem = vi.fn(chave =>
      chave === CHAVE ? armazenamentoAtual : null
    )

    const setItem = vi.fn((chave, valor) => {
      if (chave === CHAVE) armazenamentoAtual = valor
    })

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const recusada = financas.executarTransferencia({
      idTentativa: crypto.randomUUID(),
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(recusada).toBe(false)

    const historico = JSON.parse(armazenamentoAtual)
      .tentativasTransferenciaRecusadas

    expect(historico).toHaveLength(1)

    return {
      financas,
      getItem,
      setItem,
      obterArmazenamento: () => armazenamentoAtual,
      alterarArmazenamento: valor => {
        armazenamentoAtual = valor
      },
      registroOriginal: JSON.parse(JSON.stringify(historico[0]))
    }
  }

  it('confirma registro identico sem duplicar', async () => {
    const cenario = await prepararCenario()
    const { financas, registroOriginal, setItem } = cenario

    const gravacoesAntes = setItem.mock.calls.length

    const resultado =
      financas.recuperarHistoricoTransferenciaRecusada(
        registroOriginal
      )

    expect(resultado).toMatchObject({
      registrada: true,
      requerVerificacao: false,
      recuperada: true,
      id: registroOriginal.id
    })

    expect(setItem.mock.calls.length).toBe(gravacoesAntes)

    const dados = JSON.parse(cenario.obterArmazenamento())

    expect(dados.tentativasTransferenciaRecusadas).toEqual([
      registroOriginal
    ])
  })

  it('bloqueia alteracao de qualquer campo original', async () => {
    const cenario = await prepararCenario()
    const { financas, registroOriginal, setItem } = cenario

    const gravacoesAntes = setItem.mock.calls.length

    const camposAlterados = {
      id: 'outro-id',
      dataHora: '2026-11-16T12:00:00.000Z',
      contaOrigemId: 99,
      contaDestinoId: 99,
      contaOrigemIdentificacao: {
        nome: 'Conta alterada',
        instituicao: 'Banco A'
      },
      contaDestinoIdentificacao: {
        nome: 'Conta alterada',
        instituicao: 'Banco B'
      },
      valor: 901,
      tarifa: 6,
      saldoDisponivel: 499,
      totalNecessario: 906,
      motivoCodigo: 'OUTRO_MOTIVO',
      motivoDescricao: 'Descricao alterada',
      resultado: 'executada'
    }

    for (const [campo, valor] of Object.entries(camposAlterados)) {
      const alterado = JSON.parse(JSON.stringify(registroOriginal))
      alterado[campo] = valor

      const resultado =
        financas.recuperarHistoricoTransferenciaRecusada(
          alterado
        )

      expect(resultado.registrada, campo).toBe(false)
      expect(resultado.requerVerificacao, campo).toBe(true)
    }

    expect(setItem.mock.calls.length).toBe(gravacoesAntes)
  })

  it('bloqueia divergencia entre memoria e armazenamento', async () => {
    const cenario = await prepararCenario()
    const { financas, registroOriginal, setItem } = cenario

    const dados = JSON.parse(cenario.obterArmazenamento())

    dados.tentativasTransferenciaRecusadas[0].motivoDescricao =
      'Descricao divergente no armazenamento'

    cenario.alterarArmazenamento(JSON.stringify(dados))

    const gravacoesAntes = setItem.mock.calls.length

    const resultado =
      financas.recuperarHistoricoTransferenciaRecusada(
        registroOriginal
      )

    expect(resultado.registrada).toBe(false)
    expect(resultado.requerVerificacao).toBe(true)
    expect(setItem.mock.calls.length).toBe(gravacoesAntes)
  })

  it('nao altera saldos nem gera movimentacoes financeiras', async () => {
    const cenario = await prepararCenario()
    const { financas, registroOriginal } = cenario

    const saldoOrigem = financas.saldoOperacionalDaConta(1)
    const saldoDestino = financas.saldoOperacionalDaConta(2)

    const transferenciasAntes = JSON.parse(
      JSON.stringify(financas.transferencias.value)
    )

    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )

    financas.recuperarHistoricoTransferenciaRecusada(
      registroOriginal
    )

    expect(financas.saldoOperacionalDaConta(1)).toBe(saldoOrigem)
    expect(financas.saldoOperacionalDaConta(2)).toBe(saldoDestino)
    expect(financas.transferencias.value).toEqual(
      transferenciasAntes
    )
    expect(financas.transacoes.value).toEqual(
      transacoesAntes
    )

    const dados = JSON.parse(cenario.obterArmazenamento())

    expect(dados.transferencias).toEqual(transferenciasAntes)
    expect(dados.transacoes).toEqual(transacoesAntes)
  })
})

describe('Falhas tecnicas no registro de recusas', () => {
  async function prepararFalha(tipoFalha) {
    let armazenamentoAtual = JSON.stringify(criarDados())
    let falhaAtivada = false
    let escritasDuranteFalha = 0

    const getItem = vi.fn(chave => {
      if (chave !== CHAVE) return null

      if (
        falhaAtivada &&
        tipoFalha === 'verificacao_indeterminada' &&
        escritasDuranteFalha > 0
      ) {
        throw new Error('Falha simulada de leitura')
      }

      return armazenamentoAtual
    })

    const setItem = vi.fn((chave, valor) => {
      if (chave !== CHAVE) return

      if (!falhaAtivada) {
        armazenamentoAtual = valor
        return
      }

      escritasDuranteFalha++

      if (tipoFalha === 'antes' ||
          tipoFalha === 'verificacao_indeterminada') {
        throw new Error('Falha simulada antes da gravacao')
      }

      if (tipoFalha === 'depois') {
        armazenamentoAtual = valor
        throw new Error('Falha simulada apos a gravacao')
      }

      armazenamentoAtual = valor
    })

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()
    financas.mesSelecionado.value = new Date()

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const saldoOrigem = financas.saldoOperacionalDaConta(1)
    const saldoDestino = financas.saldoOperacionalDaConta(2)

    falhaAtivada = true

    const idTentativa = crypto.randomUUID()

    const resultado = financas.executarTransferencia({
      idTentativa,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    return {
      financas,
      resultado,
      idTentativa,
      getItem,
      setItem,
      obterArmazenamento: () => armazenamentoAtual,
      obterEscritasDuranteFalha: () => escritasDuranteFalha,
      saldoOrigem,
      saldoDestino
    }
  }

  function verificarAusenciaMovimentacao(cenario) {
    const { financas, saldoOrigem, saldoDestino } = cenario

    expect(financas.saldoOperacionalDaConta(1)).toBe(saldoOrigem)
    expect(financas.saldoOperacionalDaConta(2)).toBe(saldoDestino)
    expect(financas.transferencias.value).toEqual([])
    expect(financas.transacoes.value).toEqual([])

    const dados = JSON.parse(cenario.obterArmazenamento())

    expect(dados.transferencias).toEqual([])
    expect(dados.transacoes).toEqual([])
  }

  it('bloqueia registro quando a escrita falha antes de persistir', async () => {
    const cenario = await prepararFalha('antes')

    expect(cenario.resultado).toBe(false)
    expect(cenario.obterEscritasDuranteFalha()).toBe(2)

    const dados = JSON.parse(cenario.obterArmazenamento())

    expect(dados.tentativasTransferenciaRecusadas).toEqual([])
    expect(cenario.financas.tentativasTransferenciaRecusadas.value)
      .toEqual([])

    verificarAusenciaMovimentacao(cenario)
  })

  it('identifica registro persistido mesmo com excecao apos escrita', async () => {
    const cenario = await prepararFalha('depois')

    expect(cenario.resultado).toBe(false)
    expect(cenario.obterEscritasDuranteFalha()).toBe(2)

    const dados = JSON.parse(cenario.obterArmazenamento())
    const historico = dados.tentativasTransferenciaRecusadas

    expect(historico).toHaveLength(1)
    expect(historico[0].id).toBe(cenario.idTentativa)
    expect(historico[0].motivoCodigo).toBe('SALDO_INSUFICIENTE')
    expect(historico[0].resultado).toBe('recusada')

    verificarAusenciaMovimentacao(cenario)
  })

  it('mantem bloqueio quando a verificacao tambem falha', async () => {
    const cenario = await prepararFalha('verificacao_indeterminada')

    expect(cenario.resultado).toBe(false)
    expect(cenario.obterEscritasDuranteFalha()).toBe(1)

    const dados = JSON.parse(cenario.obterArmazenamento())

    expect(dados.tentativasTransferenciaRecusadas).toEqual([])
    expect(cenario.financas.tentativasTransferenciaRecusadas.value)
      .toEqual([])

    verificarAusenciaMovimentacao(cenario)
  })
})

describe('Reconciliacao controlada de recusas persistidas', () => {
  async function prepararCenario(tipo) {
    let armazenamentoAtual = JSON.stringify(criarDados())
    let simularExcecao = false
    let escritasAposExcecao = 0

    const getItem = vi.fn(chave =>
      chave === CHAVE ? armazenamentoAtual : null
    )

    const setItem = vi.fn((chave, valor) => {
      if (chave !== CHAVE) return

      armazenamentoAtual = valor

      if (simularExcecao) {
        escritasAposExcecao++
        throw new Error('Falha simulada apos persistencia')
      }
    })

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()
    financas.mesSelecionado.value = new Date()

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const saldoOrigem = financas.saldoOperacionalDaConta(1)
    const saldoDestino = financas.saldoOperacionalDaConta(2)

    simularExcecao = true

    const idTentativa = crypto.randomUUID()

    const resultadoExecucao = financas.executarTransferencia({
      idTentativa,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(resultadoExecucao).toBe(false)
    expect(escritasAposExcecao).toBe(2)

    const dadosPersistidos = JSON.parse(armazenamentoAtual)
    const registroOriginal =
      dadosPersistidos.tentativasTransferenciaRecusadas.find(
        item => item.id === idTentativa
      )

    expect(registroOriginal).toBeDefined()
    expect(financas.tentativasTransferenciaRecusadas.value).toEqual([])

    if (tipo === 'divergente') {
      dadosPersistidos.tentativasTransferenciaRecusadas[0].valor = 901
      armazenamentoAtual = JSON.stringify(dadosPersistidos)
    }

    const escritasAntesRecuperacao = setItem.mock.calls.length

    const resultadoRecuperacao =
      financas.recuperarHistoricoTransferenciaRecusada({
        ...registroOriginal
      })

    return {
      financas,
      resultadoRecuperacao,
      registroOriginal,
      idTentativa,
      setItem,
      escritasAntesRecuperacao,
      saldoOrigem,
      saldoDestino,
      obterDados: () => JSON.parse(armazenamentoAtual)
    }
  }

  it('reconcilia registro persistido sem nova gravacao', async () => {
    const cenario = await prepararCenario('valido')

    expect(cenario.resultadoRecuperacao).toMatchObject({
      registrada: true,
      requerVerificacao: false,
      recuperada: true,
      situacaoPersistencia: 'confirmada',
      id: cenario.idTentativa
    })

    expect(
      cenario.financas.tentativasTransferenciaRecusadas.value
    ).toEqual([cenario.registroOriginal])

    expect(cenario.setItem.mock.calls.length).toBe(
      cenario.escritasAntesRecuperacao
    )
  })

  it('bloqueia reconciliacao de registro divergente', async () => {
    const cenario = await prepararCenario('divergente')

    expect(cenario.resultadoRecuperacao).toMatchObject({
      registrada: false,
      requerVerificacao: true,
      situacaoPersistencia: 'divergente',
      id: cenario.idTentativa
    })

    expect(
      cenario.financas.tentativasTransferenciaRecusadas.value
    ).toEqual([])

    expect(cenario.setItem.mock.calls.length).toBe(
      cenario.escritasAntesRecuperacao
    )
  })

  it('preserva saldos e movimentacoes durante reconciliacao', async () => {
    const cenario = await prepararCenario('valido')

    expect(
      cenario.financas.saldoOperacionalDaConta(1)
    ).toBe(cenario.saldoOrigem)

    expect(
      cenario.financas.saldoOperacionalDaConta(2)
    ).toBe(cenario.saldoDestino)

    expect(cenario.financas.transferencias.value).toEqual([])
    expect(cenario.financas.transacoes.value).toEqual([])

    const dados = cenario.obterDados()

    expect(dados.transferencias).toEqual([])
    expect(dados.transacoes).toEqual([])

    expect(cenario.setItem.mock.calls.length).toBe(
      cenario.escritasAntesRecuperacao
    )
  })
})

describe('Recuperacao de recusas nao persistidas', () => {
  async function prepararCenario() {
    let armazenamentoAtual = JSON.stringify(criarDados())
    let falharGravacao = false

    const getItem = vi.fn(chave =>
      chave === CHAVE ? armazenamentoAtual : null
    )

    const setItem = vi.fn((chave, valor) => {
      if (chave !== CHAVE) return

      if (falharGravacao) {
        throw new Error('Falha simulada antes da gravacao')
      }

      armazenamentoAtual = valor
    })

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()
    financas.mesSelecionado.value = new Date()

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const saldoOrigem = financas.saldoOperacionalDaConta(1)
    const saldoDestino = financas.saldoOperacionalDaConta(2)

    const idTentativa = crypto.randomUUID()

    falharGravacao = true

    const resultadoExecucao = financas.executarTransferencia({
      idTentativa,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(resultadoExecucao).toBe(false)

    const historicoInicial =
      JSON.parse(armazenamentoAtual).tentativasTransferenciaRecusadas

    expect(historicoInicial).toEqual([])
    expect(financas.tentativasTransferenciaRecusadas.value).toEqual([])

    falharGravacao = false

    return {
      financas,
      idTentativa,
      getItem,
      setItem,
      saldoOrigem,
      saldoDestino,
      obterDados: () => JSON.parse(armazenamentoAtual),
      alterarDados: dados => {
        armazenamentoAtual = JSON.stringify(dados)
      }
    }
  }

  function obterRegistroPendente(cenario) {
    const registros =
      cenario.financas.tentativasTransferenciaRecusadas.value

    expect(registros).toEqual([])

    return {
      id: cenario.idTentativa,
      dataHora: new Date().toISOString(),
      contaOrigemId: 1,
      contaDestinoId: 2,
      contaOrigemIdentificacao: {
        nome: 'Conta A',
        instituicao: null
      },
      contaDestinoIdentificacao: {
        nome: 'Conta B',
        instituicao: null
      },
      valor: 900,
      tarifa: 5,
      saldoDisponivel: cenario.saldoOrigem,
      totalNecessario: 905,
      motivoCodigo: 'SALDO_INSUFICIENTE',
      motivoDescricao: 'Saldo insuficiente',
      resultado: 'recusada'
    }
  }

  it('nao recupera registro reconstruido sem prova do original', async () => {
    const cenario = await prepararCenario()
    const registroReconstruido = obterRegistroPendente(cenario)

    const resultado =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        registroReconstruido
      )

    expect(resultado.registrada).toBe(false)
    expect(resultado.requerVerificacao).toBe(true)

    expect(
      cenario.financas.tentativasTransferenciaRecusadas.value
    ).toEqual([])
  })

  it('impede duplicidade em tentativas repetidas sem registro original', async () => {
    const cenario = await prepararCenario()
    const registroReconstruido = obterRegistroPendente(cenario)

    const primeiro =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        registroReconstruido
      )

    const segundo =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        registroReconstruido
      )

    expect(primeiro.registrada).toBe(false)
    expect(segundo.registrada).toBe(false)

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toEqual([])
  })

  it('bloqueia recuperacao diante de historico divergente', async () => {
    const cenario = await prepararCenario()
    const dados = cenario.obterDados()

    dados.tentativasTransferenciaRecusadas.push({
      id: 'registro-externo',
      dataHora: new Date().toISOString(),
      motivoCodigo: 'SALDO_INSUFICIENTE',
      resultado: 'recusada'
    })

    cenario.alterarDados(dados)

    const resultado =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        obterRegistroPendente(cenario)
      )

    expect(resultado.registrada).toBe(false)
    expect(resultado.requerVerificacao).toBe(true)

    expect(
      cenario.financas.tentativasTransferenciaRecusadas.value
    ).toEqual([])
  })

  it('preserva saldos e movimentacoes apos falha de gravacao', async () => {
    const cenario = await prepararCenario()

    const resultado =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        obterRegistroPendente(cenario)
      )

    expect(resultado.registrada).toBe(false)

    expect(
      cenario.financas.saldoOperacionalDaConta(1)
    ).toBe(cenario.saldoOrigem)

    expect(
      cenario.financas.saldoOperacionalDaConta(2)
    ).toBe(cenario.saldoDestino)

    expect(cenario.financas.transferencias.value).toEqual([])
    expect(cenario.financas.transacoes.value).toEqual([])

    const dados = cenario.obterDados()

    expect(dados.transferencias).toEqual([])
    expect(dados.transacoes).toEqual([])
  })
})

describe('Recuperacao efetiva por ID de tentativa recusada', () => {
  async function prepararCenario() {
    let armazenamentoAtual = JSON.stringify(criarDados())
    let falharGravacao = false

    const getItem = vi.fn(chave =>
      chave === CHAVE ? armazenamentoAtual : null
    )

    const setItem = vi.fn((chave, valor) => {
      if (chave !== CHAVE) return

      if (falharGravacao) {
        throw new Error('Falha simulada antes da gravacao')
      }

      armazenamentoAtual = valor
    })

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()
    financas.mesSelecionado.value = new Date()

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const saldoOrigem = financas.saldoOperacionalDaConta(1)
    const saldoDestino = financas.saldoOperacionalDaConta(2)

    const idTentativa = crypto.randomUUID()

    falharGravacao = true

    const resultadoExecucao = financas.executarTransferencia({
      idTentativa,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(resultadoExecucao).toBe(false)

    expect(
      JSON.parse(armazenamentoAtual).tentativasTransferenciaRecusadas
    ).toEqual([])

    expect(
      financas.tentativasTransferenciaRecusadas.value
    ).toEqual([])

    falharGravacao = false

    return {
      financas,
      idTentativa,
      setItem,
      saldoOrigem,
      saldoDestino,
      obterDados: () => JSON.parse(armazenamentoAtual)
    }
  }

  it('recupera tentativa original pelo ID apos falha de gravacao', async () => {
    const cenario = await prepararCenario()

    const resultado =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        cenario.idTentativa
      )

    expect(resultado).toMatchObject({
      registrada: true,
      requerVerificacao: false,
      recuperada: true,
      situacaoPersistencia: 'confirmada',
      id: cenario.idTentativa
    })

    const historico =
      cenario.obterDados().tentativasTransferenciaRecusadas

    expect(historico).toHaveLength(1)
    expect(historico[0].id).toBe(cenario.idTentativa)
    expect(historico[0].valor).toBe(900)
    expect(historico[0].tarifa).toBe(5)
    expect(historico[0].motivoCodigo).toBe('SALDO_INSUFICIENTE')

    expect(
      cenario.financas.tentativasTransferenciaRecusadas.value
    ).toEqual(historico)
  })

  it('nao duplica registro quando a recuperacao e repetida', async () => {
    const cenario = await prepararCenario()

    const primeiro =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        cenario.idTentativa
      )

    expect(primeiro.registrada).toBe(true)

    const escritasAposPrimeiraRecuperacao =
      cenario.setItem.mock.calls.length

    const segundo =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        cenario.idTentativa
      )

    expect(segundo).toMatchObject({
      registrada: true,
      requerVerificacao: false,
      recuperada: true,
      id: cenario.idTentativa
    })

    expect(cenario.setItem.mock.calls.length).toBe(
      escritasAposPrimeiraRecuperacao
    )

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toHaveLength(1)
  })

  it('bloqueia recuperacao de ID desconhecido', async () => {
    const cenario = await prepararCenario()

    const escritasAntes =
      cenario.setItem.mock.calls.length

    const resultado =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        crypto.randomUUID()
      )

    expect(resultado.registrada).toBe(false)
    expect(resultado.requerVerificacao).toBe(true)

    expect(cenario.setItem.mock.calls.length).toBe(
      escritasAntes
    )

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toEqual([])
  })

  it('bloqueia divergencia de leitura apos recuperacao confirmada', async () => {
    const cenario = await prepararCenario()

    const primeiro =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        cenario.idTentativa
      )

    expect(primeiro).toMatchObject({
      registrada: true,
      requerVerificacao: false,
      recuperada: true,
      situacaoPersistencia: 'confirmada'
    })

    const historicoOriginal =
      cenario.obterDados().tentativasTransferenciaRecusadas

    expect(historicoOriginal).toHaveLength(1)

    const escritasAntes =
      cenario.setItem.mock.calls.length

    const leituraOriginal = localStorage.getItem

    localStorage.getItem = vi.fn(chave => {
      const dados = leituraOriginal(chave)

      if (dados === null) return null

      const estado = JSON.parse(dados)
      estado.tentativasTransferenciaRecusadas = []

      return JSON.stringify(estado)
    })

    let resultado

    try {
      resultado =
        cenario.financas.recuperarHistoricoTransferenciaRecusada(
          cenario.idTentativa
        )
    } finally {
      localStorage.getItem = leituraOriginal
    }

    expect(resultado.registrada).toBe(false)
    expect(resultado.requerVerificacao).toBe(true)

    expect(cenario.setItem.mock.calls.length).toBe(
      escritasAntes
    )

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toEqual(historicoOriginal)

    expect(
      cenario.financas.tentativasTransferenciaRecusadas.value
    ).toEqual(historicoOriginal)

    const novaConsulta =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        cenario.idTentativa
      )

    expect(novaConsulta).toMatchObject({
      registrada: true,
      requerVerificacao: false,
      recuperada: true,
      situacaoPersistencia: 'confirmada'
    })

    expect(cenario.setItem.mock.calls.length).toBe(
      escritasAntes
    )
  })
  it('preserva tentativa pendente durante falha temporaria de leitura', async () => {
    const cenario = await prepararCenario()

    const leituraOriginal = localStorage.getItem

    localStorage.getItem = vi.fn(() => {
      throw new Error('Falha temporaria simulada de leitura')
    })

    let resultadoFalha

    try {
      resultadoFalha =
        cenario.financas.recuperarHistoricoTransferenciaRecusada(
          cenario.idTentativa
        )
    } finally {
      localStorage.getItem = leituraOriginal
    }

    expect(resultadoFalha).toMatchObject({
      registrada: false,
      requerVerificacao: true,
      situacaoPersistencia: 'indeterminada',
      id: cenario.idTentativa
    })

    const resultadoRecuperacao =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        cenario.idTentativa
      )

    expect(resultadoRecuperacao).toMatchObject({
      registrada: true,
      requerVerificacao: false,
      recuperada: true,
      situacaoPersistencia: 'confirmada',
      id: cenario.idTentativa
    })

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toHaveLength(1)

    expect(
      cenario.financas.tentativasTransferenciaRecusadas.value
    ).toHaveLength(1)

    expect(cenario.financas.transferencias.value).toEqual([])
    expect(cenario.financas.transacoes.value).toEqual([])
  })
  it('preserva saldos e movimentacoes na recuperacao por ID', async () => {
    const cenario = await prepararCenario()

    const resultado =
      cenario.financas.recuperarHistoricoTransferenciaRecusada(
        cenario.idTentativa
      )

    expect(resultado.registrada).toBe(true)

    expect(
      cenario.financas.saldoOperacionalDaConta(1)
    ).toBe(cenario.saldoOrigem)

    expect(
      cenario.financas.saldoOperacionalDaConta(2)
    ).toBe(cenario.saldoDestino)

    expect(cenario.financas.transferencias.value).toEqual([])
    expect(cenario.financas.transacoes.value).toEqual([])

    const dados = cenario.obterDados()

    expect(dados.transferencias).toEqual([])
    expect(dados.transacoes).toEqual([])
  })
})

describe('Estado tecnico das tentativas de transferencia', () => {
  async function prepararCenario() {
    let armazenamentoAtual = JSON.stringify(criarDados())
    let falharGravacao = false

    const getItem = vi.fn(chave =>
      chave === CHAVE ? armazenamentoAtual : null
    )

    const setItem = vi.fn((chave, valor) => {
      if (chave !== CHAVE) return
      if (falharGravacao) {
        throw new Error('Falha simulada de gravacao')
      }
      armazenamentoAtual = valor
    })

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()
    financas.mesSelecionado.value = new Date()

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.resultadoTecnicoTransferencia.value).toBe(null)

    return {
      financas,
      setItem,
      definirFalha(valor) {
        falharGravacao = valor
      },
      obterDados() {
        return JSON.parse(armazenamentoAtual)
      }
    }
  }

  it('identifica recusa registrada com ID original', async () => {
    const cenario = await prepararCenario()
    const idTentativa = crypto.randomUUID()

    const resultado = cenario.financas.executarTransferencia({
      idTentativa,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(resultado).toBe(false)

    expect(
      cenario.financas.resultadoTecnicoTransferencia.value
    ).toMatchObject({
      idTentativa,
      situacao: 'recusa_registrada',
      registrada: true,
      requerVerificacao: false,
      situacaoPersistencia: null,
      motivoCodigo: 'SALDO_INSUFICIENTE'
    })

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toHaveLength(1)

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas[0].id
    ).toBe(idTentativa)
  })

  it('identifica falha de persistencia com ID preservado', async () => {
    const cenario = await prepararCenario()
    const idTentativa = crypto.randomUUID()

    cenario.definirFalha(true)

    const resultado = cenario.financas.executarTransferencia({
      idTentativa,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    cenario.definirFalha(false)

    expect(resultado).toBe(false)

    expect(
      cenario.financas.resultadoTecnicoTransferencia.value
    ).toMatchObject({
      idTentativa,
      situacao: 'verificacao_pendente',
      registrada: false,
      requerVerificacao: true,
      situacaoPersistencia: 'nao_confirmada',
      motivoCodigo: 'SALDO_INSUFICIENTE'
    })

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toEqual([])

    expect(cenario.financas.transferencias.value).toEqual([])
    expect(cenario.financas.transacoes.value).toEqual([])
  })

  it('limpa resultado tecnico ao iniciar nova execucao', async () => {
    const cenario = await prepararCenario()
    const primeiroId = crypto.randomUUID()

    const primeira = cenario.financas.executarTransferencia({
      idTentativa: primeiroId,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(primeira).toBe(false)

    expect(
      cenario.financas.resultadoTecnicoTransferencia.value?.idTentativa
    ).toBe(primeiroId)

    const segunda = cenario.financas.executarTransferencia({
      idTentativa: crypto.randomUUID(),
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2
    })

    expect(segunda).toBe(true)

    expect(
      cenario.financas.resultadoTecnicoTransferencia.value
    ).toBe(null)

    expect(cenario.financas.transferencias.value).toHaveLength(1)

    expect(
      cenario.obterDados().tentativasTransferenciaRecusadas
    ).toHaveLength(1)
  })
})

describe('Verificacao individual real do formulario', () => {
  async function prepararFormulario(respostaRecuperacao) {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { parse, compileScript } = await import('@vue/compiler-sfc')
    const { ref, computed } = await import('vue')

    const caminho = fileURLToPath(
      new URL('../components/FormularioTransferencia.vue', import.meta.url)
    )
    const fonte = readFileSync(caminho, 'utf8')
    const { descriptor, errors } = parse(fonte)

    expect(errors).toEqual([])
    expect(descriptor.scriptSetup).toBeTruthy()

    const compilado = compileScript(descriptor, {
      id: 'teste-formulario-transferencia'
    })

    const inicio = compilado.content.indexOf(
      'function verificarTentativaPendente('
    )
    const fim = compilado.content.indexOf(
      'const contasAtivas = computed(',
      inicio
    )

    expect(inicio).toBeGreaterThanOrEqual(0)
    expect(fim).toBeGreaterThan(inicio)

    const funcaoReal = compilado.content.slice(inicio, fim)

    const recuperar = vi.fn(respostaRecuperacao)
    const executar = vi.fn()

    const estado = {
      tentativasPendentesIds: ref(['tentativa-a', 'tentativa-b']),
      tentativaEmVerificacaoId: ref(null),
      resultadosVerificacaoPendencias: ref({})
    }

    const criarFuncao = new Function(
      'recuperarHistoricoTransferenciaRecusada',
      'executarTransferencia',
      'ref',
      'computed',
      'tentativasPendentesIds',
      'tentativasPendentesExibidas',
      'tentativaEmVerificacaoId',
      'resultadosVerificacaoPendencias',
      `${funcaoReal}
       return verificarTentativaPendente;`
    )

    const verificar = criarFuncao(
      recuperar,
      executar,
      ref,
      computed,
      estado.tentativasPendentesIds,
      computed(() => [...estado.tentativasPendentesIds.value]),
      estado.tentativaEmVerificacaoId,
      estado.resultadosVerificacaoPendencias
    )

    return { verificar, recuperar, executar, ...estado }
  }

  it('bloqueia identificador inexistente', async () => {
    const cenario = await prepararFormulario(() => ({
      registrada: true,
      recuperada: true,
      requerVerificacao: false,
      situacaoPersistencia: 'confirmada',
      id: 'desconhecida'
    }))

    expect(cenario.verificar('desconhecida')).toBe(false)
    expect(cenario.recuperar).not.toHaveBeenCalled()
    expect(cenario.tentativasPendentesIds.value).toHaveLength(2)
  })

  it('impede verificacao simultanea', async () => {
    const cenario = await prepararFormulario(() => ({}))

    cenario.tentativaEmVerificacaoId.value = 'tentativa-a'

    expect(cenario.verificar('tentativa-b')).toBe(false)
    expect(cenario.recuperar).not.toHaveBeenCalled()
    expect(cenario.tentativaEmVerificacaoId.value).toBe('tentativa-a')
  })

  it('remove somente a tentativa confirmada', async () => {
    const cenario = await prepararFormulario(id => ({
      registrada: true,
      recuperada: true,
      requerVerificacao: false,
      situacaoPersistencia: 'confirmada',
      id
    }))

    expect(cenario.verificar('tentativa-a')).toBe(true)
    expect(cenario.tentativasPendentesIds.value).toEqual(['tentativa-b'])
    expect(
      cenario.resultadosVerificacaoPendencias.value['tentativa-a'].confirmada
    ).toBe(true)
    expect(cenario.tentativaEmVerificacaoId.value).toBe(null)
  })

  it('preserva pendencias divergentes e indeterminadas', async () => {
    const cenario = await prepararFormulario(id => ({
      registrada: false,
      recuperada: false,
      requerVerificacao: true,
      situacaoPersistencia:
        id === 'tentativa-a' ? 'divergente' : 'indeterminada',
      id
    }))

    expect(cenario.verificar('tentativa-a')).toBe(false)
    expect(cenario.verificar('tentativa-b')).toBe(false)

    expect(cenario.tentativasPendentesIds.value).toEqual([
      'tentativa-a',
      'tentativa-b'
    ])

    expect(
      cenario.resultadosVerificacaoPendencias.value['tentativa-a']
        .situacaoPersistencia
    ).toBe('divergente')

    expect(
      cenario.resultadosVerificacaoPendencias.value['tentativa-b']
        .situacaoPersistencia
    ).toBe('indeterminada')
  })

  it('nao executa transferencias durante a verificacao', async () => {
    const cenario = await prepararFormulario(id => ({
      registrada: true,
      recuperada: true,
      requerVerificacao: false,
      situacaoPersistencia: 'confirmada',
      id
    }))

    expect(cenario.verificar('tentativa-a')).toBe(true)
    expect(cenario.recuperar).toHaveBeenCalledExactlyOnceWith('tentativa-a')
    expect(cenario.executar).not.toHaveBeenCalled()
  })
})
