
import { describe, it, expect, vi } from 'vitest'
import { nextTick } from 'vue'

describe('Nexus Finanças — segurança dos dados', () => {
  it('recupera dados financeiros válidos do armazenamento', async () => {
    const dados = {
      transacoes: [
        {
          id: 1,
          descricao: 'Receita de teste',
          valor: 1500,
          tipo: 'receita',
          categoria: 'Salário',
          data: '2026-11-03'
        }
      ],
      limites: {
        '2026-11': 3000
      },
      saldoInicial: 500,
      proximoId: 2
    }

    const getItem = vi.fn(() => JSON.stringify(dados))
    const setItem = vi.fn()

    vi.stubGlobal('localStorage', {
      getItem,
      setItem
    })

    try {
      vi.resetModules()

      const { useFinancas } = await import('../composables/useFinancas.js')
      const financas = useFinancas()

      expect(getItem).toHaveBeenCalledWith('nexus-financas-dados-v1')
      expect(financas.transacoes.value).toHaveLength(1)
      expect(financas.transacoes.value[0].descricao).toBe('Receita de teste')
      expect(financas.saldoInicial.value).toBe(500)
      expect(financas.limites.value['2026-11']).toBe(3000)
      expect(financas.armazenamentoProtegido.value).toBe(false)
      expect(setItem).not.toHaveBeenCalled()
      await nextTick()
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
  
  it('salva uma nova transação após recuperar os dados', async () => {
    const dados = {
      transacoes: [],
      limites: {},
      saldoInicial: 500,
      proximoId: 1
    }

    const getItem = vi.fn(() => JSON.stringify(dados))
    const setItem = vi.fn()

    vi.stubGlobal('localStorage', { getItem, setItem })

    try {
      vi.resetModules()

      const { useFinancas } = await import('../composables/useFinancas.js')
      const financas = useFinancas()

      expect(setItem).not.toHaveBeenCalled()

      financas.adicionar({
        descricao: 'Compra de teste',
        valor: 100,
        tipo: 'despesa',
        categoria: 'Alimentação',
        data: '2026-11-03'
      })

      await nextTick()

      expect(financas.transacoes.value).toHaveLength(1)
      expect(setItem).toHaveBeenCalled()

      const dadosSalvos = JSON.parse(setItem.mock.lastCall[1])

      expect(dadosSalvos.transacoes[0].descricao).toBe('Compra de teste')
      expect(dadosSalvos.transacoes[0].valor).toBe(100)
      expect(dadosSalvos.proximoId).toBe(2)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  
  
})

it('protege dados corrompidos sem sobrescrever o armazenamento', async () => {
    const conteudoOriginal = '{"transacoes":INVALIDO'

    const getItem = vi.fn(() => conteudoOriginal)
    const setItem = vi.fn()

    vi.stubGlobal('localStorage', { getItem, setItem })

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      vi.resetModules()

      const { useFinancas } = await import('../composables/useFinancas.js')
      const financas = useFinancas()

      await nextTick()

      expect(getItem).toHaveBeenCalledWith('nexus-financas-dados-v1')
      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(financas.transacoes.value).toHaveLength(0)
      expect(setItem).not.toHaveBeenCalled()

      financas.adicionar({
        descricao: 'Operação bloqueada',
        valor: 100,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-11-03'
      })

      await nextTick()

      expect(financas.transacoes.value).toHaveLength(0)
      expect(setItem).not.toHaveBeenCalled()
      expect(getItem()).toBe(conteudoOriginal)
    } finally {
      consoleError.mockRestore()
      vi.unstubAllGlobals()
    }
  })
  
  it('bloqueia operações quando a leitura do armazenamento falha', async () => {
    const getItem = vi.fn(() => {
      throw new Error('Acesso ao armazenamento negado')
    })

    const setItem = vi.fn()

    vi.stubGlobal('localStorage', { getItem, setItem })

    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      vi.resetModules()

      const { useFinancas } = await import('../composables/useFinancas.js')
      const financas = useFinancas()

      await nextTick()

      expect(getItem).toHaveBeenCalledWith('nexus-financas-dados-v1')
      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(setItem).not.toHaveBeenCalled()

      financas.adicionar({
        descricao: 'Transação bloqueada',
        valor: 250,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-11-03'
      })

      await nextTick()

      expect(financas.transacoes.value).toHaveLength(0)
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
      vi.unstubAllGlobals()
    }
  })
  
  it('bloqueia novas alterações após falha de gravação', async () => {
    const dados = {
      transacoes: [],
      limites: {},
      saldoInicial: 500,
      proximoId: 1
    }

    const getItem = vi.fn(() => JSON.stringify(dados))
    const setItem = vi.fn(() => {
      throw new Error('Falha simulada de gravação')
    })

    vi.stubGlobal('localStorage', { getItem, setItem })

    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      vi.resetModules()

      const { useFinancas } = await import('../composables/useFinancas.js')
      const financas = useFinancas()

      expect(financas.armazenamentoProtegido.value).toBe(false)

      financas.adicionar({
        descricao: 'Primeira operação',
        valor: 100,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-11-03'
      })

      await nextTick()

      expect(setItem).toHaveBeenCalledTimes(1)
      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(financas.aviso.value).toContain('Não foi possível salvar')

      financas.adicionar({
        descricao: 'Segunda operação',
        valor: 200,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-11-03'
      })

      await nextTick()

      expect(financas.transacoes.value).toHaveLength(0)
      expect(setItem).toHaveBeenCalledTimes(1)
    } finally {
      consoleError.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  describe('Nexus Finanças — inicialização protegida', () => {
    it('inicializa armazenamento vazio com dados demonstrativos', async () => {
      const confirmar = vi.fn(() => true)
      vi.stubGlobal('confirm', confirmar)
    
      const getItem = vi.fn(() => null)
      const setItem = vi.fn()
  
      vi.stubGlobal('localStorage', { getItem, setItem })
  
      try {
        vi.resetModules()
  
        const { useFinancas } = await import('../composables/useFinancas.js')
        const financas = useFinancas()
  
        await nextTick()
  
        expect(
          getItem.mock.calls.filter(
            ([chave]) => chave === 'nexus-financas-dados-v1'
          )
        ).toHaveLength(1)
        expect(confirmar).not.toHaveBeenCalled()
        expect(financas.armazenamentoProtegido.value).toBe(false)
        expect(financas.transacoes.value).toHaveLength(10)
        expect(setItem).toHaveBeenCalledTimes(1)
  
        const dadosSalvos = JSON.parse(setItem.mock.lastCall[1])
  
        expect(dadosSalvos.transacoes).toHaveLength(10)
        expect(dadosSalvos.saldoInicial).toBe(5380)
        expect(dadosSalvos.proximoId).toBe(11)
      } finally {
        vi.unstubAllGlobals()
      }
    })
  
    it('preserva armazenamento com estrutura inválida', async () => {
      const conteudoOriginal = JSON.stringify({
        transacoes: 'estrutura inválida',
        limites: {},
        saldoInicial: 500,
        proximoId: 1
      })
  
      const getItem = vi.fn(() => conteudoOriginal)
      const setItem = vi.fn()
  
      vi.stubGlobal('localStorage', { getItem, setItem })
  
      const consoleError = vi.spyOn(console, 'error')
        .mockImplementation(() => {})
  
      try {
        vi.resetModules()
  
        const { useFinancas } = await import('../composables/useFinancas.js')
        const financas = useFinancas()
  
        await nextTick()
  
        expect(financas.armazenamentoProtegido.value).toBe(true)
        expect(financas.transacoes.value).toHaveLength(0)
        expect(setItem).not.toHaveBeenCalled()
        expect(
          getItem.mock.calls.filter(
            ([chave]) => chave === 'nexus-financas-dados-v1'
          )
        ).toHaveLength(1)
      } finally {
        consoleError.mockRestore()
        vi.unstubAllGlobals()
      }
    })
  
    it('protege o sistema se a gravação inicial falhar', async () => {
      const getItem = vi.fn(() => null)
      const setItem = vi.fn(() => {
        throw new Error('Falha simulada na gravação inicial')
      })
  
      vi.stubGlobal('localStorage', { getItem, setItem })
  
      const consoleError = vi.spyOn(console, 'error')
        .mockImplementation(() => {})
  
      try {
        vi.resetModules()
  
        const { useFinancas } = await import('../composables/useFinancas.js')
        const financas = useFinancas()
  
        await nextTick()
  
        expect(
          getItem.mock.calls.filter(
            ([chave]) => chave === 'nexus-financas-dados-v1'
          )
        ).toHaveLength(1)
        expect(setItem).toHaveBeenCalledTimes(1)
        expect(financas.armazenamentoProtegido.value).toBe(true)
        expect(financas.aviso.value).toContain('Não foi possível salvar')
  
        const quantidadeAntes = financas.transacoes.value.length
  
        financas.adicionar({
          descricao: 'Operação bloqueada',
          valor: 100,
          tipo: 'despesa',
          categoria: 'Outros',
          data: '2026-11-03'
        })
  
        await nextTick()
  
        expect(financas.transacoes.value).toHaveLength(quantidadeAntes)
        expect(setItem).toHaveBeenCalledTimes(1)
      } finally {
        consoleError.mockRestore()
        vi.unstubAllGlobals()
      }
    })
  })
  
describe('Nexus Finanças — operações financeiras', () => {
    const dadosIniciais = {
      transacoes: [
        {
          id: 1,
          descricao: 'Despesa de teste',
          valor: 150,
          tipo: 'despesa',
          categoria: 'Outros',
          data: '2026-11-03'
        }
      ],
      limites: { '2026-11': 4000 },
      saldoInicial: 5380,
      proximoId: 2
    }
  
    async function prepararFinancas(falharGravacao = false) {
      const getItem = vi.fn(() => JSON.stringify(dadosIniciais))
      const setItem = vi.fn(() => {
        if (falharGravacao) {
          throw new Error('Falha simulada de gravação')
        }
      })
  
      vi.stubGlobal('localStorage', { getItem, setItem })
      vi.resetModules()
  
      const { useFinancas } = await import('../composables/useFinancas.js')
  
      return { financas: useFinancas(), setItem }
    }
  
    it('exclui uma transação após confirmação', async () => {
      vi.stubGlobal('confirm', vi.fn(() => true))
  
      try {
        const { financas, setItem } = await prepararFinancas()
  
        financas.excluir(1)
  
        expect(financas.transacoes.value).toHaveLength(0)
        expect(setItem).toHaveBeenCalledTimes(1)
  
        const dados = JSON.parse(setItem.mock.lastCall[1])
        expect(dados.transacoes).toHaveLength(0)
      } finally {
        vi.unstubAllGlobals()
      }
    })
  
    it('não exclui uma transação quando o usuário cancela', async () => {
      vi.stubGlobal('confirm', vi.fn(() => false))
  
      try {
        const { financas, setItem } = await prepararFinancas()
  
        financas.excluir(1)
  
        expect(financas.transacoes.value).toHaveLength(1)
        expect(setItem).not.toHaveBeenCalled()
      } finally {
        vi.unstubAllGlobals()
      }
    })
  
    it('salva o limite mensal informado', async () => {
      try {
        const { financas, setItem } = await prepararFinancas()
  
        financas.mesSelecionado.value = new Date(2026, 10, 1)
        financas.limiteEditando.value = '5.500,00'
        financas.salvarLimite()
  
        expect(financas.limiteAtual()).toBe(5500)
        expect(setItem).toHaveBeenCalledTimes(1)
  
        const dados = JSON.parse(setItem.mock.lastCall[1])
        expect(dados.limites['2026-11']).toBe(5500)
      } finally {
        vi.unstubAllGlobals()
      }
    })
  
    
it('preserva a transação quando a exclusão falha ao salvar', async () => {
  vi.stubGlobal('confirm', vi.fn(() => true))

  const consoleError = vi.spyOn(console, 'error')
    .mockImplementation(() => {})

  try {
    const { financas, setItem } = await prepararFinancas(true)

    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )

    const limitesAntes = { ...financas.limites.value }
    const saldoAntes = financas.saldoInicial.value

    financas.excluir(1)

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.limites.value).toEqual(limitesAntes)
    expect(financas.saldoInicial.value).toBe(saldoAntes)

    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.aviso.value).toContain('Não foi possível salvar')
    expect(financas.aviso.value).not.toContain('excluída com sucesso')
  } finally {
    consoleError.mockRestore()
    vi.unstubAllGlobals()
  }
})
  
  it('limpa os dados com uma única gravação', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))

    try {
      const { financas, setItem } = await prepararFinancas()

      financas.limpar()

      expect(setItem).toHaveBeenCalledTimes(1)
      expect(financas.transacoes.value).toEqual([])
      expect(financas.limites.value).toEqual({})
      expect(financas.saldoInicial.value).toBe(0)

      const dados = JSON.parse(setItem.mock.lastCall[1])

      expect(dados.transacoes).toEqual([])
      expect(dados.limites).toEqual({})
      expect(dados.saldoInicial).toBe(0)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('preserva os dados em memória quando a limpeza falha', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      const { financas, setItem } = await prepararFinancas(true)

      const transacoesAntes = JSON.parse(
        JSON.stringify(financas.transacoes.value)
      )
      const limitesAntes = { ...financas.limites.value }
      const saldoAntes = financas.saldoInicial.value

      financas.limpar()

      expect(setItem).toHaveBeenCalledTimes(1)
      expect(financas.transacoes.value).toEqual(transacoesAntes)
      expect(financas.limites.value).toEqual(limitesAntes)
      expect(financas.saldoInicial.value).toBe(saldoAntes)
      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(financas.aviso.value).toContain('Não foi possível salvar')
    } finally {
      consoleError.mockRestore()
      vi.unstubAllGlobals()
    }
  })
  
it('adiciona uma transação com uma única gravação', async () => {
  try {
    const { financas, setItem } = await prepararFinancas()

    financas.adicionar({
      descricao: 'Nova despesa',
      valor: 200,
      tipo: 'despesa',
      categoria: 'Outros',
      data: '2026-11-03'
    })

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toHaveLength(2)
    expect(financas.transacoes.value[1].id).toBe(2)

    const dados = JSON.parse(setItem.mock.lastCall[1])

    expect(dados.transacoes).toHaveLength(2)
    expect(dados.transacoes[1].id).toBe(2)
    expect(dados.proximoId).toBe(3)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('preserva a inclusão e o identificador quando a gravação falha', async () => {
  const consoleError = vi.spyOn(console, 'error')
    .mockImplementation(() => {})

  try {
    const { financas, setItem } = await prepararFinancas(true)

    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )

    financas.adicionar({
      descricao: 'Despesa não salva',
      valor: 200,
      tipo: 'despesa',
      categoria: 'Outros',
      data: '2026-11-03'
    })

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.aviso.value).toContain('Não foi possível salvar')

    const tentativa = JSON.parse(setItem.mock.lastCall[1])

    expect(tentativa.proximoId).toBe(3)
    expect(transacoesAntes[0].id).toBe(1)
  } finally {
    consoleError.mockRestore()
    vi.unstubAllGlobals()
  }
})
it('preserva o orçamento mensal quando a gravação falha', async () => {
  const consoleError = vi.spyOn(console, 'error')
    .mockImplementation(() => {})

  try {
    const { financas, setItem } = await prepararFinancas(true)

    financas.mesSelecionado.value = new Date(2026, 10, 1)

    const limitesAntes = { ...financas.limites.value }
    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )
    const saldoAntes = financas.saldoInicial.value

    financas.limiteEditando.value = '5.500,00'
    financas.salvarLimite()

    expect(setItem).toHaveBeenCalledTimes(1)

    expect(financas.limites.value).toEqual(limitesAntes)
    expect(financas.limiteAtual()).toBe(4000)
    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.saldoInicial.value).toBe(saldoAntes)

    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.aviso.value).toContain('Não foi possível salvar')
    expect(financas.aviso.value).not.toContain('Limite mensal atualizado')

    const tentativa = JSON.parse(setItem.mock.lastCall[1])

    expect(tentativa.limites['2026-11']).toBe(5500)
  } finally {
    consoleError.mockRestore()
    vi.unstubAllGlobals()
  }
})
it('preserva os dados quando o usuário cancela a restauração', async () => {
  const confirmar = vi.fn(() => false)
  vi.stubGlobal('confirm', confirmar)

  try {
    const { financas, setItem } = await prepararFinancas()

    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )
    const limitesAntes = { ...financas.limites.value }
    const saldoAntes = financas.saldoInicial.value
    const mesAntes = financas.mesSelecionado.value.getTime()
    const limiteEditandoAntes = financas.limiteEditando.value

    financas.demonstracao()

    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(setItem).not.toHaveBeenCalled()

    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.limites.value).toEqual(limitesAntes)
    expect(financas.saldoInicial.value).toBe(saldoAntes)
    expect(financas.mesSelecionado.value.getTime()).toBe(mesAntes)
    expect(financas.limiteEditando.value).toBe(limiteEditandoAntes)
    expect(financas.armazenamentoProtegido.value).toBe(false)
  } finally {
    vi.unstubAllGlobals()
  }
})
it('restaura exemplos com uma única gravação', async () => {
    const confirmar = vi.fn(() => true)
    vi.stubGlobal('confirm', confirmar)
    try {
    const { financas, setItem } = await prepararFinancas()

    financas.demonstracao()

    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toHaveLength(10)
    expect(financas.saldoInicial.value).toBe(5380)
    expect(financas.armazenamentoProtegido.value).toBe(false)
    expect(financas.aviso.value).toBe(
      'Dados demonstrativos restaurados.'
    )

    const dados = JSON.parse(setItem.mock.lastCall[1])

    expect(dados.transacoes).toHaveLength(10)
    expect(dados.limites).toEqual(financas.limites.value)
    expect(dados.saldoInicial).toBe(5380)
    expect(dados.proximoId).toBe(11)
    expect(dados.transacoes).toEqual(financas.transacoes.value)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('preserva os dados quando a restauração falha', async () => {
  const confirmar = vi.fn(() => true)
  vi.stubGlobal('confirm', confirmar)

  const consoleError = vi.spyOn(console, 'error')
    .mockImplementation(() => {})

  try {
    const { financas, setItem } = await prepararFinancas(true)

    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )
    const limitesAntes = { ...financas.limites.value }
    const saldoAntes = financas.saldoInicial.value
    const mesAntes = financas.mesSelecionado.value.getTime()
    const limiteEditandoAntes = financas.limiteEditando.value

    financas.demonstracao()

    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.limites.value).toEqual(limitesAntes)
    expect(financas.saldoInicial.value).toBe(saldoAntes)
    expect(financas.mesSelecionado.value.getTime()).toBe(mesAntes)
    expect(financas.limiteEditando.value).toBe(limiteEditandoAntes)

    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.aviso.value).toContain('Não foi possível salvar')
    expect(financas.aviso.value).not.toContain(
      'Dados demonstrativos restaurados.'
    )

    const tentativa = JSON.parse(setItem.mock.lastCall[1])

    expect(tentativa.transacoes).toHaveLength(10)
    expect(tentativa.proximoId).toBe(11)
  } finally {
    consoleError.mockRestore()
    vi.unstubAllGlobals()
  }
})

