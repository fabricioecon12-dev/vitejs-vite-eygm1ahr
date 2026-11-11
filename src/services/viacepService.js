import axios from 'axios'

const apiViaCEP = axios.create({
  baseURL: 'https://viacep.com.br/ws/',
  timeout: 10000
})

export async function consultarCEP(cep) {
  const cepLimpo = String(cep).replace(/\D/g, '')

  if (cepLimpo.length !== 8) {
    throw new Error('Informe um CEP válido com 8 dígitos.')
  }

  try {
    const resposta = await apiViaCEP.get(`${cepLimpo}/json/`)

    if (resposta.data.erro === 'true' || resposta.data.erro === true) {
      throw new Error('CEP não encontrado.')
    }

    return resposta.data
  } catch (erro) {
    if (erro.message === 'CEP não encontrado.') {
      throw erro
    }

    throw new Error('Não foi possível consultar o CEP. Tente novamente.')
  }
}
