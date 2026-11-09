<script setup>
import { computed } from 'vue'
import { ChartBar, TrendingUp } from 'lucide-vue-next'
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
    <div class="comparacao-premium-item">
      <div class="comparacao-premium-cabecalho">
        <span class="comparacao-premium-legenda">
          <span class="comparacao-premium-ponto receita"></span>
          Receitas
        </span>
        <strong>{{ moeda(receitas()) }}</strong>
      </div>

      <div class="comparacao-premium-barra">
        <div
          class="comparacao-premium-preenchimento receita"
          :style="{
            width: (
              Math.max(receitas(), despesas())
                ? receitas() / Math.max(receitas(), despesas()) * 100
                : 0
            ) + '%'
          }"
        ></div>
      </div>
    </div>

    <div class="comparacao-premium-item">
      <div class="comparacao-premium-cabecalho">
        <span class="comparacao-premium-legenda">
          <span class="comparacao-premium-ponto despesa"></span>
          Despesas
        </span>
        <strong>{{ moeda(despesas()) }}</strong>
      </div>

      <div class="comparacao-premium-barra">
        <div
          class="comparacao-premium-preenchimento despesa"
          :style="{
            width: (
              Math.max(receitas(), despesas())
                ? despesas() / Math.max(receitas(), despesas()) * 100
                : 0
            ) + '%'
          }"
        ></div>
      </div>
    </div>
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
                icone="chatbar"
                mensagem="Nenhuma despesa neste mês."
               />

              <div
                v-for="categoria in categorias()"
                :key="categoria.nome"
                class="categoria-linha"
              >
                <span>{{ categoria.nome }}</span>

                <div class="barra pequena">
                  <div
                    :style="{
                      width:(
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

          <section class="painel resumo-final resumo-analitico">
  <div class="resumo-analitico-cabecalho">
    <div class="resumo-analitico-titulo">
      <span class="icone-categorias-premium" aria-hidden="true">
        <TrendingUp :size="20" :stroke-width="2" />
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
      <strong>
        {{ formatarPercentual(percentualPreservado) }}
        preservado
      </strong>
    </div>

    <div
      class="resumo-analitico-barra"
      role="img"
      :aria-label="
        'Receita preservada: ' +
        formatarPercentual(percentualPreservado) +
        '. Despesas: ' +
        formatarPercentual(percentualUtilizado)
      "
    >
      <div
        class="resumo-analitico-preservado"
        :style="{ width: percentualBarra + '%' }"
      ></div>
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