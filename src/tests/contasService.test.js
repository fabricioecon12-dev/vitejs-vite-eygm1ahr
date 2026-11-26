import { describe, it, expect } from 'vitest'
import {
  contaValida,
  contasValidas,
  dataContaValida,
  vinculosTransacoesValidos
} from '../services/contasService.js'

const contaBase = {
  id: 1,
  nome: 'Conta principal',
  instituicao: 'Banco Exemplo',
  tipo: 'corrente',
  agencia: '1234',
  numero: '56789',
  saldoInicial: 5380,
  ativa: true,
  principal: true,
  dataCriacao: '2026-11-14'
}

describe('Validação de contas bancárias', () => {
  it('aceita uma conta válida', () => {
    expect(contaValida(contaBase)).toBe(true)
  })

  it('rejeita identificador inválido', () => {
    expect(contaValida({
      ...contaBase,
      id: 0
    })).toBe(false)
  })

  it('rejeita nome vazio', () => {
    expect(contaValida({
      ...contaBase,
      nome: ' '
    })).toBe(false)
  })

  it('rejeita tipo de conta inválido', () => {
    expect(contaValida({
      ...contaBase,
      tipo: 'investimento'
    })).toBe(false)
  })

  it('rejeita saldo inicial inválido', () => {
    expect(contaValida({
      ...contaBase,
      saldoInicial: Infinity
    })).toBe(false)
  })

  it('aceita contas com identificadores distintos', () => {
    expect(contasValidas([
      contaBase,
      {
        ...contaBase,
        id: 2,
        principal: false
      }
    ])).toBe(true)
  })

  it('rejeita identificadores duplicados', () => {
    expect(contasValidas([
      contaBase,
      {
        ...contaBase,
        nome: 'Segunda conta',
        principal: false
      }
    ])).toBe(false)
  })

  it('rejeita múltiplas contas principais', () => {
    expect(contasValidas([
      contaBase,
      {
        ...contaBase,
        id: 2
      }
    ])).toBe(false)
  })

  it('rejeita ausência de conta principal', () => {
    expect(contasValidas([
      {
        ...contaBase,
        principal: false
      }
    ])).toBe(false)
  })
})

describe('Integridade de datas e vínculos financeiros', () => {
  const conta = {
    id: 1,
    nome: 'Conta principal',
    instituicao: 'Banco Exemplo',
    tipo: 'corrente',
    agencia: '1234',
    numero: '56789',
    saldoInicial: 5380,
    ativa: true,
    principal: true,
    dataCriacao: '2026-11-14'
  }

  it('aceita uma data válida', () => {
    expect(dataContaValida('2026-11-14')).toBe(true)
  })

  it('rejeita data inexistente', () => {
    expect(dataContaValida('2026-02-30')).toBe(false)
  })

  it('aceita data bissexta válida', () => {
    expect(dataContaValida('2024-02-29')).toBe(true)
  })

  it('rejeita data bissexta inválida', () => {
    expect(dataContaValida('2025-02-29')).toBe(false)
  })

  it('aceita transação vinculada a conta existente', () => {
    expect(vinculosTransacoesValidos(
      [{ id: 1, contaId: 1 }],
      [conta]
    )).toBe(true)
  })

  it('rejeita transação vinculada a conta inexistente', () => {
    expect(vinculosTransacoesValidos(
      [{ id: 1, contaId: 99 }],
      [conta]
    )).toBe(false)
  })

  it('rejeita identificador de conta inválido', () => {
    expect(vinculosTransacoesValidos(
      [{ id: 1, contaId: 0 }],
      [conta]
    )).toBe(false)
  })

  it('rejeita transação sem identificação de conta', () => {
    expect(vinculosTransacoesValidos(
      [{ id: 1 }],
      [conta]
    )).toBe(false)
  })
})
