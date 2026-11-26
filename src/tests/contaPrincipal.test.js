import { describe, it, expect, vi, afterEach } from 'vitest'

const contas = [
  {
    id: 1,
    nome: 'Conta principal',
    instituicao: 'Banco A',
    tipo: 'corrente',
    agencia: '',
    numero: '',
    saldoInicial: 500,
    ativa: true,
    principal: true,
    dataCriacao: '2026-11-01'
  },
  {
    id: 2,
    nome: 'Conta secundária',
    instituicao: 'Banco B',
    tipo: 'poupanca',
    agencia: '',
    numero: '',
    saldoInicial: 200,
    ativa: true,
    principal: false,
    dataCriacao: '2026-11-02'
  }
]

const transacoes = [{
  id: 1,
  contaId: 2,
  descricao: 'Depósito',
  valor: 100,
  tipo: 'receita',
  categoria: 'Outros',
  data: '2026-11-10'
}]

async function preparar(falhar = false) {
  const dados = {
    versaoDados: 2,
    saldoInicial: 500,
    proximoId: 2,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes,
    contas,
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

  const setItem = vi.fn(() => {
    if (falhar) throw new Error('Falha simulada')
  })

  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => JSON.stringify(dados)),
    setItem
  })

  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  return { financas: useFinancas(), setItem }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Nexus Finanças — conta principal', () => {
  it('define uma conta secundária ativa como principal', async () => {
    const { financas, setItem } = await preparar()

    expect(financas.definirContaPrincipal(2)).toBe(true)

    expect(financas.contas.value[0].principal).toBe(false)
    expect(financas.contas.value[1].principal).toBe(true)

    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('mantém a antiga conta principal ativa', async () => {
    const { financas } = await preparar()

    financas.definirContaPrincipal(2)

    expect(financas.contas.value[0].ativa).toBe(true)
    expect(financas.contas.value[0].principal).toBe(false)
  })

  it('preserva saldos e histórico financeiro', async () => {
    const { financas, setItem } = await preparar()

    financas.definirContaPrincipal(2)

    const dados = JSON.parse(setItem.mock.lastCall[1])

    expect(dados.contas[0].saldoInicial).toBe(500)
    expect(dados.contas[1].saldoInicial).toBe(200)
    expect(dados.transacoes).toEqual(transacoes)
    expect(financas.saldoInicial.value).toBe(500)
  })

  it('impede definir uma conta inativa como principal', async () => {
    const { financas, setItem } = await preparar()

    financas.alterarSituacaoConta(2, false)
    setItem.mockClear()

    expect(financas.definirContaPrincipal(2)).toBe(false)
    expect(financas.contas.value[0].principal).toBe(true)
    expect(financas.contas.value[1].principal).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('rejeita conta inexistente e alteração redundante', async () => {
    const { financas, setItem } = await preparar()

    expect(financas.definirContaPrincipal(999)).toBe(false)
    expect(financas.definirContaPrincipal(1)).toBe(false)

    expect(financas.contas.value[0].principal).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserva os dados quando a gravação falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { financas } = await preparar(true)

    expect(financas.definirContaPrincipal(2)).toBe(false)

    expect(financas.contas.value[0].principal).toBe(true)
    expect(financas.contas.value[1].principal).toBe(false)
    expect(financas.armazenamentoProtegido.value).toBe(true)
  })
})
