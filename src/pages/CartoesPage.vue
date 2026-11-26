<script setup>
import { computed, ref } from 'vue'
import {
  CreditCard,
  CirclePlus,
  Plus,
  Pencil,
  ReceiptText,
  ShoppingBag,
  History,
  Wallet,
  ShieldCheck,
  AlertCircle
} from 'lucide-vue-next'

import FormularioCartao from '../components/FormularioCartao.vue'
import FormularioCompraCartao from '../components/FormularioCompraCartao.vue'
import ConsultaFaturasCartao from '../components/ConsultaFaturasCartao.vue'
import HistoricoCartoesCredito from '../components/HistoricoCartoesCredito.vue'
import { useFinancas } from '../composables/useFinancas.js'
import { calcularLimiteCartao } from '../utils/calcularLimiteCartao.js'

const {
  cartoesCredito,
  comprasCartao,
  faturasCartao,
  pagamentosFatura,
  armazenamentoProtegido,
  moeda
} = useFinancas()

const logomarcasBandeiras = {
  visa: '/cartoes/visa.svg',
  mastercard: '/cartoes/mastercard-svgrepo-com.svg',
  elo: '/cartoes/elo-svgrepo-com.svg',
  hipercard: '/cartoes/hipercard-29.svg',
  'american express': '/cartoes/american-express-28.svg'
}

