
<script setup>
import {
  TrendingUp,
  TrendingDown,
  ChartColumnIncreasing
} from '@lucide/vue'
defineProps({
  titulo: String,
  valor: String,
  tipo: {
    type: String,
    default: 'neutro'
  },
  detalhe: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <article
    :class="[
      'card-financeiro',
      'card-financeiro-premium',
      tipo
    ]"
  >
    <div class="card-premium-conteudo">

      <div
        class="card-premium-icone"
        aria-hidden="true"
      >
        <TrendingUp
          v-if="tipo === 'receita'"
          :size="30"
          :stroke-width="2"
        />

        <TrendingDown
          v-else-if="tipo === 'despesa'"
          :size="30"
          :stroke-width="2"
        />

        <ChartColumnIncreasing
          v-else
          :size="30"
          :stroke-width="2"
        />
      </div>

      <div class="card-premium-informacoes">
        <span class="card-premium-titulo">
          {{ titulo }}
        </span>
        <strong class="card-premium-valor">
          {{ valor }}
        </strong>

        <small
          v-if="detalhe"
          class="card-premium-detalhe"
        >
          {{ detalhe }}
        </small>
      </div>
    </div>
  </article>
</template>