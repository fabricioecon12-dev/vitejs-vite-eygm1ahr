<script setup>
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import { ChartBar, TrendingUp, TrendingDown, Minus } from 'lucide-vue-next'
import CardFinanceiro from '../components/CardFinanceiro.vue'
import { useFinancas } from '../composables/useFinancas.js'
import EstadoVazio from '../components/EstadoVazio.vue'

const {
  moeda,
  nomeMes,
  receitas,
  despesas,
  resultado,
  categorias,
  maxCategoria
} = useFinancas()
const percentualUtilizado = computed(() => {
  if (receitas() <= 0) return null

  return despesas() / receitas() * 100
})

const percentualPreservado = computed(() => {
  if (receitas() <= 0) return null

  return resultado() / receitas() * 100
})

const percentualBarra = computed(() => {
  if (percentualPreservado.value === null) return 0

  return Math.max(0, Math.min(100, percentualPreservado.value))
})

const formatarPercentual = (valor) =>
  valor.toFixed(1).replace('.', ',') + '%'

const situacaoFinanceira = computed(() => {
  if (receitas() <= 0 && despesas() <= 0) return 'sem-movimento'
  if (receitas() <= 0) return 'sem-receitas'
  if (resultado() < 0) return 'negativo'
  if (resultado() === 0) return 'equilibrado'

  return 'positivo'
})

const seriesComparacao = computed(() => [
  {
    name: 'Receitas',
    data: [receitas()]
  },
  {
    name: 'Despesas',
    data: [despesas()]
  }
])

