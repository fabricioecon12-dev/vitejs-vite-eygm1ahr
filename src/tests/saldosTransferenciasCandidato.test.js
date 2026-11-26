import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const codigo = readFileSync(
  new URL('../composables/useFinancas.candidato-A.38.4.22.js', import.meta.url),
  'utf8'
)

function extrairFuncao(nome) {
  const inicio = codigo.indexOf(`function ${nome}(`)

  if (inicio < 0) {
    throw new Error(`Funcao nao encontrada: ${nome}`)
  }

  const abertura = codigo.indexOf('{', inicio)
  let profundidade = 0

  for (let i = abertura; i < codigo.length; i++) {
    if (codigo[i] === '{') profundidade++
    if (codigo[i] === '}') profundidade--

    if (profundidade === 0) {
      return codigo.slice(inicio, i + 1)
    }
  }

  throw new Error(`Funcao incompleta: ${nome}`)
}

const fonteSaldo = extrairFuncao('saldo')
const fonteSaldoDaConta = extrairFuncao('saldoDaConta')

function criarAmbiente({
  contas,
  transferencias,
  transacoes = [],
  mes = '2026-11'
}) {
  const mesSelecionado = {
    value: new Date(`${mes}-15T12:00:00`)
  }

  const contasRef = { value: contas }
  const transferenciasRef = { value: transferencias }
  const transacoesRef = { value: transacoes }

  const somar = (itens, tipo) =>
    itens
      .filter(item => item.tipo === tipo)
      .reduce((total, item) => total + item.valor, 0)

  const executar = new Function(
    'mesSelecionado',
    'contas',
    'transferencias',
    'transacoes',
    'somar',
    `${fonteSaldo}
     ${fonteSaldoDaConta}
     return { saldo, saldoDaConta }`
  )

  return executar(
    mesSelecionado,
    contasRef,
    transferenciasRef,
    transacoesRef,
    somar
  )
}

const contasBase = [
  { id: 1, saldoInicial: 1000 },
  { id: 2, saldoInicial: 500 }
]

function transferencia({
  id = 1,
  valor = 300,
  tarifa = 0,
  data = '2026-11-10',
  status = 'executada',
  origem = 1,
  destino = 2
} = {}) {
  return {
    id,
    contaOrigemId: origem,
    contaDestinoId: destino,
    valor,
    tarifa,
    data,
    status
  }
}

describe('Saldos com transferencias — candidato', () => {
  it('preserva o consolidado quando nao ha tarifa', () => {
    const ambiente = criarAmbiente({
      contas: contasBase,
      transferencias: [transferencia()]
    })

    expect(ambiente.saldoDaConta(1)).toBe(700)
    expect(ambiente.saldoDaConta(2)).toBe(800)
    expect(ambiente.saldo()).toBe(1500)
  })

  it('desconta somente a tarifa no consolidado', () => {
    const ambiente = criarAmbiente({
      contas: contasBase,
      transferencias: [transferencia({ tarifa: 4 })]
    })

    expect(ambiente.saldoDaConta(1)).toBe(696)
    expect(ambiente.saldoDaConta(2)).toBe(800)
    expect(ambiente.saldo()).toBe(1496)
  })

  it('respeita o ultimo dia do mes selecionado', () => {
    const ambiente = criarAmbiente({
      contas: contasBase,
      mes: '2026-10',
      transferencias: [
        transferencia({
          id: 1,
          valor: 100,
          tarifa: 2,
          data: '2026-10-10'
        }),
        transferencia({
          id: 2,
          valor: 300,
          tarifa: 4,
          data: '2026-11-10'
        })
      ]
    })

    expect(ambiente.saldoDaConta(1)).toBe(898)
    expect(ambiente.saldoDaConta(2)).toBe(600)
    expect(ambiente.saldo()).toBe(1498)
  })

  it('ignora transferencias nao executadas', () => {
    const ambiente = criarAmbiente({
      contas: contasBase,
      transferencias: [
        transferencia({ status: 'agendada', tarifa: 10 })
      ]
    })

    expect(ambiente.saldoDaConta(1)).toBe(1000)
    expect(ambiente.saldoDaConta(2)).toBe(500)
    expect(ambiente.saldo()).toBe(1500)
  })

  it('mantem consistencia com multiplas transferencias', () => {
    const ambiente = criarAmbiente({
      contas: contasBase,
      transferencias: [
        transferencia({
          id: 1,
          valor: 200,
          tarifa: 3
        }),
        transferencia({
          id: 2,
          origem: 2,
          destino: 1,
          valor: 100,
          tarifa: 2
        })
      ]
    })

    const origem = ambiente.saldoDaConta(1)
    const destino = ambiente.saldoDaConta(2)

    expect(origem).toBe(897)
    expect(destino).toBe(598)
    expect(ambiente.saldo()).toBe(1495)
    expect(origem + destino).toBe(ambiente.saldo())
  })
})