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

const criarTransacao = (contaId = 1) => ({
  id: 1,
  contaId,
  descricao: 'Despesa original',
  valor: 200,
  tipo: 'despesa',
  categoria: 'Outros',
  data: '2026-11-05'
})

const dadosEdicao = (contaId, descricao = 'Despesa atualizada') => ({
  contaId,
  descricao,
  valor: 200,
  tipo: 'despesa',
  categoria: 'Outros',
  data: '2026-11-05'
})

async function prepararFinancas({
  contas = [
    criarConta(1, 1000),
    criarConta(2, 500)
  ],
  falharGravacao = false
} = {}) {
  const dados = {
    versaoDados: 2,
    saldoInicial: contas[0].saldoInicial,
    proximoId: 2,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    contas,
    transacoes: [criarTransacao()],
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: [],
  }

  const getItem = vi.fn(() => JSON.stringify(dados))
  const setItem = vi.fn(() => {
    if (falharGravacao) {
      throw new Error('Falha simulada de gravação')
    }
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { useFinancas } = await import('../composables/useFinancas.js')
  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value).toBe(false)

  return { financas, setItem }
}

describe('Nexus Finanças — edição de conta vinculada à transação', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('transfere despesa entre contas ativas e recalcula os saldos', async () => {
    const { financas, setItem } = await prepararFinancas()

    expect(financas.saldoDaConta(1)).toBe(800)
    expect(financas.saldoDaConta(2)).toBe(500)

    const sucesso = financas.editar(1, dadosEdicao(2))

    expect(sucesso).toBe(true)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toHaveLength(1)
    expect(financas.transacoes.value[0].id).toBe(1)
    expect(financas.transacoes.value[0].contaId).toBe(2)
    expect(financas.saldoDaConta(1)).toBe(1000)
    expect(financas.saldoDaConta(2)).toBe(300)

    const persistido = JSON.parse(setItem.mock.lastCall[1])
    expect(persistido.transacoes).toHaveLength(1)
    expect(persistido.transacoes[0].contaId).toBe(2)
    expect(persistido.proximoId).toBe(2)
  })

  it('rejeita conta inexistente sem modificar os dados', async () => {
    const { financas, setItem } = await prepararFinancas()
    const antes = JSON.parse(JSON.stringify(financas.transacoes.value))

    const sucesso = financas.editar(1, dadosEdicao(999))

    expect(sucesso).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expect(financas.transacoes.value).toEqual(antes)
    expect(financas.saldoDaConta(1)).toBe(800)
    expect(financas.saldoDaConta(2)).toBe(500)
    expect(financas.aviso.value).toContain('não encontrada')
  })

  it('bloqueia transferência para conta inativa', async () => {
    const { financas, setItem } = await prepararFinancas({
      contas: [criarConta(1, 1000), criarConta(2, 500, false)]
    })

    const sucesso = financas.editar(1, dadosEdicao(2))

    expect(sucesso).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expect(financas.transacoes.value[0].contaId).toBe(1)
    expect(financas.saldoDaConta(1)).toBe(800)
    expect(financas.saldoDaConta(2)).toBe(500)
    expect(financas.aviso.value).toContain('inativa')
  })

  it('permite editar sem trocar uma conta original inativa', async () => {
    const { financas, setItem } = await prepararFinancas({
      contas: [criarConta(1, 1000, false), criarConta(2, 500)]
    })

    const sucesso = financas.editar(
      1,
      dadosEdicao(1, 'Descrição corrigida')
    )

    expect(sucesso).toBe(true)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value[0].contaId).toBe(1)
    expect(financas.transacoes.value[0].descricao).toBe('Descrição corrigida')
    expect(financas.saldoDaConta(1)).toBe(800)
  })

  it('preserva vínculo e saldos quando a gravação falha', async () => {
    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    const { financas, setItem } = await prepararFinancas({
      falharGravacao: true
    })

    const antes = JSON.parse(JSON.stringify(financas.transacoes.value))
    const saldoOrigem = financas.saldoDaConta(1)
    const saldoDestino = financas.saldoDaConta(2)

    const sucesso = financas.editar(1, dadosEdicao(2))

    expect(sucesso).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toEqual(antes)
    expect(financas.saldoDaConta(1)).toBe(saldoOrigem)
    expect(financas.saldoDaConta(2)).toBe(saldoDestino)
    expect(financas.armazenamentoProtegido.value).toBe(true)

    consoleError.mockRestore()
  })

  it('preserva o ID e não duplica a transação nem avança proximoId', async () => {
    const { financas, setItem } = await prepararFinancas()

    const sucesso = financas.editar(1, dadosEdicao(2))

    expect(sucesso).toBe(true)

    const transacoes = financas.transacoes.value
    const persistido = JSON.parse(setItem.mock.lastCall[1])

    expect(transacoes).toHaveLength(1)
    expect(transacoes.map(item => item.id)).toEqual([1])
    expect(persistido.transacoes).toHaveLength(1)
    expect(persistido.proximoId).toBe(2)
  })
})
