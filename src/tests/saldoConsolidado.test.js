import { describe, it, expect, vi } from 'vitest'

describe('Nexus Finanças — saldo consolidado bancário', () => {
  it('soma todas as contas sem duplicar o saldo legado', async () => {
    const dados = {
      versaoDados: 2,
      saldoInicial: 500,
      proximoId: 3,
      limites: {},
      categoriasDespesa: ['Outros'],
      categoriasReceita: ['Outros'],
      contas: [
        {
          id: 1,
          nome: 'Conta principal',
          instituicao: 'Banco A',
          tipo: 'corrente',
          agencia: '',
          numero: '',
          saldoInicial: 500,
          ativa: true,
          principal: true,
          dataCriacao: '2026-11-01'
        },
        {
          id: 2,
          nome: 'Conta secundária',
          instituicao: 'Banco B',
          tipo: 'poupanca',
          agencia: '',
          numero: '',
          saldoInicial: 200,
          ativa: false,
          principal: false,
          dataCriacao: '2026-11-01'
        }
      ],
      cartoesCredito: [],
      comprasCartao: [],
      faturasCartao: [],
      pagamentosFatura: [],
      pagamentosAntecipadosFatura: [],
      tentativasPagamentoFaturaRecusadas: [],
      fechamentosFatura: [],
      obrigacoesComplementaresFatura: [],
      pagamentosObrigacoesComplementares: [],
      transacoes: [
        {
          id: 1,
          contaId: 1,
          descricao: 'Receita',
          valor: 300,
          tipo: 'receita',
          categoria: 'Outros',
          data: '2026-11-10'
        },
        {
          id: 2,
          contaId: 1,
          descricao: 'Despesa',
          valor: 100,
          tipo: 'despesa',
          categoria: 'Outros',
          data: '2026-11-11'
        }
      ]
    }

    const getItem = vi.fn(() => JSON.stringify(dados))
    const setItem = vi.fn()

    vi.stubGlobal('localStorage', { getItem, setItem })

    try {
      vi.resetModules()

      const { useFinancas } = await import(
        '../composables/useFinancas.js'
      )

      const financas = useFinancas()

      financas.mesSelecionado.value = new Date(2026, 10, 1)

      expect(financas.armazenamentoProtegido.value).toBe(false)
      expect(financas.contas.value).toHaveLength(2)
      expect(financas.receitas()).toBe(300)
      expect(financas.despesas()).toBe(100)
      expect(financas.saldo()).toBe(900)
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
  it('considera saldo inicial negativo no saldo consolidado', async () => {
    const dados = {
      versaoDados: 2,
      saldoInicial: 500,
      proximoId: 3,
      limites: {},
      categoriasDespesa: ['Outros'],
      categoriasReceita: ['Outros'],
      contas: [
        {
          id: 1,
          nome: 'Conta principal',
          instituicao: 'Banco A',
          tipo: 'corrente',
          agencia: '',
          numero: '',
          saldoInicial: 500,
          ativa: true,
          principal: true,
          dataCriacao: '2026-11-01'
        },
        {
          id: 2,
          nome: 'Conta devedora',
          instituicao: 'Banco B',
          tipo: 'poupanca',
          agencia: '',
          numero: '',
          saldoInicial: -100,
          ativa: true,
          principal: false,
          dataCriacao: '2026-11-01'
        }
      ],
      cartoesCredito: [],
      comprasCartao: [],
      faturasCartao: [],
      pagamentosFatura: [],
      pagamentosAntecipadosFatura: [],
      tentativasPagamentoFaturaRecusadas: [],
      fechamentosFatura: [],
      obrigacoesComplementaresFatura: [],
      pagamentosObrigacoesComplementares: [],
      transacoes: [
        {
          id: 1,
          contaId: 1,
          descricao: 'Receita',
          valor: 300,
          tipo: 'receita',
          categoria: 'Outros',
          data: '2026-11-10'
        },
        {
          id: 2,
          contaId: 1,
          descricao: 'Despesa',
          valor: 100,
          tipo: 'despesa',
          categoria: 'Outros',
          data: '2026-11-11'
        }
      ]
    }

    const getItem = vi.fn(() => JSON.stringify(dados))
    const setItem = vi.fn()

    vi.stubGlobal('localStorage', { getItem, setItem })

    try {
      vi.resetModules()

      const { useFinancas } = await import(
        '../composables/useFinancas.js'
      )

      const financas = useFinancas()

      financas.mesSelecionado.value = new Date(2026, 10, 1)

      expect(financas.armazenamentoProtegido.value).toBe(false)
      expect(financas.contas.value).toHaveLength(2)
      expect(financas.contas.value[1].saldoInicial).toBe(-100)
      expect(financas.receitas()).toBe(300)
      expect(financas.despesas()).toBe(100)
      expect(financas.saldo()).toBe(600)
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
