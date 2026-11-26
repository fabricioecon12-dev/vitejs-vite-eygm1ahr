/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

const simulacao = vi.hoisted(() => ({
  consultar: vi.fn()
}))

vi.mock('../composables/useFinancas.js', () => ({
  useFinancas: () => ({
    armazenamentoProtegido: ref(false),
    consultarDadosAdministrativos: simulacao.consultar,
    pendenciasTecnicasTransferencia: ref([]),
    historicoRegularizacoesTecnicas: ref([]),
    inconsistenciasPendenciasTecnicas: ref([])
  })
}))

import ControleAdministrativo from '../components/ControleAdministrativo.vue'

const componentes = []

function criarPendencias(quantidade) {
  return Array.from({ length: quantidade }, (_, indice) => ({
    idTentativa: `T-${indice + 1}`,
    situacaoPersistencia: 'pendente',
    motivoCodigo: 'VERIFICACAO',
    dataHora: new Date(
      Date.UTC(2026, 10, 1, 12, indice)
    ).toISOString()
  }))
}

function consultaValida(quantidade) {
  return {
    estado: 'valido',
    mensagem: 'Consulta validada.',
    colecoes: {
      pendenciasTecnicasTransferencia:
        criarPendencias(quantidade),
      historicoRegularizacoesTecnicas: [],
      inconsistenciasPendenciasTecnicas: []
    }
  }
}

function consultaInvalida(estado) {
  return {
    estado,
    mensagem: `Consulta ${estado}.`,
    colecoes: null
  }
}

async function montar() {
  const componente = mount(ControleAdministrativo)
  componentes.push(componente)
  await nextTick()
  return componente
}

async function atualizar(componente) {
  const botao = componente.findAll('button').find(
    item => item.text().includes('Atualizar consulta')
  )

  expect(botao).toBeDefined()
  await botao.trigger('click')
  await nextTick()
}

function linhasDeOcorrencias(componente) {
  return componente.findAll('tbody tr').filter(
    linha => linha.findAll('td').length === 6
  )
}

afterEach(() => {
  componentes.splice(0).forEach(item => item.unmount())
  simulacao.consultar.mockReset()
})

describe('Controle Administrativo - integracao Vue', () => {
  it('atualiza ocorrencias apos nova consulta valida', async () => {
    simulacao.consultar
      .mockReturnValueOnce(consultaValida(1))
      .mockReturnValueOnce(consultaValida(3))

    const componente = await montar()

    expect(linhasDeOcorrencias(componente)).toHaveLength(1)
    expect(componente.text()).toContain('T-1')

    await atualizar(componente)

    expect(simulacao.consultar).toHaveBeenCalledTimes(2)
    expect(linhasDeOcorrencias(componente)).toHaveLength(3)
    expect(componente.text()).toContain('T-3')
  })

  it('reajusta a pagina quando os registros diminuem', async () => {
    simulacao.consultar
      .mockReturnValueOnce(consultaValida(21))
      .mockReturnValueOnce(consultaValida(2))

    const componente = await montar()

    const proxima = () => componente.findAll('button').find(
      item => item.text().includes('Proxima')
    )

    expect(componente.text()).toContain('Pagina 1 de 3')

    await proxima().trigger('click')
    await proxima().trigger('click')

    expect(componente.text()).toContain('Pagina 3 de 3')

    await atualizar(componente)

    expect(componente.text()).toContain('Pagina 1 de 1')
    expect(linhasDeOcorrencias(componente)).toHaveLength(2)
    expect(componente.text()).toContain('T-1')
    expect(componente.text()).not.toContain('T-21')
    expect(proxima().attributes('disabled')).toBeDefined()
  })

  it.each(['inconsistente', 'falha'])(
    'nao certifica nem exibe registros no estado %s',
    async estado => {
      simulacao.consultar
        .mockReturnValueOnce(consultaValida(2))
        .mockReturnValueOnce(consultaInvalida(estado))

      const componente = await montar()

      expect(linhasDeOcorrencias(componente)).toHaveLength(2)

      await atualizar(componente)

      expect(linhasDeOcorrencias(componente)).toHaveLength(0)
      expect(componente.text()).not.toContain('T-1')
      expect(componente.text()).not.toContain('T-2')
      expect(componente.text()).toContain(
        'Quantidade indisponivel: consulta nao validada.'
      )
      expect(componente.text()).toContain(
        `Consulta ${estado}.`
      )
    }
  )
})
