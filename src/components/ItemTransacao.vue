
<script setup>
defineProps({
  transacao: Object,
  excluir: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['excluir'])

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function dataBR(data) {
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}
</script>

<template>
  <div
  class="item-transacao group rounded-lg transition-colors duration-300 hover:bg-emerald-50"
>
    <span
      class="item-icone transition-transform duration-300 group-hover:scale-110"
      :class="transacao.tipo"
    >
  {{ transacao.tipo === 'receita' ? '↗' : '↘' }}
   </span>

    <div class="item-descricao">
      <strong>{{ transacao.descricao }}</strong>

      <small>
        {{ dataBR(transacao.data) }}
        · {{ transacao.categoria }}
      </small>
    </div>

    <strong
      :class="['item-valor', transacao.tipo]"
    >
      {{ transacao.tipo === 'receita' ? '+' : '−' }}
      {{ moeda(transacao.valor) }}
    </strong>

    <button
  v-if="excluir"
  type="button"
  class="btn-excluir rounded-lg transition-all duration-300 hover:bg-red-100 hover:scale-110"
  :aria-label="'Excluir ' + transacao.descricao"
  title="Excluir transação"
  @click="emit('excluir', transacao.id)"
>
  ✕
</button>
  </div>
</template>
