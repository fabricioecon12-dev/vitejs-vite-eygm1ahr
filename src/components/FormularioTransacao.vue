
<script setup>
import { ref, nextTick, watch, computed } from 'vue'
import { FilePlus2 } from 'lucide-vue-next'
import { useFinancas } from '../composables/useFinancas.js'

// =====================================================
// PROPRIEDADES E EVENTOS
// =====================================================

const props = defineProps({
  transacaoEdicao: {
    type: Object,
    default: null
  },

  // Incrementado pela página somente após
  // a confirmação de um cadastro bem-sucedido.
  cadastroConfirmado: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits([
  'adicionar',
  'salvar-edicao',
  'cancelar-edicao'
])

// =====================================================
// ESTADO FINANCEIRO COMPARTILHADO
// =====================================================

const {
  categoriasDespesa,
  categoriasReceita,
  adicionarCategoria
} = useFinancas()

// =====================================================
// DATA LOCAL
// =====================================================

function obterDataLocal() {
  const hoje = new Date()

  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

// =====================================================
// CAMPOS DO FORMULÁRIO
// =====================================================

const tipo = ref('despesa')
const descricao = ref('')
const valor = ref('')
const data = ref(obterDataLocal())
const categoria = ref('Alimentação')

const erro = ref('')

const errosCampos = ref({
  descricao: '',
  valor: '',
  data: '',
  categoria: ''
})

// =====================================================
// CATEGORIAS PERSONALIZADAS
// =====================================================

const mostrarNovaCategoria = ref(false)
const novaCategoria = ref('')
const erroCategoria = ref('')
const inputNovaCategoria = ref(null)

// Categorias disponíveis para o tipo selecionado.
const categoriasDisponiveis = computed(() => {
  const lista = tipo.value === 'receita'
    ? categoriasReceita.value
    : categoriasDespesa.value

  // Não modifica a lista compartilhada.
  // Se uma transação antiga possuir uma categoria
  // ausente da lista, ela continua visível na edição.
  if (
    props.transacaoEdicao &&
    props.transacaoEdicao.tipo === tipo.value &&
    categoria.value &&
    !lista.includes(categoria.value)
  ) {
    return [...lista, categoria.value]
  }

  return lista
})

// Coloca o foco no campo ao abrir o cadastro
// de uma nova categoria.
watch(mostrarNovaCategoria, async (mostrar) => {
  if (mostrar) {
    await nextTick()
    inputNovaCategoria.value?.focus()
  }
})

// =====================================================
// LIMPEZA E RESTAURAÇÃO DO FORMULÁRIO
// =====================================================

function limparErros() {
  erro.value = ''

  errosCampos.value = {
    descricao: '',
    valor: '',
    data: '',
    categoria: ''
  }
}

function limparCadastroCategoria() {
  mostrarNovaCategoria.value = false
  novaCategoria.value = ''
  erroCategoria.value = ''
}

function limparFormulario() {
  tipo.value = 'despesa'
  descricao.value = ''
  valor.value = ''
  data.value = obterDataLocal()
  categoria.value = 'Alimentação'

  limparCadastroCategoria()
  limparErros()
}

// =====================================================
// CONTROLE DE EDIÇÃO
// =====================================================

watch(
  () => props.transacaoEdicao,
  (transacao) => {
    if (!transacao) {
      limparFormulario()
      return
    }

    tipo.value = transacao.tipo
    descricao.value = transacao.descricao

    valor.value = Number(transacao.valor).toLocaleString(
      'pt-BR',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )

    data.value = transacao.data
    categoria.value = transacao.categoria

    // Não adiciona categorias diretamente
    // ao estado financeiro compartilhado.
    limparCadastroCategoria()
    limparErros()
  }
)

// =====================================================
// CONFIRMAÇÃO DE CADASTRO
// =====================================================

// A página incrementa cadastroConfirmado somente
// quando adicionar() retorna true.
//
// Se o salvamento falhar, a propriedade não muda
// e os campos permanecem preenchidos.
watch(
  () => props.cadastroConfirmado,
  (novoValor, valorAnterior) => {
    if (
      novoValor > valorAnterior &&
      !props.transacaoEdicao
    ) {
      limparFormulario()
    }
  }
)

// =====================================================
// FORMATAÇÃO MONETÁRIA
// =====================================================

function converterValor(valorInformado) {
  const texto = String(valorInformado).trim()

  if (!texto) {
    return NaN
  }

  const formatoValido =
    /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/

  if (!formatoValido.test(texto)) {
    return NaN
  }

  const normalizado = texto
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(normalizado)
}

function formatarValorMonetario() {
  const numero = converterValor(valor.value)

  if (!Number.isFinite(numero)) {
    return
  }

  valor.value = numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// =====================================================
// ALTERNÂNCIA ENTRE RECEITA E DESPESA
// =====================================================

function trocarTipo(novo) {
  if (novo !== 'receita' && novo !== 'despesa') {
    return
  }

  tipo.value = novo

  categoria.value =
    novo === 'receita' ? 'Salário' : 'Alimentação'

  limparCadastroCategoria()
  limparErros()
}

// =====================================================
// SELEÇÃO DE CATEGORIA
// =====================================================

function selecionarCategoria(event) {
  const selecionada = event.target.value

  if (selecionada === '__nova__') {
    mostrarNovaCategoria.value = true
    novaCategoria.value = ''
    erroCategoria.value = ''
    errosCampos.value.categoria = ''
    return
  }

  categoria.value = selecionada

  limparCadastroCategoria()
  errosCampos.value.categoria = ''
}

// =====================================================
// CADASTRO DE NOVA CATEGORIA
// =====================================================

function cadastrarCategoria() {
  const nome = novaCategoria.value.trim()

  erroCategoria.value = ''

  if (!nome) {
    erroCategoria.value =
      'Informe o nome da categoria.'
    return
  }

  if (nome.length > 40) {
    erroCategoria.value =
      'O nome da categoria deve ter até 40 caracteres.'
    return
  }

  const lista = tipo.value === 'receita'
    ? categoriasReceita.value
    : categoriasDespesa.value

  const jaExiste = lista.some(
    item =>
      item.toLowerCase() === nome.toLowerCase()
  )

  if (jaExiste) {
    erroCategoria.value =
      'Essa categoria já existe.'
    return
  }

  // A função compartilhada realiza a persistência
  // antes de atualizar a lista de categorias.
  const sucesso = adicionarCategoria(
    nome,
    tipo.value
  )

  if (!sucesso) {
    erroCategoria.value =
      'Não foi possível salvar a categoria. Verifique o armazenamento.'
    return
  }

  categoria.value = nome

  limparCadastroCategoria()
  errosCampos.value.categoria = ''
  erro.value = ''
}

function cancelarCategoria() {
  limparCadastroCategoria()
}

// =====================================================
// VALIDAÇÃO DE DATA
// =====================================================

function dataValida(valor) {
  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return false
  }

  const [ano, mes, dia] = valor
    .split('-')
    .map(Number)

  if (ano < 2000 || ano > 2100) {
    return false
  }

  const dataVerificada = new Date(0)

  dataVerificada.setFullYear(
    ano,
    mes - 1,
    dia
  )

  return (
    dataVerificada.getFullYear() === ano &&
    dataVerificada.getMonth() === mes - 1 &&
    dataVerificada.getDate() === dia
  )
}

// =====================================================
// VALIDAÇÃO DOS CAMPOS
// =====================================================

function validarCampos() {
  limparErros()

  if (!descricao.value.trim()) {
    errosCampos.value.descricao =
      'Informe a descrição da transação.'
  }

  if (valor.value.trim() === '') {
    errosCampos.value.valor =
      'Informe o valor da transação.'
  } else {
    const valorNumerico = converterValor(
      valor.value
    )

    if (
      !Number.isFinite(valorNumerico) ||
      valorNumerico <= 0
    ) {
      errosCampos.value.valor =
        'Informe um valor válido e maior que zero.'
    }
  }

  if (!dataValida(data.value)) {
    errosCampos.value.data =
      'Data inválida. Verifique a data informada.'
  }

  if (!categoria.value) {
    errosCampos.value.categoria =
      'Selecione uma categoria.'
  }

  return !Object.values(
    errosCampos.value
  ).some(Boolean)
}

// =====================================================
// CANCELAMENTO DA EDIÇÃO
// =====================================================

function cancelarEdicao() {
  limparFormulario()

  emit('cancelar-edicao')
}

// =====================================================
// CADASTRO E SALVAMENTO DE TRANSAÇÕES
// =====================================================

function cadastrar() {
  if (mostrarNovaCategoria.value) {
    erro.value =
      'Salve ou cancele a nova categoria antes de cadastrar.'
    return
  }

  if (!validarCampos()) {
    return
  }

  const dadosTransacao = {
    descricao: descricao.value.trim(),
    valor: converterValor(valor.value),
    data: data.value,
    categoria: categoria.value,
    tipo: tipo.value
  }

  // Edição: a página executa editar().
  // O formulário será restaurado pelo watcher
  // quando a página encerrar a edição.
  if (props.transacaoEdicao) {
    emit('salvar-edicao', {
      id: props.transacaoEdicao.id,
      dados: dadosTransacao
    })

    return
  }

  // Cadastro: não limpa os campos aqui.
  // Aguarda a confirmação da página.
  emit('adicionar', dadosTransacao)
}
</script>

<template>
  <section class="painel formulario">

    <div class="secao-topo">
      <h2 class="titulo-categorias-premium">
        <span
          class="icone-categorias-premium"
          aria-hidden="true"
        >
          <FilePlus2
            :size="20"
            :stroke-width="2"
          />
        </span>

        {{
          props.transacaoEdicao
            ? 'Editar transação'
            : 'Nova transação'
        }}
      </h2>

      <p>
        {{
          props.transacaoEdicao
            ? 'Atualize os dados da movimentação financeira'
            : 'Registre suas receitas e despesas'
        }}
      </p>
    </div>

    <!-- SELEÇÃO DO TIPO -->

    <div class="tipo-seletor">

      <button
        type="button"
        class="rounded-xl transition-all duration-300 hover:shadow-md"
        :class="{ selecionado: tipo === 'receita' }"
        :aria-pressed="tipo === 'receita'"
        @click="trocarTipo('receita')"
      >
        ＋ Receita
      </button>

      <button
        type="button"
        class="rounded-xl transition-all duration-300 hover:shadow-md"
        :class="{ selecionado: tipo === 'despesa' }"
        :aria-pressed="tipo === 'despesa'"
        @click="trocarTipo('despesa')"
      >
        − Despesa
      </button>

    </div>

    <!-- FORMULÁRIO -->

    <form
      novalidate
      @submit.prevent="cadastrar"
    >

      <!-- DESCRIÇÃO -->

      <label>
        Descrição

        <input
          v-model="descricao"
          :class="[
            'transition-all duration-300 focus:ring-2',
            errosCampos.descricao
              ? 'border-red-500 focus:ring-red-200'
              : 'focus:ring-emerald-200'
          ]"
          :aria-invalid="!!errosCampos.descricao"
          :aria-describedby="
            errosCampos.descricao
              ? 'erro-descricao'
              : undefined
          "
          placeholder="Ex.: Supermercado"
          maxlength="60"
        />

        <span
          v-if="errosCampos.descricao"
          id="erro-descricao"
          class="text-red-600 text-sm mt-1 block"
          role="alert"
        >
          {{ errosCampos.descricao }}
        </span>
      </label>

      <!-- VALOR -->

      <label>
        Valor (R$)

        <input
          v-model="valor"
          type="text"
          inputmode="decimal"
          placeholder="0,00"
          :class="[
            'transition-all duration-300 focus:ring-2',
            errosCampos.valor
              ? 'border-red-500 focus:ring-red-200'
              : 'focus:ring-emerald-200'
          ]"
          :aria-invalid="!!errosCampos.valor"
          :aria-describedby="
            errosCampos.valor
              ? 'erro-valor'
              : undefined
          "
          @blur="formatarValorMonetario"
        />

        <span
          v-if="errosCampos.valor"
          id="erro-valor"
          class="text-red-600 text-sm mt-1 block"
          role="alert"
        >
          {{ errosCampos.valor }}
        </span>
      </label>

      <!-- DATA -->

      <label>
        Data

        <input
          v-model="data"
          type="date"
          min="2000-01-01"
          max="2100-12-31"
          :class="[
            'transition-all duration-300 focus:ring-2',
            errosCampos.data
              ? 'border-red-500 focus:ring-red-200'
              : 'focus:ring-emerald-200'
          ]"
          :aria-invalid="!!errosCampos.data"
          :aria-describedby="
            errosCampos.data
              ? 'erro-data'
              : undefined
          "
        />

        <span
          v-if="errosCampos.data"
          id="erro-data"
          class="text-red-600 text-sm mt-1 block"
          role="alert"
        >
          {{ errosCampos.data }}
        </span>
      </label>

      <!-- CATEGORIA -->

      <label>
        Categoria

        <select
          :value="
            mostrarNovaCategoria
              ? '__nova__'
              : categoria
          "
          :class="[
            'transition-all duration-300 focus:ring-2',
            errosCampos.categoria
              ? 'border-red-500 focus:ring-red-200'
              : 'focus:ring-emerald-200'
          ]"
          :aria-invalid="!!errosCampos.categoria"
          :aria-describedby="
            errosCampos.categoria
              ? 'erro-categoria'
              : undefined
          "
          @change="selecionarCategoria"
        >

          <option
            v-for="opcao in categoriasDisponiveis"
            :key="opcao"
            :value="opcao"
          >
            {{ opcao }}
          </option>

          <option value="__nova__">
            ＋ Nova categoria
          </option>

        </select>

        <span
          v-if="errosCampos.categoria"
          id="erro-categoria"
          class="text-red-600 text-sm mt-1 block"
          role="alert"
        >
          {{ errosCampos.categoria }}
        </span>
      </label>

      <!-- NOVA CATEGORIA -->

      <div v-if="mostrarNovaCategoria">

        <label>
          Nome da nova categoria

          <input
            ref="inputNovaCategoria"
            v-model="novaCategoria"
            placeholder="Ex.: Educação"
            maxlength="40"
          />
        </label>

        <p
          v-if="erroCategoria"
          class="mensagem-erro"
          role="alert"
        >
          {{ erroCategoria }}
        </p>

        <div class="categoria-acoes">

          <button
            type="button"
            class="btn btn-primary"
            @click="cadastrarCategoria"
          >
            Salvar categoria
          </button>

          <button
            type="button"
            class="btn btn-outline"
            @click="cancelarCategoria"
          >
            Cancelar
          </button>

        </div>
      </div>

      <!-- ERRO GERAL -->

      <p
        v-if="erro"
        class="mensagem-erro"
        role="alert"
      >
        {{ erro }}
      </p>

      <!-- SALVAR -->

      <button
        type="submit"
        class="btn btn-primary botao-cheio rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      >
        {{
          props.transacaoEdicao
            ? 'Salvar alterações'
            : '＋ Adicionar transação'
        }}
      </button>

      <!-- CANCELAR EDIÇÃO -->

      <button
        v-if="props.transacaoEdicao"
        type="button"
        class="btn btn-outline botao-cheio rounded-xl transition-all duration-300"
        @click="cancelarEdicao"
      >
        Cancelar edição
      </button>

    </form>

  </section>
</template>
