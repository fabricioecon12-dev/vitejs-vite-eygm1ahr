<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  Wallet,
  CreditCard,
  ChartNoAxesCombined,
  Settings,
  Menu,
  X
} from '@lucide/vue'

defineProps({
  pagina: {
    type: String,
    default: 'inicio'
  }
})

const route = useRoute()
const maisAberto = ref(false)

const itens = [
  { id: 'inicio', nome: 'Visão geral', icone: LayoutDashboard },
  { id: 'transacoes', nome: 'Transações', icone: ArrowLeftRight },
  { id: 'contas', nome: 'Contas bancárias', icone: Landmark },
  { id: 'cartoes', nome: 'Cartões de Crédito', icone: CreditCard },
  { id: 'orcamento', nome: 'Orçamento', icone: Wallet },
  { id: 'relatorios', nome: 'Relatórios', icone: ChartNoAxesCombined },
  { id: 'configuracoes', nome: 'Configurações', icone: Settings }
]

const itensMobile = [
  { id: 'inicio', nome: 'Início', icone: LayoutDashboard },
  { id: 'transacoes', nome: 'Transações', icone: ArrowLeftRight },
  { id: 'contas', nome: 'Contas', icone: Landmark },
  { id: 'cartoes', nome: 'Cartões', icone: CreditCard }
]

const itensMais = itens.filter((item) =>
  ['orcamento', 'relatorios', 'configuracoes'].includes(item.id)
)

const maisAtivo = computed(() =>
  itensMais.some((item) => item.id === route.name)
)

function fecharMais() {
  maisAberto.value = false
}

function alternarMais() {
  maisAberto.value = !maisAberto.value
}

function navegar(navigate) {
  fecharMais()
  navigate()
}
</script>

<template>
  <!-- SIDEBAR DESKTOP -->
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

    <div class="sidebar-frase">
      Seu dinheiro,<br />
      suas decisões.
    </div>
  </aside>

  <!-- NAVEGACAO MOBILE -->
  <nav
    class="nav-mobile"
    aria-label="Navegação móvel"
    @keydown.esc="fecharMais"
  >
    <RouterLink
      v-for="item in itensMobile"
      :key="item.id"
      :to="{ name: item.id }"
      custom
      v-slot="{ href, navigate, isActive }"
    >
      <a
        :href="href"
        :class="{ ativo: isActive && !maisAberto }"
        :aria-current="isActive ? 'page' : undefined"
        :aria-label="item.nome"
        @click="navegar(navigate)"
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

    <div class="nav-mobile-mais">
      <button
        type="button"
        class="nav-mobile-mais-botao"
        :class="{ ativo: maisAtivo || maisAberto }"
        :aria-expanded="maisAberto"
        aria-controls="nexus-menu-mais"
        aria-label="Mais opções de navegação"
        @click="alternarMais"
      >
        <span
          class="flex items-center justify-center"
          aria-hidden="true"
        >
          <X v-if="maisAberto" :size="20" :stroke-width="1.8" />
          <Menu v-else :size="20" :stroke-width="1.8" />
        </span>

        <small>Mais</small>
      </button>

      <div
        v-if="maisAberto"
        id="nexus-menu-mais"
        class="nav-mobile-mais-painel"
        aria-label="Outras páginas"
      >
        <RouterLink
          v-for="item in itensMais"
          :key="item.id"
          :to="{ name: item.id }"
          custom
          v-slot="{ href, navigate, isActive }"
        >
          <a
            :href="href"
            :class="{ ativo: isActive }"
            :aria-current="isActive ? 'page' : undefined"
            @click="navegar(navigate)"
          >
            <component
              :is="item.icone"
              :size="18"
              :stroke-width="1.8"
              aria-hidden="true"
            />

            <span>{{ item.nome }}</span>
          </a>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>