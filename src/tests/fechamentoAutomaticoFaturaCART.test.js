import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const armazenamento = new Map()

vi.stubGlobal('localStorage', {
  getItem: vi.fn(chave => armazenamento.get(chave) ?? null),
  setItem: vi.fn((chave, valor) => armazenamento.set(chave, valor)),
  removeItem: vi.fn(chave => armazenamento.delete(chave)),
  clear: vi.fn(() => armazenamento.clear())
})

let financas

async function prepararCartao() {
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
}

async function comprar() {
  return financas.registrarCompraCartao({
    cartaoId: 1,
    descricao: 'Compra de teste',
    data: '2026-11-05',
    valor: 90,
    parcelas: 1
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

  await prepararCartao()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Fechamento automatico de faturas - E.7', () => {
  it('E.7.1 fecha fatura quando a data de fechamento chega', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 10, 12)
      )
    ).toBe(true)

    expect(
      financas.faturasCartao.value[0].status
    ).toBe('fechada')
  })

  it('E.7.2 nao fecha fatura antes da data prevista', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 9, 12)
      )
    ).toBe(false)

    expect(fatura.status).toBe('aberta')
  })

  it('E.7.3 impede fechamento duplicado', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]
    const agora = new Date(2026, 10, 10, 12)

    expect(financas.fecharFaturaCartao(fatura.id, agora)).toBe(true)
    expect(financas.fecharFaturaCartao(fatura.id, agora)).toBe(false)

    expect(financas.fechamentosFatura.value).toHaveLength(1)
  })

  it('E.7.4 registra evento historico confirmado', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 10, 12)
      )
    ).toBe(true)

    const evento = financas.fechamentosFatura.value[0]

    expect(evento.faturaId).toBe(fatura.id)
    expect(evento.cartaoId).toBe(1)
    expect(evento.status).toBe('confirmado')
    expect(evento.fechamentoEfetivoEm).toBeTruthy()
  })

  it('E.7.5 preserva o valor consolidado em centavos', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 10, 12)
      )
    ).toBe(true)

    expect(
      financas.fechamentosFatura.value[0]
        .valorConsolidadoCentavos
    ).toBe(9000)
  })

  it('E.7.6 recusa fatura com parcela inconsistente', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]
    fatura.parcelas[0].valor = 91

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 10, 12)
      )
    ).toBe(false)

    expect(fatura.status).toBe('aberta')
    expect(financas.fechamentosFatura.value).toHaveLength(0)
  })

  it('E.7.7 preserva estados quando a persistencia falha', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]

    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error('Falha simulada')
    })

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 10, 12)
      )
    ).toBe(false)

    expect(fatura.status).toBe('aberta')
    expect(financas.fechamentosFatura.value).toHaveLength(0)
    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('E.7.8 recupera fatura fechada e historico persistido', async () => {
    expect(await comprar()).toBe(true)

    const fatura = financas.faturasCartao.value[0]

    expect(
      financas.fecharFaturaCartao(
        fatura.id,
        new Date(2026, 10, 10, 12)
      )
    ).toBe(true)

    vi.resetModules()

    const modulo = await import('../composables/useFinancas.js')
    const recuperada = modulo.useFinancas()

    expect(recuperada.faturasCartao.value[0].status)
      .toBe('fechada')

    expect(recuperada.fechamentosFatura.value)
      .toHaveLength(1)

    expect(recuperada.fechamentosFatura.value[0].status)
      .toBe('confirmado')
  })
})