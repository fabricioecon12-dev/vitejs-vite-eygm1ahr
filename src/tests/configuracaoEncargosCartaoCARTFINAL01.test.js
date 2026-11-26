
import { describe, it, expect, vi } from 'vitest'

describe('CART-FINAL-01 - configuracao de encargos', () => {
  const criarCartao = (configuracaoEncargos) => ({
    nome: 'Cartao Teste Encargos',
    instituicao: 'Banco Exemplo',
    bandeira: 'Visa',
    limiteTotal: 5000,
    diaFechamento: 10,
    diaVencimento: 17,
    ultimosDigitos: '1234',
    contaId: null,
    configuracaoEncargos
  })

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

    return {
      financas: useFinancas(),
      armazenamento
    }
  }

  it('cadastra e persiste as tres taxas configuradas', async () => {
    const { financas, armazenamento } =
      await prepararAmbiente()

    try {
      const taxas = {
        jurosRotativoMensal: 12.5,
        jurosMoraMensal: 1,
        multaAtraso: 2
      }

      expect(
        financas.adicionarCartao(criarCartao(taxas))
      ).toBe(true)

      const cartao = financas.cartoesCredito.value.at(-1)

      expect(cartao.configuracaoEncargos).toEqual(taxas)

      const dadosPersistidos = JSON.parse(
        armazenamento.dados
      )

      const cartaoPersistido =
        dadosPersistidos.cartoesCredito.find(
          item => item.id === cartao.id
        )

      expect(cartaoPersistido.configuracaoEncargos)
        .toEqual(taxas)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('aceita configuracao ausente e normaliza taxas para null', async () => {
    const { financas } = await prepararAmbiente()

    try {
      const dados = criarCartao(undefined)
      delete dados.configuracaoEncargos

      expect(financas.adicionarCartao(dados)).toBe(true)

      const cartao = financas.cartoesCredito.value.at(-1)

      expect(cartao.configuracaoEncargos).toEqual({
        jurosRotativoMensal: null,
        jurosMoraMensal: null,
        multaAtraso: null
      })
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('preserva taxas iguais a zero', async () => {
    const { financas } = await prepararAmbiente()

    try {
      const taxas = {
        jurosRotativoMensal: 0,
        jurosMoraMensal: 0,
        multaAtraso: 0
      }

      expect(
        financas.adicionarCartao(criarCartao(taxas))
      ).toBe(true)

      const cartao = financas.cartoesCredito.value.at(-1)

      expect(cartao.configuracaoEncargos).toEqual(taxas)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('aceita taxas com quatro casas decimais', async () => {
    const { financas } = await prepararAmbiente()

    try {
      const taxas = {
        jurosRotativoMensal: 12.3456,
        jurosMoraMensal: 1.2345,
        multaAtraso: 2.0001
      }

      expect(
        financas.adicionarCartao(criarCartao(taxas))
      ).toBe(true)

      const cartao = financas.cartoesCredito.value.at(-1)

      expect(cartao.configuracaoEncargos).toEqual(taxas)
    } finally {
      vi.unstubAllGlobals()
    }
  })


  it.each([
    ['taxa negativa', { jurosRotativoMensal: -1 }],
    ['taxa superior a 100', { jurosMoraMensal: 100.0001 }],
    ['mais de quatro casas', { multaAtraso: 2.12345 }],
    ['taxa textual', { jurosRotativoMensal: '12,5' }],
    ['taxa infinita', { jurosRotativoMensal: Infinity }],
    ['taxa NaN', { jurosMoraMensal: NaN }],
    ['propriedade desconhecida', { taxaExtra: 5 }],
    ['configuracao em lista', [1, 2, 3]]
  ])('recusa cadastro com %s', async (_, taxas) => {
    const { financas, armazenamento } =
      await prepararAmbiente()

    try {
      const quantidadeAntes =
        financas.cartoesCredito.value.length

      const dadosAntes = armazenamento.dados

      expect(
        financas.adicionarCartao(criarCartao(taxas))
      ).toBe(false)

      expect(financas.cartoesCredito.value)
        .toHaveLength(quantidadeAntes)

      expect(armazenamento.dados).toBe(dadosAntes)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('edita e persiste as taxas do cartao', async () => {
    const { financas, armazenamento } =
      await prepararAmbiente()

    try {
      expect(
        financas.adicionarCartao(criarCartao(null))
      ).toBe(true)

      const id = financas.cartoesCredito.value.at(-1).id

      const taxas = {
        jurosRotativoMensal: 13.25,
        jurosMoraMensal: 1.5,
        multaAtraso: 2
      }

      expect(
        financas.editarCartao(id, {
          configuracaoEncargos: taxas
        })
      ).toBe(true)

      const atualizado = financas.cartoesCredito.value.find(
        cartao => cartao.id === id
      )

      expect(atualizado.configuracaoEncargos)
        .toEqual(taxas)

      const persistido = JSON.parse(armazenamento.dados)

      expect(
        persistido.cartoesCredito.find(
          cartao => cartao.id === id
        ).configuracaoEncargos
      ).toEqual(taxas)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('preserva encargos em edicao de outros campos', async () => {
    const { financas } = await prepararAmbiente()

    try {
      const taxas = {
        jurosRotativoMensal: 12,
        jurosMoraMensal: 1,
        multaAtraso: 2
      }

      expect(
        financas.adicionarCartao(criarCartao(taxas))
      ).toBe(true)

      const id = financas.cartoesCredito.value.at(-1).id

      expect(
        financas.editarCartao(id, {
          nome: 'Cartao Atualizado'
        })
      ).toBe(true)

      const atualizado = financas.cartoesCredito.value.find(
        cartao => cartao.id === id
      )

      expect(atualizado.nome).toBe('Cartao Atualizado')
      expect(atualizado.configuracaoEncargos)
        .toEqual(taxas)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('recusa edicao com encargos invalidos', async () => {
    const { financas, armazenamento } =
      await prepararAmbiente()

    try {
      expect(
        financas.adicionarCartao(criarCartao(null))
      ).toBe(true)

      const id = financas.cartoesCredito.value.at(-1).id
      const cartoesAntes =
        JSON.stringify(financas.cartoesCredito.value)
      const dadosAntes = armazenamento.dados

      expect(
        financas.editarCartao(id, {
          configuracaoEncargos: {
            jurosRotativoMensal: -5
          }
        })
      ).toBe(false)

      expect(
        JSON.stringify(financas.cartoesCredito.value)
      ).toBe(cartoesAntes)

      expect(armazenamento.dados).toBe(dadosAntes)
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('preserva dados quando gravacao da edicao falha', async () => {
    const { financas, armazenamento } =
      await prepararAmbiente()

    try {
      expect(
        financas.adicionarCartao(criarCartao(null))
      ).toBe(true)

      const id = financas.cartoesCredito.value.at(-1).id
      const cartoesAntes =
        JSON.stringify(financas.cartoesCredito.value)
      const dadosAntes = armazenamento.dados

      armazenamento.setItem = vi.fn(() => {
        throw new Error('Falha simulada de gravacao')
      })

      expect(
        financas.editarCartao(id, {
          configuracaoEncargos: {
            jurosRotativoMensal: 10,
            jurosMoraMensal: 1,
            multaAtraso: 2
          }
        })
      ).toBe(false)

      expect(
        JSON.stringify(financas.cartoesCredito.value)
      ).toBe(cartoesAntes)

      expect(armazenamento.dados).toBe(dadosAntes)
    } finally {
      vi.unstubAllGlobals()
    }
  })
  })
