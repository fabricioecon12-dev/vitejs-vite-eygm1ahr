import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { consultarCotacoes } from '../services/cambioService.js'
import { useCotacoes } from '../composables/useCotacoes.js'

vi.mock('../services/cambioService.js', () => ({
  consultarCotacoes: vi.fn()
}))

describe('Composable de cotações', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('inicia sem resultados e sem erro', () => {
    const estado = useCotacoes()

    expect(estado.cotacoes.value).toEqual([])
    expect(estado.carregando.value).toBe(false)
    expect(estado.erro.value).toBe('')
    expect(estado.semResultados.value).toBe(true)
  })

  it('recebe e transforma as cotações da API', async () => {
    consultarCotacoes.mockResolvedValue({
      USDBRL: {
        bid: '5.6138',
        pctChange: '0.55',
        create_date: '2026-11-12 11:53:18'
      },
      EURBRL: {
        bid: '6.2185',
        pctChange: '-0.40',
        create_date: '2026-11-12 11:51:32'
      }
    })

    const estado = useCotacoes()
    const sucesso = await estado.atualizarCotacoes()

    expect(sucesso).toBe(true)
    expect(estado.cotacoes.value).toHaveLength(2)
    expect(estado.cotacoes.value[0].valor).toBe(5.6138)
    expect(estado.cotacoes.value[1].variacao).toBe(-0.4)
    expect(estado.ultimaAtualizacao.value).toBeInstanceOf(Date)
    expect(estado.semResultados.value).toBe(false)
  })

  it('indica carregamento durante a requisição', async () => {
    let concluir

    consultarCotacoes.mockImplementation(
      () => new Promise((resolve) => {
        concluir = resolve
      })
    )

    const estado = useCotacoes()
    const requisicao = estado.atualizarCotacoes()

    expect(estado.carregando.value).toBe(true)
    expect(estado.semResultados.value).toBe(false)

    concluir({
      USDBRL: { bid: '5.60', pctChange: '0' },
      EURBRL: { bid: '6.20', pctChange: '0' }
    })

    await requisicao
    await nextTick()

    expect(estado.carregando.value).toBe(false)
  })

  it('trata erros da API sem interromper a aplicação', async () => {
    consultarCotacoes.mockRejectedValue(new Error('Falha de rede'))

    const estado = useCotacoes()
    const sucesso = await estado.atualizarCotacoes()

    expect(sucesso).toBe(false)
    expect(estado.cotacoes.value).toEqual([])
    expect(estado.erro.value).toContain('Não foi possível')
    expect(estado.carregando.value).toBe(false)
    expect(estado.semResultados.value).toBe(false)
  })

  it('identifica ausência de cotações válidas', async () => {
    consultarCotacoes.mockResolvedValue({
      USDBRL: { bid: '0' },
      EURBRL: { bid: 'invalido' }
    })

    const estado = useCotacoes()
    const sucesso = await estado.atualizarCotacoes()

    expect(sucesso).toBe(false)
    expect(estado.cotacoes.value).toEqual([])
    expect(estado.erro.value).toBe('')
    expect(estado.semResultados.value).toBe(true)
  })

  it('impede requisições simultâneas', async () => {
    let concluir

    consultarCotacoes.mockImplementation(
      () => new Promise((resolve) => {
        concluir = resolve
      })
    )

    const estado = useCotacoes()
    const primeira = estado.atualizarCotacoes()
    const segunda = await estado.atualizarCotacoes()

    expect(segunda).toBe(false)
    expect(consultarCotacoes).toHaveBeenCalledTimes(1)

    concluir({
      USDBRL: { bid: '5.60' },
      EURBRL: { bid: '6.20' }
    })

    await primeira
  })
})