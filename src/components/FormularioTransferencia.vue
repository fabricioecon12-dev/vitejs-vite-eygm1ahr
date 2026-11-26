
<script setup>
import {
  converterMonetarioBR,
  formatarMonetarioBR
} from '../utils/monetario.js'
import { computed, ref } from 'vue'
import {
  ArrowLeftRight,
  ArrowDown,
  Landmark,
  CheckCircle2,
  AlertCircle,
  ShieldCheck
} from 'lucide-vue-next'
import { useFinancas } from '../composables/useFinancas.js'
import { obterIdentidadePorInstituicao } from '../services/identidadeBancosService.js'

const {
  contas,
  saldoOperacionalDaConta,
  executarTransferencia,
  recuperarHistoricoTransferenciaRecusada,
  resultadoTecnicoTransferencia,
  pendenciasTecnicasTransferencia,
  armazenamentoProtegido,
  aviso,
  moeda
} = useFinancas()

const contaOrigemId = ref('')
const contaDestinoId = ref('')
const valor = ref('')
const tarifa = ref('0,00')
const confirmacaoPendente = ref(false)
const executando = ref(false)
const mensagemLocal = ref('')
const tipoMensagem = ref('')
const tentativasPendentesIds = ref([])
const tentativasPendentesExibidas = computed(() => {
  const idsPersistidos = pendenciasTecnicasTransferencia.value
    .filter(item =>
      item &&
      item.situacao === 'verificacao_pendente' &&
      typeof item.idTentativa === 'string' &&
      item.idTentativa.trim()
    )
    .map(item => item.idTentativa)

  return [
    ...new Set([
      ...idsPersistidos,
      ...tentativasPendentesIds.value
    ])
  ]
})
const tentativaEmVerificacaoId = ref(null)
const resultadosVerificacaoPendencias = ref({})
function verificarTentativaPendente(idTentativa) {
  if (
    typeof idTentativa !== 'string' ||
    !idTentativa.trim() ||
    !tentativasPendentesExibidas.value.includes(idTentativa) ||
    tentativaEmVerificacaoId.value !== null
  ) {
    return false
  }

  tentativaEmVerificacaoId.value = idTentativa

  try {
    const resultado = recuperarHistoricoTransferenciaRecusada(idTentativa)

    const confirmada =
      resultado?.registrada === true &&
      resultado?.requerVerificacao === false &&
      resultado?.recuperada === true &&
      resultado?.situacaoPersistencia === 'confirmada' &&
      resultado?.id === idTentativa

    resultadosVerificacaoPendencias.value = {
      ...resultadosVerificacaoPendencias.value,
      [idTentativa]: {
        registrada: resultado?.registrada === true,
        recuperada: resultado?.recuperada === true,
        requerVerificacao: resultado?.requerVerificacao !== false,
        situacaoPersistencia:
          resultado?.situacaoPersistencia ?? 'indeterminada',
        confirmada
      }
    }

    if (confirmada) {
      // Remove apenas a referencia temporaria.
      // Pendencias persistidas permanecem sob controle administrativo.
      tentativasPendentesIds.value =
        tentativasPendentesIds.value.filter(
          id => id !== idTentativa
        )
    }

    return confirmada
  } catch {
    resultadosVerificacaoPendencias.value = {
      ...resultadosVerificacaoPendencias.value,
      [idTentativa]: {
        registrada: false,
        recuperada: false,
        requerVerificacao: true,
        situacaoPersistencia: 'indeterminada',
        confirmada: false
      }
    }

    return false
  } finally {
    tentativaEmVerificacaoId.value = null
  }
}

const contasAtivas = computed(() =>
  contas.value.filter(conta => conta.ativa)
)

const contasDestino = computed(() =>
  contasAtivas.value.filter(
    conta => conta.id !== Number(contaOrigemId.value)
  )
)

