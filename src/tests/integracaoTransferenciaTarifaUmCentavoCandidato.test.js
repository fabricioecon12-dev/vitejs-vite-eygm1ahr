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

describe('Integracao — transferencia com tarifa de um centavo', () => {
  it('desconta e persiste tarifa minima sem divergencia monetaria', async () => {
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
      valor: 25,
      tarifa: 0.01
    })

    expect(executada).toBe(true)

    // A origem paga valor e tarifa; o destino recebe apenas o valor.
    expect(Math.round(financas.saldoDaConta(1) * 100)).toBe(7499)
    expect(Math.round(financas.saldoDaConta(2) * 100)).toBe(7500)

    // O consolidado diminui exclusivamente pelo valor da tarifa.
    expect(Math.round(financas.saldo() * 100)).toBe(14999)

    expect(financas.transferencias.value).toHaveLength(1)
    expect(financas.transacoes.value).toEqual([])

    expect(setItem.mock.calls.length).toBeGreaterThan(chamadasIniciais)

    const dadosPersistidos = JSON.parse(armazenamentoAtual)

    expect(dadosPersistidos.transferencias).toHaveLength(1)
    expect(dadosPersistidos.transacoes).toEqual([])

    expect(dadosPersistidos.transferencias[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 25,
      tarifa: 0.01,
      status: 'executada'
    })

    expect(
      Math.round(dadosPersistidos.transferencias[0].tarifa * 100)
    ).toBe(1)

    // Recuperacao dos dados persistidos.
    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)

    expect(Math.round(recuperado.saldoDaConta(1) * 100)).toBe(7499)
    expect(Math.round(recuperado.saldoDaConta(2) * 100)).toBe(7500)
    expect(Math.round(recuperado.saldo() * 100)).toBe(14999)

    expect(recuperado.transferencias.value).toHaveLength(1)
    expect(recuperado.transacoes.value).toEqual([])

    expect(recuperado.transferencias.value[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 25,
      tarifa: 0.01,
      status: 'executada'
    })
  })
})