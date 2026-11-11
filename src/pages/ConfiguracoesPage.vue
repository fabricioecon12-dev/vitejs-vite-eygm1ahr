
<script setup>
import { ref } from 'vue'
import { Settings, UserRound, MapPin } from 'lucide-vue-next'
import { consultarCEP } from '../services/viacepService.js'

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
          <p class="text-sm text-slate-500">
            Gerencie suas informações e preferências.
          </p>
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

        <p class="text-sm text-slate-500">
          Área destinada às informações do usuário.
        </p>
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
