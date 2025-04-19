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

  const cleanupQuagga = React.useCallback(() => {
    if (isInitialized) {
      try {
        console.log("Attempting to stop Quagga...")
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
    document.body.style.overflow = 'hidden'
    console.log("BarcodeScanner mounted.")

    const init = async () => {
      if (!videoRef.current) {
        console.error("Initialization failed: videoRef.current is null.")
        return
      }
      if (!isMountedRef.current) {
         console.log("Initialization skipped: Component unmounted.")
         return
      }
      if (isInitialized) {
         console.log("Initialization skipped: Already initialized.")
         return
      }

      try {
        console.log("Attempting Quagga.init with minimal constraints...")
        const config = {
          inputStream: {
            name: "Live",
            type: "LiveStream" as const,
            target: videoRef.current,
            constraints: {
              facingMode: "environment",
            },
            area: {
                top: "30%",
                right: "2.5%",
                left: "2.5%",
                bottom: "30%"
            }
          },
          locate: true,
          numOfWorkers: navigator.hardwareConcurrency || 4,
          decoder: {
            readers: ["ean_reader" as const],
            multiple: false,
          },
          locator: {
              patchSize: "medium",
              halfSample: true
          }
        }
        // console.log(JSON.stringify(config, null, 2));

        await Quagga.init(config)
        console.log("Quagga.init successful.")
        
        // Re-aplicar estilos directos al video para llenar el contenedor videoRef
        const videoContainer = videoRef.current
        const videoElement = videoContainer?.querySelector('video')
        if (videoElement) {
            console.log("Applying styles to video element...");
            videoElement.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%; 
                height: 100%;
                object-fit: cover;
                z-index: -1; // Poner detrás de overlays
            `;
             videoElement.onloadedmetadata = () => {
                console.log(`Actual video resolution: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
             };
        }

        Quagga.onDetected((result) => {
           const code = result.codeResult.code
           if (code && code.length === 13) {
             console.log("Barcode detected:", code)
             onDetected(code)
             cleanupQuagga()
             onClose()
           }
        })

        Quagga.onProcessed((result) => {});

        console.log("Attempting Quagga.start...")
        await Quagga.start()
        setIsInitialized(true)
        console.log("Quagga started successfully.")

      } catch (err) {
        console.error("ERROR during Quagga initialization or start:", err)
        if (err instanceof Error) {
             if (err.name === 'NotAllowedError') {
                 console.error("Camera access was denied. Please check permissions.");
             } else if (err.name === 'NotFoundError') {
                 console.error("No suitable camera found.");
             } else if (err.name === 'NotReadableError') {
                 console.error("Camera might be already in use.");
             } else if (err.name === 'OverconstrainedError') {
                 console.error("Camera does not support requested constraints (resolution/facingMode).", err);
             } else {
                 console.error("An unexpected error occurred:", err.message);
             }
        } else {
             console.error("An unknown error occurred during init/start:", err)
        }
        cleanupQuagga() 
        onClose() 
      }
    }

    const timeoutId = setTimeout(init, 200)

    return () => {
       isMountedRef.current = false
       clearTimeout(timeoutId)
       document.body.style.overflow = 'unset'
       cleanupQuagga()
       console.log("BarcodeScanner unmounted, cleanup initiated.")
    }
  }, [onDetected, onClose, cleanupQuagga, isInitialized]) 

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Contenedor para el video que ocupa toda la pantalla */}
      <div 
        ref={videoRef}
        className="absolute inset-0 w-screen h-screen"
        style={{ overflow: 'hidden' }} 
      />
      
      {/* Guía Visual */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[101]">
        <div 
          className="border-2 border-primary rounded-lg"
          style={{
            width: '95vw',
            height: 'calc(95vw * 9 / 16)',
            maxWidth: '95vw',
            maxHeight: 'calc(100vh * 0.8)'
          }}
        />
      </div>

      {/* Botón Cerrar */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-[102]"
        onClick={onClose}
      >
        <X className="h-4 w-4 mr-1" /> Cerrar
      </Button>
    </div>
  )
} 