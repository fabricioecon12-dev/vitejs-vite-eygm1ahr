
<script setup>
import {
  Target,
  Receipt,
  Banknote
} from 'lucide-vue-next'

defineProps({
  limite: Number,
  gasto: Number
})

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function percentual(gasto, limite) {
  return limite > 0
    ? Math.round((gasto / limite) * 100)
    : 0
}
</script>

<template>
  <section class="painel resumo-orcamento resumo-orcamento-premium">
    <div class="secao-titulo resumo-premium-titulo">
      <h2>
        <span class="resumo-titulo-icone" aria-hidden="true">
          <Target :size="20" :stroke-width="2" />
        </span>
        Orçamento do mês
      </h2>

      <strong
  class="resumo-percentual"
  :class="{
    alerta: limite > 0 && percentual(gasto, limite) >= 80,
    excedido: limite > 0 && percentual(gasto, limite) >= 100
  }"
>
  {{
    limite > 0
      ? `${percentual(gasto, limite)}% utilizado`
      : 'Não configurado'
  }}
</strong>
    </div>

    <div
      class="barra"
      role="progressbar"
      :aria-valuenow="Math.min(percentual(gasto, limite), 100)"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="Utilização do orçamento mensal"
    >
      <div
        class="transition-all duration-500 ease-in-out"
        :class="{
          alerta: percentual(gasto, limite) >= 80,
          excedido: percentual(gasto, limite) >= 100
        }"
        :style="{
          width: Math.min(percentual(gasto, limite), 100) + '%'
        }"
      ></div>
    </div>

    <div class="resumo-premium-indicadores">
      <div class="resumo-premium-indicador gasto">
        <div class="resumo-indicador-legenda">
          <Receipt :size="19" :stroke-width="2" aria-hidden="true" />
          <small>Gastos até agora</small>
        </div>

        <strong>{{ moeda(gasto) }}</strong>
      </div>

      <div
  class="resumo-premium-indicador disponivel"
  :class="{ 'limite-excedido': limite > 0 && gasto > limite }"
>
  <div class="resumo-indicador-legenda">
    <Banknote :size="19" :stroke-width="2" aria-hidden="true" />

    <small>
      {{ limite > 0 && gasto > limite
        ? 'Limite excedido'
        : 'Disponível do limite'
      }}
    </small>
  </div>

  <strong>
    {{
      moeda(
        limite > 0 && gasto > limite
          ? gasto - limite
          : Math.max(limite - gasto, 0)
      )
    }}
  </strong>
</div>
    </div>

    <p v-if="!limite" class="nota">
      Defina um limite na seção Orçamento.
    </p>

    <p
  v-else-if="limite > 0 && gasto > limite"
  class="mensagem-erro"
>
  Orçamento excedido em {{ moeda(gasto - limite) }}.
</p>

<p
  v-else-if="limite > 0 && gasto === limite"
  class="mensagem-erro"
>
  Orçamento totalmente utilizado. Não há limite disponível.
</p>
    <p
      v-else-if="gasto >= limite * 0.8"
      class="mensagem-alerta"
    >
      Atenção: você já utilizou 80% ou mais do orçamento.
    </p>
  </section>
</template>
