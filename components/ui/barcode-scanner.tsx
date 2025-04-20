"use client"

import * as React from "react"
import Quagga from "@ericblade/quagga2"
import {
  X,
  Camera,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react"

import { Button } from "./button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog"
import { useToast } from "@/hooks/use-toast"

/* ---------- Tipado ---------- */
interface BarcodeScannerProps {
  /** Devuelve el código confirmado */
  onDetected: (code: string) => void
  /** Cierra el escáner (se usa en el botón "X" o cuando el usuario cancela) */
  onClose: () => void
}

/* ---------- Componente ---------- */
export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  /* --------------- Refs & state --------------- */
  const videoRef = React.useRef<HTMLDivElement>(null)
  const scannerReady = React.useRef(false)
  const mounted = React.useRef(false)

  const [status, setStatus] = React.useState("Iniciando cámara…")
  const [loading, setLoading] = React.useState(true)      // cámara / Quagga
  const [processing, setProcessing] = React.useState(false) // captura manual
  const [cameraErr, setCameraErr] = React.useState<string | null>(null)

  const [pendingCode, setPendingCode] = React.useState<string | null>(null)
  const [askConfirm, setAskConfirm] = React.useState(false)

  const { toast } = useToast()

  /* --------------- Utilidades --------------- */
  const showMsg = React.useCallback(
    (title: string, description: string, type: "default" | "destructive" = "default") => {
      if (!mounted.current) return
      setStatus(description)
      toast({
        title,
        description,
        variant: type,
        duration: 2500,
      })
    },
    [toast],
  )

  const stopScanner = React.useCallback(() => {
    if (!scannerReady.current) return
    try {
      Quagga.offDetected()
      Quagga.stop()
    } catch { /* ignore */ }
    scannerReady.current = false
  }, [])

  /* --------------- Detección automática --------------- */
  const onCode = React.useCallback(
    (code: string) => {
      if (!mounted.current) return
      setProcessing(false)

      // Aceptar cualquier código de barras válido
      if (!code || code.length < 8) {
        showMsg("Formato incorrecto", "Código de barras no válido", "destructive")
        return
      }

      stopScanner() // pausamos para que no vuelva a disparar
      setPendingCode(code)
      setAskConfirm(true)
      if (navigator.vibrate) navigator.vibrate(200)
      showMsg("¡Código detectado!", `Se detectó ${code}`)
    },
    [showMsg, stopScanner],
  )

  /* --------------- Inicializar Quagga --------------- */
  const startScanner = React.useCallback(async () => {
    if (!videoRef.current) return;
    
    // Si ya hay un escáner activo, asegúrate de detenerlo primero
    if (scannerReady.current) {
      stopScanner();
      // Esperar un momento para que se liberen los recursos
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setLoading(true)
    setStatus("Iniciando cámara…")
    setCameraErr(null)

    try {
      // Limpiar completamente los estilos y contenido antes de iniciar
      if (videoRef.current) {
        videoRef.current.innerHTML = '';
        videoRef.current.style.cssText = `
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          position: relative;
          background-color: #000;
        `;
      }

      // Dar tiempo para que el DOM se actualice
      await new Promise(resolve => setTimeout(resolve, 100));

      // Configuración de Quagga
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
        },
        decoder: { 
          readers: ["ean_reader", "ean_8_reader", "upc_reader", "upc_e_reader"],
          multiple: false,
          debug: {
            drawBoundingBox: true,
            showFrequency: false,
            drawScanline: true,
            showPattern: false
          }
        },
        locator: {
          halfSample: true,
          patchSize: "medium",
        },
        locate: true,
      } as any;

      // Inicializar Quagga con manejo de errores mejorado
      try {
        await Quagga.init(config);
      } catch (initErr) {
        console.error("Error en la inicialización de Quagga:", initErr);
        // Si falla, intentar una configuración más simple
        try {
          const simpleConfig = {
            ...config,
            inputStream: {
              ...config.inputStream,
              constraints: {
                facingMode: "environment",
              }
            },
            locator: {
              halfSample: false,
              patchSize: "medium",
            }
          };
          await Quagga.init(simpleConfig);
        } catch (retryErr) {
          throw retryErr; // Si también falla, propagar el error
        }
      }

      // Configurar el detector de códigos
      Quagga.onDetected((res) => {
        if (processing || !mounted.current) return;
        if (res?.codeResult?.code) onCode(res.codeResult.code);
      });

      await Quagga.start();
      scannerReady.current = true;
      setLoading(false);
      setStatus("Coloca el código dentro del recuadro azul");

      // ESTRATEGIA DE CENTRADO: aplicar después de iniciar
      setTimeout(() => {
        if (!mounted.current) return;
        
        try {
          const videoContainer = videoRef.current;
          if (!videoContainer) return;
          
          // Obtener todos los elementos video y canvas
          const videoElements = videoContainer.querySelectorAll('video');
          const canvasElements = videoContainer.querySelectorAll('canvas');
          
          // Aplicar estilos a cada elemento
          [...videoElements, ...canvasElements].forEach(el => {
            el.style.cssText = `
              position: absolute;
              left: 50% !important;
              transform: translateX(-50%) !important;
              top: 0;
              height: 100% !important;
              width: auto !important;
              max-height: 100% !important;
              object-fit: contain !important;
            `;
          });
          
          // Observador de mutaciones para mantener estilos
          const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
              if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                  if (node instanceof HTMLElement && 
                     (node.tagName === 'VIDEO' || node.tagName === 'CANVAS')) {
                    node.style.cssText = `
                      position: absolute;
                      left: 50% !important;
                      transform: translateX(-50%) !important;
                      top: 0;
                      height: 100% !important;
                      width: auto !important;
                      max-height: 100% !important;
                      object-fit: contain !important;
                    `;
                  }
                });
              }
            });
          });
          
          observer.observe(videoContainer, { 
            childList: true, 
            subtree: true 
          });
          
          // Almacenar el observer para limpieza
          return () => observer.disconnect();
        } catch (e) {
          console.error("Error al aplicar estilos:", e);
        }
      }, 500);

    } catch (err: any) {
      console.error("Error al iniciar cámara:", err);
      stopScanner();
      setLoading(false);

      let msg = "No se pudo iniciar la cámara.";
      if (err.name === "NotAllowedError") msg = "Acceso a la cámara denegado.";
      else if (err.name === "NotFoundError") msg = "No se encontró cámara.";
      else if (err.message && err.message.includes("null")) {
        msg = "Error al inicializar la cámara. Intenta cerrar y volver a abrir el escáner.";
      }

      setCameraErr(msg);
      showMsg("Error", msg, "destructive");
    }
  }, [onCode, processing, showMsg, stopScanner]);

  /* ---------- Captura manual (botón) ---------- */
  const manualCapture = React.useCallback(() => {
    if (!videoRef.current || processing) return
    const video = videoRef.current.querySelector("video")
    if (!video) return

    setProcessing(true)
    setStatus("Analizando…")

    const vw = video.videoWidth
    const vh = video.videoHeight

    // 80 % × 30 % centrado (coincide con el recuadro azul)
    const cropW = vw * 0.8
    const cropH = vh * 0.3
    const cropX = (vw - cropW) / 2
    const cropY = (vh - cropH) / 2

    const canvas = document.createElement("canvas")
    canvas.width = cropW
    canvas.height = cropH
    const ctx = canvas.getContext("2d")!
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    const imgData = canvas.toDataURL("image/jpeg")

    Quagga.decodeSingle(
      {
        src: imgData,
        locate: true,
        decoder: { readers: ["ean_reader"] },
      } as any,
      (result) => {
        if (!mounted.current) return
        setProcessing(false)

        if (result?.codeResult?.code) {
          onCode(result.codeResult.code)
        } else {
          setPendingCode(null)
          setAskConfirm(true) // usamos el mismo diálogo para reintentar
          showMsg("No se encontró código", "¿Deseas reintentar?", "destructive")
        }
      },
    )
  }, [onCode, processing, showMsg])

  /* --------------- Ciclo de vida --------------- */
  React.useEffect(() => {
    mounted.current = true;
    document.body.style.overflow = "hidden";
    
    // Asegurarse de que Quagga esté detenido al montar
    try {
      Quagga.stop();
      scannerReady.current = false;
    } catch {}
    
    // Iniciar el escáner con un poco de retraso
    const t = setTimeout(startScanner, 500);

    return () => {
      mounted.current = false;
      // Asegurarse de limpiar completamente
      stopScanner();
      clearTimeout(t);
      document.body.style.overflow = "unset";
      
      // Remover cualquier elemento residual
      if (videoRef.current) {
        videoRef.current.innerHTML = '';
      }
    };
  }, [startScanner, stopScanner]);

  /* --------------- Confirmaciones --------------- */
  const confirmYes = () => {
    if (!pendingCode) {
      // Si no hay código (escaneo fallido), cerramos el diálogo y reiniciamos
      setAskConfirm(false);
      setPendingCode(null);
      
      // Pequeño retraso antes de reiniciar el escáner
      setTimeout(() => {
        if (mounted.current) startScanner();
      }, 300);
      return;
    }
    
    // Si hay código, proceder como antes
    onDetected(pendingCode);
    setAskConfirm(false);
    setPendingCode(null);
    showMsg("Código confirmado", pendingCode);
  }

  const confirmNo = () => {
    setAskConfirm(false);
    setPendingCode(null);
    
    if (pendingCode) {
      // Si había un código pero el usuario lo rechazó, reiniciar con retraso
      setTimeout(() => {
        if (mounted.current) startScanner();
      }, 300);
    } else {
      // Si no había código y el usuario no quiere reintentar, cerrar
      onClose();
    }
  }

  /* --------------- Render --------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Contenedor principal centrado absolutamente */}
      <div 
        ref={videoRef}
        className="w-full h-full flex justify-center items-center bg-black"
        style={{
          overflow: "hidden",
          position: "relative"
        }}
      />

      {/* overlay centrado */}
      <div className="
        absolute inset-1/2 
        w-[70%] md:w-[60%] 
        aspect-square md:aspect-video
        -translate-x-1/2 -translate-y-1/2
        border-4 border-blue-500/90 rounded-md
        pointer-events-none
        z-10
      " />

      {/* Botones principales (siempre visibles) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        <Button onClick={manualCapture} disabled={processing || loading}>
          <Camera className="mr-2 h-4 w-4" />
          Capturar
        </Button>
        <Button variant="destructive" onClick={onClose}>
          <X className="mr-2 h-4 w-4" />
          Cerrar
        </Button>
      </div>

      {/* =========  Mensajes / loading ========= */}
      {(loading || processing) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 text-white z-[15]">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p>{status}</p>
        </div>
      )}

      {/* =========  Error cámara ========= */}
      {cameraErr && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 text-center text-white z-[15] p-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <p className="font-medium">{cameraErr}</p>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      )}

      {/* =========  Instrucciones ========= */}
      {!loading && !processing && !cameraErr && (
        <>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-2 rounded-md text-sm flex items-center gap-2 z-20">
            <Camera className="h-4 w-4" />
            Coloca el código dentro del recuadro azul
          </div>

          {/* Botón cerrar (arriba a la derecha) */}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-4 right-4 z-20"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* =========  Diálogo confirmación / reintento ========= */}
      <Dialog 
        open={askConfirm} 
        onOpenChange={(open) => {
          if (!open) {
            setAskConfirm(false);
            setPendingCode(null);
            if (!pendingCode) {
              startScanner();
            }
          }
        }}
      >
        <DialogContent className="z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2">
              {pendingCode ? (
                <>
                  <Check className="text-green-500 h-5 w-5" /> Código detectado
                </>
              ) : (
                <>
                  <AlertTriangle className="text-destructive h-5 w-5" /> Sin resultados
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-center mt-2">
              {pendingCode ? (
                <>
                  Se detectó el código <br />
                  <strong className="text-xl">{pendingCode}</strong>
                  <br />
                  ¿Deseas utilizarlo?
                </>
              ) : (
                <>No se encontró un código de barras. ¿Deseas reintentar?</>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={confirmNo}>
              {pendingCode ? "No, volver a intentar" : "No, cerrar escáner"}
            </Button>
            <Button onClick={confirmYes}>
              {pendingCode ? "Sí, usar código" : "Sí, reintentar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 