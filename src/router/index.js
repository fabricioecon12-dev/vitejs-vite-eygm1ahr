import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'
import TransacoesPage from '../pages/TransacoesPage.vue'
import OrcamentoPage from '../pages/OrcamentoPage.vue'
import RelatoriosPage from '../pages/RelatoriosPage.vue'

const PaginaTemporaria = {
  template: '<div></div>'
}

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
