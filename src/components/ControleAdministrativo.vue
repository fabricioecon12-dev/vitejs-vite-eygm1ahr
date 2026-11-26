<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  ClipboardList,
  ShieldCheck,
  Clock3,
  History,
  AlertTriangle,
  Database
} from 'lucide-vue-next'
import { useFinancas } from '../composables/useFinancas.js'

const {
  pendenciasTecnicasTransferencia,
  historicoRegularizacoesTecnicas,
  inconsistenciasPendenciasTecnicas,
  armazenamentoProtegido,
  consultarDadosAdministrativos
} = useFinancas()

const consultaAdministrativa = ref(null)

function atualizarConsultaAdministrativa() {
  try {
    consultaAdministrativa.value = consultarDadosAdministrativos()
  } catch {
    consultaAdministrativa.value = {
      estado: 'falha',
      mensagem: 'Nao foi possivel realizar a consulta administrativa.'
    }
  }
}

onMounted(atualizarConsultaAdministrativa)

const estadoConsulta = computed(() =>
  consultaAdministrativa.value?.estado ?? 'nao_consultado'
)

const tituloEstadoConsulta = computed(() => {
  const titulos = {
    valido: 'Dados persistidos validados',
    vazio: 'Nenhum dado persistido encontrado',
    inconsistente: 'Inconsistencia nos dados persistidos',
    falha: 'Falha na consulta administrativa',
    nao_consultado: 'Consulta ainda nao realizada'
  }

  return titulos[estadoConsulta.value] ??
    'Estado administrativo desconhecido'
})
const listaSegura = valor =>
  Array.isArray(valor) ? valor : []

const colecoesValidadas = computed(() =>
  estadoConsulta.value === 'valido'
    ? consultaAdministrativa.value?.colecoes
    : null
)

const indicadoresCertificados = computed(() =>
  colecoesValidadas.value !== null &&
  typeof colecoesValidadas.value === 'object'
)

const pendencias = computed(() =>
  indicadoresCertificados.value
    ? listaSegura(
        colecoesValidadas.value.pendenciasTecnicasTransferencia
      )
    : []
)

const historico = computed(() =>
  indicadoresCertificados.value
    ? listaSegura(
        colecoesValidadas.value.historicoRegularizacoesTecnicas
      )
    : []
)

const inconsistencias = computed(() =>
  indicadoresCertificados.value
    ? listaSegura(
        colecoesValidadas.value.inconsistenciasPendenciasTecnicas
      )
    : []
)

const reconciliacoes = computed(() =>
  historico.value.filter(
    item =>
      item &&
      typeof item === 'object' &&
      item.tipo === 'reconciliacao_administrativa'
  )
)

const secoes = computed(() => [
  {
    id: 'pendencias',
    titulo: 'Pendencias tecnicas',
    descricao: 'Ocorrencias que exigem verificacao.',
    quantidade: indicadoresCertificados.value
      ? pendencias.value.length
      : null,
    icone: Clock3
  },
  {
    id: 'historico',
    titulo: 'Historico administrativo',
    descricao: 'Registros administrativos disponiveis.',
    quantidade: indicadoresCertificados.value
      ? historico.value.length
      : null,
    icone: History
  },
  {
    id: 'reconciliacoes',
    titulo: 'Reconciliacoes registradas',
    descricao: 'Registros identificados pelo tipo administrativo.',
    quantidade: indicadoresCertificados.value
      ? reconciliacoes.value.length
      : null,
    icone: ClipboardList
  },
  {
    id: 'inconsistencias',
    titulo: 'Inconsistencias',
    descricao: 'Ocorrencias separadas para verificacao.',
    quantidade: indicadoresCertificados.value
      ? inconsistencias.value.length
      : null,
    icone: AlertTriangle
  }
])
const textoSeguro = valor =>
  typeof valor === 'string' && valor.trim()
    ? valor.trim()
    : 'Nao informado'

