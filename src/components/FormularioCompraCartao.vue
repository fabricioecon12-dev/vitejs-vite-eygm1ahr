<script setup>
import { computed, reactive, ref } from 'vue'
import { ShoppingBag, Save, AlertCircle, CheckCircle2 } from 'lucide-vue-next'
import { useFinancas } from '../composables/useFinancas.js'
import {
  converterMonetarioBR,
  formatarMonetarioBR,
  validarMonetarioBR
} from '../utils/monetario.js'

const emit = defineEmits(['salvo'])

const {
  cartoesCredito,
  armazenamentoProtegido,
  registrarCompraCartao,
  moeda
} = useFinancas()

const salvando = ref(false)
const erro = ref('')
const sucesso = ref('')
const errosCampos = reactive({})

function limparErrosCampos() {
  Object.keys(errosCampos).forEach(campo => {
    delete errosCampos[campo]
  })
}

function dataLocalAtual() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

const formulario = reactive({
  cartaoId: '',
  descricao: '',
  data: dataLocalAtual(),
  valor: '',
  parcelas: 1
})

const cartoesAtivos = computed(() =>
  cartoesCredito.value
    .filter(cartao => cartao.status === 'ativo')
    .sort((a, b) =>
      String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR')
    )
)

const valorNumerico = computed(() => converterMonetarioBR(formulario.valor))

const parcelasNumericas = computed(() => Number(formulario.parcelas))

function formatarCampoValor() {
  formulario.valor = formatarMonetarioBR(formulario.valor)
}

const valorParcelaEstimado = computed(() => {
  if (!Number.isFinite(valorNumerico.value) ||
      valorNumerico.value <= 0 ||
      !Number.isInteger(parcelasNumericas.value) ||
      parcelasNumericas.value < 1) {
    return 0
  }

  return valorNumerico.value / parcelasNumericas.value
})

function validarCampos() {
  const erros = {}
  const cartaoId = Number(formulario.cartaoId)

  if (!cartoesAtivos.value.some(cartao => cartao.id === cartaoId)) {
    erros.cartaoId = 'Selecione um cartão ativo.'
  }

  if (!formulario.descricao.trim()) {
    erros.descricao = 'Informe a descrição da compra.'
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(formulario.data)) {
    erros.data = 'Informe uma data válida.'
  } else {
    const [ano, mes, dia] = formulario.data.split('-').map(Number)
    const dataVerificada = new Date(Date.UTC(ano, mes - 1, dia))

    if (
      dataVerificada.getUTCFullYear() !== ano ||
      dataVerificada.getUTCMonth() !== mes - 1 ||
      dataVerificada.getUTCDate() !== dia
    ) {
      erros.data = 'Informe uma data válida.'
    }
  }

  const valor = valorNumerico.value

  if (
    !validarMonetarioBR(formulario.valor)
  ) {
    erros.valor = 'Informe um valor positivo com até duas casas decimais.'
  }

  const parcelas = parcelasNumericas.value

  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 120) {
    erros.parcelas = 'Informe uma quantidade de parcelas entre 1 e 120.'
  }

  if (
    !erros.valor &&
    !erros.parcelas &&
    Math.round(valor * 100) < parcelas
  ) {
    erros.parcelas = 'O valor deve permitir parcelas de pelo menos R$ 0,01.'
  }

  return erros
}

function atualizarErrosCampos() {
  if (Object.keys(errosCampos).length === 0) return

  const novosErros = validarCampos()

  Object.keys(errosCampos).forEach(campo => {
    if (!novosErros[campo]) {
      delete errosCampos[campo]
    } else {
      errosCampos[campo] = novosErros[campo]
    }
  })
}
function limparFormulario() {
  formulario.descricao = ''
  formulario.data = dataLocalAtual()
  formulario.valor = ''
  formulario.parcelas = 1
}

