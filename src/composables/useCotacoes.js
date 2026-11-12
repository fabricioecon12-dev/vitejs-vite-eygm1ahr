import { computed, ref } from 'vue'
import { consultarCotacoes } from '../services/cambioService.js'

export function useCotacoes() {
  const cotacoes = ref([])
  const carregando = ref(false)
  const erro = ref('')
  const ultimaAtualizacao = ref(null)

  const semResultados = computed(() =>
    !carregando.value &&
    !erro.value &&
    cotacoes.value.length === 0
  )

  async function atualizarCotacoes() {
    if (carregando.value) return false

    carregando.value = true
    erro.value = ''

    try {
      const dados = await consultarCotacoes()

      const moedas = [
        { chave: 'USDBRL', codigo: 'USD', nome: 'Dólar americano' },
        { chave: 'EURBRL', codigo: 'EUR', nome: 'Euro' }
      ]

      const resultado = moedas
        .map((moeda) => {
          const item = dados[moeda.chave]
          const valor = Number(item?.bid)
          const variacao = Number(item?.pctChange)

          if (!Number.isFinite(valor) || valor <= 0) {
            return null
          }

          return {
            codigo: moeda.codigo,
            nome: moeda.nome,
            valor,
            variacao: Number.isFinite(variacao) ? variacao : null,
            data: item.create_date || null
          }
        })
        .filter(Boolean)

      cotacoes.value = resultado

      if (resultado.length > 0) {
        ultimaAtualizacao.value = new Date()
      }

      return resultado.length > 0
    } catch {
      cotacoes.value = []
      erro.value = 'Não foi possível consultar as cotações. Tente novamente.'
      return false
    } finally {
      carregando.value = false
    }
  }

  return {
    cotacoes,
    carregando,
    erro,
    semResultados,
    ultimaAtualizacao,
    atualizarCotacoes
  }
}