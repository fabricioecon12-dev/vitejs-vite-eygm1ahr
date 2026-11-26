import { describe, it, expect } from 'vitest'
import {
  migrarDadosParaContas,
  VERSAO_DADOS_CONTAS
} from '../services/migracaoContasService.js'

const dadosAntigos = () => ({
  transacoes: [
    {
      id: 1,
      descricao: 'Salário',
      valor: 4500,
      tipo: 'receita',
      categoria: 'Salário',
      data: '2026-11-25'
    },
    {
      id: 2,
      descricao: 'Supermercado',
      valor: 760,
      tipo: 'despesa',
      categoria: 'Alimentação',
      data: '2026-11-23'
    }
  ],
  limites: { '2026-11': 4000 },
  saldoInicial: 5380,
  proximoId: 3,
  categoriasDespesa: ['Alimentação'],
  categoriasReceita: ['Salário']
})

describe('Migração de contas bancárias', () => {
  it('cria uma única Conta principal', () => {
    const dados = migrarDadosParaContas(
      dadosAntigos(),
      '2026-11-14'
    )

    expect(dados.versaoDados).toBe(VERSAO_DADOS_CONTAS)
    expect(dados.contas).toHaveLength(1)
    expect(dados.contas[0].nome).toBe('Conta principal')
    expect(dados.contas[0].principal).toBe(true)
    expect(dados.contas[0].saldoInicial).toBe(5380)
  })

  it('preserva transações, identificadores e vínculos', () => {
    const dados = migrarDadosParaContas(
      dadosAntigos(),
      '2026-11-14'
    )

    expect(dados.transacoes.map(item => item.id))
      .toEqual([1, 2])

    expect(dados.transacoes.every(item => item.contaId === 1))
      .toBe(true)

    expect(dados.proximoId).toBe(3)
    expect(dados.limites['2026-11']).toBe(4000)
    expect(dados.categoriasDespesa).toEqual(['Alimentação'])
    expect(dados.categoriasReceita).toEqual(['Salário'])
  })

  it('não duplica contas ao executar novamente', () => {
    const primeira = migrarDadosParaContas(
      dadosAntigos(),
      '2026-11-14'
    )

    const segunda = migrarDadosParaContas(
      primeira,
      '2026-11-14'
    )

    expect(segunda).toEqual(primeira)
    expect(segunda.contas).toHaveLength(1)
  })

  it('rejeita versões bancárias desconhecidas', () => {
    const dados = migrarDadosParaContas(
      dadosAntigos(),
      '2026-11-14'
    )

    dados.versaoDados = 999

    expect(() =>
      migrarDadosParaContas(dados, '2026-11-14')
    ).toThrow()
  })
  it('rejeita vínculos bancários inconsistentes', () => {
    const dados = migrarDadosParaContas(
      dadosAntigos(),
      '2026-11-14'
    )

    dados.transacoes[0].contaId = 999

    expect(() =>
      migrarDadosParaContas(dados, '2026-11-14')
    ).toThrow()
  })

  it('rejeita dados antigos incompatíveis', () => {
    expect(() =>
      migrarDadosParaContas(
        { transacoes: [], saldoInicial: 'inválido' },
        '2026-11-14'
      )
    ).toThrow()
  })

  it('rejeita data de criação inválida', () => {
    expect(() =>
      migrarDadosParaContas(dadosAntigos(), 'data-inválida')
    ).toThrow()
  })
})
