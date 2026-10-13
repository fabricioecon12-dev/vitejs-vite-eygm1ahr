
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
  <div class="item-transacao">
    <span
      class="item-icone"
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
      class="btn-excluir"
      :aria-label="'Excluir ' + transacao.descricao"
      title="Excluir transação"
      @click="emit('excluir', transacao.id)"
    >
      ✕
    </button>
  </div>
</template>
