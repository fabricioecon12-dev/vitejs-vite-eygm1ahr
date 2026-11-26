
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
      expect(setItem).toHaveBeenCalledTimes(1)

      const dadosMigrados = JSON.parse(setItem.mock.calls[0][1])

      expect(dadosMigrados.versaoDados).toBe(2)
      expect(dadosMigrados.contas).toHaveLength(1)
      expect(dadosMigrados.contas[0].saldoInicial).toBe(500)
      expect(dadosMigrados.transacoes[0].contaId).toBe(1)

      await nextTick()
      expect(setItem).toHaveBeenCalledTimes(1)
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

      expect(setItem).toHaveBeenCalledTimes(1)

      const migracao = JSON.parse(setItem.mock.calls[0][1])
      expect(migracao.versaoDados).toBe(2)
      expect(migracao.contas).toHaveLength(1)

      setItem.mockClear()

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
      expect(dadosSalvos.transacoes[0].contaId).toBe(1)
      expect(financas.transacoes.value[0].contaId).toBe(1)
      expect(dadosSalvos.versaoDados).toBe(2)
      expect(dadosSalvos.contas).toHaveLength(1)
      expect(dadosSalvos.contas[0].principal).toBe(true)
      expect(dadosSalvos.contas[0].saldoInicial).toBe(500)
      expect(dadosSalvos.proximoId).toBe(2)
      expect(setItem).toHaveBeenCalledTimes(1)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  
  
})

