

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['adicionar'])

// Obtém a data local no formato YYYY-MM-DD
function obterDataLocal() {
  const hoje = new Date()

  const ano = hoje.getFullYear()
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const dia = String(hoje.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${dia}`
}

const tipo = ref('despesa')
const descricao = ref('')
const valor = ref('')
const data = ref(obterDataLocal())
const categoria = ref('Alimentação')
const erro = ref('')
// Controle de erros individuais dos campos
const errosCampos = ref({
  descricao: '',
  valor: '',
  data: '',
  categoria: ''
})

// Categorias originais
const categoriasDespesa = ref([
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Lazer',
  'Outros'
])

const categoriasReceita = ref([
  'Salário',
  'Serviços',
  'Investimentos',
  'Outros'
])

// Controle do cadastro de novas categorias
const mostrarNovaCategoria = ref(false)
const novaCategoria = ref('')
const erroCategoria = ref('')

// Alterna entre receita e despesa
function trocarTipo(novo) {
  tipo.value = novo

  categoria.value =
    novo === 'receita' ? 'Salário' : 'Alimentação'

  mostrarNovaCategoria.value = false
  novaCategoria.value = ''
  erroCategoria.value = ''
  erro.value = ''

  // Limpa as mensagens de validação ao trocar o tipo
  errosCampos.value = {
    descricao: '',
    valor: '',
    data: '',
    categoria: ''
  }
}

// Identifica quando o usuário escolhe Nova categoria
function selecionarCategoria(event) {
  const selecionada = event.target.value

  if (selecionada === '__nova__') {
    mostrarNovaCategoria.value = true
    novaCategoria.value = ''
    erroCategoria.value = ''
  } else {
    categoria.value = selecionada
    mostrarNovaCategoria.value = false
  }
}

// Cadastra uma categoria temporária
function cadastrarCategoria() {
  const nome = novaCategoria.value.trim()

  if (!nome) {
    erroCategoria.value = 'Informe o nome da categoria.'
    return
  }

  const lista = tipo.value === 'receita'
    ? categoriasReceita.value
    : categoriasDespesa.value

  // Impede categorias duplicadas
  const jaExiste = lista.some(
    item => item.toLowerCase() === nome.toLowerCase()
  )

  if (jaExiste) {
    erroCategoria.value = 'Essa categoria já existe.'
    return
  }

  lista.push(nome)

  // Seleciona automaticamente a nova categoria
  categoria.value = nome

  mostrarNovaCategoria.value = false
  novaCategoria.value = ''
  erroCategoria.value = ''
}

// Cancela o cadastro de categoria
function cancelarCategoria() {
  mostrarNovaCategoria.value = false
  novaCategoria.value = ''
  erroCategoria.value = ''
}

function dataValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false
  }

  const [ano, mes, dia] = valor.split('-').map(Number)

  if (ano < 2000 || ano > 2100) {
    return false
  }

  const dataVerificada = new Date(0)
  dataVerificada.setFullYear(ano, mes - 1, dia)

  return (
    dataVerificada.getFullYear() === ano &&
    dataVerificada.getMonth() === mes - 1 &&
    dataVerificada.getDate() === dia
  )
}

  // Cadastra uma transação
// Identifica os erros de cada campo
function validarCampos() {
  errosCampos.value = {
    descricao: '',
    valor: '',
    data: '',
    categoria: ''
  }

  if (!descricao.value.trim()) {
    errosCampos.value.descricao =
      'Informe a descrição da transação.'
  }

  if (valor.value === '') {
    errosCampos.value.valor =
      'Informe o valor da transação.'
  } else if (
    !Number.isFinite(Number(valor.value)) ||
    Number(valor.value) <= 0
  ) {
    errosCampos.value.valor =
      'O valor deve ser maior que zero.'
  }

  if (!dataValida(data.value)) {
    errosCampos.value.data =
      'Data inválida. Verifique a data informada.'
  }

  if (!categoria.value) {
    errosCampos.value.categoria =
      'Selecione uma categoria.'
  }

  return !Object.values(errosCampos.value).some(Boolean)
}

function cadastrar() {
  if (mostrarNovaCategoria.value) {
    erro.value =
      'Salve ou cancele a nova categoria antes de cadastrar.'
    return
  }

  // Validação individual dos campos
if (!validarCampos()) {
  erro.value = ''
  return
}

    emit('adicionar', {
    descricao: descricao.value.trim(),
    valor: Number(valor.value),
    data: data.value,
    categoria: categoria.value,
    tipo: tipo.value
  })

  descricao.value = ''
  valor.value = ''
  erro.value = ''
}
</script>

<template>
  <section class="painel formulario">
    <div class="secao-topo">
      <h2>Nova transação</h2>
      <p>Registre suas receitas e despesas</p>
    </div>

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

      <form novalidate @submit.prevent="cadastrar">
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
    placeholder="Ex.: Supermercado"
    maxlength="60"
  />

  <span
    v-if="errosCampos.descricao"
    class="text-red-600 text-sm mt-1 block"
    role="alert"
  >
    {{ errosCampos.descricao }}
  </span>
</label>

<label>
  Valor (R$)

  <input
    v-model="valor"
    type="number"
    :class="[
      'transition-all duration-300 focus:ring-2',
      errosCampos.valor
        ? 'border-red-500 focus:ring-red-200'
        : 'focus:ring-emerald-200'
    ]"
    :aria-invalid="!!errosCampos.valor"
    min="0.01"
    step="0.01"
    placeholder="0,00"
  />

  <span
    v-if="errosCampos.valor"
    class="text-red-600 text-sm mt-1 block"
    role="alert"
  >
    {{ errosCampos.valor }}
  </span>
</label>

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
  />

  <span
    v-if="errosCampos.data"
    class="text-red-600 text-sm mt-1 block"
    role="alert"
  >
    {{ errosCampos.data }}
  </span>
</label>

      <!-- Seleção de categorias -->
<label>
  Categoria

  <select
    :class="[
      'transition-all duration-300 focus:ring-2',
      errosCampos.categoria
        ? 'border-red-500 focus:ring-red-200'
        : 'focus:ring-emerald-200'
    ]"
    :aria-invalid="!!errosCampos.categoria"
    :value="mostrarNovaCategoria ? '__nova__' : categoria"
    @change="selecionarCategoria"
  >
          <option
            v-for="opcao in (
              tipo === 'receita'
                ? categoriasReceita
                : categoriasDespesa
            )"
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
  class="text-red-600 text-sm mt-1 block"
  role="alert"
>
  {{ errosCampos.categoria }}
</span>

      </label>

      <!-- Cadastro de nova categoria -->
      <div v-if="mostrarNovaCategoria">
        <label>
          Nome da nova categoria

          <input
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

      <p v-if="erro" class="mensagem-erro" role="alert">
        {{ erro }}
      </p>

      <button
  class="btn btn-primary botao-cheio rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
  type="submit"
>
  ＋ Adicionar transação
</button>
    </form>
  </section>
</template>
