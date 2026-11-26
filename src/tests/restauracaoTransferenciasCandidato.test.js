import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

const transferencia = {
  id: 1,
  contaOrigemId: 1,
  contaDestinoId: 2,
  valor: 100,
  tarifa: 2,
  data: '2026-11-16',
  status: 'executada'
}

function criarDados() {
  return {
    versaoDados: 2,
    saldoInicial: 1000,
    proximoId: 2,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [],
    contas: [
      {
        id: 1,
        nome: 'Conta principal',
        instituicao: 'Banco A',
        tipo: 'corrente',
        agencia: '',
        numero: '',
        saldoInicial: 1000,
        ativa: true,
        principal: true,
        dataCriacao: '2026-11-01'
      },
      {
        id: 2,
        nome: 'Conta reserva',
        instituicao: 'Banco B',
        tipo: 'poupanca',
        agencia: '',
        numero: '',
        saldoInicial: 500,
        ativa: true,
        principal: false,
        dataCriacao: '2026-11-01'
      }
    ],
    transferencias: [structuredClone(transferencia)]
  }
}

async function preparar({
  confirmar = true,
  falharGravacao = false
} = {}) {
  const dados = criarDados()
  const armazenamentoOriginal = JSON.stringify(dados)
  let armazenamentoAtual = armazenamentoOriginal

  const getItem = vi.fn(chave =>
    chave === CHAVE ? armazenamentoAtual : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (falharGravacao) {
      throw new Error('Falha simulada de gravacao')
    }

    if (chave === CHAVE) {
      armazenamentoAtual = valor
    }
  })

  const confirm = vi.fn(() => confirmar)

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.stubGlobal('confirm', confirm)
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.candidato-A.38.4.22.js'
  )

  return {
    financas: useFinancas(),
    confirm,
    setItem,
    armazenamentoOriginal,
    obterArmazenamento: () => armazenamentoAtual
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('Nexus Financas — restauracao com transferencias', () => {
  it('preserva todos os dados quando o usuario cancela', async () => {
    const ambiente = await preparar({ confirmar: false })
    const { financas, confirm, setItem } = ambiente

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const resultado = financas.demonstracao()

    expect(resultado).toBe(false)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(setItem).not.toHaveBeenCalled()
    expect(financas.transferencias.value).toEqual([transferencia])
    expect(financas.contas.value).toHaveLength(2)
    expect(ambiente.obterArmazenamento())
      .toBe(ambiente.armazenamentoOriginal)
  })

  it('remove transferencias apos confirmacao e gravacao', async () => {
    const ambiente = await preparar({ confirmar: true })
    const { financas, confirm, setItem } = ambiente

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const resultado = financas.demonstracao()

    expect(resultado).toBe(true)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledTimes(1)

    const persistidos = JSON.parse(
      ambiente.obterArmazenamento()
    )

    expect(persistidos.transferencias).toEqual([])
    expect(financas.transferencias.value).toEqual([])
    expect(persistidos.transacoes).toHaveLength(10)
    expect(financas.transacoes.value).toHaveLength(10)
    expect(persistidos.contas).toHaveLength(2)
  })

  it('preserva os dados quando a gravacao falha', async () => {
    const ambiente = await preparar({
      confirmar: true,
      falharGravacao: true
    })

    const { financas, confirm, setItem } = ambiente

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const resultado = financas.demonstracao()

    expect(resultado).toBe(false)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledTimes(1)

    expect(financas.transferencias.value).toEqual([transferencia])
    expect(financas.transacoes.value).toEqual([])
    expect(financas.contas.value[0].saldoInicial).toBe(1000)
    expect(financas.contas.value[1].saldoInicial).toBe(500)

    expect(ambiente.obterArmazenamento())
      .toBe(ambiente.armazenamentoOriginal)
  })
})