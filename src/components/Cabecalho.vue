
<script setup>
// =====================================================
// PROPRIEDADES DO CABEÇALHO
// =====================================================

defineProps({
  titulo: {
    type: String,
    default: ''
  },

  subtitulo: {
    type: String,
    default: ''
  },

  mes: {
    type: String,
    default: ''
  },
  mostrarSeletorMes: {
    type: Boolean,
    default: true
  },

  mostrarNovo: {
    type: Boolean,
    default: false
  }
})

// =====================================================
// EVENTOS
// =====================================================

const emit = defineEmits([
  'mes-anterior',
  'mes-seguinte',
  'nova-transacao'
])

// =====================================================
// AÇÕES DO CABEÇALHO
// =====================================================

function irMesAnterior() {
  emit('mes-anterior')
}

function irMesSeguinte() {
  emit('mes-seguinte')
}

function solicitarNovaTransacao() {
  emit('nova-transacao')
}
</script>

<template>
  <header class="cabecalho">

    <!-- IDENTIDADE E TÍTULOS -->

    <div class="cabecalho-identidade">

      <img
        src="/nexus-logo.png"
        alt=""
        class="cabecalho-logo-mobile"
        aria-hidden="true"
      />

      <div class="cabecalho-textos">

        <p class="eyebrow">
          PAINEL FINANCEIRO
        </p>

        <h1
          class="tracking-tight font-bold transition-colors duration-300"
        >
          {{ titulo }}
        </h1>

        <p
          v-if="subtitulo"
          class="subtitulo"
        >
          {{ subtitulo }}
        </p>

      </div>

    </div>

    <!-- AÇÕES DO CABEÇALHO -->

    <div class="cabecalho-acoes">

      <!-- SELETOR DE MÊS -->

      <div
        v-if="mostrarSeletorMes"
        class="seletor-mes group flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-2 shadow-md transition-all duration-300 hover:border-emerald-300 hover:shadow-lg"
        role="group"
        aria-label="Navegação entre meses"
      >

        <!-- MÊS ANTERIOR -->

        <button
          type="button"
          aria-label="Mês anterior"
          title="Visualizar mês anterior"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-700 transition-all duration-300 hover:scale-110 hover:bg-emerald-100 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          @click="irMesAnterior"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <!-- MÊS SELECIONADO -->

        <div
          class="flex min-w-0 items-center justify-center gap-2 px-2"
        >

          <svg
            class="h-5 w-5 shrink-0 text-emerald-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="16"
              rx="2"
            />

            <path
              d="M7 3v4M17 3v4M3 10h18"
            />
          </svg>

          <span
            class="whitespace-nowrap text-sm font-semibold tracking-wide text-slate-800"
            aria-live="polite"
            aria-atomic="true"
          >
            {{ mes }}
          </span>

        </div>

        <!-- MÊS SEGUINTE -->

        <button
          type="button"
          aria-label="Mês seguinte"
          title="Visualizar mês seguinte"
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-xl font-bold text-emerald-700 transition-all duration-300 hover:scale-110 hover:bg-emerald-100 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          @click="irMesSeguinte"
        >
          <span aria-hidden="true">›</span>
        </button>

      </div>

      <!-- BOTÃO NOVA TRANSAÇÃO -->

      <button
        v-if="mostrarNovo"
        type="button"
        class="btn btn-primary rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        @click="solicitarNovaTransacao"
      >
        ＋ Nova transação
      </button>

    </div>

  </header>
</template>
