import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const codigo = readFileSync(
  new URL('../composables/useFinancas.js', import.meta.url),
  'utf8'
)

const inicio = codigo.indexOf(
  'function consolidarFaturaCartao('
)

const fim = codigo.indexOf(
  'function registrarCompraCartao(dadosCompra) {',
  inicio
)

if (inicio < 0 || fim <= inicio) {
  throw new Error('Funcao de consolidacao nao localizada.')
}

const fonte = codigo.slice(inicio, fim)

function criarCenario() {
  const parcela = {
    compraId: 1,
    numero: 1,
    total: 2,
    valor: 10.25,
    competencia: '2026-11'
  }

  const compra = {
    id: 1,
    cartaoId: 1,
    quantidadeParcelas: 2,
    parcelas: [
      { ...parcela },
      {
        compraId: 1,
        numero: 2,
        total: 2,
        valor: 10.25,
        competencia: '2026-12'
      }
    ]
  }

  const fatura = {
    id: 1,
    cartaoId: 1,
    competencia: '2026-11',
    fechamento: '2026-11-20',
    status: 'aberta',
    parcelas: [{ ...parcela }]
  }

  return {
    cartoesCredito: [{ id: 1 }],
    comprasCartao: [compra],
    faturasCartao: [fatura],
    fatura
  }
}

function executar(cenario) {
  const criarFuncao = new Function(
    `${fonte}; return consolidarFaturaCartao`
  )

  const consolidar = criarFuncao()

  return consolidar(cenario.fatura, {
    cartoesCredito: cenario.cartoesCredito,
    comprasCartao: cenario.comprasCartao,
    faturasCartao: cenario.faturasCartao
  })
}

describe('CART-HIST-01.8-E.14-C.3', () => {
  it('consolida fatura valida em centavos', () => {
    const cenario = criarCenario()
    const resultado = executar(cenario)

    expect(resultado.valido).toBe(true)
    expect(resultado.valorConsolidadoCentavos).toBe(1025)
  })

  it('bloqueia valor divergente da compra', () => {
    const cenario = criarCenario()
    cenario.fatura.parcelas[0].valor = 11

    expect(executar(cenario).valido).toBe(false)
  })

  it('bloqueia parcela duplicada', () => {
    const cenario = criarCenario()
    cenario.fatura.parcelas.push({
      ...cenario.fatura.parcelas[0]
    })

    expect(executar(cenario).valido).toBe(false)
  })

  it('bloqueia parcela vinculada a duas faturas', () => {
    const cenario = criarCenario()

    cenario.faturasCartao.push({
      ...cenario.fatura,
      id: 2,
      parcelas: [{ ...cenario.fatura.parcelas[0] }]
    })

    expect(executar(cenario).valido).toBe(false)
  })

  it('bloqueia data de fechamento inexistente', () => {
    const cenario = criarCenario()
    cenario.fatura.fechamento = '2026-02-30'

    expect(executar(cenario).valido).toBe(false)
  })

  it('bloqueia compra inexistente', () => {
    const cenario = criarCenario()
    cenario.comprasCartao = []

    expect(executar(cenario).valido).toBe(false)
  })

  it('soma corretamente valores decimais', () => {
    const cenario = criarCenario()

    cenario.comprasCartao.push({
      id: 2,
      cartaoId: 1,
      quantidadeParcelas: 1,
      parcelas: [{
        compraId: 2,
        numero: 1,
        total: 1,
        valor: 0.20,
        competencia: '2026-11'
      }]
    })

    cenario.fatura.parcelas.push({
      compraId: 2,
      numero: 1,
      total: 1,
      valor: 0.20,
      competencia: '2026-11'
    })

    expect(executar(cenario).valorConsolidadoCentavos).toBe(1045)
  })

  it('nao modifica os dados originais', () => {
    const cenario = criarCenario()
    const antes = JSON.stringify({
      cartoes: cenario.cartoesCredito,
      compras: cenario.comprasCartao,
      faturas: cenario.faturasCartao
    })

    executar(cenario)

    expect(JSON.stringify({
      cartoes: cenario.cartoesCredito,
      compras: cenario.comprasCartao,
      faturas: cenario.faturasCartao
    })).toBe(antes)
  })
})