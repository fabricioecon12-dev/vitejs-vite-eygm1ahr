
<script setup>
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
  <article :class="['card-financeiro', tipo]">
    <div class="card-financeiro-topo">
      <span>{{ titulo }}</span>

      <span class="card-simbolo">
        {{
          tipo === 'receita'
            ? '↗'
            : tipo === 'despesa'
              ? '↘'
              : '▥'
        }}
      </span>
    </div>

    <strong>{{ valor }}</strong>

    <small v-if="detalhe">
      {{ detalhe }}
    </small>
  </article>
</template>
