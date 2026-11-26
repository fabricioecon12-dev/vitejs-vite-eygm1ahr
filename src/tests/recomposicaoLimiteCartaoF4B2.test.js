import { describe, it, expect } from 'vitest'
import { calcularLimiteCartao } from '../utils/calcularLimiteCartao.js'

function criarCenario({
  compras = [1000],
  pagamentos = [],
  estornos = [],
  ajustes = []
} = {}) {
  const cartao = {
    id: 2,
    limiteTotal: 5000,
    status: 'ativo'
  }

  return {
    cartao,
    compras: compras.map((valor, indice) => ({
      id: indice + 1,
      cartaoId: 2,
      valor,
      status: 'ativa'
    })),
    faturas: [{
      id: 10,
      cartaoId: 2,
      parcelas: []
    }],
    pagamentos: pagamentos.map((pagamento, indice) => ({
      id: `pagamento-${indice + 1}`,
      operacaoId: `operacao-${indice + 1}`,
      cartaoId: 2,
      faturaId: 10,
      valorPagoCentavos: pagamento.valorPagoCentavos,
      status: pagamento.status ?? 'confirmado'
    })),
    estornos,
    ajustes
  }
}

describe('Recomposicao do limite - F.4-B.2-T', () => {
  it('recompoe proporcionalmente pagamento parcial', () => {
    const resultado = calcularLimiteCartao(criarCenario({
      pagamentos: [{ valorPagoCentavos: 40000 }]
    }))

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteContratado).toBe(500000)
    expect(resultado.comprometido).toBe(100000)
    expect(resultado.recomposicaoLiquida).toBe(40000)
    expect(resultado.limiteDisponivel).toBe(440000)
  })

  it('recompoe integralmente o limite comprometido', () => {
    const resultado = calcularLimiteCartao(criarCenario({
      pagamentos: [{ valorPagoCentavos: 100000 }]
    }))

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteDisponivel).toBe(500000)
  })

  it('nao libera limite com pagamento pendente', () => {
    const resultado = calcularLimiteCartao(criarCenario({
      pagamentos: [{
        valorPagoCentavos: 40000,
        status: 'pendente'
      }]
    }))

    expect(resultado.valido).toBe(true)
    expect(resultado.limiteDisponivel).toBe(400000)
  })

  it('desconta estorno confirmado da recomposicao', () => {
    const resultado = calcularLimiteCartao(criarCenario({
      pagamentos: [{ valorPagoCentavos: 40000 }],
      estornos: [{
        id: 'estorno-1',
        pagamentoId: 'pagamento-1',
        valor: 100,
        status: 'confirmado'
      }]
    }))

    expect(resultado.valido).toBe(true)
    expect(resultado.recomposicaoLiquida).toBe(30000)
    expect(resultado.limiteDisponivel).toBe(430000)
  })

  it('bloqueia pagamentos com identificadores duplicados', () => {
    const dados = criarCenario({
      pagamentos: [
        { valorPagoCentavos: 20000 },
        { valorPagoCentavos: 20000 }
      ]
    })

    dados.pagamentos[1].id = dados.pagamentos[0].id

    const resultado = calcularLimiteCartao(dados)

    expect(resultado.valido).toBe(false)
    expect(resultado.inconsistencias)
      .toContain('IDENTIFICADOR_DUPLICADO')
    expect(resultado.limiteDisponivel).toBeNull()
  })

  it('bloqueia recomposicao superior ao limite contratado', () => {
    const resultado = calcularLimiteCartao(criarCenario({
      pagamentos: [{ valorPagoCentavos: 110000 }]
    }))

    expect(resultado.valido).toBe(false)
    expect(resultado.inconsistencias)
      .toContain('LIMITE_DISPONIVEL_INCONSISTENTE')
    expect(resultado.limiteDisponivel).toBeNull()
  })
})