it('edita uma transação e preserva seu identificador', async () => {
  try {
    const { financas, setItem } = await prepararFinancas()

    const sucesso = financas.editar(1, {
      descricao: 'Despesa atualizada',
      valor: 275,
      tipo: 'despesa',
      categoria: 'Alimentação',
      data: '2026-11-05'
    })

    expect(sucesso).toBe(true)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toHaveLength(1)

    const transacao = financas.transacoes.value[0]

    expect(transacao.id).toBe(1)
    expect(transacao.descricao).toBe('Despesa atualizada')
    expect(transacao.valor).toBe(275)
    expect(transacao.categoria).toBe('Alimentação')
    expect(transacao.data).toBe('2026-11-05')

    const dadosSalvos = JSON.parse(setItem.mock.lastCall[1])

    expect(dadosSalvos.transacoes[0]).toEqual(transacao)
    expect(dadosSalvos.proximoId).toBe(2)
    expect(financas.aviso.value).toBe(
      'Transação atualizada com sucesso!'
    )
  } finally {
    vi.unstubAllGlobals()
  }
})

it('preserva a transação original quando a edição falha ao salvar', async () => {
  const consoleError = vi.spyOn(console, 'error')
    .mockImplementation(() => {})

  try {
    const { financas, setItem } = await prepararFinancas(true)

    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )

    const limitesAntes = { ...financas.limites.value }
    const saldoAntes = financas.saldoInicial.value

    const sucesso = financas.editar(1, {
      descricao: 'Alteração não salva',
      valor: 900,
      tipo: 'despesa',
      categoria: 'Outros',
      data: '2026-11-06'
    })

    expect(sucesso).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)

    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.limites.value).toEqual(limitesAntes)
    expect(financas.saldoInicial.value).toBe(saldoAntes)

    expect(financas.armazenamentoProtegido.value).toBe(true)
    expect(financas.aviso.value).toContain(
      'Não foi possível salvar'
    )
    expect(financas.aviso.value).not.toContain(
      'Transação atualizada com sucesso!'
    )

    const tentativa = JSON.parse(setItem.mock.lastCall[1])

    expect(tentativa.transacoes[0].id).toBe(1)
    expect(tentativa.transacoes[0].valor).toBe(900)
    expect(tentativa.proximoId).toBe(2)
  } finally {
    consoleError.mockRestore()
    vi.unstubAllGlobals()
  }
})

}) // Fecha o describe das operações financeiras

