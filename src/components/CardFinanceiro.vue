
<script setup>
import {
  TrendingUp,
  TrendingDown,
  ChartColumnIncreasing
} from 'lucide-vue-next'

// =====================================================
// PROPRIEDADES DO CARD FINANCEIRO
// =====================================================

defineProps({
  titulo: {
    type: String,
    required: true
  },

  // Valor já formatado pelo componente pai.
  // Exemplo: R$ 4.500,00
  valor: {
    type: String,
    required: true
  },

  // Define o estilo visual e o ícone do card.
  tipo: {
    type: String,
    default: 'neutro',
    validator: (valor) =>
      ['receita', 'despesa','resultado', 'neutro'].includes(valor)
  },

  // Informação complementar opcional.
  detalhe: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <article
    class="card-financeiro card-financeiro-premium"
    :class="tipo"
  >
    <div class="card-premium-conteudo">

      <!-- ÍCONE DO INDICADOR -->

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

      <!-- INFORMAÇÕES FINANCEIRAS -->

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
