<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import {
  ArrowLeftRight,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-vue-next'

import { useCotacoes } from '../composables/useCotacoes.js'

const {
  cotacoes,
  carregando,
  erro,
  semResultados,
  ultimaAtualizacao,
  atualizarCotacoes
} = useCotacoes()

const formatarCotacao = (valor) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(valor)

const formatarVariacao = (valor) =>
  valor === null
    ? 'Indisponível'
    : `${valor > 0 ? '+' : ''}${valor.toFixed(2).replace('.', ',')}%`

const atualizado = ref(false)
let temporizador = null

async function atualizarComFeedback() {
  if (carregando.value) return

  clearTimeout(temporizador)
  atualizado.value = false

  const sucesso = await atualizarCotacoes()

  if (sucesso) {
    atualizado.value = true

    temporizador = setTimeout(() => {
      atualizado.value = false
    }, 2000)
  }
}

onMounted(() => {
  atualizarCotacoes()
})

onUnmounted(() => {
  clearTimeout(temporizador)
})
</script>

<template>
  <section
    class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    aria-labelledby="titulo-cotacoes"
  >
    <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <span
          class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
          aria-hidden="true"
        >
          <ArrowLeftRight :size="22" />
        </span>

        <div>
          <h2
            id="titulo-cotacoes"
            class="text-lg font-bold text-slate-800"
          >
            Cotações de mercado
          </h2>

          <p class="text-sm text-slate-500">
            Acompanhe o câmbio em relação ao real
          </p>
        </div>
      </div>

      <button
        type="button"
        :disabled="carregando"
        class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
        @click="atualizarComFeedback"
      >
        <CheckCircle2 v-if="atualizado && !carregando" :size="16" />
        <RefreshCw
          v-else
          :size="16"
          :class="{ 'animate-spin': carregando }"
        />
        {{
          carregando
            ? 'Atualizando...'
            : atualizado
              ? 'Cotações atualizadas'
              : 'Atualizar cotações'
        }}
      </button>
    </div>

    <div
      v-if="carregando && !cotacoes.length"
      class="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500"
      role="status"
    >
      Consultando cotações...
    </div>

    <div
      v-else-if="erro"
      class="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700"
      role="alert"
    >
      <AlertCircle :size="20" class="shrink-0" />
      <span>{{ erro }}</span>
    </div>

    <div
      v-else-if="semResultados"
      class="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500"
      role="status"
    >
      Nenhuma cotação disponível no momento.
    </div>

    <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <article
        v-for="cotacao in cotacoes"
        :key="cotacao.codigo"
        class="rounded-xl border border-slate-100 bg-slate-50 p-5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
      >
        <p class="mb-2 text-sm font-semibold text-slate-600">
          {{ cotacao.codigo === 'USD' ? '🇺🇸' : '🇪🇺' }}
          {{ cotacao.nome }}
        </p>

        <strong class="text-2xl font-bold tracking-tight text-slate-900">
          {{ formatarCotacao(cotacao.valor) }}
        </strong>

        <div
          class="mt-3 flex items-center gap-1.5 text-sm font-semibold"
          :class="cotacao.variacao === null
            ? 'text-slate-500'
            : cotacao.variacao >= 0
              ? 'text-emerald-600'
              : 'text-red-600'"
        >
          <TrendingUp
            v-if="cotacao.variacao !== null && cotacao.variacao >= 0"
            :size="17"
          />

          <TrendingDown
            v-else-if="cotacao.variacao !== null"
            :size="17"
          />

          {{ formatarVariacao(cotacao.variacao) }}
        </div>
      </article>
    </div>

    <p
      v-if="ultimaAtualizacao && !erro"
      class="mt-4 text-xs text-slate-400"
    >
      Última consulta:
      {{ ultimaAtualizacao.toLocaleString('pt-BR') }}
      · Fonte: AwesomeAPI
    </p>
  </section>
</template>