const contaOrigem = computed(() =>
  contasAtivas.value.find(
    conta => conta.id === Number(contaOrigemId.value)
  )
)
const contaDestino = computed(() =>
  contasAtivas.value.find(
    conta => conta.id === Number(contaDestinoId.value)
  )
)
const identidadeOrigem = computed(() =>
  contaOrigem.value
    ? obterIdentidadePorInstituicao(contaOrigem.value.instituicao)
    : null
)

const identidadeDestino = computed(() =>
  contaDestino.value
    ? obterIdentidadePorInstituicao(contaDestino.value.instituicao)
    : null
)

const logotipoOrigemComErro = ref(false)
const logotipoDestinoComErro = ref(false)

const saldoDisponivel = computed(() =>
  contaOrigem.value
    ? saldoOperacionalDaConta(contaOrigem.value.id)
    : 0
)

function converterValor(texto) {
  return converterMonetarioBR(texto)
}

const valorNumerico = computed(() => converterValor(valor.value))
const tarifaNumerica = computed(() => converterValor(tarifa.value))

function formatarCampoValor() {
  valor.value = formatarMonetarioBR(valor.value)
}

function formatarCampoTarifa() {
  tarifa.value = formatarMonetarioBR(tarifa.value)
}

const totalDebitado = computed(() => {
  if (valorNumerico.value === null || tarifaNumerica.value === null) {
    return null
  }

  return valorNumerico.value + tarifaNumerica.value
})

const saldoOperacionalValido = computed(
  () =>
    typeof saldoDisponivel.value === 'number' &&
    Number.isFinite(saldoDisponivel.value) &&
    Number.isSafeInteger(Math.round(saldoDisponivel.value * 100))
)

const formularioValido = computed(() => {
  if (armazenamentoProtegido.value || executando.value) return false

  const origem = Number(contaOrigemId.value)
  const destino = Number(contaDestinoId.value)

  return (
    Number.isSafeInteger(origem) &&
    origem > 0 &&
    Number.isSafeInteger(destino) &&
    destino > 0 &&
    origem !== destino &&
    contasAtivas.value.some(conta => conta.id === origem) &&
    contasAtivas.value.some(conta => conta.id === destino) &&
    valorNumerico.value !== null &&
    valorNumerico.value > 0 &&
    tarifaNumerica.value !== null &&
    tarifaNumerica.value >= 0 &&
    totalDebitado.value !== null &&
    Number.isSafeInteger(Math.round(totalDebitado.value * 100))
  )
})

function prepararTransferencia() {
  if (!saldoOperacionalValido.value) {
    mensagemLocal.value =
      'Nao foi possivel validar o saldo operacional da conta.'
    tipoMensagem.value = 'erro'
    return
  }
  mensagemLocal.value = ''
  tipoMensagem.value = ''

  if (!formularioValido.value) {
    mensagemLocal.value = 'Verifique as contas, os valores e o saldo disponível.'
    tipoMensagem.value = 'erro'
    return
  }

  confirmacaoPendente.value = true
}

function cancelarConfirmacao() {
  confirmacaoPendente.value = false
}

