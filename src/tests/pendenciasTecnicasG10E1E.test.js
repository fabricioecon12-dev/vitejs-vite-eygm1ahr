import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarDados(pendencias = []) {
  return {
    versaoDados: 2,
    saldoInicial: 1000,
    proximoId: 1,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [],
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: pendencias,
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
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

async function preparar(pendencias = [], dadosAdicionais = {}) {
  let armazenamento = JSON.stringify({ ...criarDados(pendencias), ...dadosAdicionais })
  let falharGravacao = false

  const getItem = vi.fn(chave =>
    chave === CHAVE ? armazenamento : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (falharGravacao) {
      throw new Error('Falha simulada de persistencia')
    }

    if (chave === CHAVE) {
      armazenamento = valor
    }
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.stubGlobal('navigator', {
    locks: {
      request: vi.fn(async (nome, opcoes, operacao) => {
        expect(nome).toBe(
          'nexus-financas-reconciliacao-administrativa'
        )

        expect(opcoes).toEqual({
          mode: 'exclusive',
          ifAvailable: true
        })

        return operacao({
          name: nome,
          mode: 'exclusive'
        })
      })
    }
  })
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value).toBe(false)

  return {
    financas,
    setItem,
    armazenamento: () => JSON.parse(armazenamento),
    falharProximaGravacao: () => {
      falharGravacao = true
    }
  }
}

const tentativa = {
  idTentativa: 'G10-E1E-001',
  situacaoPersistencia: 'indeterminada',
  motivoCodigo: 'SALDO_INSUFICIENTE'
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('G.10-L.9-E.1-E — pendencias tecnicas', () => {
  it('T01 registra uma nova pendencia valida', async () => {
    const { financas, armazenamento } = await preparar()

    const resultado =
      financas.registrarPendenciaTecnicaTransferencia(tentativa)

    expect(resultado).toBe(true)
    expect(financas.pendenciasTecnicasTransferencia.value)
      .toHaveLength(1)

    expect(armazenamento().pendenciasTecnicasTransferencia)
      .toHaveLength(1)

    expect(armazenamento().transferencias).toHaveLength(0)
  })

  it('T02 nao duplica tentativa compativel', async () => {
    const { financas, armazenamento, setItem } = await preparar()

    expect(
      financas.registrarPendenciaTecnicaTransferencia(tentativa)
    ).toBe(true)

    const gravacoesAntes = setItem.mock.calls.length

    const resultado =
      financas.registrarPendenciaTecnicaTransferencia(tentativa)

    expect(resultado).toBe(true)
    expect(setItem.mock.calls.length).toBe(gravacoesAntes)
    expect(armazenamento().pendenciasTecnicasTransferencia)
      .toHaveLength(1)
  })

  it('T03 bloqueia duplicidade conflitante', async () => {
    const { financas, armazenamento } = await preparar()

    expect(
      financas.registrarPendenciaTecnicaTransferencia(tentativa)
    ).toBe(true)

    const antes = JSON.stringify(armazenamento())

    const resultado =
      financas.registrarPendenciaTecnicaTransferencia({
        ...tentativa,
        motivoCodigo: 'CONTA_INATIVA'
      })

    expect(resultado).toBe(false)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(JSON.stringify(armazenamento())).toBe(antes)
  })

  it('T04 bloqueia divergencia entre memoria e armazenamento', async () => {
    const { financas, armazenamento } = await preparar()

    financas.pendenciasTecnicasTransferencia.value.push({
      idTentativa: 'MEMORIA-NAO-PERSISTIDA',
      situacao: 'verificacao_pendente'
    })

    const antes = JSON.stringify(armazenamento())

    const resultado =
      financas.registrarPendenciaTecnicaTransferencia(tentativa)

    expect(resultado).toBe(false)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(JSON.stringify(armazenamento())).toBe(antes)
  })

  it('T05 preserva evidencia quando gravacao falha', async () => {
    const {
      financas,
      armazenamento,
      falharProximaGravacao
    } = await preparar()

    falharProximaGravacao()

    const resultado =
      financas.registrarPendenciaTecnicaTransferencia(tentativa)

    expect(resultado).toBe(false)
    expect(financas.armazenamentoProtegido.value).toBe(true)

    expect(
      financas.pendenciasTecnicasTransferencia.value.some(
        item => item.idTentativa === tentativa.idTentativa
      )
    ).toBe(true)

    expect(armazenamento().pendenciasTecnicasTransferencia)
      .toHaveLength(0)

    expect(armazenamento().transferencias).toHaveLength(0)
  })

  it('T06 integra recusa com pendencia tecnica', async () => {
    const {
      financas,
      armazenamento,
      falharProximaGravacao
    } = await preparar()

    const transferenciasAntes = JSON.stringify(
      financas.transferencias.value
    )

    const transacoesAntes = JSON.stringify(
      financas.transacoes.value
    )

    falharProximaGravacao()

    const resultado = financas.executarTransferencia({
      idTentativa: 'G10-E1E-T06-001',
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 2000,
      tarifa: 0
    })

    expect(resultado).toBe(false)

    expect(JSON.stringify(financas.transferencias.value))
      .toBe(transferenciasAntes)

    expect(JSON.stringify(financas.transacoes.value))
      .toBe(transacoesAntes)

    const resultadoTecnico =
      financas.resultadoTecnicoTransferencia.value

    expect(resultadoTecnico).not.toBeNull()
    expect(resultadoTecnico.idTentativa)
      .toBe('G10-E1E-T06-001')
    expect(resultadoTecnico.registrada).toBe(false)
    expect(resultadoTecnico.requerVerificacao).toBe(true)

    expect(
      financas.pendenciasTecnicasTransferencia.value.some(
        item =>
          item.idTentativa === 'G10-E1E-T06-001' &&
          item.situacao === 'verificacao_pendente'
      )
    ).toBe(true)

    expect(financas.armazenamentoProtegido.value)
      .toBe(true)

    expect(armazenamento().transferencias)
      .toHaveLength(0)

    expect(armazenamento().transacoes)
      .toHaveLength(0)
  })
})

describe('G.10-L.9-E.2-J — analises administrativas', () => {
  const pendencia = {
    idTentativa: 'ADMIN-J-001',
    situacao: 'verificacao_pendente',
    situacaoPersistencia: 'indeterminada',
    motivoCodigo: 'FALHA_PERSISTENCIA',
    dataHora: '2026-11-17T12:00:00.000Z'
  }

  function analise(idAnalise = 'ANALISE-J-001') {
    return {
      idAnalise,
      idTentativa: pendencia.idTentativa,
      responsavel: 'Responsavel de teste',
      justificativa: 'Verificacao administrativa documentada',
      evidencias: ['Registro tecnico identificado']
    }
  }

  it('T07 registra analise administrativa valida', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    const resultado =
      await financas.registrarAnaliseAdministrativaTransferencia(analise())

    expect(resultado).toBe(true)

    const historico = armazenamento().historicoRegularizacoesTecnicas

    expect(historico).toHaveLength(1)
    expect(historico[0].idAnalise).toBe('ANALISE-J-001')
    expect(historico[0].liberaOperacoes).toBe(false)

    expect(financas.historicoRegularizacoesTecnicas.value)
      .toHaveLength(1)
  })

  it('T08 rejeita dados administrativos invalidos', async () => {
    const { financas, armazenamento } = await preparar([pendencia])
    const antes = JSON.stringify(armazenamento())

    const resultado =
      await financas.registrarAnaliseAdministrativaTransferencia({
        ...analise(),
        justificativa: ' ',
        evidencias: []
      })

    expect(resultado).toBe(false)
    expect(JSON.stringify(armazenamento())).toBe(antes)
  })

  it('T09 rejeita identificador administrativo duplicado', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    expect(
      await financas.registrarAnaliseAdministrativaTransferencia(analise())
    ).toBe(true)

    const antes = JSON.stringify(armazenamento())

    const resultado =
      await financas.registrarAnaliseAdministrativaTransferencia(analise())

    expect(resultado).toBe(false)
    expect(JSON.stringify(armazenamento())).toBe(antes)
    expect(armazenamento().historicoRegularizacoesTecnicas)
      .toHaveLength(1)
  })

  it('T10 preserva pendencias e dados financeiros', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    const antes = armazenamento()

    expect(
      await financas.registrarAnaliseAdministrativaTransferencia(analise())
    ).toBe(true)

    const depois = armazenamento()

    for (const campo of [
      'pendenciasTecnicasTransferencia',
      'bloqueiosTecnicosTransferencia',
      'inconsistenciasPendenciasTecnicas',
      'transacoes',
      'transferencias',
      'contas',
      'saldoInicial'
    ]) {
      expect(depois[campo]).toEqual(antes[campo])
    }

    expect(financas.pendenciasTecnicasTransferencia.value)
      .toHaveLength(1)
  })

  it('T11 bloqueia divergencia entre memoria e armazenamento', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    financas.historicoRegularizacoesTecnicas.value.push({
      idAnalise: 'REGISTRO-NAO-PERSISTIDO'
    })

    const antes = JSON.stringify(armazenamento())

    const resultado =
      await financas.registrarAnaliseAdministrativaTransferencia(analise())

    expect(resultado).toBe(false)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(JSON.stringify(armazenamento())).toBe(antes)
  })

  it('T12 protege armazenamento diante de falha de gravacao', async () => {
    const {
      financas,
      armazenamento,
      falharProximaGravacao
    } = await preparar([pendencia])

    const antes = JSON.stringify(armazenamento())

    falharProximaGravacao()

    const resultado =
      await financas.registrarAnaliseAdministrativaTransferencia(analise())

    expect(resultado).toBe(false)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(JSON.stringify(armazenamento())).toBe(antes)
  })

  it('G7.3.7-T01 incrementa revisao de zero para um', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    expect(armazenamento().revisaoAdministrativaTransferencias ?? 0).toBe(0)

    expect(
      await financas.registrarAnaliseAdministrativaTransferencia(analise())
    ).toBe(true)

    expect(armazenamento().revisaoAdministrativaTransferencias).toBe(1)
  })

  it('G7.3.7-T02 incrementa revisao em analises sucessivas', async () => {
    const segundaPendencia = {
      ...pendencia,
      idTentativa: 'ADMIN-J-002'
    }

    const { financas, armazenamento } = await preparar([
      pendencia,
      segundaPendencia
    ])

    expect(
      await financas.registrarAnaliseAdministrativaTransferencia(analise())
    ).toBe(true)

    expect(armazenamento().revisaoAdministrativaTransferencias).toBe(1)

    expect(
      await financas.registrarAnaliseAdministrativaTransferencia({
        ...analise('ANALISE-J-002'),
        idTentativa: segundaPendencia.idTentativa
      })
    ).toBe(true)

    expect(armazenamento().revisaoAdministrativaTransferencias).toBe(2)
    expect(armazenamento().historicoRegularizacoesTecnicas).toHaveLength(2)
  })

  it('G7.3.7-T03 nao incrementa revisao quando a analise e recusada', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    const antes = JSON.stringify(armazenamento())

    const resultado =
      await financas.registrarAnaliseAdministrativaTransferencia({
        ...analise(),
        justificativa: ' '
      })

    expect(resultado).toBe(false)
    expect(JSON.stringify(armazenamento())).toBe(antes)
    expect(armazenamento().revisaoAdministrativaTransferencias ?? 0).toBe(0)
  })

  it('G7.3.7-T04 preserva historico anterior ao registrar nova analise', async () => {
    const registroAnterior = {
      idAnalise: 'ANALISE-ANTERIOR',
      idTentativa: 'ADMIN-ANTERIOR',
      responsavel: 'Responsavel anterior',
      justificativa: 'Registro historico preservado',
      evidencias: ['Evidencia anterior'],
      dataHora: '2026-11-01T12:00:00.000Z',
      situacao: 'analise_registrada',
      liberaOperacoes: false
    }

    const { financas, armazenamento } = await preparar(
      [pendencia],
      {
        revisaoAdministrativaTransferencias: 5,
        historicoRegularizacoesTecnicas: [registroAnterior]
      }
    )

    expect(
      await financas.registrarAnaliseAdministrativaTransferencia(analise())
    ).toBe(true)

    const dados = armazenamento()

    expect(dados.revisaoAdministrativaTransferencias).toBe(6)
    expect(dados.historicoRegularizacoesTecnicas).toHaveLength(2)
    expect(dados.historicoRegularizacoesTecnicas[0]).toEqual(registroAnterior)
    expect(dados.historicoRegularizacoesTecnicas[1].idAnalise)
      .toBe('ANALISE-J-001')
  })
})
