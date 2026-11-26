import { describe, expect, it } from 'vitest'
import { calcularEncargosMoraFatura } from '../utils/calcularEncargosMoraFatura.js'

const dadosBase = {
  vencimento: '2026-11-10',
  dataReferencia: '2026-11-20',
  valorOriginalCentavos: 100000,
  pagamentos: [],
  jurosMoraMensal: 1,
  multaAtraso: 2
}

function calcular(alteracoes = {}) {
  return calcularEncargosMoraFatura({
    ...dadosBase,
    ...alteracoes
  })
}

function pagamento(dataHora, valorPagoCentavos) {
  return {
    status: 'confirmado',
    dataHora,
    valorPagoCentavos
  }
}

describe('CART-FINAL-01-G.3-H.5-D - Encargos de mora', () => {
  it('nao cobra encargos na data do vencimento', () => {
    const resultado = calcular({
      dataReferencia: '2026-11-10'
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.diasAtraso).toBe(0)
    expect(resultado.jurosMoraCentavos).toBe(0)
    expect(resultado.multaCentavos).toBe(0)
  })

  it('calcula juros proporcionais e multa unica', () => {
    const resultado = calcular()

    expect(resultado.valido).toBe(true)
    expect(resultado.diasAtraso).toBe(10)
    expect(resultado.jurosMoraCentavos).toBe(333)
    expect(resultado.multaCentavos).toBe(2000)
    expect(resultado.totalEncargosCentavos).toBe(2333)
  })

  it('reduz a base dos juros apos pagamento parcial', () => {
    const resultado = calcular({
      dataReferencia: '2026-11-30',
      pagamentos: [
        pagamento('2026-11-21T12:00:00.000Z', 40000)
      ]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.jurosMoraCentavos).toBe(533)
    expect(resultado.multaCentavos).toBe(2000)
    expect(resultado.intervalos).toHaveLength(2)
  })

  it('considera pagamento anterior ao vencimento', () => {
    const resultado = calcular({
      pagamentos: [
        pagamento('2026-11-05T12:00:00.000Z', 40000)
      ]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.memoriaCalculo.saldoNoVencimentoCentavos)
      .toBe(60000)
    expect(resultado.jurosMoraCentavos).toBe(200)
    expect(resultado.multaCentavos).toBe(1200)
  })

  it('nao aplica multa repetida por varios intervalos', () => {
    const resultado = calcular({
      dataReferencia: '2026-11-30',
      pagamentos: [
        pagamento('2026-11-21T12:00:00.000Z', 20000),
        pagamento('2026-11-26T12:00:00.000Z', 20000)
      ]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.multaCentavos).toBe(2000)
    expect(resultado.intervalos).toHaveLength(3)
  })

  it('recusa taxas ausentes', () => {
    const resultado = calcular({
      jurosMoraMensal: null
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.motivo)
      .toBe('TAXAS_INSUFICIENTES_OU_INVALIDAS')
  })

  it('recusa taxa fora do limite', () => {
    const resultado = calcular({
      multaAtraso: 101
    })

    expect(resultado.valido).toBe(false)
  })

  it('recusa pagamentos superiores ao saldo', () => {
    const resultado = calcular({
      pagamentos: [
        pagamento('2026-11-15T12:00:00.000Z', 120000)
      ]
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.motivo)
      .toBe('PAGAMENTOS_SUPERIORES_AO_SALDO')
  })

  it('recusa datas invalidas', () => {
    const resultado = calcular({
      vencimento: '2026-02-30'
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toBe('DATA_INVALIDA')
  })

  it('recusa pagamentos nao confirmados', () => {
    const resultado = calcular({
      pagamentos: [{
        status: 'pendente',
        dataHora: '2026-11-15T12:00:00.000Z',
        valorPagoCentavos: 10000
      }]
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toBe('PAGAMENTO_INVALIDO')
  })

  it('mantem memoria de calculo consultiva', () => {
    const resultado = calcular()

    expect(resultado.valido).toBe(true)
    expect(resultado.memoriaCalculo.baseDiasMensal).toBe(30)
    expect(resultado.memoriaCalculo.criterioArredondamento)
      .toBe('ARREDONDAMENTO_FINAL')
    expect(resultado.memoriaCalculo.saldoFinalCentavos)
      .toBe(100000)
  })

  it('nao modifica os dados recebidos', () => {
    const dados = {
      ...dadosBase,
      pagamentos: [
        pagamento('2026-11-15T12:00:00.000Z', 10000)
      ]
    }

    const original = JSON.stringify(dados)

    calcularEncargosMoraFatura(dados)

    expect(JSON.stringify(dados)).toBe(original)
  })
})
