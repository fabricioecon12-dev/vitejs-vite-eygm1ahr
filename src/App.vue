<script setup>
import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChartBar, History } from 'lucide-vue-next'

import MenuLateral from './components/MenuLateral.vue'
import Cabecalho from './components/Cabecalho.vue'
import CardFinanceiro from './components/CardFinanceiro.vue'
import FormularioTransacao from './components/FormularioTransacao.vue'
import ItemTransacao from './components/ItemTransacao.vue'
import ListaTransacoes from './components/ListaTransacoes.vue'
import ResumoOrcamento from './components/ResumoOrcamento.vue'
import Rodape from './components/Rodape.vue'

import { useFinancas } from './composables/useFinancas.js'

const {
  mesSelecionado,
  saldoInicial,
  transacoes,
  limites,
  limiteEditando,
  aviso,
  armazenamentoProtegido,
  moeda,
  mesChave,
  nomeMes,
  mudarMes,
  dataMes,
  doMes,
  somar,
  receitas,
  despesas,
  resultado,
  saldo,
  limiteAtual,
  categorias,
  maxCategoria,
  adicionar,
  excluir,
  limpar,
  salvarLimite,
  demonstracao,
  converterLimiteMonetario,
  formatarLimiteMonetario
} = useFinancas()

const route = useRoute()
const router = useRouter()

const pagina = computed(() => {
  const nome = route.name

  return ['inicio', 'transacoes', 'orcamento', 'relatorios'].includes(nome)
    ? nome
    : 'inicio'
})

const titulos = {
  inicio: ['Visão geral', 'Acompanhe seu resumo financeiro'],
  transacoes: ['Transações', 'Cadastre e gerencie suas movimentações'],
  orcamento: ['Orçamento', 'Defina seu limite e acompanhe seus gastos'],
  relatorios: ['Relatórios', 'Analise seus resultados e visualize seus gastos']
}

async function navegarPara(destino) {
  if (!['inicio', 'transacoes', 'orcamento', 'relatorios'].includes(destino)) {
    return
  }

  await router.push({ name: destino })
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
                <h2 class="titulo-categorias-premium">
               <span class="icone-categorias-premium" aria-hidden="true">
               <ChartBar :size="20" :stroke-width="2" />
              </span>
                Gastos por categoria
               </h2>

  <p class="texto-apoio">
    Entenda como o orçamento está sendo utilizado.
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
