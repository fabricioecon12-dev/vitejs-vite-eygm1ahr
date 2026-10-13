
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
      <h1>{{ titulo }}</h1>
      <p class="subtitulo">{{ subtitulo }}</p>
    </div>

    <div class="cabecalho-acoes">
      <div class="seletor-mes">
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
        class="btn btn-primary"
        @click="emit('nova-transacao')"
      >
        ＋ Nova transação
      </button>
    </div>
  </header>
</template>
