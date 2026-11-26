import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarDados() {
  return {
    versaoDados: 2,
    saldoInicial: 1000,
    proximoId: 1,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [],
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
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: [],
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
      },
      {
        id: 2,
        nome: 'Conta reserva',
        instituicao: 'Banco B',
        tipo: 'poupanca',
        agencia: '',
        numero: '',
        saldoInicial: 500,
        ativa: true,
        principal: false,
        dataCriacao: '2026-11-01'
      }
    ]
  }
}

const reconciliacao = {
  idReconciliacao: 'K14-F3-001',
  idTentativa: 'K14-F3-TENTATIVA',
  responsavel: 'Responsavel administrativo',
  justificativa: 'Verificacao administrativa documentada',
  evidencias: ['Evidencia documental identificada'],
  resultado: 'inconclusiva'
}

async function preparar() {
  let armazenamento = JSON.stringify(criarDados())

  const getItem = vi.fn(chave =>
    chave === CHAVE ? armazenamento : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (chave === CHAVE) {
      armazenamento = valor
    }
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
    getItem,
    setItem,
    alterarPersistencia: modificacao => {
      const dados = JSON.parse(armazenamento)
      modificacao(dados)
      armazenamento = JSON.stringify(dados)
    },
    armazenamento: () => JSON.parse(armazenamento)
  }
}

