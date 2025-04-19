"use client"

import * as React from "react"
import Quagga from "@ericblade/quagga2"
import { Button } from "./button"
import { X } from "lucide-react"

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = React.useRef<HTMLDivElement>(null)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const isMountedRef = React.useRef(false)

  // Cleanup function ref
  const cleanupQuagga = React.useCallback(() => {
    if (isInitialized) {
      try {
        Quagga.stop()
        setIsInitialized(false)
        console.log("Quagga stopped.")
      } catch (e) {
        console.error("Error stopping Quagga:", e)
      }
    }
  }, [isInitialized])

  React.useEffect(() => {
    isMountedRef.current = true
    document.body.style.overflow = 'hidden' // Prevent body scroll

    const init = async () => {
      if (!videoRef.current || !isMountedRef.current) {
        console.log("Initialization skipped: Not mounted or videoRef missing")
        return
      }

      try {
        console.log("Attempting to initialize Quagga...")
        await Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current, // Target the div
            constraints: {
              facingMode: "environment"
            },
            // Definir área de escaneo (70% ancho central, ~30-40% alto central)
            area: {
              top: "30%",     // Margen superior para centrar verticalmente
              right: "15%",   // Margen derecho (100 - 70) / 2
              left: "15%",    // Margen izquierdo
              bottom: "30%"  // Margen inferior
            }
          },
          locate: true,
          numOfWorkers: navigator.hardwareConcurrency || 4, // Use available cores or default to 4
          decoder: {
            readers: ["ean_reader"], // Only EAN for barcodes
            multiple: false, // Detect only one barcode at a time
          },
          locator: {
              patchSize: "medium",
              halfSample: true
          }
        })

        // Style the injected video element for fullscreen
        const videoElement = videoRef.current?.querySelector('video')
        if (videoElement) {
          videoElement.style.position = 'absolute'
          videoElement.style.top = '0'
          videoElement.style.left = '0'
          videoElement.style.width = '100vw'
          videoElement.style.height = '100vh'
          videoElement.style.objectFit = 'cover'
          videoElement.style.zIndex = '-1' // Place behind overlays
        }

        Quagga.onDetected((result) => {
          const code = result.codeResult.code
          // Basic validation
          if (code && code.length === 13) {
            console.log("Barcode detected:", code)
            onDetected(code)
            cleanupQuagga() // Stop scanner after detection
            onClose() // Close the scanner UI
          }
        })

        Quagga.onProcessed((result) => {
            // Optional: Add visualization logic here if needed later
            // Example: Draw boxes around potential codes
        });

        console.log("Attempting to start Quagga...")
        await Quagga.start()
        setIsInitialized(true)
        console.log("Quagga started successfully.")

      } catch (err) {
        console.error("Error initializing Quagga:", err)
        onClose() // Close scanner on error
      }
    }

    // Delay initialization slightly to ensure DOM is ready
    const timeoutId = setTimeout(init, 100)

    // Cleanup on component unmount
    return () => {
      isMountedRef.current = false
      clearTimeout(timeoutId)
      document.body.style.overflow = 'unset' // Restore body scroll
      cleanupQuagga()
    }
  }, [onDetected, onClose, cleanupQuagga]) // Dependencies

  return (
    <div className="fixed inset-0 z-[100] bg-black"> {/* High z-index, full cover */}
      {/* This div is the target for Quagga's video stream */}
      <div 
        ref={videoRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Overlay con el rectángulo guía 16:9 centrado */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[101]">
        <div 
          className="border-2 border-primary rounded-lg"
          style={{
            width: '70vw',                   // 70% del ancho de la ventana
            height: 'calc(70vw * 9 / 16)',   // Calcular altura para mantener 16:9
            maxWidth: '600px',              // Ancho máximo opcional
            maxHeight: 'calc(600px * 9 / 16)' // Altura máxima correspondiente (aprox. 337.5px)
          }}
        />
      </div>

      {/* Simple Close Button Overlay */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-[102]" // Asegurar que esté por encima del overlay guía
        onClick={onClose} // Directly call onClose passed from parent
      >
        <X className="h-4 w-4 mr-1" /> Cerrar
      </Button>
    </div>
  )
} 