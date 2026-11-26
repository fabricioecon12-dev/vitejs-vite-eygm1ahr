import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const codigo = readFileSync(
  new URL('../composables/useFinancas.js', import.meta.url),
  'utf8'
)

function extrairFuncao(nome, proximaFuncao) {
  const inicio = codigo.indexOf(`function ${nome}(`)
  const fim = codigo.indexOf(
    `function ${proximaFuncao}(`,
    inicio
  )

  if (inicio < 0 || fim <= inicio) {
    throw new Error(`Funcao nao localizada: ${nome}`)
  }

  return codigo.slice(inicio, fim)
}

const fonte = [
  extrairFuncao(
    'fechamentoFaturaArmazenadoValido',
    'recuperarColecoesCartoes'
  ),
  extrairFuncao(
    'recuperarColecoesCartoes',
    'carregarDadosLocais'
  )
].join('\n')

const recuperar = new Function(
  `${fonte}; return recuperarColecoesCartoes`
)()

function criarCenario(status = 'aberta') {
  return {
    cartoesCredito: [{ id: 1 }],
    comprasCartao: [],
    faturasCartao: [{
      id: 10,
      cartaoId: 1,
      competencia: '2026-11',
      fechamento: '2026-11-20',
      status,
      parcelas: []
    }],
    pagamentosFatura: [],
    fechamentosFatura: []
  }
}

function criarEvento(sobrescritas = {}) {
  return {
    id: 'fechamento-10',
    faturaId: 10,
    cartaoId: 1,
    competencia: '2026-11',
    fechamentoPrevisto: '2026-11-20',
    fechamentoEfetivoEm: '2026-11-20T15:00:00.000Z',
    valorConsolidadoCentavos: 0,
    status: 'confirmado',
    ...sobrescritas
  }
}

describe('CART-HIST-01.8-E.14-D.1-D.3-B', () => {
  it('recupera fatura aberta sem evento', () => {
    const dados = criarCenario()

    const resultado = recuperar(dados)

    expect(resultado.faturasCartao[0].status)
      .toBe('aberta')
    expect(resultado.fechamentosFatura).toHaveLength(0)
  })

  it('recupera fatura fechada com evento confirmado', () => {
    const dados = criarCenario('fechada')
    dados.fechamentosFatura.push(criarEvento())

    const resultado = recuperar(dados)

    expect(resultado.faturasCartao[0].status)
      .toBe('fechada')
    expect(resultado.fechamentosFatura).toHaveLength(1)
  })

  it('bloqueia fatura fechada sem evento', () => {
    const dados = criarCenario('fechada')

    expect(() => recuperar(dados))
      .toThrow(/Fatura fechada sem evento/)
  })

  it('bloqueia fatura aberta com evento confirmado', () => {
    const dados = criarCenario()
    dados.fechamentosFatura.push(criarEvento())

    expect(() => recuperar(dados))
      .toThrow(/Fatura aberta com evento/)
  })

  it('bloqueia dois eventos para a mesma fatura', () => {
    const dados = criarCenario('fechada')

    dados.fechamentosFatura.push(
      criarEvento(),
      criarEvento({ id: 'fechamento-10-duplicado' })
    )

    expect(() => recuperar(dados))
      .toThrow(/Vinculo de fechamento/)
  })

  it('bloqueia evento com cartao incorreto', () => {
    const dados = criarCenario('fechada')

    dados.fechamentosFatura.push(
      criarEvento({ cartaoId: 2 })
    )

    expect(() => recuperar(dados))
      .toThrow(/Vinculo de fechamento/)
  })

  it('bloqueia evento com competencia divergente', () => {
    const dados = criarCenario('fechada')

    dados.fechamentosFatura.push(
      criarEvento({ competencia: '2026-12' })
    )

    expect(() => recuperar(dados))
      .toThrow(/Vinculo de fechamento/)
  })

  it('bloqueia evento vinculado a fatura inexistente', () => {
    const dados = criarCenario('fechada')

    dados.fechamentosFatura.push(
      criarEvento({ faturaId: 999 })
    )

    expect(() => recuperar(dados))
      .toThrow(/Vinculo de fechamento/)
  })
})