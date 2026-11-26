const TIPOS_CONTA = [
  'corrente',
  'poupanca',
  'pagamento'
]

export function dataContaValida(data) {
  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    return false
  }

  const [ano, mes, dia] = data.split('-').map(Number)

  if (ano < 2000 || ano > 2100) {
    return false
  }

  const dataVerificada = new Date(0)
  dataVerificada.setFullYear(ano, mes - 1, dia)

  return (
    dataVerificada.getFullYear() === ano &&
    dataVerificada.getMonth() === mes - 1 &&
    dataVerificada.getDate() === dia
  )
}

export function contaValida(conta) {
  if (
    !conta ||
    typeof conta !== 'object' ||
    Array.isArray(conta)
  ) {
    return false
  }

  return (
    Number.isSafeInteger(conta.id) &&
    conta.id > 0 &&
    typeof conta.nome === 'string' &&
    conta.nome.trim().length > 0 &&
    conta.nome.length <= 100 &&
    typeof conta.instituicao === 'string' &&
    conta.instituicao.trim().length > 0 &&
    conta.instituicao.length <= 100 &&
    TIPOS_CONTA.includes(conta.tipo) &&
    typeof conta.agencia === 'string' &&
    conta.agencia.length <= 20 &&
    typeof conta.numero === 'string' &&
    conta.numero.length <= 30 &&
    typeof conta.saldoInicial === 'number' &&
    Number.isFinite(conta.saldoInicial) &&
    typeof conta.ativa === 'boolean' &&
    typeof conta.principal === 'boolean' &&
    dataContaValida(conta.dataCriacao)
  )
}

export function contasValidas(contas) {
  if (!Array.isArray(contas)) {
    return false
  }

  const ids = contas.map(conta => conta?.id)

  return (
    contas.every(contaValida) &&
    new Set(ids).size === ids.length &&
    contas.filter(conta => conta.principal).length === 1
  )
}

export function vinculosTransacoesValidos(
  transacoes,
  contas
) {
  if (
    !Array.isArray(transacoes) ||
    !contasValidas(contas)
  ) {
    return false
  }

  const idsContas = new Set(
    contas.map(conta => conta.id)
  )

  return transacoes.every(transacao =>
    transacao !== null &&
    typeof transacao === 'object' &&
    !Array.isArray(transacao) &&
    Number.isSafeInteger(transacao.contaId) &&
    transacao.contaId > 0 &&
    idsContas.has(transacao.contaId)
  )
}
