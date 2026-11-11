
<script setup>
import { computed } from 'vue'

import {
  SlidersHorizontal,
  ChartBar
} from 'lucide-vue-next'

import CardFinanceiro from '../components/CardFinanceiro.vue'
import ResumoOrcamento from '../components/ResumoOrcamento.vue'
import EstadoVazio from '../components/EstadoVazio.vue'

import { useFinancas } from '../composables/useFinancas.js'

// =====================================================
// DADOS FINANCEIROS
// =====================================================

const {
  moeda,
  despesas,
  limiteAtual,
  limiteEditando,
  categorias,
  maxCategoria,
  salvarLimite,
  formatarLimiteMonetario
} = useFinancas()

// =====================================================
// INDICADORES DO ORÇAMENTO
// =====================================================

const limiteMensal = computed(() => limiteAtual())

const despesasMensais = computed(() => despesas())

const limiteConfigurado = computed(
  () => limiteMensal.value > 0
)

const limiteExcedido = computed(
  () =>
    limiteConfigurado.value &&
    despesasMensais.value > limiteMensal.value
)

const limiteAtingido = computed(
  () =>
    limiteConfigurado.value &&
    despesasMensais.value === limiteMensal.value
)

const diferencaOrcamento = computed(() => {
  if (!limiteConfigurado.value) {
    return 0
  }

  return Math.abs(
    limiteMensal.value - despesasMensais.value
  )
})

// =====================================================
// TERCEIRO CARD FINANCEIRO
// =====================================================

const tituloSaldo = computed(() => {
  if (!limiteConfigurado.value) {
    return 'Limite não configurado'
  }

  if (limiteExcedido.value) {
    return 'Limite excedido'
  }

  return 'Valor restante'
})

const valorSaldo = computed(() => {
  return limiteConfigurado.value
    ? moeda(diferencaOrcamento.value)
    : '—'
})

const tipoSaldo = computed(() => {
  if (!limiteConfigurado.value || limiteAtingido.value) {
    return 'neutro'
  }

  return limiteExcedido.value
    ? 'despesa'
    : 'receita'
})

const detalheSaldo = computed(() => {
  if (!limiteConfigurado.value) {
    return 'Defina um orçamento mensal'
  }

  if (limiteExcedido.value) {
    return 'Despesas acima do orçamento mensal'
  }

  return 'Limite menos despesas'
})

// =====================================================
// GASTOS POR CATEGORIA
// =====================================================

const categoriasDespesas = computed(() => categorias())

const maiorCategoria = computed(() => maxCategoria())

function percentualCategoria(valor) {
  const gasto = Number(valor)
  const maior = Number(maiorCategoria.value)

  if (
    !Number.isFinite(gasto) ||
    !Number.isFinite(maior) ||
    maior <= 0
  ) {
    return 0
  }

  return Math.min(
    Math.max((gasto / maior) * 100, 0),
    100
  )
}
</script>

<template>
  <div class="orcamento-page">

    <!-- CARDS FINANCEIROS -->

    <div class="cards-grid">

      <CardFinanceiro
        titulo="Limite do mês"
        :valor="moeda(limiteMensal)"
        detalhe="Planejamento mensal"
      />

      <CardFinanceiro
        titulo="Valor utilizado"
        :valor="moeda(despesasMensais)"
        tipo="despesa"
        detalhe="Despesas do período"
      />

      <CardFinanceiro
        :titulo="tituloSaldo"
        :valor="valorSaldo"
        :tipo="tipoSaldo"
        :detalhe="detalheSaldo"
      />

    </div>

    <!-- ÁREA PRINCIPAL -->

    <div class="orcamento-grid">

      <!-- CONFIGURAÇÃO DO ORÇAMENTO -->

      <section class="painel">

        <h2 class="titulo-categorias-premium">
          <span
            class="icone-categorias-premium"
            aria-hidden="true"
          >
            <SlidersHorizontal
              :size="20"
              :stroke-width="2"
            />
          </span>

          Configurar orçamento
        </h2>

        <p class="texto-apoio">
          Defina o limite de despesas para o mês selecionado.
        </p>

        <!-- FORMULÁRIO DO LIMITE -->

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

        <!-- RESUMO DO ORÇAMENTO -->

        <ResumoOrcamento
          :limite="limiteMensal"
          :gasto="despesasMensais"
        />

      </section>

      <!-- GASTOS POR CATEGORIA -->

      <section class="painel">

        <h2 class="titulo-categorias-premium">
          <span
            class="icone-categorias-premium"
            aria-hidden="true"
          >
            <ChartBar
              :size="20"
              :stroke-width="2"
            />
          </span>

          Gastos por categoria
        </h2>

        <p class="texto-apoio">
          Acompanhe a distribuição das despesas do mês.
        </p>

        <!-- ESTADO VAZIO -->

        <EstadoVazio
          v-if="!categoriasDespesas.length"
          icone="chart"
          mensagem="Nenhuma despesa neste mês."
        />

        <!-- LISTAGEM DAS CATEGORIAS -->

        <div
          v-for="categoria in categoriasDespesas"
          :key="categoria.nome"
          class="categoria-linha"
        >

          <span>
            {{ categoria.nome }}
          </span>

          <!-- BARRA PROPORCIONAL -->

          <div class="barra pequena">

            <div
              :style="{
                width: `${percentualCategoria(categoria.valor)}%`
              }"
            ></div>

          </div>

          <!-- VALOR DA CATEGORIA -->

          <strong>
            {{ moeda(categoria.valor) }}
          </strong>

        </div>

      </section>

    </div>

  </div>
</template>
