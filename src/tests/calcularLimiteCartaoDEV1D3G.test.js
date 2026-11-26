import { describe, it, expect } from 'vitest'
import { calcularLimiteCartao } from '../utils/calcularLimiteCartao.js'

const cartao = {
  id: 1,
  limiteTotal: 5000
}

const compra = {
  id: 1,
  cartaoId: 1,
  valor: 2000,
  status: 'ativa'
}

const fatura = {
  id: 10,
  cartaoId: 1,
  status: 'aberta',
  parcelas: [
    { compraId: 1, numero: 1, valor: 2000 }
  ]
}

const pagamento = {
  id: 20,
  cartaoId: 1,
  faturaId: 10,
  valorPagoCentavos: 80000,
  status: 'confirmado'
}

function calcular(sobrescritas = {}) {
  return calcularLimiteCartao({
    cartao,
    compras: [],
    faturas: [],
    pagamentos: [],
    estornos: [],
    ajustes: [],
    ...sobrescritas
  })
}

describe('Calculo isolado do limite - DEV.1-D.3-G', () => {
  it('mantem limite integral sem compras', () => {
    const resultado = calcular()

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteDisponivel).toBe(500000)
  })

  it('compromete o valor integral das compras', () => {
    const resultado = calcular({
      compras: [compra]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.comprometido).toBe(200000)
    expect(resultado.limiteDisponivel).toBe(300000)
  })

  it('recompoe limite com pagamento confirmado', () => {
    const resultado = calcular({
      compras: [compra],
      faturas: [fatura],
      pagamentos: [pagamento]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteDisponivel).toBe(380000)
  })

  it('nao recompoe limite com pagamento pendente', () => {
    const resultado = calcular({
      compras: [compra],
      faturas: [fatura],
      pagamentos: [
        { ...pagamento, status: 'pendente' }
      ]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteDisponivel).toBe(300000)
  })

  it('desconta estorno parcial do pagamento', () => {
    const resultado = calcular({
      compras: [compra],
      faturas: [fatura],
      pagamentos: [pagamento],
      estornos: [
        {
          id: 30,
          pagamentoId: 20,
          valor: 200,
          status: 'confirmado'
        }
      ]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteDisponivel).toBe(360000)
  })

  it('recusa estorno superior ao pagamento', () => {
    const resultado = calcular({
      compras: [compra],
      faturas: [fatura],
      pagamentos: [pagamento],
      estornos: [
        {
          id: 30,
          pagamentoId: 20,
          valor: 900,
          status: 'confirmado'
        }
      ]
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.limiteDisponivel).toBeNull()
    expect(resultado.inconsistencias).toContain(
      'ESTORNO_EXCEDE_PAGAMENTO'
    )
  })

  it('considera ajustes autorizados', () => {
    const resultado = calcular({
      compras: [compra],
      ajustes: [
        {
          id: 40,
          cartaoId: 1,
          valor: 100,
          status: 'autorizado',
          justificativa: 'Ajuste administrativo autorizado',
          referencia: 99
        }
      ]
    })

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteDisponivel).toBe(310000)
  })

  it('recusa ajuste sem justificativa', () => {
    const resultado = calcular({
      ajustes: [
        {
          id: 40,
          cartaoId: 1,
          valor: 100,
          status: 'autorizado',
          referencia: 99
        }
      ]
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.inconsistencias).toContain(
      'AJUSTE_SEM_FUNDAMENTACAO'
    )
  })

  it('bloqueia calculo com compra inconsistente', () => {
    const resultado = calcular({
      compras: [
        { ...compra, valor: -100 }
      ]
    })

    expect(resultado.valido).toBe(false)
    expect(resultado.limiteDisponivel).toBeNull()
    expect(resultado.inconsistencias).toContain(
      'COMPRA_INVALIDA'
    )
  })

  it('nao modifica os registros recebidos', () => {
    const dados = {
      cartao: structuredClone(cartao),
      compras: [structuredClone(compra)],
      faturas: [structuredClone(fatura)],
      pagamentos: [structuredClone(pagamento)],
      estornos: [],
      ajustes: []
    }

    const antes = JSON.stringify(dados)

    calcularLimiteCartao(dados)

    expect(JSON.stringify(dados)).toBe(antes)
  })
})
