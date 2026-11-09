
<script setup>
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

defineProps({
  transacao: {
    type: Object,
    required: true
  },
  excluir: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['excluir', 'editar'])

const iconesCategoria = {
  'salário': Wallet,
  'salario': Wallet,
  'investimentos': ChartNoAxesCombined,
  'serviços': BriefcaseBusiness,
  'servicos': BriefcaseBusiness,
  'vendas': ShoppingBag,
  'freelance': Laptop,
  'aluguéis': House,
  'alugueis': House,
  'comissões': BadgePercent,
  'comissoes': BadgePercent,
  'bonificações': Award,
  'bonificacoes': Award,
  'aposentadoria': Landmark,
  'pensão': HandHeart,
  'pensao': HandHeart,
  'reembolsos': RefreshCw,
  'presentes e doações': Gift,
  'presentes e doacoes': Gift,
  'restituições': ReceiptText,
  'restituicoes': ReceiptText,
  'alimentação': ShoppingCart,
  'alimentacao': ShoppingCart,
  'moradia': House,
  'transporte': CarFront,
  'saúde': HeartPulse,
  'saude': HeartPulse,
  'lazer': Ticket,
  'farmácia': Pill,
  'farmacia': Pill,
  'internet': Wifi,
  'reforma': PaintRoller,
  'manutenção': Wrench,
  'manutencao': Wrench,
  'cartão crédito': CreditCard,
  'cartão de crédito': CreditCard,
  'cartao credito': CreditCard,
  'cartao de credito': CreditCard,
  'financiamento': Landmark,
  'educação': GraduationCap,
  'educacao': GraduationCap,
  'outros': Ellipsis
}

function iconeTransacao(transacao) {
  const categoria = String(transacao.categoria || '')
    .trim()
    .toLocaleLowerCase('pt-BR')

  return iconesCategoria[categoria] ||
    (transacao.tipo === 'receita'
      ? ArrowUpRight
      : ArrowDownRight)
}

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function dataBR(data) {
  if (!data) return 'Data não informada'

  const [ano, mes, dia] = String(data).split('-')

  if (!ano || !mes || !dia) return String(data)

  return `${dia}/${mes}/${ano}`
}
</script>

<template>
  <article
    class="item-transacao item-transacao-premium group"
    :class="transacao.tipo"
  >
    <!-- Ícone da categoria -->
    <span
      class="item-icone"
      :class="transacao.tipo"
      aria-hidden="true"
    >
      <component
        :is="iconeTransacao(transacao)"
        :size="24"
        :stroke-width="1.9"
        class="transition-transform duration-300 group-hover:scale-110"
      />
    </span>

    <!-- Informações da transação -->
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
          {{ dataBR(transacao.data) }}
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

    <!-- Valor financeiro -->
    <strong
      class="item-valor item-valor-premium"
      :class="transacao.tipo"
    >
      <ArrowUpRight
        v-if="transacao.tipo === 'receita'"
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
        {{ transacao.tipo === 'receita' ? '+' : '−' }}
        {{ moeda(transacao.valor) }}
      </span>
    </strong>

    <!-- Ações -->
    <div
      v-if="excluir"
      class="item-acoes"
    >
      <button
        type="button"
        class="btn-editar"
        :aria-label="'Editar ' + transacao.descricao"
        title="Editar transação"
        @click="emit('editar', transacao.id)"
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
        :aria-label="'Excluir ' + transacao.descricao"
        title="Excluir transação"
        @click="emit('excluir', transacao.id)"
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
