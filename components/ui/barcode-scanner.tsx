"use client"

import * as React from "react"
import Quagga from "@ericblade/quagga2"
import { Button } from "./button"
import { X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = React.useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [isRequesting, setIsRequesting] = React.useState(false)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  const initializeCamera = React.useCallback(async () => {
    if (!isMounted || !videoRef.current) return

    try {
      setIsRequesting(true)

      // Primero verificamos si tenemos acceso a la cámara
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        })
        // Liberamos el stream después de la prueba
        stream.getTracks().forEach(track => track.stop())
      } catch (err) {
        console.error("Error accessing camera:", err)
        toast({
          title: "Error de Permisos",
          description: "Por favor, permite el acceso a la cámara para usar el escáner.",
          variant: "destructive",
        })
        onClose()
        return
      }

      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            facingMode: "environment",
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
          area: {
            top: "0%",
            right: "0%",
            left: "0%",
            bottom: "0%",
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: 0,
        decoder: {
          readers: ["ean_reader"],
          multiple: false,
        },
        locate: true,
      }

      await Quagga.init(config)
      console.log("Quagga initialized successfully")
      
      setIsRequesting(false)
      setIsInitialized(true)
      
      await Quagga.start()
      console.log("Quagga started successfully")

      Quagga.onDetected((result) => {
        const code = result.codeResult.code
        if (code && code.length === 13) {
          if (isInitialized) {
            Quagga.stop()
            setIsInitialized(false)
          }
          onDetected(code)
          onClose()
        }
      })

    } catch (error) {
      console.error("Error in scanner initialization:", error)
      setIsRequesting(false)
      toast({
        title: "Error",
        description: "No se pudo iniciar el escáner. Por favor, intenta de nuevo.",
        variant: "destructive",
      })
      onClose()
    }
  }, [onDetected, onClose, toast, isInitialized, isMounted])

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      initializeCamera()
    }, 1000) // Damos tiempo para que el DOM se monte completamente

    return () => {
      clearTimeout(timeoutId)
      if (isInitialized) {
        Quagga.stop()
        setIsInitialized(false)
      }
    }
  }, [initializeCamera, isInitialized])

  if (!isMounted) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl">
          <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
            <div 
              ref={videoRef} 
              className="absolute inset-0 bg-black rounded-lg overflow-hidden"
            />
            
            {/* Cuadro guía para el código de barras */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/2 border-2 border-primary rounded-lg">
                <div className="absolute inset-0 border-t-2 border-primary transform -translate-y-1/2"></div>
                <div className="absolute inset-0 border-l-2 border-primary transform -translate-x-1/2"></div>
                <div className="absolute inset-0 border-b-2 border-primary transform translate-y-1/2"></div>
                <div className="absolute inset-0 border-r-2 border-primary transform translate-x-1/2"></div>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="absolute top-4 right-4 z-10"
              onClick={() => {
                if (isInitialized) {
                  Quagga.stop()
                  setIsInitialized(false)
                }
                onClose()
              }}
            >
              <X className="h-4 w-4 mr-1" /> Cerrar
            </Button>
          </div>
          <p className="text-sm text-center mt-4 text-muted-foreground">
            {isRequesting 
              ? "Solicitando acceso a la cámara..."
              : "Coloca el código de barras dentro del cuadro"
            }
          </p>
        </div>
      </div>
    </div>
  )
} 