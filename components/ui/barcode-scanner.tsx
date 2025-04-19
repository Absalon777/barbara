"use client"

import * as React from "react"
import Quagga from "@ericblade/quagga2"
import { Button } from "./button"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./dialog"
import { useToast } from "@/hooks/use-toast"

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [isInitialized, setIsInitialized] = React.useState(false)
  const [isFrozen, setIsFrozen] = React.useState(false)
  const [capturedImageDataUrl, setCapturedImageDataUrl] = React.useState<string | null>(null)
  const [pendingCode, setPendingCode] = React.useState<string | null>(null)
  const [showConfirmationDialog, setShowConfirmationDialog] = React.useState(false)
  const isMountedRef = React.useRef(false)
  const guideBoxRef = React.useRef<HTMLDivElement>(null)
  const { toast } = useToast()

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
    } else {
         console.log("Cleanup skipped: Quagga not initialized according to internal state.");
    }
  }, [isInitialized])

  React.useEffect(() => {
    isMountedRef.current = true
    document.body.style.overflow = 'hidden'
    console.log("BarcodeScanner mounted.")

    let videoElement: HTMLVideoElement | null = null;

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
          },
          locate: true,
          numOfWorkers: navigator.hardwareConcurrency >= 4 ? 4 : navigator.hardwareConcurrency,
          decoder: {
            readers: ["ean_reader" as const],
            multiple: false,
          },
          locator: {
              patchSize: "medium",
              halfSample: true
          }
        }

        await Quagga.init(config)
        console.log("Quagga.init successful.")
        
        const videoContainer = videoRef.current
        videoElement = videoContainer?.querySelector('video')
        if (videoElement) {
            console.log("Applying styles to video element...");
            videoElement.style.position = 'absolute';
            videoElement.style.top = '0';
            videoElement.style.left = '0';
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.onloadedmetadata = () => {
                // Log ya no es necesario aquí, la inicialización se mueve
                // console.log(`>>> METADATA LOADED: Actual video resolution: ${videoElement?.videoWidth}x${videoElement?.videoHeight}`);
                // setIsInitialized(true) // MOVIDO para después de Quagga.start()
            };
        } else {
            throw new Error("Video element not found after init");
        }

        console.log("Attempting Quagga.start...")
        await Quagga.start()
        // Establecer inicializado DESPUÉS de que start() tenga éxito
        setIsInitialized(true) 
        console.log("Quagga started successfully.")

      } catch (err) {
        console.error("ERROR during Quagga initialization or start:", err)
        if (err instanceof Error) {
             if (err.name === 'NotAllowedError') {
                 console.error("Camera access was denied. Please check permissions.");
                 toast({ title: "Error de Cámara", description: "Acceso a la cámara denegado. Revisa los permisos.", variant: "destructive" });
             } else if (err.name === 'NotFoundError') {
                 console.error("No suitable camera found.");
                 toast({ title: "Error de Cámara", description: "No se encontró una cámara adecuada.", variant: "destructive" });
             } else if (err.name === 'NotReadableError') {
                 console.error("Camera might be already in use.");
                 toast({ title: "Error de Cámara", description: "La cámara podría estar en uso por otra aplicación.", variant: "destructive" });
             } else if (err.name === 'OverconstrainedError') {
                 console.error("Camera does not support requested constraints (resolution/facingMode).", err);
                 toast({ title: "Error de Cámara", description: "La cámara no soporta la configuración solicitada.", variant: "destructive" });
             } else {
                 console.error("An unexpected error occurred:", err.message);
                 toast({ title: "Error Inesperado", description: err.message, variant: "destructive" });
             }
        } else {
             console.error("An unknown error occurred during init/start:", err)
             toast({ title: "Error Desconocido", description: "Ocurrió un error al iniciar el escáner.", variant: "destructive" });
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
  }, [onClose, cleanupQuagga, toast, isInitialized])

  const handleCapture = async () => {
    // console.log(">>> handleCapture called"); 
    // console.log(`>>> handleCapture check: isInitialized=${isInitialized}, isFrozen=${isFrozen}`);
    if (!isInitialized || isFrozen || !videoRef.current || !canvasRef.current || !guideBoxRef.current) {
        // console.log(">>> handleCapture check failed, returning.");
        return;
    }

    const videoElement = videoRef.current.querySelector('video');
    if (!videoElement) return;

    console.log("Attempting to capture frame...");

    const canvas = canvasRef.current;
    const videoWidth = videoElement.videoWidth;
    const videoHeight = videoElement.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

    const dataUrl = canvas.toDataURL('image/png');
    setCapturedImageDataUrl(dataUrl);
    setIsFrozen(true);
    console.log("Frame captured, attempting decodeSingle...");

    const guideBox = guideBoxRef.current.getBoundingClientRect();
    const videoRect = videoRef.current.getBoundingClientRect();

    const roi = {
        x: (guideBox.left - videoRect.left) / videoRect.width,
        y: (guideBox.top - videoRect.top) / videoRect.height,
        width: guideBox.width / videoRect.width,
        height: guideBox.height / videoRect.height
    };

    console.log("Calculated ROI (normalized):", roi);

    if (roi.x < 0 || roi.y < 0 || roi.width <= 0 || roi.height <= 0 || roi.x + roi.width > 1 || roi.y + roi.height > 1) {
        console.error("Invalid ROI calculated, decoding full image as fallback.");
        roi.x = 0; roi.y = 0; roi.width = 1; roi.height = 1;
    }

    try {
        const result = await Quagga.decodeSingle({
            src: dataUrl,
            numOfWorkers: 0,
            decoder: {
                 readers: ["ean_reader" as const],
            },
             locate: true,
             locator: {
                 patchSize: "medium",
                 halfSample: true,
             }
        });

        // Loguear el resultado completo para depuración
        console.log("decodeSingle result:", result);

        if (result && result.codeResult) {
            const code = result.codeResult.code;
            if (code && code.length === 13) {
                console.log("Barcode detected from capture:", code);
                setPendingCode(code);
                setShowConfirmationDialog(true);
            } else {
                 console.log("Detected code is not EAN-13:", code);
                 toast({ title: "Código no válido", description: "El código detectado no tiene 13 dígitos.", variant: "default" });
                 setIsFrozen(false);
                 setCapturedImageDataUrl(null);
            }
        } else {
            console.log("No barcode detected in the captured area.");
            // Toast más explícito
            toast({ 
                title: "No detectado", 
                description: "No se pudo leer un código de barras. Asegúrate de que esté enfocado dentro del cuadro y vuelve a intentarlo.", 
                variant: "default" 
            });
            setIsFrozen(false); 
            setCapturedImageDataUrl(null);
        }
    } catch (err) {
        console.error("Error during Quagga.decodeSingle:", err);
        toast({ title: "Error de decodificación", description: "Ocurrió un error al intentar leer el código.", variant: "destructive" });
        setIsFrozen(false);
        setCapturedImageDataUrl(null);
    }
  }

  const handleConfirm = () => {
    if (pendingCode) {
      onDetected(pendingCode);
      setShowConfirmationDialog(false);
      setPendingCode(null);
    }
  }

  const handleRetry = () => {
    setShowConfirmationDialog(false);
    setPendingCode(null);
    setIsFrozen(false);
    setCapturedImageDataUrl(null);
    console.log("Retrying capture...");
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      
      <div 
        className="absolute inset-0 w-screen h-screen"
        onClick={handleCapture}
        style={{ cursor: isInitialized && !isFrozen ? 'pointer' : 'default' }} 
      >
          <div 
            ref={videoRef}
            className="absolute inset-0 w-full h-full"
            style={{ 
                overflow: 'hidden', 
                visibility: isFrozen ? 'hidden' : 'visible'
            }} 
          />
          {isFrozen && capturedImageDataUrl && (
            <img 
                src={capturedImageDataUrl} 
                alt="Captured frame"
                className="absolute inset-0 w-full h-full object-cover" 
            />
          )}
           <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      
      <div 
        ref={guideBoxRef}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-[101]"
       >
        <div 
          className="border-4 border-primary rounded-lg bg-primary/10"
           style={{
             width: '80vw',
             height: '30vh',
             maxWidth: '500px',
             maxHeight: '300px',
             boxShadow: '0 0 0 100vmax rgba(0, 0, 0, 0.5)'
          }}
        />
      </div>

       {( () => { 
           // console.log(`>>> Instruction message check: isFrozen=${isFrozen}, isInitialized=${isInitialized}`);
           return !isFrozen && isInitialized && (
             <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[102] bg-black/70 text-white text-center p-3 rounded-md text-sm shadow-lg pointer-events-none">
                  Posiciona el código de barras dentro del cuadro y presiona la pantalla para capturar.
             </div>
           )
       })() }

      <Button
        variant="destructive"
        size="icon"
        className="absolute top-4 right-4 z-[103] rounded-full w-10 h-10"
        onClick={onClose}
        aria-label="Cerrar escáner"
      >
        <X className="h-5 w-5" /> 
      </Button>

       <Dialog open={showConfirmationDialog} onOpenChange={(open) => !open && handleRetry()}>
           <DialogContent className="sm:max-w-[425px]">
               <DialogHeader>
                   <DialogTitle>Código Detectado</DialogTitle>
                   <DialogDescription>
                       Se detectó el siguiente código: <strong>{pendingCode}</strong>. ¿Es correcto?
                   </DialogDescription>
               </DialogHeader>
               <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
                   <Button variant="outline" onClick={handleRetry}>No, volver a intentar</Button>
                   <Button onClick={handleConfirm}>Sí, continuar</Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>
    </div>
  )
} 