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
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: [],
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
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
    }]
  }
}

async function preparar(valor, falhaLeitura = false) {
  let armazenamento =
    valor === null ? null : JSON.stringify(valor)

  const getItem = vi.fn(chave => {
    if (falhaLeitura) {
      throw new Error('Falha simulada')
    }

    return chave === CHAVE ? armazenamento : null
  })

  const setItem = vi.fn((chave, novoValor) => {
    if (chave === CHAVE) {
      armazenamento = novoValor
    }
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  getItem.mockClear()
  setItem.mockClear()

  return { financas, getItem, setItem }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Consulta administrativa somente leitura', () => {
  it('consulta dados validos sem gravar', async () => {
    const { financas, getItem, setItem } =
      await preparar(criarDados())

    const resultado = financas.consultarDadosAdministrativos()

    expect(resultado.estado).toBe('valido')
    expect(resultado.colecoes).not.toBeNull()
    expect(getItem).toHaveBeenCalledWith(CHAVE)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('identifica armazenamento vazio', async () => {
    const { financas, getItem, setItem } =
      await preparar(criarDados())

    getItem.mockReturnValue(null)

    expect(
      financas.consultarDadosAdministrativos().estado
    ).toBe('vazio')

    expect(getItem).toHaveBeenCalledWith(CHAVE)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('diferencia falha de acesso ao armazenamento', async () => {
    const { financas, setItem } =
      await preparar(criarDados(), true)

    expect(
      financas.consultarDadosAdministrativos().estado
    ).toBe('falha')

    expect(setItem).not.toHaveBeenCalled()
  })

  it('classifica JSON invalido como inconsistente', async () => {
    const { financas, getItem, setItem } =
      await preparar(criarDados())

    getItem.mockReturnValue('{invalido')

    expect(
      financas.consultarDadosAdministrativos().estado
    ).toBe('inconsistente')

    expect(setItem).not.toHaveBeenCalled()
  })

  it('bloqueia consulta validada de dados legados', async () => {
    const dados = criarDados()
    delete dados.contas

    const { financas, getItem, setItem } =
      await preparar(criarDados())

    getItem.mockReturnValue(JSON.stringify(dados))

    expect(
      financas.consultarDadosAdministrativos().estado
    ).toBe('inconsistente')

    expect(setItem).not.toHaveBeenCalled()
  })

  it('rejeita vinculos bancarios inexistentes', async () => {
    const dados = criarDados()

    dados.transacoes = [{
      id: 1,
      descricao: 'Teste',
      valor: 100,
      tipo: 'receita',
      categoria: 'Outros',
      data: '2026-11-01',
      contaId: 999
    }]

    const { financas, getItem, setItem } =
      await preparar(criarDados())

    getItem.mockReturnValue(JSON.stringify(dados))

    expect(
      financas.consultarDadosAdministrativos().estado
    ).toBe('inconsistente')

    expect(setItem).not.toHaveBeenCalled()
  })

  it('aceita historico legitimo de analise administrativa', async () => {
    const dados = criarDados()

    dados.historicoRegularizacoesTecnicas = [{
      idAnalise: 'analise-teste-001',
      idTentativa: 'tentativa-teste-001',
      responsavel: 'Responsavel de teste',
      justificativa: 'Verificacao administrativa documentada',
      evidencias: ['Evidencia simulada'],
      dataHora: '2026-11-18T12:00:00.000Z',
      situacao: 'analise_registrada',
      liberaOperacoes: false
    }]

    const { financas, getItem, setItem } =
      await preparar(criarDados())

    getItem.mockReturnValue(JSON.stringify(dados))

    const resultado = financas.consultarDadosAdministrativos()

    expect(resultado.estado).toBe('valido')
    expect(resultado.colecoes.historicoRegularizacoesTecnicas)
      .toHaveLength(1)
    expect(setItem).not.toHaveBeenCalled()
  })
  it('aceita reconciliacao administrativa vinculada', async () => {
    const dados = criarDados()

    dados.historicoRegularizacoesTecnicas = [
      {
        idAnalise: 'analise-teste-001',
        idTentativa: 'tentativa-teste-001',
        responsavel: 'Responsavel de teste',
        justificativa: 'Analise administrativa documentada',
        evidencias: ['Evidencia inicial'],
        dataHora: '2026-11-18T12:00:00.000Z',
        situacao: 'analise_registrada',
        liberaOperacoes: false
      },
      {
        tipo: 'reconciliacao_administrativa',
        idReconciliacao: 'reconciliacao-teste-001',
        idTentativa: 'tentativa-teste-001',
        responsavel: 'Responsavel de teste',
        justificativa: 'Reconciliacao administrativa documentada',
        evidencias: ['Evidencia complementar'],
        resultado: 'verificacao_pendente',
        dataHora: '2026-11-18T12:10:00.000Z',
        liberaOperacoes: false,
        idAnaliseAnterior: 'analise-teste-001'
      }
    ]

    const { financas, getItem, setItem } =
      await preparar(criarDados())

    getItem.mockReturnValue(JSON.stringify(dados))

    const resultado = financas.consultarDadosAdministrativos()

    expect(resultado.estado).toBe('valido')
    expect(resultado.colecoes.historicoRegularizacoesTecnicas)
      .toHaveLength(2)

    expect(
      resultado.colecoes.historicoRegularizacoesTecnicas[1]
        .idAnaliseAnterior
    ).toBe('analise-teste-001')

    expect(getItem).toHaveBeenCalledWith(CHAVE)
    expect(setItem).not.toHaveBeenCalled()
  })
  it('rejeita historico administrativo incompativel', async () => {
    const dados = criarDados()

    dados.historicoRegularizacoesTecnicas = [{
      id: 'registro-incompativel'
    }]

    const { financas, getItem, setItem } =
      await preparar(criarDados())

    getItem.mockReturnValue(JSON.stringify(dados))

    expect(
      financas.consultarDadosAdministrativos().estado
    ).toBe('inconsistente')

    expect(setItem).not.toHaveBeenCalled()
  })
})