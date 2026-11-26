function dataValidaISO(valor) {
  if (typeof valor !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const [ano, mes, dia] = valor.split('-').map(Number)

  if (ano < 1 || ano > 9999 ||
      mes < 1 || mes > 12 ||
      dia < 1) {
    return false
  }

  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()

  return dia <= ultimoDia
}

function dataCiclo(competencia, diaConfigurado) {
  if (typeof competencia !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia) ||
      !Number.isInteger(diaConfigurado) ||
      diaConfigurado < 1 ||
      diaConfigurado > 31) {
    return null
  }

  const [ano, mes] = competencia.split('-').map(Number)

  if (ano < 1 || ano > 9999) {
    return null
  }

  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const dia = Math.min(diaConfigurado, ultimoDia)

  return [
    String(ano).padStart(4, '0'),
    String(mes).padStart(2, '0'),
    String(dia).padStart(2, '0')
  ].join('-')
}

export function validarCicloFaturaCartao(fatura) {
  const inconsistente = motivo => ({
    status: 'inconsistente',
    valido: false,
    motivo
  })

  if (!fatura || typeof fatura !== 'object' ||
      Array.isArray(fatura)) {
    return inconsistente('Registro de fatura invalido.')
  }

  const { competencia, fechamento, vencimento } = fatura

  if (typeof competencia !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(competencia) ||
      !dataValidaISO(fechamento) ||
      !dataValidaISO(vencimento) ||
      fechamento.slice(0, 7) !== competencia ||
      vencimento.slice(0, 7) !== competencia) {
    return inconsistente(
      'Competencia, fechamento ou vencimento invalidos.'
    )
  }

  if (!Object.prototype.hasOwnProperty.call(
    fatura,
    'configuracaoCiclo'
  )) {
    return {
      status: 'historico_indisponivel',
      valido: true,
      motivo: 'Configuracao historica do ciclo nao registrada.'
    }
  }

  const configuracao = fatura.configuracaoCiclo

  if (!configuracao || typeof configuracao !== 'object' ||
      Array.isArray(configuracao)) {
    return inconsistente('Configuracao historica invalida.')
  }

  const fechamentoEsperado = dataCiclo(
    competencia,
    configuracao.diaFechamento
  )

  const vencimentoEsperado = dataCiclo(
    competencia,
    configuracao.diaVencimento
  )

  if (!fechamentoEsperado || !vencimentoEsperado ||
      fechamento !== fechamentoEsperado ||
      vencimento !== vencimentoEsperado) {
    return inconsistente(
      'Datas divergentes da configuracao historica registrada.'
    )
  }

  return {
    status: 'valido',
    valido: true,
    motivo: null
  }
}