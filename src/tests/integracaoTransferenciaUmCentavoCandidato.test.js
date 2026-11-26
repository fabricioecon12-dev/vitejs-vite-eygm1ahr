import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarDados() {
  return {
    versaoDados: 2,
    saldoInicial: 100,
    proximoId: 1,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [],
    transferencias: [],
    contas: [
      {
        id: 1,
        nome: 'Conta A',
        instituicao: 'Banco A',
        tipo: 'corrente',
        agencia: '',
        numero: '',
        saldoInicial: 100,
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
        saldoInicial: 50,
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

describe('Integracao — transferencia de um centavo', () => {
  it('executa e recupera transferencia minima sem perda de precisao', async () => {
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
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const financas = useFinancas()
    financas.mesSelecionado.value = new Date()

    expect(financas.armazenamentoProtegido.value).toBe(false)

    expect(financas.saldoDaConta(1)).toBe(100)
    expect(financas.saldoDaConta(2)).toBe(50)
    expect(financas.saldo()).toBe(150)

    const chamadasIniciais = setItem.mock.calls.length

    const executada = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 0.01,
      tarifa: 0
    })

    expect(executada).toBe(true)

    // Comparacao monetaria com precisao de centavos.
    expect(financas.saldoDaConta(1)).toBeCloseTo(99.99, 2)
    expect(financas.saldoDaConta(2)).toBeCloseTo(50.01, 2)
    expect(financas.saldo()).toBeCloseTo(150, 2)

    expect(financas.transferencias.value).toHaveLength(1)
    expect(financas.transacoes.value).toEqual([])

    expect(setItem.mock.calls.length).toBeGreaterThan(chamadasIniciais)

    const dadosPersistidos = JSON.parse(armazenamentoAtual)

    expect(dadosPersistidos.transferencias).toHaveLength(1)
    expect(dadosPersistidos.transacoes).toEqual([])

    expect(dadosPersistidos.transferencias[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 0.01,
      tarifa: 0,
      status: 'executada'
    })

    // Verifica que o valor foi persistido em centavos exatos.
    expect(
      Math.round(dadosPersistidos.transferencias[0].valor * 100)
    ).toBe(1)

    // Recuperacao do armazenamento.
    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)

    expect(recuperado.saldoDaConta(1)).toBeCloseTo(99.99, 2)
    expect(recuperado.saldoDaConta(2)).toBeCloseTo(50.01, 2)
    expect(recuperado.saldo()).toBeCloseTo(150, 2)

    expect(recuperado.transferencias.value).toHaveLength(1)
    expect(recuperado.transacoes.value).toEqual([])

    expect(recuperado.transferencias.value[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 0.01,
      tarifa: 0,
      status: 'executada'
    })
  })
})