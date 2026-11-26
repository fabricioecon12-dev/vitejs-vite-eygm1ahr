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

async function prepararAmbiente() {
  const dadosOriginais = criarDados()
  const armazenamentoOriginal = JSON.stringify(dadosOriginais)

  let armazenamentoAtual = armazenamentoOriginal

  const getItem = vi.fn(chave =>
    chave === CHAVE ? armazenamentoAtual : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (chave === CHAVE) {
      throw new Error('Falha simulada de persistencia')
    }

    armazenamentoAtual = valor
  })

  vi.stubGlobal('localStorage', { getItem, setItem })

  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.candidato-A.38.4.22.js'
  )

  return {
    financas: useFinancas(),
    getItem,
    setItem,
    armazenamentoOriginal,
    obterArmazenamento: () => armazenamentoAtual
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Integracao real — falha de persistencia de transferencia', () => {
  it('preserva saldos e registros quando a gravacao falha', async () => {
    const ambiente = await prepararAmbiente()

    const {
      financas,
      setItem,
      armazenamentoOriginal,
      obterArmazenamento
    } = ambiente

    expect(financas.armazenamentoProtegido.value).toBe(false)

    financas.mesSelecionado.value = new Date()

    const saldoOrigemAntes = financas.saldoDaConta(1)
    const saldoDestinoAntes = financas.saldoDaConta(2)
    const saldoConsolidadoAntes = financas.saldo()

    const transferenciasAntes = JSON.parse(
      JSON.stringify(financas.transferencias.value)
    )

    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )

    expect(saldoOrigemAntes).toBe(1000)
    expect(saldoDestinoAntes).toBe(500)
    expect(saldoConsolidadoAntes).toBe(1500)

    const resultado = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2
    })

    expect(resultado).toBe(false)

    expect(setItem).toHaveBeenCalledWith(
      CHAVE,
      expect.any(String)
    )

    // A falha nao pode alterar os saldos reativos.
    expect(financas.saldoDaConta(1)).toBe(saldoOrigemAntes)
    expect(financas.saldoDaConta(2)).toBe(saldoDestinoAntes)
    expect(financas.saldo()).toBe(saldoConsolidadoAntes)

    // Nenhuma transferencia pode ser concluida.
    expect(financas.transferencias.value).toEqual(
      transferenciasAntes
    )

    // Nenhuma receita ou despesa artificial.
    expect(financas.transacoes.value).toEqual(transacoesAntes)

    // Os dados persistidos permanecem identicos.
    expect(obterArmazenamento()).toBe(armazenamentoOriginal)

    // Confirma recuperacao segura apos reinicializacao.
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.candidato-A.38.4.22.js'
    )

    const recuperado = useFinancas()

    recuperado.mesSelecionado.value = new Date()

    expect(recuperado.armazenamentoProtegido.value).toBe(false)
    expect(recuperado.transferencias.value).toEqual([])
    expect(recuperado.transacoes.value).toEqual([])
    expect(recuperado.saldoDaConta(1)).toBe(1000)
    expect(recuperado.saldoDaConta(2)).toBe(500)
    expect(recuperado.saldo()).toBe(1500)
  })
})