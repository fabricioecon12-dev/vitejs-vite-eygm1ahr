import { describe, it, expect, vi, afterEach } from 'vitest'

const contaPrincipal = {
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
}

const dadosIniciais = {
  versaoDados: 2,
  saldoInicial: 500,
  proximoId: 1,
  limites: {},
  categoriasDespesa: ['Outros'],
  categoriasReceita: ['Outros'],
  transacoes: [],
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

const novaConta = {
  nome: 'Reserva',
  instituicao: 'Banco B',
  tipo: 'poupanca',
  agencia: '1234',
  numero: '56789',
  saldoInicial: 200
}

async function preparar(falharGravacao = false) {
  const getItem = vi.fn(() => JSON.stringify(dadosIniciais))
  const setItem = vi.fn(() => {
    if (falharGravacao) {
      throw new Error('Falha simulada de armazenamento')
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

describe('Nexus Finanças — cadastro bancário', () => {
  it('cadastra uma conta secundária em uma única gravação', async () => {
    const { financas, setItem } = await preparar()

    expect(financas.adicionarConta(novaConta)).toBe(true)
    expect(setItem).toHaveBeenCalledTimes(1)

    const dados = JSON.parse(setItem.mock.lastCall[1])

    expect(dados.contas).toHaveLength(2)
    expect(dados.contas[1]).toMatchObject({
      id: 2,
      nome: 'Reserva',
      instituicao: 'Banco B',
      tipo: 'poupanca',
      saldoInicial: 200,
      ativa: true,
      principal: false
    })

    expect(dados.contas[0]).toEqual(contaPrincipal)
    expect(dados.transacoes).toEqual([])
    expect(financas.contas.value).toEqual(dados.contas)
  })

  it('rejeita dados bancários inválidos sem gravar', async () => {
    const { financas, setItem } = await preparar()

    expect(
      financas.adicionarConta({
        ...novaConta,
        nome: '   '
      })
    ).toBe(false)

    expect(financas.contas.value).toHaveLength(1)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('não permite cadastrar outra conta principal', async () => {
    const { financas, setItem } = await preparar()

    expect(
      financas.adicionarConta({
        ...novaConta,
        principal: true
      })
    ).toBe(true)

    expect(financas.contas.value[0].principal).toBe(true)
    expect(financas.contas.value[1].principal).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('preserva as contas quando a gravação falha', async () => {
    const erro = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    const { financas, setItem } = await preparar(true)

    const contasAntes = JSON.parse(
      JSON.stringify(financas.contas.value)
    )

    expect(financas.adicionarConta(novaConta)).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.contas.value).toEqual(contasAntes)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.aviso.value).toContain('Não foi possível salvar')

    erro.mockRestore()
  })
})
