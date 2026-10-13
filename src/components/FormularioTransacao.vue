

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['adicionar'])

const tipo = ref('despesa')
const descricao = ref('')
const valor = ref('')
const data = ref(new Date().toLocaleDateString('en-CA'))
const categoria = ref('Alimentação')
const erro = ref('')

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

// Cadastra uma transação
function cadastrar() {
  if (mostrarNovaCategoria.value) {
    erro.value =
      'Salve ou cancele a nova categoria antes de cadastrar.'
    return
  }

  if (
    !descricao.value.trim() ||
    !data.value ||
    !categoria.value ||
    !(Number(valor.value) > 0)
  ) {
    erro.value =
      'Preencha a descrição, data, categoria e um valor maior que zero.'
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
        :class="{ selecionado: tipo === 'receita' }"
        @click="trocarTipo('receita')"
      >
        ＋ Receita
      </button>

      <button
        type="button"
        :class="{ selecionado: tipo === 'despesa' }"
        @click="trocarTipo('despesa')"
      >
        − Despesa
      </button>
    </div>

    <form @submit.prevent="cadastrar">
      <label>
        Descrição
        <input
          v-model="descricao"
          placeholder="Ex.: Supermercado"
          maxlength="60"
        />
      </label>

      <label>
        Valor (R$)
        <input
          v-model="valor"
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0,00"
        />
      </label>

      <label>
        Data
        <input v-model="data" type="date" />
      </label>

      <!-- Seleção de categorias -->
      <label>
        Categoria

        <select
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
        class="btn btn-primary botao-cheio"
        type="submit"
      >
        ＋ Adicionar transação
      </button>
    </form>
  </section>
</template>
