import {
  contasValidas,
  vinculosTransacoesValidos
} from './contasService.js'

export const VERSAO_DADOS_CONTAS = 2

export function migrarDadosParaContas(dados, dataCriacao) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    throw new Error('Estrutura financeira inválida.')
  }

  if (Array.isArray(dados.contas)) {
    if (
      dados.versaoDados !== VERSAO_DADOS_CONTAS ||
      !contasValidas(dados.contas) ||
      !vinculosTransacoesValidos(dados.transacoes, dados.contas)
    ) {
      throw new Error('Dados bancários inconsistentes.')
    }

    return {
      ...dados,
      versaoDados: VERSAO_DADOS_CONTAS
    }
  }

  if (
    dados.contas !== undefined ||
    !Array.isArray(dados.transacoes) ||
    typeof dados.saldoInicial !== 'number' ||
    !Number.isFinite(dados.saldoInicial) ||
    typeof dataCriacao !== 'string'
  ) {
    throw new Error('Dados antigos incompatíveis com a migração.')
  }

  const contaPrincipal = {
    id: 1,
    nome: 'Conta principal',
    instituicao: 'Não informada',
    tipo: 'corrente',
    agencia: '',
    numero: '',
    saldoInicial: dados.saldoInicial,
    ativa: true,
    principal: true,
    dataCriacao
  }

  const contas = [contaPrincipal]

  const transacoes = dados.transacoes.map(transacao => ({
    ...transacao,
    contaId: contaPrincipal.id
  }))

  if (
    !contasValidas(contas) ||
    !vinculosTransacoesValidos(transacoes, contas)
  ) {
    throw new Error('Falha na validação da migração.')
  }

  return {
    ...dados,
    versaoDados: VERSAO_DADOS_CONTAS,
    contas,
    transacoes
  }
}
