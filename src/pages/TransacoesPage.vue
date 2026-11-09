<script setup>
import { ref } from 'vue'
import FormularioTransacao from '../components/FormularioTransacao.vue'
import ListaTransacoes from '../components/ListaTransacoes.vue'
import { useFinancas } from '../composables/useFinancas.js'

const {
  doMes,
  transacoes,
  adicionar,
  editar,
  excluir
} = useFinancas()
const transacaoEdicao = ref(null)
async function adicionarERetornarAoTopo(dados) {
  const sucesso = adicionar(dados)

  if (!sucesso) return

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

function selecionarEdicao(id) {
  const encontrada = transacoes.value.find(
    item => item.id === id
  )

  if (!encontrada) return

  transacaoEdicao.value = { ...encontrada }
}

function salvarEdicao({ id, dados }) {
  const sucesso = editar(id, dados)

  if (!sucesso) return

  transacaoEdicao.value = null
}

function cancelarEdicao() {
  transacaoEdicao.value = null
}

</script>

<template>
  <div class="transacoes-page">
    <div class="transacoes-grid">
            
              <FormularioTransacao
                :transacao-edicao="transacaoEdicao"
                @adicionar="adicionarERetornarAoTopo"
                @salvar-edicao="salvarEdicao"
                @cancelar-edicao="cancelarEdicao"
              />
                     
            <ListaTransacoes
              :transacoes="doMes()"
              @excluir="excluir"
              @editar="selecionarEdicao"
            />
          </div>
  </div>
</template>