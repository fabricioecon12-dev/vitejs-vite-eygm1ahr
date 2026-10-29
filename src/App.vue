
<script setup>
import { ref, watch, nextTick } from 'vue'

import MenuLateral from './components/MenuLateral.vue'
import Cabecalho from './components/Cabecalho.vue'
import CardFinanceiro from './components/CardFinanceiro.vue'
import FormularioTransacao from './components/FormularioTransacao.vue'
import ItemTransacao from './components/ItemTransacao.vue'
import ListaTransacoes from './components/ListaTransacoes.vue'
import ResumoOrcamento from './components/ResumoOrcamento.vue'
import Rodape from './components/Rodape.vue'

// ESTADO PRINCIPAL
const hoje = new Date()

const pagina = ref('inicio')
const aviso = ref('')

const mesSelecionado = ref(
  new Date(hoje.getFullYear(), hoje.getMonth(), 1)
)

const saldoInicial = ref(5380)
const transacoes = ref([])
const limites = ref({})
const limiteEditando = ref('4.000,00')

let proximoId = 1

// PERSISTÊNCIA LOCAL — NEXUS FINANÇAS
const CHAVE_ARMAZENAMENTO = 'nexus-financas-dados-v1'
let bloqueioPersistencia = false

// Salva as informações financeiras no navegador
function salvarDadosLocais() {
  if (bloqueioPersistencia) {
  console.warn(
    'Salvamento bloqueado: os dados armazenados estão protegidos.'
  )
  return
}
  try {
    const dados = {
      transacoes: transacoes.value,
      limites: limites.value,
      saldoInicial: saldoInicial.value,
      proximoId
    }

    localStorage.setItem(
      CHAVE_ARMAZENAMENTO,
      JSON.stringify(dados)
    )
  } catch (erro) {
    console.error(
      'Não foi possível salvar os dados do Nexus Finanças:',
      erro
    )

    aviso.value =
      'Erro ao salvar os dados financeiros. Verifique o armazenamento do navegador.'
  }
}
// Verifica a integridade de cada transação armazenada
// Verifica se uma data existe no calendário
function dataArmazenadaValida(data) {
  if (
    typeof data !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(data)
  ) {
    return false
  }

  const [ano, mes, dia] = data.split('-').map(Number)

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
function transacaoArmazenadaValida(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    !Array.isArray(item) &&
    Number.isSafeInteger(item.id) &&
    item.id > 0 &&
    typeof item.descricao === 'string' &&
    item.descricao.trim().length > 0 &&
    typeof item.valor === 'number' &&
    Number.isFinite(item.valor) &&
    item.valor > 0 &&
    (item.tipo === 'receita' || item.tipo === 'despesa') &&
    typeof item.categoria === 'string' &&
    item.categoria.trim().length > 0 &&
    dataArmazenadaValida(item.data)
  )
}
// Verifica se os identificadores das transações são únicos
function identificadoresUnicos(transacoesArmazenadas) {
  if (!Array.isArray(transacoesArmazenadas)) {
    return false
  }

  const identificadores = transacoesArmazenadas.map(
    item => item?.id
  )

  return new Set(identificadores).size === identificadores.length
}
// Verifica a integridade dos limites mensais armazenados
function limitesArmazenadosValidos(limitesArmazenados) {
  if (
    !limitesArmazenados ||
    typeof limitesArmazenados !== 'object' ||
    Array.isArray(limitesArmazenados)
  ) {
    return false
  }

  return Object.entries(limitesArmazenados).every(
    ([mes, valor]) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
        return false
      }

      return (
        typeof valor === 'number' &&
        Number.isFinite(valor) &&
        valor >= 0
      )
    }
  )
}
// Recupera as informações financeiras armazenadas
function carregarDadosLocais() {
  try {
    const dadosSalvos = localStorage.getItem(CHAVE_ARMAZENAMENTO)

    // Primeiro acesso: ainda não existem dados armazenados
    if (dadosSalvos === null) {
      return false
    }

    const dados = JSON.parse(dadosSalvos)

    // Verifica a estrutura básica dos dados armazenados
    if (
     !dados ||
     !Array.isArray(dados.transacoes) ||
     !dados.transacoes.every(transacaoArmazenadaValida) ||
     !identificadoresUnicos(dados.transacoes) ||
     !limitesArmazenadosValidos(dados.limites) ||
    !Number.isFinite(dados.saldoInicial)
    ) {
      throw new Error('Estrutura de dados inválida.')
   }

    transacoes.value = dados.transacoes
    limites.value = dados.limites
    saldoInicial.value = dados.saldoInicial

    // Evita reutilizar identificadores de transações
    const maiorId = transacoes.value.reduce(
      (maior, item) => Math.max(maior, Number(item.id) || 0),
      0
    )

    proximoId = Math.max(
      maiorId + 1,
      Number.isSafeInteger(dados.proximoId) ? dados.proximoId : 1
    )

    return true
  } catch (erro) {
    console.error(
      'Não foi possível recuperar os dados do Nexus Finanças:',
      erro
    )

    return false
  }
}

