const PADRAO_MONETARIO_BR =
  /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/

const FORMATADOR_MONETARIO_BR = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: true
})

export function converterMonetarioBR(valorInformado) {
  if (typeof valorInformado === 'number') {
    if (!Number.isFinite(valorInformado)) return null

    const centavos = Math.round(valorInformado * 100)

    if (
      !Number.isSafeInteger(centavos) ||
      Math.abs(valorInformado * 100 - centavos) > 0.000001
    ) {
      return null
    }

    return centavos / 100
  }

  if (typeof valorInformado !== 'string') return null

  const texto = valorInformado.trim()

  if (!texto || !PADRAO_MONETARIO_BR.test(texto)) {
    return null
  }

  const normalizado = texto
    .replace(/\./g, '')
    .replace(',', '.')

  const numero = Number(normalizado)
  const centavos = Math.round(numero * 100)

  if (!Number.isSafeInteger(centavos)) {
    return null
  }

  return centavos / 100
}

export function validarMonetarioBR(valorInformado, opcoes = {}) {
  const { permitirZero = false } = opcoes
  const valor = converterMonetarioBR(valorInformado)

  if (valor === null) return false

  return permitirZero ? valor >= 0 : valor > 0
}

export function formatarMonetarioBR(valorInformado) {
  if (
    valorInformado === '' ||
    valorInformado === null ||
    valorInformado === undefined
  ) {
    return ''
  }

  const valor = converterMonetarioBR(valorInformado)

  if (valor === null) {
    return String(valorInformado)
  }

  return FORMATADOR_MONETARIO_BR.format(valor)
}