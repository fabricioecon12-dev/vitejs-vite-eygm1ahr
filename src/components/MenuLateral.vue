
<script setup>
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined
} from '@lucide/vue'

// Mantém a interface existente com App.vue.
defineProps({
  pagina: {
    type: String,
    default: 'inicio'
  }
})

// Navegação atual do Nexus Finanças.
// Novos módulos serão incluídos após análise das rotas.
const itens = [
  {
    id: 'inicio',
    nome: 'Visão geral',
    icone: LayoutDashboard
  },
  {
    id: 'transacoes',
    nome: 'Transações',
    icone: ArrowLeftRight
  },
  {
    id: 'orcamento',
    nome: 'Orçamento',
    icone: Wallet
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    icone: ChartNoAxesCombined
  }
]
</script>

<template>
  <!-- SIDEBAR DESKTOP -->
  <aside class="sidebar transition-colors duration-300">
    <!-- Identidade visual -->
    <div class="marca">
      <img
        src="/nexus-logo.png"
        alt="Logomarca Nexus Finanças"
        class="marca-logo"
      />

      <div>
        <strong class="nome-nexus">
          Nexus
        </strong>

        <small>FINANÇAS</small>
      </div>
    </div>

    <!-- Menu principal -->
    <strong class="menu-legenda">
      MENU PRINCIPAL
    </strong>

    <nav
      class="nav-desktop"
      aria-label="Menu principal"
    >
      <RouterLink
        v-for="item in itens"
        :key="item.id"
        :to="{ name: item.id }"
        custom
        v-slot="{ href, navigate, isActive }"
      >
        <a
          :href="href"
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
              ativo: isActive,
              'border-l-4 border-emerald-400': isActive,
              'border-l-4 border-transparent': !isActive
            }
          ]"
          :aria-current="isActive ? 'page' : undefined"
          @click="navigate"
        >
          <span
            class="flex items-center justify-center"
            aria-hidden="true"
          >
            <component
              :is="item.icone"
              :size="20"
              :stroke-width="1.8"
            />
          </span>

          <small>{{ item.nome }}</small>
        </a>
      </RouterLink>
    </nav>

    <!-- Frase institucional -->
    <div class="sidebar-frase">
      Seu dinheiro,<br />
      suas decisões.
    </div>
  </aside>

  <!-- NAVEGAÇÃO MOBILE -->
  <nav
    class="nav-mobile"
    aria-label="Navegação móvel"
  >
    <RouterLink
      v-for="item in itens"
      :key="item.id"
      :to="{ name: item.id }"
      custom
      v-slot="{ href, navigate, isActive }"
    >
      <a
        :href="href"
        :class="{
          ativo: isActive
        }"
        :aria-current="isActive ? 'page' : undefined"
        :aria-label="item.nome"
        @click="navigate"
      >
        <span
          class="flex items-center justify-center"
          aria-hidden="true"
        >
          <component
            :is="item.icone"
            :size="20"
            :stroke-width="1.8"
          />
        </span>

        <small>{{ item.nome }}</small>
      </a>
    </RouterLink>
  </nav>
</template>
