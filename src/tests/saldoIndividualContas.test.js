import { describe, it, expect, afterEach, vi } from 'vitest'

const criarConta = (id, saldoInicial, ativa = true) => ({
  id,
  nome: `Conta ${id}`,
  instituicao: `Banco ${id}`,
  tipo: 'corrente',
  agencia: '',
  numero: '',
  saldoInicial,
  ativa,
  principal: id === 1,
  dataCriacao: '2026-11-01'
})

const criarTransacao = (id, contaId, tipo, valor, data) => ({
  id,
  contaId,
  descricao: `Movimentação ${id}`,
  valor,
  tipo,
  categoria: 'Outros',
  data
})

async function prepararFinancas({
  contas,
  transacoes = [],
  mes = new Date(2026, 10, 1)
}) {
  const dados = {
    versaoDados: 2,
    saldoInicial: contas[0]?.saldoInicial ?? 0,
    proximoId: transacoes.length + 1,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    contas,
    transacoes,
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: []
  }

  const getItem = vi.fn(() => JSON.stringify(dados))
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', { getItem, setItem })

  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()
  financas.mesSelecionado.value = mes

  expect(financas.armazenamentoProtegido.value).toBe(false)

  return { financas, setItem }
}

describe('Nexus Finanças — saldo individual das contas', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('preserva saldo inicial positivo', async () => {
    const { financas, setItem } = await prepararFinancas({
      contas: [criarConta(1, 500)]
    })

    expect(financas.saldoDaConta(1)).toBe(500)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserva saldo inicial negativo', async () => {
    const { financas } = await prepararFinancas({
      contas: [criarConta(1, -100)]
    })

    expect(financas.saldoDaConta(1)).toBe(-100)
  })

  it('aceita saldo inicial zero', async () => {
    const { financas } = await prepararFinancas({
      contas: [criarConta(1, 0)]
    })

    expect(financas.saldoDaConta(1)).toBe(0)
  })

  it('soma receitas vinculadas à conta', async () => {
    const { financas } = await prepararFinancas({
      contas: [criarConta(1, 100)],
      transacoes: [
        criarTransacao(1, 1, 'receita', 300, '2026-11-10')
      ]
    })

    expect(financas.saldoDaConta(1)).toBe(400)
  })

  it('subtrai despesas vinculadas à conta', async () => {
    const { financas } = await prepararFinancas({
      contas: [criarConta(1, 500)],
      transacoes: [
        criarTransacao(1, 1, 'despesa', 150, '2026-11-10')
      ]
    })

    expect(financas.saldoDaConta(1)).toBe(350)
  })

  it('não mistura movimentações de contas diferentes', async () => {
    const { financas } = await prepararFinancas({
      contas: [
        criarConta(1, 500),
        criarConta(2, 200)
      ],
      transacoes: [
        criarTransacao(1, 1, 'receita', 100, '2026-11-10'),
        criarTransacao(2, 2, 'despesa', 50, '2026-11-11')
      ]
    })

    expect(financas.saldoDaConta(1)).toBe(600)
    expect(financas.saldoDaConta(2)).toBe(150)
  })

  it('respeita o último dia do mês selecionado', async () => {
    const { financas } = await prepararFinancas({
      contas: [criarConta(1, 100)],
      transacoes: [
        criarTransacao(1, 1, 'receita', 200, '2026-11-30'),
        criarTransacao(2, 1, 'despesa', 50, '2026-12-01')
      ]
    })

    expect(financas.saldoDaConta(1)).toBe(300)

    financas.mesSelecionado.value = new Date(2026, 11, 1)

    expect(financas.saldoDaConta(1)).toBe(250)
  })

  it('retorna null para conta inexistente', async () => {
    const { financas } = await prepararFinancas({
      contas: [criarConta(1, 100)]
    })

    expect(financas.saldoDaConta(999)).toBeNull()
  })

  it('mantém consistência com o saldo consolidado', async () => {
    const { financas, setItem } = await prepararFinancas({
      contas: [
        criarConta(1, 500),
        criarConta(2, -100, false)
      ],
      transacoes: [
        criarTransacao(1, 1, 'receita', 300, '2026-11-10'),
        criarTransacao(2, 1, 'despesa', 100, '2026-11-11'),
        criarTransacao(3, 2, 'receita', 50, '2026-11-12')
      ]
    })

    expect(financas.saldoDaConta(1)).toBe(700)
    expect(financas.saldoDaConta(2)).toBe(-50)

    const somaIndividual = financas.contas.value.reduce(
      (total, conta) => total + financas.saldoDaConta(conta.id),
      0
    )

    expect(somaIndividual).toBe(650)
    expect(somaIndividual).toBe(financas.saldo())
    expect(setItem).not.toHaveBeenCalled()
  })
})