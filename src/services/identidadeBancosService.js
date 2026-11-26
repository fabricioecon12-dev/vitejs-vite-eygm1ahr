const IDENTIDADES_BANCARIAS = {
  '033': { nome: 'Santander', logotipo: '/bancos/santander.svg' },
  '335': { nome: 'Banco Digio', logotipo: '/bancos/Digio.svg' },
  '536': { nome: 'Neon Pagamentos', logotipo: '/bancos/Neon.svg' },
  '001': { nome: 'Banco do Brasil', logotipo: '/bancos/001.svg' },
  '104': { nome: 'Caixa Econômica Federal', logotipo: '/bancos/104.png' },
  '237': { nome: 'Bradesco', logotipo: '/bancos/237.svg' },
  '341': { nome: 'Itaú', logotipo: '/bancos/341.svg' },
  '623': { nome: 'Banco PAN', logotipo: '/bancos/623.svg' },
  '047': { nome: 'Banco Banese' },
  '085': { nome: 'Ailos' },
  '121': { nome: 'Agibank' },
  '260': { nome: 'Nubank', logotipo: '/bancos/260.svg' },
  '323': { nome: 'Mercado Pago', logotipo: '/bancos/323.svg' },
  '318': { nome: 'Banco BMG' },
  '461': { nome: 'Asaas IP' }
}

export function obterIdentidadeBanco(banco) {
  const codigo = banco?.codigo ?? null
  const identidade = codigo
    ? IDENTIDADES_BANCARIAS[codigo]
    : null

  return {
    nome: identidade?.nome || banco?.nome || '',
    codigo,
    razaoSocial: banco?.nome || '',
    logotipo: identidade?.logotipo || null
  }
}

export function formatarBanco(banco) {
  const identidade = obterIdentidadeBanco(banco)

  return [
    identidade.codigo,
    identidade.nome
  ].filter(Boolean).join(' - ')
}

const NOMES_INSTITUICOES = {
  'BCO SANTANDER (BRASIL) S.A.': '033',
  'BANCO SANTANDER': '033',
  'SANTANDER': '033',
  'BANCO DIGIO': '335',
  'DIGIO': '335',
  'NEON PAGAMENTOS S.A. IP': '536',
  'NEON PAGAMENTOS': '536',
  'NEON': '536',
  'NU PAGAMENTOS - IP': '260',
  'NUBANK': '260',
  'BANCO DO BRASIL S.A.': '001',
  'BANCO DO BRASIL': '001',
  'CAIXA ECONOMICA FEDERAL': '104',
  'BANCO BRADESCO S.A.': '237',
  'BRADESCO': '237',
  'ITAU UNIBANCO S.A.': '341',
  'ITAU': '341',
  'BANCO PAN S.A.': '623',
  'BANCO PAN': '623',
  'MERCADO PAGO': '323'
}

function normalizarNomeInstituicao(nome) {
  return String(nome ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function obterIdentidadePorInstituicao(instituicao) {
  const nome = String(instituicao ?? '').trim()
  const codigo = NOMES_INSTITUICOES[normalizarNomeInstituicao(nome)]

  if (!codigo) {
    return {
      nome,
      codigo: null,
      razaoSocial: nome,
      logotipo: null
    }
  }

  return obterIdentidadeBanco({
    codigo,
    nome
  })
}
