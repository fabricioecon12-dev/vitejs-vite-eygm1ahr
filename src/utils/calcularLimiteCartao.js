/**
 * Nexus Financas - Calculo isolado do limite de credito.
 *
 * Nao modifica registros, estados reativos ou armazenamento.
 * Valores monetarios de entrada sao expressos em reais.
 * Resultados monetarios sao expressos em centavos inteiros.
 *
 * Contrato inicial dos movimentos:
 * - pagamento: id, cartaoId, faturaId, valor, status='confirmado'
 * - estorno: id, pagamentoId, valor, status='confirmado'
 * - ajuste: id, cartaoId, valor, status='autorizado'
 *
 * Ajustes positivos recompõem limite; negativos comprometem.
 * Movimentos pendentes nao produzem efeitos financeiros.
 */

function centavos(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return null
  }

  const resultado = Math.round(valor * 100)

  if (
    !Number.isSafeInteger(resultado) ||
    Math.abs(valor * 100 - resultado) > 1e-7
  ) {
    return null
  }

  return resultado
}

function identificadorValido(id) {
  return (
    (Number.isSafeInteger(id) && id > 0) ||
    (typeof id === 'string' && id.trim().length > 0)
  )
}

function somarSeguro(atual, valor) {
  const resultado = atual + valor
  return Number.isSafeInteger(resultado) ? resultado : null
}

