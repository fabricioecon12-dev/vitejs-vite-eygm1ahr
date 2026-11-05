<script setup>
import { ChartBar } from 'lucide-vue-next'
import CardFinanceiro from '../components/CardFinanceiro.vue'
import { useFinancas } from '../composables/useFinancas.js'

const {
  moeda,
  nomeMes,
  receitas,
  despesas,
  resultado,
  categorias,
  maxCategoria
} = useFinancas()
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
  </div>
</template>