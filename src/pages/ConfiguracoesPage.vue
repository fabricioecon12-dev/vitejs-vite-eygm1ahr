
<script setup>
import { ref } from 'vue'
import { CircleAlert, Settings, UserRound, MapPin, ShieldCheck, SlidersHorizontal, Eye, Database, Trash2, Lightbulb } from 'lucide-vue-next'
import { consultarCEP } from '../services/viacepService.js'
import { usePerfil } from '../composables/usePerfil.js'
import { usePrivacidade } from '../composables/usePrivacidade.js'
import { useFinancas } from '../composables/useFinancas.js'
import { usePreferencias } from '../composables/usePreferencias.js'

const {
  perfil,
  erroPerfil,
  sucessoPerfil,
  campoInvalido,
  salvarPerfil
} = usePerfil()

const abaAtiva = ref('perfil')
const { ocultarValores, definirOcultacao } = usePrivacidade()
const { armazenamentoProtegido, limpar, demonstracao } = useFinancas()

const {
  mostrarCentavos,
  dicasFinanceiras,
  moeda,
  definirMostrarCentavos,
  definirDicasFinanceiras,
  confirmarExclusao,
  definirConfirmarExclusao
} = usePreferencias()

const cep = ref('')
const endereco = ref(null)
const carregando = ref(false)
const erro = ref('')

async function buscarEndereco() {
  erro.value = ''
  endereco.value = null

  if (!/^\d{8}$/.test(cep.value.replace(/\D/g, ''))) {
    erro.value = 'Informe um CEP válido com 8 dígitos.'
    return
  }

  carregando.value = true

  try {
    endereco.value = await consultarCEP(cep.value)
  } catch (error) {
    erro.value = error.message
  } finally {
    carregando.value = false
  }
}

</script>


