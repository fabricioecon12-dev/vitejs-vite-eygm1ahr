import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-privacidade-v1'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function preparar(getItem = vi.fn(() => null), setItem = vi.fn()) {
  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { usePrivacidade } = await import('../composables/usePrivacidade.js')

  return {
    ...usePrivacidade(),
    getItem,
    setItem
  }
}

describe('Nexus Finanças — Privacidade', () => {
  it('inicia com valores visíveis quando não existe preferência salva', async () => {
    const privacidade = await preparar()

    expect(privacidade.ocultarValores.value).toBe(false)
    expect(privacidade.getItem).toHaveBeenCalledWith(CHAVE)
    expect(privacidade.setItem).not.toHaveBeenCalled()
  })

  it('recupera a preferência de ocultação salva', async () => {
    const privacidade = await preparar(vi.fn(() => 'true'))

    expect(privacidade.ocultarValores.value).toBe(true)
    expect(privacidade.setItem).not.toHaveBeenCalled()
  })

  it('ativa a ocultação e salva a preferência', async () => {
    const privacidade = await preparar()

    expect(privacidade.definirOcultacao(true)).toBe(true)
    expect(privacidade.ocultarValores.value).toBe(true)
    expect(privacidade.setItem).toHaveBeenCalledWith(CHAVE, 'true')
  })

  it('desativa a ocultação e salva a preferência', async () => {
    const privacidade = await preparar(vi.fn(() => 'true'))

    expect(privacidade.definirOcultacao(false)).toBe(true)
    expect(privacidade.ocultarValores.value).toBe(false)
    expect(privacidade.setItem).toHaveBeenCalledWith(CHAVE, 'false')
  })

  it('oculta apenas a apresentação do valor financeiro', async () => {
    const privacidade = await preparar()
    const valorOriginal = 'R$ 4.500,00'

    expect(privacidade.valorVisivel(valorOriginal)).toBe(valorOriginal)

    privacidade.definirOcultacao(true)

    expect(privacidade.valorVisivel(valorOriginal)).toBe('R$ ••••••')
    expect(valorOriginal).toBe('R$ 4.500,00')
  })

  it('mantém valores visíveis quando a leitura do armazenamento falha', async () => {
    const getItem = vi.fn(() => {
      throw new Error('Leitura indisponível')
    })

    const privacidade = await preparar(getItem)

    expect(privacidade.ocultarValores.value).toBe(false)
  })

  it('preserva a preferência anterior quando a gravação falha', async () => {
    const setItem = vi.fn(() => {
      throw new Error('Gravação indisponível')
    })

    const privacidade = await preparar(vi.fn(() => null), setItem)

    expect(privacidade.definirOcultacao(true)).toBe(false)
    expect(privacidade.ocultarValores.value).toBe(false)
    expect(setItem).toHaveBeenCalledWith(CHAVE, 'true')
  })
})
