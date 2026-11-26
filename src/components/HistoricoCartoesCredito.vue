<script setup>
import { computed, ref } from 'vue'
import {
  History,
  CreditCard,
  ShoppingBag,
  ReceiptText,
  ShieldCheck,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-vue-next'
import { useFinancas } from '../composables/useFinancas.js'

const {
  cartoesCredito,
  comprasCartao,
  faturasCartao,
  fechamentosFatura,
  moeda
} = useFinancas()

const abaHistoricoAtiva = ref('financeiras')

const filtroCartao = ref('')
const filtroTipo = ref('')
const filtroPeriodo = ref('')
const pesquisa = ref('')
const expandido = ref(null)

const REGISTROS_POR_PAGINA = 5
const paginaAtual = ref(1)

const tipos = [
  { valor: '', nome: 'Todos os tipos' },
  { valor: 'compra', nome: 'Compras' },
  { valor: 'fatura', nome: 'Faturas' },
  { valor: 'fechamento', nome: 'Fechamentos' },
  { valor: 'cartao', nome: 'Cartões cadastrados' }
]

const cartoesOrdenados = computed(() =>
  [...cartoesCredito.value].sort((a, b) =>
    String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR')
  )
)

const nomesCartoes = computed(() =>
  new Map(cartoesCredito.value.map(cartao => [String(cartao.id), cartao.nome]))
)

function nomeCartao(id) {
  return nomesCartoes.value.get(String(id)) ?? `Cartão #${id}`
}

function dataValida(valor) {
  if (typeof valor !== 'string' || !valor.trim()) return null

  const data = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T12:00:00`)
    : new Date(valor)

  return Number.isNaN(data.getTime()) ? null : data
}

function formatarData(valor) {
  const data = dataValida(valor)
  return data
    ? new Intl.DateTimeFormat('pt-BR').format(data)
    : 'Data não disponível'
}

function formatarCompetencia(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}$/.test(valor)) {
    return 'Não informada'
  }

  const [ano, mes] = valor.split('-').map(Number)
  if (mes < 1 || mes > 12) return 'Não informada'

  return `${String(mes).padStart(2, '0')}/${ano}`
}

function validarFechamentoHistorico(evento) {
  const invalido = motivo => ({ valido: false, motivo })

  if (!evento || typeof evento !== 'object' || Array.isArray(evento)) {
    return invalido('Registro de fechamento inválido')
  }

  const faturas = faturasCartao.value.filter(
    fatura => fatura?.id === evento.faturaId
  )

  if (faturas.length !== 1) {
    return invalido('Fatura ausente ou duplicada')
  }

  const fatura = faturas[0]

  const eventosFatura = fechamentosFatura.value.filter(
    item => item?.faturaId === evento.faturaId
  )

  if (eventosFatura.length !== 1) {
    return invalido('Fechamentos duplicados')
  }

  const eventosMesmoId = fechamentosFatura.value.filter(
    item => item?.id === evento.id
  )

  if (
    typeof evento.id !== 'string' ||
    evento.id !== `fechamento-${evento.faturaId}` ||
    eventosMesmoId.length !== 1
  ) {
    return invalido('Identificador de fechamento inconsistente')
  }

  const dataEfetiva = typeof evento.fechamentoEfetivoEm === 'string'
    ? new Date(evento.fechamentoEfetivoEm)
    : null

  if (
    !dataEfetiva ||
    !Number.isFinite(dataEfetiva.getTime()) ||
    dataEfetiva.toISOString() !== evento.fechamentoEfetivoEm
  ) {
    return invalido('Data efetiva de fechamento inválida')
  }

  if (
    !Number.isSafeInteger(fatura.id) ||
    fatura.id <= 0 ||
    !Number.isSafeInteger(fatura.cartaoId) ||
    fatura.cartaoId <= 0 ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(fatura.competencia) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fatura.fechamento) ||
    fatura.status !== 'fechada' ||
    !Array.isArray(fatura.parcelas)
  ) {
    return invalido('Estrutura da fatura inconsistente')
  }

  const [ano, mes, dia] = fatura.fechamento.split('-').map(Number)
  const dataPrevista = new Date(Date.UTC(ano, mes - 1, dia))

  if (
    dataPrevista.getUTCFullYear() !== ano ||
    dataPrevista.getUTCMonth() + 1 !== mes ||
    dataPrevista.getUTCDate() !== dia
  ) {
    return invalido('Data prevista de fechamento inválida')
  }

  if (
    cartoesCredito.value.filter(cartao => cartao?.id === fatura.cartaoId).length !== 1
  ) {
    return invalido('Cartão vinculado ausente ou duplicado')
  }

  if (
    evento.status !== 'confirmado' ||
    evento.cartaoId !== fatura.cartaoId ||
    evento.competencia !== fatura.competencia ||
    evento.fechamentoPrevisto !== fatura.fechamento
  ) {
    return invalido('Divergência entre fatura e fechamento')
  }

  const emCentavos = valor => {
    if (
      typeof valor !== 'number' ||
      !Number.isFinite(valor) ||
      valor < 0
    ) return null

    const calculado = valor * 100
    const arredondado = Math.round(calculado)

    return Number.isSafeInteger(arredondado) &&
      Math.abs(calculado - arredondado) <= 0.000001
      ? arredondado
      : null
  }

  const identificadores = new Set()
  let totalCentavos = 0

  for (const parcela of fatura.parcelas) {
    if (
      !parcela ||
      typeof parcela !== 'object' ||
      Array.isArray(parcela) ||
      !Number.isSafeInteger(parcela.compraId) ||
      parcela.compraId <= 0 ||
      !Number.isSafeInteger(parcela.numero) ||
      parcela.numero <= 0 ||
      !Number.isSafeInteger(parcela.total) ||
      parcela.total <= 0 ||
      parcela.numero > parcela.total ||
      parcela.competencia !== fatura.competencia
    ) {
      return invalido('Parcela da fatura inválida')
    }

    const compras = comprasCartao.value.filter(
      compra => compra?.id === parcela.compraId
    )

    if (
      compras.length !== 1 ||
      compras[0].cartaoId !== fatura.cartaoId ||
      !Array.isArray(compras[0].parcelas)
    ) {
      return invalido('Compra vinculada inválida')
    }

    const compra = compras[0]

    if (
      !Number.isSafeInteger(compra.quantidadeParcelas) ||
      parcela.total !== compra.quantidadeParcelas
    ) {
      return invalido('Quantidade de parcelas inconsistente')
    }

    const originais = compra.parcelas.filter(
      item => item?.numero === parcela.numero
    )

    if (originais.length !== 1) {
      return invalido('Parcela original ausente ou duplicada')
    }

    const original = originais[0]
    const centavos = emCentavos(parcela.valor)
    const centavosOriginais = emCentavos(original.valor)

    if (
      original.compraId !== parcela.compraId ||
      original.total !== parcela.total ||
      original.competencia !== parcela.competencia ||
      centavos === null ||
      centavosOriginais === null ||
      centavos !== centavosOriginais
    ) {
      return invalido('Dados da parcela divergem da compra original')
    }

    const chave = `${parcela.compraId}:${parcela.numero}`

    if (identificadores.has(chave)) {
      return invalido('Parcela duplicada na fatura')
    }

    identificadores.add(chave)

    const ocorrencias = faturasCartao.value.reduce(
      (total, item) => total + (
        Array.isArray(item?.parcelas)
          ? item.parcelas.filter(
              p => p?.compraId === parcela.compraId &&
                p?.numero === parcela.numero
            ).length
          : 0
      ),
      0
    )

    if (ocorrencias !== 1) {
      return invalido('Parcela vinculada a faturas conflitantes')
    }

    if (!Number.isSafeInteger(totalCentavos + centavos)) {
      return invalido('Valor consolidado excede limite seguro')
    }

    totalCentavos += centavos
  }

  if (
    !Number.isSafeInteger(evento.valorConsolidadoCentavos) ||
    evento.valorConsolidadoCentavos !== totalCentavos
  ) {
    return invalido('Valor consolidado divergente')
  }

  return { valido: true, motivo: null }
}
function formatarDataHora(valor) {
  const data = dataValida(valor)

  return data
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(data)
    : 'Data e hora indisponíveis'
}
const eventos = computed(() => {
  const resultado = []

  for (const cartao of cartoesCredito.value) {
    resultado.push({
      chave: `cartao-${cartao.id}`,
      tipo: 'cartao',
      cartaoId: cartao.id,
      titulo: 'Cartão cadastrado',
      descricao: cartao.instituicao,
      data: cartao.dataCriacao,
      valor: null,
      detalhes: [
        ['Instituição', cartao.instituicao],
        ['Bandeira', cartao.bandeira],
        ['Situação atual', cartao.status],
        ['Limite contratado', moeda(cartao.limiteTotal)]
      ]
    })
  }

  for (const compra of comprasCartao.value) {
    resultado.push({
      chave: `compra-${compra.id}`,
      tipo: 'compra',
      cartaoId: compra.cartaoId,
      titulo: 'Compra registrada',
      descricao: compra.descricao,
      data: compra.data,
      valor: compra.valor,
      detalhes: [
        ['Cartão', nomeCartao(compra.cartaoId)],
        ['Data da compra', formatarData(compra.data)],
        ['Registrada em', formatarData(compra.dataCriacao)],
        ['Situação atual', compra.status],
        ['Parcelamento', `${compra.quantidadeParcelas ?? 1} parcela(s)`]
      ],
      parcelas: Array.isArray(compra.parcelas) ? compra.parcelas : []
    })
  }

  for (const fatura of faturasCartao.value) {
    const parcelas = Array.isArray(fatura.parcelas) ? fatura.parcelas : []
    const total = parcelas.every(parcela =>
      typeof parcela.valor === 'number' && Number.isFinite(parcela.valor)
    )
      ? parcelas.reduce((soma, parcela) => soma + parcela.valor, 0)
      : null

    resultado.push({
      chave: `fatura-${fatura.id}`,
      tipo: 'fatura',
      cartaoId: fatura.cartaoId,
      titulo: 'Fatura gerada',
      descricao: `Competência ${formatarCompetencia(fatura.competencia)}`,
      data: fatura.fechamento,
      valor: total,
      dataRepresentaCiclo: true,
      detalhes: [
        ['Cartão', nomeCartao(fatura.cartaoId)],
        ['Competência', formatarCompetencia(fatura.competencia)],
        ['Fechamento previsto', formatarData(fatura.fechamento)],
        ['Vencimento', formatarData(fatura.vencimento)],
        ['Situação atual', fatura.status],
        ['Quantidade de parcelas', parcelas.length]
      ],
      parcelas
    })
  }

  for (const [indiceFechamento, fechamento] of fechamentosFatura.value.entries()) {
    const validacao = validarFechamentoHistorico(fechamento)

    const valorCentavos = fechamento?.valorConsolidadoCentavos

    const valor = validacao.valido
      ? valorCentavos / 100
      : null

    resultado.push({
      chave: `fechamento-${indiceFechamento}-${String(fechamento?.id)}`,
      tipo: 'fechamento',
      integridadeConfirmada: validacao.valido,
      cartaoId: fechamento?.cartaoId,
      titulo: validacao.valido
        ? 'Fechamento confirmado'
        : 'Fechamento com inconsistência',
      descricao: `Competência ${formatarCompetencia(fechamento?.competencia)}`,
      data: fechamento?.fechamentoEfetivoEm,
      valor,
      detalhes: [
        ['Cartão', nomeCartao(fechamento?.cartaoId)],
        ['Identificador do fechamento', fechamento?.id],
        ['Fatura vinculada', fechamento?.faturaId],
        ['Competência', formatarCompetencia(fechamento?.competencia)],
        ['Fechamento previsto', formatarData(fechamento?.fechamentoPrevisto)],
        ['Fechamento efetivo', formatarDataHora(fechamento?.fechamentoEfetivoEm)],
        ['Situação registrada', fechamento?.status],
        ['Integridade', validacao.valido ? 'Confirmada' : validacao.motivo],
        ['Valor consolidado', validacao.valido ? moeda(valor) : 'Indisponível']
      ]
    })
  }
  return resultado.sort((a, b) => {
    const dataA = dataValida(a.data)?.getTime() ?? -Infinity
    const dataB = dataValida(b.data)?.getTime() ?? -Infinity
    return dataB - dataA || a.chave.localeCompare(b.chave)
  })
})

const periodos = computed(() => {
  const encontrados = new Set()

  for (const evento of eventos.value) {
    const data = dataValida(evento.data)
    if (!data) continue

    encontrados.add(
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
    )
  }

  return [...encontrados].sort().reverse()
})

const eventosFiltrados = computed(() => {
  const termo = pesquisa.value.trim().toLocaleLowerCase('pt-BR')

  return eventos.value.filter(evento => {
    if (filtroCartao.value && String(evento.cartaoId) !== filtroCartao.value) {
      return false
    }

    if (filtroTipo.value && evento.tipo !== filtroTipo.value) {
      return false
    }

    if (filtroPeriodo.value) {
      const data = dataValida(evento.data)
      if (!data) return false

      const periodo =
        `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`

      if (periodo !== filtroPeriodo.value) return false
    }

    if (termo) {
      const conteudo = [
        evento.titulo,
        evento.descricao,
        nomeCartao(evento.cartaoId),
        ...evento.detalhes.map(detalhe => detalhe[1])
      ].join(' ').toLocaleLowerCase('pt-BR')

      if (!conteudo.includes(termo)) return false
    }

    return true
  })
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(eventosFiltrados.value.length / REGISTROS_POR_PAGINA))
)

const paginaSegura = computed(() =>
  Math.min(Math.max(1, paginaAtual.value), totalPaginas.value)
)

const eventosPaginados = computed(() => {
  const inicio = (paginaSegura.value - 1) * REGISTROS_POR_PAGINA
  return eventosFiltrados.value.slice(inicio, inicio + REGISTROS_POR_PAGINA)
})

const primeiroRegistro = computed(() =>
  eventosFiltrados.value.length === 0
    ? 0
    : (paginaSegura.value - 1) * REGISTROS_POR_PAGINA + 1
)

const ultimoRegistro = computed(() =>
  Math.min(
    paginaSegura.value * REGISTROS_POR_PAGINA,
    eventosFiltrados.value.length
  )
)

function alterarPagina(numero) {
  if (
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > totalPaginas.value
  ) return

  paginaAtual.value = numero
  expandido.value = null
}

function reiniciarPaginacao() {
  paginaAtual.value = 1
  expandido.value = null
}

const indicadores = computed(() => ({
  compras: comprasCartao.value.length,
  faturas: faturasCartao.value.length,
  cartoes: cartoesCredito.value.length
}))

function alternarDetalhes(chave) {
  expandido.value = expandido.value === chave ? null : chave
}

function iconeEvento(evento) {
  if (evento.tipo === 'fechamento') {
    return evento.integridadeConfirmada === false
      ? AlertTriangle
      : ShieldCheck
  }

  return evento.tipo === 'compra'
    ? ShoppingBag
    : evento.tipo === 'fatura'
      ? ReceiptText
      : CreditCard
}
</script>

<template>
  <section class="space-y-3">
    <header class="flex items-center gap-3 border-b border-slate-100 pb-3">
      <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <History :size="19" />
      </div>

      <div class="min-w-0">
        <h2 class="text-lg font-bold text-slate-800">
          Histórico de operações
        </h2>
        <p class="text-xs text-slate-500">
          Consulta consolidada das operações dos cartões de crédito.
        </p>
      </div>
    </header>

    <nav
      class="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1.5"
      aria-label="Categorias do histórico"
    >
      <button
        type="button"
        class="nexus-historico-aba flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
        :class="abaHistoricoAtiva === 'financeiras'
          ? 'bg-white text-emerald-700'
          : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'"
        :aria-current="abaHistoricoAtiva === 'financeiras' ? 'page' : undefined"
        @click="abaHistoricoAtiva = 'financeiras'"
      >
        <ReceiptText :size="16" />
        Operações financeiras
      </button>

      <button
        type="button"
        class="nexus-historico-aba flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
        :class="abaHistoricoAtiva === 'administrativas'
          ? 'bg-white text-emerald-700'
          : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'"
        :aria-current="abaHistoricoAtiva === 'administrativas' ? 'page' : undefined"
        @click="abaHistoricoAtiva = 'administrativas'"
      >
        <ShieldCheck :size="16" />
        Eventos administrativos
      </button>
    </nav>

    <div v-if="abaHistoricoAtiva === 'financeiras'" class="space-y-3">
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <div
        v-for="indicador in [
          { nome: 'Compras registradas', valor: indicadores.compras },
          { nome: 'Faturas geradas', valor: indicadores.faturas },
          { nome: 'Cartões cadastrados', valor: indicadores.cartoes }
        ]"
        :key="indicador.nome"
        class="rounded-xl border border-slate-200 bg-white px-3 py-1.5"
      >
        <p class="text-xs font-medium text-slate-500">
          {{ indicador.nome }}
        </p>
        <p class="mt-0.5 text-lg font-bold text-slate-800">
          {{ indicador.valor }}
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 xl:grid-cols-4">
      <div class="nexus-field">
        <label for="historico-cartao" class="nexus-label">Cartão</label>
        <select id="historico-cartao" v-model="filtroCartao" @change="reiniciarPaginacao" class="nexus-select">
          <option value="">Todos os cartões</option>
          <option
            v-for="cartao in cartoesOrdenados"
            :key="cartao.id"
            :value="String(cartao.id)"
          >
            {{ cartao.nome }}
          </option>
        </select>
      </div>

      <div class="nexus-field">
        <label for="historico-tipo" class="nexus-label">Tipo de operação</label>
        <select id="historico-tipo" v-model="filtroTipo" @change="reiniciarPaginacao" class="nexus-select">
          <option v-for="tipo in tipos" :key="tipo.valor" :value="tipo.valor">
            {{ tipo.nome }}
          </option>
        </select>
      </div>

      <div class="nexus-field">
        <label for="historico-periodo" class="nexus-label">Período</label>
        <select id="historico-periodo" v-model="filtroPeriodo" @change="reiniciarPaginacao" class="nexus-select">
          <option value="">Todos os períodos</option>
          <option v-for="periodo in periodos" :key="periodo" :value="periodo">
            {{ formatarCompetencia(periodo) }}
          </option>
        </select>
      </div>

      <div class="nexus-field">
        <label for="historico-pesquisa" class="nexus-label">Pesquisar</label>
        <div class="relative">
          <Search :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="historico-pesquisa"
            v-model="pesquisa" @input="reiniciarPaginacao"
            type="text"
            class="nexus-input !pl-10"
            placeholder="Descrição ou cartão"
          />
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3">
      <h3 class="text-sm font-semibold text-slate-800">
        Linha do tempo
      </h3>
      <span class="text-xs text-slate-500">
        {{ eventosFiltrados.length }} registro(s)
      </span>
    </div>

    <div
      v-if="eventosFiltrados.length === 0"
      class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center"
    >
      <History :size="24" class="mx-auto text-slate-400" />
      <p class="mt-2 text-sm font-medium text-slate-700">
        Nenhum registro encontrado.
      </p>
      <p class="mt-1 text-xs text-slate-500">
        Verifique os filtros ou registre operações nos cartões.
      </p>
    </div>

    <div v-else class="space-y-1.5">
      <article
        v-for="evento in eventosPaginados"
        :key="evento.chave"
        class="nexus-historico-item"
      >
        <button
          type="button"
          class="nexus-historico-item-botao flex w-full items-center gap-3 px-4 py-2 text-left transition-colors"
          :aria-expanded="expandido === evento.chave"
          @click="alternarDetalhes(evento.chave)"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            :class="evento.tipo === 'fechamento' && evento.integridadeConfirmada === false
              ? 'bg-amber-50 text-amber-700'
              : 'bg-emerald-50 text-emerald-700'"
          >
            <component :is="iconeEvento(evento)" :size="17" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold leading-5 text-slate-800">
              {{ evento.titulo }}
            </p>
            <p class="truncate text-xs leading-4 text-slate-500">
              {{ evento.descricao }} · {{ nomeCartao(evento.cartaoId) }}
            </p>
          </div>

          <div class="shrink-0 text-right">
            <p v-if="evento.valor !== null" class="text-sm font-semibold text-slate-800">
              {{ moeda(evento.valor) }}
            </p>
            <p
              v-else-if="evento.tipo === 'fechamento' && evento.integridadeConfirmada === false"
              class="text-xs font-semibold text-amber-700"
            >
              Valor indisponível
            </p>
            <p class="text-xs text-slate-500">
              {{ formatarData(evento.data) }}
            </p>
          </div>

          <ChevronUp
            v-if="expandido === evento.chave"
            :size="16"
            class="shrink-0 text-slate-400"
          />
          <ChevronDown
            v-else
            :size="16"
            class="shrink-0 text-slate-400"
          />
        </button>

        <div
          v-if="expandido === evento.chave"
          class="border-t border-slate-100 bg-slate-50/70 px-4 py-2.5"
        >
          <p
            v-if="evento.dataRepresentaCiclo"
            class="mb-3 text-xs text-slate-500"
          >
            A data exibida corresponde ao fechamento previsto do ciclo,
            não a um evento de fechamento confirmado.
          </p>

          <div
            v-if="evento.tipo === 'fechamento' && evento.integridadeConfirmada === false"
            class="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
            role="alert"
          >
            <AlertTriangle :size="16" class="mt-0.5 shrink-0" />
            <div class="min-w-0">
              <p class="font-semibold">Integridade não confirmada</p>
              <p class="mt-0.5 break-words">
                {{ evento.detalhes.find(detalhe => detalhe[0] === 'Integridade')?.[1] ?? 'Motivo não informado' }}
              </p>
            </div>
          </div>

          <dl class="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
            <div v-for="detalhe in evento.detalhes" :key="detalhe[0]">
              <dt class="text-xs text-slate-500">
                {{ detalhe[0] }}
              </dt>
              <dd class="mt-0.5 text-sm font-medium text-slate-700">
                {{ detalhe[1] ?? 'Não informado' }}
              </dd>
            </div>
          </dl>

          <div v-if="evento.parcelas?.length" class="mt-3">
            <h4 class="mb-2 text-xs font-semibold text-slate-700">
              Parcelas vinculadas
            </h4>

            <div class="space-y-1">
              <div
                v-for="(parcela, indice) in evento.parcelas"
                :key="`${parcela.compraId}-${parcela.numero}-${indice}`"
                class="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <span class="text-slate-600">
                  Parcela {{ parcela.numero }}/{{ parcela.total }}
                  · {{ formatarCompetencia(parcela.competencia) }}
                </span>
                <span class="font-semibold text-slate-800">
                  {{ moeda(parcela.valor) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>

    <!-- Paginacao do historico -->
    <footer
      v-if="eventosFiltrados.length > 0"
      class="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="text-xs text-slate-500">
        Página {{ paginaSegura }} de {{ totalPaginas }}
        <span class="mx-1">·</span>
        Exibindo {{ primeiroRegistro }}–{{ ultimoRegistro }}
        de {{ eventosFiltrados.length }}
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="paginaSegura <= 1"
          @click="alterarPagina(paginaSegura - 1)"
        >
          Anterior
        </button>

        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="paginaSegura >= totalPaginas"
          @click="alterarPagina(paginaSegura + 1)"
        >
          Próxima
        </button>
      </div>
    </footer>
    </div>

    <section
      v-else
      class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-7 text-center"
      aria-label="Eventos administrativos"
    >
      <ShieldCheck :size="28" class="mx-auto text-slate-400" />

      <h3 class="mt-3 text-sm font-semibold text-slate-700">
        Nenhum evento administrativo de cartões registrado.
      </h3>

      <p class="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500">
        Os eventos administrativos serão apresentados aqui quando
        houver registros específicos de cartões disponíveis para consulta.
      </p>
    </section>
  </section>
</template>
<style scoped>
.nexus-historico-aba {
  border: 1px solid transparent;
  background-color: transparent;
  box-shadow: none;
  outline: none;
}

.nexus-historico-aba:hover {
  border-color: transparent;
  box-shadow: none;
}

.nexus-historico-aba:focus:not(:focus-visible) {
  outline: none;
}

.nexus-historico-aba:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

.nexus-historico-item {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: none;
  outline: none;
  transition: border-color 180ms ease;
}

.nexus-historico-item:hover {
  border-color: #cbd5e1;
}

.nexus-historico-item-botao {
  display: flex;
  width: 100%;
  border: 0;
  border-radius: 0;
  background-color: #ffffff;
  box-shadow: none;
  outline: none;
}

.nexus-historico-item-botao:hover {
  background-color: #f8fafc;
}

.nexus-historico-item-botao:focus:not(:focus-visible) {
  outline: none;
}

.nexus-historico-item-botao:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid #10b981;
  outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
  .nexus-historico-item {
    transition: none;
  }
}
</style>