// FUNÇÕES AUXILIARES
// Converte valores monetários brasileiros em números
function converterLimiteMonetario(valorInformado) {
  const texto = String(valorInformado).trim()

  if (!texto) return NaN

  const formatoValido =
    /^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/

  if (!formatoValido.test(texto)) {
    return NaN
  }

  const valorNormalizado = texto
    .replace(/\./g, '')
    .replace(',', '.')

  return Number(valorNormalizado)
}
// Formata o limite mensal ao sair do campo
function formatarLimiteMonetario() {
  const valor = converterLimiteMonetario(limiteEditando.value)

  // Não formata valores inválidos
  if (!Number.isFinite(valor) || valor < 0) {
    return
  }

  limiteEditando.value = valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function moeda(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function mesChave(data = mesSelecionado.value) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

function nomeMes() {
  const nome = mesSelecionado.value.toLocaleDateString(
    'pt-BR',
    { month: 'long', year: 'numeric' }
  )

  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

function mudarMes(direcao) {
  mesSelecionado.value = new Date(
    mesSelecionado.value.getFullYear(),
    mesSelecionado.value.getMonth() + direcao,
    1
  )

  limiteEditando.value = Number(limiteAtual()).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})
  aviso.value = ''
}

function dataMes(dia, deslocamento = 0) {
  const data = new Date(
    hoje.getFullYear(),
    hoje.getMonth() + deslocamento,
    dia,
    12
  )

  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const diaFormatado = String(data.getDate()).padStart(2, '0')

  return `${ano}-${mes}-${diaFormatado}`
}

// DADOS DEMONSTRATIVOS
function demonstracao() {
  if (armazenamentoProtegido.value) {
    aviso.value =
      'Restauração bloqueada: os dados armazenados precisam ser verificados.'
    return
  }
  proximoId = 1

  const exemplos = [
    {
      descricao: 'Salário',
      valor: 4500,
      tipo: 'receita',
      categoria: 'Salário',
      data: dataMes(25)
    },
    {
      descricao: 'Freelance',
      valor: 1000,
      tipo: 'receita',
      categoria: 'Serviços',
      data: dataMes(18)
    },
    {
      descricao: 'Supermercado',
      valor: 760,
      tipo: 'despesa',
      categoria: 'Alimentação',
      data: dataMes(23)
    },
    {
      descricao: 'Aluguel',
      valor: 620,
      tipo: 'despesa',
      categoria: 'Moradia',
      data: dataMes(20)
    },
    {
      descricao: 'Transporte',
      valor: 260,
      tipo: 'despesa',
      categoria: 'Transporte',
      data: dataMes(16)
    },
    {
      descricao: 'Farmácia',
      valor: 180,
      tipo: 'despesa',
      categoria: 'Saúde',
      data: dataMes(12)
    },
    {
      descricao: 'Lazer',
      valor: 140,
      tipo: 'despesa',
      categoria: 'Lazer',
      data: dataMes(10)
    },
    {
      descricao: 'Outros gastos',
      valor: 220,
      tipo: 'despesa',
      categoria: 'Outros',
      data: dataMes(8)
    },
    {
      descricao: 'Internet',
      valor: 100,
      tipo: 'despesa',
      categoria: 'Moradia',
      data: dataMes(5)
    },
    {
      descricao: 'Compra anterior',
      valor: 150,
      tipo: 'despesa',
      categoria: 'Outros',
      data: dataMes(14, -1)
    }
  ]

  transacoes.value = exemplos.map(item => ({
    ...item,
    id: proximoId++
  }))

  saldoInicial.value = 5380

  mesSelecionado.value = new Date(
    hoje.getFullYear(),
    hoje.getMonth(),
    1
  )

  limites.value = {
    [mesChave()]: 4000
  }

  limiteEditando.value = '4.000,00'
  aviso.value = 'Dados demonstrativos restaurados.'
}

// CÁLCULOS FINANCEIROS
function doMes() {
  return transacoes.value
    .filter(item => item.data.slice(0, 7) === mesChave())
    .sort((a, b) =>
      b.data.localeCompare(a.data) || b.id - a.id
    )
}

function somar(lista, tipo) {
  return lista
    .filter(item => item.tipo === tipo)
    .reduce((total, item) => total + item.valor, 0)
}

function receitas() {
  return somar(doMes(), 'receita')
}

function despesas() {
  return somar(doMes(), 'despesa')
}

function resultado() {
  return receitas() - despesas()
}

function saldo() {
  const ultimoDia = new Date(
    mesSelecionado.value.getFullYear(),
    mesSelecionado.value.getMonth() + 1,
    0
  )

  const ano = ultimoDia.getFullYear()
  const mes = String(ultimoDia.getMonth() + 1).padStart(2, '0')
  const dia = String(ultimoDia.getDate()).padStart(2, '0')
  const limiteData = `${ano}-${mes}-${dia}`

  const ateMes = transacoes.value.filter(
    item => item.data <= limiteData
  )

  return (
    saldoInicial.value +
    somar(ateMes, 'receita') -
    somar(ateMes, 'despesa')
  )
}

function limiteAtual() {
  return limites.value[mesChave()] || 0
}

// AÇÕES DO USUÁRIO
function adicionar(transacao) {
    // Impede alterações enquanto o armazenamento estiver protegido
    if (armazenamentoProtegido.value) {
    aviso.value =
      'Cadastro bloqueado: não foi possível recuperar os dados armazenados.'
    return
  }
    // Segunda camada de proteção para datas inválidas
  const dataInformada = transacao.data

  if (
    typeof dataInformada !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dataInformada)
  ) {
    aviso.value = 'Data inválida. Transação não cadastrada.'
    return
  }

  const [ano, mes, dia] = dataInformada.split('-').map(Number)

  const dataVerificada = new Date(0)
  dataVerificada.setFullYear(ano, mes - 1, dia)

  if (
    ano < 2000 ||
    ano > 2100 ||
    dataVerificada.getFullYear() !== ano ||
    dataVerificada.getMonth() !== mes - 1 ||
    dataVerificada.getDate() !== dia
  ) {
    aviso.value =
    'Data inválida. Verifique a data informada.'
    return
  }

    // Armazena a transação somente após validar a data
    transacoes.value.push({
    ...transacao,
    id: proximoId++
  })

    mesSelecionado.value = new Date(
    Number(transacao.data.slice(0, 4)),
    Number(transacao.data.slice(5, 7)) - 1,
    1
  )

  limiteEditando.value = String(limiteAtual())
  aviso.value = 'Transação adicionada com sucesso!'
}

