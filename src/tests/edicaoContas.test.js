import { describe, it, expect, vi, afterEach } from 'vitest'

const contaPrincipal = {
  id: 1,
  nome: 'Conta principal',
  instituicao: 'Banco A',
  tipo: 'corrente',
  agencia: '0001',
  numero: '12345',
  saldoInicial: 500,
  ativa: true,
  principal: true,
  dataCriacao: '2026-11-01'
}

const transacao = {
  id: 1,
  contaId: 1,
  descricao: 'Salário',
  valor: 1000,
  tipo: 'receita',
  categoria: 'Salário',
  data: '2026-11-10'
}

const dadosIniciais = {
  versaoDados: 2,
  saldoInicial: 500,
  proximoId: 2,
  limites: {},
  categoriasDespesa: ['Outros'],
  categoriasReceita: ['Salário'],
  transacoes: [transacao],
  contas: [contaPrincipal],
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

const alteracoes = {
  nome: 'Conta atualizada',
  instituicao: 'Banco B',
  tipo: 'poupanca',
  agencia: '2222',
  numero: '98765'
}

async function preparar(falharGravacao = false) {
  const getItem = vi.fn(() => JSON.stringify(dadosIniciais))
  const setItem = vi.fn(() => {
    if (falharGravacao) {
      throw new Error('Falha simulada')
    }
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
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

describe('Nexus Finanças — edição de contas', () => {
  it('atualiza dados cadastrais em uma gravação', async () => {
    const { financas, setItem } = await preparar()

    expect(financas.editarConta(1, alteracoes)).toBe(true)
    expect(setItem).toHaveBeenCalledTimes(1)

    const dados = JSON.parse(setItem.mock.lastCall[1])

    expect(dados.contas[0]).toMatchObject(alteracoes)
    expect(financas.contas.value[0]).toEqual(dados.contas[0])
  })

  it('preserva identificador, saldo, principal e transações', async () => {
    const { financas, setItem } = await preparar()

    expect(
      financas.editarConta(1, {
        ...alteracoes,
        id: 99,
        saldoInicial: 9999,
        principal: false,
        ativa: false
      })
    ).toBe(true)

    const dados = JSON.parse(setItem.mock.lastCall[1])

    expect(dados.contas[0].id).toBe(1)
    expect(dados.contas[0].saldoInicial).toBe(500)
    expect(dados.contas[0].principal).toBe(true)
    expect(dados.contas[0].ativa).toBe(true)
    expect(dados.transacoes).toEqual([transacao])
  })

  it('rejeita campos inválidos sem modificar a conta', async () => {
    const { financas, setItem } = await preparar()

    expect(
      financas.editarConta(1, {
        ...alteracoes,
        instituicao: ' '
      })
    ).toBe(false)

    expect(financas.contas.value[0]).toEqual(contaPrincipal)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserva os dados quando o armazenamento falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { financas, setItem } = await preparar(true)

    expect(financas.editarConta(1, alteracoes)).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.contas.value[0]).toEqual(contaPrincipal)
    expect(financas.armazenamentoProtegido.value).toBe(true)
  })
})
