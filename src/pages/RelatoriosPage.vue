
<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'

import {
  ChartBar,
  ChartPie,
  ChartColumnIncreasing,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-vue-next'

import CardFinanceiro from '../components/CardFinanceiro.vue'
import EstadoVazio from '../components/EstadoVazio.vue'
import { useFinancas } from '../composables/useFinancas.js'
import { usePrivacidade } from '../composables/usePrivacidade.js'

// =====================================================
// DADOS FINANCEIROS
// =====================================================

const {
  moeda,
  nomeMes,
  receitas,
  despesas,
  resultado,
  categorias
} = useFinancas()

const { ocultarValores, valorVisivel } = usePrivacidade()

const receitasMes = computed(() => receitas())
const despesasMes = computed(() => despesas())
const resultadoMes = computed(() => resultado())
const mesAtual = computed(() => nomeMes())
const categoriasMes = computed(() => categorias())

// =====================================================
// INDICADORES FINANCEIROS
// =====================================================

const percentualUtilizado = computed(() => {
  if (receitasMes.value <= 0) return null

  return (
    despesasMes.value / receitasMes.value
  ) * 100
})

const percentualPreservado = computed(() => {
  if (receitasMes.value <= 0) return null

  return (
    resultadoMes.value / receitasMes.value
  ) * 100
})

const percentualBarra = computed(() => {
  if (percentualPreservado.value === null) {
    return 0
  }

  return Math.max(
    0,
    Math.min(100, percentualPreservado.value)
  )
})

function formatarPercentual(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return 'N/A'
  }

  return numero.toFixed(1).replace('.', ',') + '%'
}

const percentualResultado = computed(() => {
  if (percentualPreservado.value === null) {
    return null
  }

  return Math.abs(percentualPreservado.value)
})

// =====================================================
// SITUAÇÃO FINANCEIRA
// =====================================================

const situacaoFinanceira = computed(() => {
  if (
    receitasMes.value <= 0 &&
    despesasMes.value <= 0
  ) {
    return 'sem-movimento'
  }

  if (receitasMes.value <= 0) {
    return 'sem-receitas'
  }

  if (resultadoMes.value < 0) {
    return 'negativo'
  }

  if (resultadoMes.value === 0) {
    return 'equilibrado'
  }

  return 'positivo'
})

const textoSituacao = computed(() => {
  switch (situacaoFinanceira.value) {
    case 'positivo':
      return 'Resultado positivo'
    case 'negativo':
      return 'Resultado negativo'
    case 'equilibrado':
      return 'Resultado equilibrado'
    default:
      return 'Sem receitas no período'
  }
})

const tipoCardResultado = computed(() => {
  if (resultadoMes.value > 0) return 'receita'
  if (resultadoMes.value < 0) return 'despesa'
  return 'neutro'
})

// =====================================================
// SEGURANÇA DOS TEXTOS DA LEGENDA
// =====================================================

function escaparHtml(valor) {
  return String(valor ?? '').replace(
    /[&<>"']/g,
    (caractere) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[caractere]
  )
}

// =====================================================
// GRÁFICO DE RECEITAS E DESPESAS
// =====================================================

const seriesComparacao = computed(() => [
  {
    name: 'Receitas',
    data: [receitasMes.value]
  },
  {
    name: 'Despesas',
    data: [despesasMes.value]
  }
])

const opcoesComparacao = computed(() => {
  ocultarValores.value
  return {
  chart: {
    type: 'bar',
    toolbar: {
      show: false
    },
    fontFamily: 'inherit'
  },

  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '38%',
      borderRadius: 7
    }
  },

  colors: ['#10b981', '#f43f5e'],

  dataLabels: {
    enabled: false
  },

  xaxis: {
    categories: [mesAtual.value]
  },

  yaxis: {
    labels: {
      formatter: (valor) =>
        valorVisivel(moeda(valor))
    }
  },

  tooltip: {
    y: {
      formatter: (valor) => valorVisivel(moeda(valor))
    }
  },

  legend: {
    position: 'bottom'
  },

  grid: {
    borderColor: '#e2e8f0',
    strokeDashArray: 4
  },

  noData: {
    text: 'Nenhum dado disponível'
  }
  }
})

