
<script setup>
import { computed } from 'vue'

import {
  Target,
  Receipt,
  Banknote
} from 'lucide-vue-next'

// =====================================================
// PROPRIEDADES
// =====================================================

const props = defineProps({
  limite: {
    type: Number,
    default: 0
  },

  gasto: {
    type: Number,
    default: 0
  }
})

// =====================================================
// FORMATAÇÃO MONETÁRIA
// =====================================================

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

// =====================================================
// CÁLCULOS DO ORÇAMENTO
// =====================================================

// Garante valores adequados para apresentação.
const limiteSeguro = computed(() => {
  const valor = Number(props.limite)

  return Number.isFinite(valor)
    ? Math.max(valor, 0)
    : 0
})

const gastoSeguro = computed(() => {
  const valor = Number(props.gasto)

  return Number.isFinite(valor)
    ? Math.max(valor, 0)
    : 0
})

// Verifica se existe um limite configurado.
const limiteConfigurado = computed(
  () => limiteSeguro.value > 0
)

// Percentual real utilizado.
const percentualUtilizado = computed(() => {
  if (!limiteConfigurado.value) {
    return 0
  }

  return Math.round(
    (gastoSeguro.value / limiteSeguro.value) * 100
  )
})

// Percentual visual limitado entre 0 e 100.
const percentualBarra = computed(() => {
  return Math.min(
    Math.max(percentualUtilizado.value, 0),
    100
  )
})

// =====================================================
// ESTADOS DO ORÇAMENTO
// =====================================================

const limiteExcedido = computed(() => {
  return (
    limiteConfigurado.value &&
    gastoSeguro.value > limiteSeguro.value
  )
})

const limiteAtingido = computed(() => {
  return (
    limiteConfigurado.value &&
    gastoSeguro.value === limiteSeguro.value
  )
})

const emAlerta = computed(() => {
  return (
    limiteConfigurado.value &&
    percentualUtilizado.value >= 80
  )
})

// Valor ainda disponível.
const valorDisponivel = computed(() => {
  return Math.max(
    limiteSeguro.value - gastoSeguro.value,
    0
  )
})

// Valor que ultrapassou o orçamento.
const valorExcedido = computed(() => {
  return Math.max(
    gastoSeguro.value - limiteSeguro.value,
    0
  )
})

// =====================================================
// TEXTOS E ACESSIBILIDADE
// =====================================================

const textoPercentual = computed(() => {
  if (!limiteConfigurado.value) {
    return 'Não configurado'
  }

  return `${percentualUtilizado.value}% utilizado`
})

const textoIndicador = computed(() => {
  return limiteExcedido.value
    ? 'Limite excedido'
    : 'Disponível do limite'
})

const valorIndicador = computed(() => {
  return limiteExcedido.value
    ? valorExcedido.value
    : valorDisponivel.value
})

const descricaoProgresso = computed(() => {
  if (!limiteConfigurado.value) {
    return 'Orçamento mensal não configurado'
  }

  return (
    `${percentualUtilizado.value}% do orçamento mensal utilizado`
  )
})
</script>

<template>
  <section
    class="painel resumo-orcamento resumo-orcamento-premium"
  >

    <!-- TÍTULO E PERCENTUAL -->

    <div class="secao-titulo resumo-premium-titulo">

      <h2>
        <span
          class="resumo-titulo-icone"
          aria-hidden="true"
        >
          <Target
            :size="20"
            :stroke-width="2"
          />
        </span>

        Orçamento do mês
      </h2>

      <strong
        class="resumo-percentual"
        :class="{
          alerta: emAlerta,
          excedido: limiteExcedido || limiteAtingido
        }"
      >
        {{ textoPercentual }}
      </strong>

    </div>

    <!-- BARRA DE PROGRESSO -->

    <div
      class="barra"
      role="progressbar"
      :aria-valuenow="percentualBarra"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuetext="descricaoProgresso"
      aria-label="Utilização do orçamento mensal"
    >

      <div
        class="transition-all duration-500 ease-in-out"
        :class="{
          alerta: emAlerta,
          excedido: limiteExcedido || limiteAtingido
        }"
        :style="{
          width: `${percentualBarra}%`
        }"
      ></div>

    </div>

    <!-- INDICADORES FINANCEIROS -->

    <div class="resumo-premium-indicadores">

      <!-- GASTOS -->

      <div class="resumo-premium-indicador gasto">

        <div class="resumo-indicador-legenda">
          <Receipt
            :size="19"
            :stroke-width="2"
            aria-hidden="true"
          />

          <small>
            Gastos até agora
          </small>
        </div>

        <strong>
          {{ moeda(gastoSeguro) }}
        </strong>

      </div>

      <!-- DISPONÍVEL OU EXCEDIDO -->

      <div
        class="resumo-premium-indicador disponivel"
        :class="{
          'limite-excedido': limiteExcedido
        }"
      >

        <div class="resumo-indicador-legenda">

          <Banknote
            :size="19"
            :stroke-width="2"
            aria-hidden="true"
          />

          <small>
            {{ textoIndicador }}
          </small>

        </div>

        <strong>
          {{ moeda(valorIndicador) }}
        </strong>

      </div>

    </div>

    <!-- MENSAGENS DE ACOMPANHAMENTO -->

    <p
      v-if="!limiteConfigurado"
      class="nota"
    >
      Defina um limite na seção Orçamento.
    </p>

    <p
      v-else-if="limiteExcedido"
      class="mensagem-erro"
    >
      Orçamento excedido em
      {{ moeda(valorExcedido) }}.
    </p>

    <p
      v-else-if="limiteAtingido"
      class="mensagem-erro"
    >
      Orçamento totalmente utilizado.
      Não há limite disponível.
    </p>

    <p
      v-else-if="emAlerta"
      class="mensagem-alerta"
    >
      Atenção: você já utilizou 80% ou mais
      do orçamento.
    </p>

  </section>
</template>
