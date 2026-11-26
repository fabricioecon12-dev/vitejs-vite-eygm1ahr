import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const codigo = readFileSync(
  'src/components/ConsultaFaturasCartao.vue',
  'utf8'
)

const inicio = codigo.indexOf(
  'const fechamentoConfirmado ='
)

const fim = codigo.indexOf(
  'const identificadorPagamentoValido =',
  inicio
)

if (inicio < 0 || fim <= inicio) {
  throw new Error('Funcao de fechamento nao encontrada.')
}

const trecho = codigo.slice(inicio, fim)

const fechamentoConfirmado = new Function(
  'fechamentosFatura',
  `${trecho}; return fechamentoConfirmado`
)

const fatura = {
  id: 101,
  cartaoId: 10,
  competencia: '2026-11',
  fechamento: '2026-11-10',
  status: 'fechada'
}

const evento = {
  id: 'fechamento-101',
  faturaId: 101,
  cartaoId: 10,
  competencia: '2026-11',
  fechamentoPrevisto: '2026-11-10',
  fechamentoEfetivoEm: '2026-11-10T14:30:00.000Z',
  valorConsolidadoCentavos: 15000,
  status: 'confirmado'
}

const executar = (dadosFatura, eventos, total = 15000) => {
  const validar = fechamentoConfirmado({
    value: eventos
  })

  return validar(dadosFatura, total)
}

describe('CART-HIST-01.8-E.9.7-F.3', () => {
  it('mantem fatura aberta sem fechamento como valida', () => {
    const resultado = executar(
      { ...fatura, status: 'aberta' },
      []
    )

    expect(resultado.valido).toBe(true)
    expect(resultado.evento).toBeNull()
  })

  it('reconhece fechamento confirmado consistente', () => {
    const resultado = executar(fatura, [evento])

    expect(resultado.valido).toBe(true)
    expect(resultado.evento).toEqual(evento)
  })

  it('rejeita fatura fechada sem confirmacao', () => {
    const resultado = executar(fatura, [])

    expect(resultado.valido).toBe(false)
    expect(resultado.evento).toBeNull()
  })

  it('rejeita eventos duplicados e valores divergentes', () => {
    const duplicado = executar(
      fatura,
      [evento, { ...evento, id: 'outro-evento' }]
    )

    const divergente = executar(
      fatura,
      [{ ...evento, valorConsolidadoCentavos: 9999 }]
    )

    expect(duplicado.valido).toBe(false)
    expect(divergente.valido).toBe(false)
  })

  it('exibe data efetiva somente com confirmacao valida', () => {
    const confirmado = executar(fatura, [evento])
    const naoConfirmado = executar(fatura, [])

    expect(confirmado.evento?.fechamentoEfetivoEm)
      .toBe(evento.fechamentoEfetivoEm)

    expect(naoConfirmado.evento).toBeNull()

    expect(codigo).toContain(
      'Fechamento confirmado em {{ fatura.fechamentoEfetivo }}'
    )
  })
})