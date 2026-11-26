import { describe, it, expect, vi, afterEach } from 'vitest'

function criarDadosFinanceirosValidos() {
  return {
    transacoes: [],
    limites: {},
    saldoInicial: 1000,
    proximoId: 1,
    categoriasDespesa: [
      'Alimentação',
      'Moradia',
      'Transporte',
      'Saúde',
      'Lazer',
      'Outros'
    ],
    categoriasReceita: [
      'Salário',
      'Serviços',
      'Investimentos',
      'Vendas',
      'Freelance',
      'Aluguéis',
      'Comissões',
      'Bonificações',
      'Aposentadoria',
      'Pensão',
      'Reembolsos',
      'Presentes e doações',
      'Restituições',
      'Outros'
    ],
    versaoDados: 2,
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
    ],
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
    revisaoAdministrativaTransferencias: 0
  }
}




const CHAVE = 'nexus-financas-dados-v1'

const dataValida = () =>
  new Date('2026-11-20T15:00:00.000Z')

function criarCenario() {
  const dados = criarDadosFinanceirosValidos()

  const parcela = {
    compraId: 1,
    numero: 1,
    total: 1,
    valor: 125.50,
    competencia: '2026-11'
  }

  dados.cartoesCredito = [{
    id: 1,
    nome: 'Cartao teste',
    status: 'ativo',
    limiteTotal: 5000,
    diaFechamento: 20,
    diaVencimento: 28
  }]

  dados.comprasCartao = [{
    id: 1,
    cartaoId: 1,
    descricao: 'Compra de teste',
    valor: 125.50,
    data: '2026-11-10',
    quantidadeParcelas: 1,
    parcelas: [{ ...parcela }]
  }]

  dados.faturasCartao = [{
    id: 10,
    cartaoId: 1,
    competencia: '2026-11',
    fechamento: '2026-11-20',
    vencimento: '2026-11-28',
    status: 'aberta',
    parcelas: [{ ...parcela }]
  }]

  dados.fechamentosFatura = []
  dados.pagamentosFatura = []
  dados.pagamentosAntecipadosFatura = []
  dados.proximoId = 20

  return dados
}

async function preparar(dados = criarCenario()) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-18T12:00:00.000Z'))

  let texto = JSON.stringify(dados)
  let falharGravacao = false

  const getItem = vi.fn(chave => {
    if (chave !== CHAVE) return null
    return texto
  })

  const setItem = vi.fn((chave, valor) => {
    if (falharGravacao) {
      throw new Error('Falha simulada de gravacao')
    }

    if (chave === CHAVE) {
      texto = valor
    }
  })

  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value).toBe(false)

  setItem.mockClear()

  return {
    financas,
    getItem,
    setItem,
    ler: () => JSON.parse(texto),
    textoInicial: texto,
    falharGravacao: () => {
      falharGravacao = true
    }
  }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CART-HIST-01.8-E.14-D.1-C', () => {
  it('fecha fatura valida e registra evento', async () => {
    const ambiente = await preparar()

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(true)

    expect(ambiente.financas.faturasCartao.value[0].status)
      .toBe('fechada')

    expect(ambiente.financas.fechamentosFatura.value)
      .toHaveLength(1)

    expect(ambiente.financas.fechamentosFatura.value[0].status)
      .toBe('confirmado')
  })

  it('bloqueia fechamento antecipado', async () => {
    const ambiente = await preparar()

    expect(
      ambiente.financas.fecharFaturaCartao(
        10,
        new Date('2026-11-19T12:00:00.000Z')
      )
    ).toBe(false)

    expect(ambiente.setItem).not.toHaveBeenCalled()
    expect(ambiente.ler().faturasCartao[0].status)
      .toBe('aberta')
  })

  it('impede fechamento duplicado', async () => {
    const ambiente = await preparar()

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(true)

    const gravacoes = ambiente.setItem.mock.calls.length

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(false)

    expect(ambiente.setItem).toHaveBeenCalledTimes(gravacoes)

    expect(ambiente.ler().fechamentosFatura)
      .toHaveLength(1)
  })

  it('preserva estado quando persistencia falha', async () => {
    const ambiente = await preparar()

    const faturasAntes = JSON.stringify(
      ambiente.financas.faturasCartao.value
    )

    const fechamentosAntes = JSON.stringify(
      ambiente.financas.fechamentosFatura.value
    )

    const textoAntes = ambiente.textoInicial

    ambiente.falharGravacao()

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(false)

    expect(JSON.stringify(
      ambiente.financas.faturasCartao.value
    )).toBe(faturasAntes)

    expect(JSON.stringify(
      ambiente.financas.fechamentosFatura.value
    )).toBe(fechamentosAntes)

    expect(JSON.stringify(ambiente.ler()))
      .toBe(textoAntes)
  })

  it('bloqueia armazenamento protegido', async () => {
    const ambiente = await preparar()

    ambiente.financas.armazenamentoProtegido.value = true

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(false)

    expect(ambiente.setItem).not.toHaveBeenCalled()
  })

  it('bloqueia fatura inconsistente', async () => {
    const ambiente = await preparar()

    ambiente.financas.faturasCartao.value[0]
      .parcelas[0].valor = 999

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(false)

    expect(ambiente.setItem).not.toHaveBeenCalled()
    expect(ambiente.ler().faturasCartao[0].status)
      .toBe('aberta')
  })

  it('registra valor consolidado correto', async () => {
    const ambiente = await preparar()

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(true)

    const evento = ambiente.ler().fechamentosFatura[0]

    expect(evento.valorConsolidadoCentavos).toBe(12550)
    expect(evento.faturaId).toBe(10)
    expect(evento.cartaoId).toBe(1)
    expect(evento.competencia).toBe('2026-11')
  })

  it('persiste as duas colecoes conjuntamente', async () => {
    const ambiente = await preparar()

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(true)

    const dados = ambiente.ler()

    expect(dados.faturasCartao[0].status).toBe('fechada')
    expect(dados.fechamentosFatura).toHaveLength(1)
    expect(dados.fechamentosFatura[0].faturaId).toBe(10)

    expect(ambiente.setItem).toHaveBeenCalledTimes(1)
  })

  it('preserva movimentacoes financeiras existentes', async () => {
    const ambiente = await preparar()

    const transacoesAntes = JSON.stringify(
      ambiente.financas.transacoes.value
    )

    const transferenciasAntes = JSON.stringify(
      ambiente.financas.transferencias.value
    )

    expect(
      ambiente.financas.fecharFaturaCartao(10, dataValida())
    ).toBe(true)

    expect(JSON.stringify(
      ambiente.financas.transacoes.value
    )).toBe(transacoesAntes)

    expect(JSON.stringify(
      ambiente.financas.transferencias.value
    )).toBe(transferenciasAntes)

    expect(JSON.stringify(
      ambiente.ler().transacoes
    )).toBe(transacoesAntes)

    expect(JSON.stringify(
      ambiente.ler().transferencias
    )).toBe(transferenciasAntes)
  })
})