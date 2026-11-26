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
        nome: 'Conta principal',
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

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Integracao — precisao monetaria das transferencias', () => {
  it('preserva os centavos na execucao, persistencia e recuperacao', async () => {
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
    expect(financas.saldoDaConta(2)).toBe(500)
    expect(financas.saldo()).toBe(600)

    const resultado = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 33.33,
      tarifa: 0.17
    })

    expect(resultado).toBe(true)
    expect(setItem).toHaveBeenCalled()

    // Comparacao monetaria exata em centavos.
    expect(Math.round(financas.saldoDaConta(1) * 100)).toBe(6650)
    expect(Math.round(financas.saldoDaConta(2) * 100)).toBe(53333)
    expect(Math.round(financas.saldo() * 100)).toBe(59983)

    expect(financas.transferencias.value).toHaveLength(1)
    expect(financas.transacoes.value).toEqual([])

    const dadosPersistidos = JSON.parse(armazenamentoAtual)

    expect(dadosPersistidos.transferencias).toHaveLength(1)
    expect(dadosPersistidos.transacoes).toEqual([])

    const transferencia = dadosPersistidos.transferencias[0]

    expect(transferencia).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 33.33,
      tarifa: 0.17,
      status: 'executada'
    })

    expect(Number.isSafeInteger(transferencia.id)).toBe(true)
    expect(transferencia.id).toBeGreaterThan(0)

    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)
    expect(recuperado.transferencias.value).toHaveLength(1)
    expect(recuperado.transacoes.value).toEqual([])

    expect(Math.round(recuperado.saldoDaConta(1) * 100)).toBe(6650)
    expect(Math.round(recuperado.saldoDaConta(2) * 100)).toBe(53333)
    expect(Math.round(recuperado.saldo() * 100)).toBe(59983)
  })
})