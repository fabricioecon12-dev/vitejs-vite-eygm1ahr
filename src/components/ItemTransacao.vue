
<script setup>
import { computed } from 'vue'

import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  ShoppingCart,
  House,
  CarFront,
  HeartPulse,
  Ticket,
  Ellipsis,
  Pill,
  Wifi,
  PaintRoller,
  Wrench,
  CreditCard,
  Landmark,
  GraduationCap,
  Pencil,
  Trash2,
  CalendarDays,
  Tag,
  ShoppingBag,
  Laptop,
  BadgePercent,
  Award,
  HandHeart,
  RefreshCw,
  Gift,
  ReceiptText
} from 'lucide-vue-next'

// =====================================================
// PROPRIEDADES E EVENTOS
// =====================================================

const props = defineProps({
  transacao: {
    type: Object,
    required: true
  },

  // Exibe as ações somente quando solicitado.
  // No Dashboard, os botões permanecem ocultos.
  excluir: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'excluir',
  'editar'
])

// =====================================================
// ÍCONES DAS CATEGORIAS
// =====================================================

// As chaves estão normalizadas:
// letras minúsculas e sem acentos.
const iconesCategoria = {
  salario: Wallet,
  investimentos: ChartNoAxesCombined,
  servicos: BriefcaseBusiness,
  vendas: ShoppingBag,
  freelance: Laptop,
  alugueis: House,
  comissoes: BadgePercent,
  bonificacoes: Award,
  aposentadoria: Landmark,
  pensao: HandHeart,
  reembolsos: RefreshCw,
  'presentes e doacoes': Gift,
  restituicoes: ReceiptText,

  alimentacao: ShoppingCart,
  moradia: House,
  transporte: CarFront,
  saude: HeartPulse,
  lazer: Ticket,
  farmacia: Pill,
  internet: Wifi,
  reforma: PaintRoller,
  manutencao: Wrench,
  'cartao credito': CreditCard,
  'cartao de credito': CreditCard,
  financiamento: Landmark,
  educacao: GraduationCap,
  outros: Ellipsis
}

// =====================================================
// NORMALIZAÇÃO DE CATEGORIAS
// =====================================================

function normalizarCategoria(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ')
}

// =====================================================
// DADOS COMPUTADOS
// =====================================================

const ehReceita = computed(
  () => props.transacao.tipo === 'receita'
)

const iconeCategoria = computed(() => {
  const categoria = normalizarCategoria(
    props.transacao.categoria
  )

  return (
    iconesCategoria[categoria] ||
    (ehReceita.value
      ? ArrowUpRight
      : ArrowDownRight)
  )
})

const valorFormatado = computed(() => {
  const valor = Number(props.transacao.valor)

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
})

const dataFormatada = computed(() => {
  const data = props.transacao.data

  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    return 'Data não informada'
  }

  const [ano, mes, dia] = data.split('-')

  return `${dia}/${mes}/${ano}`
})

const sinalValor = computed(
  () => ehReceita.value ? '+' : '−'
)

// =====================================================
// AÇÕES
// =====================================================

function solicitarEdicao() {
  emit('editar', props.transacao.id)
}

function solicitarExclusao() {
  // A confirmação da exclusão permanece
  // centralizada no useFinancas.js.
  emit('excluir', props.transacao.id)
}
</script>

<template>
  <article
    class="item-transacao item-transacao-premium group"
    :class="transacao.tipo"
  >

    <!-- ÍCONE DA CATEGORIA -->

    <span
      class="item-icone"
      :class="transacao.tipo"
      aria-hidden="true"
    >
      <component
        :is="iconeCategoria"
        :size="24"
        :stroke-width="1.9"
        class="transition-transform duration-300 group-hover:scale-110"
      />
    </span>

    <!-- INFORMAÇÕES DA TRANSAÇÃO -->

    <div class="item-descricao">

      <strong class="item-titulo">
        {{ transacao.descricao }}
      </strong>

      <div class="item-metadados">

        <span class="item-data">
          <CalendarDays
            :size="14"
            aria-hidden="true"
          />

          {{ dataFormatada }}
        </span>

        <span class="item-categoria">
          <Tag
            :size="13"
            aria-hidden="true"
          />

          {{ transacao.categoria }}
        </span>

      </div>

    </div>

    <!-- VALOR FINANCEIRO -->

    <strong
      class="item-valor item-valor-premium"
      :class="transacao.tipo"
    >

      <ArrowUpRight
        v-if="ehReceita"
        :size="17"
        :stroke-width="2.2"
        aria-hidden="true"
      />

      <ArrowDownRight
        v-else
        :size="17"
        :stroke-width="2.2"
        aria-hidden="true"
      />

      <span>
        {{ sinalValor }}
        {{ valorFormatado }}
      </span>

    </strong>

    <!-- AÇÕES DE EDIÇÃO E EXCLUSÃO -->

    <div
      v-if="excluir"
      class="item-acoes"
    >

      <button
        type="button"
        class="btn-editar"
        :aria-label="`Editar transação: ${transacao.descricao}`"
        title="Editar transação"
        @click="solicitarEdicao"
      >
        <Pencil
          :size="19"
          :stroke-width="2"
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        class="btn-excluir"
        :aria-label="`Excluir transação: ${transacao.descricao}`"
        title="Excluir transação"
        @click="solicitarExclusao"
      >
        <Trash2
          :size="19"
          :stroke-width="2"
          aria-hidden="true"
        />
      </button>

    </div>

  </article>
</template>
