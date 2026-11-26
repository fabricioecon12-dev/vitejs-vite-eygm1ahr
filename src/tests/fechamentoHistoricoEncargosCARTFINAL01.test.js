import { beforeEach, describe, expect, it, vi } from 'vitest'

const TAXAS_INICIAIS = {
  jurosRotativoMensal: 8.5,
  jurosMoraMensal: 1,
  multaAtraso: 2
}

const TAXAS_ATUALIZADAS = {
  jurosRotativoMensal: 9,
  jurosMoraMensal: 1.5,
  multaAtraso: 3
}

function dadosBase({
  fechado = false,
  configuracao = TAXAS_INICIAIS
} = {}) {
  return {
    transacoes: [],
    limites: {},
    saldoInicial: 1000,
    proximoId: 20,
    versaoDados: 2,
    categoriasDespesa: [
      'Alimentação', 'Moradia', 'Transporte',
      'Saúde', 'Lazer', 'Outros'
    ],
    categoriasReceita: [
      'Salário', 'Serviços', 'Investimentos',
      'Vendas', 'Freelance', 'Aluguéis',
      'Comissões', 'Bonificações', 'Aposentadoria',
      'Pensão', 'Reembolsos', 'Presentes e doações',
      'Restituições', 'Outros'
    ],
    contas: [{
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
    }],
    cartoesCredito: [{
      id: 2,
      nome: 'Cartao teste',
      instituicao: 'Banco A',
      bandeira: 'Visa',
      ultimosDigitos: '1234',
      contaId: 1,
      status: 'ativo',
      limiteTotal: 5000,
      diaFechamento: 10,
      diaVencimento: 20,
      configuracaoEncargos: configuracao
    }],
    comprasCartao: [],
    faturasCartao: [{
      id: 10,
      cartaoId: 2,
      competencia: '2026-11',
      fechamento: '2026-11-10',
      vencimento: '2026-11-20',
      status: fechado ? 'fechada' : 'aberta',
      parcelas: []
    }],
    pagamentosFatura: [],
    pagamentosAntecipadosFatura: [],
    tentativasPagamentoFaturaRecusadas: [],
    fechamentosFatura: fechado ? [{
      id: 'fechamento-10',
      faturaId: 10,
      cartaoId: 2,
      competencia: '2026-11',
      fechamentoPrevisto: '2026-11-10',
      fechamentoEfetivoEm: '2026-11-10T12:00:00.000Z',
      valorConsolidadoCentavos: 0,
      status: 'confirmado'
    }] : [],
    transferencias: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: [],
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
    revisaoAdministrativaTransferencias: 0
  }
}

async function preparar(dados) {
  let persistido = JSON.stringify(dados)

  const setItem = vi.fn((_chave, valor) => {
    persistido = valor
  })

  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => persistido),
    setItem
  })

  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value)
    .toBe(false)

  setItem.mockClear()

  return {
    financas,
    setItem,
    ler: () => JSON.parse(persistido)
  }
}

beforeEach(() => {
  vi.useRealTimers()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-09T12:00:00.000Z'))
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CART-FINAL-01-G.3-H.6-P - historico de encargos', () => {
  it('persiste taxas no fechamento confirmado', async () => {
    const { financas, ler } = await preparar(dadosBase())

    expect(
      financas.fecharFaturaCartao(
        10,
        new Date('2026-11-11T12:00:00.000Z')
      )
    ).toBe(true)

    const dados = ler()

    expect(dados.faturasCartao[0].status)
      .toBe('fechada')

    expect(dados.fechamentosFatura).toHaveLength(1)

    expect(
      dados.fechamentosFatura[0]
        .configuracaoEncargosFechamento
    ).toEqual(TAXAS_INICIAIS)
  })

  it('preserva taxas apos edicao do cartao', async () => {
    const { financas, ler } = await preparar(dadosBase())

    expect(
      financas.fecharFaturaCartao(
        10,
        new Date('2026-11-11T12:00:00.000Z')
      )
    ).toBe(true)

    expect(
      financas.editarCartao(2, {
        configuracaoEncargos: TAXAS_ATUALIZADAS
      })
    ).toBe(true)

    const dados = ler()

    expect(
      dados.cartoesCredito[0].configuracaoEncargos
    ).toEqual(TAXAS_ATUALIZADAS)

    expect(
      dados.fechamentosFatura[0]
        .configuracaoEncargosFechamento
    ).toEqual(TAXAS_INICIAIS)
  })

  it('aceita fechamento historico sem taxas', async () => {
    const { financas, ler } = await preparar(
      dadosBase({ fechado: true })
    )

    const resumo =
      financas.consultarResumoFinanceiroFatura(10)

    expect(resumo.valido).toBe(true)

    expect(ler().fechamentosFatura[0])
      .not.toHaveProperty(
        'configuracaoEncargosFechamento'
      )
  })

  it('recusa configuracao invalida sem persistir', async () => {
    const { financas, ler, setItem } = await preparar(
      dadosBase({
        configuracao: {
          ...TAXAS_INICIAIS,
          jurosMoraMensal: 101
        }
      })
    )

    expect(
      financas.fecharFaturaCartao(
        10,
        new Date('2026-11-11T12:00:00.000Z')
      )
    ).toBe(false)

    expect(setItem).not.toHaveBeenCalled()
    expect(ler().faturasCartao[0].status)
      .toBe('aberta')
    expect(ler().fechamentosFatura).toHaveLength(0)
  })
})
