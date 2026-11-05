
<script setup>
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined
} from '@lucide/vue'

defineProps({
  pagina: String
})

const itens = [
  { id: 'inicio', nome: 'Visão geral', icone: LayoutDashboard },
  { id: 'transacoes', nome: 'Transações', icone: ArrowLeftRight },
  { id: 'orcamento', nome: 'Orçamento', icone: Wallet },
  { id: 'relatorios', nome: 'Relatórios', icone: ChartNoAxesCombined }
]
</script>

<template>
  <aside class="sidebar transition-colors duration-300">
    <div class="marca">
      <img
        src="/nexus-logo.png"
        alt="Logomarca Nexus Finanças"
        class="marca-logo"
      />

      <div>
        <strong class="nome-nexus">Nexus</strong>
        <small>FINANÇAS</small>
      </div>
    </div>

    <strong class="menu-legenda">MENU PRINCIPAL</strong>

    <nav class="nav-desktop" aria-label="Menu principal">
      <RouterLink
        v-for="item in itens"
        :key="item.id"
        :to="{ name: item.id }"
        :class="[
          'nav-item',
          'flex items-center gap-3',
          'rounded-xl',
          'transition-all duration-300',
          'hover:translate-x-1',
          'focus-visible:outline-2',
          'focus-visible:outline-offset-2',
          'focus-visible:outline-emerald-400',
          {
            ativo: pagina === item.id,
            'border-l-4 border-emerald-400': pagina === item.id,
            'border-l-4 border-transparent': pagina !== item.id
          }
        ]"
        :aria-current="pagina === item.id ? 'page' : undefined"
      >
        <span>
          <component
            :is="item.icone"
            :size="20"
            :stroke-width="1.8"
            aria-hidden="true"
          />
        </span>
        <small>{{ item.nome }}</small>
      </RouterLink>
    </nav>

    <div class="sidebar-frase">
      Seu dinheiro,<br />
      suas decisões.
    </div>
  </aside>

  <nav class="nav-mobile" aria-label="Navegação móvel">
    <RouterLink
      v-for="item in itens"
      :key="item.id"
      :to="{ name: item.id }"
      :class="{ ativo: pagina === item.id }"
      :aria-current="pagina === item.id ? 'page' : undefined"
    >
      <span>
        <component
          :is="item.icone"
          :size="20"
          :stroke-width="1.8"
          aria-hidden="true"
        />
      </span>
      <small>{{ item.nome }}</small>
    </RouterLink>
  </nav>
</template>