const dataSegura = valor => {
  if (typeof valor !== 'string' || !valor.trim()) {
    return 'Nao informado'
  }

  const data = new Date(valor)

  return Number.isNaN(data.getTime())
    ? 'Data invalida'
    : data.toLocaleString('pt-BR')
}

const ocorrenciasAdministrativas = computed(() => {
  const registros = []

  const adicionar = (colecao, tipo, identificar, situacao, motivo) => {
    colecao.forEach((item, indice) => {
      const objeto =
        item !== null &&
        typeof item === 'object' &&
        !Array.isArray(item)

      const registro = objeto ? item : {}

      registros.push({
        chave: `${tipo}-${indice}`,
        registroOriginal: registro,
        tipo,
        identificacao: textoSeguro(identificar(registro)),
        situacao: textoSeguro(situacao(registro)),
        motivo: textoSeguro(motivo(registro)),
        data: dataSegura(registro.dataHora),
        incompleto: !objeto ||
          !identificar(registro) ||
          !registro.dataHora
      })
    })
  }

  adicionar(
    pendencias.value,
    'Pendencia tecnica',
    item => item.idTentativa,
    item => item.situacaoPersistencia || item.situacao,
    item => item.motivoCodigo
  )

  adicionar(
    historico.value.filter(
      item => !item || item.tipo !== 'reconciliacao_administrativa'
    ),
    'Analise administrativa',
    item => item.idAnalise,
    item => item.situacao,
    item => item.justificativa
  )

  adicionar(
    reconciliacoes.value,
    'Reconciliacao',
    item => item.idReconciliacao,
    item => item.resultado,
    item => item.justificativa
  )

  adicionar(
    inconsistencias.value,
    'Inconsistencia',
    item => item.idTentativa || item.id,
    item => item.situacaoPersistencia || item.situacao,
    item => item.motivoCodigo || item.motivo
  )

  return registros
})
const detalheAberto = ref(null)

function alternarDetalhes(chave) {
  detalheAberto.value =
    detalheAberto.value === chave ? null : chave
}

function camposDetalhes(ocorrencia) {
  const registro = ocorrencia.registroOriginal

  if (
    !registro ||
    typeof registro !== 'object' ||
    Array.isArray(registro)
  ) {
    return []
  }

  const campos = [
    ['idTentativa', 'Tentativa'],
    ['idAnalise', 'Analise'],
    ['idReconciliacao', 'Reconciliacao'],
    ['idAnaliseAnterior', 'Referencia anterior'],
    ['responsavel', 'Responsavel'],
    ['justificativa', 'Justificativa'],
    ['evidencias', 'Evidencias'],
    ['resultado', 'Resultado'],
    ['situacao', 'Situacao'],
    ['situacaoPersistencia', 'Persistencia'],
    ['motivoCodigo', 'Motivo'],
    ['dataHora', 'Data e hora'],
    ['liberaOperacoes', 'Libera operacoes']
  ]

  return campos
    .filter(([chave]) =>
      Object.prototype.hasOwnProperty.call(registro, chave)
    )
    .map(([chave, rotulo]) => {
      const valor = registro[chave]
      let texto = 'Nao informado'

      if (Array.isArray(valor)) {
        texto = valor.length
          ? valor.map(item =>
              typeof item === 'string'
                ? item
                : 'Valor nao textual'
            ).join('; ')
          : 'Lista vazia'
      } else if (typeof valor === 'boolean') {
        texto = valor ? 'Sim' : 'Nao'
      } else if (typeof valor === 'string') {
        texto = valor.trim() || 'Nao informado'
      } else if (
        typeof valor === 'number' &&
        Number.isFinite(valor)
      ) {
        texto = String(valor)
      }

      return { chave, rotulo, texto }
    })
}
const pesquisaAdministrativa = ref('')
const filtroTipo = ref('')
const filtroSituacao = ref('')
const dataInicial = ref('')
const dataFinal = ref('')

