import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

const contas = [
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

const transferencia = {
  id: 1,
  contaOrigemId: 1,
  contaDestinoId: 2,
  valor: 100,
  tarifa: 2,
  data: '2026-11-16',
  status: 'executada'
}

function criarDados(transferencias = [transferencia]) {
  return {
    versaoDados: 2,
    saldoInicial: 1000,
    proximoId: 2,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [],
    contas: structuredClone(contas),
    transferencias: structuredClone(transferencias)
  }
}

async function preparar(dados, falharGravacao = false) {
  const armazenamento = JSON.stringify(dados)

  const getItem = vi.fn(() => armazenamento)

  const setItem = vi.fn(() => {
    if (falharGravacao) {
      throw new Error('Falha simulada de gravacao')
    }
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
    armazenamento
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Nexus Financas — candidato de transferencias', () => {
  it('recupera dados antigos sem transferencias', async () => {
    const dados = criarDados()
    delete dados.transferencias

    const { financas } = await preparar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.transferencias.value).toEqual([])
    expect(financas.contas.value).toHaveLength(2)
  })

  it('recupera transferencias validas integralmente', async () => {
    const { financas } = await preparar(criarDados())

    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.transferencias.value).toEqual([transferencia])
    expect(financas.contas.value).toHaveLength(2)
  })

  it('bloqueia transferencias invalidas sem gravar', async () => {
    const dados = criarDados([
      { ...transferencia, valor: -100 }
    ])

    const { financas, setItem } = await preparar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('bloqueia transferencia com conta inexistente', async () => {
    const dados = criarDados([
      { ...transferencia, contaDestinoId: 999 }
    ])

    const { financas, setItem } = await preparar(dados)

    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('preserva transferencias ao cadastrar categoria', async () => {
    const { financas, setItem } = await preparar(criarDados())

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const resultado = financas.adicionarCategoria(
      'Teste preservacao',
      'despesa'
    )

    expect(resultado).not.toBe(false)
    expect(setItem).toHaveBeenCalled()

    const ultimaGravacao = JSON.parse(
      setItem.mock.lastCall[1]
    )

    expect(ultimaGravacao.transferencias).toEqual([transferencia])
    expect(ultimaGravacao.contas).toHaveLength(2)
  })

  it('nao sobrescreve dados quando a gravacao falha', async () => {
    const { financas, setItem } = await preparar(
      criarDados(),
      true
    )

    expect(financas.transferencias.value).toEqual([transferencia])

    const resultado = financas.adicionarConta({
      nome: 'Conta adicional',
      instituicao: 'Banco C',
      tipo: 'corrente',
      agencia: '',
      numero: '',
      saldoInicial: 200
    })

    expect(resultado).toBe(false)
    expect(setItem).toHaveBeenCalled()
    expect(financas.transferencias.value).toEqual([transferencia])
    expect(financas.contas.value).toHaveLength(2)
  })
  it.each([
    { valor: 10.001, tarifa: 0 },
    { valor: 10, tarifa: 0.001 },
    { valor: Number.MAX_VALUE, tarifa: 0 },
    { valor: 10, tarifa: Number.MAX_VALUE },
    { valor: 90071992547409.91, tarifa: 0.02 }
  ])(
    'bloqueia registro monetario invalido: %j',
    async ({ valor, tarifa }) => {
      const dados = criarDados([
        { ...transferencia, valor, tarifa }
      ])

      const { financas, setItem } = await preparar(dados)

      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(setItem).not.toHaveBeenCalled()
    }
  )
})