const opcoesComparacao = computed(() => ({
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
    categories: [nomeMes()]
  },

  yaxis: {
    labels: {
      formatter: (valor) =>
        'R$ ' + valor.toLocaleString('pt-BR', {
          maximumFractionDigits: 0
        })
    }
  },

  tooltip: {
    y: {
      formatter: (valor) => moeda(valor)
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
}))
const seriesCategorias = computed(() =>
  categorias().map((categoria) => categoria.valor)
)

const opcoesCategorias = computed(() => ({
  chart: {
    type: 'donut',
    fontFamily: 'inherit',
    toolbar: {
      show: false
    }
  },

  labels: categorias().map((categoria) => categoria.nome),

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
        size: '70%',
        labels: {
          show: true,
          name: {
            show: true
          },
          value: {
            show: true,
            formatter: (valor) => moeda(Number(valor))
          },
          total: {
            show: true,
            label: 'Total de despesas',
            formatter: () => moeda(despesas())
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
    const total = valores.reduce((soma, valor) => soma + valor, 0)
    const valor = valores[opts.seriesIndex] ?? 0

    const percentual = total > 0
      ? Math.round((valor / total) * 100)
      : 0

    return `
      <span class="donut-legenda-conteudo">
        <span>${nome}</span>
        <strong>${percentual}%</strong>
      </span>
    `
  }
},

  tooltip: {
    y: {
      formatter: (valor) => moeda(valor)
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
}))

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
    situacaoFinanceira.value === 'positivo'
      ? '#10b981'
      : '#f43f5e'
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
            
<section class="painel painel-comparacao-premium">
  <h2 class="titulo-categorias-premium">
    <span class="icone-categorias-premium" aria-hidden="true">
      <ChartBar :size="20" :stroke-width="2" />
    </span>
    Receitas × Despesas
  </h2>

  <p class="texto-apoio">
    Comparativo financeiro · {{ nomeMes() }}
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
    :class="{ negativo: resultado() < 0 }"
  >
    <div>
      <span>Resultado do mês</span>
      <strong>{{ moeda(resultado()) }}</strong>
    </div>

    
<div class="comparacao-premium-percentual">
  <strong>
    <template v-if="receitas() <= 0">
      N/A
    </template>

    <template v-else>
      {{
        (
          Math.abs(resultado()) / receitas() * 100
        ).toFixed(1).replace('.', ',')
      }}%
    </template>
  </strong>

  <span v-if="receitas() <= 0">
    Percentual não aplicável
  </span>

  <span v-else-if="resultado() < 0">
    Déficit em relação à receita
  </span>

  <span v-else>
    da receita preservada
  </span>
</div>

  </div>
</section>


            
               <section class="painel">
                 <h2 class="titulo-categorias-premium">
                  <span class="icone-categorias-premium" aria-hidden="true">
                   <ChartBar :size="20" :stroke-width="2" />
                  </span>
                   Despesas por categoria
                </h2>

  <p class="texto-apoio">
    Participação de cada categoria nos gastos
  </p>

               
            <EstadoVazio
                v-if="!categorias().length"
                 icone="chart-pie"
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

          <section class="painel resumo-final resumo-analitico">
  <div class="resumo-analitico-cabecalho">
    <div class="resumo-analitico-titulo">
      <span
  class="icone-categorias-premium"
  :class="{ 'icone-resultado-negativo': situacaoFinanceira === 'negativo' }"
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
        <p class="texto-apoio">{{ nomeMes() }}</p>
      </div>
    </div>

    <span
      class="resumo-analitico-status"
      :class="situacaoFinanceira"
    >
      {{
        situacaoFinanceira === 'positivo'
          ? 'Resultado positivo'
          : situacaoFinanceira === 'negativo'
            ? 'Resultado negativo'
            : situacaoFinanceira === 'equilibrado'
              ? 'Resultado equilibrado'
              : 'Sem receitas no período'
      }}
    </span>
  </div>

  <div class="resumo-analitico-mensagem">
    <template v-if="situacaoFinanceira === 'positivo'">
      Suas receitas superaram as despesas em
      <strong class="texto-verde">{{ moeda(resultado()) }}</strong>.
      Você utilizou
      <strong>{{ formatarPercentual(percentualUtilizado) }}</strong>
      do valor recebido e preservou
      <strong class="texto-verde">
        {{ formatarPercentual(percentualPreservado) }}
      </strong>
      das receitas neste período.
    </template>

    <template v-else-if="situacaoFinanceira === 'negativo'">
      Suas despesas superaram as receitas em
      <strong class="texto-vermelho">
        {{ moeda(Math.abs(resultado())) }}
      </strong>.
      Os gastos corresponderam a
      <strong>{{ formatarPercentual(percentualUtilizado) }}</strong>
      das receitas do período.
    </template>

    <template v-else-if="situacaoFinanceira === 'equilibrado'">
      As receitas e despesas ficaram equilibradas em
      <strong>{{ moeda(receitas()) }}</strong>.
      Não houve resultado positivo nem negativo neste mês.
    </template>

    <template v-else-if="situacaoFinanceira === 'sem-receitas'">
      Não foram registradas receitas neste mês.
      As despesas totalizaram
      <strong class="texto-vermelho">{{ moeda(despesas()) }}</strong>.
      O percentual não é aplicável sem receitas.
    </template>

    <template v-else>
      Nenhuma receita ou despesa foi registrada em
      <strong>{{ nomeMes() }}</strong>.
      Cadastre movimentações para visualizar a análise financeira.
    </template>
  </div>

  
<template v-if="percentualPreservado !== null">
  <div class="resumo-analitico-indicadores">
  <span>Distribuição das receitas</span>

  <strong :class="{ 'texto-vermelho': resultado() < 0 }">
    {{
      resultado() < 0
        ? formatarPercentual(Math.abs(percentualPreservado))
        : formatarPercentual(percentualPreservado)
    }}
    {{ resultado() < 0 ? 'de déficit' : 'preservado' }}
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
      :class="{ negativo: resultado() < 0 }"
    >
  {{ moeda(resultado()) }}
</strong>


    <div class="resumo-radial-separador"></div>

    <div
  class="resumo-radial-informacao"
  :class="{ negativo: resultado() < 0 }"
>
  <TrendingUp
    v-if="resultado() >= 0"
    :size="18"
  />

  <TrendingDown
    v-else
    :size="18"
  />

  <span>
    {{
      resultado() < 0
        ? formatarPercentual(Math.abs(percentualPreservado))
        : formatarPercentual(percentualPreservado)
    }}
    {{ resultado() < 0 ? 'de déficit' : 'preservado' }}
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