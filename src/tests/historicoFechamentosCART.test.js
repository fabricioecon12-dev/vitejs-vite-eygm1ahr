import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const codigo = readFileSync(
  'src/components/HistoricoCartoesCredito.vue',
  'utf8'
)

const inicio = codigo.indexOf(
  'function validarFechamentoHistorico(evento) {'
)

const fim = codigo.indexOf(
  'function formatarDataHora(valor) {',
  inicio
)

if (inicio < 0 || fim <= inicio) {
  throw new Error('Validacao do historico nao localizada.')
}

const fonteValidacao = codigo.slice(inicio, fim)

const criarValidador = new Function(
  'cartoesCredito',
  'comprasCartao',
  'faturasCartao',
  'fechamentosFatura',
  `${fonteValidacao}; return validarFechamentoHistorico`
)

function criarCenario() {
  const parcela = {
    compraId: 10,
    numero: 1,
    total: 2,
    valor: 125.50,
    competencia: '2026-11'
  }

  const compra = {
    id: 10,
    cartaoId: 1,
    quantidadeParcelas: 2,
    parcelas: [
      { ...parcela },
      {
        compraId: 10,
        numero: 2,
        total: 2,
        valor: 125.50,
        competencia: '2026-12'
      }
    ]
  }

  const fatura = {
    id: 101,
    cartaoId: 1,
    competencia: '2026-11',
    fechamento: '2026-11-20',
    status: 'fechada',
    parcelas: [{ ...parcela }]
  }

  const evento = {
    id: 'fechamento-101',
    faturaId: 101,
    cartaoId: 1,
    competencia: '2026-11',
    fechamentoPrevisto: '2026-11-20',
    fechamentoEfetivoEm: '2026-11-20T14:30:00.000Z',
    valorConsolidadoCentavos: 12550,
    status: 'confirmado'
  }

  return {
    cartoesCredito: [{ id: 1, nome: 'Cartao teste' }],
    comprasCartao: [compra],
    faturasCartao: [fatura],
    fechamentosFatura: [evento],
    fatura,
    compra,
    evento
  }
}

function executar(cenario, evento = cenario.evento) {
  const validar = criarValidador(
    { value: cenario.cartoesCredito },
    { value: cenario.comprasCartao },
    { value: cenario.faturasCartao },
    { value: cenario.fechamentosFatura }
  )

  return validar(evento)
}

describe('CART-HIST-01.8-E.9.7-G.3-D.4-B', () => {
  it('reconhece fechamento integro e valor consolidado', () => {
    const cenario = criarCenario()
    const resultado = executar(cenario)

    expect(resultado).toEqual({
      valido: true,
      motivo: null
    })

    expect(
      cenario.evento.valorConsolidadoCentavos
    ).toBe(12550)
  })

  it('rejeita valor consolidado divergente', () => {
    const cenario = criarCenario()

    cenario.evento.valorConsolidadoCentavos = 13000

    const resultado = executar(cenario)

    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toBe(
      'Valor consolidado divergente'
    )
  })

  it('identifica fechamento duplicado sem excluir registros', () => {
    const cenario = criarCenario()

    cenario.fechamentosFatura.push({
      ...cenario.evento,
      fechamentoEfetivoEm: '2026-11-20T15:00:00.000Z'
    })

    const quantidadeAnterior =
      cenario.fechamentosFatura.length

    const resultado = executar(cenario)

    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toBe(
      'Fechamentos duplicados'
    )

    expect(cenario.fechamentosFatura).toHaveLength(
      quantidadeAnterior
    )
  })

  it('detecta parcela divergente da compra original', () => {
    const cenario = criarCenario()

    cenario.fatura.parcelas[0].valor = 130.00

    const resultado = executar(cenario)

    expect(resultado.valido).toBe(false)
    expect(resultado.motivo).toBe(
      'Dados da parcela divergem da compra original'
    )
  })

  it('preserva eventos inconsistentes na linha do tempo sem valor confirmado', () => {
    const cenario = criarCenario()

    cenario.fechamentosFatura.push({
      ...cenario.evento,
      id: 'fechamento-duplicado',
      fechamentoEfetivoEm: '2026-11-20T16:00:00.000Z'
    })

    const inicioEventos = codigo.indexOf(
      'const eventos = computed(() => {'
    )

    const fimEventos = codigo.indexOf(
      'const periodos = computed(() => {',
      inicioEventos
    )

    expect(inicioEventos).toBeGreaterThanOrEqual(0)
    expect(fimEventos).toBeGreaterThan(inicioEventos)

    const fonteEventos = codigo.slice(
      inicioEventos,
      fimEventos
    )

    const construirEventos = new Function(
      'computed',
      'cartoesCredito',
      'comprasCartao',
      'faturasCartao',
      'fechamentosFatura',
      'validarFechamentoHistorico',
      'nomeCartao',
      'formatarCompetencia',
      'formatarData',
      'formatarDataHora',
      'moeda',
      'dataValida',
      `${fonteEventos}; return eventos`
    )

    const referencias = [
      { value: cenario.cartoesCredito },
      { value: cenario.comprasCartao },
      { value: cenario.faturasCartao },
      { value: cenario.fechamentosFatura }
    ]

    const validar = criarValidador(...referencias)

    const computed = funcao => ({
      get value() {
        return funcao()
      }
    })

    const formatar = valor => String(valor ?? '')

    const eventos = construirEventos(
      computed,
      ...referencias,
      validar,
      id => `Cartao #${id}`,
      formatar,
      formatar,
      formatar,
      valor => typeof valor === 'number' && Number.isFinite(valor)
        ? `R$ ${valor.toFixed(2)}`
        : 'Indisponível',
      valor => {
        const data = new Date(valor)
        return Number.isFinite(data.getTime())
          ? data
          : null
      }
    )

    const fechamentos = eventos.value.filter(
      item => item.tipo === 'fechamento'
    )

    expect(fechamentos).toHaveLength(2)

    expect(
      new Set(fechamentos.map(item => item.chave)).size
    ).toBe(2)

    for (const fechamento of fechamentos) {
      expect(fechamento.titulo).toBe(
        'Fechamento com inconsistência'
      )

      expect(fechamento.valor).toBeNull()

      expect(fechamento.detalhes).toContainEqual([
        'Valor consolidado',
        'Indisponível'
      ])
    }

    expect(cenario.fechamentosFatura).toHaveLength(2)
  })
})