function confirmarTransferencia() {
  if (!saldoOperacionalValido.value) {
    mensagemLocal.value =
      'Nao foi possivel validar o saldo operacional da conta.'
    tipoMensagem.value = 'erro'
    confirmacaoPendente.value = false
    return
  }
  if (executando.value) return

  confirmacaoPendente.value = false

  if (!formularioValido.value) {
    mensagemLocal.value = 'Os dados da transferência precisam ser revisados.'
    tipoMensagem.value = 'erro'
    return
  }

  executando.value = true

  try {
    const idTentativa = crypto.randomUUID()

    const sucesso = executarTransferencia({
      idTentativa,
      contaOrigemId: Number(contaOrigemId.value),
      contaDestinoId: Number(contaDestinoId.value),
      valor: valorNumerico.value,
      tarifa: tarifaNumerica.value
    })

    const resultadoTecnico = resultadoTecnicoTransferencia.value

    if (
      !sucesso &&
      resultadoTecnico?.idTentativa === idTentativa &&
      resultadoTecnico.situacao === 'verificacao_pendente' &&
      resultadoTecnico.requerVerificacao === true &&
      typeof idTentativa === 'string' &&
      idTentativa.trim()
    ) {
      if (!tentativasPendentesIds.value.includes(idTentativa)) {
        tentativasPendentesIds.value = [
          ...tentativasPendentesIds.value,
          idTentativa
        ]
      }
    }

    const resultadoDaTentativaAtual =
      resultadoTecnico &&
      resultadoTecnico.idTentativa === idTentativa

    const mensagemBase = aviso.value || (
      sucesso
        ? 'Transferência realizada com sucesso!'
        : 'Não foi possível realizar a transferência.'
    )

    if (
      !sucesso &&
      resultadoDaTentativaAtual &&
      resultadoTecnico.situacao === 'divergente'
    ) {
      mensagemLocal.value =
        mensagemBase +
        ' Foram identificadas inconsistências no registro da tentativa. ' +
        'É necessária verificação administrativa.'
    } else if (
      !sucesso &&
      resultadoDaTentativaAtual &&
      resultadoTecnico.situacao === 'verificacao_pendente' &&
      resultadoTecnico.requerVerificacao === true
    ) {
      mensagemLocal.value =
        mensagemBase +
        ' O registro desta tentativa requer verificação técnica.'
    } else {
      mensagemLocal.value = mensagemBase
    }
    tipoMensagem.value = sucesso ? 'sucesso' : 'erro'

    if (sucesso) {
      valor.value = ''
      tarifa.value = '0,00'
      contaDestinoId.value = ''
    }
  } catch {
    mensagemLocal.value = 'Ocorreu um erro ao executar a transferência.'
    tipoMensagem.value = 'erro'
  } finally {
    executando.value = false
  }
}
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="mb-6 flex items-start gap-3">
      <div class="rounded-xl bg-emerald-50 p-3 text-emerald-600">
        <ArrowLeftRight :size="22" />
      </div>

      <div>
        <h2 class="text-xl font-bold text-slate-800">
          Nova transferência
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          Transfira valores entre suas contas bancárias.
        </p>
      </div>
    </div>

    <div
      v-if="armazenamentoProtegido"
      class="mb-5 flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
    >
      <ShieldCheck :size="18" class="shrink-0" />
      <span>
        As operações financeiras estão protegidas até a verificação dos dados.
      </span>
    </div>

    <form class="space-y-3" @submit.prevent="prepararTransferencia">
      <div class="grid gap-x-4 gap-y-3 md:grid-cols-2">
        <div>
          <label for="transferencia-origem" class="nexus-label">
            Conta de origem
          </label>

          <select
            id="transferencia-origem"
            v-model="contaOrigemId"
            :disabled="armazenamentoProtegido || executando || confirmacaoPendente"
            class="nexus-select"
            @change="contaDestinoId = ''"
          >
            <option value="">Selecione a conta</option>
            <option
              v-for="conta in contasAtivas"
              :key="conta.id"
              :value="String(conta.id)"
            >
              {{ conta.nome }}
            </option>
          </select>

          <p v-if="contaOrigem" class="mt-2 text-xs text-slate-500">
            Saldo disponível:
            <strong class="text-slate-700">
              {{ moeda(saldoDisponivel) }}
            </strong>
          </p>
        </div>

        <div>
          <label for="transferencia-destino" class="nexus-label">
            Conta de destino
          </label>

          <select
            id="transferencia-destino"
            v-model="contaDestinoId"
            :disabled="armazenamentoProtegido || executando || confirmacaoPendente || !contaOrigemId"
            class="nexus-select"
          >
            <option value="">Selecione a conta</option>
            <option
              v-for="conta in contasDestino"
              :key="conta.id"
              :value="String(conta.id)"
            >
              {{ conta.nome }}
            </option>
          </select>
        </div>

        <div>
          <label for="transferencia-valor" class="nexus-label">
            Valor da transferência
          </label>

          <input
            id="transferencia-valor"
            v-model="valor"
            type="text"
            inputmode="decimal"
            placeholder="0,00"
            :disabled="armazenamentoProtegido || executando || confirmacaoPendente"
            class="nexus-input"
          @blur="formatarCampoValor"

          />
        </div>

        <div>
          <label for="transferencia-tarifa" class="nexus-label">
            Tarifa efetiva
          </label>

          <input
            id="transferencia-tarifa"
            v-model="tarifa"
            type="text"
            inputmode="decimal"
            placeholder="0,00"
            :disabled="armazenamentoProtegido || executando || confirmacaoPendente"
            class="nexus-input"
          @blur="formatarCampoTarifa"

          />
        </div>
      </div>

      <div class="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-slate-600">
            Total a debitar
          </span>
          <strong class="text-lg text-slate-900">
            {{ totalDebitado === null ? '—' : moeda(totalDebitado) }}
          </strong>
        </div>
        <p class="mt-1 text-xs text-slate-500">
          Valor da transferência acrescido da tarifa.
        </p>
      </div>

      <div
        v-if="mensagemLocal"
        role="status"
        class="flex items-start gap-2 rounded-xl p-3 text-sm"
        :class="tipoMensagem === 'sucesso'
          ? 'bg-emerald-50 text-emerald-800'
          : 'bg-red-50 text-red-700'"
      >
        <CheckCircle2 v-if="tipoMensagem === 'sucesso'" :size="18" />
        <AlertCircle v-else :size="18" />
        <span>{{ mensagemLocal }}</span>
      </div>

      <div
        v-if="tentativasPendentesExibidas.length > 0"
        data-secao="verificacao-pendencias"
        class="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-2 min-w-0">
            <ShieldCheck class="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-800">
                Verificação de transferências
              </p>
              <p class="text-xs text-slate-600">
                {{ tentativasPendentesExibidas.length }}
                tentativa(s) aguardando confirmação técnica.
              </p>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <div
            v-for="idTentativa in tentativasPendentesExibidas"
            :key="idTentativa"
            class="rounded-lg border border-slate-200 bg-white p-2.5"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="min-w-0">
                <p class="text-xs font-medium text-slate-700">
                  Tentativa pendente
                </p>
                <p class="text-[11px] text-slate-500 break-all">
                  ID: {{ idTentativa }}
                </p>
              </div>

              <button
                type="button"
                class="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="tentativaEmVerificacaoId !== null"
                @click="verificarTentativaPendente(idTentativa)"
              >
                {{
                  tentativaEmVerificacaoId === idTentativa
                  ? 'Verificando...'
                  : 'Verificar situação'
                  }}
              </button>
            </div>

            <p
              v-if="resultadosVerificacaoPendencias[idTentativa]"
              class="mt-2 text-xs text-slate-600"
              role="status"
            >
              {{
                resultadosVerificacaoPendencias[idTentativa].situacaoPersistencia
                === 'divergente'
                ? 'Divergência identificada. A tentativa permanece pendente.'
                : resultadosVerificacaoPendencias[idTentativa]
                .situacaoPersistencia === 'indeterminada'
                ? 'Situação indeterminada. É necessária nova verificação.'
                : resultadosVerificacaoPendencias[idTentativa]
                .situacaoPersistencia === 'nao_confirmada'
                ? 'Registro não confirmado. A tentativa permanece pendente.'
                : 'Aguardando confirmação segura do registro.'
                }}
            </p>
          </div>
        </div>
      </div>