const tiposDisponiveis = computed(() =>
  [...new Set(
    ocorrenciasAdministrativas.value.map(item => item.tipo)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'))
)

const situacoesDisponiveis = computed(() =>
  [...new Set(
    ocorrenciasAdministrativas.value.map(item => item.situacao)
  )].sort((a, b) => a.localeCompare(b, 'pt-BR'))
)

const filtrosAtivos = computed(() =>
  Boolean(
    pesquisaAdministrativa.value.trim() ||
    filtroTipo.value ||
    filtroSituacao.value ||
    dataInicial.value ||
    dataFinal.value
  )
)

const ocorrenciasFiltradas = computed(() => {
  const termo = pesquisaAdministrativa.value
    .trim()
    .toLocaleLowerCase('pt-BR')

  return ocorrenciasAdministrativas.value.filter(item => {
    if (termo) {
      const texto = [
        item.identificacao,
        item.situacao,
        item.motivo
      ].join(' ').toLocaleLowerCase('pt-BR')

      if (!texto.includes(termo)) return false
    }

    if (filtroTipo.value && item.tipo !== filtroTipo.value) {
      return false
    }

    if (
      filtroSituacao.value &&
      item.situacao !== filtroSituacao.value
    ) {
      return false
    }

    if (dataInicial.value || dataFinal.value) {
      const valor = item.registroOriginal?.dataHora

      if (typeof valor !== 'string') return false

      const data = new Date(valor)

      if (Number.isNaN(data.getTime())) return false

      const dia = [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, '0'),
        String(data.getDate()).padStart(2, '0')
      ].join('-')

      if (dataInicial.value && dia < dataInicial.value) {
        return false
      }

      if (dataFinal.value && dia > dataFinal.value) {
        return false
      }
    }

    return true
  })
})

function limparFiltrosAdministrativos() {
  pesquisaAdministrativa.value = ''
  filtroTipo.value = ''
  filtroSituacao.value = ''
  dataInicial.value = ''
  dataFinal.value = ''
  detalheAberto.value = null
}
const ordemAdministrativa = ref('recentes')
const tamanhoPagina = ref(10)
const paginaAtual = ref(1)

const ocorrenciasOrdenadas = computed(() => {
  const registros = [...ocorrenciasFiltradas.value]

  const obterData = item => {
    const valor = item.registroOriginal?.dataHora

    if (typeof valor !== 'string' || !valor.trim()) {
      return null
    }

    const data = new Date(valor)
    const tempo = data.getTime()

    return Number.isFinite(tempo) ? tempo : null
  }

  return registros.sort((a, b) => {
    const dataA = obterData(a)
    const dataB = obterData(b)

    if (dataA === null && dataB === null) return 0
    if (dataA === null) return 1
    if (dataB === null) return -1

    return ordemAdministrativa.value === 'recentes'
      ? dataB - dataA
      : dataA - dataB
  })
})

const totalPaginas = computed(() =>
  Math.max(
    1,
    Math.ceil(
      ocorrenciasOrdenadas.value.length / tamanhoPagina.value
    )
  )
)

const paginaSegura = computed(() =>
  Math.min(Math.max(1, paginaAtual.value), totalPaginas.value)
)

const ocorrenciasPaginadas = computed(() => {
  const inicio = (paginaSegura.value - 1) * tamanhoPagina.value

  return ocorrenciasOrdenadas.value.slice(
    inicio,
    inicio + tamanhoPagina.value
  )
})

const inicioExibicao = computed(() =>
  ocorrenciasOrdenadas.value.length
    ? (paginaSegura.value - 1) * tamanhoPagina.value + 1
    : 0
)

const fimExibicao = computed(() =>
  Math.min(
    paginaSegura.value * tamanhoPagina.value,
    ocorrenciasOrdenadas.value.length
  )
)

watch(
  [
    pesquisaAdministrativa,
    filtroTipo,
    filtroSituacao,
    dataInicial,
    dataFinal,
    ordemAdministrativa,
    tamanhoPagina
  ],
  () => {
    paginaAtual.value = 1
    detalheAberto.value = null
  },
  { flush: 'sync' }
)

watch(
  totalPaginas,
  total => {
    if (paginaAtual.value > total) {
      paginaAtual.value = total
      detalheAberto.value = null
    }
  },
  { flush: 'sync' }
)

function paginaAnterior() {
  if (paginaSegura.value > 1) {
    paginaAtual.value = paginaSegura.value - 1
    detalheAberto.value = null
  }
}

function paginaSeguinte() {
  if (paginaSegura.value < totalPaginas.value) {
    paginaAtual.value = paginaSegura.value + 1
    detalheAberto.value = null
  }
}
</script>

<template>
  <section class="space-y-4">
    <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ClipboardList :size="22" />
        </div>

        <div class="min-w-0">
          <h3 class="text-lg font-bold text-slate-800">
            Controle Administrativo
          </h3>
          <p class="mt-1 text-sm text-slate-500">
            Consulta de registros e acompanhamento administrativo.
          </p>
        </div>
      </div>
    </div>

    <div
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <Database :size="19" class="shrink-0 text-emerald-700" />
            <h4 class="text-sm font-semibold text-slate-800">
              Integridade dos dados persistidos
            </h4>
          </div>

          <p class="mt-2 text-sm font-semibold text-slate-700">
            {{ tituloEstadoConsulta }}
          </p>

          <p class="mt-1 text-xs leading-relaxed text-slate-500">
            {{
              consultaAdministrativa?.mensagem ||
              'Aguardando resultado da consulta administrativa.'
            }}
          </p>

          <p class="mt-2 text-xs text-slate-500">
            Consulta somente leitura, sem liberacao de operacoes financeiras.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          @click="atualizarConsultaAdministrativa"
        >
          Atualizar consulta
        </button>
      </div>
    </div>
    <div
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      role="status"
    >
      <div class="flex items-start gap-3">
        <ShieldCheck
          :size="20"
          class="mt-0.5 shrink-0 text-emerald-700"
        />

        <div class="min-w-0">
          <h4 class="text-sm font-semibold text-slate-800">
            Estado do armazenamento
          </h4>

          <p class="mt-1 text-sm text-slate-600">
            {{
              armazenamentoProtegido
                ? 'Protecao ativa: operacoes financeiras bloqueadas.'
                : 'Nenhum bloqueio global sinalizado pelo estado atual.'
            }}
          </p>

          <p class="mt-2 text-xs text-slate-500">
            A ausencia de bloqueio nao certifica a integridade
            dos registros administrativos.
          </p>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <article
        v-for="secao in secoes"
        :key="secao.id"
        class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <component :is="secao.icone" :size="19" />
          </div>

          <div class="min-w-0 flex-1">
            <h4 class="text-sm font-semibold text-slate-800">
              {{ secao.titulo }}
            </h4>

            <p class="mt-1 text-xs text-slate-500">
              {{ secao.descricao }}
            </p>

            <p class="mt-2 text-xl font-bold text-slate-800">
              {{ secao.quantidade === null ? '—' : secao.quantidade }}
            </p>

            <p class="mt-1 text-xs text-slate-500">
              {{ indicadoresCertificados ? 'Quantidade proveniente de dados validados.' : 'Quantidade indisponivel: consulta nao validada.' }}
            </p>
          </div>
        </div>
      </article>
    </div>

    <div class="rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div class="flex items-start gap-3">
        <Database
          :size="19"
          class="mt-0.5 shrink-0 text-blue-600"
        />

        <div>
          <h4 class="text-sm font-semibold text-slate-800">
            Consulta e integridade administrativa
          </h4>

          <p class="mt-1 text-sm leading-relaxed text-slate-600">
            Quando a consulta e validada, os totais representam registros das colecoes
            persistidas verificadas. Nao comprovam conclusao
            administrativa nem autorizam liberacao financeira.
          </p>

          <p class="mt-2 text-sm leading-relaxed text-slate-600">
            Nenhuma operacao administrativa ou financeira pode
            ser executada por este componente.
          </p>
        </div>
      </div>
    </div>
      <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-100 px-4 py-4">
        <h4 class="text-sm font-bold text-slate-800">
          Ocorrencias administrativas
        </h4>
        <p class="mt-1 text-xs text-slate-500">
          {{
  estadoConsulta === 'valido'
    ? 'Registros provenientes de dados persistidos validados.'
    : estadoConsulta === 'inconsistente'
      ? 'Registros indisponiveis: inconsistencias identificadas na consulta.'
      : estadoConsulta === 'falha'
        ? 'Registros indisponiveis: nao foi possivel validar os dados persistidos.'
        : estadoConsulta === 'vazio'
          ? 'Nenhum dado persistido disponivel. A ausencia de registros nao comprova integridade.'
          : 'Aguardando consulta administrativa.'
}}
        </p>
      </div>

      <div class="border-b border-slate-100 px-4 py-4">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label class="nexus-label !mb-0 flex flex-col gap-1 !text-xs xl:col-span-2">
            Pesquisa
            <input
              v-model="pesquisaAdministrativa"
              type="search"
              placeholder="Identificacao, situacao ou motivo"
              class="nexus-input !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-sm"
            />
          </label>

          <label class="nexus-label !mb-0 flex flex-col gap-1 !text-xs">
            Tipo
            <select
              v-model="filtroTipo"
              class="nexus-select !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-sm"
            >
              <option value="">Todos os tipos</option>
              <option
                v-for="tipo in tiposDisponiveis"
                :key="tipo"
                :value="tipo"
              >
                {{ tipo }}
              </option>
            </select>
          </label>

          <label class="nexus-label !mb-0 flex flex-col gap-1 !text-xs">
            Situacao
            <select
              v-model="filtroSituacao"
              class="nexus-select !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-sm"
            >
              <option value="">Todas as situacoes</option>
              <option
                v-for="situacao in situacoesDisponiveis"
                :key="situacao"
                :value="situacao"
              >
                {{ situacao }}
              </option>
            </select>
          </label>

          <label class="nexus-label !mb-0 flex flex-col gap-1 !text-xs">
            Data inicial
            <input
              v-model="dataInicial"
              type="date"
              class="nexus-input !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-sm"
            />
          </label>

          <label class="nexus-label !mb-0 flex flex-col gap-1 !text-xs">
            Data final
            <input
              v-model="dataFinal"
              type="date"
              class="nexus-input !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-sm"
            />
          </label>
        </div>

        <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-slate-500">
            {{ ocorrenciasFiltradas.length }}
            de {{ ocorrenciasAdministrativas.length }}
            ocorrencias disponiveis
          </p>

          <button
            type="button"
            :disabled="!filtrosAtivos"
            class="rounded-lg px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="limparFiltrosAdministrativos"
          >
            Limpar filtros
          </button>
        </div>
      </div>
      <div class="flex flex-wrap items-end gap-3 border-b border-slate-100 px-4 py-3">
        <label class="nexus-label !mb-0 flex min-w-[180px] flex-col gap-1 !text-xs">
          Ordenacao
          <select
            v-model="ordemAdministrativa"
            class="nexus-select !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-sm"
          >
            <option value="recentes">Mais recentes primeiro</option>
            <option value="antigos">Mais antigos primeiro</option>
          </select>
        </label>

        <label class="nexus-label !mb-0 flex min-w-[130px] flex-col gap-1 !text-xs">
          Por pagina
          <select
            v-model.number="tamanhoPagina"
            class="nexus-select !min-h-0 !rounded-lg !bg-white !px-3 !py-2 !text-sm"
          >
            <option :value="10">10 registros</option>
            <option :value="25">25 registros</option>
            <option :value="50">50 registros</option>
          </select>
        </label>

        <p class="pb-2 text-xs text-slate-500">
          Exibindo {{ inicioExibicao }}-{{ fimExibicao }}
          de {{ ocorrenciasOrdenadas.length }}
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-sm">
          <thead class="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th class="px-4 py-3 font-semibold">Tipo</th>
              <th class="px-4 py-3 font-semibold">Identificacao</th>
              <th class="px-4 py-3 font-semibold">Situacao</th>
              <th class="px-4 py-3 font-semibold">Motivo</th>
              <th class="px-4 py-3 font-semibold">Data</th>
              <th class="px-4 py-3 font-semibold">Detalhes</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <template
              v-for="ocorrencia in ocorrenciasPaginadas"
              :key="ocorrencia.chave"
            >
              <tr class="align-top">
              <td class="px-4 py-3 text-slate-700">
                {{ ocorrencia.tipo }}
              </td>

              <td class="px-4 py-3 font-medium text-slate-800">
                {{ ocorrencia.identificacao }}
              </td>

              <td class="px-4 py-3 text-slate-600">
                {{ ocorrencia.situacao }}
              </td>

              <td class="max-w-[220px] break-words px-4 py-3 text-slate-600">
                {{ ocorrencia.motivo }}
              </td>

              <td class="px-4 py-3 text-slate-600">
                {{ ocorrencia.data }}
              </td>

              <td class="px-4 py-3 text-xs">
                <button
                  type="button"
                  class="rounded-lg px-2 py-1 font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
                  :aria-expanded="detalheAberto === ocorrencia.chave"
                  @click="alternarDetalhes(ocorrencia.chave)"
                >
                  {{
                    detalheAberto === ocorrencia.chave
                      ? 'Ocultar detalhes'
                      : 'Ver detalhes'
                  }}
                </button>
              </td>
            </tr>

            <tr v-if="detalheAberto === ocorrencia.chave">
              <td colspan="6" class="bg-slate-50 px-4 py-4">
                <p class="mb-3 text-xs font-semibold text-slate-700">
                  {{
                    ocorrencia.incompleto
                      ? 'Registro com dados incompletos ou nao confirmados.'
                      : 'Dados provenientes de registros persistidos validados, sem conclusao administrativa automatica.'
                  }}
                </p>

                <dl
                  v-if="camposDetalhes(ocorrencia).length"
                  class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <div
                    v-for="campo in camposDetalhes(ocorrencia)"
                    :key="campo.chave"
                    class="min-w-0"
                  >
                    <dt class="text-xs font-semibold text-slate-500">
                      {{ campo.rotulo }}
                    </dt>
                    <dd class="mt-1 break-words text-sm text-slate-700">
                      {{ campo.texto }}
                    </dd>
                  </div>
                </dl>

                <p v-else class="text-xs text-slate-500">
                  Nenhum campo complementar disponivel.
                </p>
              </td>
            </tr>
          </template>

            <tr v-if="ocorrenciasFiltradas.length === 0">
              <td
                colspan="6"
                class="px-4 py-8 text-center text-sm text-slate-500"
              >
                <template v-if="ocorrenciasAdministrativas.length === 0">
                  {{
                    estadoConsulta === 'inconsistente'
                      ? 'Ocorrencias indisponiveis: inconsistencias identificadas na consulta.'
                      : estadoConsulta === 'falha'
                        ? 'Ocorrencias indisponiveis: nao foi possivel validar os dados persistidos.'
                        : estadoConsulta === 'vazio'
                          ? 'Nenhum dado persistido disponivel. A ausencia de registros nao comprova integridade.'
                          : estadoConsulta === 'valido'
                            ? 'Nenhuma ocorrencia administrativa encontrada nos dados validados.'
                            : 'Aguardando consulta administrativa.'
                  }}
                </template>
                <template v-else>
                  Nenhuma ocorrencia corresponde aos filtros selecionados.
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
        <p class="text-xs text-slate-500">
          Pagina {{ paginaSegura }} de {{ totalPaginas }}
        </p>

        <div class="flex items-center gap-2">
          <button
            type="button"
            :disabled="paginaSegura <= 1"
            class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="paginaAnterior"
          >
            Anterior
          </button>

          <button
            type="button"
            :disabled="paginaSegura >= totalPaginas"
            class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            @click="paginaSeguinte"
          >
            Proxima
          </button>
        </div>
      </div>
    </div>
  </section>
</template>