function excluir(id) {
    // Impede exclusões enquanto o armazenamento estiver protegido
    if (armazenamentoProtegido.value) {
    aviso.value =
      'Exclusão bloqueada: não foi possível recuperar os dados armazenados.'
    return
  }
  if (!confirm('Deseja excluir esta transação?')) {
    return
  }

  transacoes.value = transacoes.value.filter(
    item => item.id !== id
  )

  aviso.value = 'Transação excluída.'
}

function limpar() {
  if (armazenamentoProtegido.value) {
  aviso.value =
    'Operação bloqueada: não foi possível recuperar os dados armazenados.'
  return
}
  const confirmou = confirm(
    'Limpar todas as transações e orçamentos? ' +
    'Você poderá restaurar os exemplos.'
  )

  if (!confirmou) return

  transacoes.value = []
  limites.value = {}
  saldoInicial.value = 0
  limiteEditando.value = '0,00'

  aviso.value = 'Dados limpos. Você pode começar do zero.'
}

function salvarLimite() {
    // Impede alterações no orçamento quando o armazenamento estiver protegido
    if (armazenamentoProtegido.value) {
    aviso.value =
      'Alteração bloqueada: não foi possível recuperar os dados armazenados.'
    return
  }
  const valor = converterLimiteMonetario(limiteEditando.value)

  if (!Number.isFinite(valor) || valor < 0) {
    aviso.value = 'Informe um limite válido.'
    return
  }

  limites.value = {
    ...limites.value,
    [mesChave()]: valor
  }

  aviso.value = 'Limite mensal atualizado.'
}

