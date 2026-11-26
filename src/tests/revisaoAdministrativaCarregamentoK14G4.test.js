import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarDados() {
  return {
    versaoDados: 2,
    saldoInicial: 1000,
    proximoId: 1,
    limites: {},
    categoriasDespesa: ['Outros'],
    categoriasReceita: ['Outros'],
    transacoes: [],
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: [],
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: [],
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
      }
    ]
  }
}

async function preparar(dadosIniciais) {
  let armazenamento = JSON.stringify(dadosIniciais)

  const getItem = vi.fn(chave =>
    chave === CHAVE ? armazenamento : null
  )

  const setItem = vi.fn((chave, valor) => {
    if (chave === CHAVE) {
      armazenamento = valor
    }
  })

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  return {
    financas,
    getItem,
    setItem,
    armazenamento: () => JSON.parse(armazenamento),
    original: dadosIniciais
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('K.14-G.4 - revisao administrativa no carregamento', () => {
  it('G4-T01 - aceita dados legados sem revisao', async () => {
    const contexto = await preparar(criarDados())

    expect(
      contexto.financas.armazenamentoProtegido.value
    ).toBe(false)

    expect(contexto.financas.contas.value).toHaveLength(1)
    expect(contexto.setItem).not.toHaveBeenCalled()

    expect(
      contexto.armazenamento().revisaoAdministrativaTransferencias
    ).toBeUndefined()
  })

  it('G4-T02 - aceita e preserva revisao valida', async () => {
    const dados = {
      ...criarDados(),
      revisaoAdministrativaTransferencias: 7
    }

    const contexto = await preparar(dados)

    expect(
      contexto.financas.armazenamentoProtegido.value
    ).toBe(false)

    expect(contexto.financas.contas.value).toHaveLength(1)
    expect(contexto.setItem).not.toHaveBeenCalled()

    expect(
      contexto.armazenamento().revisaoAdministrativaTransferencias
    ).toBe(7)
  })

  it('G4-T03 - bloqueia carregamento com revisao invalida', async () => {
    for (const revisao of [-1, 1.5, '7']) {
      const dados = {
        ...criarDados(),
        revisaoAdministrativaTransferencias: revisao
      }

      const contexto = await preparar(dados)

      expect(
        contexto.financas.armazenamentoProtegido.value
      ).toBe(true)

      expect(contexto.setItem).not.toHaveBeenCalled()
      expect(contexto.armazenamento()).toEqual(dados)

      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })

  it('G4-T04 - impede migracao com revisao invalida', async () => {
    const dados = criarDados()

    delete dados.contas
    delete dados.versaoDados

    dados.revisaoAdministrativaTransferencias = -1

    const contexto = await preparar(dados)

    expect(
      contexto.financas.armazenamentoProtegido.value
    ).toBe(true)

    expect(contexto.setItem).not.toHaveBeenCalled()
    expect(contexto.armazenamento()).toEqual(dados)
  })
})
