
<script setup>
import { ref } from 'vue'
import ItemTransacao from './ItemTransacao.vue'

defineProps({
  transacoes: Array
})

const emit = defineEmits(['excluir'])

const busca = ref('')
const filtro = ref('todos')

function filtrar(lista) {
  return lista.filter(transacao => {
    const tipoCorreto =
      filtro.value === 'todos' ||
      transacao.tipo === filtro.value

    const descricaoCorreta =
      transacao.descricao
        .toLowerCase()
        .includes(busca.value.toLowerCase())

    return tipoCorreto && descricaoCorreta
  })
}
</script>

<template>
  <section class="painel lista-painel">
    <div class="secao-topo">
      <h2>Suas movimentações</h2>
      <p>Pesquise, filtre e gerencie os lançamentos do mês</p>
    </div>

    <div class="filtros">
      <input
  v-model="busca"
  class="transition-all duration-300 focus:ring-2 focus:ring-emerald-200"
  placeholder="Buscar por descrição..."
  aria-label="Buscar transações"
/>

      <select
  v-model="filtro"
  class="transition-all duration-300 focus:ring-2 focus:ring-emerald-200"
  aria-label="Filtrar tipo"
>
        <option value="todos">Todos os tipos</option>
        <option value="receita">Receitas</option>
        <option value="despesa">Despesas</option>
      </select>
    </div>

    <div v-if="filtrar(transacoes).length">
      <ItemTransacao
        v-for="item in filtrar(transacoes)"
        :key="item.id"
        :transacao="item"
        :excluir="true"
        @excluir="emit('excluir', $event)"
      />
    </div>

    <div v-else class="estado-vazio">
      <span>▤</span>
      <strong>Nenhuma transação encontrada</strong>
      <p>Cadastre uma movimentação ou altere os filtros.</p>
    </div>
  </section>
</template>
  