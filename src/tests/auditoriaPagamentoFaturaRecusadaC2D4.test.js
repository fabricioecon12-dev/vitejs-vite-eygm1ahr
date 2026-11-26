import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-dados-v1'

function criarRegistro(id = 'recusa-001') {
  return {
    id,
    dataHora: '2026-11-19T15:00:00.000Z',
    faturaId: 10,
    cartaoId: 2,
    contaId: 1,
    valorSolicitado: 150,
    valorSolicitadoCentavos: 15000,
    saldoDisponivelCentavos: 10000,
    motivo: 'Saldo insuficiente'
  }
}

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
function criarArmazenamento(dadosIniciais = criarDadosFinanceirosValidos()) {
  let texto = JSON.stringify(dadosIniciais)

  const getItem = vi.fn(chave => {
    if (chave !== CHAVE) return null
    return texto
  })

  const setItem = vi.fn((chave, valor) => {
    if (chave === CHAVE) texto = valor
  })

  vi.stubGlobal('localStorage', { getItem, setItem })

  return {
    getItem,
    setItem,
    ler: () => JSON.parse(texto),
    substituir: dados => {
      texto = JSON.stringify(dados)
    }
  }
}

async function preparar() {
  vi.resetModules()

  const { useFinancas } = await import(
    '../composables/useFinancas.js'
  )

  const financas = useFinancas()

  expect(financas.armazenamentoProtegido.value).toBe(false)

  return financas
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CART-PAG-01-F.2-A.2.5-C.2-D.4', () => {
  it('registra uma recusa sem alterar dados financeiros', async () => {
    const armazenamento = criarArmazenamento()
    const financas = await preparar()

    const antes = armazenamento.ler()

    const resultado =
      financas.registrarTentativaPagamentoFaturaRecusada(
        criarRegistro()
      )

    expect(
      resultado,
      `Diagnostico auditoria: ${financas.aviso.value}`
    ).toBe(true)

    const depois = armazenamento.ler()

    expect(
      depois.tentativasPagamentoFaturaRecusadas
    ).toHaveLength(1)

    expect(
      financas.tentativasPagamentoFaturaRecusadas.value
    ).toHaveLength(1)

    const anteriorSemAuditoria = { ...antes }
    const posteriorSemAuditoria = { ...depois }

    delete anteriorSemAuditoria.tentativasPagamentoFaturaRecusadas
    delete posteriorSemAuditoria.tentativasPagamentoFaturaRecusadas

    expect(posteriorSemAuditoria).toEqual(anteriorSemAuditoria)
  })

  it('nao duplica uma tentativa identica', async () => {
    const armazenamento = criarArmazenamento()
    const financas = await preparar()
    const registro = criarRegistro()

    expect(
      financas.registrarTentativaPagamentoFaturaRecusada(registro)
    ).toBe(true)

    const primeiraGravacao = JSON.stringify(armazenamento.ler())

    expect(
      financas.registrarTentativaPagamentoFaturaRecusada(registro)
    ).toBe(true)

    expect(
      armazenamento.ler().tentativasPagamentoFaturaRecusadas
    ).toHaveLength(1)

    expect(JSON.stringify(armazenamento.ler()))
      .toBe(primeiraGravacao)
  })

  it('bloqueia conflito de identificador', async () => {
    const armazenamento = criarArmazenamento()
    const financas = await preparar()

    expect(
      financas.registrarTentativaPagamentoFaturaRecusada(
        criarRegistro()
      )
    ).toBe(true)

    const conflitante = {
      ...criarRegistro(),
      motivo: 'Conta inativa'
    }

    expect(
      financas.registrarTentativaPagamentoFaturaRecusada(
        conflitante
      )
    ).toBe(false)

    expect(
      armazenamento.ler().tentativasPagamentoFaturaRecusadas
    ).toHaveLength(1)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('bloqueia divergencia entre memoria e armazenamento', async () => {
    const armazenamento = criarArmazenamento()
    const financas = await preparar()

    const dados = armazenamento.ler()

    dados.tentativasPagamentoFaturaRecusadas = [{
      id: 'externa-001',
      dataHora: '2026-11-19T14:00:00.000Z',
      dadosOriginais: {
        faturaId: 10,
        cartaoId: 2,
        contaId: 1,
        valorSolicitado: 50
      },
      faturaId: 10,
      cartaoId: 2,
      contaId: 1,
      valorSolicitadoCentavos: 5000,
      saldoDisponivelCentavos: 10000,
      motivo: 'Recusa externa',
      resultado: 'recusado'
    }]

    armazenamento.substituir(dados)

    expect(
      financas.registrarTentativaPagamentoFaturaRecusada(
        criarRegistro()
      )
    ).toBe(false)

    expect(
      armazenamento.ler().tentativasPagamentoFaturaRecusadas
    ).toHaveLength(1)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('preserva armazenamento quando a gravacao falha', async () => {
    const armazenamento = criarArmazenamento()
    const financas = await preparar()

    const antes = JSON.stringify(armazenamento.ler())

    armazenamento.setItem.mockImplementation(() => {
      throw new Error('Falha simulada de armazenamento')
    })

    expect(
      financas.registrarTentativaPagamentoFaturaRecusada(
        criarRegistro()
      )
    ).toBe(false)

    expect(JSON.stringify(armazenamento.ler())).toBe(antes)

    expect(
      financas.tentativasPagamentoFaturaRecusadas.value
    ).toHaveLength(0)

    expect(financas.armazenamentoProtegido.value).toBe(true)
  })

  it('recusa dados originais incompletos sem gravacao', async () => {
    const armazenamento = criarArmazenamento()
    const financas = await preparar()

    const antes = JSON.stringify(armazenamento.ler())
    const registro = criarRegistro()

    delete registro.contaId

    expect(
      financas.registrarTentativaPagamentoFaturaRecusada(
        registro
      )
    ).toBe(false)

    expect(JSON.stringify(armazenamento.ler())).toBe(antes)
    expect(financas.armazenamentoProtegido.value).toBe(true)
  })
})