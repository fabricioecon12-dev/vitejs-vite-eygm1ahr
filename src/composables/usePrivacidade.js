import { ref } from 'vue'

const CHAVE_PRIVACIDADE = 'nexus-financas-privacidade-v1'

function carregarPreferencia() {
  try {
    const valor = localStorage.getItem(CHAVE_PRIVACIDADE)

    if (valor === null) {
      return false
    }

    return valor === 'true'
  } catch {
    return false
  }
}

const ocultarValores = ref(carregarPreferencia())

function definirOcultacao(valor) {
  const novoValor = valor === true

  try {
    localStorage.setItem(CHAVE_PRIVACIDADE, String(novoValor))
    ocultarValores.value = novoValor
    return true
  } catch {
    return false
  }
}

function valorVisivel(valorFormatado) {
  return ocultarValores.value
    ? 'R$ ••••••'
    : valorFormatado
}

export function usePrivacidade() {
  return {
    ocultarValores,
    definirOcultacao,
    valorVisivel
  }
}
