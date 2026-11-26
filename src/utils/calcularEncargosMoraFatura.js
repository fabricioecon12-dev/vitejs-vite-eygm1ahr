
const MS_DIA = 86400000

function dataCivil(valor) {
  if (typeof valor !== 'string') return null

  const texto = valor.slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null

  const [ano, mes, dia] = texto.split('-').map(Number)
  const data = new Date(0)

  data.setUTCFullYear(ano, mes - 1, dia)
  data.setUTCHours(0, 0, 0, 0)

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() !== mes - 1 ||
    data.getUTCDate() !== dia
  ) {
    return null
  }

  return data.getTime()
}

function taxaValida(valor) {
  return (
    typeof valor === 'number' &&
    Number.isFinite(valor) &&
    valor >= 0 &&
    valor <= 100 &&
    Math.abs(
      Math.round(valor * 10000) - valor * 10000
    ) < 0.000001
  )
}

function arredondarCentavos(valor) {
  return Math.round(valor + Number.EPSILON)
}

export function calcularEncargosMoraFatura(dados) {
  const recusar = motivo => ({
    valido: false,
    motivo,
    diasAtraso: 0,
    jurosMoraCentavos: 0,
    multaCentavos: 0,
    totalEncargosCentavos: 0,
    intervalos: [],
    memoriaCalculo: null
  })

  if (!dados || typeof dados !== 'object' ||
      Array.isArray(dados)) {
    return recusar('DADOS_INVALIDOS')
  }

  const {
    vencimento,
    dataReferencia,
    valorOriginalCentavos,
    pagamentos = [],
    jurosMoraMensal,
    multaAtraso
  } = dados

  const inicio = dataCivil(vencimento)
  const fim = dataCivil(dataReferencia)

  if (inicio === null || fim === null) {
    return recusar('DATA_INVALIDA')
  }

  if (
    !Number.isSafeInteger(valorOriginalCentavos) ||
    valorOriginalCentavos < 0
  ) {
    return recusar('VALOR_INVALIDO')
  }

  if (!Array.isArray(pagamentos)) {
    return recusar('PAGAMENTOS_INVALIDOS')
  }

  if (!taxaValida(jurosMoraMensal) ||
      !taxaValida(multaAtraso)) {
    return recusar('TAXAS_INSUFICIENTES_OU_INVALIDAS')
  }

  const eventos = []

  for (const pagamento of pagamentos) {
    if (
      !pagamento ||
      pagamento.status !== 'confirmado' ||
      !Number.isSafeInteger(pagamento.valorPagoCentavos) ||
      pagamento.valorPagoCentavos <= 0
    ) {
      return recusar('PAGAMENTO_INVALIDO')
    }

    const data = dataCivil(pagamento.dataHora)

    if (data === null || data > fim) {
      return recusar('DATA_PAGAMENTO_INVALIDA')
    }

    eventos.push({
      data,
      valorCentavos: pagamento.valorPagoCentavos
    })
  }

  eventos.sort((a, b) => a.data - b.data)

  let saldo = valorOriginalCentavos
  let indice = 0

  while (
    indice < eventos.length &&
    eventos[indice].data <= inicio
  ) {
    saldo -= eventos[indice].valorCentavos

    if (saldo < 0) {
      return recusar('PAGAMENTOS_SUPERIORES_AO_SALDO')
    }

    indice++
  }

  const saldoNoVencimento = saldo
  const intervalos = []
  let jurosExatos = 0
  let cursor = inicio + MS_DIA

  while (indice < eventos.length) {
    const evento = eventos[indice]

    if (evento.data > cursor && saldo > 0) {
      const dias = (evento.data - cursor) / MS_DIA

      const juros =
        saldo * (jurosMoraMensal / 100) * (dias / 30)

      jurosExatos += juros

      intervalos.push({
        inicio: new Date(cursor).toISOString().slice(0, 10),
        fim: new Date(evento.data).toISOString().slice(0, 10),
        dias,
        saldoBaseCentavos: saldo,
        jurosExatosCentavos: juros
      })
    }

    saldo -= evento.valorCentavos

    if (saldo < 0) {
      return recusar('PAGAMENTOS_SUPERIORES_AO_SALDO')
    }

    cursor = evento.data
    indice++
  }

  if (fim >= cursor && saldo > 0) {
    const dias = ((fim - cursor) / MS_DIA) + 1

    const juros =
      saldo * (jurosMoraMensal / 100) * (dias / 30)

    jurosExatos += juros

    intervalos.push({
      inicio: new Date(cursor).toISOString().slice(0, 10),
      fim: new Date(fim).toISOString().slice(0, 10),
      dias,
      saldoBaseCentavos: saldo,
      jurosExatosCentavos: juros
    })
  }

  const diasAtraso = Math.max(
    0,
    (fim - inicio) / MS_DIA
  )

  const jurosMoraCentavos =
    arredondarCentavos(jurosExatos)

  const multaCentavos =
    diasAtraso > 0 && saldoNoVencimento > 0
      ? arredondarCentavos(
          saldoNoVencimento * multaAtraso / 100
        )
      : 0

  const totalEncargosCentavos =
    jurosMoraCentavos + multaCentavos

  if (
    !Number.isSafeInteger(jurosMoraCentavos) ||
    !Number.isSafeInteger(multaCentavos) ||
    !Number.isSafeInteger(totalEncargosCentavos)
  ) {
    return recusar('RESULTADO_FORA_DO_LIMITE_SEGURO')
  }

  return {
    valido: true,
    motivo: null,
    diasAtraso,
    jurosMoraCentavos,
    multaCentavos,
    totalEncargosCentavos,
    intervalos,
    memoriaCalculo: {
      vencimento,
      dataReferencia,
      valorOriginalCentavos,
      saldoNoVencimentoCentavos: saldoNoVencimento,
      saldoFinalCentavos: saldo,
      jurosMoraMensal,
      multaAtraso,
      baseDiasMensal: 30,
      criterioArredondamento: 'ARREDONDAMENTO_FINAL',
      intervalos
    }
  }
}