// =====================================================
// GRÁFICO DE DESPESAS POR CATEGORIA
// =====================================================

const seriesCategorias = computed(() =>
  categoriasMes.value.map(
    (categoria) => Number(categoria.valor) || 0
  )
)

const opcoesCategorias = computed(() => {
  ocultarValores.value
  return {
  chart: {
    type: 'donut',
    fontFamily: 'inherit',
    toolbar: {
      show: false
    }
  },

  labels: categoriasMes.value.map(
    (categoria) => categoria.nome
  ),

  colors: [
    '#10b981',
    '#0d9488',
    '#38bdf8',
    '#818cf8',
    '#f59e0b',
    '#fb7185',
    '#64748b'
  ],

  stroke: {
    width: 3,
    colors: ['#ffffff']
  },

  dataLabels: {
    enabled: false
  },

  plotOptions: {
    pie: {
      donut: {
        size: '74%',

labels: {
  show: true,

  name: {
    show: true,
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    offsetY: -8
  },

  value: {
    show: true,
    fontSize: '17px',
    fontWeight: 700,
    color: '#14233f',
    offsetY: 8,
    formatter: (valor) => valorVisivel(moeda(Number(valor)))
  },

  total: {
    show: true,
    label: 'Total de despesas',
    fontSize: '12px',
    fontWeight: 500,
    color: '#64748b',
    formatter: () => valorVisivel(moeda(despesasMes.value))
  }
}

      }
    }
  },

  legend: {
    show: true,
    position: 'right',
    fontSize: '13px',
    width: 180,

    formatter: (nome, opts) => {
      const valores = opts.w.globals.series

      const total = valores.reduce(
        (soma, valor) => soma + valor,
        0
      )

      const valor = valores[opts.seriesIndex] ?? 0

      const percentual = total > 0
        ? Math.round((valor / total) * 100)
        : 0

      return `
        <span class="donut-legenda-conteudo">
          <span>${escaparHtml(nome)}</span>
          <strong>${percentual}%</strong>
        </span>
      `
    }
  },

  tooltip: {
    y: {
      formatter: (valor) => valorVisivel(moeda(valor))
    }
  },

  responsive: [
    {
      breakpoint: 768,
      options: {
        legend: {
          position: 'bottom'
        }
      }
    }
  ]
  }
})

// =====================================================
// GRÁFICO RADIAL
// =====================================================

// O gráfico representa a receita preservada.
// Se houver déficit, a preservação será zero.
// O percentual de déficit aparece nos indicadores.
const seriesRadial = computed(() => [
  percentualBarra.value
])

const opcoesRadial = computed(() => ({
  chart: {
    type: 'radialBar',
    fontFamily: 'inherit',
    toolbar: {
      show: false
    }
  },

  colors: [
    situacaoFinanceira.value === 'negativo'
      ? '#f43f5e'
      : '#10b981'
  ],

  plotOptions: {
    radialBar: {
      startAngle: -135,
      endAngle: 135,

      hollow: {
        size: '68%'
      },

      track: {
        background: '#e8edf3',
        strokeWidth: '100%'
      },

      dataLabels: {
        name: {
          show: true,
          offsetY: 22,
          color: '#64748b',
          fontSize: '13px'
        },

        value: {
          show: true,
          offsetY: -18,
          fontSize: '28px',
          fontWeight: 700,
          color: '#14233f',

          formatter: (valor) =>
            formatarPercentual(valor)
        }
      }
    }
  },

  labels: ['Receita preservada'],

  stroke: {
    lineCap: 'round'
  }
}))
</script>

