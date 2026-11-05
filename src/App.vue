<script setup>
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChartBar, History, SlidersHorizontal } from 'lucide-vue-next'

import MenuLateral from './components/MenuLateral.vue'
import Cabecalho from './components/Cabecalho.vue'
import CardFinanceiro from './components/CardFinanceiro.vue'
import FormularioTransacao from './components/FormularioTransacao.vue'
import ItemTransacao from './components/ItemTransacao.vue'
import ListaTransacoes from './components/ListaTransacoes.vue'
import ResumoOrcamento from './components/ResumoOrcamento.vue'
import Rodape from './components/Rodape.vue'

import { useFinancas } from './composables/useFinancas.js'

const {
  mesSelecionado,
  saldoInicial,
  transacoes,
  limites,
  limiteEditando,
  aviso,
  armazenamentoProtegido,
  moeda,
  mesChave,
  nomeMes,
  mudarMes,
  dataMes,
  doMes,
  somar,
  receitas,
  despesas,
  resultado,
  saldo,
  limiteAtual,
  categorias,
  maxCategoria,
  adicionar,
  excluir,
  limpar,
  salvarLimite,
  demonstracao,
  converterLimiteMonetario,
  formatarLimiteMonetario
} = useFinancas()

const route = useRoute()
const router = useRouter()

const pagina = computed(() => {
  const nome = route.name

  return ['inicio', 'transacoes', 'orcamento', 'relatorios'].includes(nome)
    ? nome
    : 'inicio'
})

const titulos = {
  inicio: ['Visão geral', 'Acompanhe seu resumo financeiro'],
  transacoes: ['Transações', 'Cadastre e gerencie suas movimentações'],
  orcamento: ['Orçamento', 'Defina seu limite e acompanhe seus gastos'],
  relatorios: ['Relatórios', 'Analise seus resultados e visualize seus gastos']
}

async function navegarPara(destino) {
  if (!['inicio', 'transacoes', 'orcamento', 'relatorios'].includes(destino)) {
    return
  }

  await router.push({ name: destino })
  aviso.value = ''
  await nextTick()
  window.scrollTo(0, 0)
}
</script>

<template>
  <div class="app-layout">
    <MenuLateral
      :pagina="pagina"
      @navegar="navegarPara($event)"
    />

    <div class="area-principal">
      <Cabecalho
        :titulo="titulos[pagina][0]"
        :subtitulo="titulos[pagina][1]"
        :mes="nomeMes()"
        :mostrar-novo="pagina === 'inicio'"
        @mes-anterior="mudarMes(-1)"
        @mes-seguinte="mudarMes(1)"
        @nova-transacao="navegarPara('transacoes')"
      />

      <main>
         
          <p
           v-if="aviso"
            class="aviso"
           :class="{ erro: aviso === 'Informe um limite válido.' }"
           :role="aviso === 'Informe um limite válido.' ? 'alert' : 'status'"
            >
          {{ aviso }}
          <button
            aria-label="Fechar mensagem"
            @click="aviso = ''"
          >
            ✕
          </button>
        </p>

        <!-- VISÃO GERAL -->
        <template v-if="pagina === 'inicio'">
          <RouterView />

        </template>

        <!-- TRANSAÇÕES -->
        <template v-else-if="pagina === 'transacoes'">
          <RouterView />
        </template>

        <!-- ORÇAMENTO -->
        <template v-else-if="pagina === 'orcamento'">
          <RouterView />
        </template><!-- RELATÓRIOS -->

        <!-- RELATÓRIOS -->
        <template v-else-if="pagina === 'relatorios'">
          <RouterView />
        </template>
      </main>
      

      <!-- MODO DEMONSTRATIVO -->
      <section class="ferramentas-demo">
        <div>
          <strong>Modo demonstrativo</strong>
          <p>
            Experimente os recursos ou comece
            com seus próprios dados.
          </p>
        </div>

        <div class="ferramentas-acoes">
          <button
            class="btn btn-outline"
            @click="limpar"
          >
            Limpar dados
          </button>

          <button
            class="btn btn-outline"
            @click="demonstracao"
          >
            Restaurar exemplos
          </button>
        </div>
      </section>

      <Rodape />
    </div>
  </div>
</template>
