<script setup>
import { ChartBar, History } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import CardFinanceiro from '../components/CardFinanceiro.vue'
import ItemTransacao from '../components/ItemTransacao.vue'
import ResumoOrcamento from '../components/ResumoOrcamento.vue'

import { useFinancas } from '../composables/useFinancas.js'

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
const router = useRouter()

function navegarPara(destino) {
  if (!['transacoes', 'relatorios'].includes(destino)) {
    return
  }

  router.push({ name: destino })
}
</script>

<template>
  <div class="dashboard-page">
    <section class="saldo-destaque saldo-premium">

<div class="saldo-conteudo">

  <div class="saldo-icone" aria-hidden="true">
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
      <rect x="2" y="5" width="20" height="16" rx="2" />
      <path d="M2 10h20" />
      <path d="M16 15h3" />
    </svg>
  </div>

  <div class="saldo-informacoes">
    <p>Saldo disponível até {{ nomeMes() }}</p>

    <strong>{{ moeda(saldo()) }}</strong>

    <small>Seu dinheiro, suas decisões.</small>
  </div>

</div>

<div class="saldo-visual" aria-hidden="true">

  <img
  class="saldo-marca saldo-logo-oficial"
  src="/nexus_transparente.png"
  alt=""
  aria-hidden="true"
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
                
                 <h2 class="titulo-categorias-premium">
                   <span class="icone-categorias-premium" aria-hidden="true">
                   <History :size="20" :stroke-width="2" />
                   </span>
                    Últimas movimentações
                </h2>

                <button
                  class="link-botao ver-todas-premium"
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
                 <h2 class="titulo-categorias-premium">
                <span class="icone-categorias-premium" aria-hidden="true">
               <ChartBar :size="20" :stroke-width="2" />
               </span>
                   Gastos por categoria
                    </h2>

                <button
                 class="link-botao ver-todas-premium"
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
  class="categoria-linha categoria-linha-dashboard-premium"
>
  <div class="categoria-dashboard-cabecalho">
    <span>{{ categoria.nome }}</span>
    <strong>{{ moeda(categoria.valor) }}</strong>
  </div>

  <div class="barra pequena">
    <div
      :style="{
        width: (
          maxCategoria()
            ? categoria.valor / maxCategoria() * 100
            : 0
        ) + '%'
      }"
    ></div>
  </div>
</div>

              </section>
            </div>
          </div>
  </div>
</template>