import { describe, it, expect } from 'vitest'
import { migrarDadosParaContas } from '../services/migracaoContasService.js'

describe('Integridade da migração financeira', () => {
  it('não modifica os dados originais', () => {
    const originais = {
      transacoes: [{
        id: 1,
        descricao: 'Salário',
        valor: 4500,
        tipo: 'receita',
        categoria: 'Salário',
        data: '2026-11-25'
      }],
      limites: { '2026-11': 4000 },
      saldoInicial: 5380,
      proximoId: 2
    }

    const copia = structuredClone(originais)

    const migrados = migrarDadosParaContas(
      originais,
      '2026-11-14'
    )

    expect(originais).toEqual(copia)
    expect(originais.transacoes[0].contaId).toBeUndefined()
    expect(migrados.transacoes[0].contaId).toBe(1)
    expect(migrados.contas[0].saldoInicial).toBe(5380)
  })
})
