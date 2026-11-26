<script setup>
import { computed, reactive, ref, watch } from 'vue'
import {
  CreditCard,
  Save,
  X,
  ShieldCheck,
  AlertCircle
} from 'lucide-vue-next'

import SeletorInstituicao from './SeletorInstituicao.vue'
import { useFinancas } from '../composables/useFinancas.js'
import {
  converterMonetarioBR,
  formatarMonetarioBR,
  validarMonetarioBR
} from '../utils/monetario.js'

const props = defineProps({
  cartao: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['salvo', 'cancelar'])

const {
  contas,
  armazenamentoProtegido,
  adicionarCartao,
  editarCartao
} = useFinancas()

const salvando = ref(false)
const erroFormulario = ref('')
const errosCampos = reactive({})

function limparErrosCampos() {
  Object.keys(errosCampos).forEach(campo => {
    delete errosCampos[campo]
  })
}



const emEdicao = computed(() => props.cartao !== null)

function formatarCampoLimite() {
  if (emEdicao.value) return

  formulario.limiteTotal = formatarMonetarioBR(
    formulario.limiteTotal
  )
}

const formulario = reactive({
  nome: '',
  instituicao: '',
  bandeira: '',
  limiteTotal: '',
  diaFechamento: '',
  diaVencimento: '',
  ultimosDigitos: '',
  contaId: '',
  jurosRotativoMensal: '',
  jurosMoraMensal: '',
  multaAtraso: ''
})

watch(
  formulario,
  () => {
    if (Object.keys(errosCampos).length === 0) return

    const novosErros = validarCampos()

    Object.keys(errosCampos).forEach(campo => {
      if (!novosErros[campo]) {
        delete errosCampos[campo]
      }
    })
  },
  { deep: true }
)

const contasDisponiveis = computed(() =>
  [...contas.value].sort((a, b) =>
    String(a.nome ?? '').localeCompare(
      String(b.nome ?? ''),
      'pt-BR'
    )
  )
)

function preencherFormulario(cartao) {
  formulario.nome = cartao?.nome ?? ''
  formulario.instituicao = cartao?.instituicao ?? ''
  formulario.bandeira = cartao?.bandeira ?? ''
  formulario.limiteTotal = cartao?.limiteTotal ?? ''
  formulario.diaFechamento = cartao?.diaFechamento ?? ''
  formulario.diaVencimento = cartao?.diaVencimento ?? ''
  formulario.ultimosDigitos = cartao?.ultimosDigitos ?? ''
  formulario.contaId = cartao?.contaId ?? ''

  const encargos = cartao?.configuracaoEncargos

  formulario.jurosRotativoMensal =
    encargos?.jurosRotativoMensal == null
      ? ''
      : String(encargos.jurosRotativoMensal).replace('.', ',')

  formulario.jurosMoraMensal =
    encargos?.jurosMoraMensal == null
      ? ''
      : String(encargos.jurosMoraMensal).replace('.', ',')

  formulario.multaAtraso =
    encargos?.multaAtraso == null
      ? ''
      : String(encargos.multaAtraso).replace('.', ',')

  erroFormulario.value = ''
}

watch(
  () => props.cartao,
  preencherFormulario,
  { immediate: true }
)

function converterTaxaPercentual(valor) {
  const texto = String(valor ?? '').trim()

  if (texto === '') return null

  return Number(texto.replace(',', '.'))
}

function validarTaxaPercentual(valor) {
  const texto = String(valor ?? '').trim()

  if (texto === '') return true

  if (!/^\d+(?:[,.]\d{1,4})?$/.test(texto)) {
    return false
  }

  const taxa = converterTaxaPercentual(texto)

  return Number.isFinite(taxa) && taxa >= 0 && taxa <= 100
}

function validarCampos() {
  const erros = {}

  if (!formulario.nome.trim()) {
    erros.nome = 'Informe o nome do cartão.'
  }

  if (!formulario.instituicao.trim()) {
    erros.instituicao = 'Selecione uma instituição financeira.'
  }

  if (!formulario.bandeira.trim()) {
    erros.bandeira = 'Selecione a bandeira.'
  }

  if (!emEdicao.value) {
    if (!validarMonetarioBR(formulario.limiteTotal)) {
      erros.limiteTotal = 'Informe um limite positivo com até duas casas decimais.'
    }
  }

  const fechamento = Number(formulario.diaFechamento)
  const vencimento = Number(formulario.diaVencimento)

  if (
    formulario.diaFechamento === '' ||
    !Number.isInteger(fechamento) ||
    fechamento < 1 ||
    fechamento > 31
  ) {
    erros.diaFechamento = 'Informe um dia de fechamento entre 1 e 31.'
  }

  if (
    formulario.diaVencimento === '' ||
    !Number.isInteger(vencimento) ||
    vencimento < 1 ||
    vencimento > 31
  ) {
    erros.diaVencimento = 'Informe um dia de vencimento entre 1 e 31.'
  }

  const digitos = formulario.ultimosDigitos.trim()

  if (digitos && !/^\d{4}$/.test(digitos)) {
    erros.ultimosDigitos = 'Informe exatamente quatro dígitos numéricos.'
  }

  if (formulario.contaId !== '') {
    const contaId = Number(formulario.contaId)

    if (!contas.value.some(conta => conta.id === contaId)) {
      erros.contaId = 'Selecione uma conta bancária válida.'
    }
  }

  const camposEncargos = [
    ['jurosRotativoMensal', 'juros rotativos mensais'],
    ['jurosMoraMensal', 'juros de mora mensais'],
    ['multaAtraso', 'multa por atraso']
  ]

  for (const [campo, descricao] of camposEncargos) {
    if (!validarTaxaPercentual(formulario[campo])) {
      erros[campo] =
        `Informe ${descricao} entre 0% e 100%, com até quatro casas decimais.`
    }
  }

  return erros
}
function salvar() {
  if (salvando.value || armazenamentoProtegido.value) return

  limparErrosCampos()
  Object.assign(errosCampos, validarCampos())
  erroFormulario.value = ''

  if (Object.keys(errosCampos).length > 0) return

  const dados = {
    nome: formulario.nome.trim(),
    instituicao: formulario.instituicao.trim(),
    bandeira: formulario.bandeira.trim(),
    diaFechamento: Number(formulario.diaFechamento),
    diaVencimento: Number(formulario.diaVencimento),
    ultimosDigitos: formulario.ultimosDigitos.trim(),
    contaId: formulario.contaId === ''
      ? null
      : Number(formulario.contaId)
  }

  dados.configuracaoEncargos = {
    jurosRotativoMensal:
      converterTaxaPercentual(formulario.jurosRotativoMensal),
    jurosMoraMensal:
      converterTaxaPercentual(formulario.jurosMoraMensal),
    multaAtraso:
      converterTaxaPercentual(formulario.multaAtraso)
  }

  if (!emEdicao.value) {
    dados.limiteTotal = converterMonetarioBR(formulario.limiteTotal)
  }

  salvando.value = true

  try {
    const sucesso = emEdicao.value
      ? editarCartao(props.cartao.id, dados)
      : adicionarCartao(dados)

    if (!sucesso) {
      erroFormulario.value =
        'Não foi possível salvar o cartão. Verifique os dados e tente novamente.'
      return
    }

    emit('salvo')
  } catch {
    erroFormulario.value =
      'Ocorreu uma falha ao salvar o cartão. Nenhuma nova tentativa foi executada.'
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <form
    class="w-full min-w-0 space-y-4 pb-4 sm:pb-6"
    aria-label="Formulário de cartão de crédito"
    novalidate
    @submit.prevent="salvar"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
      <div class="flex items-center gap-3">
        <div class="rounded-xl bg-emerald-50 p-3 text-emerald-700">
          <CreditCard :size="20" />
        </div>

        <div>
          <h3 class="text-lg font-bold text-slate-800">
            {{ emEdicao ? 'Editar cartão' : 'Cadastrar cartão' }}
          </h3>

          <p class="mt-1 text-sm text-slate-500">
            Preencha os dados do cartão de crédito.
          </p>
        </div>
      </div>

      <span
        class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
      >
        <ShieldCheck :size="14" />
        Dados protegidos
      </span>
    </div>

    <div
      v-if="armazenamentoProtegido"
      role="alert"
      class="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
    >
      <AlertCircle :size="18" class="shrink-0" />
      O armazenamento está protegido. Não é possível salvar alterações.
    </div>

    <div
      v-if="erroFormulario"
      role="alert"
      class="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
    >
      <AlertCircle :size="18" class="shrink-0" />
      {{ erroFormulario }}
    </div>

    <fieldset
      :disabled="armazenamentoProtegido || salvando"
      class="m-0 grid min-w-0 grid-cols-1 gap-x-4 gap-y-3 border-0 p-0 md:grid-cols-2"
    >
      <div>
        <label for="cartao-nome" class="nexus-label">
          Nome do cartão *
        </label>
        <input
          id="cartao-nome"
          v-model="formulario.nome"
          type="text"
          required
          maxlength="100"
          autocomplete="off"
          placeholder="Ex.: Cartão principal"
          class="nexus-input" :aria-invalid="Boolean(errosCampos.nome)" :aria-describedby="errosCampos.nome ? 'erro-cartao-nome' : undefined"
        />
        <p
          v-if="errosCampos.nome"
          id="erro-cartao-nome"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.nome }}
        </p>
      </div>

      <div>
        <SeletorInstituicao
          id="cartao-instituicao"
          rotulo="Instituição financeira *"
          v-model="formulario.instituicao"
          :invalido="Boolean(errosCampos.instituicao)"
          :disabled="armazenamentoProtegido || salvando"
        />
        <p
          v-if="errosCampos.instituicao"
          id="erro-cartao-instituicao"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.instituicao }}
        </p>
      </div>

      <div>
        <label for="cartao-bandeira" class="nexus-label">
          Bandeira *
        </label>
        <select
          id="cartao-bandeira"
          v-model="formulario.bandeira"
          required
          class="nexus-select" :aria-invalid="Boolean(errosCampos.bandeira)" :aria-describedby="errosCampos.bandeira ? 'erro-cartao-bandeira' : undefined"
        >
          <option value="">Selecione</option>
          <option value="Visa">Visa</option>
          <option value="Mastercard">Mastercard</option>
          <option value="Elo">Elo</option>
          <option value="American Express">American Express</option>
          <option value="Hipercard">Hipercard</option>
          <option value="Outra">Outra</option>
        </select>
        <p
          v-if="errosCampos.bandeira"
          id="erro-cartao-bandeira"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.bandeira }}
        </p>
      </div>

      <div>
        <label for="cartao-limite" class="nexus-label">
          Limite total (R$) *
        </label>
        <input
          id="cartao-limite"
          v-model="formulario.limiteTotal"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          @blur="formatarCampoLimite"
          :required="!emEdicao"
          :disabled="emEdicao"
          placeholder="0,00"
          class="nexus-input" :aria-invalid="Boolean(errosCampos.limiteTotal)" :aria-describedby="errosCampos.limiteTotal ? 'erro-cartao-limite' : undefined"
        />
        <p
          v-if="errosCampos.limiteTotal"
          id="erro-cartao-limite"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.limiteTotal }}
        </p>
        <p v-if="emEdicao" class="mt-1 text-xs text-slate-500">
          Alterações de limite exigem procedimento específico.
        </p>
      </div>

      <div>
        <label for="cartao-fechamento" class="nexus-label">
          Dia de fechamento *
        </label>
        <input
          id="cartao-fechamento"
          v-model="formulario.diaFechamento"
          type="number"
          min="1"
          max="31"
          step="1"
          required
          class="nexus-input" :aria-invalid="Boolean(errosCampos.diaFechamento)" :aria-describedby="errosCampos.diaFechamento ? 'erro-cartao-fechamento' : undefined"
        />
        <p
          v-if="errosCampos.diaFechamento"
          id="erro-cartao-fechamento"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.diaFechamento }}
        </p>
      </div>

      <div>
        <label for="cartao-vencimento" class="nexus-label">
          Dia de vencimento *
        </label>
        <input
          id="cartao-vencimento"
          v-model="formulario.diaVencimento"
          type="number"
          min="1"
          max="31"
          step="1"
          required
          class="nexus-input" :aria-invalid="Boolean(errosCampos.diaVencimento)" :aria-describedby="errosCampos.diaVencimento ? 'erro-cartao-vencimento' : undefined"
        />
        <p
          v-if="errosCampos.diaVencimento"
          id="erro-cartao-vencimento"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.diaVencimento }}
        </p>
      </div>

      <div>
        <label for="cartao-digitos" class="nexus-label">
          Últimos quatro dígitos
        </label>
        <input
          id="cartao-digitos"
          v-model="formulario.ultimosDigitos"
          type="text"
          inputmode="numeric"
          maxlength="4"
          autocomplete="off"
          placeholder="Ex.: 1234"
          class="nexus-input" :aria-invalid="Boolean(errosCampos.ultimosDigitos)" :aria-describedby="errosCampos.ultimosDigitos ? 'erro-cartao-digitos' : undefined"
        />
        <p
          v-if="errosCampos.ultimosDigitos"
          id="erro-cartao-digitos"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.ultimosDigitos }}
        </p>
      </div>

      <div>
        <label for="cartao-conta" class="nexus-label">
          Conta bancária vinculada
        </label>
        <select
          id="cartao-conta"
          v-model="formulario.contaId"
          class="nexus-select" :aria-invalid="Boolean(errosCampos.contaId)" :aria-describedby="errosCampos.contaId ? 'erro-cartao-conta' : undefined"
        >
          <option value="">Sem vinculação</option>
          <option
            v-for="conta in contasDisponiveis"
            :key="conta.id"
            :value="conta.id"
          >
            {{ conta.nome }}
          </option>
        </select>
        <p
          v-if="errosCampos.contaId"
          id="erro-cartao-conta"
          class="nexus-error" role="alert"
        >
          {{ errosCampos.contaId }}
        </p>
      </div>
    </fieldset>

    <section
      class="box-border mt-4 w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4"
      aria-labelledby="titulo-encargos-financeiros"
    >
      <div class="mb-3 border-b border-slate-200 pb-2">
        <h4 id="titulo-encargos-financeiros" class="text-sm font-semibold text-slate-800">
          Encargos financeiros (opcional)
        </h4>
      </div>

      <p class="mb-3 text-xs text-slate-500">
        Informe as taxas percentuais do cartão. Deixe em branco quando não configuradas.
      </p>

      <div class="grid w-full min-w-0 max-w-full grid-cols-1 gap-3 md:grid-cols-3">
        <div class="min-w-0">
          <label for="cartao-juros-rotativo" class="nexus-label">
            Juros rotativos (% ao mês)
          </label>
          <input
            id="cartao-juros-rotativo"
            v-model="formulario.jurosRotativoMensal"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Ex.: 12,50"
            class="nexus-input w-full min-w-0 max-w-full box-border"
            :aria-invalid="Boolean(errosCampos.jurosRotativoMensal)"
            :aria-describedby="errosCampos.jurosRotativoMensal ? 'erro-cartao-juros-rotativo' : undefined"
          />
          <p
            v-if="errosCampos.jurosRotativoMensal"
            id="erro-cartao-juros-rotativo"
            class="nexus-error"
            role="alert"
          >
            {{ errosCampos.jurosRotativoMensal }}
          </p>
        </div>

        <div class="min-w-0">
          <label for="cartao-juros-mora" class="nexus-label">
            Juros de mora (% ao mês)
          </label>
          <input
            id="cartao-juros-mora"
            v-model="formulario.jurosMoraMensal"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Ex.: 1,00"
            class="nexus-input w-full min-w-0 max-w-full box-border"
            :aria-invalid="Boolean(errosCampos.jurosMoraMensal)"
            :aria-describedby="errosCampos.jurosMoraMensal ? 'erro-cartao-juros-mora' : undefined"
          />
          <p
            v-if="errosCampos.jurosMoraMensal"
            id="erro-cartao-juros-mora"
            class="nexus-error"
            role="alert"
          >
            {{ errosCampos.jurosMoraMensal }}
          </p>
        </div>

        <div class="min-w-0">
          <label for="cartao-multa-atraso" class="nexus-label">
            Multa por atraso (%)
          </label>
          <input
            id="cartao-multa-atraso"
            v-model="formulario.multaAtraso"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="Ex.: 2,00"
            class="nexus-input w-full min-w-0 max-w-full box-border"
            :aria-invalid="Boolean(errosCampos.multaAtraso)"
            :aria-describedby="errosCampos.multaAtraso ? 'erro-cartao-multa-atraso' : undefined"
          />
          <p
            v-if="errosCampos.multaAtraso"
            id="erro-cartao-multa-atraso"
            class="nexus-error"
            role="alert"
          >
            {{ errosCampos.multaAtraso }}
          </p>
        </div>
      </div>

      <p class="mt-3 text-xs text-slate-500">
        Taxas cadastradas não geram cobranças automaticamente.
      </p>
    </section>

    <p class="mt-1 text-sm text-slate-500">
      Por segurança, não informe o número completo do cartão nem o CVV.
    </p>

    <div class="flex min-w-0 flex-col-reverse items-stretch gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
      <button
        type="button"
        class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 sm:w-auto shadow-sm outline-none transition-[transform,box-shadow,background-color] duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-slate-200 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        @click="emit('cancelar')"
      >
        <X :size="16" />
        Cancelar
      </button>

      <button
        type="submit"
        :disabled="armazenamentoProtegido || salvando"
        class="btn btn-primary btn-premium-fintech w-full sm:w-auto"
      >
        <Save :size="16" />
        {{ salvando ? 'Salvando...' : emEdicao ? 'Salvar alterações' : 'Cadastrar cartão' }}
      </button>
    </div>
  </form>
</template>