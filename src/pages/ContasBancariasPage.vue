<script setup>
import { computed, nextTick, ref } from 'vue'
import { Building2, ShieldCheck, Landmark, CheckCircle2, Pencil, Star, Power, Wallet, CirclePlus, ArrowLeftRight } from '@lucide/vue'
import { useFinancas } from '../composables/useFinancas.js'
import FormularioContaBancaria from '../components/FormularioContaBancaria.vue'
import FormularioTransferencia from '../components/FormularioTransferencia.vue'
import HistoricoTransferenciasRecusadas from '../components/HistoricoTransferenciasRecusadas.vue'
import { obterIdentidadePorInstituicao } from '../services/identidadeBancosService.js'

const { contas, armazenamentoProtegido, saldoDaConta, moeda, nomeMes, alterarSituacaoConta, definirContaPrincipal } = useFinancas()

const contasOrdenadas = computed(() =>
  [...contas.value].sort((a, b) =>
    Number(b.principal) - Number(a.principal) ||
    a.nome.localeCompare(b.nome, 'pt-BR')
  )
)

const logotiposComErro = ref({})

const abaAtiva = ref('contas')
const contaSelecionadaId = ref(null)
const formularioContaRef = ref(null)

const contaEmEdicao = computed(() => {
  if (contaSelecionadaId.value === null) {
    return null
  }

  return contas.value.find(
    conta => conta.id === contaSelecionadaId.value
  ) ?? null
})

