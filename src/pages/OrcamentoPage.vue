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
              titulo="Valor restante"
              :valor="moeda(limiteAtual() - despesas())"
              tipo="receita"
              detalhe="Limite menos despesas"
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
  </div>
</template>