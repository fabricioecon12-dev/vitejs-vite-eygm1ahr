const URL_BANCOS = 'https://brasilapi.com.br/api/banks/v1'

let cacheBancos = null
let consultaPendente = null

export function normalizarBancos(dados) {
  if (!Array.isArray(dados)) {
    throw new Error('A lista de instituições financeiras é inválida.')
  }

  const encontrados = new Map()

  for (const banco of dados) {
    if (!banco || typeof banco !== 'object') continue

    const nome = typeof banco.name === 'string'
      ? banco.name.trim()
      : ''

    if (!nome) continue

    const codigo = Number.isInteger(banco.code) && banco.code >= 0
      ? String(banco.code).padStart(3, '0')
      : null

    const ispb = typeof banco.ispb === 'string'
      ? banco.ispb.trim()
      : ''

    const chave = ispb || `${codigo || ''}:${nome.toLocaleLowerCase('pt-BR')}`

    if (!encontrados.has(chave)) {
      encontrados.set(chave, {
        nome,
        codigo,
        ispb
      })
    }
  }

  return [...encontrados.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  )
}

export async function consultarBancos() {
  if (cacheBancos !== null) {
    return cacheBancos
  }

  if (consultaPendente) {
    return consultaPendente
  }

  consultaPendente = (async () => {
    try {
      const resposta = await fetch(URL_BANCOS)

      if (!resposta.ok) {
        throw new Error('Não foi possível consultar as instituições financeiras.')
      }

      const dados = await resposta.json()
      const bancos = normalizarBancos(dados)

      if (!bancos.length) {
        throw new Error('Nenhuma instituição financeira foi encontrada.')
      }

      cacheBancos = bancos
      return bancos
    } catch {
      throw new Error(
        'A lista de instituições está indisponível. Tente novamente ou informe a instituição manualmente.'
      )
    } finally {
      consultaPendente = null
    }
  })()

  return consultaPendente
}

export function limparCacheBancos() {
  cacheBancos = null
  consultaPendente = null
}
