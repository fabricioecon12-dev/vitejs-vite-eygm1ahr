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

async function preparar(pendencias = []) {
  let armazenamento = JSON.stringify(criarDados(pendencias))

  const getItem = vi.fn(chave =>
    chave === CHAVE ? armazenamento : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (chave === CHAVE) armazenamento = valor
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value).toBe(false)
  expect(financas.contas.value).toHaveLength(2)

  return {
    financas,
    getItem,
    setItem,
    armazenamento: () => armazenamento
  }
}

const pendencia = {
  idTentativa: 'G10L8-TESTE-001',
  situacao: 'verificacao_pendente',
  motivo: 'Falha tecnica simulada'
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('G.10-L.8 — bloqueios tecnicos', () => {
  it('T01 bloqueia transferencia diante de pendencia', async () => {
    const { financas, armazenamento } = await preparar([pendencia])
    const antes = armazenamento()

    const resultado = financas.executarTransferencia({
      idTentativa: 'G10L8-TRANSFERENCIA-001',
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 0,
      data: '2026-11-17'
    })

    expect(resultado).toBe(false)
    expect(financas.transferencias.value).toHaveLength(0)
    expect(armazenamento()).toBe(antes)
  })

  it('T02 bloqueia cadastro de categoria', async () => {
    const { financas, armazenamento } = await preparar([pendencia])
    const antes = armazenamento()
    const categoriasAntes = [...financas.categoriasDespesa.value]

    const resultado = financas.adicionarCategoria(
      'Categoria teste G10L8',
      'despesa'
    )

    expect(resultado).toBe(false)
    expect(financas.categoriasDespesa.value).toEqual(categoriasAntes)
    expect(armazenamento()).toBe(antes)
  })

  it('T03 preserva saldos e movimentacoes', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    const antes = armazenamento()
    const copiarDados = valor =>
      JSON.parse(JSON.stringify(valor))

    const contasAntes = copiarDados(financas.contas.value)
    const transacoesAntes = copiarDados(financas.transacoes.value)
    const transferenciasAntes = copiarDados(
      financas.transferencias.value
    )

    const resultado = financas.executarTransferencia({
      idTentativa: 'G10L8-TRANSFERENCIA-002',
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 250,
      tarifa: 0,
      data: '2026-11-17'
    })

    expect(resultado).toBe(false)
    expect(financas.contas.value).toEqual(contasAntes)
    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.transferencias.value).toEqual(transferenciasAntes)
    expect(armazenamento()).toBe(antes)
  })

  it('T04 recupera pendencia tecnica persistida', async () => {
    const { financas, armazenamento } = await preparar([pendencia])

    expect(financas.pendenciasTecnicasTransferencia.value)
      .toHaveLength(1)

    expect(financas.pendenciasTecnicasTransferencia.value[0].idTentativa)
      .toBe(pendencia.idTentativa)

    const dadosPersistidos = JSON.parse(armazenamento())

    expect(dadosPersistidos.pendenciasTecnicasTransferencia)
      .toHaveLength(1)

    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const restaurado = useFinancas()

    expect(restaurado.pendenciasTecnicasTransferencia.value)
      .toHaveLength(1)

    expect(restaurado.pendenciasTecnicasTransferencia.value[0].idTentativa)
      .toBe(pendencia.idTentativa)
  })

  it('T05 permite cadastro sem impedimentos', async () => {
    const { financas, armazenamento } = await preparar()

    expect(financas.pendenciasTecnicasTransferencia.value)
      .toHaveLength(0)

    const resultado = financas.adicionarCategoria(
      'Categoria livre G10L8',
      'despesa'
    )

    expect(resultado).toBe(true)

    expect(financas.categoriasDespesa.value)
      .toContain('Categoria livre G10L8')

    expect(
      JSON.parse(armazenamento()).categoriasDespesa
    ).toContain('Categoria livre G10L8')
  })
})