it('calcula receitas, despesas e resultado do mês selecionado', async () => {
  const dados = {
    transacoes: [
      {
        id: 1,
        descricao: 'Salário',
        valor: 3000,
        tipo: 'receita',
        categoria: 'Salário',
        data: '2026-11-05'
      },
      {
        id: 2,
        descricao: 'Freelance',
        valor: 500,
        tipo: 'receita',
        categoria: 'Serviços',
        data: '2026-11-10'
      },
      {
        id: 3,
        descricao: 'Supermercado',
        valor: 800,
        tipo: 'despesa',
        categoria: 'Alimentação',
        data: '2026-11-12'
      },
      {
        id: 4,
        descricao: 'Transporte',
        valor: 200,
        tipo: 'despesa',
        categoria: 'Transporte',
        data: '2026-11-15'
      },
      {
        id: 5,
        descricao: 'Compra anterior',
        valor: 400,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-10-20'
      }
    ],
    limites: {},
    saldoInicial: 1000,
    proximoId: 6
  }

  const getItem = vi.fn(() => JSON.stringify(dados))
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()

    financas.mesSelecionado.value = new Date(2026, 10, 1)

    expect(financas.doMes()).toHaveLength(4)
    expect(financas.receitas()).toBe(3500)
    expect(financas.despesas()).toBe(1000)
    expect(financas.resultado()).toBe(2500)

    expect(setItem).not.toHaveBeenCalled()
    expect(financas.armazenamentoProtegido.value).toBe(false)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('navega entre meses e recalcula os valores sem alterar os dados', async () => {
  const dados = {
    transacoes: [
      {
        id: 1,
        descricao: 'Salário de novembro',
        valor: 3000,
        tipo: 'receita',
        categoria: 'Salário',
        data: '2026-11-05'
      },
      {
        id: 2,
        descricao: 'Mercado de novembro',
        valor: 800,
        tipo: 'despesa',
        categoria: 'Alimentação',
        data: '2026-11-12'
      },
      {
        id: 3,
        descricao: 'Salário de outubro',
        valor: 2000,
        tipo: 'receita',
        categoria: 'Salário',
        data: '2026-10-05'
      },
      {
        id: 4,
        descricao: 'Compra de outubro',
        valor: 400,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-10-20'
      }
    ],
    limites: {
      '2026-10': 1500,
      '2026-11': 2500
    },
    saldoInicial: 1000,
    proximoId: 5
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

    expect(financas.mesChave()).toBe('2026-11')
    expect(financas.doMes()).toHaveLength(2)
    expect(financas.receitas()).toBe(3000)
    expect(financas.despesas()).toBe(800)
    expect(financas.resultado()).toBe(2200)
    expect(financas.limiteAtual()).toBe(2500)

    financas.mudarMes(-1)

    expect(financas.mesChave()).toBe('2026-10')
    expect(financas.doMes()).toHaveLength(2)
    expect(financas.receitas()).toBe(2000)
    expect(financas.despesas()).toBe(400)
    expect(financas.resultado()).toBe(1600)
    expect(financas.limiteAtual()).toBe(1500)
    expect(financas.limiteEditando.value).toBe('1.500,00')

    financas.mudarMes(1)

    expect(financas.mesChave()).toBe('2026-11')
    expect(financas.doMes()).toHaveLength(2)
    expect(financas.receitas()).toBe(3000)
    expect(financas.despesas()).toBe(800)
    expect(financas.resultado()).toBe(2200)
    expect(financas.limiteAtual()).toBe(2500)
    expect(financas.limiteEditando.value).toBe('2.500,00')

    expect(financas.transacoes.value).toEqual(dados.transacoes)
    expect(setItem).not.toHaveBeenCalled()
    expect(financas.armazenamentoProtegido.value).toBe(false)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('protege os dados quando o cadastro de categoria falha', async () => {
  const dados = {
    transacoes: [{
      id: 1,
      descricao: 'Salário',
      valor: 3000,
      tipo: 'receita',
      categoria: 'Salário',
      data: '2026-11-05'
    }],
    limites: { '2026-11': 2000 },
    saldoInicial: 1000,
    proximoId: 2
  }

  const getItem = vi.fn(() => JSON.stringify(dados))
  const setItem = vi.fn(() => {
    throw new Error('Falha simulada ao salvar categoria')
  })

  vi.stubGlobal('localStorage', { getItem, setItem })

  const consoleError = vi.spyOn(console, 'error')
    .mockImplementation(() => {})

  try {
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()

    const categoriasAntes = [...financas.categoriasDespesa.value]
    const transacoesAntes = JSON.parse(
      JSON.stringify(financas.transacoes.value)
    )
    const limitesAntes = { ...financas.limites.value }
    const saldoAntes = financas.saldoInicial.value

    const sucesso = financas.adicionarCategoria(
      'Educação',
      'despesa'
    )

    expect(sucesso).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)

    expect(financas.categoriasDespesa.value)
      .toEqual(categoriasAntes)

    expect(financas.categoriasDespesa.value)
      .not.toContain('Educação')

    expect(financas.transacoes.value)
      .toEqual(transacoesAntes)

    expect(financas.limites.value)
      .toEqual(limitesAntes)

    expect(financas.saldoInicial.value)
      .toBe(saldoAntes)

    expect(financas.armazenamentoProtegido.value)
      .toBe(true)

    expect(financas.aviso.value)
      .toContain('Não foi possível salvar')

    const segundaTentativa = financas.adicionarCategoria(
      'Viagens',
      'despesa'
    )

    expect(segundaTentativa).toBe(false)
    expect(setItem).toHaveBeenCalledTimes(1)
  } finally {
    consoleError.mockRestore()
    vi.unstubAllGlobals()
  }
})



