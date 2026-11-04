
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
  Trash2
} from 'lucide-vue-next'

defineProps({
  transacao: Object,
  excluir: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['excluir'])

const iconesCategoria = {
  'salário': Wallet,
  'salario': Wallet,
  'investimentos': ChartNoAxesCombined,
  'serviços': BriefcaseBusiness,
  'servicos': BriefcaseBusiness,
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
  const [ano, mes, dia] = data.split('-')
  return `${dia}/${mes}/${ano}`
}
</script>

<template>
  <div
    class="item-transacao item-transacao-premium group transition-all duration-300"
    :class="transacao.tipo"
  >
    <span
      class="item-icone transition-transform duration-300 group-hover:scale-110"
      :class="transacao.tipo"
      aria-hidden="true"
    >
      <component
        :is="iconeTransacao(transacao)"
        :size="20"
        :stroke-width="2"
      />
    </span>

    <div class="item-descricao">
      <strong>{{ transacao.descricao }}</strong>

      <small>
        {{ dataBR(transacao.data) }}
        · {{ transacao.categoria }}
      </small>
    </div>

    <strong
      class="item-valor item-valor-premium"
      :class="transacao.tipo"
    >
      {{ transacao.tipo === 'receita' ? '+' : '−' }}
      {{ moeda(transacao.valor) }}
    </strong>

    
     <button
       v-if="excluir"
       type="button"
       class="btn-excluir rounded-lg transition-all duration-300 hover:bg-red-100 hover:scale-110"
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
</template>