<button
        type="submit"
        :disabled="!formularioValido"
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ArrowLeftRight :size="18" />
        {{ executando ? 'Processando...' : 'Continuar transferência' }}
      </button>
    </form>


<div
  v-if="confirmacaoPendente"
  class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5"
>
  <h3 class="text-lg font-bold text-slate-800">
    Confirmar transferência
  </h3>

  <p class="mt-2 text-sm text-slate-600">
    Confira os dados antes de confirmar a operação.
  </p>

  <div class="mt-4 space-y-3 rounded-xl bg-white p-4">

<!-- Contas da transferencia: layout responsivo -->
<div class="grid grid-cols-1 items-center gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">

  <!-- Conta de origem -->
  <div class="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <img
        v-if="identidadeOrigem?.logotipo && !logotipoOrigemComErro"
        :src="identidadeOrigem.logotipo"
        :alt="`Logotipo ${identidadeOrigem.nome}`"
        class="h-11 w-11 object-contain"
        @error="logotipoOrigemComErro = true"
      />
      <Landmark v-else :size="22" class="text-emerald-600" />
    </div>

    <div class="min-w-0">
      <p class="text-xs text-slate-500">Conta de origem</p>
      <p class="truncate font-semibold text-slate-800">
        {{ contaOrigem?.nome || 'Nao identificada' }}
      </p>
      <p class="truncate text-xs text-slate-500">
        {{ identidadeOrigem?.nome || contaOrigem?.instituicao }}
      </p>
    </div>
  </div>

  <!-- Direcao da transferencia -->
  <div class="flex justify-center py-1">
    <ArrowDown :size="20" class="text-emerald-600 md:-rotate-90" />
  </div>

  <!-- Conta de destino -->
  <div class="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
      <img
        v-if="identidadeDestino?.logotipo && !logotipoDestinoComErro"
        :src="identidadeDestino.logotipo"
        :alt="`Logotipo ${identidadeDestino.nome}`"
        class="h-11 w-11 object-contain"
        @error="logotipoDestinoComErro = true"
      />
      <Landmark v-else :size="22" class="text-emerald-600" />
    </div>

    <div class="min-w-0">
      <p class="text-xs text-slate-500">Conta de destino</p>
      <p class="truncate font-semibold text-slate-800">
        {{ contaDestino?.nome || 'Nao identificada' }}
      </p>
      <p class="truncate text-xs text-slate-500">
        {{ identidadeDestino?.nome || contaDestino?.instituicao }}
      </p>
    </div>
  </div>
