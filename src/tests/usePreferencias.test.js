import { describe, it, expect, vi, afterEach } from 'vitest'

const CHAVE = 'nexus-financas-preferencias-v1'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

async function preparar(getItem = vi.fn(() => null), setItem = vi.fn()) {
  vi.stubGlobal('localStorage', { getItem, setItem })
  vi.resetModules()

  const { usePreferencias } = await import(
    '../composables/usePreferencias.js'
  )

  return {
    ...usePreferencias(),
    getItem,
    setItem
  }
}

describe('Nexus Finanças — Preferências', () => {
  it('inicia com as preferências padrão', async () => {
    const preferencias = await preparar()

    expect(preferencias.mostrarCentavos.value).toBe(true)
    expect(preferencias.dicasFinanceiras.value).toBe(true)
    expect(preferencias.moeda).toBe('BRL')
    expect(preferencias.getItem).toHaveBeenCalledWith(CHAVE)
    expect(preferencias.setItem).not.toHaveBeenCalled()
  })

  it('recupera as preferências salvas', async () => {
    const dados = JSON.stringify({
      mostrarCentavos: false,
      dicasFinanceiras: false,
      moeda: 'BRL'
    })

    const preferencias = await preparar(vi.fn(() => dados))

    expect(preferencias.mostrarCentavos.value).toBe(false)
    expect(preferencias.dicasFinanceiras.value).toBe(false)
    expect(preferencias.moeda).toBe('BRL')
  })

  it('desativa e persiste a confirmacao de exclusao', async () => {
    const preferencias = await preparar()

    expect(preferencias.confirmarExclusao.value).toBe(true)
    expect(preferencias.definirConfirmarExclusao(false)).toBe(true)
    expect(preferencias.confirmarExclusao.value).toBe(false)

    const dados = JSON.parse(
      preferencias.setItem.mock.lastCall[1]
    )

    expect(dados.confirmarExclusao).toBe(false)
    expect(dados.mostrarCentavos).toBe(true)
    expect(dados.dicasFinanceiras).toBe(true)
  })

  it('recupera a confirmacao de exclusao desativada', async () => {
    const dados = JSON.stringify({
      mostrarCentavos: true,
      dicasFinanceiras: true,
      confirmarExclusao: false,
      moeda: 'BRL'
    })

    const preferencias = await preparar(vi.fn(() => dados))

    expect(preferencias.confirmarExclusao.value).toBe(false)
  })
  it('mantém BRL como moeda fixa', async () => {
    const dados = JSON.stringify({
      mostrarCentavos: true,
      dicasFinanceiras: true,
      moeda: 'USD'
    })

    const preferencias = await preparar(vi.fn(() => dados))

    expect(preferencias.moeda).toBe('BRL')
  })

  it('ativa e persiste a exibição de centavos', async () => {
    const preferencias = await preparar()

    expect(preferencias.definirMostrarCentavos(false)).toBe(true)
    expect(preferencias.mostrarCentavos.value).toBe(false)

    expect(preferencias.setItem).toHaveBeenLastCalledWith(
      CHAVE,
      JSON.stringify({
        mostrarCentavos: false,
        dicasFinanceiras: true,
        confirmarExclusao: true,
        moeda: 'BRL'
      })
    )
  })

  it('desativa e persiste as dicas financeiras', async () => {
    const preferencias = await preparar()

    expect(preferencias.definirDicasFinanceiras(false)).toBe(true)
    expect(preferencias.dicasFinanceiras.value).toBe(false)
  })

  it('preserva as demais preferências ao alterar uma configuração', async () => {
    const preferencias = await preparar()

    preferencias.definirMostrarCentavos(false)

    expect(preferencias.dicasFinanceiras.value).toBe(true)
  })

  it('recupera os valores padrão quando o JSON é inválido', async () => {
    const preferencias = await preparar(vi.fn(() => '{invalido'))

    expect(preferencias.mostrarCentavos.value).toBe(true)
    expect(preferencias.dicasFinanceiras.value).toBe(true)
  })

  it('preserva os valores padrão quando a leitura falha', async () => {
    const getItem = vi.fn(() => {
      throw new Error('Leitura indisponível')
    })

    const preferencias = await preparar(getItem)

    expect(preferencias.mostrarCentavos.value).toBe(true)
    expect(preferencias.dicasFinanceiras.value).toBe(true)
  })

  it('reverte a alteração quando a gravação falha', async () => {
    const setItem = vi.fn(() => {
      throw new Error('Gravação indisponível')
    })

    const preferencias = await preparar(vi.fn(() => null), setItem)

    expect(preferencias.definirMostrarCentavos(false)).toBe(false)
    expect(preferencias.mostrarCentavos.value).toBe(true)
  })

  it('reverte a alteração das dicas quando a gravação falha', async () => {
    const setItem = vi.fn(() => {
      throw new Error('Gravação indisponível')
    })

    const preferencias = await preparar(vi.fn(() => null), setItem)

    expect(preferencias.definirDicasFinanceiras(false)).toBe(false)
    expect(preferencias.dicasFinanceiras.value).toBe(true)
  })
})