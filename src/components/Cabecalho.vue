
<script setup>
defineProps({
  titulo: String,
  subtitulo: String,
  mes: String,
  mostrarNovo: Boolean
})

const emit = defineEmits([
  'mes-anterior',
  'mes-seguinte',
  'nova-transacao'
])
</script>

<template>
  <header class="cabecalho">
    <div>
      <p class="eyebrow">PAINEL FINANCEIRO</p>
      <h1 class="tracking-tight font-bold transition-colors duration-300">
  {{ titulo }}
</h1>
      <p class="subtitulo">{{ subtitulo }}</p>
    </div>

    <div class="cabecalho-acoes">
      <div
      class="seletor-mes rounded-xl shadow-sm transition-shadow duration-300 hover:shadow-md"
>
        <button
          aria-label="Mês anterior"
          @click="emit('mes-anterior')"
        >
          ‹
        </button>

        <span>▣ &nbsp;{{ mes }}</span>

        <button
          aria-label="Mês seguinte"
          @click="emit('mes-seguinte')"
        >
          ›
        </button>
      </div>

      <button
        v-if="mostrarNovo"
        class="btn btn-primary rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        @click="emit('nova-transacao')"
      >
        ＋ Nova transação
      </button>
    </div>
  </header>
</template>
