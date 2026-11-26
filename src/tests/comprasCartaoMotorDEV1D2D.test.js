import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

const armazenamento = new Map()

vi.stubGlobal('localStorage', {
  getItem: vi.fn(chave => armazenamento.get(chave) ?? null),
  setItem: vi.fn((chave, valor) => {
    armazenamento.set(chave, valor)
  }),
  removeItem: vi.fn(chave => armazenamento.delete(chave)),
  clear: vi.fn(() => armazenamento.clear())
})

import { useFinancas } from '../composables/useFinancas.js'

const financas = useFinancas()

function prepararCartao(limite = 1000, fechamento = 10, vencimento = 20) {
  financas.cartoesCredito.value = [{
    id: 1,
    nome: 'Cartao de teste',
    instituicao: 'Banco de teste',
    bandeira: 'Visa',
    limiteTotal: limite,
    diaFechamento: fechamento,
    diaVencimento: vencimento,
    contaId: null,
    ultimosDigitos: '1234',
    status: 'ativo',
    dataCriacao: '2026-11-01T00:00:00.000Z'
  }]
}

function comprar(dados = {}) {
  return financas.registrarCompraCartao({
    cartaoId: 1,
    descricao: 'Compra de teste',
    data: '2026-11-05',
    valor: 90,
    parcelas: 1,
    ...dados
  })
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-06T12:00:00'))
  armazenamento.clear()
  vi.mocked(localStorage.setItem).mockClear()
  vi.mocked(localStorage.getItem).mockClear()

  financas.comprasCartao.value = []
  financas.faturasCartao.value = []
  financas.pagamentosFatura.value = []
  financas.transacoes.value = []
  financas.contas.value = []
  financas.armazenamentoProtegido.value = false

  prepararCartao()
  await nextTick()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Motor de compras com cartao - DEV.1-D.2-D', () => {
  it('registra compra a vista com uma parcela', () => {
    expect(comprar()).toBe(true)
    expect(financas.comprasCartao.value).toHaveLength(1)
    expect(financas.faturasCartao.value).toHaveLength(1)
    expect(financas.comprasCartao.value[0].parcelas).toHaveLength(1)
  })

  it('distribui corretamente os centavos em tres parcelas', () => {
    expect(comprar({ valor: 100, parcelas: 3 })).toBe(true)

    const parcelas = financas.comprasCartao.value[0].parcelas
    const centavos = parcelas.map(item => Math.round(item.valor * 100))

    expect(centavos).toEqual([3334, 3333, 3333])
    expect(centavos.reduce((total, valor) => total + valor, 0)).toBe(10000)
  })

  it('gera tres competencias consecutivas', () => {
    expect(comprar({ parcelas: 3 })).toBe(true)

    const competencias = financas.comprasCartao.value[0]
      .parcelas.map(item => item.competencia)

    expect(competencias).toEqual([
      '2026-11',
      '2026-12',
      '2027-01'
    ])
  })

  it('encaminha compra no fechamento ao ciclo seguinte', () => {
    expect(comprar({ data: '2026-11-10' })).toBe(true)

    expect(
      financas.comprasCartao.value[0].parcelas[0].competencia
    ).toBe('2026-12')
  })

  it('recusa compra acima do limite sem criar registros', () => {
    prepararCartao(50)

    expect(comprar({ valor: 90 })).toBe(false)
    expect(financas.comprasCartao.value).toHaveLength(0)
    expect(financas.faturasCartao.value).toHaveLength(0)
  })

  it('nao movimenta contas ou transacoes bancarias', () => {
    const transacoesAntes = JSON.stringify(financas.transacoes.value)
    const contasAntes = JSON.stringify(financas.contas.value)

    expect(comprar()).toBe(true)

    expect(JSON.stringify(financas.transacoes.value)).toBe(transacoesAntes)
    expect(JSON.stringify(financas.contas.value)).toBe(contasAntes)
  })

  it('nao aplica compra quando armazenamento falha', () => {
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new Error('Falha simulada')
    })

    expect(comprar()).toBe(false)
    expect(financas.comprasCartao.value).toHaveLength(0)
    expect(financas.faturasCartao.value).toHaveLength(0)
  })
})
