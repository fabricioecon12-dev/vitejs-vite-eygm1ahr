<script setup>
import { reactive, ref, watch } from 'vue'
import { Building2, PlusCircle } from '@lucide/vue'
import { useFinancas } from '../composables/useFinancas.js'
import SeletorInstituicao from './SeletorInstituicao.vue'

const props = defineProps({
  contaEdicao: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['conta-cadastrada', 'conta-editada', 'cancelar-edicao'])

const {
  adicionarConta,
  editarConta,
  armazenamentoProtegido,
  aviso
} = useFinancas()

const formulario = reactive({
  nome: '',
  instituicao: '',
  tipo: 'corrente',
  agencia: '',
  numero: '',
  saldoInicial: ''
})

function preencherDadosEdicao(conta) {
  if (!conta) {
    return
  }

  formulario.nome = conta.nome ?? ''
  formulario.instituicao = conta.instituicao ?? ''
  formulario.tipo = conta.tipo ?? 'corrente'
  formulario.agencia = conta.agencia ?? ''
  formulario.numero = conta.numero ?? ''
}



const erro = ref('')
const sucesso = ref('')

const errosCampos = reactive({
  nome: '',
  instituicao: '',
  saldoInicial: '',
  agencia: '',
  numero: ''
})

function limparErrosCampos() {
  Object.keys(errosCampos).forEach(campo => {
    errosCampos[campo] = ''
  })
}

watch(
  () => props.contaEdicao,
  (conta, contaAnterior) => {
    erro.value = ''
    sucesso.value = ''
    limparErrosCampos()

    if (conta) {
      preencherDadosEdicao(conta)
      return
    }

    // Limpar ao sair da edição, preservando o cadastro inicial.
    if (contaAnterior) {
      formulario.nome = ''
      formulario.instituicao = ''
      formulario.tipo = 'corrente'
      formulario.agencia = ''
      formulario.numero = ''
      formulario.saldoInicial = ''
    }
  },
  { immediate: true }
)

function converterSaldoInicial(valorInformado) {
  const texto = String(valorInformado)
    .trim()
    .replace(/\s/g, '')
    .replace(/^(-?)R\$/, '$1')

  const formatoValido =
    /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/

  if (!formatoValido.test(texto)) {
    return NaN
  }

  return Number(
    texto.replace(/\./g, '').replace(',', '.')
  )
}

function formatarSaldoInicial() {
  const numero = converterSaldoInicial(formulario.saldoInicial)

  if (!Number.isFinite(numero)) {
    return
  }

  formulario.saldoInicial = numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
function validarCampos() {
  limparErrosCampos()

  if (!formulario.nome.trim()) {
    errosCampos.nome = 'Informe o nome da conta.'
  } else if (formulario.nome.trim().length > 100) {
    errosCampos.nome = 'O nome deve ter até 100 caracteres.'
  }

  if (!formulario.instituicao.trim()) {
    errosCampos.instituicao = 'Informe a instituição financeira.'
  } else if (formulario.instituicao.trim().length > 100) {
    errosCampos.instituicao = 'A instituição deve ter até 100 caracteres.'
  }

  const saldo = formulario.saldoInicial.trim() === ''
    ? 0
    : converterSaldoInicial(formulario.saldoInicial)

  if (!props.contaEdicao && !Number.isFinite(saldo)) {
    errosCampos.saldoInicial =
      'Informe um saldo inicial válido, com até duas casas decimais.'
  }

  if (formulario.agencia.length > 20) {
    errosCampos.agencia = 'A agência deve ter até 20 caracteres.'
  }

  if (formulario.numero.length > 30) {
    errosCampos.numero = 'O número da conta deve ter até 30 caracteres.'
  }

  return !Object.values(errosCampos).some(Boolean)
}
function cadastrarConta() {
  erro.value = ''
  sucesso.value = ''

  if (armazenamentoProtegido.value) {
    erro.value = 'O armazenamento financeiro está protegido.'
    return
  }

  if (!validarCampos()) {
    return
  }

  const nome = formulario.nome.trim()
  const instituicao = formulario.instituicao.trim()

  if (!nome || !instituicao) {
    erro.value = 'Informe o nome da conta e a instituição financeira.'
    return
  }

  if (nome.length > 100 || instituicao.length > 100) {
    erro.value = 'Nome e instituição devem ter até 100 caracteres.'
    return
  }

  if (formulario.agencia.length > 20 || formulario.numero.length > 30) {
    erro.value = 'Verifique o tamanho da agência e do número da conta.'
    return
  }

  const saldoInicial = formulario.saldoInicial.trim() === ''
    ? 0
    : converterSaldoInicial(formulario.saldoInicial)

  if (!Number.isFinite(saldoInicial)) {
    erro.value = 'Informe um saldo inicial válido, com até duas casas decimais.'
    return
  }

  if (!Number.isFinite(saldoInicial)) {
    erro.value = 'O saldo inicial informado é inválido.'
    return
  }

  const cadastrado = adicionarConta({
    nome,
    instituicao,
    tipo: formulario.tipo,
    agencia: formulario.agencia.trim(),
    numero: formulario.numero.trim(),
    saldoInicial
  })

  if (!cadastrado) {
    erro.value = aviso.value || 'Não foi possível cadastrar a conta.'
    return
  }

  formulario.nome = ''
  formulario.instituicao = ''
  formulario.tipo = 'corrente'
  formulario.agencia = ''
  formulario.numero = ''
  formulario.saldoInicial = ''

  sucesso.value = 'Conta bancária cadastrada com sucesso!'
  emit('conta-cadastrada')
}
function salvarEdicaoConta() {
  erro.value = ''
  sucesso.value = ''

  const conta = props.contaEdicao

  if (!conta || conta.id == null) {
    erro.value = 'Nenhuma conta válida foi selecionada para edição.'
    return
  }

  if (armazenamentoProtegido.value) {
    erro.value = 'O armazenamento financeiro está protegido.'
    return
  }

  if (!validarCampos()) {
    return
  }

  const dadosAtualizados = {
    nome: formulario.nome.trim(),
    instituicao: formulario.instituicao.trim(),
    tipo: formulario.tipo,
    agencia: formulario.agencia.trim(),
    numero: formulario.numero.trim()
  }

  const atualizado = editarConta(conta.id, dadosAtualizados)

  if (!atualizado) {
    erro.value = aviso.value || 'Não foi possível atualizar a conta.'
    return
  }

  sucesso.value = 'Conta bancária atualizada com sucesso!'
  emit('conta-editada', conta.id)
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
      <div class="rounded-xl bg-emerald-50 p-3 text-emerald-600">
        <Building2 :size="23" />
      </div>

      <div>
        <h3 class="text-lg font-bold text-slate-800">
          {{ props.contaEdicao ? 'Editar conta bancária' : 'Cadastrar conta bancária' }}
        </h3>
        <p class="mt-1 text-sm text-slate-500">
          {{ props.contaEdicao ? 'Atualize os dados cadastrais sem alterar o saldo ou as movimentações.' : 'Adicione uma conta para organizar suas movimentações.' }}
        </p>
      </div>
    </div>

    <form class="formulario space-y-3" novalidate @submit.prevent="props.contaEdicao ? salvarEdicaoConta() : cadastrarConta()">
      <div class="grid gap-x-4 gap-y-3 md:grid-cols-2">
        <div>
          <label for="conta-nome" class="nexus-label">
            Nome da conta
          </label>
          <input
            id="conta-nome"
            v-model="formulario.nome"
            @input="errosCampos.nome = ''"
            type="text"
            maxlength="100"
            placeholder="Ex.: Minha conta pessoal"
            :aria-invalid="!!errosCampos.nome"
            class="nexus-input"

          />
          <span v-if="errosCampos.nome" class="nexus-error" role="alert">
            {{ errosCampos.nome }}
          </span>
        </div>

        <div>
          <SeletorInstituicao
            v-model="formulario.instituicao"
            :disabled="armazenamentoProtegido"
            :invalido="!!errosCampos.instituicao"
            @update:modelValue="errosCampos.instituicao = ''"
          />
          <span v-if="errosCampos.instituicao" class="nexus-error" role="alert">
            {{ errosCampos.instituicao }}
          </span>
        </div>

        <div>
          <label for="conta-tipo" class="nexus-label">
            Tipo de conta
          </label>
          <select
            id="conta-tipo"
            v-model="formulario.tipo"
            class="nexus-select"
          >
            <option value="corrente">Conta corrente</option>
            <option value="poupanca">Conta poupança</option>
            <option value="pagamento">Conta de pagamento</option>
          </select>
        </div>

        <div v-if="!props.contaEdicao">
          <label for="conta-saldo" class="nexus-label">
            Saldo inicial (R$)
          </label>
          <input
            id="conta-saldo"
            v-model="formulario.saldoInicial"
            @input="errosCampos.saldoInicial = ''"
            @focus="$event.target.select()"
            @blur="formatarSaldoInicial"
            type="text"
            inputmode="decimal"
            placeholder="0,00"
            :aria-invalid="!!errosCampos.saldoInicial"
            class="nexus-input"

          />
          <span v-if="errosCampos.saldoInicial" class="nexus-error" role="alert">
            {{ errosCampos.saldoInicial }}
          </span>
        </div>

        <div>
          <label for="conta-agencia" class="nexus-label">
            Agência (opcional)
          </label>
          <input
            id="conta-agencia"
            v-model="formulario.agencia"
            @input="errosCampos.agencia = ''"
            type="text"
            maxlength="20"
            :aria-invalid="!!errosCampos.agencia"
            class="nexus-input"

          />
          <span v-if="errosCampos.agencia" class="nexus-error" role="alert">
            {{ errosCampos.agencia }}
          </span>
        </div>

        <div>
          <label for="conta-numero" class="nexus-label">
            Número da conta (opcional)
          </label>
          <input
            id="conta-numero"
            v-model="formulario.numero"
            @input="errosCampos.numero = ''"
            type="text"
            maxlength="30"
            :aria-invalid="!!errosCampos.numero"
            class="nexus-input"

          />
          <span v-if="errosCampos.numero" class="nexus-error" role="alert">
            {{ errosCampos.numero }}
          </span>
        </div>
      </div>

      <p v-if="erro" role="alert" class="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        {{ erro }}
      </p>

      <p v-if="sucesso" role="status" class="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
        {{ sucesso }}
      </p>

      <div class="flex flex-col-reverse justify-end gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
        <button
        v-if="props.contaEdicao"
        type="button"
        class="inline-flex min-h-[50px] w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
        @click="emit('cancelar-edicao')"
      >
        Cancelar
      </button>
        <button
        type="submit"
        :disabled="armazenamentoProtegido"
        class="inline-flex min-h-[50px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_12px_rgba(5,150,105,0.16)] transition-all duration-300 hover:-translate-y-0.5 hover:brightness-[0.82] hover:shadow-[0_8px_22px_rgba(5,150,105,0.28)] active:translate-y-0 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
      >
        <PlusCircle :size="19" />
        <strong>{{ props.contaEdicao ? 'Salvar alterações' : 'Cadastrar conta' }}</strong>
      </button>
      </div>
    </form>
  </section>
</template>