async function iniciarEdicao(conta) {
  if (armazenamentoProtegido.value) {
    return
  }

  contaSelecionadaId.value = conta.id
  abaAtiva.value = 'cadastro'

  await nextTick()

  formularioContaRef.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

function encerrarEdicao() {
  contaSelecionadaId.value = null
}

function solicitarAlteracaoSituacao(conta) {
  if (armazenamentoProtegido.value) return

  const novaSituacao = !conta.ativa

  if (!novaSituacao && conta.principal) {
    window.alert(
      'A conta principal não pode ser desativada. Defina outra conta principal primeiro.'
    )
    return
  }

  const saldoAtual = moeda(saldoDaConta(conta.id))

  const mensagem = novaSituacao
    ? `Deseja reativar a conta "${conta.nome}"?\n\nSaldo registrado: ${saldoAtual}\n\nA conta voltará a permitir novas operações, respeitando as validações financeiras.`
    : `Deseja desativar a conta "${conta.nome}"?\n\nSaldo registrado: ${saldoAtual}\n\nO saldo e o histórico serão preservados. Novas operações financeiras serão bloqueadas enquanto a conta estiver inativa.`

  if (!window.confirm(mensagem)) return

  alterarSituacaoConta(conta.id, novaSituacao)
}

function solicitarDefinicaoPrincipal(conta) {
  if (armazenamentoProtegido.value || !conta.ativa || conta.principal) {
    return
  }

  const mensagem =
    `Deseja definir "${conta.nome}" como sua conta principal?\n\nA conta principal atual deixará de ser principal.`

  if (!window.confirm(mensagem)) return

  definirContaPrincipal(conta.id)
}
function identidadeDaConta(conta) {
  return obterIdentidadePorInstituicao(conta.instituicao)
}

function registrarErroLogotipo(conta) {
  logotiposComErro.value = {
    ...logotiposComErro.value,
    [conta.id]: true
  }
}
const tiposConta = {
  corrente: 'Conta corrente',
  poupanca: 'Conta poupança',
  pagamento: 'Conta de pagamento'
}
</script>

<template>
  <section class="space-y-6">
    <!-- Navegacao por abas -->
    <nav
      class="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      aria-label="Navegacao de contas bancarias"
    >
      <button
        type="button"
        :aria-current="abaAtiva === 'contas' ? 'page' : undefined"
        :class="abaAtiva === 'contas'
          ? 'bg-emerald-100 text-emerald-800 font-bold ring-1 ring-inset ring-emerald-200'
          : 'bg-transparent text-slate-500 font-normal hover:bg-slate-100 hover:text-slate-800'"
        class="inline-flex shrink-0 appearance-none items-center justify-center gap-2 rounded-xl border-0 px-3 py-2 text-xs shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
        @click="abaAtiva = 'contas'"
      >
        <Wallet :size="18" aria-hidden="true" />
        Minhas contas
      </button>

      <button
        type="button"
        :aria-current="abaAtiva === 'cadastro' ? 'page' : undefined"
        :class="abaAtiva === 'cadastro'
          ? 'bg-emerald-100 text-emerald-800 font-bold ring-1 ring-inset ring-emerald-200'
          : 'bg-transparent text-slate-500 font-normal hover:bg-slate-100 hover:text-slate-800'"
        class="inline-flex shrink-0 appearance-none items-center justify-center gap-2 rounded-xl border-0 px-3 py-2 text-xs shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
        @click="abaAtiva = 'cadastro'"
      >
        <CirclePlus :size="18" aria-hidden="true" />
        Cadastrar conta
      </button>

      <button
        type="button"
        :aria-current="abaAtiva === 'transferencias' ? 'page' : undefined"
        :class="abaAtiva === 'transferencias'
          ? 'bg-emerald-100 text-emerald-800 font-bold ring-1 ring-inset ring-emerald-200'
          : 'bg-transparent text-slate-500 font-normal hover:bg-slate-100 hover:text-slate-800'"
        class="inline-flex shrink-0 appearance-none items-center justify-center gap-2 rounded-xl border-0 px-3 py-2 text-xs shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
        @click="abaAtiva = 'transferencias'"
      >
        <ArrowLeftRight :size="18" aria-hidden="true" />
        Transferencias
      </button>
    </nav>
    <div v-show="abaAtiva === 'cadastro'" ref="formularioContaRef">
      <FormularioContaBancaria
        :conta-edicao="contaEmEdicao"
        @conta-editada="encerrarEdicao"
        @cancelar-edicao="encerrarEdicao"
            />
    </div>

    <!-- Transferências entre contas bancárias -->
    <div v-show="abaAtiva === 'transferencias'" class="mt-6 space-y-4">
      <FormularioTransferencia />
      <HistoricoTransferenciasRecusadas />
    </div>

    <div
      v-if="armazenamentoProtegido"
      role="alert"
      class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
    >
      O armazenamento financeiro está protegido. Verifique os dados antes de realizar alterações.
    </div>

    <div v-show="abaAtiva === 'contas'" class="space-y-4">
      <div class="flex flex-wrap items-baseline gap-2">
        <h3 class="text-lg font-bold text-slate-800">
          Minhas contas
        </h3>
        <span class="text-sm font-medium text-slate-500">
          ({{ contasOrdenadas.length }} {{ contasOrdenadas.length === 1 ? 'conta cadastrada' : 'contas cadastradas' }})
        </span>
      </div>

      <div
        v-if="!contasOrdenadas.length"
        class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      >
        <Landmark :size="32" class="mx-auto text-slate-400" />
        <p class="mt-3 font-semibold text-slate-700">
          Nenhuma conta bancária cadastrada.
        </p>
      </div>

      <div v-else class="grid gap-4 md:grid-cols-[42.5%_42.5%] md:justify-center">
        <article
          v-for="conta in contasOrdenadas"
          :key="conta.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <!-- Identificacao da conta -->
          <div class="flex flex-wrap items-center justify-start gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                :class="identidadeDaConta(conta).codigo === '260' && identidadeDaConta(conta).logotipo && !logotiposComErro[conta.id]
                  ? 'bg-[#820AD1] text-white'
                  : identidadeDaConta(conta).logotipo && !logotiposComErro[conta.id]
                    ? 'bg-white ring-1 ring-slate-200'
                    : 'bg-emerald-50 text-emerald-600'"
              >
                <img
                  v-if="identidadeDaConta(conta).logotipo && !logotiposComErro[conta.id]"
                  :src="identidadeDaConta(conta).logotipo"
                  :alt="`Logotipo ${identidadeDaConta(conta).nome}`"
                  class="h-8 w-8 object-contain"
                  @error="registrarErroLogotipo(conta)"
                />
                <Landmark v-else :size="24" />
              </div>

              <div class="min-w-0">
                <h4 class="break-words font-bold text-slate-800">
                  {{ conta.nome }}
                </h4>
                <p class="break-words text-sm text-slate-500">
                  {{ conta.instituicao }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <span
                v-if="conta.principal"
                class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
              >
                Principal
              </span>

              <span
                :class="conta.ativa
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-600'"
                class="rounded-full px-3 py-1 text-xs font-semibold"
              >
                {{ conta.ativa ? 'Ativa' : 'Inativa' }}
              </span>
            </div>
          </div>

          <!-- Informacoes financeiras -->
          <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div class="rounded-xl bg-slate-50 p-2.5">
              <p class="text-xs font-medium text-slate-500">
                Saldo até {{ nomeMes() }}
              </p>

              <p
                class="mt-1 text-xl font-bold tracking-tight"
                :class="saldoDaConta(conta.id) < 0
                  ? 'text-red-600'
                  : 'text-slate-800'"
              >
                {{ moeda(saldoDaConta(conta.id)) }}
              </p>
            </div>

            <div class="flex flex-col justify-center rounded-xl border border-slate-100 p-2.5">
              <p class="text-xs font-medium text-slate-500">
                Tipo de conta
              </p>
              <p class="mt-1 text-sm font-semibold text-slate-800">
                {{ tiposConta[conta.tipo] || 'Tipo não informado' }}
              </p>
            </div>
          </div>

          <!-- Acoes da conta -->
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              :disabled="armazenamentoProtegido"
              :aria-label="`Editar conta ${conta.nome}`"
              @click="iniciarEdicao(conta)"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil :size="16" />
              Editar conta
            </button>

            <button
              v-if="conta.ativa && !conta.principal"
              type="button"
              :disabled="armazenamentoProtegido"
              :aria-label="`Definir ${conta.nome} como conta principal`"
              @click="solicitarDefinicaoPrincipal(conta)"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Star :size="16" />
              Definir principal
            </button>

            <button
              type="button"
              :disabled="armazenamentoProtegido || (conta.ativa && conta.principal)"
              :aria-label="`${conta.ativa ? 'Desativar' : 'Ativar'} conta ${conta.nome}`"
              :title="conta.ativa && conta.principal ? 'Defina outra conta principal antes de desativar esta conta.' : ''"
              @click="solicitarAlteracaoSituacao(conta)"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              :class="conta.ativa ? 'text-rose-600' : 'text-emerald-700'"
            >
              <Power :size="16" />
              {{ conta.ativa ? 'Desativar conta' : 'Ativar conta' }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
