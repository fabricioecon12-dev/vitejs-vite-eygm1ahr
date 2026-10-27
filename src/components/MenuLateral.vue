
<script setup>
defineProps({
  pagina: String
})

const emit = defineEmits(['navegar'])

const itens = [
  { id: 'inicio', nome: 'Visão geral', icone: '▦' },
  { id: 'transacoes', nome: 'Transações', icone: '⇄' },
  { id: 'orcamento', nome: 'Orçamento', icone: '▣' },
  { id: 'relatorios', nome: 'Relatórios', icone: '▥' }
]
</script>

<template>
  <aside class="sidebar transition-colors duration-300">
    <div class="marca">
      <span class="marca-icone">🏦</span>
      <div>
        <strong class="nome-nexus">Nexus.</strong>
        <small>FINANÇAS</small>
      </div>
    </div>

    <p class="menu-legenda">MENU PRINCIPAL</p>

    <nav class="nav-desktop" aria-label="Menu principal">
      <button
  v-for="item in itens"
  :key="item.id"
  :class="[
    'nav-item',
    'flex items-center gap-3',
    'rounded-xl',
    'transition-all duration-300',
    'hover:translate-x-1',
    'focus-visible:outline-2',
    'focus-visible:outline-offset-2',
    'focus-visible:outline-emerald-400',
    { ativo: pagina === item.id }
  ]"
  :aria-current="pagina === item.id ? 'page' : undefined"
  @click="emit('navegar', item.id)"
>
        <span class="nav-icone">{{ item.icone }}</span>
        {{ item.nome }}
      </button>
    </nav>

    <div class="sidebar-frase">
      Seu dinheiro,<br />
      suas decisões.
    </div>
  </aside>

  <nav class="nav-mobile" aria-label="Navegação móvel">
    <button
      v-for="item in itens"
      :key="item.id"
      :class="{ ativo: pagina === item.id }"
      @click="emit('navegar', item.id)"
    >
      <span>{{ item.icone }}</span>
      <small>{{ item.nome }}</small>
    </button>
  </nav>
</template>
