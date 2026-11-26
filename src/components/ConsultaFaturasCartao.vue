<script setup>
import { computed, ref, watch } from 'vue'
import { ReceiptText, ChevronDown, AlertCircle, Wallet } from 'lucide-vue-next'
import { useFinancas } from '../composables/useFinancas.js'
import { validarCicloFaturaCartao } from '../utils/validarCicloFaturaCartao.js'

const {
  cartoesCredito,
  comprasCartao,
  faturasCartao,
  fechamentosFatura,
  pagamentosFatura,
  pagamentosAntecipadosFatura,
  transacoes,
  contas,
  saldoOperacionalDaConta,
  moeda,
  armazenamentoProtegido,
  pagarFaturaCartao,
  anteciparPagamentoFaturaCartao,
  validarSolicitacaoPagamentoAntecipadoFatura,
  consultarResumoFinanceiroFatura,

  consultarObrigacoesComplementaresFatura,
  validarSolicitacaoPagamentoObrigacaoComplementar,
  pagarObrigacaoComplementarFatura,
  consultarSituacaoFinanceiraObrigacaoComplementar
} = useFinancas()

const faturaExpandidaId = ref(null)
const historicosExpandidos = ref({})
const pagamentosExpandidos = ref({})
const limitesHistorico = ref({})

const alternarHistorico = faturaId => {
  historicosExpandidos.value[faturaId] =
    !historicosExpandidos.value[faturaId]
}

const alternarDetalhesPagamento = (faturaId, chavePagamento) => {
  const chave = `${faturaId}:${chavePagamento}`

  pagamentosExpandidos.value[chave] =
    !pagamentosExpandidos.value[chave]
}

const limiteHistorico = faturaId =>
  limitesHistorico.value[faturaId] ?? 5

const mostrarMaisPagamentos = faturaId => {
  limitesHistorico.value[faturaId] =
    limiteHistorico(faturaId) + 5
}

const obrigacaoPagamentoId = ref(null)
const contaPagamentoComplementarId = ref('')
const valorPagamentoComplementar = ref('')
const pagamentoComplementarEmAndamento = ref(false)
const mensagemPagamentoComplementar = ref('')
const obrigacaoMensagemId = ref(null)
const erroPagamentoComplementar = ref(false)
const pagamentoComplementarRequerVerificacao = ref(false)

const faturaPagamentoId = ref(null)
const contaPagamentoId = ref('')
const valorPagamento = ref('')
const ordemFaturas = ref('antigas')
const pagamentoEmAndamento = ref(false)
const mensagemPagamento = ref('')
const erroPagamento = ref(false)
const pagamentoRequerVerificacao = ref(false)

const contasPagamentoAtivas = computed(() =>
  contas.value.filter(conta =>
    Number.isSafeInteger(conta?.id) &&
    conta.id > 0 &&
    conta.ativa === true
  )
)

const contaPagamentoSelecionada = computed(() =>
  contasPagamentoAtivas.value.find(
    conta => conta.id === Number(contaPagamentoId.value)
  ) ?? null
)

const saldoContaPagamentoCentavos = computed(() => {
  if (!contaPagamentoSelecionada.value) return null

  const saldo = saldoOperacionalDaConta(
    contaPagamentoSelecionada.value.id
  )

  return centavos(saldo)
})

const centavos = valor => {
  if (typeof valor !== 'number' ||
      !Number.isFinite(valor) ||
      valor < 0) {
    return null
  }

  const convertido = Math.round(valor * 100)

  if (!Number.isSafeInteger(convertido) ||
      Math.abs(convertido / 100 - valor) > 1e-9) {
    return null
  }

  return convertido
}

const formatarValor = valor => (
  Number.isSafeInteger(valor)
    ? moeda(valor / 100)
    : 'Indisponível'
)

const formatarCompetencia = valor => {
  if (typeof valor !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(valor)) {
    return 'Indisponível'
  }

  const [ano, mes] = valor.split('-')
  return `${mes}/${ano}`
}

