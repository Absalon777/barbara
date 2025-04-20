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
const setFullSize = (el?: HTMLElement | null) => {
  if (!el) return
  Object.assign(el.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "scaleX(-1)",
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
        type: "LiveStream",
        target: containerRef.current,
        constraints: {
          ...(selectedCamera ? { deviceId: { exact: selectedCamera } } : { facingMode: { ideal: "environment" } }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      decoder: {
        readers: [
          { format: "ean_reader", config: { supplements: [] } },
          { format: "ean_8_reader", config: { supplements: [] } },
          { format: "upc_reader", config: { supplements: [] } },
          { format: "upc_e_reader", config: { supplements: [] } },
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

    const fixElements = () => {
      setFullSize(containerRef.current?.querySelector("video") as HTMLElement)
      setFullSize(containerRef.current?.querySelector("canvas") as HTMLElement)
    }
    fixElements()
    const mo = new MutationObserver(fixElements)
    if (containerRef.current) mo.observe(containerRef.current, { childList: true })

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
  }, [selectedCamera, stopScanner, toast])

  /* -------------------------- Camera enumeration ------------------------- */
  React.useEffect(() => {
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((d) => d.kind === "videoinput")
        const preferRear = (l: string) => !/front|ultra|wide|tele|zoom|0\.5x|2x|3x/i.test(l)
        const main = videoDevices.find((d) => preferRear(d.label)) || videoDevices[0]
        setCameras(videoDevices)
        setSelectedCamera(main?.deviceId || "")
      } catch (e) {
        console.error(e)
        setError("No se pudieron enumerar las cámaras")
      }
    })()
  }, [])

  /* ------------------------ Restart when selection changes -------------- */
  React.useEffect(() => {
    if (selectedCamera) startScanner()
  }, [selectedCamera, startScanner])

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
      <div className="relative w-full max-w-3xl bg-black rounded-lg overflow-hidden">
        {/* Loader & status */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p>{status}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 text-white p-6">
            <AlertTriangle className="h-10 w-10 text-destructive" />
            <p className="text-center max-w-xs">{error}</p>
            <Button onClick={onClose} variant="outline">
              Cerrar
            </Button>
          </div>
        )}

        {/* Camera selector */}
        {cameras.length > 1 && (
          <div className="absolute top-4 left-4 z-20">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-[230px] bg-white/10 text-white border-white/20 backdrop-blur-sm">
                <SelectValue placeholder="Seleccionar cámara" />
              </SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {cameras.map((cam) => (
                  <SelectItem key={cam.deviceId} value={cam.deviceId}>
                    {cam.label || `Cámara ${cam.deviceId.slice(0, 5)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Video container for Quagga */}
        <div
          ref={containerRef}
          className="relative w-full h-[70vh] bg-black"
        />

        {/* Overlay */}
        {!loading && !error && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            aria-hidden="true"
          >
            <div className="border-4 border-blue-500/90 rounded-md w-4/5 max-w-md aspect-square" />
          </div>
        )}

        {/* Close button */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <Button variant="destructive" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
        </div>

        {/* Instructions */}
        {!loading && !error && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 text-white px-3 py-1 rounded-md text-sm z-20">
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