function obterLogomarcaBandeira(bandeira) {
  const chave = String(bandeira ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')

  return logomarcasBandeiras[chave] ?? null
}
const abaAtiva = ref('cartoes')
const cartaoSelecionadoId = ref(null)

const abas = [
  { id: 'cartoes', titulo: 'Meus cartões', icone: CreditCard },
  { id: 'cadastro', titulo: 'Cadastro', icone: CirclePlus },
  { id: 'faturas', titulo: 'Faturas', icone: ReceiptText },
  { id: 'compras', titulo: 'Compras', icone: ShoppingBag },
  { id: 'historico', titulo: 'Histórico', icone: History }
]

const cartoesOrdenados = computed(() =>
  [...cartoesCredito.value].sort((a, b) =>
    String(a.nome ?? '').localeCompare(
      String(b.nome ?? ''),
      'pt-BR'
    )
  )
)

const quantidadeAtivos = computed(() =>
  cartoesCredito.value.filter(cartao =>
    cartao.status === 'ativo'
  ).length
)

const limiteTotal = computed(() =>
  cartoesCredito.value
    .filter(cartao => cartao.status === 'ativo')
    .reduce(
      (total, cartao) => total + Number(cartao.limiteTotal || 0),
      0
    )
)

const indicadoresLimite = computed(() => {
  const ativos = cartoesCredito.value.filter(
    cartao => cartao.status === 'ativo'
  )

  const resultados = ativos.map(cartao =>
    calcularLimiteCartao({
      cartao,
      compras: comprasCartao.value,
      faturas: faturasCartao.value,
      pagamentos: pagamentosFatura.value
    })
  )

  const inconsistencias = resultados.flatMap(
    resultado => resultado.inconsistencias
  )

  const invalido = () => ({
    valido: false,
    contratado: null,
    comprometido: null,
    disponivel: null,
    inconsistencias
  })

  if (resultados.some(resultado => !resultado.valido)) {
    return invalido()
  }

  const somarCampo = campo => {
    let total = 0

    for (const resultado of resultados) {
      const valor = resultado[campo]

      if (!Number.isSafeInteger(valor)) {
        return null
      }

      const proximo = total + valor

      if (!Number.isSafeInteger(proximo)) {
        return null
      }

      total = proximo
    }

    return total
  }

  const contratado = somarCampo('limiteContratado')
  const comprometido = somarCampo('comprometido')
  const disponivel = somarCampo('limiteDisponivel')

  if (
    contratado === null ||
    comprometido === null ||
    disponivel === null
  ) {
    inconsistencias.push('SOMA_MONETARIA_INSEGURA')
    return invalido()
  }

  return {
    valido: true,
    contratado,
    comprometido,
    disponivel,
    inconsistencias: []
  }
})

const moedaCentavos = valor => {
  if (!Number.isSafeInteger(valor)) {
    return 'Valor indisponível'
  }

  return moeda(valor / 100)
}
const cartaoSelecionado = computed(() =>
  cartoesCredito.value.find(
    cartao => cartao.id === cartaoSelecionadoId.value
  ) ?? null
)

function abrirCadastro() {
  if (armazenamentoProtegido.value) return

  cartaoSelecionadoId.value = null
  abaAtiva.value = 'cadastro'
}

function iniciarEdicao(cartao) {
  if (armazenamentoProtegido.value) return

  cartaoSelecionadoId.value = cartao.id
  abaAtiva.value = 'cadastro'
}

function finalizarFormulario() {
  cartaoSelecionadoId.value = null
  abaAtiva.value = 'cartoes'
}

function mudarAba(aba) {
  abaAtiva.value = aba

  if (aba !== 'cadastro') {
    cartaoSelecionadoId.value = null
  }
}
</script>

<template>
  <section class="cartoes-page w-full min-w-0 space-y-4 pb-5">
    <!-- Indicadores -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500">
            Cartões ativos
          </span>
          <CreditCard :size="17" class="text-emerald-600" />
        </div>

        <p class="mt-2 text-xl font-bold text-slate-900">
          {{ quantidadeAtivos }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          {{ cartoesCredito.length }} cadastrados
        </p>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500">
            Limite contratado
          </span>
          <Wallet :size="17" class="text-emerald-600" />
        </div>

        <p class="mt-2 text-xl font-bold text-slate-900">
          {{
            indicadoresLimite.valido
              ? moedaCentavos(indicadoresLimite.contratado)
              : 'Indisponível'
          }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          Cartões ativos
        </p>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500">
            Comprometido
          </span>
          <ShoppingBag :size="17" class="text-emerald-600" />
        </div>

        <p class="mt-2 text-xl font-bold text-slate-900">
          {{
            indicadoresLimite.valido
              ? moedaCentavos(indicadoresLimite.comprometido)
              : 'Indisponível'
          }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          Compras registradas
        </p>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-semibold text-slate-500">
            Disponível estimado
          </span>
          <ShieldCheck :size="17" class="text-emerald-600" />
        </div>

        <p class="mt-2 text-xl font-bold text-emerald-700">
          {{
            indicadoresLimite.valido
              ? moedaCentavos(indicadoresLimite.disponivel)
              : 'Indisponível'
          }}
        </p>

        <p class="mt-1 text-xs text-slate-500">
          Sem conciliação de estornos e ajustes
        </p>
      </article>
    </div>

    <div
      v-if="!indicadoresLimite.valido"
      role="alert"
      class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
    >
      Os indicadores financeiros estão indisponíveis devido a
      inconsistências. É necessária uma regularização controlada.
      Nenhum valor foi corrigido automaticamente.
    </div>

    <p
      v-else
      class="text-xs text-slate-500"
    >
      O limite disponível é estimado e não contempla conciliação
      de estornos e ajustes. A proteção do armazenamento permanece
      {{ armazenamentoProtegido ? 'ativa' : 'inativa' }}.
    </p>
    <!-- Navegação compacta -->
    <div class="cartoes-navegacao min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <nav
        class="grid grid-cols-2 gap-2 border-b border-slate-200 p-3 md:flex md:flex-nowrap md:gap-1.5 md:p-2"
        aria-label="Seções de cartões de crédito"
      >
        <button
          v-for="aba in abas"
          :key="aba.id"
          type="button"
          :aria-current="abaAtiva === aba.id ? 'page' : undefined"
          class="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 whitespace-nowrap appearance-none rounded-xl border-0 px-3 py-2.5 text-sm shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:min-h-10 md:flex-1 md:px-3 md:py-2 md:text-sm"
          :class="[
            abaAtiva === aba.id
              ? 'bg-emerald-100 text-emerald-800 font-bold ring-1 ring-inset ring-emerald-200'
              : 'bg-transparent text-slate-500 font-normal hover:bg-slate-100 hover:text-slate-800',
            aba.id === 'historico' ? 'col-span-2 md:col-span-1' : ''
          ]"
          @click="mudarAba(aba.id)"
        >
          <component :is="aba.icone" :size="17" class="shrink-0" />
          <span class="truncate">{{ aba.titulo }}</span>
        </button>
      </nav>

      <!-- Meus cartões -->
      <div v-if="abaAtiva === 'cartoes'" class="p-4">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">
              Meus cartões
            </h2>
            <p class="mt-1 text-sm text-slate-500">
              Consulte os cartões cadastrados e seus dados principais.
            </p>
          </div>

          <button
            type="button"
            :disabled="armazenamentoProtegido"
            class="btn btn-primary btn-premium-fintech"
            @click="abrirCadastro"
          >
            <CirclePlus :size="16" />
            Novo cartão
          </button>
        </div>

        <div
          v-if="armazenamentoProtegido"
          role="alert"
          class="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
        >
          <AlertCircle :size="18" class="shrink-0" />
          O armazenamento está protegido. Cadastro e edição indisponíveis.
        </div>

        <div
          v-if="cartoesOrdenados.length === 0"
          class="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center"
        >
          <CreditCard :size="30" class="mx-auto text-slate-400" />
          <h3 class="mt-3 text-sm font-semibold text-slate-800">
            Nenhum cartão cadastrado
          </h3>
          <p class="mt-1 text-xs text-slate-500">
            Cadastre seu primeiro cartão para começar.
          </p>
        </div>

        <!-- CART-UI-02-D - CARD COMPACTO -->
        <div v-else class="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="cartao in cartoesOrdenados"
            :key="cartao.id"
            class="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <div class="shrink-0 rounded-lg bg-slate-900 p-2.5 text-white">
                  <CreditCard :size="19" />
                </div>

                <div class="min-w-0">
                  <h3 class="truncate text-sm font-bold text-slate-900">
                    {{ cartao.nome }}
                  </h3>

                  <p class="mt-0.5 truncate text-xs text-slate-500">
                    {{ cartao.instituicao }}
                    <template v-if="cartao.ultimosDigitos">
                      · •••• {{ cartao.ultimosDigitos }}
                    </template>
                  </p>
                </div>
              </div>

              <div class="flex shrink-0 flex-col items-end gap-1.5">
                <img
                  v-if="obterLogomarcaBandeira(cartao.bandeira)"
                  :src="obterLogomarcaBandeira(cartao.bandeira)"
                  :alt="`Bandeira ${cartao.bandeira}`"
                  class="h-8 w-14 object-contain"
                  loading="lazy"
                />

                <span
                  v-else
                  class="max-w-24 truncate text-xs font-bold text-slate-700"
                >
                  {{ cartao.bandeira }}
                </span>

                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                  :class="
                    cartao.status === 'ativo'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  "
                >
                  {{ cartao.status === 'ativo' ? 'Ativo' : 'Inativo' }}
                </span>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-3">
              <div class="min-w-0">
                <p class="text-[11px] text-slate-500">
                  Limite total
                </p>
                <p class="mt-0.5 break-words text-sm font-bold text-slate-900">
                  {{ moeda(cartao.limiteTotal) }}
                </p>
              </div>

              <div>
                <p class="text-[11px] text-slate-500">
                  Fechamento
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  Dia {{ cartao.diaFechamento }}
                </p>
              </div>

              <div>
                <p class="text-[11px] text-slate-500">
                  Vencimento
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  Dia {{ cartao.diaVencimento }}
                </p>
              </div>
            </div>

            <div class="mt-2 flex min-w-0 justify-end border-t border-slate-200 pt-2">
              <button
                type="button"
                :disabled="armazenamentoProtegido"
                class="inline-flex max-w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm sm:px-4"
                @click="iniciarEdicao(cartao)"
              >
                <Pencil :size="14" />
                Editar cartão
              </button>
            </div>
          </article>
        </div>
      </div>

      <!-- Cadastro e edição de cartões -->
      <div v-else-if="abaAtiva === 'cadastro'" class="p-4">
        <FormularioCartao
          :key="cartaoSelecionadoId ?? 'novo'"
          :cartao="cartaoSelecionado"
          @salvo="finalizarFormulario"
          @cancelar="finalizarFormulario"
        />
      </div>

      <!-- Registro de compras no cartão -->
      <div v-else-if="abaAtiva === 'compras'" class="p-4">
        <FormularioCompraCartao />
      </div>

      <!-- Consulta de faturas -->
      <div v-else-if="abaAtiva === 'faturas'" class="p-4">
        <ConsultaFaturasCartao />
      </div>

      <!-- Histórico de operações dos cartões -->
      <div v-else-if="abaAtiva === 'historico'" class="p-4">
        <HistoricoCartoesCredito />
      </div>
    </div>
  </section>
</template>