</div>
    <div class="border-t border-slate-100 pt-3">
      <div class="flex justify-between gap-4">
        <span class="text-sm text-slate-500">Valor transferido</span>
        <strong class="text-sm text-slate-800">
          {{ moeda(valorNumerico ?? 0) }}
        </strong>
      </div>
    </div>

    <div class="flex justify-between gap-4">
      <span class="text-sm text-slate-500">Tarifa efetiva</span>
      <strong class="text-sm text-slate-800">
        {{ moeda(tarifaNumerica ?? 0) }}
      </strong>
    </div>

    <div class="flex justify-between gap-4 border-t border-slate-200 pt-3">
      <span class="font-semibold text-slate-800">
        Total a debitar
      </span>
      <strong class="text-lg text-emerald-700">
        {{ moeda(totalDebitado ?? 0) }}
      </strong>
    </div>
  </div>

  <div
    v-if="saldoOperacionalValido && totalDebitado !== null && totalDebitado > saldoDisponivel"
    role="alert"
    class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
  >
    <p class="font-semibold">Saldo insuficiente para executar a transferência</p>
    <p class="mt-1">
      Saldo disponível:
      <strong>{{ moeda(saldoDisponivel) }}</strong>.
      Total necessário, incluindo tarifa:
      <strong>{{ moeda(totalDebitado) }}</strong>.
    </p>
    <p class="mt-2 text-amber-800">
      Ao confirmar, a tentativa será submetida, mas a transferência
      será recusada por saldo insuficiente, sem movimentação financeira.
      O sistema tentará registrar a recusa no histórico.
    </p>
  </div>

  <div class="mt-4 flex flex-wrap gap-3">
    <button
      type="button"
      :disabled="executando"
      class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      @click="confirmarTransferencia"
    >
      Confirmar operação
    </button>

    <button
      type="button"
      :disabled="executando"
      class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      @click="cancelarConfirmacao"
    >
      Cancelar
    </button>
  </div>
</div>
  </section>
</template>
