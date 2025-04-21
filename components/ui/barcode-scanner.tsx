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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog"
import { Button } from "./button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

/* -------------------------------------------------------------------------- */
/*                                  Types                                     */
/* -------------------------------------------------------------------------- */
interface BarcodeScannerProps {
  /** Devuelve el código confirmado */
  onDetected: (code: string) => void
  /** Cierra el escáner (botón "X" o cancelación del usuario) */
  onClose: () => void
}

/* -------------------------------------------------------------------------- */
/*                                Helpers                                     */
/* -------------------------------------------------------------------------- */
/** Devuelve `true` si la etiqueta sugiere que es cámara frontal */
const isFront = (label: string) => /front|user|selfie/i.test(label)

const styleMedia = (el: HTMLElement | null, mirror: boolean) => {
  if (!el) return;
  Object.assign(el.style, {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    transform: mirror ? "scaleX(-1)" : "none",
  });
};

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */
export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  /* -------------------------------- Refs --------------------------------- */
  /** Contenedor donde Quagga inyectará <video> y <canvas> */
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [cameras, setCameras] = React.useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = React.useState<string>("")
  const [mirror, setMirror] = React.useState(false)
  const [pendingCode, setPendingCode] = React.useState<string | null>(null)
  const [askConfirm, setAskConfirm] = React.useState(false)

  const { toast } = useToast()

  /* --------------------------- Helper functions -------------------------- */
  const startScanner = React.useCallback(async () => {
    if (!containerRef.current) return
    
    try {
      Quagga.stop()
    } catch {}

    setLoading(true)
    setError(null)

    const config = {
      inputStream: {
        name: "Live",
        type: "LiveStream" as const,
        target: containerRef.current,
        constraints: {
          ...(selectedCamera ? { deviceId: { exact: selectedCamera } } : { facingMode: { ideal: "environment" } }),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      decoder: {
        readers: [
          { format: "ean_reader", config: { supplements: [] } },
          { format: "ean_8_reader", config: { supplements: [] } },
          { format: "upc_reader", config: { supplements: [] } },
          { format: "upc_e_reader", config: { supplements: [] } }
        ],
        multiple: false
      },
      locate: true,
      locator: { patchSize: "medium", halfSample: true },
    };

    try {
      await Quagga.init(config);
      
      const video = containerRef.current.querySelector("video")
      const canvas = containerRef.current.querySelector("canvas")
      
      styleMedia(video, mirror)
      styleMedia(canvas, mirror)

      Quagga.onDetected((r) => {
        const code = r?.codeResult?.code
        if (!code) return
        Quagga.stop()
        setPendingCode(code)
        setAskConfirm(true)
        navigator.vibrate?.(200)
        toast({ title: "¡Código detectado!", description: code })
      })

      Quagga.start()
      setLoading(false)
    } catch (err) {
      console.error(err)
      setError("No se pudo inicializar la cámara")
      setLoading(false)
    }
  }, [selectedCamera, mirror, toast])

  /* -------------------------- Camera enumeration ------------------------- */
  React.useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const vids = devices.filter((d) => d.kind === "videoinput")
        const main = vids.find((d) => !isFront(d.label)) || vids[0]
        setCameras(vids)
        setSelectedCamera(main?.deviceId || "")
        setMirror(isFront(main?.label || ""))
      } catch {
        setError("No se pudieron enumerar las cámaras")
      }
    })()

    return () => {
      try { Quagga.stop() } catch {}
    }
  }, [])

  /* ------------------------ Restart when selection changes -------------- */
  React.useEffect(() => {
    if (selectedCamera) {
      const cam = cameras.find((c) => c.deviceId === selectedCamera)
      setMirror(isFront(cam?.label || ""))
      startScanner()
    }
  }, [selectedCamera, cameras, startScanner])

  /* ------------------------------- Render -------------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full flex flex-col items-center justify-center">
        {/* Video container */}
        <div className="w-full flex justify-center">
          <div ref={containerRef} className="relative w-full bg-black">
            {!loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-blue-500/90 rounded-md w-[95%] h-[95%]" />
              </div>
            )}
          </div>
        </div>

        {/* Camera selector */}
        {cameras.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[120]">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-64 bg-white/10 text-white border-white/20 backdrop-blur-sm">
                <SelectValue placeholder="Seleccionar cámara" />
              </SelectTrigger>
              <SelectContent className="z-[130] max-h-64 overflow-y-auto backdrop-blur-md bg-black/90 text-white ring-1 ring-white/20">
                {cameras.map((cam) => (
                  <SelectItem key={cam.deviceId} value={cam.deviceId}>{cam.label || `Cam ${cam.deviceId.slice(0,5)}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2">
            <Loader2 className="animate-spin h-10 w-10" />
            <p>Iniciando cámara...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 bg-black/90 p-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p>{error}</p>
          </div>
        )}

        {/* Close button */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[120]">
          <Button variant="destructive" onClick={onClose}><X className="mr-2 h-4 w-4" />Cerrar</Button>
        </div>

        {/* Instructions */}
        {!loading && !error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[110] bg-black/70 text-white px-3 py-1 rounded-md text-sm flex items-center gap-1">
            <Camera className="h-4 w-4" /> Coloca el código dentro del recuadro
          </div>
        )}

        {/* Confirmation dialog */}
        <Dialog open={askConfirm} onOpenChange={(o) => !o && (setAskConfirm(false), startScanner())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2">
                <Check className="text-green-500" /> Código detectado
              </DialogTitle>
              <DialogDescription className="text-center">{pendingCode}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => { setAskConfirm(false); startScanner(); }}>No</Button>
              <Button onClick={() => { pendingCode && onDetected(pendingCode); setAskConfirm(false); }}>Sí</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 