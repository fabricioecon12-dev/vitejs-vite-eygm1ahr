import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'
const armazenamento = new Map()

vi.stubGlobal('localStorage', {
  getItem: vi.fn(chave => armazenamento.get(chave) ?? null),
  setItem: vi.fn((chave, valor) => armazenamento.set(chave, valor)),
  removeItem: vi.fn(chave => armazenamento.delete(chave)),
  clear: vi.fn(() => armazenamento.clear())
})

let financas

function comprar(data, valor = 90, parcelas = 1) {
  return financas.registrarCompraCartao({
    cartaoId: 1,
    descricao: 'Compra de integracao',
    data,
    valor,
    parcelas
  })
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 9, 12))

  vi.resetModules()
  armazenamento.clear()

  vi.mocked(localStorage.setItem).mockReset()
  vi.mocked(localStorage.setItem).mockImplementation(
    (chave, valor) => armazenamento.set(chave, valor)
  )

  const modulo = await import('../composables/useFinancas.js')
  financas = modulo.useFinancas()

  financas.comprasCartao.value = []
  financas.faturasCartao.value = []
  financas.pagamentosFatura.value = []
  financas.fechamentosFatura.value = []
  financas.transacoes.value = []

  financas.contas.value = [{
    id: 1,
    nome: 'Conta principal',
    instituicao: 'Banco de teste',
    tipo: 'corrente',
    agencia: '',
    numero: '',
    saldoInicial: 0,
    ativa: true,
    principal: true,
    dataCriacao: '2026-11-01'
  }]

  financas.cartoesCredito.value = [{
    id: 1,
    nome: 'Cartao de teste',
    instituicao: 'Banco de teste',
    bandeira: 'Visa',
    limiteTotal: 1000,
    diaFechamento: 10,
    diaVencimento: 20,
    contaId: null,
    ultimosDigitos: '1234',
    status: 'ativo',
    dataCriacao: '2026-11-01T00:00:00.000Z'
  }]
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Integracao fechamento e compras - E.9.6-B', () => {
  it('B.1 fecha fatura pendente antes de registrar nova compra', () => {
    expect(comprar('2026-11-05')).toBe(true)

    const primeiraFatura = financas.faturasCartao.value[0]

    vi.setSystemTime(new Date(2026, 10, 11, 12))

    expect(comprar('2026-11-11', 50)).toBe(true)

    expect(
      financas.faturasCartao.value.find(
        item => item.id === primeiraFatura.id
      ).status
    ).toBe('fechada')

    expect(financas.fechamentosFatura.value).toHaveLength(1)
    expect(financas.comprasCartao.value).toHaveLength(2)
  })

  it('B.2 registra compra valida e parcelas na competencia correta', () => {
    expect(comprar('2026-11-09', 90, 3)).toBe(true)

    expect(financas.comprasCartao.value).toHaveLength(1)

    const competencias = financas.comprasCartao.value[0]
      .parcelas.map(item => item.competencia)

    expect(competencias).toEqual([
      '2026-11',
      '2026-12',
      '2027-01'
    ])

    expect(financas.faturasCartao.value).toHaveLength(3)
  })

  it('B.3 impede compra retroativa em fatura ja vencida', () => {
    vi.setSystemTime(new Date(2026, 10, 19, 12))

    expect(comprar('2026-11-05')).toBe(false)

    expect(financas.comprasCartao.value).toHaveLength(0)
    expect(financas.faturasCartao.value).toHaveLength(0)
  })

  it('B.4 bloqueia compra quando fatura pendente esta inconsistente', () => {
    expect(comprar('2026-11-05')).toBe(true)

    const fatura = financas.faturasCartao.value[0]
    fatura.parcelas[0].valor = 999

    vi.setSystemTime(new Date(2026, 10, 11, 12))

    const quantidadeAntes = financas.comprasCartao.value.length

    expect(comprar('2026-11-11', 50)).toBe(false)

    expect(financas.comprasCartao.value).toHaveLength(quantidadeAntes)
    expect(fatura.status).toBe('aberta')
    expect(financas.fechamentosFatura.value).toHaveLength(0)
  })

  it('B.5 preserva fechamento confirmado se a compra falhar', () => {
    expect(comprar('2026-11-05')).toBe(true)

    vi.setSystemTime(new Date(2026, 10, 11, 12))

    let chamadas = 0
    const gravacaoOriginal = vi.mocked(localStorage.setItem)
      .getMockImplementation()

    vi.mocked(localStorage.setItem).mockImplementation((chave, valor) => {
      chamadas += 1

      if (chamadas === 2) {
        throw new Error('Falha simulada na compra')
      }

      return gravacaoOriginal(chave, valor)
    })

    expect(comprar('2026-11-11', 50)).toBe(false)

    expect(financas.faturasCartao.value[0].status).toBe('fechada')
    expect(financas.fechamentosFatura.value).toHaveLength(1)
    expect(financas.comprasCartao.value).toHaveLength(1)

    const persistido = JSON.parse(armazenamento.get(CHAVE))

    expect(persistido.faturasCartao[0].status).toBe('fechada')
    expect(persistido.comprasCartao).toHaveLength(1)
  })
})