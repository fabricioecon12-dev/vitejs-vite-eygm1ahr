import {
  beforeEach,
  afterEach,
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

async function inicializar() {
  vi.resetModules()

  const modulo = await import('../composables/useFinancas.js')

  return modulo.useFinancas()
}

async function prepararAmbiente() {
  financas = await inicializar()

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

  financas.contas.value = [{
    id: 1,
    nome: 'Conta principal de teste',
    instituicao: 'Banco de teste',
    tipo: 'corrente',
    agencia: '',
    numero: '',
    saldoInicial: 0,
    ativa: true,
    principal: true,
    dataCriacao: '2026-11-01'
  }]
}

async function comprar(data = '2026-11-05') {
  return financas.registrarCompraCartao({
    cartaoId: 1,
    descricao: 'Compra para teste de fechamento',
    data,
    valor: 90,
    parcelas: 1
  })
}

async function reinicializar() {
  financas = await inicializar()
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0))

  vi.resetModules()
  armazenamento.clear()

  vi.mocked(localStorage.getItem).mockClear()
  vi.mocked(localStorage.setItem).mockReset()
  vi.mocked(localStorage.setItem).mockImplementation(
    (chave, valor) => armazenamento.set(chave, valor)
  )

  await prepararAmbiente()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Fechamento automatico na inicializacao - E.8', () => {

  it('E.8.1 fecha fatura vencida durante a recuperacao', async () => {
    expect(await comprar()).toBe(true)

    expect(financas.faturasCartao.value[0].status)
      .toBe('aberta')

    vi.setSystemTime(new Date(2026, 10, 19, 12))
    await reinicializar()

    expect(financas.faturasCartao.value[0].status)
      .toBe('fechada')

    expect(financas.fechamentosFatura.value)
      .toHaveLength(1)

    expect(financas.fechamentosFatura.value[0].status)
      .toBe('confirmado')
  })

  it('E.8.2 preserva fatura com fechamento futuro', async () => {
    expect(await comprar('2026-11-15')).toBe(true)

    await reinicializar()

    expect(financas.faturasCartao.value).toHaveLength(1)

    expect(financas.faturasCartao.value[0].status)
      .toBe('aberta')

    expect(financas.fechamentosFatura.value)
      .toHaveLength(0)
  })

  it('E.8.3 nao fecha fatura com parcela inconsistente', async () => {
    expect(await comprar()).toBe(true)

    const dados = JSON.parse(
      armazenamento.get(CHAVE)
    )

    dados.faturasCartao[0].parcelas[0].valor = 91

    armazenamento.set(CHAVE, JSON.stringify(dados))

    vi.setSystemTime(new Date(2026, 10, 19, 12))
    await reinicializar()

    expect(financas.faturasCartao.value[0].status)
      .toBe('aberta')

    expect(financas.fechamentosFatura.value)
      .toHaveLength(0)

    expect(financas.armazenamentoProtegido.value)
      .toBe(false)
  })

  it('E.8.4 nao duplica fechamento historico existente', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 10, 12)
      )
    ).toBe(true)

    expect(financas.fechamentosFatura.value)
      .toHaveLength(1)

    vi.setSystemTime(new Date(2026, 10, 19, 12))
    await reinicializar()

    expect(financas.faturasCartao.value[0].status)
      .toBe('fechada')

    expect(financas.fechamentosFatura.value)
      .toHaveLength(1)
  })

  it('E.8.5 preserva fatura aberta quando a persistencia falha', async () => {
    expect(await comprar()).toBe(true)

    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error('Falha simulada na inicializacao')
    })

    vi.setSystemTime(new Date(2026, 10, 19, 12))
    await reinicializar()

    expect(financas.faturasCartao.value[0].status)
      .toBe('aberta')

    expect(financas.fechamentosFatura.value)
      .toHaveLength(0)

    expect(financas.armazenamentoProtegido.value)
      .toBe(true)
  })

})