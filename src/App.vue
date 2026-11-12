<script setup>
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import MenuLateral from './components/MenuLateral.vue'
import Cabecalho from './components/Cabecalho.vue'
import Rodape from './components/Rodape.vue'

import { useFinancas } from './composables/useFinancas.js'

const {
  aviso,
  nomeMes,
  mudarMes
} = useFinancas()

const route = useRoute()
const router = useRouter()

const pagina = computed(() => {
  const nome = route.name

  return [
    'inicio',
    'transacoes',
    'orcamento',
    'relatorios',
    'configuracoes'
  ].includes(nome)
    ? nome
    : 'inicio'
})

const titulos = {
  inicio: ['Visão geral', 'Acompanhe seu resumo financeiro'],
  transacoes: ['Transações', 'Cadastre e gerencie suas movimentações'],
  orcamento: ['Orçamento', 'Defina seu limite e acompanhe seus gastos'],
  relatorios: ['Relatórios', 'Analise seus resultados e visualize seus gastos'],
  configuracoes: [
    'Configurações',
    'Gerencie seu perfil e personalize sua experiência financeira'
  ]
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
    <MenuLateral :pagina="pagina" />

    <div class="area-principal">
      <Cabecalho
        :titulo="titulos[pagina][0]"
        :subtitulo="titulos[pagina][1]"
        :mes="nomeMes()"
        :mostrar-seletor-mes="pagina !== 'configuracoes'"
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

           <!-- CONTEÚDO DAS PÁGINAS GERENCIADO PELO VUE ROUTER -->
           <RouterView />
         </main>
      

      <Rodape />
    </div>
  </div>
</template>
