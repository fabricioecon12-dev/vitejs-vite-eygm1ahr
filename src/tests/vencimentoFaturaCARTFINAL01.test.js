import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useFinancas } from '../composables/useFinancas.js'

const armazenamento = new Map()

vi.stubGlobal('localStorage', {
  getItem: vi.fn(chave => armazenamento.get(chave) ?? null),
  setItem: vi.fn((chave, valor) => armazenamento.set(chave, valor)),
  removeItem: vi.fn(chave => armazenamento.delete(chave)),
  clear: vi.fn(() => armazenamento.clear())
})

const financas = useFinancas()

function prepararCartao(fechamento, vencimento) {
  financas.cartoesCredito.value = [{
    id: 1,
    nome: 'Cartao de vencimento',
    instituicao: 'Banco de teste',
    bandeira: 'Visa',
    limiteTotal: 1000,
    diaFechamento: fechamento,
    diaVencimento: vencimento,
    contaId: null,
    ultimosDigitos: '1234',
    status: 'ativo',
    dataCriacao: '2026-01-01T00:00:00.000Z'
  }]
}

function registrarCompra(data) {
  return financas.registrarCompraCartao({
    cartaoId: 1,
    descricao: 'Compra para validar vencimento',
    data,
    valor: 90,
    parcelas: 1
  })
}

function verificarVencimento(esperado) {
  expect(financas.faturasCartao.value).toHaveLength(1)
  expect(financas.faturasCartao.value[0].vencimento).toBe(esperado)
  expect(
    financas.faturasCartao.value[0].vencimento >
    financas.faturasCartao.value[0].fechamento
  ).toBe(true)
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 6, 12))

  armazenamento.clear()

  financas.comprasCartao.value = []
  financas.faturasCartao.value = []
  financas.pagamentosFatura.value = []
  financas.pagamentosAntecipadosFatura.value = []
  financas.transacoes.value = []
  financas.contas.value = []
  financas.armazenamentoProtegido.value = false

  prepararCartao(10, 17)
  await nextTick()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Vencimento de faturas - CART-FINAL-01', () => {
  it('mantem vencimento posterior no mesmo mes', () => {
    expect(registrarCompra('2026-11-05')).toBe(true)
    verificarVencimento('2026-11-17')
  })

  it('transfere vencimento para o mes seguinte', () => {
    prepararCartao(25, 5)
    expect(registrarCompra('2026-11-05')).toBe(true)
    verificarVencimento('2026-12-05')
  })

  it('usa o mes seguinte quando os dias sao iguais', () => {
    prepararCartao(10, 10)
    expect(registrarCompra('2026-11-05')).toBe(true)
    verificarVencimento('2026-12-10')
  })

  it('ajusta fevereiro sem antecipar o vencimento', () => {
    vi.setSystemTime(new Date(2027, 1, 6, 12))
    prepararCartao(28, 31)
    expect(registrarCompra('2027-02-05')).toBe(true)
    verificarVencimento('2027-03-31')
  })

  it('atravessa corretamente a mudanca de ano', () => {
    vi.setSystemTime(new Date(2026, 11, 6, 12))
    prepararCartao(25, 5)
    expect(registrarCompra('2026-12-05')).toBe(true)
    verificarVencimento('2027-01-05')
  })

  it('preserva vencimento de fatura ja registrada', async () => {
    expect(registrarCompra('2026-11-05')).toBe(true)

    const fatura = financas.faturasCartao.value[0]
    const vencimentoOriginal = fatura.vencimento

    prepararCartao(25, 5)
    await nextTick()

    expect(financas.faturasCartao.value[0].vencimento)
      .toBe(vencimentoOriginal)
  })
})