<template>
  <div class="relatorios-page">

    <!-- CARDS FINANCEIROS -->

    <div class="cards-grid">

      <CardFinanceiro
        titulo="Receitas do mês"
        :valor="valorVisivel(moeda(receitasMes))"
        tipo="receita"
      />

      <CardFinanceiro
        titulo="Despesas do mês"
        :valor="valorVisivel(moeda(despesasMes))"
        tipo="despesa"
      />

      <CardFinanceiro
        titulo="Resultado do mês"
        :valor="valorVisivel(moeda(resultadoMes))"
        :tipo="tipoCardResultado"
      />

    </div>

    <!-- GRÁFICOS PRINCIPAIS -->

    <div class="relatorios-grid">

      <!-- COMPARAÇÃO FINANCEIRA -->

      <section class="painel painel-comparacao-premium">

        <h2 class="titulo-categorias-premium">
          <span
            class="icone-categorias-premium"
            aria-hidden="true"
          >
            <ChartColumnIncreasing :size="20" :stroke-width="2" />
          </span>

          Receitas × Despesas
        </h2>

        <p class="texto-apoio">
          Comparativo financeiro · {{ mesAtual }}
        </p>

        <div class="comparacao-premium">
          <VueApexCharts
            type="bar"
            height="300"
            :options="opcoesComparacao"
            :series="seriesComparacao"
          />
        </div>

        <div
          class="comparacao-premium-resultado"
          :class="{ negativo: resultadoMes < 0 }"
        >
          <div>
            <span>Resultado do mês</span>
            <strong>{{ valorVisivel(moeda(resultadoMes)) }}</strong>
          </div>

          <div class="comparacao-premium-percentual">

            <strong>
              {{
                percentualResultado === null
                  ? 'N/A'
                  : formatarPercentual(percentualResultado)
              }}
            </strong>

            <span v-if="percentualResultado === null">
              Percentual não aplicável
            </span>

            <span v-else-if="resultadoMes < 0">
              Déficit em relação à receita
            </span>

            <span v-else>
              da receita preservada
            </span>

          </div>
        </div>

      </section>

      <!-- DESPESAS POR CATEGORIA -->

      <section class="painel">

        <h2 class="titulo-categorias-premium">
          <span
            class="icone-categorias-premium"
            aria-hidden="true"
          >
            <ChartPie :size="20" :stroke-width="2" />
          </span>

          Despesas por categoria
        </h2>

        <p class="texto-apoio">
          Participação de cada categoria nos gastos
        </p>

        <EstadoVazio
          v-if="!categoriasMes.length"
          icone="pie"
          mensagem="Nenhuma despesa neste mês."
        />

        <div v-else class="grafico-donut-premium">
          <VueApexCharts
            type="donut"
            height="320"
            :options="opcoesCategorias"
            :series="seriesCategorias"
          />
        </div>

      </section>

    </div>

    <!-- ANÁLISE FINANCEIRA DO MÊS -->

    <section class="painel resumo-final resumo-analitico">

      <div class="resumo-analitico-cabecalho">

        <div class="resumo-analitico-titulo">

          <span
            class="icone-categorias-premium"
            :class="{
              'icone-resultado-negativo':
                situacaoFinanceira === 'negativo'
            }"
            aria-hidden="true"
          >
            <TrendingUp
              v-if="situacaoFinanceira === 'positivo'"
              :size="20"
              :stroke-width="2"
            />

            <TrendingDown
              v-else-if="situacaoFinanceira === 'negativo'"
              :size="20"
              :stroke-width="2"
            />

            <Minus
              v-else
              :size="20"
              :stroke-width="2"
            />
          </span>

          <div>
            <h2>Análise financeira do mês</h2>
            <p class="texto-apoio">{{ mesAtual }}</p>
          </div>

        </div>

        <span
          class="resumo-analitico-status"
          :class="situacaoFinanceira"
        >
          {{ textoSituacao }}
        </span>

      </div>

      <!-- MENSAGEM ANALÍTICA -->

      <div class="resumo-analitico-mensagem">

        <template v-if="situacaoFinanceira === 'positivo'">
          Suas receitas superaram as despesas em
          <strong class="texto-verde">
            {{ valorVisivel(moeda(resultadoMes)) }}
          </strong>.
          Você utilizou
          <strong>
            {{ formatarPercentual(percentualUtilizado) }}
          </strong>
          do valor recebido e preservou
          <strong class="texto-verde">
            {{ formatarPercentual(percentualPreservado) }}
          </strong>
          das receitas neste período.
        </template>

        <template v-else-if="situacaoFinanceira === 'negativo'">
          Suas despesas superaram as receitas em
          <strong class="texto-vermelho">
            {{ valorVisivel(moeda(Math.abs(resultadoMes))) }}
          </strong>.
          Os gastos corresponderam a
          <strong>
            {{ formatarPercentual(percentualUtilizado) }}
          </strong>
          das receitas do período.
        </template>

        <template v-else-if="situacaoFinanceira === 'equilibrado'">
          As receitas e despesas ficaram equilibradas em
          <strong>{{ valorVisivel(moeda(receitasMes)) }}</strong>.
          Não houve resultado positivo nem negativo neste mês.
        </template>

        <template v-else-if="situacaoFinanceira === 'sem-receitas'">
          Não foram registradas receitas neste mês.
          As despesas totalizaram
          <strong class="texto-vermelho">
            {{ valorVisivel(moeda(despesasMes)) }}
          </strong>.
          O percentual não é aplicável sem receitas.
        </template>

        <template v-else>
          Nenhuma receita ou despesa foi registrada em
          <strong>{{ mesAtual }}</strong>.
          Cadastre movimentações para visualizar
          a análise financeira.
        </template>

      </div>

      <!-- INDICADORES E GRÁFICO RADIAL -->

      <template v-if="percentualPreservado !== null">

        <div class="resumo-analitico-indicadores">
          <span>Distribuição das receitas</span>

          <strong
            :class="{
              'texto-vermelho': resultadoMes < 0
            }"
          >
            {{ formatarPercentual(percentualResultado) }}
            {{ resultadoMes < 0 ? 'de déficit' : 'preservado' }}
          </strong>
        </div>

        <div class="resumo-radial-horizontal">

          <div class="resumo-radial-premium">
            <VueApexCharts
              type="radialBar"
              height="280"
              :options="opcoesRadial"
              :series="seriesRadial"
            />
          </div>

          <div class="resumo-radial-detalhes">

            <span class="resumo-radial-subtitulo">
              Resultado do mês
            </span>

            <strong
              class="resumo-radial-valor"
              :class="{ negativo: resultadoMes < 0 }"
            >
              {{ valorVisivel(moeda(resultadoMes)) }}
            </strong>

            <div class="resumo-radial-separador"></div>

            <div
              class="resumo-radial-informacao"
              :class="{ negativo: resultadoMes < 0 }"
            >
              <TrendingUp
                v-if="resultadoMes >= 0"
                :size="18"
              />

              <TrendingDown
                v-else
                :size="18"
              />

              <span>
                {{ formatarPercentual(percentualResultado) }}
                {{ resultadoMes < 0 ? 'de déficit' : 'preservado' }}
              </span>
            </div>

            <div class="resumo-radial-informacao utilizado">
              <span class="resumo-radial-ponto"></span>
              <span>
                {{ formatarPercentual(percentualUtilizado) }}
                utilizado
              </span>
            </div>

          </div>

        </div>

        <div class="resumo-analitico-legenda">

          <span>
            <i class="resumo-analitico-ponto preservado"></i>
            Receita preservada
          </span>

          <span>
            <i class="resumo-analitico-ponto utilizado"></i>
            Despesas do período
          </span>

        </div>

      </template>

    </section>

  </div>
</template>
