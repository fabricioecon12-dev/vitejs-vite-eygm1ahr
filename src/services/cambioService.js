import axios from 'axios'

const ENDPOINT_CAMBIO =
  'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL'

export async function consultarCotacoes() {
  const resposta = await axios.get(ENDPOINT_CAMBIO, {
    timeout: 10000
  })

  const dados = resposta.data

  if (
    !dados ||
    typeof dados !== 'object' ||
    Array.isArray(dados) ||
    !dados.USDBRL ||
    !dados.EURBRL
  ) {
    throw new Error('Dados de cotacao indisponiveis.')
  }

  return dados
}