function categorias() {
  const mapa = {}

  doMes()
    .filter(item => item.tipo === 'despesa')
    .forEach(item => {
      mapa[item.categoria] =
        (mapa[item.categoria] || 0) + item.valor
    })

  return Object.entries(mapa)
    .sort((a, b) => b[1] - a[1])
    .map(([nome, valor]) => ({ nome, valor }))
}

function maxCategoria() {
  return Math.max(
    ...categorias().map(item => item.valor),
    1
  )
}

const titulos = {
  inicio: [
    'Visão geral',
    'Acompanhe seu resumo financeiro'
  ],
  transacoes: [
    'Transações',
    'Cadastre e gerencie suas movimentações'
  ],
  orcamento: [
    'Orçamento',
    'Defina seu limite e acompanhe seus gastos'
  ],
  relatorios: [
    'Relatórios',
    'Analise seus resultados e visualize seus gastos'
  ]
}

// INICIALIZAÇÃO — NEXUS FINANÇAS
// Recupera os dados salvos ou carrega os exemplos no primeiro acesso
const dadosRecuperados = carregarDadosLocais()
bloqueioPersistencia = !dadosRecuperados

let armazenamentoInicializado = false
const armazenamentoProtegido = ref(!dadosRecuperados)

if (!dadosRecuperados) {
  let armazenamentoVazio = false

  try {
    armazenamentoVazio =
      localStorage.getItem(CHAVE_ARMAZENAMENTO) === null
  } catch (erro) {
    console.error(
      'Não foi possível verificar o armazenamento local:',
      erro
    )
  }

  if (armazenamentoVazio) {
  armazenamentoProtegido.value = false
  bloqueioPersistencia = false
  demonstracao()
  salvarDadosLocais()
  armazenamentoInicializado = true
  } else {
    aviso.value =
      'Não foi possível recuperar os dados armazenados. ' +
      'Os registros existentes foram preservados.'
  }
}

// Mantém o campo do orçamento formatado
limiteEditando.value = Number(
  limites.value[mesChave()] ?? 0
).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

if (dadosRecuperados) {
  aviso.value = ''
}
// SALVAMENTO AUTOMÁTICO — NEXUS FINANÇAS
watch(
  [transacoes, limites, saldoInicial],
  () => {
    if (dadosRecuperados || armazenamentoInicializado) {
      salvarDadosLocais()
    }
  },
  { deep: true }
)
// NEXUS FINANÇAS — Navegação com retorno ao topo
async function navegarPara(destino) {
  pagina.value = destino
  aviso.value = ''

  await nextTick()

  window.scrollTo(0, 0)
}


</script>

