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

describe('Integracao — saldo insuficiente para tarifa', () => {
  it('bloqueia integralmente transferencia cujo total supera o saldo', async () => {
    let armazenamentoAtual = JSON.stringify(criarDados())
    const armazenamentoAntes = armazenamentoAtual

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
      valor: 100,
      tarifa: 2
    })

    expect(resultado).toBe(false)
    expect(setItem).not.toHaveBeenCalled()

    expect(financas.saldoDaConta(1)).toBe(100)
    expect(financas.saldoDaConta(2)).toBe(500)
    expect(financas.saldo()).toBe(600)

    expect(financas.transferencias.value).toEqual([])
    expect(financas.transacoes.value).toEqual([])
    expect(armazenamentoAtual).toBe(armazenamentoAntes)

    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)
    expect(recuperado.saldoDaConta(1)).toBe(100)
    expect(recuperado.saldoDaConta(2)).toBe(500)
    expect(recuperado.saldo()).toBe(600)
    expect(recuperado.transferencias.value).toEqual([])
    expect(recuperado.transacoes.value).toEqual([])
  })
})