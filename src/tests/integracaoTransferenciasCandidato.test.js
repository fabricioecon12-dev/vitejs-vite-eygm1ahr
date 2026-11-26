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

function criarArmazenamento(dados) {
  let conteudo = JSON.stringify(dados)

  const getItem = vi.fn(chave =>
    chave === CHAVE ? conteudo : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (chave === CHAVE) {
      conteudo = valor
    }
  })

  vi.stubGlobal('localStorage', { getItem, setItem })

  return {
    setItem,
    obterDados: () => JSON.parse(conteudo)
  }
}

async function carregarComposable() {
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.candidato-A.38.4.22.js'
  )

  return useFinancas()
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Integracao real das transferencias bancarias', () => {
  it('executa, persiste, atualiza saldos e recupera a transferencia', async () => {
    const armazenamento = criarArmazenamento(criarDados())

    const financas = await carregarComposable()

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.transferencias.value).toHaveLength(0)

    financas.mesSelecionado.value = new Date()

    expect(financas.saldoDaConta(1)).toBe(1000)
    expect(financas.saldoDaConta(2)).toBe(500)

    const resultado = financas.executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2
    })

    expect(resultado).toBe(true)
    expect(armazenamento.setItem).toHaveBeenCalled()

    const dadosPersistidos = armazenamento.obterDados()

    expect(dadosPersistidos.transferencias).toHaveLength(1)

    const transferencia = dadosPersistidos.transferencias[0]

    expect(transferencia).toMatchObject({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 100,
      tarifa: 2,
      status: 'executada'
    })

    expect(Number.isSafeInteger(transferencia.id)).toBe(true)
    expect(transferencia.id).toBeGreaterThan(0)

    expect(dadosPersistidos.transacoes).toEqual([])
    expect(financas.transacoes.value).toEqual([])

    expect(financas.saldoDaConta(1)).toBe(898)
    expect(financas.saldoDaConta(2)).toBe(600)
    expect(financas.saldo()).toBe(1498)

    expect(financas.transferencias.value).toHaveLength(1)

    const financasRecarregadas = await carregarComposable()

    financasRecarregadas.mesSelecionado.value = new Date()

    expect(financasRecarregadas.armazenamentoProtegido.value).toBe(false)
    expect(financasRecarregadas.transferencias.value).toHaveLength(1)

    expect(financasRecarregadas.saldoDaConta(1)).toBe(898)
    expect(financasRecarregadas.saldoDaConta(2)).toBe(600)
    expect(financasRecarregadas.saldo()).toBe(1498)

    expect(financasRecarregadas.transacoes.value).toEqual([])
  })
})