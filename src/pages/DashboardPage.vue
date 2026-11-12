
<script setup>
import CotacoesMercado from '../components/CotacoesMercado.vue'
import { computed } from 'vue'
import { ChartBar, History } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

import CardFinanceiro from '../components/CardFinanceiro.vue'
import ItemTransacao from '../components/ItemTransacao.vue'
import ResumoOrcamento from '../components/ResumoOrcamento.vue'
import EstadoVazio from '../components/EstadoVazio.vue'

import { useFinancas } from '../composables/useFinancas.js'
import { usePrivacidade } from '../composables/usePrivacidade.js'

const {
  moeda,
  nomeMes,
  saldo,
  receitas,
  despesas,
  resultado,
  doMes,
  categorias,
  maxCategoria,
  limiteAtual
} = useFinancas()

const { valorVisivel } = usePrivacidade()

const router = useRouter()

// Dados financeiros reativos do Dashboard.
const mesAtual = computed(() => nomeMes())

const saldoDisponivel = computed(() => saldo())

const totalReceitas = computed(() => receitas())

const totalDespesas = computed(() => despesas())

const resultadoMensal = computed(() => resultado())

const limiteOrcamento = computed(() => limiteAtual())

// Movimentações do período selecionado.
const movimentacoesRecentes = computed(() => {
  const movimentacoes = doMes()

  if (!Array.isArray(movimentacoes)) {
    return []
  }

  return movimentacoes.slice(0, 5)
})

// Categorias de despesas do período.
const categoriasDashboard = computed(() => {
  const lista = categorias()

  if (!Array.isArray(lista)) {
    return []
  }

  return lista.slice(0, 5)
})

// Maior valor utilizado na comparação visual.
const maiorCategoria = computed(() => {
  const valor = Number(maxCategoria())

  return Number.isFinite(valor) && valor > 0
    ? valor
    : 0
})

// Calcula a largura da barra com limites seguros.
function percentualCategoria(valor) {
  const gasto = Number(valor)

  if (
    !Number.isFinite(gasto) ||
    gasto <= 0 ||
    maiorCategoria.value <= 0
  ) {
    return 0
  }

  const percentual =
    (gasto / maiorCategoria.value) * 100

  return Math.min(100, Math.max(0, percentual))
}

// Navegação para módulos existentes.
function navegarPara(destino) {
  if (!['transacoes', 'relatorios'].includes(destino)) {
    return
  }

  router.push({ name: destino })
}
</script>

<template>
  <div class="dashboard-page">

    <!-- SALDO PRINCIPAL -->
    <section
      class="saldo-destaque saldo-premium"
      aria-label="Resumo do saldo financeiro"
    >
      <div class="saldo-conteudo">

        <div
          class="saldo-icone"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="2"
              y="5"
              width="20"
              height="16"
              rx="2"
            />

            <path d="M2 10h20" />
            <path d="M16 15h3" />
          </svg>
        </div>

        <div class="saldo-informacoes">
          <p>
            Saldo disponível até {{ mesAtual }}
          </p>

          <strong>
            {{ valorVisivel(moeda(saldoDisponivel)) }}
          </strong>

          <small>
            Seu dinheiro, suas decisões.
          </small>
        </div>
      </div>

      <!-- Elementos decorativos -->
      <div
        class="saldo-visual"
        aria-hidden="true"
      >
        <img
          class="saldo-marca saldo-logo-oficial"
          src="/nexus_transparente.png"
          alt=""
        />

        <div class="saldo-barras">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>

        <svg
          class="saldo-curva"
          viewBox="0 0 500 160"
          preserveAspectRatio="none"
        >
          <path
            d="M0 150 C100 130 140 65 230 85 S380 110 500 10"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            stroke-linecap="round"
          />
        </svg>
      </div>
    </section>

    <!-- INDICADORES FINANCEIROS -->
    <div class="cards-grid">

      <CardFinanceiro
        titulo="Receitas do mês"
        :valor="valorVisivel(moeda(totalReceitas))"
        tipo="receita"
        detalhe="Entradas no período"
      />

      <CardFinanceiro
        titulo="Despesas do mês"
        :valor="valorVisivel(moeda(totalDespesas))"
        tipo="despesa"
        detalhe="Saídas no período"
      />

      <CardFinanceiro
        titulo="Resultado do mês"
        :valor="valorVisivel(moeda(resultadoMensal))"
        tipo="resultado"
        detalhe="Receitas menos despesas"
      />

    </div>

    <!-- PAINÉIS DO DASHBOARD -->
    <div class="mb-6"><CotacoesMercado /></div>

    <div class="painel-grid">

      <!-- ÚLTIMAS MOVIMENTAÇÕES -->
      <section
        class="painel"
        aria-labelledby="titulo-movimentacoes"
      >
        <div class="secao-titulo">

          <h2
            id="titulo-movimentacoes"
            class="titulo-categorias-premium"
          >
            <span
              class="icone-categorias-premium"
              aria-hidden="true"
            >
              <History
                :size="20"
                :stroke-width="2"
              />
            </span>

            Últimas movimentações
          </h2>

          <button
            type="button"
            class="link-botao ver-todas-premium"
            @click="navegarPara('transacoes')"
          >
            Ver todas →
          </button>
        </div>

        <template v-if="movimentacoesRecentes.length">
          <ItemTransacao
            v-for="item in movimentacoesRecentes"
            :key="item.id"
            :transacao="item"
          />
        </template>

        <EstadoVazio
          v-else
          icone="history"
          mensagem="Nenhuma movimentação neste mês."
        />
      </section>

      <!-- COLUNA DIREITA -->
      <div class="coluna-paineis">

        <!-- RESUMO DO ORÇAMENTO -->
        <ResumoOrcamento
          :limite="limiteOrcamento"
          :gasto="totalDespesas"
        />

        <!-- GASTOS POR CATEGORIA -->
        <section
          class="painel"
          aria-labelledby="titulo-categorias"
        >
          <div class="secao-titulo">

            <h2
              id="titulo-categorias"
              class="titulo-categorias-premium"
            >
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

            <button
              type="button"
              class="link-botao ver-todas-premium"
              @click="navegarPara('relatorios')"
            >
              Detalhes →
            </button>
          </div>

          <!-- Estado sem despesas -->
          <EstadoVazio
            v-if="!categoriasDashboard.length"
            icone="ChartBar"
            mensagem="Sem despesas no período."
          />

          <!-- Lista de categorias -->
          <template v-else>
            <div
              v-for="categoria in categoriasDashboard"
              :key="categoria.nome"
              class="categoria-linha categoria-linha-dashboard-premium"
            >
              <div class="categoria-dashboard-cabecalho">
                <span>
                  {{ categoria.nome }}
                </span>

                <strong>
                  {{ valorVisivel(moeda(categoria.valor)) }}
                </strong>
              </div>

              <div
                class="barra pequena"
                role="progressbar"
                :aria-label="`Participação visual da categoria ${categoria.nome}`"
                :aria-valuenow="percentualCategoria(categoria.valor)"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <div
                  :style="{
                    width: `${percentualCategoria(categoria.valor)}%`
                  }"
                ></div>
              </div>
            </div>
          </template>

        </section>
      </div>
    </div>
  </div>
</template>
