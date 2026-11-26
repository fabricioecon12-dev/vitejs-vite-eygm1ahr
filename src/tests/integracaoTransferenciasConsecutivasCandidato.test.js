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

describe('Integracao — transferencias consecutivas', () => {
  it('atualiza os saldos e preserva dois registros independentes', async () => {
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

    // Primeira transferencia: A -> B.
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

    // Segunda transferencia: B -> A.
    const segunda = financas.executarTransferencia({
      contaOrigemId: 2,
      contaDestinoId: 1,
      valor: 50,
      tarifa: 1
    })

    expect(segunda).toBe(true)

    expect(financas.saldoDaConta(1)).toBe(848)
    expect(financas.saldoDaConta(2)).toBe(649)
    expect(financas.saldo()).toBe(1497)

    expect(financas.transferencias.value).toHaveLength(2)
    expect(financas.transacoes.value).toEqual([])

    const dadosPersistidos = JSON.parse(armazenamentoAtual)

    expect(dadosPersistidos.transferencias).toHaveLength(2)
    expect(dadosPersistidos.transacoes).toEqual([])

    const registros = dadosPersistidos.transferencias

    const transferenciaAB = registros.find(
      item =>
        item.contaOrigemId === 1 &&
        item.contaDestinoId === 2 &&
        item.valor === 200 &&
        item.tarifa === 2
    )

    const transferenciaBA = registros.find(
      item =>
        item.contaOrigemId === 2 &&
        item.contaDestinoId === 1 &&
        item.valor === 50 &&
        item.tarifa === 1
    )

    expect(transferenciaAB).toBeDefined()
    expect(transferenciaBA).toBeDefined()

    expect(transferenciaAB.status).toBe('executada')
    expect(transferenciaBA.status).toBe('executada')

    expect(Number.isSafeInteger(transferenciaAB.id)).toBe(true)
    expect(Number.isSafeInteger(transferenciaBA.id)).toBe(true)
    expect(transferenciaAB.id).not.toBe(transferenciaBA.id)

    expect(setItem).toHaveBeenCalled()

    // Recuperacao do armazenamento persistido.
    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)
    expect(recuperado.saldoDaConta(1)).toBe(848)
    expect(recuperado.saldoDaConta(2)).toBe(649)
    expect(recuperado.saldo()).toBe(1497)

    expect(recuperado.transferencias.value).toHaveLength(2)
    expect(recuperado.transacoes.value).toEqual([])
  })
})