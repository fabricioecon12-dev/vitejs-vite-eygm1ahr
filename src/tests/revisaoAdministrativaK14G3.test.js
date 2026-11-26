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
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: [],
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
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
    armazenamento: () => JSON.parse(armazenamento)
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('K.14-G.3 - compatibilidade da revisao administrativa', () => {
  it('G3-T01 - inicializa revisao ausente como zero', async () => {
    const contexto = await preparar(criarDados())

    const resultado = contexto.financas.adicionarCategoria(
      'Categoria Teste',
      'despesa'
    )

    expect(resultado).toBe(true)
    expect(contexto.setItem).toHaveBeenCalled()

    expect(
      contexto.armazenamento().revisaoAdministrativaTransferencias
    ).toBe(0)
  })

  it('G3-T02 - preserva revisao administrativa existente', async () => {
    const dados = {
      ...criarDados(),
      revisaoAdministrativaTransferencias: 7
    }

    const contexto = await preparar(dados)

    const resultado = contexto.financas.adicionarCategoria(
      'Categoria Teste',
      'despesa'
    )

    expect(resultado).toBe(true)

    expect(
      contexto.armazenamento().revisaoAdministrativaTransferencias
    ).toBe(7)
  })

  it('G3-T03 - bloqueia revisoes administrativas invalidas', async () => {
    for (const revisao of [-1, 1.5, '7']) {
      const dados = {
        ...criarDados(),
        revisaoAdministrativaTransferencias: revisao
      }

      const contexto = await preparar(dados)

      const resultado = contexto.financas.adicionarCategoria(
      'Categoria Teste',
      'despesa'
    )

      expect(resultado).toBe(false)
      expect(contexto.setItem).not.toHaveBeenCalled()
      expect(
        contexto.financas.armazenamentoProtegido.value
      ).toBe(true)

      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      vi.resetModules()
    }
  })
})