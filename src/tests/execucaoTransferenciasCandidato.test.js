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

const contasBase = () => [
  { id: 1, saldoInicial: 1000, ativa: true },
  { id: 2, saldoInicial: 200, ativa: true }
]

const dadosValidos = {
  contaOrigemId: 1,
  contaDestinoId: 2,
  valor: 300,
  tarifa: 5
}

function criarAmbiente({
  contas = contasBase(),
  transacoes = [],
  transferencias = [],
  persistenciaFalha = false
} = {}) {
  const estado = {
    contas: { value: structuredClone(contas) },
    transacoes: { value: structuredClone(transacoes) },
    transferencias: { value: structuredClone(transferencias) },
    limites: { value: {} },
    saldoInicial: { value: 0 },
    armazenamentoProtegido: { value: false },
    aviso: { value: '' }
  }

  let bloqueioPersistencia = false
  const proximoId = 1

  const somar = (itens, tipo) =>
    itens
      .filter(item => item.tipo === tipo)
      .reduce((total, item) => total + item.valor, 0)

  const moeda = valor =>
    `R$ ${valor.toFixed(2).replace('.', ',')}`

  const executarOperacaoFinanceira = vi.fn(
    (novosDados, mensagem) => {
      if (persistenciaFalha) return false

      estado.transferencias.value = novosDados.transferencias
      estado.aviso.value = mensagem
      return true
    }
  )

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
    estado.contas,
    estado.transacoes,
    estado.transferencias,
    estado.limites,
    estado.saldoInicial,
    estado.armazenamentoProtegido,
    estado.aviso,
    bloqueioPersistencia,
    proximoId,
    somar,
    moeda,
    executarOperacaoFinanceira
  )

  return {
    estado,
    executarTransferencia,
    executarOperacaoFinanceira
  }
}

describe('Execucao de transferencias — candidato', () => {
  it('registra uma transferencia valida com tarifa', () => {
    const ambiente = criarAmbiente()

    expect(ambiente.executarTransferencia(dadosValidos)).toBe(true)

    expect(ambiente.estado.transferencias.value).toHaveLength(1)

    expect(ambiente.estado.transferencias.value[0]).toMatchObject({
      id: 1,
      contaOrigemId: 1,
      contaDestinoId: 2,
      valor: 300,
      tarifa: 5,
      status: 'executada'
    })

    expect(ambiente.executarOperacaoFinanceira).toHaveBeenCalledTimes(1)
  })

  it('bloqueia saldo insuficiente incluindo a tarifa', () => {
    const ambiente = criarAmbiente()

    const resultado = ambiente.executarTransferencia({
      ...dadosValidos,
      valor: 998,
      tarifa: 5
    })

    expect(resultado).toBe(false)
    expect(ambiente.estado.aviso.value).toContain('Saldo insuficiente')
    expect(ambiente.estado.aviso.value).toContain('1.003,00'.replace('1.003,00', '1003,00'))
    expect(ambiente.executarOperacaoFinanceira).not.toHaveBeenCalled()
    expect(ambiente.estado.transferencias.value).toHaveLength(0)
  })

  it('bloqueia contas iguais', () => {
    const ambiente = criarAmbiente()

    expect(
      ambiente.executarTransferencia({
        ...dadosValidos,
        contaDestinoId: 1
      })
    ).toBe(false)

    expect(ambiente.executarOperacaoFinanceira).not.toHaveBeenCalled()
  })

  it('bloqueia contas inexistentes', () => {
    const ambiente = criarAmbiente()

    expect(
      ambiente.executarTransferencia({
        ...dadosValidos,
        contaDestinoId: 999
      })
    ).toBe(false)

    expect(ambiente.executarOperacaoFinanceira).not.toHaveBeenCalled()
  })

  it('bloqueia contas inativas', () => {
    const contas = contasBase()
    contas[1].ativa = false

    const ambiente = criarAmbiente({ contas })

    expect(ambiente.executarTransferencia(dadosValidos)).toBe(false)
    expect(ambiente.executarOperacaoFinanceira).not.toHaveBeenCalled()
  })

  it.each([
    { valor: 0, tarifa: 0 },
    { valor: -10, tarifa: 0 },
    { valor: NaN, tarifa: 0 },
    { valor: Infinity, tarifa: 0 },
    { valor: 10, tarifa: -1 },
    { valor: 10, tarifa: NaN },
    { valor: 10, tarifa: Infinity }
  ])('rejeita valores ou tarifas invalidos: %o', dados => {
    const ambiente = criarAmbiente()

    expect(
      ambiente.executarTransferencia({
        ...dadosValidos,
        ...dados
      })
    ).toBe(false)

    expect(ambiente.executarOperacaoFinanceira).not.toHaveBeenCalled()
  })

  it('preserva os registros quando a persistencia falha', () => {
    const ambiente = criarAmbiente({
      persistenciaFalha: true
    })

    const anterior = structuredClone(
      ambiente.estado.transferencias.value
    )

    expect(ambiente.executarTransferencia(dadosValidos)).toBe(false)

    expect(ambiente.estado.transferencias.value).toEqual(anterior)
    expect(ambiente.executarOperacaoFinanceira).toHaveBeenCalledTimes(1)
  })

  it('gera identificador unico para a proxima transferencia', () => {
    const ambiente = criarAmbiente({
      transferencias: [{
        id: 7,
        contaOrigemId: 1,
        contaDestinoId: 2,
        valor: 10,
        tarifa: 0,
        data: '2026-01-10',
        status: 'executada'
      }]
    })

    expect(ambiente.executarTransferencia(dadosValidos)).toBe(true)

    expect(
      ambiente.estado.transferencias.value.map(item => item.id)
    ).toEqual([7, 8])
  })

  it('nao cria receitas ou despesas convencionais', () => {
    const ambiente = criarAmbiente()

    expect(ambiente.executarTransferencia(dadosValidos)).toBe(true)

    expect(ambiente.estado.transacoes.value).toEqual([])
    expect(ambiente.estado.transferencias.value).toHaveLength(1)
  })
})