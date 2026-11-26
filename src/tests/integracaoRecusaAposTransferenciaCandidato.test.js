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
    contas: [
      {
        id: 1,
        nome: 'Conta A',
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
        nome: 'Conta B',
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

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Integracao — recusa apos transferencia executada', () => {
  it('preserva a primeira operacao quando a segunda e recusada', async () => {
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
    expect(financas.saldoDaConta(1)).toBe(1000)
    expect(financas.saldoDaConta(2)).toBe(500)
    expect(financas.saldo()).toBe(1500)

    // Primeira transferencia: execucao permitida.
    const primeira = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 200,
      tarifa: 2
    })

    expect(primeira).toBe(true)

    expect(financas.saldoDaConta(1)).toBe(798)
    expect(financas.saldoDaConta(2)).toBe(700)
    expect(financas.saldo()).toBe(1498)

    expect(financas.transferencias.value).toHaveLength(1)
    expect(financas.transacoes.value).toEqual([])

    const armazenamentoAposPrimeira = armazenamentoAtual
    const chamadasPersistencia = setItem.mock.calls.length

    // Segunda transferencia: saldo insuficiente.
    // Saldo disponivel: 798; total necessario: 905.
    const segunda = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 900,
      tarifa: 5
    })

    expect(segunda).toBe(false)

    // A tentativa recusada nao deve modificar o estado financeiro.
    expect(financas.saldoDaConta(1)).toBe(798)
    expect(financas.saldoDaConta(2)).toBe(700)
    expect(financas.saldo()).toBe(1498)

    expect(financas.transferencias.value).toHaveLength(1)
    expect(financas.transacoes.value).toEqual([])

    // Nenhuma nova persistencia financeira apos a recusa.
    expect(setItem.mock.calls.length).toBe(chamadasPersistencia)
    expect(armazenamentoAtual).toBe(armazenamentoAposPrimeira)

    const dadosPersistidos = JSON.parse(armazenamentoAtual)

    expect(dadosPersistidos.transferencias).toHaveLength(1)
    expect(dadosPersistidos.transacoes).toEqual([])

    expect(dadosPersistidos.transferencias[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 200,
      tarifa: 2,
      status: 'executada'
    })

    // Recuperacao dos dados persistidos.
    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)
    expect(recuperado.saldoDaConta(1)).toBe(798)
    expect(recuperado.saldoDaConta(2)).toBe(700)
    expect(recuperado.saldo()).toBe(1498)

    expect(recuperado.transferencias.value).toHaveLength(1)
    expect(recuperado.transacoes.value).toEqual([])
  })
})