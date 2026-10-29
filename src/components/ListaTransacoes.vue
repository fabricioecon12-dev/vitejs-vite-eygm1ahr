
<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import ItemTransacao from './ItemTransacao.vue'

const props = defineProps({
  transacoes: Array
})

const emit = defineEmits(['excluir'])

const busca = ref('')
const filtro = ref('todos')
// Controle da barra de rolagem personalizada
const areaRolagem = ref(null)
const alturaIndicador = ref(0)
const posicaoIndicador = ref(0)
const existeRolagem = ref(false)

// Atualiza o tamanho e a posição da barra personalizada
function atualizarIndicador() {
  const elemento = areaRolagem.value

  if (!elemento) return

  const alturaVisivel = elemento.clientHeight
  const alturaTotal = elemento.scrollHeight

  // Verifica se existem movimentações suficientes para rolagem
  existeRolagem.value = alturaTotal > alturaVisivel + 1

  if (!existeRolagem.value) {
    alturaIndicador.value = 0
    posicaoIndicador.value = 0
    return
  }

  // Calcula a altura proporcional do indicador
  alturaIndicador.value = Math.max(
    30,
    (alturaVisivel / alturaTotal) * alturaVisivel
  )

  // Calcula a posição do indicador
  const deslocamentoMaximo = alturaTotal - alturaVisivel
  const percursoIndicador = alturaVisivel - alturaIndicador.value

  posicaoIndicador.value =
    (elemento.scrollTop / deslocamentoMaximo) * percursoIndicador
}

function filtrar(lista) {
  return lista.filter(transacao => {
    const tipoCorreto =
      filtro.value === 'todos' ||
      transacao.tipo === filtro.value

    const descricaoCorreta =
      transacao.descricao
        .toLowerCase()
        .includes(busca.value.toLowerCase())

    return tipoCorreto && descricaoCorreta
  })
}
// Atualiza o indicador quando a lista ou os filtros mudam
watch(
  () => [props.transacoes, busca.value, filtro.value],
  async () => {
    await nextTick()
    atualizarIndicador()
  },
  { deep: true }
)

// Observa alterações no tamanho da área de rolagem
let observadorTamanho = null

onMounted(async () => {
  await nextTick()

  atualizarIndicador()

  if (areaRolagem.value && typeof ResizeObserver !== 'undefined') {
    observadorTamanho = new ResizeObserver(() => {
      atualizarIndicador()
    })

    observadorTamanho.observe(areaRolagem.value)
  }
})

onUnmounted(() => {
  observadorTamanho?.disconnect()
})

</script>

<template>
  <section class="painel lista-painel">
    <div class="secao-topo">
      <h2>Suas movimentações</h2>
      <p>Pesquise, filtre e gerencie os lançamentos do mês</p>
    </div>

    <div class="filtros">
      <input
  v-model="busca"
  class="transition-all duration-300 focus:ring-2 focus:ring-emerald-200"
  placeholder="Buscar por descrição..."
  aria-label="Buscar transações"
/>

      <select
  v-model="filtro"
  class="transition-all duration-300 focus:ring-2 focus:ring-emerald-200"
  aria-label="Filtrar tipo"
>
        <option value="todos">Todos os tipos</option>
        <option value="receita">Receitas</option>
        <option value="despesa">Despesas</option>
      </select>
    </div>

    <!-- Área de rolagem das movimentações -->
    <div class="movimentacoes-container">
    <div
      ref="areaRolagem"
      class="movimentacoes-rolagem"
      @scroll.passive="atualizarIndicador"
    >

<div v-if="filtrar(transacoes).length">
  <ItemTransacao
    v-for="item in filtrar(transacoes)"
    :key="item.id"
    :transacao="item"
    :excluir="true"
    @excluir="emit('excluir', $event)"
  />
</div>

<div v-else class="estado-vazio">
  <span>▤</span>
  <strong>Nenhuma transação encontrada</strong>
  <p>Cadastre uma movimentação ou altere os filtros.</p>
</div>

</div>
    <!-- Fim da área de rolagem -->

    <!-- Barra de rolagem personalizada -->
    <div
      v-if="existeRolagem"
      class="movimentacoes-indicador"
      aria-hidden="true"
      :style="{
        height: `${alturaIndicador}px`,
        transform: `translateY(${posicaoIndicador}px)`
      }"
    ></div>

  </div>
  <!-- Fim do contêiner de movimentações -->

  </section>
</template>