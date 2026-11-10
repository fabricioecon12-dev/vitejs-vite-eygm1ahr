<script setup>
import { SlidersHorizontal, ChartBar } from 'lucide-vue-next'
import CardFinanceiro from '../components/CardFinanceiro.vue'
import ResumoOrcamento from '../components/ResumoOrcamento.vue'
import { useFinancas } from '../composables/useFinancas.js'
import EstadoVazio from '../components/EstadoVazio.vue'


const {
  moeda,
  receitas,
  despesas,
  resultado,
  limiteAtual,
  limiteEditando,
  categorias,
  maxCategoria,
  salvarLimite,
  converterLimiteMonetario,
  formatarLimiteMonetario
} = useFinancas()
</script>

<template>
  <div class="orcamento-page">
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
  :titulo="
    limiteAtual() <= 0
      ? 'Limite não configurado'
      : despesas() > limiteAtual()
        ? 'Limite excedido'
        : 'Valor restante'
  "
  :valor="
    limiteAtual() <= 0
      ? '—'
      : moeda(Math.abs(limiteAtual() - despesas()))
  "
  :tipo="
    limiteAtual() <= 0
      ? 'resultado'
      : despesas() > limiteAtual()
        ? 'despesa'
        : despesas() === limiteAtual()
          ? 'resultado'
          : 'receita'
  "
  :detalhe="
    limiteAtual() <= 0
      ? 'Defina um orçamento mensal'
      : despesas() > limiteAtual()
        ? 'Despesas acima do orçamento mensal'
        : 'Limite menos despesas'
  "
/>

          </div>

          <div class="orcamento-grid">
            
              <section class="painel">
                
               <h2 class="titulo-categorias-premium">
                 <span class="icone-categorias-premium" aria-hidden="true">
                   <SlidersHorizontal :size="20" :stroke-width="2" />
                 </span>
                  Configurar orçamento
               </h2>

               <p class="texto-apoio">
                 Defina o limite de despesas para o mês selecionado.
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
              
                <h2 class="titulo-categorias-premium">
                 <span class="icone-categorias-premium" aria-hidden="true">
                   <ChartBar :size="20" :stroke-width="2" />
                 </span>
                 Gastos por categoria
                </h2>

                 <p class="texto-apoio">
                Acompanhe a distribuição das despesas do mês.
                </p>

                <EstadoVazio
                 v-if="!categorias().length"
                  icone="ChartBar"
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