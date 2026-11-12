
import { describe, it, expect, vi } from 'vitest'

describe('Nexus Finanças — Meu perfil', () => {
  it('recupera dados válidos do perfil sem alterar o armazenamento', async () => {
    const dados = {
      nome: 'Usuário Teste',
      email: 'teste@nexus.com',
      telefone: '(91) 99999-9999'
    }

    const getItem = vi.fn(() => JSON.stringify(dados))
    const setItem = vi.fn()

    vi.stubGlobal('localStorage', {
      getItem,
      setItem
    })

    try {
      vi.resetModules()

      const { usePerfil } = await import('../composables/usePerfil.js')
      const resultado = usePerfil()

      expect(getItem).toHaveBeenCalledWith('nexus-financas-perfil-v1')

      expect(resultado.perfil.value).toEqual(dados)
      expect(resultado.erroPerfil.value).toBe('')
      expect(resultado.sucessoPerfil.value).toBe(false)

      expect(setItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

it('salva os dados válidos do perfil no armazenamento', async () => {
  const getItem = vi.fn(() => null)
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { usePerfil } = await import('../composables/usePerfil.js')
    const resultado = usePerfil()

    resultado.perfil.value = {
      nome: '  Usuário Teste  ',
      email: '  teste@nexus.com  ',
      telefone: '(91) 99999-9999'
    }

    const salvou = resultado.salvarPerfil()

    expect(salvou).toBe(true)
    expect(resultado.sucessoPerfil.value).toBe(true)
    expect(resultado.erroPerfil.value).toBe('')
    expect(resultado.campoInvalido.value).toBe('')

    expect(setItem).toHaveBeenCalledTimes(1)
    expect(setItem).toHaveBeenCalledWith(
      'nexus-financas-perfil-v1',
      JSON.stringify({
        nome: 'Usuário Teste',
        email: 'teste@nexus.com',
        telefone: '(91) 99999-9999'
      })
    )
  } finally {
    vi.unstubAllGlobals()
  }
})

it('impede salvar perfil sem nome e identifica o campo inválido', async () => {
  const getItem = vi.fn(() => null)
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { usePerfil } = await import('../composables/usePerfil.js')
    const resultado = usePerfil()

    resultado.perfil.value = {
      nome: '   ',
      email: 'teste@nexus.com',
      telefone: '(91) 99999-9999'
    }

    const salvou = resultado.salvarPerfil()

    expect(salvou).toBe(false)
    expect(resultado.campoInvalido.value).toBe('nome')
    expect(resultado.erroPerfil.value).toBe('Informe seu nome completo.')
    expect(resultado.sucessoPerfil.value).toBe(false)

    expect(setItem).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('impede salvar perfil com e-mail inválido', async () => {
  const getItem = vi.fn(() => null)
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { usePerfil } = await import('../composables/usePerfil.js')
    const resultado = usePerfil()

    resultado.perfil.value = {
      nome: 'Usuário Teste',
      email: 'email-invalido',
      telefone: '(91) 99999-9999'
    }

    const salvou = resultado.salvarPerfil()

    expect(salvou).toBe(false)
    expect(resultado.campoInvalido.value).toBe('email')
    expect(resultado.erroPerfil.value).toBe('Informe um e-mail válido.')
    expect(resultado.sucessoPerfil.value).toBe(false)

    expect(setItem).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('impede salvar perfil com telefone inválido', async () => {
  const getItem = vi.fn(() => null)
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { usePerfil } = await import('../composables/usePerfil.js')
    const resultado = usePerfil()

    resultado.perfil.value = {
      nome: 'Usuário Teste',
      email: 'teste@nexus.com',
      telefone: '(91) 9999'
    }

    const salvou = resultado.salvarPerfil()

    expect(salvou).toBe(false)
    expect(resultado.campoInvalido.value).toBe('telefone')
    expect(resultado.erroPerfil.value).toBe(
      'Informe um telefone brasileiro com DDD.'
    )
    expect(resultado.sucessoPerfil.value).toBe(false)

    expect(setItem).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('preserva dados corrompidos do perfil sem sobrescrever o armazenamento', async () => {
  const getItem = vi.fn(() => '{json-invalido')
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { usePerfil } = await import('../composables/usePerfil.js')
    const resultado = usePerfil()

    expect(getItem).toHaveBeenCalledWith('nexus-financas-perfil-v1')

    expect(resultado.perfil.value).toEqual({
      nome: '',
      email: '',
      telefone: ''
    })

    expect(resultado.erroPerfil.value).toBe(
      'Não foi possível recuperar os dados do perfil. ' +
      'Os dados armazenados foram preservados.'
    )

    expect(resultado.sucessoPerfil.value).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('informa erro quando o armazenamento impede salvar o perfil', async () => {
  const getItem = vi.fn(() => null)
  const setItem = vi.fn(() => {
    throw new Error('Falha de armazenamento')
  })

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { usePerfil } = await import('../composables/usePerfil.js')
    const resultado = usePerfil()

    resultado.perfil.value = {
      nome: 'Usuário Teste',
      email: 'teste@nexus.com',
      telefone: '(91) 99999-9999'
    }

    const salvou = resultado.salvarPerfil()

    expect(salvou).toBe(false)
    expect(resultado.sucessoPerfil.value).toBe(false)
    expect(resultado.erroPerfil.value).toBe(
      'Não foi possível salvar o perfil. ' +
      'Verifique o armazenamento do navegador.'
    )

    expect(setItem).toHaveBeenCalledTimes(1)
  } finally {
    vi.unstubAllGlobals()
  }
})

it('informa erro quando a leitura do armazenamento falha', async () => {
  const getItem = vi.fn(() => {
    throw new Error('Falha de leitura')
  })
  const setItem = vi.fn()

  vi.stubGlobal('localStorage', {
    getItem,
    setItem
  })

  try {
    vi.resetModules()

    const { usePerfil } = await import('../composables/usePerfil.js')
    const resultado = usePerfil()

    expect(getItem).toHaveBeenCalledWith('nexus-financas-perfil-v1')

    expect(resultado.perfil.value).toEqual({
      nome: '',
      email: '',
      telefone: ''
    })

    expect(resultado.erroPerfil.value).toBe(
      'Não foi possível recuperar os dados do perfil. ' +
      'Os dados armazenados foram preservados.'
    )

    expect(resultado.sucessoPerfil.value).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})
