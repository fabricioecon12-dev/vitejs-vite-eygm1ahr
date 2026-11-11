
<script setup>
import { ref, computed, nextTick } from 'vue'

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

// Transação selecionada para edição.
const transacaoEdicao = ref(null)

// Referência ao contêiner do formulário.
const formularioRef = ref(null)

// Controle de confirmação de cadastro.
const cadastroConfirmado = ref(0)

// Lista reativa do mês selecionado.
const transacoesDoMes = computed(() => doMes())

function adicionarERetornarAoTopo(dados) {
  const sucesso = adicionar(dados)

  if (!sucesso) {
    return
  }

  // Sinaliza que o cadastro foi salvo com sucesso.
  cadastroConfirmado.value += 1

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// ETAPA 11.5-G.17-N.5
// Seleciona a transação e rola até o formulário.
async function selecionarEdicao(id) {
  const encontrada = transacoes.value.find(
    item => item.id === id
  )

  if (!encontrada) {
    return
  }

  transacaoEdicao.value = {
    ...encontrada
  }

  // Aguarda a atualização do formulário pelo Vue.
  await nextTick()

  // Direciona a visualização ao formulário.
  formularioRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

function salvarEdicao({ id, dados }) {
  const sucesso = editar(id, dados)

  if (!sucesso) {
    return
  }

  transacaoEdicao.value = null
}

function cancelarEdicao() {
  transacaoEdicao.value = null
}

function excluirTransacao(id) {
  const sucesso = excluir(id)

  if (!sucesso) {
    return
  }

  if (transacaoEdicao.value?.id === id) {
    transacaoEdicao.value = null
  }
}
</script>

<template>
  <div class="transacoes-page">
    <div class="transacoes-grid">

      <!-- Referência para a rolagem automática -->
      <div ref="formularioRef">
        <FormularioTransacao
          :transacao-edicao="transacaoEdicao"
          :cadastro-confirmado="cadastroConfirmado"
          @adicionar="adicionarERetornarAoTopo"
          @salvar-edicao="salvarEdicao"
          @cancelar-edicao="cancelarEdicao"
        />
      </div>

      <ListaTransacoes
        :transacoes="transacoesDoMes"
        @excluir="excluirTransacao"
        @editar="selecionarEdicao"
      />

    </div>
  </div>
</template>
