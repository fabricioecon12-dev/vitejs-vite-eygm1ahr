import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarDados() {
  return {
    versaoDados: 2,
    saldoInicial: 102,
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
        saldoInicial: 102,
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

describe('Integracao — saldo exatamente igual ao total', () => {
  it('permite transferencia que utiliza todo o saldo incluindo tarifa', async () => {
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
    expect(financas.saldoDaConta(1)).toBe(102)
    expect(financas.saldoDaConta(2)).toBe(500)
    expect(financas.saldo()).toBe(602)

    const resultado = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2
    })

    expect(resultado).toBe(true)
    expect(setItem).toHaveBeenCalled()

    expect(financas.saldoDaConta(1)).toBe(0)
    expect(financas.saldoDaConta(2)).toBe(600)
    expect(financas.saldo()).toBe(600)

    expect(financas.transferencias.value).toHaveLength(1)
    expect(financas.transacoes.value).toEqual([])

    const dadosPersistidos = JSON.parse(armazenamentoAtual)

    expect(dadosPersistidos.transferencias).toHaveLength(1)
    expect(dadosPersistidos.transacoes).toEqual([])

    expect(dadosPersistidos.transferencias[0]).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2,
      status: 'executada'
    })

    vi.resetModules()

    const { useFinancas: carregarNovamente } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = carregarNovamente()
    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)
    expect(recuperado.saldoDaConta(1)).toBe(0)
    expect(recuperado.saldoDaConta(2)).toBe(600)
    expect(recuperado.saldo()).toBe(600)
    expect(recuperado.transferencias.value).toHaveLength(1)
    expect(recuperado.transacoes.value).toEqual([])
  })
})