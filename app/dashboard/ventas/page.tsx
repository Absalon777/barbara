"use client"

import { Label } from "@/components/ui/label"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Barcode, Camera, Minus, Plus, ShoppingCart, Trash2, X, Save, Receipt } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import BarcodeScanner from "@/components/ui/barcode-scanner"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Importar la biblioteca para escaneo de códigos de barras
import Quagga from "quagga"

interface ProductoCarrito {
  id: string
  codigo: string
  nombre: string
  precio: number
  cantidad: number
  subtotal: number
  stock_disponible: number
}

export default function PuntoVentaPage() {
  const [codigoBarras, setCodigoBarras] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [productos, setProductos] = useState<any[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([])
  const [carrito, setCarrito] = useState<ProductoCarrito[]>([])
  const [total, setTotal] = useState(0)
  const [impuestos, setImpuestos] = useState(0)
  const [subtotal, setSubtotal] = useState(0)
  const [escanerActivo, setEscanerActivo] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogoFinalizarAbierto, setDialogoFinalizarAbierto] = useState(false)
  const [metodoPago, setMetodoPago] = useState("efectivo")
  const [ventaExitosa, setVentaExitosa] = useState(false)
  const [ultimaVenta, setUltimaVenta] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")

  const videoRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const isMobile = useMobile()

  useEffect(() => {
    // No necesitamos limpiar Quagga aquí ya que se maneja en el componente BarcodeScanner
    return () => {}
  }, [escanerActivo])

  // Cargar productos al inicio
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const { data, error } = await supabase
          .from("productos")
          .select(`
            *,
            inventario(cantidad)
          `)
          .eq("activo", true)

        if (error) throw error
        setProductos(data || [])
      } catch (err) {
        console.error("Error al cargar productos:", err)
      }
    }
    cargarProductos()
  }, [])

  // Filtrar productos según la búsqueda
  useEffect(() => {
    if (busqueda.trim() === "") {
      setProductosFiltrados([])
    } else {
      const filtrados = productos.filter(producto =>
        producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        producto.codigo_barras.toLowerCase().includes(busqueda.toLowerCase())
      )
      setProductosFiltrados(filtrados)
    }
  }, [busqueda, productos])

  const handleBuscarProducto = async (codigo: string) => {
    if (!codigo) return
    setCargando(true)
    setError(null)

    try {
      const producto = productos.find(p => 
        p.codigo_barras === codigo || 
        p.nombre.toLowerCase().includes(codigo.toLowerCase())
      )

      if (!producto) {
        setError(`No se encontró ningún producto con el código ${codigo}`)
        setCargando(false)
        return
      }

      const stockDisponible = producto.inventario?.[0]?.cantidad || 0

      if (stockDisponible <= 0) {
        setError(`El producto ${producto.nombre} no tiene stock disponible`)
        setCargando(false)
        return
      }

      // Verificar si el producto ya está en el carrito
      const productoExistente = carrito.find((p) => p.id === producto.id)

      if (productoExistente) {
        if (productoExistente.cantidad >= stockDisponible) {
          setError(`No hay suficiente stock disponible de ${producto.nombre}`)
          setCargando(false)
          return
        }

        const nuevoCarrito = carrito.map((p) =>
          p.id === producto.id
            ? {
                ...p,
                cantidad: p.cantidad + 1,
                subtotal: (p.cantidad + 1) * p.precio,
              }
            : p
        )
        setCarrito(nuevoCarrito)
        calcularTotales(nuevoCarrito)
      } else {
        const nuevoProducto: ProductoCarrito = {
          id: producto.id,
          codigo: producto.codigo_barras,
          nombre: producto.nombre,
          precio: producto.precio_venta,
          cantidad: 1,
          subtotal: producto.precio_venta,
          stock_disponible: stockDisponible,
        }
        const nuevoCarrito = [...carrito, nuevoProducto]
        setCarrito(nuevoCarrito)
        calcularTotales(nuevoCarrito)
      }

      setCodigoBarras("")
      setBusqueda("")
    } catch (err: any) {
      console.error("Error al buscar producto:", err)
      setError("Error al buscar el producto. Inténtalo de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  const calcularTotales = (items: ProductoCarrito[]) => {
    const nuevoSubtotal = items.reduce((acc, item) => acc + item.subtotal, 0)
    setSubtotal(nuevoSubtotal)
    setTotal(nuevoSubtotal) // Ya no sumamos el IVA
  }

  const handleCambiarCantidad = (id: string, incremento: number) => {
    const nuevoCarrito = carrito.map((p) => {
      if (p.id === id) {
        const nuevaCantidad = Math.max(1, p.cantidad + incremento)

        // Verificar que no exceda el stock disponible
        if (incremento > 0 && nuevaCantidad > p.stock_disponible) {
          toast({
            title: "Stock insuficiente",
            description: `Solo hay ${p.stock_disponible} unidades disponibles de ${p.nombre}`,
            variant: "destructive",
          })
          return p
        }

        return {
          ...p,
          cantidad: nuevaCantidad,
          subtotal: nuevaCantidad * p.precio,
        }
      }
      return p
    })

    setCarrito(nuevoCarrito)
    calcularTotales(nuevoCarrito)
  }

  const handleEliminarProducto = (id: string) => {
    const nuevoCarrito = carrito.filter((p) => p.id !== id)
    setCarrito(nuevoCarrito)
    calcularTotales(nuevoCarrito)
  }

  const handleFinalizarVenta = async () => {
    if (carrito.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos al carrito para finalizar la venta",
        variant: "destructive",
      })
      return
    }

    setDialogoFinalizarAbierto(true)
  }

  const handleConfirmarVenta = async () => {
    setCargando(true)
    setError(null)

    try {
      const usuarioActualStr = localStorage.getItem("usuarioActual")
      if (!usuarioActualStr) {
        toast({
          title: "Error",
          description: "No se pudo identificar al usuario",
          variant: "destructive",
        })
        return
      }

      const usuarioActual = JSON.parse(usuarioActualStr)

      // 1. Crear la venta
      const { data: venta, error: errorVenta } = await supabase
        .from("ventas")
        .insert({
          usuario_id: usuarioActual.id,
          subtotal,
          impuestos,
          total,
          metodo_pago: metodoPago,
          estado: "completada",
        })
        .select()

      if (errorVenta) throw errorVenta

      if (!venta || venta.length === 0) {
        throw new Error("No se pudo crear la venta")
      }

      const ventaId = venta[0].id

      // 2. Crear los detalles de la venta
      const detallesVenta = carrito.map((producto) => ({
        venta_id: ventaId,
        producto_id: producto.id,
        cantidad: producto.cantidad,
        precio_unitario: producto.precio,
        subtotal: producto.subtotal,
      }))

      const { error: errorDetalles } = await supabase.from("detalle_ventas").insert(detallesVenta)

      if (errorDetalles) throw errorDetalles

      // 3. Actualizar el inventario y registrar los movimientos
      for (const producto of carrito) {
        // Registrar el movimiento de inventario
        await supabase.from("movimientos_inventario").insert({
          producto_id: producto.id,
          tipo_movimiento: "salida",
          cantidad: producto.cantidad,
          motivo: "venta",
          usuario_id: usuarioActual.id,
          referencia_id: ventaId,
          fecha: new Date(),
        })

        // Actualizar el inventario
        const { data: inventarioActual } = await supabase
          .from("inventario")
          .select("id, cantidad")
          .eq("producto_id", producto.id)
          .single()

        if (inventarioActual) {
          const nuevaCantidad = Math.max(0, inventarioActual.cantidad - producto.cantidad)

          await supabase
            .from("inventario")
            .update({ cantidad: nuevaCantidad, updated_at: new Date() })
            .eq("id", inventarioActual.id)
        }
      }

      // 4. Registrar la acción en logs
      await supabase.from("logs_actividad").insert({
        usuario_id: usuarioActual.id,
        accion: "crear",
        tabla: "ventas",
        registro_id: ventaId,
        detalles: `Venta realizada por ${total.toLocaleString()}`,
        ip_address: "127.0.0.1",
      })

      // Guardar la última venta para mostrar el comprobante
      setUltimaVenta({
        id: ventaId,
        fecha: new Date(),
        productos: carrito,
        subtotal,
        impuestos,
        total,
        metodoPago,
        vendedor: usuarioActual.nombre,
      })

      // Mostrar mensaje de éxito
      setVentaExitosa(true)
      setDialogoFinalizarAbierto(false)

      // Limpiar el carrito
      setCarrito([])
      setTotal(0)
      setImpuestos(0)
      setSubtotal(0)
    } catch (err: any) {
      console.error("Error al finalizar venta:", err)
      setError("Error al finalizar la venta. Inténtalo de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  const handleCodigoDetectado = (code: string) => {
    setBusqueda(code)
    setOpen(true)
    handleBuscarProducto(code)
    setEscanerActivo(false)
  }

  const toggleEscaner = () => {
    setEscanerActivo(!escanerActivo)
  }

  const cerrarComprobante = () => {
    setVentaExitosa(false)
    setUltimaVenta(null)
  }

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return "$0";
    return "$" + value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  return (
    <div className="flex flex-col w-full h-screen max-h-screen overflow-hidden">
      {/* Encabezado fijo */}
      <div className="sticky top-0 z-10 bg-background border-b p-4 w-full">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <h1 className="text-2xl font-bold">Punto de Venta</h1>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={toggleEscaner}
                className="flex-1 sm:flex-none"
              >
                <Barcode className="mr-2 h-4 w-4" />
                Escanear
              </Button>
              <Button 
                variant="outline" 
                onClick={handleFinalizarVenta}
                className="flex-1 sm:flex-none"
              >
                <Plus className="mr-2 h-4 w-4" />
                Finalizar Venta
              </Button>
            </div>
          </div>
          
          {/* Barra de búsqueda con lista desplegable */}
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <div className="relative w-full">
              <Input
                placeholder="Buscar producto por nombre o código..."
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setOpen(true)
                }}
                className="w-full"
              />
              {open && busqueda.trim() !== "" && productosFiltrados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[300px] overflow-auto">
                  {productosFiltrados.map((producto) => (
                    <div
                      key={producto.id}
                      className="p-2 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        handleBuscarProducto(producto.codigo_barras)
                        setOpen(false)
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{producto.nombre}</span>
                        <span className="text-sm text-muted-foreground">
                          Código: {producto.codigo_barras} | Stock: {producto.inventario?.[0]?.cantidad || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={toggleEscaner} variant="outline" className="sm:w-auto w-full">
              <Camera className="mr-2 h-4 w-4" />
              Escanear
            </Button>
          </div>
        </div>
      </div>

      {/* Contenido principal con scroll */}
      <div className="flex-1 overflow-hidden w-full">
        <div className="flex flex-col h-full w-full">
          {/* Lista de productos en la venta */}
          <div className="flex-1 overflow-y-auto p-4 w-full">
            <h2 className="text-lg font-semibold mb-4">Venta Actual</h2>
            {carrito.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No hay productos en la venta
              </div>
            ) : (
              <div className="space-y-4 w-full">
                {carrito.map((item) => (
                  <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 bg-background rounded-lg gap-2 w-full">
                    <div className="flex-1 w-full">
                      <h3 className="font-medium truncate">{item.nombre}</h3>
                      <p className="text-sm text-muted-foreground">
                        ${item.precio.toLocaleString()} x {item.cantidad}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCambiarCantidad(item.id, -1)}
                        className="flex-1 sm:flex-none"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.cantidad}</span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCambiarCantidad(item.id, 1)}
                        className="flex-1 sm:flex-none"
                      >
                        +
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEliminarProducto(item.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total y botones de acción */}
          <div className="border-t p-4 bg-background sticky bottom-0 w-full">
            <div className="space-y-4 w-full">
              <div className="flex justify-between items-center w-full">
                <span className="font-medium">Subtotal:</span>
                <span className="text-2xl font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center w-full">
                <span className="font-medium">Impuestos:</span>
                <span className="text-2xl font-bold">{formatCurrency(impuestos)}</span>
              </div>
              <div className="flex justify-between items-center font-bold w-full">
                <span>Total:</span>
                <span className="text-2xl font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button 
              className="w-full mt-4" 
              size="lg"
              onClick={handleFinalizarVenta}
              disabled={carrito.length === 0}
            >
              Finalizar Venta
            </Button>
          </div>
        </div>
      </div>

      {/* Scanner */}
      {escanerActivo && (
        <div className="fixed inset-0 z-[100]">
          <BarcodeScanner
            onDetected={handleCodigoDetectado}
            onClose={() => setEscanerActivo(false)}
          />
        </div>
      )}

      {/* Diálogos (Finalizar Venta, Comprobante) van aquí, separados del scanner */}
      <Dialog open={dialogoFinalizarAbierto} onOpenChange={setDialogoFinalizarAbierto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="heading-responsive">Finalizar Venta</DialogTitle>
            <DialogDescription className="text-responsive">
              Selecciona el método de pago y confirma la venta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-responsive">Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="text-responsive">
                  <SelectValue placeholder="Selecciona un método de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo" className="text-responsive">Efectivo</SelectItem>
                  <SelectItem value="tarjeta" className="text-responsive">Tarjeta</SelectItem>
                  <SelectItem value="transferencia" className="text-responsive">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogoFinalizarAbierto(false)}
              className="text-responsive"
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmarVenta} disabled={cargando} className="text-responsive">
              {cargando ? "Procesando..." : "Confirmar Venta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={ventaExitosa} onOpenChange={setVentaExitosa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="heading-responsive">Venta Exitosa</DialogTitle>
            <DialogDescription className="text-responsive">
              La venta se ha completado correctamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <Receipt className="h-12 w-12 text-primary mx-auto mb-4" />
              <p className="text-responsive">Número de Venta: {ultimaVenta?.id}</p>
              <p className="text-responsive">Total: {formatCurrency(ultimaVenta?.total)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={cerrarComprobante} className="w-full text-responsive">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