<template>
  <section class="space-y-6">
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
        >
          <Settings :size="24" :stroke-width="1.8" />
        </div>

        <div>
          <h2 class="text-xl font-bold text-slate-800">
            Configurações
          </h2>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
    <nav aria-label="Seções de configurações" class="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <button v-for="aba in [{ id: 'perfil', nome: 'Meu perfil', icone: UserRound }, { id: 'seguranca', nome: 'Segurança', icone: ShieldCheck }, { id: 'preferencias', nome: 'Preferências', icone: SlidersHorizontal }]" :key="aba.id" type="button" :aria-current="abaAtiva === aba.id ? 'page' : undefined" @click="abaAtiva = aba.id" :class="abaAtiva === aba.id ? 'bg-emerald-100 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'" class="inline-flex w-full items-center gap-3 rounded-xl border-0 px-4 py-4 text-left text-sm font-semibold shadow-none outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500">
        <component :is="aba.icone" :size="18" />
        {{ aba.nome }}
      </button>
    </nav>
    <div class="min-w-0 space-y-6">
    <article
      v-if="abaAtiva === 'seguranca'"
      class="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div class="flex items-center gap-3 border-b border-slate-100 pb-5">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <ShieldCheck :size="23" />
        </div>
        <div>
          <h3 class="font-semibold text-slate-800">Segurança e privacidade</h3>
          <p class="mt-1 text-sm text-slate-500">
            Gerencie a proteção e a privacidade das suas informações financeiras.
          </p>
        </div>
      </div>

      <!-- CONFIRMACAO DE EXCLUSAO -->
      <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <CircleAlert :size="21" />
          </div>
          <div>
            <h4 class="font-semibold text-slate-800">Confirmação de exclusão</h4>
            <p class="mt-2 text-sm text-slate-500">
              Solicita confirmação antes de excluir uma transação financeira.
            </p>
            <p class="mt-3 text-xs font-medium text-emerald-700">
              {{ confirmarExclusao ? 'Confirmação ativada' : 'Confirmação desativada' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          :aria-checked="confirmarExclusao"
          aria-label="Confirmação de exclusão"
          @click="definirConfirmarExclusao(!confirmarExclusao)"
          :class="confirmarExclusao ? 'bg-emerald-600' : 'bg-slate-300'"
          class="relative h-8 w-14 shrink-0 rounded-full border-0 shadow-inner outline-none transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <span
            :class="confirmarExclusao ? 'translate-x-7' : 'translate-x-1'"
            class="absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300"
          ></span>
        </button>
      </div>
      <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Eye :size="21" />
          </div>
          <div>
            <h4 class="font-semibold text-slate-800">Ocultar valores financeiros</h4>
            <p class="mt-2 text-sm text-slate-500">
              Substitui os valores monetários por símbolos nas telas financeiras.
            </p>
            <p class="mt-3 text-xs font-medium text-emerald-700">
              {{ ocultarValores ? 'Privacidade ativada' : 'Valores visíveis' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          :aria-checked="ocultarValores"
          aria-label="Ocultar valores financeiros"
          @click="definirOcultacao(!ocultarValores)"
          :class="ocultarValores ? 'bg-emerald-600' : 'bg-slate-300'"
          class="relative h-8 w-14 shrink-0 rounded-full border-0 shadow-inner outline-none transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <span
            :class="ocultarValores ? 'translate-x-7' : 'translate-x-1'"
            class="absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300"
          ></span>
        </button>
      </div>

      <!-- RESTAURAR DADOS DEMONSTRATIVOS -->
      <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Database :size="21" />
          </div>
          <div>
            <h4 class="font-semibold text-slate-800">Restaurar dados demonstrativos</h4>
            <p class="mt-2 text-sm text-slate-500">
              Substitui os dados financeiros atuais pelos exemplos demonstrativos.
            </p>
          </div>
        </div>

        <button
          type="button"
          :disabled="armazenamentoProtegido"
          @click="demonstracao()"
          class="shrink-0 rounded-xl border border-emerald-500 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 transition-all duration-200 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restaurar dados
        </button>
      </div>

      <!-- LIMPAR DADOS FINANCEIROS -->
      <div class="flex flex-col gap-5 rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <Trash2 :size="21" />
          </div>
          <div>
            <h4 class="font-semibold text-slate-800">Limpar dados financeiros</h4>
            <p class="mt-2 text-sm text-slate-500">
              Remove as transações e os limites financeiros cadastrados.
            </p>
          </div>
        </div>

        <button
          type="button"
          :disabled="armazenamentoProtegido"
          @click="limpar()"
          class="shrink-0 rounded-xl border border-red-500 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition-all duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpar dados
        </button>
      </div>
    </article>
    <article v-if="abaAtiva === 'seguranca'" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-md">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Database :size="21" />
            </div>
            <h3 class="font-semibold text-slate-800">Armazenamento local</h3>
          </div>

          <span
            role="status"
            :class="armazenamentoProtegido ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'"
            class="rounded-full px-3 py-1 text-xs font-semibold"
          >
            {{ armazenamentoProtegido ? 'Operações bloqueadas' : 'Operações disponíveis' }}
          </span>
        </div>

        <p class="mt-4 text-sm text-slate-600">
          {{ armazenamentoProtegido
            ? 'O sistema bloqueou operações financeiras para evitar possíveis perdas de dados.'
            : 'Nenhum bloqueio preventivo de operações financeiras está ativo.' }}
        </p>
      </div>

    </article>
    <div v-if="abaAtiva === 'seguranca'" class="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <div class="flex items-start gap-3">
          <ShieldCheck :size="19" class="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <h4 class="text-sm font-semibold text-slate-800">Importante sobre seus dados</h4>
            <p class="mt-1 text-sm text-slate-600">
              Os dados financeiros são armazenados localmente neste navegador,
              sem criptografia. Evite utilizar dispositivos compartilhados
              para informações sensíveis.
            </p>
          </div>
        </div>
      </div>
        <!-- PREFERENCIAS FINANCEIRAS -->
    <article
      v-if="abaAtiva === 'preferencias'"
      class="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div class="flex items-center gap-3 border-b border-slate-100 pb-5">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <SlidersHorizontal :size="23" />
        </div>

        <div>
          <h3 class="font-semibold text-slate-800">
            Preferências do sistema
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            Personalize a apresentação das suas informações financeiras.
          </p>
        </div>
      </div>

      <!-- EXIBICAO DE CENTAVOS -->
      <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <span class="text-lg font-bold">R$</span>
          </div>

          <div>
            <h4 class="font-semibold text-slate-800">
              Exibir centavos
            </h4>
            <p class="mt-1 text-sm leading-relaxed text-slate-500">
              Escolha se os valores financeiros devem apresentar duas casas decimais.
            </p>
            <p class="mt-2 text-xs font-medium text-emerald-700">
              Exemplo: {{ mostrarCentavos ? 'R$ 1.250,75' : 'R$ 1.251' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          :aria-checked="mostrarCentavos"
          aria-label="Exibir centavos"
          @click="definirMostrarCentavos(!mostrarCentavos)"
          :class="mostrarCentavos ? 'bg-emerald-600' : 'bg-slate-300'"
          class="relative h-8 w-14 shrink-0 rounded-full border-0 shadow-inner outline-none transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <span
            :class="mostrarCentavos ? 'translate-x-7' : 'translate-x-1'"
            class="absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300"
          ></span>
        </button>
      </div>

      <!-- DICAS FINANCEIRAS -->
      <div class="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <Lightbulb :size="21" />
          </div>

          <div>
            <h4 class="font-semibold text-slate-800">
              Dicas financeiras
            </h4>
            <p class="mt-1 text-sm leading-relaxed text-slate-500">
              Controle a exibição de orientações e sugestões para melhorar sua organização financeira.
            </p>
            <p class="mt-2 text-xs font-medium text-emerald-700">
              {{ dicasFinanceiras ? 'Orientações ativadas' : 'Orientações desativadas' }}
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          :aria-checked="dicasFinanceiras"
          aria-label="Ativar dicas financeiras"
          @click="definirDicasFinanceiras(!dicasFinanceiras)"
          :class="dicasFinanceiras ? 'bg-emerald-600' : 'bg-slate-300'"
          class="relative h-8 w-14 shrink-0 rounded-full border-0 shadow-inner outline-none transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
        >
          <span
            :class="dicasFinanceiras ? 'translate-x-7' : 'translate-x-1'"
            class="absolute left-0 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform duration-300"
          ></span>
        </button>
      </div>

      <!-- MOEDA -->
      <div class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h4 class="font-semibold text-slate-800">
            Moeda padrão
          </h4>
          <p class="mt-1 text-sm text-slate-500">
            Moeda utilizada nos registros e indicadores financeiros.
          </p>
        </div>

        <span class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
          {{ moeda }}
        </span>
      </div>

      <div class="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
        <ShieldCheck :size="19" class="mt-0.5 shrink-0 text-blue-600" />
        <p class="text-sm leading-relaxed text-slate-600">
          Suas preferências são armazenadas localmente neste navegador e podem ser modificadas a qualquer momento.
        </p>
      </div>
    </article>
<div v-if="abaAtiva === 'perfil'" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center gap-3">
          <UserRound :size="22" class="text-emerald-600" />
          <h3 class="font-semibold text-slate-800">
            Meu perfil
          </h3>
        </div>

        <form
  class="space-y-4"
  novalidate
  @submit.prevent="salvarPerfil"
>
  <!-- Nome completo -->
  <div>
    <label
      for="perfil-nome"
      class="mb-2 block text-sm font-medium text-slate-700"
    >
      Nome completo
    </label>


<input
  id="perfil-nome"
  v-model="perfil.nome"
  type="text"
  autocomplete="name"
  placeholder="Digite seu nome completo"
  required
  class="w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2"

:class="{
  '!border-red-500 !bg-red-50 focus:!border-red-500 focus:!ring-red-200':
    campoInvalido === 'nome',
  'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100':
    campoInvalido !== 'nome'
}"


  :aria-invalid="campoInvalido === 'nome'"
  :aria-describedby="
    campoInvalido === 'nome'
      ? 'erro-perfil-nome'
      : undefined
  "
/>

<p
  v-if="campoInvalido === 'nome'"
  id="erro-perfil-nome"
  role="alert"
  class="mt-1 text-sm text-red-600"
>
  {{ erroPerfil }}
</p>

  </div>

  <!-- E-mail -->
  <div>
    <label
      for="perfil-email"
      class="mb-2 block text-sm font-medium text-slate-700"
    >
      E-mail
    </label>


<input
  id="perfil-email"
  v-model="perfil.email"
  type="email"
  autocomplete="email"
  placeholder="seu@email.com"
  required
  class="w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2"
  :class="{
    '!border-red-500 !bg-red-50 focus:!border-red-500 focus:!ring-red-200':
      campoInvalido === 'email',
    'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100':
      campoInvalido !== 'email'
  }"
  :aria-invalid="campoInvalido === 'email'"
  :aria-describedby="
    campoInvalido === 'email'
      ? 'erro-perfil-email'
      : undefined
  "
/>

<p
  v-if="campoInvalido === 'email'"
  id="erro-perfil-email"
  role="alert"
  class="mt-1 text-sm text-red-600"
>
  {{ erroPerfil }}
</p>

  </div>

  <!-- Telefone -->
  <div>
    <label
      for="perfil-telefone"
      class="mb-2 block text-sm font-medium text-slate-700"
    >
      Telefone
    </label>


<input
  id="perfil-telefone"
  v-model="perfil.telefone"
  type="tel"
  autocomplete="tel"
  placeholder="(00) 00000-0000"
  required
  class="w-full rounded-xl border bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:ring-2"
  :class="{
    '!border-red-500 !bg-red-50 focus:!border-red-500 focus:!ring-red-200':
      campoInvalido === 'telefone',
    'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100':
      campoInvalido !== 'telefone'
  }"
  :aria-invalid="campoInvalido === 'telefone'"
  :aria-describedby="
    campoInvalido === 'telefone'
      ? 'erro-perfil-telefone'
      : undefined
  "
/>

<p
  v-if="campoInvalido === 'telefone'"
  id="erro-perfil-telefone"
  role="alert"
  class="mt-1 text-sm text-red-600"
>
  {{ erroPerfil }}
</p>

  </div>

  <!-- Botão salvar -->
  <button
    type="submit"
    class="w-full border-0 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 min-h-[60px] px-5 py-4 text-base font-bold text-white shadow-md shadow-emerald-100 transition-all duration-300 hover:-translate-y-1 hover:from-emerald-500 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-200 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
  >
    Salvar alterações
  </button>
</form>

<!-- Mensagem de erro -->
<div
  v-if="erroPerfil && !campoInvalido"
  role="alert"
  class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
>
  <p class="text-sm font-medium text-red-700">
    {{ erroPerfil }}
  </p>
</div>

<!-- Mensagem de sucesso -->
<div
  v-if="sucessoPerfil"
  role="status"
  class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
>
  <p class="text-sm font-medium text-emerald-700">
    Perfil atualizado com sucesso!
  </p>
</div>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 flex items-center gap-3">
          <MapPin :size="22" class="text-emerald-600" />
          <h3 class="font-semibold text-slate-800">
            Meu endereço
          </h3>
        </div>


<form class="space-y-4" @submit.prevent="buscarEndereco">
  <div>
    <label
      for="cep"
      class="mb-2 block text-sm font-medium text-slate-700"
    >
      CEP
    </label>

    <input
      id="cep"
      v-model="cep"
      type="text"
      inputmode="numeric"
      maxlength="9"
      autocomplete="postal-code"
      placeholder="00000-000"
      class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
    />
  </div>

  <button
    type="submit"
    :disabled="carregando"
    class="w-full border-0 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 min-h-[60px] px-5 py-4 text-base font-bold text-white shadow-md shadow-emerald-100 transition-all duration-300 hover:-translate-y-1 hover:from-emerald-500 hover:to-emerald-700 hover:shadow-lg hover:shadow-emerald-200 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
  >
    {{ carregando ? 'Consultando CEP...' : 'Consultar endereço' }}
  </button>
</form>

<!-- Mensagem de erro -->
<div
  v-if="erro"
  role="alert"
  class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
>
  <p class="text-sm font-medium text-red-700">
    {{ erro }}
  </p>
</div>

<!-- Endereço encontrado -->
<div
  v-if="endereco"
  class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
>
  <h4 class="mb-3 text-sm font-semibold text-emerald-800">
    Endereço encontrado
  </h4>

  <dl class="space-y-3 text-sm">
    <div>
      <dt class="font-medium text-slate-500">Logradouro</dt>
      <dd class="break-words text-slate-800">
        {{ endereco.logradouro || 'Não informado' }}
      </dd>
    </div>

    <div>
      <dt class="font-medium text-slate-500">Bairro</dt>
      <dd class="break-words text-slate-800">
        {{ endereco.bairro || 'Não informado' }}
      </dd>
    </div>

    <div>
      <dt class="font-medium text-slate-500">Cidade</dt>
      <dd class="break-words text-slate-800">
        {{ endereco.localidade || 'Não informado' }}
      </dd>
    </div>

    <div>
      <dt class="font-medium text-slate-500">Estado</dt>
      <dd class="text-slate-800">
        {{ endereco.uf || 'Não informado' }}
      </dd>
    </div>

    <div>
      <dt class="font-medium text-slate-500">CEP</dt>
      <dd class="text-slate-800">
        {{ endereco.cep }}
      </dd>
    </div>
  </dl>
</div>


      </article>
    </div>
    </div>
    </div>
  </section>
</template>
