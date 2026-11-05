<script setup>
import FormularioTransacao from '../components/FormularioTransacao.vue'
import ListaTransacoes from '../components/ListaTransacoes.vue'
import { useFinancas } from '../composables/useFinancas.js'

const {
  doMes,
  adicionar,
  excluir
} = useFinancas()
</script>

<template>
  <div class="transacoes-page">
    <div class="transacoes-grid">
            <FormularioTransacao
              @adicionar="adicionar"
            />

            <ListaTransacoes
              :transacoes="doMes()"
              @excluir="excluir"
            />
          </div>
  </div>
</template>