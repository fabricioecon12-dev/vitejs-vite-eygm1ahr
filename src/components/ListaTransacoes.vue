
<script setup>
import {
  ref,
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  watch
} from 'vue'

import ItemTransacao from './ItemTransacao.vue'
import EstadoVazio from './EstadoVazio.vue'

import { ArrowLeftRight } from 'lucide-vue-next'

// =====================================================
// PROPRIEDADES E EVENTOS
// =====================================================

const props = defineProps({
  transacoes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'excluir',
  'editar'
])

// =====================================================
// PESQUISA E FILTROS
// =====================================================

const busca = ref('')
const filtro = ref('todos')

// Normaliza o texto para facilitar a pesquisa.
function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Calcula a lista filtrada somente quando
// as transações ou os filtros são alterados.
const transacoesFiltradas = computed(() => {
  const termoBusca = normalizarTexto(busca.value)

  return props.transacoes.filter(transacao => {
    const tipoCorreto =
      filtro.value === 'todos' ||
      transacao.tipo === filtro.value

    const descricaoCorreta =
      normalizarTexto(transacao.descricao)
        .includes(termoBusca)

    return tipoCorreto && descricaoCorreta
  })
})

// =====================================================
// BARRA DE ROLAGEM PERSONALIZADA
// =====================================================

const areaRolagem = ref(null)

const alturaIndicador = ref(0)
const posicaoIndicador = ref(0)
const existeRolagem = ref(false)

// Observadores de tamanho e conteúdo.
let observadorTamanho = null
let observadorConteudo = null

// =====================================================
// CÁLCULO DO INDICADOR
// =====================================================

function atualizarIndicador() {
  const elemento = areaRolagem.value

  if (!elemento) {
    existeRolagem.value = false
    alturaIndicador.value = 0
    posicaoIndicador.value = 0
    return
  }

  const alturaVisivel = elemento.clientHeight
  const alturaTotal = elemento.scrollHeight

  // Verifica se a área possui rolagem.
  const possuiRolagem =
    alturaVisivel > 0 &&
    alturaTotal > alturaVisivel + 1

  existeRolagem.value = possuiRolagem

  if (!possuiRolagem) {
    alturaIndicador.value = 0
    posicaoIndicador.value = 0
    return
  }

  // Calcula o tamanho proporcional do indicador.
  // O limite superior evita que ele ultrapasse
  // a altura disponível.
  const alturaCalculada =
    (alturaVisivel / alturaTotal) * alturaVisivel

  alturaIndicador.value = Math.min(
    alturaVisivel,
    Math.max(30, alturaCalculada)
  )

  // Calcula os percursos máximos.
  const deslocamentoMaximo =
    alturaTotal - alturaVisivel

  const percursoIndicador = Math.max(
    0,
    alturaVisivel - alturaIndicador.value
  )

  // Mantém a posição dentro dos limites.
  const posicaoCalculada =
    deslocamentoMaximo > 0
      ? (elemento.scrollTop / deslocamentoMaximo) *
        percursoIndicador
      : 0

  posicaoIndicador.value = Math.min(
    percursoIndicador,
    Math.max(0, posicaoCalculada)
  )
}

// =====================================================
// ATUALIZAÇÃO APÓS FILTRAGEM
// =====================================================

watch(
  transacoesFiltradas,
  async () => {
    await nextTick()
    atualizarIndicador()
  },
  {
    flush: 'post'
  }
)

// =====================================================
// OBSERVAÇÃO DE ALTERAÇÕES DE TAMANHO
// =====================================================

onMounted(async () => {
  await nextTick()

  atualizarIndicador()

  const elemento = areaRolagem.value

  if (!elemento) {
    return
  }

  // Observa alterações no tamanho da área visível.
  if (typeof ResizeObserver !== 'undefined') {
    observadorTamanho = new ResizeObserver(() => {
      atualizarIndicador()
    })

    observadorTamanho.observe(elemento)
  }

  // Observa alterações no conteúdo interno.
  // Isso ajuda quando os itens mudam de tamanho.
  if (typeof ResizeObserver !== 'undefined') {
    const conteudo = elemento.firstElementChild

    if (conteudo) {
      observadorConteudo = new ResizeObserver(() => {
        atualizarIndicador()
      })

      observadorConteudo.observe(conteudo)
    }
  }
})

// =====================================================
// LIMPEZA DOS OBSERVADORES
// =====================================================

onUnmounted(() => {
  observadorTamanho?.disconnect()
  observadorConteudo?.disconnect()
})
</script>

<template>
  <section class="painel lista-painel">

    <!-- CABEÇALHO -->

    <div class="secao-topo">

      <h2 class="titulo-categorias-premium">
        <span
          class="icone-categorias-premium"
          aria-hidden="true"
        >
          <ArrowLeftRight
            :size="20"
            :stroke-width="2"
          />
        </span>

        Suas movimentações
      </h2>

      <p>
        Pesquise, filtre e gerencie os lançamentos do mês
      </p>

    </div>

    <!-- PESQUISA E FILTROS -->

    <div class="filtros">

      <input
        v-model="busca"
        type="search"
        class="transition-all duration-300 focus:ring-2 focus:ring-emerald-200"
        placeholder="Buscar por descrição..."
        aria-label="Buscar transações"
      />

      <select
        v-model="filtro"
        class="transition-all duration-300 focus:ring-2 focus:ring-emerald-200"
        aria-label="Filtrar tipo"
      >
        <option value="todos">
          Todos os tipos
        </option>

        <option value="receita">
          Receitas
        </option>

        <option value="despesa">
          Despesas
        </option>
      </select>

    </div>

    <!-- ÁREA DE ROLAGEM -->

    <div class="movimentacoes-container">

      <div
        ref="areaRolagem"
        class="movimentacoes-rolagem"
        @scroll.passive="atualizarIndicador"
      >

        <!-- CONTEÚDO OBSERVADO -->

        <div class="movimentacoes-conteudo">

          <template v-if="transacoesFiltradas.length">

            <ItemTransacao
              v-for="item in transacoesFiltradas"
              :key="item.id"
              :transacao="item"
              :excluir="true"
              @excluir="emit('excluir', $event)"
              @editar="emit('editar', $event)"
            />

          </template>

          <!-- ESTADO VAZIO -->

          <EstadoVazio
            v-else
            icone="receipt"
            titulo="Nenhuma transação encontrada"
            mensagem="Cadastre uma movimentação ou altere os filtros."
          />

        </div>

      </div>

      <!-- INDICADOR PERSONALIZADO -->

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

  </section>
</template>
