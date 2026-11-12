
<script setup>
import { ref } from 'vue'
import { Settings, UserRound, MapPin } from 'lucide-vue-next'
import { consultarCEP } from '../services/viacepService.js'
import { usePerfil } from '../composables/usePerfil.js'

const {
  perfil,
  erroPerfil,
  sucessoPerfil,
  campoInvalido,
  salvarPerfil
} = usePerfil()

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

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
    class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
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
    class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
  </section>
</template>
