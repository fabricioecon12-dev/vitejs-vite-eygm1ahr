import { describe, it, expect } from 'vitest'
import {
  obterIdentidadeBanco,
  obterIdentidadePorInstituicao,
  formatarBanco
} from '../services/identidadeBancosService.js'

describe('Nexus Finanças — identidade bancária', () => {
  it('identifica o Nubank pelo código 260', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '260',
      nome: 'NU PAGAMENTOS - IP'
    })

    expect(resultado.nome).toBe('Nubank')
    expect(resultado.codigo).toBe('260')
    expect(resultado.razaoSocial).toBe('NU PAGAMENTOS - IP')
  })

  it('preserva a razão social de instituições conhecidas', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '318',
      nome: 'BANCO BMG S.A.'
    })

    expect(resultado.nome).toBe('Banco BMG')
    expect(resultado.razaoSocial).toBe('BANCO BMG S.A.')
  })

  it('mantém o nome original quando não existe nome comercial', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '999',
      nome: 'INSTITUIÇÃO EXEMPLO'
    })

    expect(resultado.nome).toBe('INSTITUIÇÃO EXEMPLO')
  })

  it('formata código e nome comercial', () => {
    expect(formatarBanco({
      codigo: '260',
      nome: 'NU PAGAMENTOS - IP'
    })).toBe('260 - Nubank')
  })

  it('funciona com instituição sem código', () => {
    expect(formatarBanco({
      codigo: null,
      nome: 'Instituição manual'
    })).toBe('Instituição manual')
  })

  it('associa o logotipo local ao Nubank', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '260',
      nome: 'NU PAGAMENTOS - IP'
    })

    expect(resultado.logotipo).toBe('/bancos/260.svg')
  })

  it('mantém logotipo nulo para instituições sem imagem', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '999',
      nome: 'INSTITUIÇÃO EXEMPLO'
    })

    expect(resultado.logotipo).toBeNull()
  })
})

describe('Nexus Finanças — identificação por instituição', () => {
  it('reconhece a razão social do Nubank', () => {
    const resultado = obterIdentidadePorInstituicao('NU PAGAMENTOS - IP')

    expect(resultado.nome).toBe('Nubank')
    expect(resultado.codigo).toBe('260')
    expect(resultado.logotipo).toBe('/bancos/260.svg')
    expect(resultado.razaoSocial).toBe('NU PAGAMENTOS - IP')
  })

  it('reconhece o nome comercial do Nubank', () => {
    const resultado = obterIdentidadePorInstituicao('Nubank')

    expect(resultado.codigo).toBe('260')
    expect(resultado.logotipo).toBe('/bancos/260.svg')
  })

  it('normaliza espaços, letras e acentos', () => {
    const resultado = obterIdentidadePorInstituicao('  caixa econômica federal  ')

    expect(resultado.codigo).toBe('104')
    expect(resultado.logotipo).toBe('/bancos/104.png')
  })

  it('não associa logomarca a uma instituição desconhecida', () => {
    const resultado = obterIdentidadePorInstituicao('Banco Exemplo')

    expect(resultado.codigo).toBeNull()
    expect(resultado.logotipo).toBeNull()
    expect(resultado.razaoSocial).toBe('Banco Exemplo')
  })

  it('aceita instituição vazia sem apresentar logomarca', () => {
    const resultado = obterIdentidadePorInstituicao('')

    expect(resultado.codigo).toBeNull()
    expect(resultado.logotipo).toBeNull()
  })

  it('não identifica nomes apenas parcialmente semelhantes', () => {
    const resultado = obterIdentidadePorInstituicao('Nubank Exemplo')

    expect(resultado.codigo).toBeNull()
    expect(resultado.logotipo).toBeNull()
  })
})

describe('Nexus Finanças — novos logotipos bancários', () => {
  it('associa o logotipo ao Santander Brasil', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '033',
      nome: 'BCO SANTANDER (BRASIL) S.A.'
    })

    expect(resultado.nome).toBe('Santander')
    expect(resultado.codigo).toBe('033')
    expect(resultado.logotipo).toBe('/bancos/santander.svg')
  })

  it('associa o logotipo ao Banco Digio', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '335',
      nome: 'BANCO DIGIO'
    })

    expect(resultado.nome).toBe('Banco Digio')
    expect(resultado.logotipo).toBe('/bancos/Digio.svg')
  })

  it('associa o logotipo à Neon Pagamentos', () => {
    const resultado = obterIdentidadeBanco({
      codigo: '536',
      nome: 'NEON PAGAMENTOS S.A. IP'
    })

    expect(resultado.nome).toBe('Neon Pagamentos')
    expect(resultado.logotipo).toBe('/bancos/Neon.svg')
  })

  it('reconhece os nomes retornados pela BrasilAPI', () => {
    const instituicoes = [
      ['BCO SANTANDER (BRASIL) S.A.', '033', '/bancos/santander.svg'],
      ['BANCO DIGIO', '335', '/bancos/Digio.svg'],
      ['NEON PAGAMENTOS S.A. IP', '536', '/bancos/Neon.svg']
    ]

    for (const [nome, codigo, logotipo] of instituicoes) {
      const resultado = obterIdentidadePorInstituicao(nome)

      expect(resultado.codigo).toBe(codigo)
      expect(resultado.logotipo).toBe(logotipo)
      expect(resultado.razaoSocial).toBe(nome)
    }
  })

  it('não confunde Neon Pagamentos com outras instituições Neon', () => {
    const instituicoes = [
      { codigo: '426', nome: 'NEON FINANCEIRA - SCFI S.A.' },
      { codigo: '113', nome: 'NEON CTVM S.A.' }
    ]

    for (const instituicao of instituicoes) {
      const porCodigo = obterIdentidadeBanco(instituicao)
      const porNome = obterIdentidadePorInstituicao(instituicao.nome)

      expect(porCodigo.logotipo).toBeNull()
      expect(porNome.codigo).toBeNull()
      expect(porNome.logotipo).toBeNull()
    }
  })
})