function simularBloqueioDisponivel() {
  const request = vi.fn(async (nome, opcoes, operacao) => {
    expect(nome).toBe(
      'nexus-financas-reconciliacao-administrativa'
    )
    expect(opcoes).toEqual({
      mode: 'exclusive',
      ifAvailable: true
    })

    return operacao({ name: nome, mode: 'exclusive' })
  })

  vi.stubGlobal('navigator', {
    locks: { request }
  })

  return request
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('K.14-F.3 - exclusividade administrativa', () => {
  it('F3-T01 - recusa quando Web Locks esta indisponivel', async () => {
    vi.stubGlobal('navigator', {})

    const { financas, getItem, setItem } = await preparar()

    getItem.mockClear()

    const resultado =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        reconciliacao
      )

    expect(resultado).toBe(false)
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('F3-T02 - recusa quando bloqueio esta ocupado', async () => {
    const request = vi.fn(async (_nome, _opcoes, operacao) =>
      operacao(null)
    )

    vi.stubGlobal('navigator', {
      locks: { request }
    })

    const { financas, getItem, setItem } = await preparar()

    getItem.mockClear()

    const resultado =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        reconciliacao
      )

    expect(resultado).toBe(false)
    expect(request).toHaveBeenCalledOnce()
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('F3-T03 - recusa divergencia no armazenamento', async () => {
    const request = simularBloqueioDisponivel()

    const {
      financas,
      getItem,
      setItem,
      alterarPersistencia
    } = await preparar()

    alterarPersistencia(dados => {
      dados.historicoRegularizacoesTecnicas.push({
        idAnalise: 'ALTERACAO-EXTERNA',
        idTentativa: 'OUTRA-TENTATIVA'
      })
    })

    getItem.mockClear()

    const resultado =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        reconciliacao
      )

    expect(resultado).toBe(false)
    expect(request).toHaveBeenCalledOnce()
    expect(getItem).toHaveBeenCalledWith(CHAVE)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('F3-T04 - mantem reconciliacao indisponivel', async () => {
    const request = simularBloqueioDisponivel()

    const {
      financas,
      getItem,
      setItem,
      armazenamento
    } = await preparar()

    const antes = armazenamento()

    getItem.mockClear()

    const resultado =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        reconciliacao
      )

    expect(resultado).toBe(false)
    expect(request).toHaveBeenCalledOnce()
    expect(getItem).toHaveBeenCalledWith(CHAVE)
    expect(setItem).not.toHaveBeenCalled()
    expect(armazenamento()).toEqual(antes)
  })
})

describe('K.14-F.4 - fluxo administrativo valido', () => {
  it('F4-T01 - registra reconciliacao sem liberar operacoes', async () => {
    const request = simularBloqueioDisponivel()

    const {
      financas,
      getItem,
      setItem,
      alterarPersistencia,
      armazenamento
    } = await preparar()

    const idTentativa = 'K14-F4-TENTATIVA'
    const idAnalise = 'K14-F4-ANALISE'
    const idReconciliacao = 'K14-F4-RECONCILIACAO'

    const pendencia = {
      idTentativa,
      situacao: 'verificacao_pendente',
      situacaoPersistencia: 'indeterminada',
      motivoCodigo: 'SALDO_INSUFICIENTE',
      dataHora: '2026-11-17T12:00:00.000Z'
    }

    const analise = {
      idAnalise,
      idTentativa,
      responsavel: 'Responsavel pela analise',
      justificativa: 'Analise administrativa documentada',
      evidencias: ['Documento de verificacao'],
      dataHora: '2026-11-17T12:10:00.000Z',
      situacao: 'analise_registrada',
      liberaOperacoes: false
    }

    financas.pendenciasTecnicasTransferencia.value = [pendencia]
    financas.historicoRegularizacoesTecnicas.value = [analise]

    alterarPersistencia(dados => {
      dados.pendenciasTecnicasTransferencia = [pendencia]
      dados.historicoRegularizacoesTecnicas = [analise]
    })

    const dadosAntes = armazenamento()

    const dadosReconciliacao = {
      idReconciliacao,
      idTentativa,
      idAnaliseAnterior: idAnalise,
      responsavel: 'Responsavel pela reconciliacao',
      justificativa: 'Conferencia administrativa fundamentada',
      evidencias: ['Comprovante de conferencia independente'],
      resultado: 'inconclusiva'
    }

    getItem.mockClear()
    setItem.mockClear()

    const resultado =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(resultado).toBe(true)
    expect(request).toHaveBeenCalledOnce()
    expect(getItem).toHaveBeenCalledWith(CHAVE)
    expect(setItem).toHaveBeenCalledOnce()

    const dadosDepois = armazenamento()
    const historico = dadosDepois.historicoRegularizacoesTecnicas

    expect(historico).toHaveLength(2)
    expect(historico[0]).toEqual(analise)

    expect(historico[1]).toMatchObject({
      tipo: 'reconciliacao_administrativa',
      idReconciliacao,
      idTentativa,
      idAnaliseAnterior: idAnalise,
      resultado: 'inconclusiva',
      liberaOperacoes: false
    })

    expect(dadosDepois.revisaoAdministrativaTransferencias).toBe(1)
    expect(dadosDepois.pendenciasTecnicasTransferencia).toEqual([pendencia])
    expect(dadosDepois.contas).toEqual(dadosAntes.contas)
    expect(dadosDepois.transacoes).toEqual(dadosAntes.transacoes)
    expect(dadosDepois.transferencias).toEqual(dadosAntes.transferencias)

    expect(
      financas.pendenciasTecnicasTransferencia.value
    ).toEqual([pendencia])

    expect(
      financas.historicoRegularizacoesTecnicas.value
    ).toEqual(historico)
  })
})

describe('K.3.9 - seguranca da persistencia administrativa', () => {
  async function prepararCenario() {
    simularBloqueioDisponivel()

    const contexto = await preparar()
    const { financas, alterarPersistencia } = contexto

    const pendencia = {
      idTentativa: 'K39-TENTATIVA',
      situacao: 'verificacao_pendente',
      situacaoPersistencia: 'indeterminada',
      motivoCodigo: 'SALDO_INSUFICIENTE',
      dataHora: '2026-11-17T12:00:00.000Z'
    }

    const analise = {
      idAnalise: 'K39-ANALISE',
      idTentativa: pendencia.idTentativa,
      responsavel: 'Analista administrativo',
      justificativa: 'Verificacao documentada',
      evidencias: ['Documento administrativo'],
      dataHora: '2026-11-17T12:10:00.000Z',
      situacao: 'analise_registrada',
      liberaOperacoes: false
    }

    financas.pendenciasTecnicasTransferencia.value = [pendencia]
    financas.historicoRegularizacoesTecnicas.value = [analise]

    alterarPersistencia(dados => {
      dados.pendenciasTecnicasTransferencia = [pendencia]
      dados.historicoRegularizacoesTecnicas = [analise]
    })

    return {
      ...contexto,
      pendencia,
      analise,
      dadosReconciliacao: {
        idReconciliacao: 'K39-RECONCILIACAO',
        idTentativa: pendencia.idTentativa,
        idAnaliseAnterior: analise.idAnalise,
        responsavel: 'Revisor independente',
        justificativa: 'Conferencia administrativa fundamentada',
        evidencias: ['Comprovante independente'],
        resultado: 'inconclusiva'
      }
    }
  }

  it('K39-T01 - bloqueia falha de gravacao', async () => {
    const {
      financas,
      setItem,
      armazenamento,
      analise,
      dadosReconciliacao
    } = await prepararCenario()

    const antes = armazenamento()

    setItem.mockImplementation(() => {
      throw new Error('Falha simulada de gravacao')
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const resultado =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(resultado).toBe(false)
    expect(setItem).toHaveBeenCalledOnce()
    expect(armazenamento()).toEqual(antes)
    expect(financas.historicoRegularizacoesTecnicas.value).toEqual([analise])
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('K39-T02 - bloqueia confirmacao divergente', async () => {
    const {
      financas,
      getItem,
      setItem,
      armazenamento,
      analise,
      dadosReconciliacao
    } = await prepararCenario()

    const antes = armazenamento()
    const leituraOriginal = getItem.getMockImplementation()

    getItem.mockImplementation(chave => {
      const texto = leituraOriginal(chave)

      if (chave === CHAVE && setItem.mock.calls.length > 0) {
        const dados = JSON.parse(texto)
        dados.revisaoAdministrativaTransferencias = 999
        return JSON.stringify(dados)
      }

      return texto
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const resultado =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(resultado).toBe(false)
    expect(setItem).toHaveBeenCalledOnce()
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.historicoRegularizacoesTecnicas.value).toEqual([analise])
    expect(armazenamento().contas).toEqual(antes.contas)
    expect(armazenamento().transferencias).toEqual(antes.transferencias)
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('K39-T03 - impede identificador duplicado', async () => {
    const {
      financas,
      setItem,
      armazenamento,
      dadosReconciliacao
    } = await prepararCenario()

    const primeiro =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(primeiro).toBe(true)

    const depoisPrimeiro = armazenamento()

    setItem.mockClear()

    const segundo =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(segundo).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expect(armazenamento()).toEqual(depoisPrimeiro)
    expect(
      armazenamento().historicoRegularizacoesTecnicas
    ).toHaveLength(2)
  })
})

describe('K.3.10 - recuperacao idempotente administrativa', () => {
  async function prepararRecuperacao() {
    const request = simularBloqueioDisponivel()

    const contexto = await preparar()
    const {
      financas,
      alterarPersistencia
    } = contexto

    const pendencia = {
      idTentativa: 'K310-TENTATIVA',
      situacao: 'verificacao_pendente',
      situacaoPersistencia: 'indeterminada',
      motivoCodigo: 'SALDO_INSUFICIENTE',
      dataHora: '2026-11-17T12:00:00.000Z'
    }

    const analise = {
      idAnalise: 'K310-ANALISE',
      idTentativa: pendencia.idTentativa,
      responsavel: 'Analista administrativo',
      justificativa: 'Analise documentada',
      evidencias: ['Documento de analise'],
      dataHora: '2026-11-17T12:10:00.000Z',
      situacao: 'analise_registrada',
      liberaOperacoes: false
    }

    const dadosReconciliacao = {
      idReconciliacao: 'K310-RECONCILIACAO',
      idTentativa: pendencia.idTentativa,
      idAnaliseAnterior: analise.idAnalise,
      responsavel: 'Revisor independente',
      justificativa: 'Conferencia fundamentada',
      evidencias: ['Comprovante independente'],
      resultado: 'inconclusiva'
    }

    financas.pendenciasTecnicasTransferencia.value = [pendencia]
    financas.historicoRegularizacoesTecnicas.value = [analise]

    alterarPersistencia(dados => {
      dados.pendenciasTecnicasTransferencia = [pendencia]
      dados.historicoRegularizacoesTecnicas = [analise]
    })

    const registroInicial =
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(registroInicial).toBe(true)

    return {
      ...contexto,
      request,
      pendencia,
      analise,
      dadosReconciliacao
    }
  }

  it('K310-T01 - reconhece registro persistido sem regravar', async () => {
    const {
      financas,
      setItem,
      armazenamento,
      dadosReconciliacao
    } = await prepararRecuperacao()

    const antes = armazenamento()
    setItem.mockClear()

    const resultado =
      await financas.recuperarConfirmacaoReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(resultado).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
    expect(armazenamento()).toEqual(antes)
    expect(
      armazenamento().historicoRegularizacoesTecnicas
    ).toHaveLength(2)
    expect(
      armazenamento().pendenciasTecnicasTransferencia
    ).toEqual(antes.pendenciasTecnicasTransferencia)
    expect(armazenamento().contas).toEqual(antes.contas)
    expect(armazenamento().transferencias).toEqual(antes.transferencias)
  })

  it('K310-T02 - rejeita registro divergente e protege armazenamento', async () => {
    const {
      financas,
      setItem,
      armazenamento,
      dadosReconciliacao
    } = await prepararRecuperacao()

    const antes = armazenamento()
    setItem.mockClear()

    const consoleSpy =
      vi.spyOn(console, 'error').mockImplementation(() => {})

    const resultado =
      await financas.recuperarConfirmacaoReconciliacaoAdministrativaTransferencia({
        ...dadosReconciliacao,
        resultado: 'execucao_comprovada'
      })

    expect(resultado).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expect(armazenamento()).toEqual(antes)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('K310-T03 - rejeita identificador ambiguo sem gravar', async () => {
    const {
      financas,
      setItem,
      alterarPersistencia,
      armazenamento,
      dadosReconciliacao
    } = await prepararRecuperacao()

    alterarPersistencia(dados => {
      const registro =
        dados.historicoRegularizacoesTecnicas.find(
          item =>
            item.idReconciliacao ===
            dadosReconciliacao.idReconciliacao
        )

      dados.historicoRegularizacoesTecnicas.push({
        ...registro,
        dataHora: '2026-11-17T13:00:00.000Z'
      })
    })

    const antes = armazenamento()
    setItem.mockClear()

    const consoleSpy =
      vi.spyOn(console, 'error').mockImplementation(() => {})

    const resultado =
      await financas.recuperarConfirmacaoReconciliacaoAdministrativaTransferencia(
        dadosReconciliacao
      )

    expect(resultado).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expect(armazenamento()).toEqual(antes)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(consoleSpy).toHaveBeenCalled()
  })
})

describe('K.3.11 - integridade da cadeia historica', () => {
  async function prepararIntegridade() {
    simularBloqueioDisponivel()

    const contexto = await preparar()
    const { financas, alterarPersistencia } = contexto

    const pendencia = {
      idTentativa: 'K311-TENTATIVA',
      situacao: 'verificacao_pendente',
      situacaoPersistencia: 'indeterminada',
      motivoCodigo: 'SALDO_INSUFICIENTE',
      dataHora: '2026-11-17T12:00:00.000Z'
    }

    const analise = {
      idAnalise: 'K311-ANALISE',
      idTentativa: pendencia.idTentativa,
      responsavel: 'Analista administrativo',
      justificativa: 'Analise fundamentada',
      evidencias: ['Documento original'],
      dataHora: '2026-11-17T12:10:00.000Z',
      situacao: 'analise_registrada',
      liberaOperacoes: false
    }

    const reconciliacao = {
      idReconciliacao: 'K311-RECONCILIACAO',
      idTentativa: pendencia.idTentativa,
      idAnaliseAnterior: analise.idAnalise,
      responsavel: 'Revisor independente',
      justificativa: 'Reconciliacao documentada',
      evidencias: ['Comprovante independente'],
      resultado: 'inconclusiva'
    }

    financas.pendenciasTecnicasTransferencia.value = [pendencia]
    financas.historicoRegularizacoesTecnicas.value = [analise]

    alterarPersistencia(dados => {
      dados.pendenciasTecnicasTransferencia = [pendencia]
      dados.historicoRegularizacoesTecnicas = [analise]
    })

    expect(
      await financas.registrarReconciliacaoAdministrativaTransferencia(
        reconciliacao
      )
    ).toBe(true)

    return { ...contexto, reconciliacao }
  }

  async function verificarRejeicao(modificarHistorico) {
    const {
      financas,
      setItem,
      alterarPersistencia,
      armazenamento,
      reconciliacao
    } = await prepararIntegridade()

    alterarPersistencia(dados => {
      modificarHistorico(dados.historicoRegularizacoesTecnicas)
    })

    const antes = armazenamento()
    setItem.mockClear()

    const erro = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    const resultado =
      await financas.recuperarConfirmacaoReconciliacaoAdministrativaTransferencia(
        reconciliacao
      )

    expect(resultado).toBe(false)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
    expect(armazenamento()).toEqual(antes)
    expect(erro).toHaveBeenCalled()
  }

  it('K311-T01 - rejeita referencia inexistente', async () => {
    await verificarRejeicao(historico => {
      historico[0].idAnaliseAnterior = 'ANALISE-INEXISTENTE'
    })
  })

  it('K311-T02 - rejeita identificador conflitante', async () => {
    await verificarRejeicao(historico => {
      historico.push({
        idAnalise: 'K311-ANALISE',
        idTentativa: 'OUTRA-TENTATIVA',
        responsavel: 'Outro analista',
        justificativa: 'Registro conflitante',
        evidencias: ['Outro documento'],
        dataHora: '2026-11-17T13:00:00.000Z',
        liberaOperacoes: false
      })
    })
  })

  it('K311-T03 - rejeita vinculo entre tentativas diferentes', async () => {
    await verificarRejeicao(historico => {
      historico.push({
        idAnalise: 'K311-OUTRA-ANALISE',
        idTentativa: 'OUTRA-TENTATIVA',
        idAnaliseAnterior: 'K311-ANALISE',
        responsavel: 'Outro analista',
        justificativa: 'Vinculo cruzado',
        evidencias: ['Documento cruzado'],
        dataHora: '2026-11-17T13:00:00.000Z',
        liberaOperacoes: false
      })
    })
  })

  it('K311-T04 - rejeita dependencia circular', async () => {
    await verificarRejeicao(historico => {
      historico[0].idAnaliseAnterior = 'K311-RECONCILIACAO'
    })
  })
})