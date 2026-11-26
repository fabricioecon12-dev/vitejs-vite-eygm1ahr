import { describe, it, expect, vi, beforeEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarDados({
  valorCompra = 1000,
  pagamentos = [],
  incluirCompra = true
} = {}) {
  const confirmados = pagamentos.filter(
    pagamento => pagamento.status !== 'pendente'
  )

  return {
    transacoes: confirmados.map((pagamento, indice) => ({
      id: indice + 100,
      descricao: 'Pagamento de fatura',
      valor: pagamento.valorPagoCentavos / 100,
      tipo: 'despesa',
      categoria: 'Outros',
      data: '2026-11-19',
      contaId: 1
    })),
    transferencias: [],
    saldoInicial: 10000,
    proximoId: 200,
    limites: {},
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
      saldoInicial: 10000,
      ativa: true,
      principal: true,
      dataCriacao: '2026-11-01'
    }],
    cartoesCredito: [{
      id: 2,
      nome: 'Cartao teste',
      status: 'ativo',
      limiteTotal: 5000,
      diaFechamento: 10,
      diaVencimento: 20
    }],
    comprasCartao: incluirCompra ? [{
      id: 1,
      cartaoId: 2,
      descricao: 'Compra anterior',
      data: '2026-10-01',
      valor: valorCompra,
      parcelas: 1,
      status: 'ativa'
    }] : [],
    faturasCartao: [{
      id: 10,
      cartaoId: 2,
      competencia: '2026-10',
      fechamento: '2026-10-10',
      vencimento: '2026-10-20',
      status: 'fechada',
      parcelas: []
    }],
    pagamentosFatura: confirmados.map((pagamento, indice) => ({
      id: `pagamento-${indice + 1}`,
      operacaoId: `operacao-${indice + 1}`,
      cartaoId: 2,
      faturaId: 10,
      contaId: 1,
      transacaoId: indice + 100,
      valorPagoCentavos: pagamento.valorPagoCentavos,
      status: 'confirmado',
      dataHora: '2026-11-19T12:00:00.000Z'
    })),
    fechamentosFatura: [{
      id: 'fechamento-10',
      faturaId: 10,
      cartaoId: 2,
      competencia: '2026-10',
      fechamentoPrevisto: '2026-10-10',
      fechamentoEfetivoEm: '2026-10-10T12:00:00.000Z',
      valorConsolidadoCentavos: valorCompra * 100,
      status: 'confirmado'
    }],
    tentativasPagamentoFaturaRecusadas: [],
    tentativasTransferenciaRecusadas: [],
    pendenciasTecnicasTransferencia: [],
    bloqueiosTecnicosTransferencia: [],
    historicoRegularizacoesTecnicas: [],
    inconsistenciasPendenciasTecnicas: [],
    revisaoAdministrativaTransferencias: 0
  }
}

async function preparar(dados) {
  vi.resetModules()

  const armazenamento = new Map([
    [CHAVE, JSON.stringify(dados)]
  ])

  vi.stubGlobal('localStorage', {
    getItem: vi.fn(chave => armazenamento.get(chave) ?? null),
    setItem: vi.fn((chave, valor) => armazenamento.set(chave, valor)),
    removeItem: vi.fn(chave => armazenamento.delete(chave))
  })

  const modulo = await import('../composables/useFinancas.js')

  return {
    financas: modulo.useFinancas(),
    ler: () => JSON.parse(armazenamento.get(CHAVE))
  }
}

function solicitar(financas, valor) {
  return financas.registrarCompraCartao({
    cartaoId: 2,
    descricao: 'Nova compra',
    data: '2026-11-19',
    valor,
    parcelas: 1
  })
}

describe('Integracao de limite e compras - F.4-B.3-T', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('autoriza compra quando existe limite suficiente', async () => {
    const { financas } = await preparar(criarDados())

    expect(solicitar(financas, 100)).toBe(true)
  })

  it('libera exatamente o valor de pagamento parcial', async () => {
    const { financas } = await preparar(criarDados({
      valorCompra: 5000,
      pagamentos: [{ valorPagoCentavos: 40000 }]
    }))

    expect(solicitar(financas, 400)).toBe(true)
  })

  it('recompoe o limite apos pagamento integral', async () => {
    const { financas } = await preparar(criarDados({
      valorCompra: 5000,
      pagamentos: [{ valorPagoCentavos: 500000 }]
    }))

    expect(solicitar(financas, 5000)).toBe(true)
  })

  it('nao libera limite por pagamento pendente', async () => {
    const { financas } = await preparar(criarDados({
      valorCompra: 5000,
      pagamentos: [{
        valorPagoCentavos: 40000,
        status: 'pendente'
      }]
    }))

    expect(solicitar(financas, 100)).toBe(false)
  })

  it('recusa compra acima do limite disponivel', async () => {
    const { financas, ler } = await preparar(criarDados({
      valorCompra: 5000,
      pagamentos: [{ valorPagoCentavos: 40000 }]
    }))

    const antes = ler()

    expect(solicitar(financas, 401)).toBe(false)

    const depois = ler()

    expect(depois.comprasCartao).toEqual(antes.comprasCartao)
    expect(depois.pagamentosFatura).toEqual(antes.pagamentosFatura)
  })

  it('bloqueia compra quando existem pagamentos inconsistentes', async () => {
    const { financas, ler } = await preparar(criarDados({
      pagamentos: [{ valorPagoCentavos: -100 }]
    }))

    const antes = ler()

    expect(solicitar(financas, 100)).toBe(false)

    const depois = ler()

    expect(depois.comprasCartao).toEqual(antes.comprasCartao)
  })
})