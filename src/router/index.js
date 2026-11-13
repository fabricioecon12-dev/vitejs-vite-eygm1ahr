
import {
  createRouter,
  createWebHistory
} from 'vue-router'

import DashboardPage from '../pages/DashboardPage.vue'
import TransacoesPage from '../pages/TransacoesPage.vue'
import OrcamentoPage from '../pages/OrcamentoPage.vue'
import RelatoriosPage from '../pages/RelatoriosPage.vue'
import ConfiguracoesPage from '../pages/ConfiguracoesPage.vue'

// Rotas atualmente implementadas no Nexus Finanças.
const routes = [
  {
    path: '/',
    name: 'inicio',
    component: DashboardPage
  },
  {
    path: '/transacoes',
    name: 'transacoes',
    component: TransacoesPage
  },
  {
    path: '/orcamento',
    name: 'orcamento',
    component: OrcamentoPage
  },
  {
    path: '/relatorios',
    name: 'relatorios',
    component: RelatoriosPage
  },
  {
  path: '/configuracoes',
  name: 'configuracoes',
  component: ConfiguracoesPage
  }

]

// Configuração principal do Vue Router.
const router = createRouter({
  history: createWebHistory(),

  routes,

  scrollBehavior(to, from, savedPosition) {
    // Restaura a posição anterior ao usar Voltar/Avançar.
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash === '#movimentacoes') {
      return {
        el: to.hash,
        top: 12,
        behavior: 'auto'
      }
    }
    // Novas navegações começam no topo.
    return {
      top: 0,
      left: 0
    }
  }
})

export default router
