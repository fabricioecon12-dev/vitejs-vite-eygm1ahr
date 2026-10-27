
<script setup>
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
  <section class="painel resumo-orcamento">
    <div class="secao-titulo">
      <h2>Orçamento do mês</h2>
      <strong>
        {{ percentual(gasto, limite) }}% utilizado
      </strong>
    </div>

    <div class="barra">
  <div
    class="transition-all duration-500 ease-in-out"
    :class="{
      alerta: percentual(gasto, limite) >= 80,
      excedido: percentual(gasto, limite) >= 100
    }"
    :style="{
      width:
        Math.min(percentual(gasto, limite), 100) + '%'
    }"
  ></div>
</div>

    <div class="resumo-linha">
      <span>
        <strong>{{ moeda(gasto) }}</strong>
        <small>Gastos até agora</small>
      </span>

      <span class="alinha-direita">
        <strong>
          {{ moeda(Math.max(limite - gasto, 0)) }}
        </strong>
        <small>Disponível</small>
      </span>
    </div>

    <p v-if="!limite" class="nota">
      Defina um limite na seção Orçamento.
    </p>

    <p
      v-else-if="gasto >= limite"
      class="mensagem-erro"
    >
      O limite mensal foi atingido ou ultrapassado.
    </p>

    <p
      v-else-if="gasto >= limite * 0.8"
      class="mensagem-alerta"
    >
      Atenção: você já utilizou 80% ou mais do orçamento.
    </p>
  </section>
</template>
