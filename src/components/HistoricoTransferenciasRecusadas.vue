<script setup>
import { computed, ref, watch } from 'vue'
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  History,
  AlertCircle
} from 'lucide-vue-next'
import { useFinancas } from '../composables/useFinancas.js'

const { tentativasTransferenciaRecusadas } = useFinancas()

const expandido = ref(false)
const dataInicial = ref('')
const dataFinal = ref('')
const contaFiltro = ref('')
const motivoFiltro = ref('')
const paginaAtual = ref(1)
const itensPorPagina = 5

const historico = computed(() =>
  [...tentativasTransferenciaRecusadas.value].sort(
    (a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime()
  )
)

const quantidadeTotal = computed(() => historico.value.length)

function identificacaoConta(tentativa, tipo) {
  const prefixo = tipo === 'origem' ? 'contaOrigem' : 'contaDestino'
  const identificacao = tentativa[`${prefixo}Identificacao`]
  const id = tentativa[`${prefixo}Id`]

  const nome =
    identificacao &&
    typeof identificacao === 'object' &&
    typeof identificacao.nome === 'string'
      ? identificacao.nome.trim()
      : ''

  const instituicao =
    identificacao &&
    typeof identificacao === 'object' &&
    typeof identificacao.instituicao === 'string'
      ? identificacao.instituicao.trim()
      : ''

  if (nome && instituicao) {
    return nome.toLocaleLowerCase('pt-BR') ===
      instituicao.toLocaleLowerCase('pt-BR')
      ? nome
      : `${nome} — ${instituicao}`
  }

  if (nome) return nome

  if (instituicao) return instituicao

  return id !== null && id !== undefined && String(id).trim()
    ? `Conta ${id} (nome não disponível)`
    : 'Não disponível'
}

function dadosVisuaisConta(tentativa, tipo) {
  const prefixo = tipo === 'origem' ? 'contaOrigem' : 'contaDestino'
  const identificacao = tentativa?.[`${prefixo}Identificacao`]

  const nome =
    identificacao &&
    typeof identificacao === 'object' &&
    typeof identificacao.nome === 'string'
      ? identificacao.nome.trim()
      : ''

  const instituicao =
    identificacao &&
    typeof identificacao === 'object' &&
    typeof identificacao.instituicao === 'string'
      ? identificacao.instituicao.trim()
      : ''

  const nomePrincipal = nome || instituicao || identificacaoConta(tentativa, tipo)

  const instituicaoSecundaria =
    nome &&
    instituicao &&
    nome.toLocaleLowerCase('pt-BR') !== instituicao.toLocaleLowerCase('pt-BR')
      ? instituicao
      : ''

  return {
    nome: nomePrincipal,
    instituicao: instituicaoSecundaria
  }
}

const contasDisponiveis = computed(() => {
  const valores = new Set()

  for (const tentativa of historico.value) {
    for (const tipo of ['origem', 'destino']) {
      const identificacao = identificacaoConta(tentativa, tipo)
      if (identificacao !== 'Não disponível') {
        valores.add(identificacao)
      }
    }
  }

  return [...valores].sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const motivosDisponiveis = computed(() => {
  const valores = new Set(
    historico.value
      .map(item => item.motivoCodigo)
      .filter(codigo => typeof codigo === 'string' && codigo.trim())
  )

  return [...valores].sort((a, b) => a.localeCompare(b, 'pt-BR'))
})

const historicoFiltrado = computed(() =>
  historico.value.filter(tentativa => {
    const data = typeof tentativa.dataHora === 'string'
      ? tentativa.dataHora.slice(0, 10)
      : ''

    if (dataInicial.value && (!data || data < dataInicial.value)) return false
    if (dataFinal.value && (!data || data > dataFinal.value)) return false

    if (
      contaFiltro.value &&
      identificacaoConta(tentativa, 'origem') !== contaFiltro.value &&
      identificacaoConta(tentativa, 'destino') !== contaFiltro.value
    ) {
      return false
    }

    if (motivoFiltro.value && tentativa.motivoCodigo !== motivoFiltro.value) {
      return false
    }

    return true
  })
)

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(historicoFiltrado.value.length / itensPorPagina))
)

const historicoPaginado = computed(() => {
  const inicio = (paginaAtual.value - 1) * itensPorPagina
  return historicoFiltrado.value.slice(inicio, inicio + itensPorPagina)
})

watch(
  [dataInicial, dataFinal, contaFiltro, motivoFiltro],
  () => {
    paginaAtual.value = 1
  }
)

watch(totalPaginas, total => {
  if (paginaAtual.value > total) paginaAtual.value = total
})

function limparFiltros() {
  dataInicial.value = ''
  dataFinal.value = ''
  contaFiltro.value = ''
  motivoFiltro.value = ''
  paginaAtual.value = 1
  detalheExpandidoId.value = null
}

const detalheExpandidoId = ref(null)

function alternarDetalhes(id) {
  detalheExpandidoId.value =
    detalheExpandidoId.value === id ? null : id
}

function formatarValor(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    return 'Não disponível'
  }

  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

function textoDisponivel(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return 'Não disponível'
  }

  return String(valor)
}
function formatarData(dataHora) {
  if (!dataHora || Number.isNaN(new Date(dataHora).getTime())) {
    return 'Data não disponível'
  }

  return new Date(dataHora).toLocaleString('pt-BR')
}
function motivoResumido(tentativa) {
  const codigo = String(tentativa?.motivoCodigo ?? '').trim()
  const descricao = String(tentativa?.motivoDescricao ?? '').trim()

  const motivosConhecidos = {
    SALDO_INSUFICIENTE: 'Saldo insuficiente',
    CONTA_INATIVA: 'Conta inativa',
    CONTAS_IGUAIS: 'Contas de origem e destino iguais',
    VALOR_INVALIDO: 'Valor inválido',
    TARIFA_INVALIDA: 'Tarifa inválida'
  }

  if (codigo && motivosConhecidos[codigo]) {
    return motivosConhecidos[codigo]
  }

  if (descricao) {
    const primeiraFrase = descricao.split(/[.!?]/)[0].trim()

    if (primeiraFrase) {
      return primeiraFrase.length > 90
        ? `${primeiraFrase.slice(0, 87)}...`
        : primeiraFrase
    }
  }

  return codigo
    ? codigo.replaceAll('_', ' ')
    : 'Motivo não disponível'
}
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <button
      type="button"
      :aria-expanded="expandido"
      aria-controls="historico-transferencias-recusadas"
      class="flex w-full appearance-none !border-0 !shadow-none !outline-none items-center justify-between gap-3 bg-slate-50/60 px-5 py-3.5 text-left transition-colors duration-200 hover:bg-slate-100/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
      @click="expandido = !expandido"
    >
      <span class="flex min-w-0 items-center gap-3">
        <span class="rounded-xl bg-amber-50 p-2 text-amber-700">
          <History :size="19" aria-hidden="true" />
        </span>

        <span class="min-w-0">
          <span class="block text-sm font-bold text-slate-800">
            Histórico de transferências recusadas
          </span>
          <span class="block text-xs text-slate-500">
            {{ quantidadeTotal }} tentativa(s) registrada(s)
          </span>
        </span>
      </span>

      <ChevronUp v-if="expandido" :size="18" class="shrink-0 text-slate-500" />
      <ChevronDown v-else :size="18" class="shrink-0 text-slate-500" />
    </button>

    <div
      v-if="expandido"
      id="historico-transferencias-recusadas"
      class="border-t border-slate-100 px-5 py-4"
    >
      <div
        v-if="quantidadeTotal === 0"
        class="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500"
      >
        Nenhuma tentativa de transferência recusada registrada.
      </div>

      <template v-else>
        <div class="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label for="recusa-data-inicial" class="nexus-label !mb-1 !text-xs">
              Data inicial
            </label>
            <input
              id="recusa-data-inicial"
              v-model="dataInicial"
              type="date"
              class="nexus-input !h-11 !rounded-lg !border-slate-200 !bg-white !px-3 !py-2 !text-sm !shadow-sm"
            />
          </div>

          <div>
            <label for="recusa-data-final" class="nexus-label !mb-1 !text-xs">
              Data final
            </label>
            <input
              id="recusa-data-final"
              v-model="dataFinal"
              type="date"
              class="nexus-input !h-11 !rounded-lg !border-slate-200 !bg-white !px-3 !py-2 !text-sm !shadow-sm"
            />
          </div>

          <div>
            <label for="recusa-conta" class="nexus-label !mb-1 !text-xs">
              Conta bancária
            </label>
            <select
              id="recusa-conta"
              v-model="contaFiltro"
              class="nexus-select !h-11 !rounded-lg !border-slate-200 !bg-white !px-3 !py-2 !text-sm !shadow-sm"
            >
              <option value="">Todas as contas</option>
              <option v-for="conta in contasDisponiveis" :key="conta" :value="conta">
                {{ conta }}
              </option>
            </select>
          </div>

          <div>
            <label for="recusa-motivo" class="nexus-label !mb-1 !text-xs">
              Motivo da recusa
            </label>
            <select
              id="recusa-motivo"
              v-model="motivoFiltro"
              class="nexus-select !h-11 !rounded-lg !border-slate-200 !bg-white !px-3 !py-2 !text-sm !shadow-sm"
            >
              <option value="">Todos os motivos</option>
              <option v-for="motivo in motivosDisponiveis" :key="motivo" :value="motivo">
                {{ motivo.replaceAll('_', ' ') }}
              </option>
            </select>
          </div>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
          <p class="text-xs text-slate-500">
            {{ historicoFiltrado.length }} registro(s) encontrado(s)
          </p>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3.5 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            @click="limparFiltros"
          >
            Limpar filtros
          </button>
        </div>

        <div v-if="historicoFiltrado.length === 0" class="mt-3 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
          Nenhum registro encontrado para os filtros selecionados.
        </div>

        <div v-else class="mt-4 space-y-2.5">
          <div
            v-for="tentativa in historicoPaginado"
            :key="tentativa.id"
            class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-none transition-colors duration-200 hover:border-slate-300"
          >
            <button
              type="button"
              :aria-expanded="detalheExpandidoId === tentativa.id"
              class="flex w-full items-center gap-3 border-0 bg-white px-4 py-3 text-left shadow-none outline-none transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-emerald-500"
              @click="alternarDetalhes(tentativa.id)"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-100">
                <AlertCircle
                  :size="18"
                  class="text-amber-600"
                  aria-hidden="true"
                />
              </span>

              <span class="min-w-0 flex-1">
                <span class="block text-sm font-semibold leading-5 text-slate-800">
                  {{ motivoResumido(tentativa) }}
                </span>
                <span class="mt-0.5 block text-xs text-slate-500">
                  {{ formatarData(tentativa.dataHora) }}
                </span>
              </span>

              <span class="flex shrink-0 items-center gap-2">
                <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  Recusada
                </span>
                <ChevronUp
                  v-if="detalheExpandidoId === tentativa.id"
                  :size="16"
                  class="text-slate-500"
                />
                <ChevronDown v-else :size="16" class="text-slate-500" />
              </span>
            </button>

            <div
              v-if="detalheExpandidoId === tentativa.id"
              class="border-t border-slate-100 bg-slate-50/70 px-4 py-3"
            >
              <section class="mb-4" aria-label="Resumo financeiro da tentativa">
                <div class="mb-2 flex items-center gap-2">
                  <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Resumo financeiro
                  </span>
                </div>

                <dl class="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div class="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <dt class="text-xs text-slate-500">Valor solicitado</dt>
                    <dd class="mt-1 text-base font-semibold tabular-nums text-slate-800">
                      {{ formatarValor(tentativa.valor) }}
                    </dd>
                  </div>

                  <div class="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <dt class="text-xs text-slate-500">Tarifa efetiva</dt>
                    <dd class="mt-1 text-base font-semibold tabular-nums text-slate-800">
                      {{ formatarValor(tentativa.tarifa) }}
                    </dd>
                  </div>

                  <div class="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <dt class="text-xs text-slate-500">Saldo disponível</dt>
                    <dd class="mt-1 text-base font-semibold tabular-nums text-slate-800">
                      {{ formatarValor(tentativa.saldoDisponivel) }}
                    </dd>
                  </div>

                  <div class="min-w-0 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5">
                    <dt class="text-xs font-medium text-emerald-700">Total necessário</dt>
                    <dd class="mt-1 text-base font-semibold tabular-nums text-slate-900">
                      {{ formatarValor(tentativa.totalNecessario) }}
                    </dd>
                  </div>
                </dl>
              </section>

              <section class="mb-4" aria-label="Contas envolvidas na tentativa">
                <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Contas envolvidas
                </h4>

                <div class="grid gap-2 sm:grid-cols-2">
                  <div class="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Origem
                    </p>
                    <p class="break-words text-sm font-semibold text-slate-800">
                      {{ dadosVisuaisConta(tentativa, 'origem').nome }}
                    </p>
                    <p
                      v-if="dadosVisuaisConta(tentativa, 'origem').instituicao"
                      class="mt-0.5 break-words text-xs text-slate-500"
                    >
                      {{ dadosVisuaisConta(tentativa, 'origem').instituicao }}
                    </p>
                  </div>

                  <div class="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <p class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Destino
                    </p>
                    <p class="break-words text-sm font-semibold text-slate-800">
                      {{ dadosVisuaisConta(tentativa, 'destino').nome }}
                    </p>
                    <p
                      v-if="dadosVisuaisConta(tentativa, 'destino').instituicao"
                      class="mt-0.5 break-words text-xs text-slate-500"
                    >
                      {{ dadosVisuaisConta(tentativa, 'destino').instituicao }}
                    </p>
                  </div>
                </div>
              </section>

                            <section class="space-y-1.5" aria-label="Detalhes e auditoria">

                <div class="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Identificação e resultado
                  </h4>

                  <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-5">

                    <div class="min-w-0 xl:col-span-2">
                      <dt class="text-xs text-slate-500">Identificador</dt>
                      <dd class="mt-1 break-all text-sm font-medium text-slate-800">
                        {{ textoDisponivel(tentativa.id) }}
                      </dd>
                    </div>

                    <div class="min-w-0">
                      <dt class="text-xs text-slate-500">Data e hora</dt>
                      <dd class="mt-1 text-sm font-medium tabular-nums text-slate-800">
                        {{ formatarData(tentativa.dataHora) }}
                      </dd>
                    </div>

                    <div class="min-w-0">
                      <dt class="text-xs text-slate-500">Resultado</dt>
                      <dd class="mt-1">
                        <span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          {{ tentativa.resultado === 'recusada' ? 'Recusada' : 'Não disponível' }}
                        </span>
                      </dd>
                    </div>

                    <div class="min-w-0">
                      <dt class="text-xs text-slate-500">Código da recusa</dt>
                      <dd class="mt-1 break-words text-sm font-semibold text-slate-800">
                        {{ textoDisponivel(tentativa.motivoCodigo) }}
                      </dd>
                    </div>

                  </dl>
                </div>

                <div class="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fundamentação da recusa
                  </h4>

                  <p class="break-words text-sm leading-snug text-slate-700">
                    {{ textoDisponivel(tentativa.motivoDescricao) }}
                  </p>
                </div>

              </section>

              <p class="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
                Registro histórico somente para consulta. Nenhuma movimentação financeira é realizada.
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="totalPaginas > 1"
          class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"
        >
          <span class="text-xs text-slate-500">
            Página {{ paginaAtual }} de {{ totalPaginas }}
          </span>

          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="paginaAtual === 1"
              aria-label="Página anterior"
              class="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
              @click="paginaAtual--"
            >
              <ChevronLeft :size="16" />
            </button>

            <button
              type="button"
              :disabled="paginaAtual === totalPaginas"
              aria-label="Próxima página"
              class="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"
              @click="paginaAtual++"
            >
              <ChevronRight :size="16" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </section>
</template>
