import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { consultarCotacoes } from '../services/cambioService.js'

vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('Serviço de cotações', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('consulta dólar e euro utilizando GET', async () => {
    const dados = {
      USDBRL: { bid: '5.6138', pctChange: '0.55' },
      EURBRL: { bid: '6.2185', pctChange: '0.40' }
    }

    axios.get.mockResolvedValue({ data: dados })

    const resultado = await consultarCotacoes()

    expect(resultado).toEqual(dados)
    expect(axios.get).toHaveBeenCalledWith(
      'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL',
      { timeout: 10000 }
    )
  })

  it('rejeita resposta sem as duas moedas', async () => {
    axios.get.mockResolvedValue({
      data: { USDBRL: { bid: '5.6138' } }
    })

    await expect(consultarCotacoes()).rejects.toThrow(
      'Dados de cotacao indisponiveis.'
    )
  })

  it('propaga erros de requisicao HTTP', async () => {
    axios.get.mockRejectedValue(new Error('Falha de rede'))

    await expect(consultarCotacoes()).rejects.toThrow(
      'Falha de rede'
    )
  })
})