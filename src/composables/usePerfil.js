
import { ref } from 'vue'

// Chave exclusiva para os dados do perfil.
// Não modificar a chave utilizada pelo módulo financeiro.
const CHAVE_PERFIL = 'nexus-financas-perfil-v1'

export function usePerfil() {
  const perfil = ref({
    nome: '',
    email: '',
    telefone: ''
  })

  const erroPerfil = ref('')
  const sucessoPerfil = ref(false)
  const campoInvalido = ref('')

  function carregarPerfil() {
    erroPerfil.value = ''

    try {
      const dadosSalvos = localStorage.getItem(CHAVE_PERFIL)

      if (dadosSalvos === null) {
        return
      }

      const dados = JSON.parse(dadosSalvos)

      if (
        !dados ||
        typeof dados !== 'object' ||
        Array.isArray(dados) ||
        typeof dados.nome !== 'string' ||
        typeof dados.email !== 'string' ||
        typeof dados.telefone !== 'string'
      ) {
        throw new Error('Dados do perfil inválidos.')
      }

      perfil.value = {
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone
      }
    } catch {
      erroPerfil.value =
        'Não foi possível recuperar os dados do perfil. ' +
        'Os dados armazenados foram preservados.'
    }
  }

  function salvarPerfil() {
    erroPerfil.value = ''
    campoInvalido.value = ''
    sucessoPerfil.value = false

    const nome = perfil.value.nome.trim()
    const email = perfil.value.email.trim()
    const telefone = perfil.value.telefone.trim()
    const telefoneNumeros = telefone.replace(/\D/g, '')

    if (!nome) {
      campoInvalido.value = 'nome'
      erroPerfil.value = 'Informe seu nome completo.'
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      campoInvalido.value = 'email'
      erroPerfil.value = 'Informe um e-mail válido.'
      return false
    }

    if (!/^\d{10,11}$/.test(telefoneNumeros)) {
      campoInvalido.value = 'telefone'
      erroPerfil.value =
        'Informe um telefone brasileiro com DDD.'
      return false
    }

    const dadosValidados = {
      nome,
      email,
      telefone
    }

    try {
      localStorage.setItem(
        CHAVE_PERFIL,
        JSON.stringify(dadosValidados)
      )

      perfil.value = dadosValidados
      sucessoPerfil.value = true
      return true
    } catch {
      erroPerfil.value =
        'Não foi possível salvar o perfil. ' +
        'Verifique o armazenamento do navegador.'
      return false
    }
  }

  carregarPerfil()

  return {
    perfil,
    erroPerfil,
    sucessoPerfil,
    campoInvalido,
    salvarPerfil
  }
}
