import { ref } from 'vue'

const CHAVE_PREFERENCIAS = 'nexus-financas-preferencias-v1'

const mostrarCentavos = ref(true)
const dicasFinanceiras = ref(true)

const moeda = 'BRL'

function carregarPreferencias() {
  try {
    const dados = localStorage.getItem(CHAVE_PREFERENCIAS)

    if (!dados) return

    const preferencias = JSON.parse(dados)

    if (
      !preferencias ||
      typeof preferencias !== 'object' ||
      Array.isArray(preferencias)
    ) {
      return
    }

    if (typeof preferencias.mostrarCentavos === 'boolean') {
      mostrarCentavos.value = preferencias.mostrarCentavos
    }

    if (typeof preferencias.dicasFinanceiras === 'boolean') {
      dicasFinanceiras.value = preferencias.dicasFinanceiras
    }
  } catch {
    mostrarCentavos.value = true
    dicasFinanceiras.value = true
  }
}

function salvarPreferencias() {
  try {
    localStorage.setItem(
      CHAVE_PREFERENCIAS,
      JSON.stringify({
        mostrarCentavos: mostrarCentavos.value,
        dicasFinanceiras: dicasFinanceiras.value,
        moeda
      })
    )

    return true
  } catch {
    return false
  }
}

function definirMostrarCentavos(valor) {
  const anterior = mostrarCentavos.value
  mostrarCentavos.value = valor === true

  if (!salvarPreferencias()) {
    mostrarCentavos.value = anterior
    return false
  }

  return true
}

function definirDicasFinanceiras(valor) {
  const anterior = dicasFinanceiras.value
  dicasFinanceiras.value = valor === true

  if (!salvarPreferencias()) {
    dicasFinanceiras.value = anterior
    return false
  }

  return true
}

carregarPreferencias()

export function usePreferencias() {
  return {
    mostrarCentavos,
    dicasFinanceiras,
    moeda,
    definirMostrarCentavos,
    definirDicasFinanceiras
  }
}