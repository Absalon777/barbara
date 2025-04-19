declare module 'quagga' {
  interface QuaggaConfig {
    inputStream: {
      name: string
      type: string
      target?: HTMLElement | null
      constraints?: {
        width?: number
        height?: number
        facingMode?: string
      }
    }
    locator: {
      patchSize: string
      halfSample: boolean
    }
    decoder: {
      readers: string[]
    }
    locate: boolean
  }

  interface QuaggaResult {
    codeResult: {
      code: string
      format: string
    }
  }

  interface Quagga {
    init(config: QuaggaConfig): Promise<void>
    start(): void
    stop(): void
    onDetected(callback: (result: QuaggaResult) => void): void
  }

  const Quagga: Quagga
  export default Quagga
} 