"use client"

import * as React from "react"
import Quagga from "quagga"
import { Button } from "./button"
import { X, Camera } from "lucide-react"
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

  const initializeCamera = React.useCallback(async () => {
    try {
      setIsRequesting(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
        } 
      })
      stream.getTracks().forEach(track => track.stop())

      if (!videoRef.current) return

      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            facingMode: "environment",
          },
          area: {
            top: "25%",
            right: "25%",
            left: "25%",
            bottom: "25%",
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: 4,
        frequency: 10,
        decoder: {
          readers: [
            "ean_13_reader",
          ],
          multiple: false,
        },
        locate: true,
      }

      Quagga.init(config, (err: Error | null) => {
        setIsRequesting(false)
        if (err) {
          console.error("Error initializing Quagga:", err)
          toast({
            title: "Error",
            description: "No se pudo iniciar el escáner. Por favor, intenta de nuevo.",
            variant: "destructive",
          })
          onClose()
          return
        }

        setIsInitialized(true)
        Quagga.start()

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
      })
    } catch (error) {
      setIsRequesting(false)
      console.error("Error accessing camera:", error)
      toast({
        title: "Error de Permisos",
        description: "Por favor, permite el acceso a la cámara para usar el escáner.",
        variant: "destructive",
      })
      onClose()
    }
  }, [onDetected, onClose, toast, isInitialized])

  React.useEffect(() => {
    initializeCamera()
    return () => {
      if (isInitialized) {
        Quagga.stop()
        setIsInitialized(false)
      }
    }
  }, [initializeCamera, isInitialized])

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-3xl aspect-video">
          <div className="relative w-full h-full">
            <div ref={videoRef} className="absolute inset-0 bg-black rounded-lg overflow-hidden" />
            
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