function salvar() {
  if (salvando.value || armazenamentoProtegido.value) return

  erro.value = ''
  sucesso.value = ''

  limparErrosCampos()
  Object.assign(errosCampos, validarCampos())
  if (Object.keys(errosCampos).length > 0) return

  salvando.value = true

  try {
    const resultado = registrarCompraCartao({
      cartaoId: Number(formulario.cartaoId),
      descricao: formulario.descricao.trim(),
      data: formulario.data,
      valor: valorNumerico.value,
      parcelas: parcelasNumericas.value
    })

    if (resultado !== true) {
      erro.value =
        'Não foi possível registrar a compra. Verifique o limite disponível, a situação do cartão e das faturas.'
      return
    }

    limparFormulario()
    limparErrosCampos()
    sucesso.value = 'Compra registrada com sucesso.'
    emit('salvo')
  } catch {
    erro.value =
      'Ocorreu uma falha ao registrar a compra. Verifique os dados antes de tentar novamente.'
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <form
    class="space-y-4"
    aria-label="Formulário de compra no cartão"
    novalidate
    @submit.prevent="salvar"
    @input="atualizarErrosCampos"
    @change="atualizarErrosCampos"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div class="flex items-center gap-3">
        <div class="rounded-xl bg-emerald-50 p-3 text-emerald-700">
          <ShoppingBag :size="20" />
        </div>

        <div>
          <h3 class="text-lg font-bold text-slate-800">
            Registrar compra
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            Informe os dados da compra realizada no cartão.
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="armazenamentoProtegido"
      role="alert"
      class="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    >
      <AlertCircle :size="16" class="mr-1 inline" />
      O armazenamento está protegido. Novas compras estão indisponíveis.
    </div>

    <div
      v-if="erro"
      role="alert"
      class="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <AlertCircle :size="16" class="mr-1 inline" />
      {{ erro }}
    </div>

    <div
      v-if="sucesso"
      role="status"
      class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"
    >
      <CheckCircle2 :size="16" class="mr-1 inline" />
      {{ sucesso }}
    </div>

    <fieldset
      :disabled="armazenamentoProtegido || salvando"
      class="m-0 grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 border-0 p-0 md:grid-cols-2"
    >
      <div class="md:col-span-2">
        <label for="compra-cartao" class="nexus-label">
          Cartão de crédito *
        </label>
        <select
          id="compra-cartao"
          v-model="formulario.cartaoId"
          required
          class="nexus-select"
          :aria-invalid="Boolean(errosCampos.cartaoId)"
          :aria-describedby="errosCampos.cartaoId ? 'erro-compra-cartao' : undefined"
        >
          <option value="">Selecione um cartão</option>
          <option
            v-for="cartao in cartoesAtivos"
            :key="cartao.id"
            :value="cartao.id"
          >
            {{ cartao.nome }} — {{ cartao.instituicao }}
          </option>
        </select>
        <p
          v-if="errosCampos.cartaoId"
          id="erro-compra-cartao"
          class="nexus-error"
          role="alert"
        >
          {{ errosCampos.cartaoId }}
        </p>
      </div>

      <div class="md:col-span-2">
        <label for="compra-descricao" class="nexus-label">
          Descrição *
        </label>
        <input
          id="compra-descricao"
          v-model="formulario.descricao"
          type="text"
          maxlength="150"
          required
          placeholder="Ex.: Compra no supermercado"
          class="nexus-input"
          :aria-invalid="Boolean(errosCampos.descricao)"
          :aria-describedby="errosCampos.descricao ? 'erro-compra-descricao' : undefined"
        />
        <p
          v-if="errosCampos.descricao"
          id="erro-compra-descricao"
          class="nexus-error"
          role="alert"
        >
          {{ errosCampos.descricao }}
        </p>
      </div>

      <div>
        <label for="compra-data" class="nexus-label">
          Data da compra *
        </label>
        <input
          id="compra-data"
          v-model="formulario.data"
          type="date"
          required
          class="nexus-input"
          :aria-invalid="Boolean(errosCampos.data)"
          :aria-describedby="errosCampos.data ? 'erro-compra-data' : undefined"
        />
        <p
          v-if="errosCampos.data"
          id="erro-compra-data"
          class="nexus-error"
          role="alert"
        >
          {{ errosCampos.data }}
        </p>
      </div>

      <div>
        <label for="compra-valor" class="nexus-label">
          Valor total (R$) *
        </label>
        <input
          id="compra-valor"
          v-model="formulario.valor"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          @blur="formatarCampoValor"
          required
          placeholder="0,00"
          class="nexus-input"
          :aria-invalid="Boolean(errosCampos.valor)"
          :aria-describedby="errosCampos.valor ? 'erro-compra-valor' : undefined"
        />
        <p
          v-if="errosCampos.valor"
          id="erro-compra-valor"
          class="nexus-error"
          role="alert"
        >
          {{ errosCampos.valor }}
        </p>
      </div>

      <div>
        <label for="compra-parcelas" class="nexus-label">
          Quantidade de parcelas *
        </label>
        <input
          id="compra-parcelas"
          v-model.number="formulario.parcelas"
          type="number"
          min="1"
          max="120"
          step="1"
          required
          class="nexus-input"
          :aria-invalid="Boolean(errosCampos.parcelas)"
          :aria-describedby="errosCampos.parcelas ? 'erro-compra-parcelas' : undefined"
        />
        <p
          v-if="errosCampos.parcelas"
          id="erro-compra-parcelas"
          class="nexus-error"
          role="alert"
        >
          {{ errosCampos.parcelas }}
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p class="text-xs font-semibold text-slate-500">
          Resumo estimado
        </p>
        <p class="mt-1 text-sm font-bold text-slate-900">
          {{ moeda(valorNumerico > 0 ? valorNumerico : 0) }}
        </p>
        <p class="mt-1 text-xs text-slate-500">
          {{ parcelasNumericas }}x de aproximadamente
          {{ moeda(valorParcelaEstimado) }}
        </p>
      </div>
    </fieldset>

    <div class="flex justify-end border-t border-slate-200 pt-4">
      <button
        type="submit"
        :disabled="armazenamentoProtegido || salvando || cartoesAtivos.length === 0"
        class="btn btn-primary btn-premium-fintech"
      >
        <Save :size="16" />
        {{ salvando ? 'Registrando...' : 'Registrar compra' }}
      </button>
    </div>

    <p v-if="cartoesAtivos.length === 0" class="text-xs text-amber-700">
      Cadastre ou ative um cartão antes de registrar compras.
    </p>
  </form>
</template>