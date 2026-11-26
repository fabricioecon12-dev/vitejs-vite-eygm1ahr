import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

const codigo = readFileSync(
  new URL('../composables/useFinancas.candidato-A.38.4.22.js', import.meta.url),
  'utf8'
)

function extrairFuncao(nome) {
  const marcador = `function ${nome}(`
  const inicio = codigo.indexOf(marcador)

  if (inicio < 0 || codigo.indexOf(marcador, inicio + 1) >= 0) {
    throw new Error(`Funcao ausente ou duplicada: ${nome}`)
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

const fonte = extrairFuncao('executarTransferencia')

function ambiente(saldoInicial = 1000) {
  const contas = {
    value: [
      { id: 1, saldoInicial, ativa: true },
      { id: 2, saldoInicial: 0, ativa: true }
    ]
  }

  const transacoes = { value: [] }
  const transferencias = { value: [] }
  const limites = { value: {} }
  const saldoInicialGlobal = { value: 0 }
  const armazenamentoProtegido = { value: false }
  const aviso = { value: '' }

  const somar = (lista, tipo) =>
    lista
      .filter(item => item.tipo === tipo)
      .reduce((total, item) => total + item.valor, 0)

  const moeda = valor =>
    `R$ ${valor.toFixed(2).replace('.', ',')}`

  const executarOperacaoFinanceira = vi.fn(novosDados => {
    transferencias.value = novosDados.transferencias
    return true
  })

  const fonteConversor = codigo.match(

    /function converterCentavos\(numero\) \{[\s\S]*?^\}/m

  )?.[0]


  if (!fonteConversor) {

    throw new Error("Conversor monetario nao encontrado")

  }

  const fabrica = new Function(
    'contas',
    'transacoes',
    'transferencias',
    'limites',
    'saldoInicial',
    'armazenamentoProtegido',
    'aviso',
    'bloqueioPersistencia',
    'proximoId',
    'somar',
    'moeda',
    'executarOperacaoFinanceira',
    `${fonteConversor}
${fonte}
     return executarTransferencia`
  )

  const executarTransferencia = fabrica(
    contas,
    transacoes,
    transferencias,
    limites,
    saldoInicialGlobal,
    armazenamentoProtegido,
    aviso,
    false,
    1,
    somar,
    moeda,
    executarOperacaoFinanceira
  )

  function executar(valor, tarifa = 0) {
    return executarTransferencia({
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor,
      tarifa
    })
  }

  return {
    executar,
    transferencias,
    aviso,
    executarOperacaoFinanceira
  }
}

describe('Diagnostico monetario — transferencias', () => {
  it('aceita exatamente R$ 0,30 para valor e tarifa', () => {
    const ctx = ambiente(0.30)

    expect(ctx.executar(0.10, 0.20)).toBe(true)
    expect(ctx.transferencias.value).toHaveLength(1)
  })

  it('mantem saldo suficiente apos transferencias sucessivas', () => {
    const ctx = ambiente(0.30)

    expect(ctx.executar(0.10)).toBe(true)
    expect(ctx.executar(0.20)).toBe(true)

    expect(ctx.transferencias.value).toHaveLength(2)
  })

  it('bloqueia quando falta um centavo', () => {
    const ctx = ambiente(0.29)

    expect(ctx.executar(0.10, 0.20)).toBe(false)

    expect(ctx.executarOperacaoFinanceira)
      .not.toHaveBeenCalled()
  })

  it.each([
    [0.001, 0],
    [1.999, 0],
    [10, 0.001],
    [10, 0.999]
  ])('rejeita precisao superior a centavos: %s e %s', (valor, tarifa) => {
    const ctx = ambiente()

    expect(ctx.executar(valor, tarifa)).toBe(false)

    expect(ctx.executarOperacaoFinanceira)
      .not.toHaveBeenCalled()
  })

  it('rejeita total monetario acima do limite seguro em centavos', () => {
    const ctx = ambiente(Number.MAX_SAFE_INTEGER)

    const valor = Number.MAX_SAFE_INTEGER / 100 + 1

    expect(ctx.executar(valor, 0)).toBe(false)

    expect(ctx.executarOperacaoFinanceira)
      .not.toHaveBeenCalled()
  })

  it('rejeita soma monetaria que excede limite seguro', () => {
    const ctx = ambiente(Number.MAX_SAFE_INTEGER)

    const valor = Number.MAX_SAFE_INTEGER / 100
    const tarifa = 1

    expect(ctx.executar(valor, tarifa)).toBe(false)

    expect(ctx.executarOperacaoFinanceira)
      .not.toHaveBeenCalled()
  })
})