<template>
  <div class="app-layout">
    <MenuLateral
      :pagina="pagina"
      @navegar="navegarPara($event)"
    />

    <div class="area-principal">
      <Cabecalho
        :titulo="titulos[pagina][0]"
        :subtitulo="titulos[pagina][1]"
        :mes="nomeMes()"
        :mostrar-novo="pagina === 'inicio'"
        @mes-anterior="mudarMes(-1)"
        @mes-seguinte="mudarMes(1)"
        @nova-transacao="navegarPara('transacoes')"
      />

      <main>
         
          <p
           v-if="aviso"
            class="aviso"
           :class="{ erro: aviso === 'Informe um limite válido.' }"
           :role="aviso === 'Informe um limite válido.' ? 'alert' : 'status'"
            >
          {{ aviso }}
          <button
            aria-label="Fechar mensagem"
            @click="aviso = ''"
          >
            ✕
          </button>
        </p>

        <!-- VISÃO GERAL -->
        <template v-if="pagina === 'inicio'">
          <section class="saldo-destaque">
            <div>
              <p>Saldo disponível até {{ nomeMes() }}</p>
              <strong>{{ moeda(saldo()) }}</strong>
              <small>Seu dinheiro, suas decisões.</small>
            </div>

            <div class="saldo-desenho">▰</div>
          </section>

          <div class="cards-grid">
            <CardFinanceiro
              titulo="Receitas do mês"
              :valor="moeda(receitas())"
              tipo="receita"
              detalhe="Entradas no período"
            />

            <CardFinanceiro
              titulo="Despesas do mês"
              :valor="moeda(despesas())"
              tipo="despesa"
              detalhe="Saídas no período"
            />

            <CardFinanceiro
              titulo="Resultado do mês"
              :valor="moeda(resultado())"
              tipo="resultado"
              detalhe="Receitas menos despesas"
            />
          </div>

          <div class="painel-grid">
            <section class="painel">
              <div class="secao-titulo">
                <h2>Últimas movimentações</h2>
                <button
                  class="link-botao"
                  @click="navegarPara('transacoes')"
                >
                  Ver todas →
                </button>
              </div>

              <template v-if="doMes().length">
                <ItemTransacao
                  v-for="item in doMes().slice(0, 5)"
                  :key="item.id"
                  :transacao="item"
                />
              </template>

              <div v-else class="estado-vazio">
                Nenhuma movimentação neste mês.
              </div>
            </section>

            <div class="coluna-paineis">
              <ResumoOrcamento
                :limite="limiteAtual()"
                :gasto="despesas()"
              />

              <section class="painel">
                <div class="secao-titulo">
                  <h2>Gastos por categoria</h2>
                  <button
                    class="link-botao"
                    @click="navegarPara('relatorios')"
                  >
                    Detalhes →
                  </button>
                </div>

                <div
                  v-if="!categorias().length"
                  class="estado-vazio"
                >
                  Sem despesas no período.
                </div>

                <div
                  v-for="categoria in categorias().slice(0, 5)"
                  :key="categoria.nome"
                  class="categoria-linha"
                >
                  <span>{{ categoria.nome }}</span>

                  <div class="barra pequena">
                    <div
                      :style="{
                        width:
                          categoria.valor / maxCategoria() *
                          100 + '%'
                      }"
                    ></div>
                  </div>

                  <strong>
                    {{ moeda(categoria.valor) }}
                  </strong>
                </div>
              </section>
            </div>
          </div>
        </template>

        <!-- TRANSAÇÕES -->
        <template v-else-if="pagina === 'transacoes'">
          <div class="transacoes-grid">
            <FormularioTransacao
              @adicionar="adicionar"
            />

            <ListaTransacoes
              :transacoes="doMes()"
              @excluir="excluir"
            />
          </div>
        </template>

        <!-- ORÇAMENTO -->
        <template v-else-if="pagina === 'orcamento'">
          <div class="cards-grid">
            <CardFinanceiro
              titulo="Limite do mês"
              :valor="moeda(limiteAtual())"
              detalhe="Planejamento mensal"
            />

            <CardFinanceiro
              titulo="Valor utilizado"
              :valor="moeda(despesas())"
              tipo="despesa"
              detalhe="Despesas do período"
            />

            <CardFinanceiro
              titulo="Valor restante"
              :valor="moeda(limiteAtual() - despesas())"
              tipo="receita"
              detalhe="Limite menos despesas"
            />
          </div>

          <div class="orcamento-grid">
            <section class="painel">
              <h2>Definir orçamento</h2>

              <p class="texto-apoio">
                Escolha quanto pretende gastar em
                {{ nomeMes() }}.
              </p>

              <form
                class="form-limite"
                @submit.prevent="salvarLimite"
              >
                <label>
                  Limite mensal (R$)
                  <input
                  v-model="limiteEditando"
                  type="text"
                  inputmode="decimal"
                  placeholder="0,00"
                  autocomplete="off"
                 @blur="formatarLimiteMonetario"
                />
                </label>

                <button
                  class="btn btn-primary"
                  type="submit"
                >
                  Salvar limite
                </button>
              </form>

              <ResumoOrcamento
                :limite="limiteAtual()"
                :gasto="despesas()"
              />
            </section>

            <section class="painel">
              <h2>Gastos por categoria</h2>

              <p class="texto-apoio">
                Entenda como o orçamento está sendo utilizado.
              </p>

              <div
                v-if="!categorias().length"
                class="estado-vazio"
              >
                Nenhuma despesa neste mês.
              </div>

              <div
                v-for="categoria in categorias()"
                :key="categoria.nome"
                class="categoria-linha"
              >
                <span>{{ categoria.nome }}</span>

                <div class="barra pequena">
                  <div
                    :style="{
                      width:
                        categoria.valor / maxCategoria() *
                        100 + '%'
                    }"
                  ></div>
                </div>

                <strong>
                  {{ moeda(categoria.valor) }}
                </strong>
              </div>

              <p
                v-if="
                  limiteAtual() > 0 &&
                  despesas() >= limiteAtual()
                "
                class="mensagem-erro"
              >
                Você atingiu ou ultrapassou o limite mensal.
              </p>

              <p
                v-else-if="
                  limiteAtual() > 0 &&
                  despesas() >= limiteAtual() * 0.8
                "
                class="mensagem-alerta"
              >
                Atenção: seus gastos estão próximos do limite.
              </p>
            </section>
          </div>
        </template>

        <!-- RELATÓRIOS -->
        <template v-else-if="pagina === 'relatorios'">
          <div class="cards-grid">
            <CardFinanceiro
              titulo="Receitas do mês"
              :valor="moeda(receitas())"
              tipo="receita"
            />

            <CardFinanceiro
              titulo="Despesas do mês"
              :valor="moeda(despesas())"
              tipo="despesa"
            />

            <CardFinanceiro
              titulo="Resultado do mês"
              :valor="moeda(resultado())"
              tipo="resultado"
            />
          </div>

          <div class="relatorios-grid">
            <section class="painel">
              <h2>Receitas × Despesas</h2>

              <p class="texto-apoio">
                Comparação no mês selecionado
              </p>

              <div class="comparacao">
                <div>
                  <span>Receitas</span>

                  <div class="barra">
                    <div
                      class="verde"
                      :style="{
                        width:
                          (
                            Math.max(receitas(), despesas())
                              ? receitas() /
                                Math.max(receitas(), despesas()) *
                                100
                              : 0
                          ) + '%'
                      }"
                    ></div>
                  </div>

                  <strong>{{ moeda(receitas()) }}</strong>
                </div>

                <div>
                  <span>Despesas</span>

                  <div class="barra">
                    <div
                      class="vermelho"
                      :style="{
                        width:
                          (
                            Math.max(receitas(), despesas())
                              ? despesas() /
                                Math.max(receitas(), despesas()) *
                                100
                              : 0
                          ) + '%'
                      }"
                    ></div>
                  </div>

                  <strong>{{ moeda(despesas()) }}</strong>
                </div>
              </div>
            </section>

            <section class="painel">
              <h2>Despesas por categoria</h2>

              <p class="texto-apoio">
                Participação de cada categoria nos gastos
              </p>

              <div
                v-if="!categorias().length"
                class="estado-vazio"
              >
                Nenhuma despesa no período.
              </div>

              <div
                v-for="categoria in categorias()"
                :key="categoria.nome"
                class="categoria-linha"
              >
                <span>{{ categoria.nome }}</span>

                <div class="barra pequena">
                  <div
                    :style="{
                      width:
                        (
                          despesas()
                            ? categoria.valor / despesas() * 100
                            : 0
                        ) + '%'
                    }"
                  ></div>
                </div>

                <strong>
                  {{
                    despesas()
                      ? Math.round(
                          categoria.valor / despesas() * 100
                        )
                      : 0
                  }}%
                </strong>
              </div>
            </section>
          </div>

          <section class="painel resumo-final">
            <h2>Resumo financeiro</h2>

            <p>
              Em <strong>{{ nomeMes() }}</strong>,
              você recebeu
              <strong class="texto-verde">
                {{ moeda(receitas()) }}
              </strong>
              e gastou
              <strong class="texto-vermelho">
                {{ moeda(despesas()) }}
              </strong>.
              O resultado do mês foi de
              <strong>{{ moeda(resultado()) }}</strong>.
            </p>
          </section>
        </template>
      </main>
      

      <!-- MODO DEMONSTRATIVO -->
      <section class="ferramentas-demo">
        <div>
          <strong>Modo demonstrativo</strong>
          <p>
            Experimente os recursos ou comece
            com seus próprios dados.
          </p>
        </div>

        <div class="ferramentas-acoes">
          <button
            class="btn btn-outline"
            @click="limpar"
          >
            Limpar dados
          </button>

          <button
            class="btn btn-outline"
            @click="demonstracao"
          >
            Restaurar exemplos
          </button>
        </div>
      </section>

      <Rodape />
    </div>
  </div>
</template>
