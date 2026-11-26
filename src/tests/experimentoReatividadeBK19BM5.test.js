import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

describe('BK.19-BF.1-BM.5-A - experimento de reatividade', () => {
  it('EX01 - intercepta e restaura ref com seguranca', () => {
    const referencia = ref([])
    const valorOriginal = referencia.value

    const prototipo = Object.getPrototypeOf(referencia)

    const descritor = Object.getOwnPropertyDescriptor(
      prototipo,
      'value'
    )

    expect(descritor).toBeDefined()
    expect(typeof descritor.get).toBe('function')
    expect(typeof descritor.set).toBe('function')
    expect(Object.isExtensible(referencia)).toBe(true)

    let falhaSimulada = false

    try {
      Object.defineProperty(referencia, 'value', {
        configurable: true,
        enumerable: descritor.enumerable,

        get() {
          return descritor.get.call(referencia)
        },

        set(novoValor) {
          if (!falhaSimulada) {
            falhaSimulada = true

            throw new Error(
              'Falha simulada na atualizacao da memoria'
            )
          }

          return descritor.set.call(referencia, novoValor)
        }
      })

      expect(() => {
        referencia.value = [{ id: 1 }]
      }).toThrow('Falha simulada na atualizacao da memoria')

      expect(falhaSimulada).toBe(true)
      expect(referencia.value).toEqual(valorOriginal)

    } finally {
      delete referencia.value
    }

    expect(
      Object.prototype.hasOwnProperty.call(referencia, 'value')
    ).toBe(false)

    referencia.value = [{ id: 2 }]

    expect(referencia.value).toEqual([{ id: 2 }])
  })
})