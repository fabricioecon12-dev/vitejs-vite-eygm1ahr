import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach
} from 'vitest'

import {
  normalizarBancos,
  consultarBancos,
  limparCacheBancos
} from '../services/bancosService.js'

const respostaBancos = [
  { name: 'Banco Z', code: 99, ispb: '00000099' },
  { name: 'Banco A', code: 1, ispb: '00000001' },
  { name: 'Banco A', code: 1, ispb: '00000001' },
  { name: '', code: 2, ispb: '00000002' },
  null
]

beforeEach(() => {
  limparCacheBancos()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  limparCacheBancos()
})

describe('Nexus Finanças — serviço de bancos', () => {
  it('normaliza, ordena e elimina instituições duplicadas', () => {
    const resultado = normalizarBancos(respostaBancos)

    expect(resultado).toHaveLength(2)
    expect(resultado.map(banco => banco.nome)).toEqual([
      'Banco A',
      'Banco Z'
    ])
    expect(resultado[0].codigo).toBe('001')
  })

  it('rejeita respostas que não sejam listas', () => {
    expect(() => normalizarBancos({})).toThrow()
    expect(() => normalizarBancos(null)).toThrow()
  })

  it('consulta a API e retorna instituições normalizadas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => respostaBancos
    })

    vi.stubGlobal('fetch', fetchMock)

    const bancos = await consultarBancos()

    expect(bancos).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/banks/v1'
    )
  })

  it('reutiliza o cache sem consultar novamente', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => respostaBancos
    })

    vi.stubGlobal('fetch', fetchMock)

    await consultarBancos()
    await consultarBancos()

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('compartilha uma consulta entre chamadas simultâneas', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => respostaBancos
    })

    vi.stubGlobal('fetch', fetchMock)

    const [primeiro, segundo] = await Promise.all([
      consultarBancos(),
      consultarBancos()
    ])

    expect(primeiro).toEqual(segundo)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('trata falhas HTTP sem armazenar respostas inválidas', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => respostaBancos
      })

    vi.stubGlobal('fetch', fetchMock)

    await expect(consultarBancos()).rejects.toThrow(
      'A lista de instituições está indisponível.'
    )

    const bancos = await consultarBancos()

    expect(bancos).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('trata falhas de conexão', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Sem conexão'))
    )

    await expect(consultarBancos()).rejects.toThrow(
      'A lista de instituições está indisponível.'
    )
  })

  it('rejeita uma lista vazia retornada pela API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => []
    }))

    await expect(consultarBancos()).rejects.toThrow(
      'A lista de instituições está indisponível.'
    )
  })
})
