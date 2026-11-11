
<script setup>
import { computed } from 'vue'

import {
  History,
  ReceiptText,
  ChartNoAxesColumn,
  ChartPie,
  Wallet
} from 'lucide-vue-next'

// =====================================================
// PROPRIEDADES
// =====================================================

const props = defineProps({
  icone: {
    type: String,
    default: 'receipt'
  },

  titulo: {
    type: String,
    default: ''
  },

  mensagem: {
    type: String,
    default: ''
  }
})

// =====================================================
// ÍCONES DISPONÍVEIS
// =====================================================

const icones = {
  history: History,
  receipt: ReceiptText,
  chart: ChartNoAxesColumn,
  pie: ChartPie,
  wallet: Wallet
}

// Caso o ícone informado não exista,
// utiliza o ícone padrão de recibo.
const iconeSelecionado = computed(() => {
  return icones[props.icone] || ReceiptText
})
</script>

<template>
  <div
    class="estado-vazio-premium"
    role="status"
    aria-live="polite"
  >

    <!-- ÍCONE ILUSTRATIVO -->

    <component
      :is="iconeSelecionado"
      :size="36"
      :stroke-width="1.7"
      aria-hidden="true"
      class="estado-vazio-premium-icone"
    />

    <!-- TÍTULO OPCIONAL -->

    <strong v-if="titulo">
      {{ titulo }}
    </strong>

    <!-- MENSAGEM OPCIONAL -->

    <p v-if="mensagem">
      {{ mensagem }}
    </p>

  </div>
</template>

<style scoped>
.estado-vazio-premium {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 28px 16px;
  text-align: center;
  background: transparent;
}

.estado-vazio-premium-icone {
  color: #64748b;
  flex-shrink: 0;
}

.estado-vazio-premium strong {
  color: #14233e;
  font-size: 15px;
  font-weight: 700;
}

.estado-vazio-premium p {
  margin: 0;
  color: #8190a6;
  font-size: 14px;
  line-height: 1.6;
}
</style>
