<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Search, LoaderCircle } from '@lucide/vue'
import { consultarBancos } from '../services/bancosService.js'
import {
  obterIdentidadeBanco,
  formatarBanco
} from '../services/identidadeBancosService.js'
import { Landmark } from '@lucide/vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  id: {
    type: String,
    default: 'conta-instituicao'
  },
  rotulo: {
    type: String,
    default: 'Instituição financeira'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  invalido: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const pesquisa = ref(props.modelValue)
const bancos = ref([])
const carregando = ref(false)
const erroConsulta = ref('')
const listaAberta = ref(false)

watch(
  () => props.modelValue,
  valor => {
    const bancoSelecionado = bancos.value.find(
      banco => banco.nome === valor
    )

    const textoExibido = bancoSelecionado
      ? formatarBanco(bancoSelecionado)
      : valor

    if (textoExibido !== pesquisa.value) {
      pesquisa.value = textoExibido
    }
  }
)

const bancosFiltrados = computed(() => {
  const normalizarTexto = (texto) =>
    String(texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')

  const termo = normalizarTexto(pesquisa.value.trim())

  return bancos.value
    .filter(banco => {
      if (!termo) return true

      const identidade = obterIdentidadeBanco(banco)

      return (
        normalizarTexto(identidade.nome).includes(termo) ||
        normalizarTexto(identidade.razaoSocial).includes(termo) ||
        identidade.codigo?.includes(termo)
      )
    })
    .slice(0, 12)
})

async function carregarBancos() {
  carregando.value = true
  erroConsulta.value = ''

  try {
    bancos.value = await consultarBancos()
  } catch (erro) {
    erroConsulta.value = erro.message
  } finally {
    carregando.value = false
  }
}

function atualizarPesquisa(valor) {
  pesquisa.value = valor
  emit('update:modelValue', valor)
  listaAberta.value = true
}

function selecionarBanco(banco) {
  pesquisa.value = formatarBanco(banco)
  emit('update:modelValue', banco.nome)
  listaAberta.value = false
}

const logotiposComErro = ref({})

function registrarErroLogotipo(banco) {
  const codigo = banco?.codigo
  if (!codigo) return

  logotiposComErro.value = {
    ...logotiposComErro.value,
    [codigo]: true
  }
}
onMounted(carregarBancos)
</script>

<template>
  <div class="relative">
    <label
      :for="id"
      class="nexus-label"
    >
      {{ rotulo }}
    </label>

    <div class="relative">
      <Search
        :size="18"
        class="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
      />

      <input
        :id="id"
        :value="pesquisa"
        type="text"
        maxlength="100"
        required
        autocomplete="off"
        :disabled="disabled"
        placeholder="Nome ou código do banco"
        class="nexus-input !pl-14 pr-11"
        :aria-invalid="invalido ? 'true' : undefined"
        @input="atualizarPesquisa($event.target.value)"
        @focus="listaAberta = true"
        @blur="listaAberta = false"
      />

      <LoaderCircle
        v-if="carregando"
        :size="18"
        class="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-600"
      />
      <div
        v-if="listaAberta && !carregando && bancosFiltrados.length"
        class="absolute z-30 top-full mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
      >
        <button
          v-for="banco in bancosFiltrados"
          :key="banco.ispb || `${banco.codigo}-${banco.nome}`"
          type="button"
          class="flex w-full items-center gap-3 rounded-lg border-0 bg-white px-3 py-2.5 text-left shadow-none transition-colors hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none"
          @mousedown.prevent="selecionarBanco(banco)"
        >
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="obterIdentidadeBanco(banco).codigo === '260' &&
              obterIdentidadeBanco(banco).logotipo &&
              !logotiposComErro[banco.codigo]
                ? 'bg-[#820AD1] text-white'
                : obterIdentidadeBanco(banco).codigo === '335' &&
                  obterIdentidadeBanco(banco).logotipo &&
                  !logotiposComErro[banco.codigo]
                  ? 'bg-[#1D2E5D] text-white overflow-hidden'
                  : obterIdentidadeBanco(banco).logotipo &&
                    !logotiposComErro[banco.codigo]
                    ? 'bg-white ring-1 ring-slate-200'
                    : 'bg-emerald-50 text-emerald-600'"
          >
            <span class="relative flex h-7 w-7 items-center justify-center">
              <img
                v-if="obterIdentidadeBanco(banco).logotipo && !logotiposComErro[banco.codigo]"
                :src="obterIdentidadeBanco(banco).logotipo"
                :alt="`Logotipo ${obterIdentidadeBanco(banco).nome}`"
                class="h-7 w-7 object-contain"
                :class="obterIdentidadeBanco(banco).codigo === '335'
                  ? 'scale-[1.45]'
                  : ''"
                @error="registrarErroLogotipo(banco)"
              />
              <Landmark
                v-else
                :size="21"
                :class="obterIdentidadeBanco(banco).codigo === '260'
                  ? 'text-white'
                  : obterIdentidadeBanco(banco).codigo === '323'
                    ? 'text-[#009EE3]'
                    : 'text-emerald-600'"
              />
            </span>
          </span>

          <span class="min-w-0 flex-1">
            <span class="block break-words text-sm font-semibold text-slate-800">
              {{ formatarBanco(banco) }}
            </span>
            <span
              v-if="obterIdentidadeBanco(banco).nome !== banco.nome"
              class="block text-xs text-slate-500"
            >
              {{ banco.nome }}
            </span>
          </span>
        </button>
      </div>

    </div>



    <p
      v-if="erroConsulta"
      class="mt-2 text-xs text-amber-700"
      role="status"
    >
      Não foi possível carregar a lista. Informe a instituição manualmente.
    </p>

    <p v-else-if="!(listaAberta && !carregando && bancosFiltrados.length)" class="nexus-help">
      Pesquise e selecione uma instituição ou informe o nome manualmente.
    </p>
  </div>
</template>