const formatarData = valor => {
  if (typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return 'Indisponível'
  }

  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return 'Indisponível'
  }

  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`
}

const fechamentoConfirmado = (fatura, totalCentavos) => {
  const eventos = fechamentosFatura.value.filter(
    evento => evento?.faturaId === fatura.id
  )

  if (fatura.status === 'aberta') {
    return {
      valido: eventos.length === 0,
      evento: null
    }
  }

  if (fatura.status !== 'fechada' || eventos.length !== 1) {
    return { valido: false, evento: null }
  }

  const evento = eventos[0]

  const dataEfetiva = new Date(evento.fechamentoEfetivoEm)

  const dataValida =
    typeof evento.fechamentoEfetivoEm === 'string' &&
    Number.isFinite(dataEfetiva.getTime()) &&
    dataEfetiva.toISOString() === evento.fechamentoEfetivoEm

  const valido =
    evento.status === 'confirmado' &&
    evento.cartaoId === fatura.cartaoId &&
    evento.competencia === fatura.competencia &&
    evento.fechamentoPrevisto === fatura.fechamento &&
    Number.isSafeInteger(evento.valorConsolidadoCentavos) &&
    evento.valorConsolidadoCentavos === totalCentavos &&
    dataValida

  return {
    valido,
    evento: valido ? evento : null
  }
}
const identificadorPagamentoValido = valor =>
  (typeof valor === 'string' && valor.trim().length > 0) ||
  (Number.isSafeInteger(valor) && valor > 0)

const dataPagamentoValida = valor =>
  typeof valor === 'string' &&
  /^\d{4}-\d{2}-\d{2}T/.test(valor) &&
  Number.isFinite(Date.parse(valor))

const dataTransacaoValida = valor => {
  if (typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const [ano, mes, dia] = valor.split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia))

  return (
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia
  )
}

const transacaoPagamentoValida = transacao =>
  transacao !== null &&
  typeof transacao === 'object' &&
  !Array.isArray(transacao) &&
  Number.isSafeInteger(transacao.id) &&
  transacao.id > 0 &&
  typeof transacao.descricao === 'string' &&
  transacao.descricao.trim().length > 0 &&
  typeof transacao.valor === 'number' &&
  Number.isFinite(transacao.valor) &&
  transacao.valor > 0 &&
  transacao.tipo === 'despesa' &&
  typeof transacao.categoria === 'string' &&
  transacao.categoria.trim().length > 0 &&
  dataTransacaoValida(transacao.data)

const historicoPagamentosPorFatura = computed(() => {
  const resultado = new Map()

  const registros = [
    ...pagamentosFatura.value.map((pagamento, indiceOrigem) => ({
      pagamento,
      modalidade: 'convencional',
      chaveApresentacao: `convencional:${indiceOrigem}`
    })),
    ...pagamentosAntecipadosFatura.value.map((pagamento, indiceOrigem) => ({
      pagamento,
      modalidade: 'antecipado',
      chaveApresentacao: `antecipado:${indiceOrigem}`
    }))
  ]

  const contar = (mapa, chave) => {
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1)
  }

  const contagemIds = new Map()
  const contagemOperacoes = new Map()
  const contagemTransacoes = new Map()

  for (const item of registros) {
    const pagamento = item.pagamento

    if (!pagamento || typeof pagamento !== 'object' ||
        Array.isArray(pagamento)) {
      continue
    }

    if (pagamento.id !== undefined && pagamento.id !== null) {
      contar(contagemIds, `${typeof pagamento.id}:${pagamento.id}`)
    }

    if (typeof pagamento.operacaoId === 'string' &&
        pagamento.operacaoId.trim()) {
      contar(contagemOperacoes, pagamento.operacaoId)
    }

    if (Number.isSafeInteger(pagamento.transacaoId) &&
        pagamento.transacaoId > 0) {
      contar(contagemTransacoes, pagamento.transacaoId)
    }
  }

  for (const fatura of faturasCartao.value) {
    if (!Number.isSafeInteger(fatura?.id) || fatura.id <= 0) {
      continue
    }

    const historico = registros
      .filter(item => item.pagamento?.faturaId === fatura.id)
      .map(item => {
        const pagamento = item.pagamento
        const motivos = []

        if (!pagamento || typeof pagamento !== 'object' ||
            Array.isArray(pagamento)) {
          return {
            id: null,
            faturaId: fatura.id,
            modalidade: item.modalidade,
            chaveApresentacao: item.chaveApresentacao,
            valido: false,
            motivos: ['Registro de pagamento malformado'],
            dataValida: false
          }
        }

        const antecipado = item.modalidade === 'antecipado'

        const identificadorValido = antecipado
          ? (
              typeof pagamento.id === 'string' &&
              typeof pagamento.operacaoId === 'string' &&
              pagamento.operacaoId.trim().length > 0 &&
              pagamento.id === `antecipacao-${pagamento.operacaoId}` &&
              pagamento.tipo === 'antecipado'
            )
          : identificadorPagamentoValido(pagamento.id)

        if (!identificadorValido) {
          motivos.push('Identificador ou modalidade invalida')
        }

        if (pagamento.status !== 'confirmado') {
          motivos.push('Pagamento nao confirmado')
        }

        if (pagamento.cartaoId !== fatura.cartaoId) {
          motivos.push('Cartao vinculado divergente')
        }

        const dataValida = dataPagamentoValida(pagamento.dataHora)

        if (!dataValida) {
          motivos.push('Data ou hora invalida')
        }

        if (!Number.isSafeInteger(pagamento.valorPagoCentavos) ||
            pagamento.valorPagoCentavos <= 0) {
          motivos.push('Valor de pagamento invalido')
        }

        if (!Number.isSafeInteger(pagamento.contaId) ||
            pagamento.contaId <= 0) {
          motivos.push('Conta bancaria invalida')
        }

        if (!Number.isSafeInteger(pagamento.transacaoId) ||
            pagamento.transacaoId <= 0) {
          motivos.push('Identificador de transacao invalido')
        }

        if (typeof pagamento.operacaoId !== 'string' ||
            !pagamento.operacaoId.trim()) {
          motivos.push('Identificador de operacao invalido')
        }

        if ((contagemIds.get(
          `${typeof pagamento.id}:${pagamento.id}`
        ) ?? 0) > 1) {
          motivos.push('Identificador de pagamento duplicado')
        }

        if ((contagemOperacoes.get(pagamento.operacaoId) ?? 0) > 1) {
          motivos.push('Operacao duplicada')
        }

        if ((contagemTransacoes.get(pagamento.transacaoId) ?? 0) > 1) {
          motivos.push('Transacao utilizada por mais de um pagamento')
        }

        const vinculadas = transacoes.value.filter(
          transacao => transacao?.id === pagamento.transacaoId
        )

        if (vinculadas.length !== 1) {
          motivos.push('Vinculo bancario ausente ou duplicado')
        } else {
          const transacao = vinculadas[0]

          if (!transacaoPagamentoValida(transacao) ||
              transacao.contaId !== pagamento.contaId ||
              centavos(transacao.valor) !== pagamento.valorPagoCentavos) {
            motivos.push('Dados da transacao bancaria divergentes')
          }
        }

        return {
          id: pagamento.id,
          operacaoId: pagamento.operacaoId,
          transacaoId: pagamento.transacaoId,
          contaId: pagamento.contaId,
          faturaId: pagamento.faturaId,
          modalidade: item.modalidade,
          chaveApresentacao: item.chaveApresentacao,
          valorPagoCentavos: pagamento.valorPagoCentavos,
          dataHora: pagamento.dataHora,
          status: pagamento.status,
          dataValida,
          valido: motivos.length === 0,
          motivos
        }
      })
      .sort((a, b) => {
        const dataA = a.dataValida ? Date.parse(a.dataHora) : -Infinity
        const dataB = b.dataValida ? Date.parse(b.dataHora) : -Infinity

        if (dataA !== dataB) return dataB - dataA

        return String(a.id).localeCompare(String(b.id))
      })

    resultado.set(fatura.id, historico)
  }

  return resultado
})
const faturas = computed(() =>
  faturasCartao.value.map(fatura => {
    const cartao = cartoesCredito.value.find(
      item => item.id === fatura.cartaoId
    )

    const parcelasValidas = Array.isArray(fatura.parcelas)
    let totalCentavos = parcelasValidas ? 0 : null

    const parcelas = parcelasValidas
      ? fatura.parcelas.map(parcela => {
          const valorCentavos = centavos(parcela?.valor)
          const compra = comprasCartao.value.find(
            item => item.id === parcela?.compraId &&
              item.cartaoId === fatura.cartaoId
          )

          const numeroValido =
            Number.isSafeInteger(parcela?.numero) &&
            Number.isSafeInteger(parcela?.total) &&
            parcela.numero >= 1 &&
            parcela.total >= parcela.numero

          const vinculacaoValida =
            Boolean(compra) &&
            parcela?.competencia === fatura.competencia

          const valida =
            valorCentavos !== null &&
            valorCentavos > 0 &&
            numeroValido &&
            vinculacaoValida

          if (!valida) {
            totalCentavos = null
          } else if (totalCentavos !== null) {
            const soma = totalCentavos + valorCentavos
            totalCentavos = Number.isSafeInteger(soma)
              ? soma
              : null
          }

          return {
            compraId: parcela?.compraId,
            descricao: compra?.descricao ?? 'Compra não identificada',
            numero: parcela?.numero,
            quantidade: parcela?.total,
            valorCentavos: valida ? valorCentavos : null,
            valida
          }
        })
      : []

    const estruturaValida =
      Boolean(cartao) &&
      Number.isSafeInteger(fatura.id) &&
      fatura.id > 0 &&
      formatarCompetencia(fatura.competencia) !== 'Indisponível' &&
      formatarData(fatura.fechamento) !== 'Indisponível' &&
      formatarData(fatura.vencimento) !== 'Indisponível' &&
      ['aberta', 'fechada'].includes(fatura.status) &&
      parcelasValidas &&
      parcelas.length > 0

    const resumoMotor =
      consultarResumoFinanceiroFatura(fatura.id)

    const camposFinanceiros = resumoMotor?.campos

    const originalFinanceiro = camposFinanceiros?.valorOriginal
    const antecipadoFinanceiro = camposFinanceiros?.valorAntecipado
    const convencionalFinanceiro = camposFinanceiros?.valorPagoConvencional
    const pendenteFinanceiro = camposFinanceiros?.valorPendente

    const pagamentosValidos =
      resumoMotor?.valido === true &&
      originalFinanceiro?.valido === true &&
      antecipadoFinanceiro?.valido === true &&
      convencionalFinanceiro?.valido === true &&
      pendenteFinanceiro?.valido === true &&
      originalFinanceiro.valorCentavos === totalCentavos

    const totalPagoCalculado = pagamentosValidos
      ? antecipadoFinanceiro.valorCentavos +
        convencionalFinanceiro.valorCentavos
      : null

    const totalPagoCentavos =
      Number.isSafeInteger(totalPagoCalculado) &&
      totalPagoCalculado <= totalCentavos
        ? totalPagoCalculado
        : null

    const saldoDevedorCentavos =
      totalPagoCentavos !== null
        ? pendenteFinanceiro.valorCentavos
        : null

    const resumoFinanceiroValido =
      pagamentosValidos &&
      totalPagoCentavos !== null &&
      Number.isSafeInteger(saldoDevedorCentavos) &&
      saldoDevedorCentavos >= 0 &&
      totalCentavos - totalPagoCentavos === saldoDevedorCentavos
    const validacaoCiclo = validarCicloFaturaCartao(fatura)

    const confirmacao = fechamentoConfirmado(
      fatura,
      totalCentavos
    )

    const valida =
      estruturaValida &&
      totalCentavos !== null &&
      validacaoCiclo.valido &&
      confirmacao.valido

    const situacaoFinanceira = !valida || !resumoFinanceiroValido
      ? 'Inconsistente'
      : fatura.status === 'aberta'
        ? 'Aberta'
        : totalPagoCentavos === 0
          ? 'Fechada'
          : saldoDevedorCentavos === 0
            ? 'Quitada'
            : 'Parcialmente paga'

    return {
      situacaoFinanceira,
      id: fatura.id,
      cartao: cartao?.nome ?? 'Cartão não identificado',
      competenciaOriginal: fatura.competencia,
      competencia: formatarCompetencia(fatura.competencia),
      fechamento: formatarData(fatura.fechamento),
      vencimento: formatarData(fatura.vencimento),
      status: fatura.status,
      fechamentoEfetivo: confirmacao.evento
        ? new Date(
            confirmacao.evento.fechamentoEfetivoEm
          ).toLocaleString('pt-BR')
        : null,
      parcelas,
      valida,
      validacaoCiclo: validacaoCiclo.status,
      motivoValidacaoCiclo: validacaoCiclo.motivo,
      totalCentavos: valida ? totalCentavos : null,
      totalPagoCentavos:
        valida && resumoFinanceiroValido
          ? totalPagoCentavos
          : null,
      saldoDevedorCentavos:
        valida && resumoFinanceiroValido
          ? saldoDevedorCentavos
          : null,
      resumoFinanceiroValido: valida && resumoFinanceiroValido
    }
  }).sort((a, b) => {
    const comparacao = String(
      a.competenciaOriginal
    ).localeCompare(String(b.competenciaOriginal))

    return ordemFaturas.value === 'antigas'
      ? comparacao
      : -comparacao
  })
)

const resumo = computed(() => {
  let total = 0
  let valido = true

  for (const fatura of faturas.value) {
    if (!fatura.valida) {
      valido = false
      continue
    }

    const soma = total + fatura.totalCentavos

    if (!Number.isSafeInteger(soma)) {
      valido = false
      continue
    }

    total = soma
  }

  return {
    quantidade: faturas.value.length,
    total: valido ? total : null,
    valido
  }
})

function faturaElegivelParaPagamento(fatura) {
  return (
    fatura?.valida === true &&
    fatura.resumoFinanceiroValido === true &&
    (fatura.status === 'fechada' || fatura.status === 'aberta') &&
    Number.isSafeInteger(fatura.saldoDevedorCentavos) &&
    fatura.saldoDevedorCentavos > 0 &&
    armazenamentoProtegido.value !== true
  )
}

function fecharFormularioPagamentoComplementar() {
  if (pagamentoComplementarEmAndamento.value) return

  obrigacaoPagamentoId.value = null
  contaPagamentoComplementarId.value = ''
  valorPagamentoComplementar.value = ''
}

function abrirFormularioPagamentoComplementar(obrigacao) {
  if (
    pagamentoComplementarEmAndamento.value ||
    pagamentoComplementarRequerVerificacao.value ||
    armazenamentoProtegido.value
  ) return

  if (
    !obrigacao ||
    obrigacao.status !== 'confirmada' ||
    !obrigacao.resumoFinanceiro ||
    obrigacao.resumoFinanceiro.saldoRestanteCentavos <= 0
  ) return

  obrigacaoMensagemId.value = null
  mensagemPagamentoComplementar.value = ''
  erroPagamentoComplementar.value = false

  obrigacaoPagamentoId.value = obrigacao.id
  contaPagamentoComplementarId.value = ''
  valorPagamentoComplementar.value = (
    obrigacao.resumoFinanceiro.saldoRestanteCentavos / 100
  ).toFixed(2)
}

function contaComplementarSelecionada() {
  return contasPagamentoAtivas.value.find(
    conta => conta.id === Number(contaPagamentoComplementarId.value)
  ) ?? null
}

function executarPagamentoComplementar(obrigacao) {
  if (
    pagamentoComplementarEmAndamento.value ||
    pagamentoComplementarRequerVerificacao.value ||
    armazenamentoProtegido.value
  ) return

  obrigacaoMensagemId.value = obrigacao?.id ?? null
  mensagemPagamentoComplementar.value = ''
  erroPagamentoComplementar.value = false

  if (
    !obrigacao ||
    obrigacaoPagamentoId.value !== obrigacao.id ||
    obrigacao.status !== 'confirmada'
  ) {
    mensagemPagamentoComplementar.value = 'Obrigacao indisponivel.'
    erroPagamentoComplementar.value = true
    return
  }

  const conta = contaComplementarSelecionada()
  const textoValor = String(
    valorPagamentoComplementar.value
  ).trim().replace(',', '.')

  if (!conta) {
    mensagemPagamentoComplementar.value =
      'Selecione uma conta bancaria ativa.'
    erroPagamentoComplementar.value = true
    return
  }

  if (!/^\d+(\.\d{1,2})?$/.test(textoValor)) {
    mensagemPagamentoComplementar.value =
      'Informe um valor valido com ate duas casas decimais.'
    erroPagamentoComplementar.value = true
    return
  }

  const valor = Number(textoValor)

  const dados = {
    obrigacaoId: obrigacao.id,
    contaId: conta.id,
    valor
  }

  const validacao =
    validarSolicitacaoPagamentoObrigacaoComplementar(dados)

  if (validacao?.valido !== true) {
    mensagemPagamentoComplementar.value =
      `Pagamento indisponivel: ${validacao?.motivo || 'VALIDACAO_INCONSISTENTE'}.`
    erroPagamentoComplementar.value = true
    return
  }

  const saldoPendente = validacao.valorPendenteCentavos
  const saldoDisponivel = validacao.saldoDisponivelCentavos

  if (!globalThis.crypto?.randomUUID) {
    mensagemPagamentoComplementar.value =
      'Nao foi possivel preparar um identificador seguro. Nenhum pagamento foi enviado.'
    erroPagamentoComplementar.value = true
    return
  }

  let operacaoId

  try {
    operacaoId = `pagamento-complementar-ui-${crypto.randomUUID()}`
  } catch (erro) {
    console.error('Falha na preparacao do pagamento complementar:', erro)

    mensagemPagamentoComplementar.value =
      'Falha na preparacao. Nenhum pagamento foi enviado.'
    erroPagamentoComplementar.value = true
    return
  }

  const confirmado = window.confirm(
    'Confirmar pagamento complementar?\n\n' +
    `Conta: ${conta.nome}\n` +
    `Valor: ${formatarValor(validacao.valorSolicitadoCentavos)}\n` +
    `Saldo bancario: ${formatarValor(saldoDisponivel)}\n` +
    `Saldo da obrigacao: ${formatarValor(saldoPendente)}\n\n` +
    'Esta operacao registrara uma movimentacao financeira independente da fatura original.'
  )

  if (!confirmado) return

  pagamentoComplementarEmAndamento.value = true

  try {
    const resultado = pagarObrigacaoComplementarFatura({
      ...dados,
      operacaoId
    })

    if (resultado?.sucesso === true && resultado.pagamento) {
      obrigacaoPagamentoId.value = null
      contaPagamentoComplementarId.value = ''
      valorPagamentoComplementar.value = ''
      mensagemPagamentoComplementar.value =
        'Pagamento complementar confirmado e registrado.'
      erroPagamentoComplementar.value = false
      return
    }

    const motivo = resultado?.motivo || 'RESULTADO_NAO_CONFIRMADO'

    if (
      motivo === 'PAGAMENTO_REQUER_VERIFICACAO' ||
      motivo === 'RESULTADO_NAO_CONFIRMADO'
    ) {
      pagamentoComplementarRequerVerificacao.value = true
    }

    mensagemPagamentoComplementar.value =
      `Pagamento nao confirmado: ${motivo}.`
    erroPagamentoComplementar.value = true
  } catch (erro) {
    console.error('Falha no pagamento complementar:', erro)

    pagamentoComplementarRequerVerificacao.value = true
    mensagemPagamentoComplementar.value =
      'Resultado indeterminado. Verifique os registros antes de tentar novamente.'
    erroPagamentoComplementar.value = true
  } finally {
    pagamentoComplementarEmAndamento.value = false
  }
}

function abrirFormularioPagamento(fatura) {
  if (!faturaElegivelParaPagamento(fatura)) return
  if (pagamentoEmAndamento.value || pagamentoRequerVerificacao.value) return

  mensagemPagamento.value = ''
  erroPagamento.value = false

  contaPagamentoId.value = ''
  valorPagamento.value = (
    fatura.saldoDevedorCentavos / 100
  ).toFixed(2)

  faturaPagamentoId.value = fatura.id
}

function confirmarPagamentoFatura(fatura) {
  if (pagamentoEmAndamento.value || pagamentoRequerVerificacao.value) return

  mensagemPagamento.value = ''
  erroPagamento.value = false

  if (!faturaElegivelParaPagamento(fatura)) {
    mensagemPagamento.value = 'Fatura indisponivel para pagamento.'
    erroPagamento.value = true
    return
  }

  const antecipado = fatura.status === 'aberta'
  const conta = contaPagamentoSelecionada.value
  const textoValor = String(valorPagamento.value).trim().replace(',', '.')

  if (!conta) {
    mensagemPagamento.value = 'Selecione uma conta bancaria ativa.'
    erroPagamento.value = true
    return
  }

  if (!/^\d+(\.\d{1,2})?$/.test(textoValor)) {
    mensagemPagamento.value = 'Informe um valor valido com ate duas casas decimais.'
    erroPagamento.value = true
    return
  }

  const valor = Number(textoValor)
  const valorCentavos = Math.round(valor * 100)

  if (
    !Number.isSafeInteger(valorCentavos) ||
    valorCentavos <= 0 ||
    valorCentavos > fatura.saldoDevedorCentavos
  ) {
    mensagemPagamento.value = 'Valor invalido ou superior ao saldo pendente.'
    erroPagamento.value = true
    return
  }

  if (
    !Number.isSafeInteger(saldoContaPagamentoCentavos.value) ||
    saldoContaPagamentoCentavos.value < valorCentavos
  ) {
    mensagemPagamento.value = 'Saldo bancario insuficiente ou inconsistente.'
    erroPagamento.value = true
    return
  }

  const dados = {
    faturaId: fatura.id,
    contaId: conta.id,
    valor
  }

  if (antecipado) {
    const validacao = validarSolicitacaoPagamentoAntecipadoFatura(dados)

    if (
      validacao?.valido !== true ||
      validacao.valorSolicitadoCentavos !== valorCentavos ||
      !Number.isSafeInteger(validacao.valorPendenteCentavos) ||
      valorCentavos > validacao.valorPendenteCentavos
    ) {
      mensagemPagamento.value =
        `Antecipacao indisponivel: ${validacao?.motivo || 'VALIDACAO_INCONSISTENTE'}.`
      erroPagamento.value = true
      return
    }
  }

  const confirmado = window.confirm(
    `${antecipado ? 'Confirmar antecipacao' : 'Confirmar pagamento'} da fatura?\n\n` +
    `Conta: ${conta.nome}\n` +
    `Valor: ${formatarValor(valorCentavos)}\n` +
    `Saldo pendente: ${formatarValor(fatura.saldoDevedorCentavos)}\n\n` +
    'Esta operacao registrara uma movimentacao financeira.'
  )

  if (!confirmado) return

  pagamentoEmAndamento.value = true

  try {
    if (!globalThis.crypto?.randomUUID) {
      throw new Error('Identificador seguro indisponivel.')
    }

    const identificador = crypto.randomUUID()

    const solicitacao = {
      ...dados,
      operacaoId: `pagamento-ui-${identificador}`
    }

    if (antecipado) {
      solicitacao.tentativaId = `ui-${identificador}`
      solicitacao.tentativaDataHora = new Date().toISOString()
    }

    const resultado = antecipado
      ? anteciparPagamentoFaturaCartao(solicitacao)
      : pagarFaturaCartao(solicitacao)

    if (resultado?.sucesso === true && resultado.pagamento) {
      mensagemPagamento.value = antecipado
        ? 'Pagamento antecipado confirmado e registrado.'
        : 'Pagamento de fatura confirmado e registrado.'
      erroPagamento.value = false
      fecharFormularioPagamento()
      return
    }

    const motivo = resultado?.motivo || 'RESULTADO_NAO_CONFIRMADO'

    if (
      motivo === 'ANTECIPACAO_REQUER_VERIFICACAO' ||
      motivo === 'PAGAMENTO_REQUER_VERIFICACAO' ||
      motivo === 'RESULTADO_NAO_CONFIRMADO' ||
      motivo === 'AUDITORIA_NAO_CONFIRMADA' ||
      motivo === 'PERSISTENCIA_NAO_CONFIRMADA'
    ) {
      pagamentoRequerVerificacao.value = true
      mensagemPagamento.value =
        'Resultado financeiro nao confirmado. Verifique os registros antes de tentar novamente.'
    } else {
      mensagemPagamento.value = `Operacao recusada: ${motivo}.`
    }

    erroPagamento.value = true
  } catch (erro) {
    console.error('Erro na integracao financeira:', erro)
    pagamentoRequerVerificacao.value = true
    mensagemPagamento.value =
      'Resultado nao confirmado. Nao repita a operacao antes da verificacao.'
    erroPagamento.value = true
  } finally {
    pagamentoEmAndamento.value = false
  }
}
function fecharFormularioPagamento() {
  if (pagamentoEmAndamento.value) return
  faturaPagamentoId.value = null
  contaPagamentoId.value = ''
  valorPagamento.value = ''
}

watch(
  () => {
    const fatura = faturas.value.find(
      item => item.id === faturaPagamentoId.value
    )

    return (
      faturaPagamentoId.value !== null &&
      !faturaElegivelParaPagamento(fatura)
    )
  },
  deveFechar => {
    if (deveFechar) fecharFormularioPagamento()
  }
)

watch(contasPagamentoAtivas, lista => {
  if (
    contaPagamentoId.value !== '' &&
    !lista.some(
      conta => conta.id === Number(contaPagamentoId.value)
    )
  ) {
    contaPagamentoId.value = ''
  }
})

function alternarDetalhes(id) {
  const recolhendo = faturaExpandidaId.value === id

  faturaExpandidaId.value = recolhendo ? null : id

  if (recolhendo || faturaPagamentoId.value !== id) {
    fecharFormularioPagamento()
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div>
        <h2 class="text-lg font-bold text-slate-800">
          Faturas dos cartões
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Consulta de faturas e parcelas registradas.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <label
          for="ordenacao-faturas"
          class="text-xs font-medium text-slate-600"
        >
          Ordenar por
        </label>

        <select
          id="ordenacao-faturas"
          v-model="ordemFaturas"
          class="nexus-select !w-auto !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-xs"
        >
          <option value="antigas">
            Mais antigas primeiro
          </option>
          <option value="recentes">
            Mais recentes primeiro
          </option>
        </select>

        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          Somente consulta
        </span>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <p class="text-xs text-slate-500">Faturas cadastradas</p>
        <p class="mt-1 text-xl font-bold text-slate-900">
          {{ resumo.quantidade }}
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <p class="text-xs text-slate-500">Total das faturas</p>
        <p class="mt-1 text-xl font-bold text-slate-900">
          {{ formatarValor(resumo.total) }}
        </p>
      </div>
    </div>

    <div
      v-if="!resumo.valido"
      role="alert"
      class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
    >
      <AlertCircle :size="16" class="shrink-0" />
      <span>
        Foram identificadas inconsistências nas faturas.
        Os totais afetados estão indisponíveis até regularização.
        Nenhum registro foi corrigido automaticamente.
      </span>
    </div>

    <div
      v-if="faturas.length === 0"
      class="rounded-xl border border-dashed border-slate-200 p-8 text-center"
    >
      <ReceiptText :size="26" class="mx-auto text-slate-400" />
      <p class="mt-2 text-sm font-semibold text-slate-700">
        Nenhuma fatura cadastrada
      </p>
      <p class="mt-1 text-xs text-slate-500">
        As faturas serão exibidas após o registro de compras.
      </p>
    </div>

    <div v-else class="space-y-1.5">
      <article
        v-for="(fatura, indice) in faturas"
        :key="`${fatura.id}-${indice}`"
        class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <button
          type="button"
          class="flex w-full appearance-none flex-wrap items-center justify-between gap-2 border-0 bg-white px-3 py-2.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"
          :aria-expanded="faturaExpandidaId === fatura.id"
          @click="alternarDetalhes(fatura.id)"
        >
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-900">
              {{ fatura.cartao }}
            </p>
            <p class="text-xs text-slate-500">
              Competência {{ fatura.competencia }}
              · Vencimento {{ fatura.vencimento }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <div class="text-right">
              <p class="text-sm font-bold text-slate-900">
                {{ formatarValor(fatura.totalCentavos) }}
              </p>
              <p
                class="text-xs"
                :class="fatura.valida ? 'text-emerald-700' : 'text-amber-700'"
              >
                {{ fatura.situacaoFinanceira }}
              </p>
            </div>
            <ChevronDown
              :size="17"
              class="text-slate-500"
              :class="{ 'rotate-180': faturaExpandidaId === fatura.id }"
            />
          </div>
        </button>

        <div
          v-if="faturaExpandidaId === fatura.id"
          class="border-t border-slate-100 px-3 py-2.5"
        >
          <p class="mb-2 text-xs text-slate-500">
            Fechamento previsto: {{ fatura.fechamento }}
            · Situação registrada: {{ fatura.status ?? 'Indisponível' }}
            <template v-if="fatura.fechamentoEfetivo">
              · Fechamento confirmado em {{ fatura.fechamentoEfetivo }}
            </template>
          </p>

          <p
            v-if="fatura.validacaoCiclo === 'historico_indisponivel'"
            class="mb-2 text-xs text-slate-500"
          >
            Validação histórica limitada: configuração original
            do ciclo não registrada nesta fatura.
          </p>

          <div class="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p class="text-xs text-slate-500">Valor total</p>
              <p class="mt-1 text-sm font-bold text-slate-900">
                {{ formatarValor(fatura.totalCentavos) }}
              </p>
            </div>

            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p class="text-xs text-slate-500">Valor pago</p>
              <p class="mt-1 text-sm font-bold text-emerald-700">
                {{ formatarValor(fatura.totalPagoCentavos) }}
              </p>
            </div>

            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p class="text-xs text-slate-500">Saldo devedor</p>
              <p class="mt-1 text-sm font-bold text-slate-900">
                {{ formatarValor(fatura.saldoDevedorCentavos) }}
              </p>
            </div>
          </div>

          <p
            v-if="!fatura.resumoFinanceiroValido"
            role="alert"
            class="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          >
            <AlertCircle :size="15" class="shrink-0" />
            Resumo financeiro indisponível por inconsistência nos registros.
            Nenhum valor foi corrigido automaticamente.
          </p>

          <!-- CART-PAG-UI-16-C.1-C: historico de pagamentos -->
<section class="mb-3 rounded-xl border border-slate-200 bg-white">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    :aria-expanded="Boolean(historicosExpandidos[fatura.id])"
    @click="alternarHistorico(fatura.id)"
  >
    <span class="flex items-center gap-2">
      <ReceiptText :size="16" class="text-emerald-600" />
      <span class="text-xs font-semibold text-slate-800">
        Histórico de pagamentos
      </span>
      <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        {{ (historicoPagamentosPorFatura.get(fatura.id) ?? []).length }}
      </span>
    </span>

    <ChevronDown
      :size="16"
      class="shrink-0 text-slate-500 transition-transform"
      :class="{ 'rotate-180': historicosExpandidos[fatura.id] }"
    />
  </button>

  <div
    v-if="historicosExpandidos[fatura.id]"
    class="border-t border-slate-100 px-3 py-1.5"
  >
    <p
      v-if="!(historicoPagamentosPorFatura.get(fatura.id) ?? []).length"
      class="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500"
    >
      Nenhum pagamento registrado para esta fatura.
    </p>

    <template v-else>
      <div class="divide-y divide-slate-100">
        <div
          v-for="pagamento in (historicoPagamentosPorFatura.get(fatura.id) ?? []).slice(0, limiteHistorico(fatura.id))"
          :key="`${fatura.id}:${pagamento.chaveApresentacao}`"
          class="flex flex-wrap items-center justify-between gap-1.5 py-1.5"
        >
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-800">
              {{ pagamento.modalidade === 'antecipado' ? 'Pagamento antecipado' : 'Pagamento de fatura' }}
            </p>
            <p class="mt-0.5 text-[11px] text-slate-500">
              {{ pagamento.dataValida ? new Date(pagamento.dataHora).toLocaleString('pt-BR') : 'Data indisponível' }}
              · {{ contas.find(conta => conta.id === pagamento.contaId)?.nome ?? 'Conta não identificada' }}
            </p>
            <p
              class="mt-0.5 text-[11px]"
              :class="pagamento.valido ? 'text-emerald-700' : 'text-amber-700'"
            >
              {{ pagamento.valido ? 'Confirmado' : 'Em verificação — registro não confirmado' }}
            </p>
          </div>
          <p class="text-xs font-bold text-slate-900">
            {{
              Number.isSafeInteger(pagamento.valorPagoCentavos) &&
              pagamento.valorPagoCentavos > 0
                ? formatarValor(pagamento.valorPagoCentavos)
                : 'Valor indisponível'
            }}
          </p>
        </div>
      </div>

      <details
        v-if="(historicoPagamentosPorFatura.get(fatura.id) ?? []).some(pagamento => !pagamento.valido)"
        class="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
      >
        <summary class="cursor-pointer font-semibold">
          Existem pagamentos em verificação — Ver inconsistências
        </summary>
        <p class="mt-2">
          Registros inconsistentes não são considerados confirmados nesta consulta.
        </p>
        <ul class="mt-2 space-y-2">
          <li
            v-for="pagamento in (historicoPagamentosPorFatura.get(fatura.id) ?? []).filter(item => !item.valido)"
            :key="`${fatura.id}:inconsistencia:${pagamento.chaveApresentacao}`"
            class="rounded-md border border-amber-200 bg-white px-2 py-2"
          >
            <p class="font-semibold">
              {{ pagamento.modalidade === 'antecipado' ? 'Pagamento antecipado' : 'Pagamento de fatura' }}
              · {{ pagamento.dataValida ? new Date(pagamento.dataHora).toLocaleString('pt-BR') : 'Data indisponível' }}
            </p>
            <ul class="mt-1 list-disc pl-4">
              <li
                v-for="(motivo, indice) in pagamento.motivos"
                :key="indice"
              >
                {{ motivo }}
              </li>
            </ul>
          </li>
        </ul>
      </details>

      <div
        v-if="(historicoPagamentosPorFatura.get(fatura.id) ?? []).length > limiteHistorico(fatura.id)"
        class="mt-2 flex justify-center"
      >
        <button
          type="button"
          class="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
          @click="mostrarMaisPagamentos(fatura.id)"
        >
          Ver mais pagamentos
        </button>
      </div>
    </template>
  </div>
</section>
<!-- Pagamento de fatura integrado ao motor financeiro -->
          <div
            v-if="faturaElegivelParaPagamento(fatura)"
            class="mb-3"
          >
            <div class="flex justify-end">
              <button
                v-if="faturaPagamentoId !== fatura.id"
                type="button"
                class="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                @click="abrirFormularioPagamento(fatura)"
              >
                <Wallet :size="15" />
                {{ fatura.status === 'aberta' ? 'Antecipar pagamento' : 'Pagar fatura' }}
              </button>
            </div>

            <div
              v-if="faturaPagamentoId === fatura.id"
              class="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3"
            >
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 class="text-sm font-semibold text-slate-800">
                  {{ fatura.status === 'aberta' ? 'Antecipacao de pagamento' : 'Pagamento da fatura' }}
                </h3>
                <span class="text-xs font-medium text-slate-500">
                  Pendente:
                  {{ formatarValor(fatura.saldoDevedorCentavos) }}
                </span>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    for="conta-pagamento-fatura"
                    class="mb-1 block text-xs font-medium text-slate-600"
                  >
                    Conta bancária
                  </label>
                  <select
                    id="conta-pagamento-fatura"
                    v-model="contaPagamentoId"
                    class="nexus-select !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-xs"
                  >
                    <option value="">
                      Selecione uma conta ativa
                    </option>
                    <option
                      v-for="conta in contasPagamentoAtivas"
                      :key="conta.id"
                      :value="String(conta.id)"
                    >
                      {{ conta.nome }}
                    </option>
                  </select>

                  <p class="mt-1 text-xs text-slate-500">
                    Saldo disponível:
                    {{ formatarValor(saldoContaPagamentoCentavos) }}
                  </p>
                </div>

                <div>
                  <label
                    for="valor-pagamento-fatura"
                    class="mb-1 block text-xs font-medium text-slate-600"
                  >
                    Valor do pagamento
                  </label>
                  <input
                    id="valor-pagamento-fatura"
                    v-model="valorPagamento"
                    type="number"
                    min="0.01"
                    :max="fatura.saldoDevedorCentavos / 100"
                    step="0.01"
                    inputmode="decimal"
                    class="nexus-input !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-xs"
                  />
                  <p class="mt-1 text-xs text-slate-500">
                    Pagamento integral ou parcial.
                  </p>
                </div>
              </div>


              <div class="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-emerald-100 pt-3">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  :disabled="pagamentoEmAndamento"
                  @click="fecharFormularioPagamento"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  :disabled="pagamentoEmAndamento || pagamentoRequerVerificacao"
                  class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  @click="confirmarPagamentoFatura(fatura)"
                >
                  {{ pagamentoEmAndamento ? 'Processando...' : (fatura.status === 'aberta' ? 'Confirmar antecipacao' : 'Confirmar pagamento') }}
                </button>
              </div>
            </div>
          </div>

          <p
            v-if="mensagemPagamento && (faturaPagamentoId === fatura.id || faturaExpandidaId === fatura.id)"
            role="status"
            class="mb-3 rounded-lg border px-3 py-2 text-xs"
            :class="erroPagamento
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'"
          >
            {{ mensagemPagamento }}
          </p>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 text-slate-500">
                <tr>
                  <th class="px-3 py-1.5 font-semibold">Compra</th>
                  <th class="px-3 py-1.5 font-semibold">Parcela</th>
                  <th class="px-3 py-1.5 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(parcela, indiceParcela) in fatura.parcelas"
                  :key="`${parcela.compraId}-${indiceParcela}`"
                >
                  <td class="px-3 py-1.5">
                    {{ parcela.descricao }}
                  </td>
                  <td class="px-3 py-1.5">
                    {{ parcela.numero ?? '?' }}/{{ parcela.quantidade ?? '?' }}
                  </td>
                  <td class="px-3 py-1.5 text-right">
                    {{ formatarValor(parcela.valorCentavos) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- Obrigações complementares da fatura -->
          <section
            v-if="consultarObrigacoesComplementaresFatura(fatura.id).length > 0"
            class="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
            aria-label="Obrigações complementares"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <h4 class="text-xs font-semibold text-slate-800">
                Obrigações complementares
              </h4>
              <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {{ consultarObrigacoesComplementaresFatura(fatura.id).length }}
              </span>
            </div>

            <div class="space-y-2">
              <div
                v-for="obrigacao in consultarObrigacoesComplementaresFatura(fatura.id)"
                :key="obrigacao.id"
                class="rounded-lg border border-slate-200 bg-white p-2.5"
              >
                <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span class="text-xs font-medium text-slate-700">
                    {{ obrigacao.natureza }}
                  </span>

                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    :class="!obrigacao.resumoFinanceiro
                      ? 'bg-red-100 text-red-700'
                      : obrigacao.status === 'pendente'
                        ? 'bg-amber-100 text-amber-700'
                        : obrigacao.resumoFinanceiro.situacaoFinanceira === 'quitada'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-sky-100 text-sky-700'"
                  >
                    {{ !obrigacao.resumoFinanceiro
                      ? 'Inconsistência'
                      : obrigacao.status === 'pendente'
                        ? 'Aguardando confirmação'
                        : obrigacao.resumoFinanceiro.situacaoFinanceira === 'quitada'
                          ? 'Quitada'
                          : obrigacao.resumoFinanceiro.situacaoFinanceira === 'parcialmente_paga'
                            ? 'Parcialmente paga'
                            : 'Não paga' }}
                  </span>
                </div>

                <div
                  v-if="obrigacao.resumoFinanceiro"
                  class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3"
                >
                  <div>
                    <p class="text-[10px] text-slate-500">Valor original</p>
                    <p class="font-semibold text-slate-800">
                      {{ formatarValor(obrigacao.resumoFinanceiro.valorOriginalCentavos) }}
                    </p>
                  </div>

                  <div>
                    <p class="text-[10px] text-slate-500">Total pago</p>
                    <p class="font-semibold text-slate-800">
                      {{ formatarValor(obrigacao.resumoFinanceiro.totalPagoCentavos) }}
                    </p>
                  </div>

                  <div>
                    <p class="text-[10px] text-slate-500">Saldo restante</p>
                    <p class="font-semibold text-slate-800">
                      {{ formatarValor(obrigacao.resumoFinanceiro.saldoRestanteCentavos) }}
                    </p>
                  </div>
                </div>

                <p
                  v-else
                  role="alert"
                  class="text-xs text-red-700"
                >
                  Situação financeira inconsistente.
                  Consulte o histórico antes de realizar operações.
                </p>
                              <div
                  v-if="
                    obrigacao.status === 'confirmada' &&
                    obrigacao.resumoFinanceiro &&
                    obrigacao.resumoFinanceiro.saldoRestanteCentavos > 0 &&
                    !armazenamentoProtegido &&
                    !pagamentoComplementarRequerVerificacao
                  "
                  class="mt-3 border-t border-slate-100 pt-3"
                >
                  <button
                    v-if="obrigacaoPagamentoId !== obrigacao.id"
                    type="button"
                    class="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    @click="abrirFormularioPagamentoComplementar(obrigacao)"
                  >
                    <Wallet :size="15" />
                    Pagar obrigação
                  </button>

                  <div
                    v-else
                    class="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3"
                  >
                    <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h5 class="text-xs font-semibold text-slate-800">
                        Pagamento complementar
                      </h5>
                      <span class="text-xs text-slate-500">
                        Pendente:
                        {{ formatarValor(obrigacao.resumoFinanceiro.saldoRestanteCentavos) }}
                      </span>
                    </div>

                    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          :for="`conta-pagamento-complementar-${obrigacao.id}`"
                          class="mb-1 block text-xs font-medium text-slate-600"
                        >
                          Conta bancária
                        </label>

                        <select
                          :id="`conta-pagamento-complementar-${obrigacao.id}`"
                          v-model="contaPagamentoComplementarId"
                          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                          :disabled="pagamentoComplementarEmAndamento"
                        >
                          <option value="">Selecione uma conta ativa</option>
                          <option
                            v-for="conta in contasPagamentoAtivas"
                            :key="conta.id"
                            :value="String(conta.id)"
                          >
                            {{ conta.nome }}
                          </option>
                        </select>

                        <p class="mt-1 text-[11px] text-slate-500">
                          Saldo disponível:
                          {{ formatarValor(
                            contaComplementarSelecionada()
                              ? centavos(
                                  saldoOperacionalDaConta(
                                    contaComplementarSelecionada().id
                                  )
                                )
                              : null
                          ) }}
                        </p>
                      </div>

                      <div>
                        <label
                          :for="`valor-pagamento-complementar-${obrigacao.id}`"
                          class="mb-1 block text-xs font-medium text-slate-600"
                        >
                          Valor do pagamento
                        </label>

                        <input
                          :id="`valor-pagamento-complementar-${obrigacao.id}`"
                          v-model="valorPagamentoComplementar"
                          type="number"
                          min="0.01"
                          :max="obrigacao.resumoFinanceiro.saldoRestanteCentavos / 100"
                          step="0.01"
                          inputmode="decimal"
                          :disabled="pagamentoComplementarEmAndamento"
                          class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                        />

                        <p class="mt-1 text-[11px] text-slate-500">
                          Pagamento integral ou parcial.
                        </p>
                      </div>
                    </div>

                    <div class="mt-3 flex flex-wrap justify-end gap-2 border-t border-emerald-100 pt-3">
                      <button
                        type="button"
                        class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        :disabled="pagamentoComplementarEmAndamento"
                        @click="fecharFormularioPagamentoComplementar"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        class="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        :disabled="pagamentoComplementarEmAndamento"
                        @click="executarPagamentoComplementar(obrigacao)"
                      >
                        {{ pagamentoComplementarEmAndamento
                          ? 'Processando...'
                          : 'Confirmar pagamento' }}
                      </button>
                    </div>
                  </div>
                </div>

                <p
                  v-if="
                    mensagemPagamentoComplementar &&
                    obrigacaoMensagemId === obrigacao.id
                  "
                  role="status"
                  class="mt-2 text-xs"
                  :class="erroPagamentoComplementar
                    ? 'text-red-700'
                    : 'text-emerald-700'"
                >
                  {{ mensagemPagamentoComplementar }}
                </p>
              </div>
            </div>
          </section>
        </div>
      </article>
    </div>
  </div>
</template>
