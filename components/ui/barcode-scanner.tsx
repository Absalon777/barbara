"use client"

import * as React from "react"
import Quagga, { QuaggaJSConfigObject } from "@ericblade/quagga2"
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
  if (!el) return
  Object.assign(el.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "auto",
    maxHeight: "100%",
    objectFit: "contain",
    transform: mirror ? "scaleX(-1)" : "none",
    pointerEvents: "none",
  })
}

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */
export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  /* -------------------------------- Refs --------------------------------- */
  /** Contenedor donde Quagga inyectará <video> y <canvas> */
  const containerRef = React.useRef<HTMLDivElement>(null)
  const mounted = React.useRef(false)

  /* ------------------------------- State --------------------------------- */
  const [status, setStatus] = React.useState("Inicializando cámara…")
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [cameras, setCameras] = React.useState<MediaDeviceInfo[]>([])
  const [selectedCamera, setSelectedCamera] = React.useState<string>("")
  const [mirror, setMirror] = React.useState(false)
  const [pendingCode, setPendingCode] = React.useState<string | null>(null)
  const [askConfirm, setAskConfirm] = React.useState(false)

  const { toast } = useToast()

  /* --------------------------- Helper functions -------------------------- */
  const showMsg = React.useCallback(
    (title: string, description: string, type: "default" | "destructive" = "default") => {
      if (!mounted.current) return
      setStatus(description)
      toast({ title, description, variant: type, duration: 2500 })
    },
    [toast]
  )

  const stopScanner = React.useCallback(() => {
    try {
      Quagga.stop()
    } catch {
      /* ignore */
    }
  }, [])

  /* ---------------------------- Start scanner ---------------------------- */
  const startScanner = React.useCallback(async () => {
    if (!containerRef.current) return

    stopScanner()
    setLoading(true)
    setError(null)
    setStatus("Solicitando cámara…")

    const config: QuaggaJSConfigObject = {
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
          "ean_reader",
          "ean_8_reader",
          "upc_reader",
          "upc_e_reader",
        ],
        multiple: false,
      },
      locate: true,
      locator: { patchSize: "medium", halfSample: true },
    }

    try {
      await new Promise<void>((resolve, reject) => {
        Quagga.init(config, (err) => (err ? reject(err) : resolve()))
      })
    } catch (e) {
      console.error(e)
      setError("No se pudo inicializar la cámara (ver permisos)")
      setLoading(false)
      return
    }

    const fix = () => {
      const video = containerRef.current?.querySelector("video") as HTMLVideoElement | null;
      const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
      styleMedia(video, mirror);
      styleMedia(canvas, mirror);
    };
    fix()
    new MutationObserver(fix).observe(containerRef.current, { childList: true })

    Quagga.onDetected((result) => {
      const code = result?.codeResult?.code
      if (!code) return
      stopScanner()
      setPendingCode(code)
      setAskConfirm(true)
      if (navigator.vibrate) navigator.vibrate(200)
      toast({ title: "¡Código detectado!", description: code })
    })

    Quagga.start()
    setStatus("Escáner listo")
    setLoading(false)
  }, [selectedCamera, mirror, stopScanner, toast])

  /* -------------------------- Camera enumeration ------------------------- */
  React.useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === "videoinput")

        // Preferir trasera (omitimos ultra‑wide, tele, front)
        const preferRear = (l: string) => !isFront(l) && !/ultra|wide|tele|zoom|0\.5x|2x|3x/i.test(l)
        const main = videoDevices.find((d) => preferRear(d.label)) || videoDevices[0]

        setCameras(videoDevices)
        setSelectedCamera(main?.deviceId || "")
        setMirror(isFront(main?.label || ""))
      } catch (e) {
        console.error(e)
        setError("No se pudieron enumerar las cámaras")
      }
    })()
  }, [])

  /* ------------------------ Restart when selection changes -------------- */
  React.useEffect(() => {
    if (selectedCamera) {
      const cam = cameras.find((c) => c.deviceId === selectedCamera)
      setMirror(isFront(cam?.label || ""))
      startScanner()
    }
  }, [selectedCamera, cameras, startScanner])

  /* ------------------------ Lifecycle cleanup --------------------------- */
  React.useEffect(() => {
    mounted.current = true
    document.body.style.overflow = "hidden"
    return () => {
      mounted.current = false
      document.body.style.overflow = "unset"
      stopScanner()
    }
  }, [stopScanner])

  /* ---------------------- Confirmation handlers ------------------------- */
  const confirmYes = () => {
    if (pendingCode) onDetected(pendingCode)
    setAskConfirm(false)
    setPendingCode(null)
    startScanner()
  }

  const confirmNo = () => {
    setAskConfirm(false)
    setPendingCode(null)
    startScanner()
  }

  /* ------------------------------- Render -------------------------------- */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      {/* Container */}
      <div className="relative w-full max-w-none bg-black">
        {/* Loader & status */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white z-50">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p>{status}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 text-white p-6 z-50">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-center max-w-xs">{error}</p>
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          </div>
        )}

        {/* Selector de cámara */}
        {cameras.length > 1 && (
          <div className="absolute top-4 left-4 z-[120]">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-[260px] bg-white/10 text-white border-white/20 backdrop-blur-sm z-[120]">
                <SelectValue placeholder="Seleccionar cámara" />
              </SelectTrigger>
              <SelectContent className="z-[130] max-h-64 overflow-y-auto backdrop-blur-md bg-black/90 text-white ring-1 ring-white/20">
                {cameras.map((cam) => (
                  <SelectItem key={cam.deviceId} value={cam.deviceId} className="focus:bg-white/10">
                    {cam.label || `Cámara ${cam.deviceId.slice(0,5)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Video container for Quagga */}
        <div
          ref={containerRef}
          className="relative w-screen max-w-full h-auto aspect-video bg-black"
        />

        {/* Overlay */}
        {!loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div style={{ width: "95%", height: "95%" }} className="border-4 border-blue-500/90 rounded-md" />
          </div>
        )}

        {/* Close button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70]">
          <Button variant="destructive" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
        </div>

        {/* Instructions */}
        {!loading && !error && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 text-white px-3 py-1 rounded-md text-sm z-[70]">
            <Camera className="h-4 w-4" />
            Coloca el código dentro del recuadro
          </div>
        )}

        {/* Confirmation dialog */}
        <Dialog open={askConfirm} onOpenChange={(o) => !o && confirmNo()}>
          <DialogContent className="z-[100]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 justify-center">
                <Check className="text-green-500 h-5 w-5" /> Código detectado
              </DialogTitle>
              <DialogDescription className="text-center mt-2">
                Se detectó<br />
                <strong className="text-xl">{pendingCode}</strong>
                <br />¿Usar este código?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={confirmNo}>No</Button>
              <Button onClick={confirmYes}>Sí</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 