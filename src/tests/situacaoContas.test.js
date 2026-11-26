import { describe, it, expect, vi, afterEach } from 'vitest'

const contasIniciais = [
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
    nome: 'Reserva',
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

const transacao = {
  id: 1,
  contaId: 2,
  descricao: 'Depósito',
  valor: 100,
  tipo: 'receita',
  categoria: 'Outros',
  data: '2026-11-10'
}

async function preparar(falharGravacao = false) {
  const dados = {
    versaoDados: 2,
    saldoInicial: 500,
    proximoId: 2,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [transacao],
    contas: contasIniciais,
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
    if (falharGravacao) {
      throw new Error('Falha simulada')
    }
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

describe('Nexus Finanças — situação das contas', () => {
  it('desativa uma conta secundária', async () => {
    const { financas, setItem } = await preparar()

    expect(financas.alterarSituacaoConta(2, false)).toBe(true)
    expect(financas.contas.value[1].ativa).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('reativa uma conta secundária', async () => {
    const { financas } = await preparar()

    expect(financas.alterarSituacaoConta(2, false)).toBe(true)
    expect(financas.alterarSituacaoConta(2, true)).toBe(true)
    expect(financas.contas.value[1].ativa).toBe(true)
  })

  it('impede a desativação da conta principal', async () => {
    const { financas, setItem } = await preparar()

    expect(financas.alterarSituacaoConta(1, false)).toBe(false)
    expect(financas.contas.value[0].ativa).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserva histórico e impede novos lançamentos na conta inativa', async () => {
    const { financas, setItem } = await preparar()

    expect(financas.alterarSituacaoConta(2, false)).toBe(true)

    const dados = JSON.parse(setItem.mock.lastCall[1])

    expect(dados.transacoes).toEqual([transacao])
    expect(dados.contas[1].saldoInicial).toBe(200)

    expect(financas.adicionar({
      descricao: 'Nova receita',
      valor: 50,
      tipo: 'receita',
      categoria: 'Outros',
      data: '2026-11-11',
      contaId: 2
    })).toBe(false)

    expect(financas.transacoes.value).toHaveLength(1)
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('preserva os dados quando a gravação falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { financas } = await preparar(true)

    expect(financas.alterarSituacaoConta(2, false)).toBe(false)
    expect(financas.contas.value[1].ativa).toBe(true)
    expect(financas.armazenamentoProtegido.value).toBe(true)
  })
})
