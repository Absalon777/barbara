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

  React.useEffect(() => {
    if (!videoRef.current) return

    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            facingMode: "environment",
            width: { min: 450 },
            height: { min: 300 },
            aspectRatio: { min: 1, max: 2 },
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
            "ean_reader",
            "ean_8_reader",
            "code_128_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "upc_reader",
            "upc_e_reader",
          ],
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error("Error al iniciar el escáner:", err)
          toast({
            title: "Error",
            description: "No se pudo iniciar la cámara. Verifica los permisos.",
            variant: "destructive",
          })
          onClose()
          return
        }

        Quagga.start()

        Quagga.onDetected((result) => {
          const code = result.codeResult.code
          if (code) {
            onDetected(code)
            Quagga.stop()
            onClose()
          }
        })
      }
    )

    return () => {
      Quagga.stop()
    }
  }, [onDetected, onClose, toast])

  return (
    <div className="relative">
      <div ref={videoRef} className="w-full h-64 bg-black rounded-md overflow-hidden" />
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-2 right-2"
        onClick={onClose}
      >
        <X className="h-4 w-4 mr-1" /> Cerrar
      </Button>
      <p className="text-sm text-center mt-2 text-muted-foreground">
        Apunta la cámara al código de barras del producto
      </p>
    </div>
  )
} 