it.each([
  ['conta inexistente', 999],
  ['identificador inválido', 'invalido'],
  ['identificador negativo', -1]
])('bloqueia transação com %s', async (_, contaId) => {
  const dados = {
    transacoes: [],
    limites: {},
    saldoInicial: 500,
    proximoId: 1,
    versaoDados: 2,
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: [],
    contas: [{
      id: 1,
      nome: 'Conta principal',
      instituicao: 'Não informada',
      tipo: 'corrente',
      agencia: '',
      numero: '',
      saldoInicial: 500,
      ativa: true,
      principal: true,
      dataCriacao: '2026-11-14'
    }]
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

    const sucesso = financas.adicionar({
      descricao: 'Compra bloqueada',
      valor: 100,
      tipo: 'despesa',
      categoria: 'Alimentação',
      data: '2026-11-14',
      contaId
    })

    expect(sucesso).toBe(false)
    expect(financas.transacoes.value).toHaveLength(0)
    expect(setItem).not.toHaveBeenCalled()
    expect(financas.aviso.value).toContain('conta bancária ativa')
  } finally {
    vi.unstubAllGlobals()
  }
})
it('bloqueia novas transações em conta bancária inativa', async () => {
  const contaPrincipal = {
    id: 1,
    nome: 'Conta principal',
    instituicao: 'Não informada',
    tipo: 'corrente',
    agencia: '',
    numero: '',
    saldoInicial: 500,
    ativa: true,
    principal: true,
    dataCriacao: '2026-11-14'
  }

  const contaInativa = {
    ...contaPrincipal,
    id: 2,
    nome: 'Conta secundária',
    saldoInicial: 200,
    ativa: false,
    principal: false
  }

  const dados = {
    transacoes: [],
    limites: {},
    saldoInicial: 500,
    proximoId: 1,
    versaoDados: 2,
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: [],
    contas: [contaPrincipal, contaInativa]
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

    expect(financas.armazenamentoProtegido.value).toBe(false)

    const sucesso = financas.adicionar({
      descricao: 'Compra em conta inativa',
      valor: 100,
      tipo: 'despesa',
      categoria: 'Alimentação',
      data: '2026-11-14',
      contaId: 2
    })

    expect(sucesso).toBe(false)
    expect(financas.transacoes.value).toHaveLength(0)
    expect(financas.contas.value).toHaveLength(2)
    expect(financas.contas.value[1].ativa).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
    expect(financas.aviso.value).toContain('conta bancária ativa')
  } finally {
    vi.unstubAllGlobals()
  }
})
it('registra transação em conta secundária ativa', async () => {
  const contaPrincipal = {
    id: 1,
    nome: 'Conta principal',
    instituicao: 'Não informada',
    tipo: 'corrente',
    agencia: '',
    numero: '',
    saldoInicial: 500,
    ativa: true,
    principal: true,
    dataCriacao: '2026-11-14'
  }

  const contaSecundaria = {
    ...contaPrincipal,
    id: 2,
    nome: 'Conta secundária',
    saldoInicial: 200,
    principal: false
  }

  const dados = {
    transacoes: [],
    limites: {},
    saldoInicial: 500,
    proximoId: 1,
    versaoDados: 2,
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    contas: [contaPrincipal, contaSecundaria]
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

    expect(financas.armazenamentoProtegido.value).toBe(false)

        setItem.mockClear()

const sucesso = financas.adicionar({
      descricao: 'Compra na conta secundária',
      valor: 100,
      tipo: 'despesa',
      categoria: 'Alimentação',
      data: '2026-11-14',
      contaId: 2
    })

    expect(sucesso).toBe(true)
    expect(financas.transacoes.value).toHaveLength(1)
    expect(financas.transacoes.value[0].contaId).toBe(2)
    expect(setItem).toHaveBeenCalledTimes(1)

    const dadosSalvos = JSON.parse(setItem.mock.calls[0][1])

    expect(dadosSalvos.transacoes[0].contaId).toBe(2)
    expect(dadosSalvos.contas).toHaveLength(2)
    expect(dadosSalvos.contas[0].saldoInicial).toBe(500)
    expect(dadosSalvos.contas[1].saldoInicial).toBe(200)
    expect(dadosSalvos.proximoId).toBe(2)
  } finally {
    vi.unstubAllGlobals()
  }
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

    const dadosMigrados = {
      ...dados,
      versaoDados: 2,
      cartoesCredito: [],
      comprasCartao: [],
      faturasCartao: [],
      pagamentosFatura: [],
      pagamentosAntecipadosFatura: [],
      tentativasPagamentoFaturaRecusadas: [],
      fechamentosFatura: [],
      obrigacoesComplementaresFatura: [],
      pagamentosObrigacoesComplementares: [],
      contas: [{
        id: 1,
        nome: 'Conta principal',
        instituicao: 'Não informada',
        tipo: 'corrente',
        agencia: '',
        numero: '',
        saldoInicial: dados.saldoInicial,
        ativa: true,
        principal: true,
        dataCriacao: '2026-11-14'
      }]
    }

    const getItem = vi.fn(() => JSON.stringify(dadosMigrados))
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

  it('mantem o armazenamento protegido quando a migracao falha', async () => {
    const dadosLegados = {
      transacoes: [
        {
          id: 1,
          descricao: 'Registro legado',
          valor: 500,
          tipo: 'receita',
          categoria: 'Salário',
          data: '2026-11-03'
        }
      ],
      limites: {},
      saldoInicial: 500,
      proximoId: 2
    }

    const conteudoOriginal = JSON.stringify(dadosLegados)

    const getItem = vi.fn(() => conteudoOriginal)
    const setItem = vi.fn(() => {
      throw new Error('Falha simulada durante a migracao')
    })

    vi.stubGlobal('localStorage', { getItem, setItem })

    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      vi.resetModules()

      const { useFinancas } = await import('../composables/useFinancas.js')
      const financas = useFinancas()

      // A migracao falhou e nenhum estado parcial pode ser liberado.
      expect(setItem).toHaveBeenCalledTimes(1)
      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(financas.transacoes.value).toHaveLength(0)

      // O conteudo original permanece disponivel.
      expect(getItem.mock.results[0].value).toBe(conteudoOriginal)

      // Novas operacoes permanecem bloqueadas.
      financas.adicionar({
        descricao: 'Operacao bloqueada',
        valor: 100,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-11-03'
      })

      await nextTick()

      expect(financas.transacoes.value).toHaveLength(0)
      expect(setItem).toHaveBeenCalledTimes(1)
      expect(financas.armazenamentoProtegido.value).toBe(true)
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
        ).toHaveLength(2)
        expect(confirmar).not.toHaveBeenCalled()
        expect(financas.armazenamentoProtegido.value).toBe(false)
        expect(financas.transacoes.value).toHaveLength(10)
        expect(setItem).toHaveBeenCalledTimes(1)
  
        const dadosSalvos = JSON.parse(setItem.mock.lastCall[1])
  
        expect(dadosSalvos.transacoes).toHaveLength(10)
        expect(dadosSalvos.saldoInicial).toBe(5380)
        expect(dadosSalvos.proximoId).toBe(11)
        expect(dadosSalvos.versaoDados).toBe(2)
        expect(dadosSalvos.contas).toHaveLength(1)
        expect(dadosSalvos.contas[0].principal).toBe(true)
        expect(dadosSalvos.contas[0].ativa).toBe(true)
        expect(dadosSalvos.contas[0].saldoInicial).toBe(5380)
        expect(
          dadosSalvos.transacoes.every(
            transacao => transacao.contaId === dadosSalvos.contas[0].id
          )
        ).toBe(true)
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
        ).toHaveLength(2)
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
      const dadosMigrados = {
        ...dadosIniciais,
        versaoDados: 2,
        cartoesCredito: [],
        comprasCartao: [],
        faturasCartao: [],
        pagamentosFatura: [],
        pagamentosAntecipadosFatura: [],
        tentativasPagamentoFaturaRecusadas: [],
        fechamentosFatura: [],
        obrigacoesComplementaresFatura: [],
        pagamentosObrigacoesComplementares: [],
        contas: [{
          id: 1,
          nome: 'Conta principal',
          instituicao: 'Não informada',
          tipo: 'corrente',
          agencia: '',
          numero: '',
          saldoInicial: dadosIniciais.saldoInicial,
          ativa: true,
          principal: true,
          dataCriacao: '2026-11-14'
        }],
        transacoes: dadosIniciais.transacoes.map(transacao => ({
          ...transacao,
          contaId: 1
        }))
      }

      const getItem = vi.fn(() => JSON.stringify(dadosMigrados))
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
  
    it('exclui sem solicitar confirmacao quando a preferencia esta desativada', async () => {
      const confirmar = vi.fn(() => false)
      vi.stubGlobal('confirm', confirmar)

      try {
        const { financas, setItem } = await prepararFinancas()

        const { usePreferencias } = await import(
          '../composables/usePreferencias.js'
        )

        const preferencias = usePreferencias()
        preferencias.confirmarExclusao.value = false

        expect(financas.excluir(1)).toBe(true)
        expect(confirmar).not.toHaveBeenCalled()
        expect(financas.transacoes.value).toHaveLength(0)
        expect(setItem).toHaveBeenCalledTimes(1)
      } finally {
        vi.unstubAllGlobals()
        vi.resetModules()
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

      const contaOriginal = {
        ...financas.contas.value[0]
      }

      financas.contas.value.push({
        ...contaOriginal,
        id: 2,
        nome: 'Conta secundária',
        saldoInicial: 200,
        ativa: false,
        principal: false
      })

      setItem.mockClear()

      financas.limpar()

      expect(setItem).toHaveBeenCalledTimes(1)
      expect(financas.contas.value).toHaveLength(2)
      expect(financas.contas.value[0].saldoInicial).toBe(0)
      expect(financas.contas.value[1].saldoInicial).toBe(0)
      expect(financas.contas.value[0].principal).toBe(true)
      expect(financas.contas.value[1].ativa).toBe(false)
      expect(financas.contas.value[1].nome).toBe('Conta secundária')
      expect(financas.transacoes.value).toEqual([])
      expect(financas.limites.value).toEqual({})
      expect(financas.saldoInicial.value).toBe(0)

      const dados = JSON.parse(setItem.mock.lastCall[1])

      expect(dados.transacoes).toEqual([])
      expect(dados.limites).toEqual({})
      expect(dados.saldoInicial).toBe(0)
      expect(dados.contas).toHaveLength(2)
      expect(dados.contas.every(conta => conta.saldoInicial === 0)).toBe(true)
      expect(dados.contas[0].id).toBe(1)
      expect(dados.contas[1].id).toBe(2)
      expect(dados.contas[1].ativa).toBe(false)
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
      const contasAntes = JSON.parse(
        JSON.stringify(financas.contas.value)
      )

      financas.limpar()

      expect(setItem).toHaveBeenCalledTimes(1)
      expect(financas.transacoes.value).toEqual(transacoesAntes)
      expect(financas.limites.value).toEqual(limitesAntes)
      expect(financas.saldoInicial.value).toBe(saldoAntes)
      expect(financas.contas.value).toEqual(contasAntes)
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
    expect(dados.contas).toEqual(financas.contas.value)
    expect(dados.contas.find(conta => conta.principal).saldoInicial).toBe(5380)
    expect(
      dados.transacoes.every(
        transacao => transacao.contaId ===
          dados.contas.find(conta => conta.principal).id
      )
    ).toBe(true)
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
    const contasAntes = JSON.parse(
      JSON.stringify(financas.contas.value)
    )
    const mesAntes = financas.mesSelecionado.value.getTime()
    const limiteEditandoAntes = financas.limiteEditando.value

    financas.demonstracao()

    expect(confirmar).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledTimes(1)
    expect(financas.transacoes.value).toEqual(transacoesAntes)
    expect(financas.limites.value).toEqual(limitesAntes)
    expect(financas.saldoInicial.value).toBe(saldoAntes)
    expect(financas.contas.value).toEqual(contasAntes)
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

    expect(setItem).toHaveBeenCalledTimes(1)

    const migracao = JSON.parse(setItem.mock.calls[0][1])

    expect(migracao.versaoDados).toBe(2)
    expect(migracao.transacoes).toHaveLength(5)
    expect(migracao.transacoes.every(t => t.contaId === 1)).toBe(true)
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

    expect(financas.transacoes.value).toEqual(
      dados.transacoes.map(transacao => ({
        ...transacao,
        contaId: 1
      }))
    )
    expect(setItem).toHaveBeenCalledTimes(1)

    const migracao = JSON.parse(setItem.mock.calls[0][1])
    expect(migracao.versaoDados).toBe(2)
    expect(migracao.transacoes).toHaveLength(4)
    expect(migracao.transacoes.every(t => t.contaId === 1)).toBe(true)

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

  const dadosMigrados = {
    ...dados,
    versaoDados: 2,
    cartoesCredito: [],
    comprasCartao: [],
    faturasCartao: [],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: [],
    obrigacoesComplementaresFatura: [],
    pagamentosObrigacoesComplementares: [],
    contas: [{
      id: 1,
      nome: 'Conta principal',
      instituicao: 'Não informada',
      tipo: 'corrente',
      agencia: '',
      numero: '',
      saldoInicial: dados.saldoInicial,
      ativa: true,
      principal: true,
      dataCriacao: '2026-11-14'
    }],
    transacoes: dados.transacoes.map(transacao => ({
      ...transacao,
      contaId: 1
    }))
  }

  const getItem = vi.fn(() => JSON.stringify(dadosMigrados))
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

describe('CART-IMP-01-D.1-B - persistencia de cartoes', () => {
  const chave = 'nexus-financas-dados-v1'

  const criarDados = (colecoes = {}) => ({
    versaoDados: 2,
    transacoes: [],
    limites: {},
    saldoInicial: 500,
    proximoId: 1,
    contas: [{
      id: 1,
      nome: 'Conta principal',
      instituicao: 'Banco Teste',
      tipo: 'corrente',
      agencia: '',
      numero: '',
      saldoInicial: 500,
      ativa: true,
      principal: true,
      dataCriacao: '2026-11-18'
    }],
    ...colecoes
  })

  const criarColecoes = () => ({
    cartoesCredito: [{ id: 1, nome: 'Cartao Teste' }],
    comprasCartao: [{ id: 2, descricao: 'Compra Teste' }],
    faturasCartao: [{ id: 3, referencia: '2026-11' }],
    pagamentosFatura: []
  })

  async function preparar(dados) {
    const getItem = vi.fn((nome) =>
      nome === chave ? JSON.stringify(dados) : null
    )
    const setItem = vi.fn()

    vi.stubGlobal('localStorage', { getItem, setItem })
    vi.resetModules()

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    return {
      financas: useFinancas(),
      getItem,
      setItem
    }
  }

  it('recupera dados antigos sem colecoes de cartoes', async () => {
    try {
      const { financas } = await preparar(criarDados())

      expect(financas.armazenamentoProtegido.value).toBe(false)

      for (const nome of Object.keys(criarColecoes())) {
        expect(financas[nome].value).toEqual([])
      }
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('recupera as quatro colecoes validas', async () => {
    try {
      const colecoes = criarColecoes()
      const { financas } = await preparar(criarDados(colecoes))

      expect(financas.armazenamentoProtegido.value).toBe(false)

      for (const [nome, registros] of Object.entries(colecoes)) {
        expect(financas[nome].value).toEqual(registros)
      }
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('bloqueia colecao estruturalmente invalida', async () => {
    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      const dados = criarDados({
        cartoesCredito: { id: 1, nome: 'Invalido' }
      })

      const { financas, setItem } = await preparar(dados)

      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('bloqueia identificadores duplicados na mesma colecao', async () => {
    const consoleError = vi.spyOn(console, 'error')
      .mockImplementation(() => {})

    try {
      const dados = criarDados({
        cartoesCredito: [
          { id: 1, nome: 'Cartao A' },
          { id: 1, nome: 'Cartao B' }
        ]
      })

      const { financas, setItem } = await preparar(dados)

      expect(financas.armazenamentoProtegido.value).toBe(true)
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      consoleError.mockRestore()
      vi.unstubAllGlobals()
    }
  })

  it('preserva cartoes ao salvar transacao convencional', async () => {
    try {
      const colecoes = criarColecoes()
      const { financas, setItem } = await preparar(
        criarDados(colecoes)
      )

      expect(financas.armazenamentoProtegido.value).toBe(false)

      setItem.mockClear()

      financas.adicionar({
        descricao: 'Despesa convencional',
        valor: 50,
        tipo: 'despesa',
        categoria: 'Outros',
        data: '2026-11-18',
        contaId: 1
      })

      await nextTick()

      expect(setItem).toHaveBeenCalled()

      const dadosSalvos = JSON.parse(
        setItem.mock.lastCall[1]
      )

      for (const [nome, registros] of Object.entries(colecoes)) {
        expect(dadosSalvos[nome]).toEqual(registros)
      }
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

// =====================================================
// CART-IMP-02-B.3 - CADASTRO DE CARTOES DE CREDITO
// =====================================================

describe('CART-IMP-02-B.3 - cadastro de cartoes', () => {
  const criarCartao = (sobrescritas = {}) => ({
    nome: 'Cartao Principal',
    instituicao: 'Banco Exemplo',
    bandeira: 'Visa',
    limiteTotal: 5000,
    diaFechamento: 10,
    diaVencimento: 17,
    ultimosDigitos: '1234',
    contaId: null,
    ...sobrescritas
  })

  it('cadastra cartao valido e gera identificador unico', async () => {
    vi.resetModules()

    const armazenamento = {
      dados: null,
      getItem: vi.fn(() => armazenamento.dados),
      setItem: vi.fn((chave, valor) => {
        armazenamento.dados = valor
      })
    }

    vi.stubGlobal('localStorage', armazenamento)

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )
    const financas = useFinancas()
    const quantidadeAnterior = financas.cartoesCredito.value.length

    const resultado = financas.adicionarCartao(criarCartao())

    expect(resultado).toBe(true)
    expect(financas.cartoesCredito.value).toHaveLength(
      quantidadeAnterior + 1
    )

    const cartao = financas.cartoesCredito.value.at(-1)

    expect(Number.isSafeInteger(cartao.id)).toBe(true)
    expect(cartao.id).toBeGreaterThan(0)
    expect(cartao.nome).toBe('Cartao Principal')
    expect(cartao.instituicao).toBe('Banco Exemplo')
    expect(cartao.status).toBe('ativo')
  })

  it('recusa cadastro sem campos obrigatorios', async () => {
    vi.resetModules()

    const armazenamento = {
      dados: null,
      getItem: vi.fn(() => armazenamento.dados),
      setItem: vi.fn((chave, valor) => {
        armazenamento.dados = valor
      })
    }

    vi.stubGlobal('localStorage', armazenamento)

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )
    const financas = useFinancas()
    const quantidadeAnterior = financas.cartoesCredito.value.length

    expect(financas.adicionarCartao(
      criarCartao({ nome: '   ' })
    )).toBe(false)

    expect(financas.adicionarCartao(
      criarCartao({ instituicao: '' })
    )).toBe(false)

    expect(financas.adicionarCartao(
      criarCartao({ bandeira: '' })
    )).toBe(false)

    expect(financas.cartoesCredito.value).toHaveLength(
      quantidadeAnterior
    )
  })

  it('valida limite total e dias de fechamento e vencimento', async () => {
    vi.resetModules()

    const armazenamento = {
      dados: null,
      getItem: vi.fn(() => armazenamento.dados),
      setItem: vi.fn((chave, valor) => {
        armazenamento.dados = valor
      })
    }

    vi.stubGlobal('localStorage', armazenamento)

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )
    const financas = useFinancas()
    const quantidadeAnterior = financas.cartoesCredito.value.length

    const invalidos = [
      { limiteTotal: 0 },
      { limiteTotal: -100 },
      { limiteTotal: 100.123 },
      { limiteTotal: Number.NaN },
      { diaFechamento: 0 },
      { diaFechamento: 32 },
      { diaFechamento: 10.5 },
      { diaVencimento: 0 },
      { diaVencimento: 32 },
      { diaVencimento: 15.5 }
    ]

    for (const dados of invalidos) {
      expect(financas.adicionarCartao(
        criarCartao(dados)
      )).toBe(false)
    }

    expect(financas.cartoesCredito.value).toHaveLength(
      quantidadeAnterior
    )
  })

  it('valida conta vinculada e quatro ultimos digitos', async () => {
    vi.resetModules()

    const armazenamento = {
      dados: null,
      getItem: vi.fn(() => armazenamento.dados),
      setItem: vi.fn((chave, valor) => {
        armazenamento.dados = valor
      })
    }

    vi.stubGlobal('localStorage', armazenamento)

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )
    const financas = useFinancas()
    const quantidadeAnterior = financas.cartoesCredito.value.length

    expect(financas.adicionarCartao(
      criarCartao({ contaId: -999999 })
    )).toBe(false)

    expect(financas.adicionarCartao(
      criarCartao({ ultimosDigitos: '12AB' })
    )).toBe(false)

    expect(financas.adicionarCartao(
      criarCartao({ ultimosDigitos: '12345' })
    )).toBe(false)

    expect(financas.cartoesCredito.value).toHaveLength(
      quantidadeAnterior
    )
  })

  it('preserva estado quando a persistencia falha', async () => {
    vi.resetModules()

    const armazenamento = {
      dados: null,
      getItem: vi.fn(() => armazenamento.dados),
      setItem: vi.fn((chave, valor) => {
        armazenamento.dados = valor
      })
    }

    vi.stubGlobal('localStorage', armazenamento)

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )
    const financas = useFinancas()
    const quantidadeAnterior = financas.cartoesCredito.value.length

    const gravacaoOriginal = armazenamento.setItem

    try {
      armazenamento.setItem = () => {
        throw new Error('Falha simulada de armazenamento')
      }

      expect(financas.adicionarCartao(
        criarCartao()
      )).toBe(false)

      expect(financas.cartoesCredito.value).toHaveLength(
        quantidadeAnterior
      )
    } finally {
      armazenamento.setItem = gravacaoOriginal
    }
  })

  it('gera ids distintos e preserva colecoes financeiras', async () => {
    vi.resetModules()

    const armazenamento = {
      dados: null,
      getItem: vi.fn(() => armazenamento.dados),
      setItem: vi.fn((chave, valor) => {
        armazenamento.dados = valor
      })
    }

    vi.stubGlobal('localStorage', armazenamento)

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )
    const financas = useFinancas()

    const transacoesAntes = JSON.stringify(
      financas.transacoes.value
    )
    const comprasAntes = JSON.stringify(
      financas.comprasCartao.value
    )
    const faturasAntes = JSON.stringify(
      financas.faturasCartao.value
    )
    const pagamentosAntes = JSON.stringify(
      financas.pagamentosFatura.value
    )

    expect(financas.adicionarCartao(
      criarCartao({ nome: 'Primeiro Cartao' })
    )).toBe(true)

    expect(financas.adicionarCartao(
      criarCartao({ nome: 'Segundo Cartao' })
    )).toBe(true)

    const cartoes = financas.cartoesCredito.value
    const primeiro = cartoes.at(-2)
    const segundo = cartoes.at(-1)

    expect(primeiro.id).not.toBe(segundo.id)
    expect(JSON.stringify(financas.transacoes.value))
      .toBe(transacoesAntes)
    expect(JSON.stringify(financas.comprasCartao.value))
      .toBe(comprasAntes)
    expect(JSON.stringify(financas.faturasCartao.value))
      .toBe(faturasAntes)
    expect(JSON.stringify(financas.pagamentosFatura.value))
      .toBe(pagamentosAntes)
  })
})

// =====================================================
// CART-IMP-02-B.5 - EDICAO DE CARTOES DE CREDITO
// =====================================================

describe('CART-IMP-02-B.5 - edicao de cartoes', () => {
  async function prepararAmbiente() {
    vi.resetModules()

    const armazenamento = {
      dados: null,
      getItem: vi.fn(() => armazenamento.dados),
      setItem: vi.fn((chave, valor) => {
        armazenamento.dados = valor
      })
    }

    vi.stubGlobal('localStorage', armazenamento)

    const { useFinancas } = await import(
      '../composables/useFinancas.js'
    )

    const financas = useFinancas()

    const cadastrado = financas.adicionarCartao({
      nome: 'Cartao Original',
      instituicao: 'Banco Original',
      bandeira: 'Visa',
      limiteTotal: 5000,
      diaFechamento: 10,
      diaVencimento: 17,
      ultimosDigitos: '1234',
      contaId: null
    })

    expect(cadastrado).toBe(true)

    const cartao = financas.cartoesCredito.value.at(-1)

    return {
      financas,
      armazenamento,
      cartao,
      id: cartao.id
    }
  }

  it('edita dados permitidos e preserva identificador', async () => {
    const { financas, id } = await prepararAmbiente()

    const resultado = financas.editarCartao(id, {
      nome: 'Cartao Atualizado',
      instituicao: 'Novo Banco',
      bandeira: 'Mastercard',
      diaFechamento: 12,
      diaVencimento: 20,
      ultimosDigitos: '5678'
    })

    expect(resultado).toBe(true)

    const atualizado = financas.cartoesCredito.value.find(
      cartao => cartao.id === id
    )

    expect(atualizado.id).toBe(id)
    expect(atualizado.nome).toBe('Cartao Atualizado')
    expect(atualizado.instituicao).toBe('Novo Banco')
    expect(atualizado.bandeira).toBe('Mastercard')
    expect(atualizado.diaFechamento).toBe(12)
    expect(atualizado.diaVencimento).toBe(20)
    expect(atualizado.ultimosDigitos).toBe('5678')
    expect(atualizado.limiteTotal).toBe(5000)
    expect(atualizado.status).toBe('ativo')
  })

  it('recusa edicao de cartao inexistente', async () => {
    const { financas } = await prepararAmbiente()

    const antes = JSON.stringify(financas.cartoesCredito.value)

    expect(financas.editarCartao(-1, {
      nome: 'Invalido'
    })).toBe(false)

    expect(financas.editarCartao(999999, {
      nome: 'Inexistente'
    })).toBe(false)

    expect(JSON.stringify(financas.cartoesCredito.value))
      .toBe(antes)
  })

  it('bloqueia alteracoes em campos protegidos', async () => {
    const { financas, id } = await prepararAmbiente()

    const antes = JSON.stringify(financas.cartoesCredito.value)

    const alteracoes = [
      { id: 999 },
      { limiteTotal: 9000 },
      { status: 'inativo' },
      { dataCriacao: '2020-01-01' },
      { compras: [] }
    ]

    for (const dados of alteracoes) {
      expect(financas.editarCartao(id, dados)).toBe(false)
    }

    expect(JSON.stringify(financas.cartoesCredito.value))
      .toBe(antes)
  })

  it('recusa campos cadastrais invalidos', async () => {
    const { financas, id } = await prepararAmbiente()

    const antes = JSON.stringify(financas.cartoesCredito.value)

    const invalidos = [
      { nome: '   ' },
      { instituicao: '' },
      { bandeira: '' },
      { diaFechamento: 0 },
      { diaFechamento: 32 },
      { diaVencimento: 0 },
      { diaVencimento: 32 },
      { ultimosDigitos: 'ABCD' },
      { ultimosDigitos: '12345' },
      { contaId: -999999 }
    ]

    for (const dados of invalidos) {
      expect(financas.editarCartao(id, dados)).toBe(false)
    }

    expect(JSON.stringify(financas.cartoesCredito.value))
      .toBe(antes)
  })

  it('preserva colecoes financeiras e grava a edicao', async () => {
    const { financas, armazenamento, id } =
      await prepararAmbiente()

    const transacoesAntes = JSON.stringify(financas.transacoes.value)
    const comprasAntes = JSON.stringify(financas.comprasCartao.value)
    const faturasAntes = JSON.stringify(financas.faturasCartao.value)
    const pagamentosAntes = JSON.stringify(financas.pagamentosFatura.value)

    expect(financas.editarCartao(id, {
      nome: 'Cartao Persistido'
    })).toBe(true)

    const persistido = JSON.parse(armazenamento.dados)
    const cartaoPersistido = persistido.cartoesCredito.find(
      cartao => cartao.id === id
    )

    expect(cartaoPersistido.nome).toBe('Cartao Persistido')
    expect(JSON.stringify(financas.transacoes.value))
      .toBe(transacoesAntes)
    expect(JSON.stringify(financas.comprasCartao.value))
      .toBe(comprasAntes)
    expect(JSON.stringify(financas.faturasCartao.value))
      .toBe(faturasAntes)
    expect(JSON.stringify(financas.pagamentosFatura.value))
      .toBe(pagamentosAntes)
  })

  it('preserva o cartao original quando a gravacao falha', async () => {
    const { financas, armazenamento, id } =
      await prepararAmbiente()

    const antes = JSON.stringify(financas.cartoesCredito.value)
    const dadosAntes = armazenamento.dados
    const gravacaoOriginal = armazenamento.setItem

    try {
      armazenamento.setItem = () => {
        throw new Error('Falha simulada de gravacao')
      }

      expect(financas.editarCartao(id, {
        nome: 'Edicao Nao Persistida'
      })).toBe(false)

      expect(JSON.stringify(financas.cartoesCredito.value))
        .toBe(antes)

      expect(armazenamento.dados).toBe(dadosAntes)
    } finally {
      armazenamento.setItem = gravacaoOriginal
    }
  })
})
