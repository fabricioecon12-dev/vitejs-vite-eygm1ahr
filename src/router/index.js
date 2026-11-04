import { createRouter, createWebHistory } from 'vue-router'

const PaginaTemporaria = {
  template: '<div></div>'
}

const routes = [
  {
    path: '/',
    name: 'inicio',
    component: PaginaTemporaria
  },
  {
    path: '/transacoes',
    name: 'transacoes',
    component: PaginaTemporaria
  },
  {
    path: '/orcamento',
    name: 'orcamento',
    component: PaginaTemporaria
  },
  {
    path: '/relatorios',
    name: 'relatorios',
    component: PaginaTemporaria
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