export function calcularLimiteCartao({
  cartao,
  compras = [],
  faturas = [],
  pagamentos = [],
  estornos = [],
  ajustes = []
} = {}) {
  const inconsistencias = []

  const falhar = codigo => {
    if (!inconsistencias.includes(codigo)) {
      inconsistencias.push(codigo)
    }
  }

  const limite = centavos(cartao?.limiteTotal)

  if (
    !identificadorValido(cartao?.id) ||
    limite === null ||
    limite <= 0
  ) {
    falhar('CARTAO_INVALIDO')
  }

  if (
    !Array.isArray(compras) ||
    !Array.isArray(faturas) ||
    !Array.isArray(pagamentos) ||
    !Array.isArray(estornos) ||
    !Array.isArray(ajustes)
  ) {
    falhar('COLECAO_INVALIDA')
  }

  if (inconsistencias.length) {
    return {
      valido: false,
      limiteContratado: null,
      comprometido: null,
      recomposicaoLiquida: null,
      limiteDisponivel: null,
      inconsistencias
    }
  }

  const somar = (atual, valor) => {
    const resultado = somarSeguro(atual, valor)

    if (resultado === null) {
      falhar('EXTRAPOLACAO_NUMERICA')
      return atual
    }

    return resultado
  }

  const idsPorColecao = lista => {
    const ids = new Set()

    for (const item of lista) {
      if (!identificadorValido(item?.id)) {
        falhar('IDENTIFICADOR_INVALIDO')
        continue
      }

      const chave = String(item.id)

      if (ids.has(chave)) {
        falhar('IDENTIFICADOR_DUPLICADO')
      }

      ids.add(chave)
    }
  }

  for (const lista of [
    compras,
    faturas,
    pagamentos,
    estornos,
    ajustes
  ]) {
    idsPorColecao(lista)
  }

  const chave = id => String(id)
  const mesmoCartao = id => chave(id) === chave(cartao.id)

  const faturasCartao = new Map()

  for (const fatura of faturas) {
    if (!mesmoCartao(fatura?.cartaoId)) continue

    if (!identificadorValido(fatura.id)) {
      falhar('FATURA_INVALIDA')
      continue
    }

    faturasCartao.set(chave(fatura.id), fatura)
  }

  let comprometido = 0

  for (const compra of compras) {
    if (!mesmoCartao(compra?.cartaoId)) continue

    if (!['ativa', 'cancelada'].includes(compra.status)) {
      falhar('STATUS_COMPRA_INVALIDO')
      continue
    }

    const valor = centavos(compra.valor)

    if (valor === null || valor <= 0) {
      falhar('COMPRA_INVALIDA')
      continue
    }

    if (compra.status === 'ativa') {
      comprometido = somar(comprometido, valor)
    } else {
      // Cancelamentos exigem conciliacao historica antes
      // de serem considerados em um calculo definitivo.
      falhar('CANCELAMENTO_NAO_CONCILIADO')
    }
  }

  let pagamentosConfirmados = 0
  const pagamentosValidos = new Map()

  for (const pagamento of pagamentos) {
    if (!mesmoCartao(pagamento?.cartaoId)) continue

    if (pagamento.status !== 'confirmado') {
      if (pagamento.status !== 'pendente') {
        falhar('STATUS_PAGAMENTO_INVALIDO')
      }
      continue
    }

    const valor = pagamento.valorPagoCentavos

    if (!Number.isSafeInteger(valor)) {
      falhar('PAGAMENTO_INVALIDO')
      continue
    }
    const fatura = faturasCartao.get(chave(pagamento.faturaId))

    if (
      valor === null ||
      valor <= 0 ||
      !identificadorValido(pagamento.faturaId) ||
      !fatura
    ) {
      falhar('PAGAMENTO_SEM_VINCULO_VALIDO')
      continue
    }

    if (!Array.isArray(fatura.parcelas)) {
      falhar('FATURA_INCONSISTENTE')
      continue
    }

    pagamentosValidos.set(chave(pagamento.id), pagamento)
    pagamentosConfirmados = somar(pagamentosConfirmados, valor)
  }

  let totalEstornos = 0
  const estornadoPorPagamento = new Map()

  for (const estorno of estornos) {
    if (estorno?.status !== 'confirmado') {
      if (estorno?.status !== 'pendente') {
        falhar('STATUS_ESTORNO_INVALIDO')
      }
      continue
    }

    const pagamento = pagamentosValidos.get(chave(estorno.pagamentoId))

    if (!pagamento) {
      falhar('ESTORNO_SEM_PAGAMENTO_VALIDO')
      continue
    }

    const valor = centavos(estorno.valor)
    const anterior = estornadoPorPagamento.get(
      chave(estorno.pagamentoId)
    ) || 0

    if (valor === null || valor <= 0) {
      falhar('ESTORNO_INVALIDO')
      continue
    }

    const acumulado = somar(anterior, valor)
    const valorPagamento = pagamento.valorPagoCentavos

    if (acumulado > valorPagamento) {
      falhar('ESTORNO_EXCEDE_PAGAMENTO')
      continue
    }

    estornadoPorPagamento.set(
      chave(estorno.pagamentoId),
      acumulado
    )

    totalEstornos = somar(totalEstornos, valor)
  }

  let totalAjustes = 0

  for (const ajuste of ajustes) {
    if (!mesmoCartao(ajuste?.cartaoId)) continue

    if (ajuste.status !== 'autorizado') {
      if (ajuste.status !== 'pendente') {
        falhar('STATUS_AJUSTE_INVALIDO')
      }
      continue
    }

    const valor = centavos(ajuste.valor)

    if (valor === null || valor === 0) {
      falhar('AJUSTE_INVALIDO')
      continue
    }

    // O ajuste deve ter justificativa e referencia auditavel.
    if (
      typeof ajuste.justificativa !== 'string' ||
      !ajuste.justificativa.trim() ||
      !identificadorValido(ajuste.referencia)
    ) {
      falhar('AJUSTE_SEM_FUNDAMENTACAO')
      continue
    }

    totalAjustes = somar(totalAjustes, valor)
  }

  const recomposicaoLiquida = somar(
    pagamentosConfirmados,
    -totalEstornos
  )

  const recomposicaoAjustada = somar(
    recomposicaoLiquida,
    totalAjustes
  )

  const limiteDisponivel = somar(
    somar(limite, -comprometido),
    recomposicaoAjustada
  )

  if (
    limiteDisponivel < 0 ||
    limiteDisponivel > limite
  ) {
    falhar('LIMITE_DISPONIVEL_INCONSISTENTE')
  }

  return {
    valido: inconsistencias.length === 0,
    limiteContratado: inconsistencias.length ? null : limite,
    comprometido: inconsistencias.length ? null : comprometido,
    recomposicaoLiquida: inconsistencias.length
      ? null
      : recomposicaoAjustada,
    limiteDisponivel: inconsistencias.length
      ? null
      : limiteDisponivel,
    inconsistencias
  }
}