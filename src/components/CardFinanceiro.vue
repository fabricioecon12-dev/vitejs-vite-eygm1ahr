
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
  <article
  :class="[
  'card-financeiro',
  tipo,
  'transition-all duration-300',
  'hover:-translate-y-1',
  'hover:shadow-lg',
  'hover:border-emerald-300'
]"
>
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
