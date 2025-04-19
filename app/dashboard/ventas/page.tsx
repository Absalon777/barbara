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
import { BarcodeScanner } from "@/components/ui/barcode-scanner"

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

  const videoRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const isMobile = useMobile()

  useEffect(() => {
    // Limpiar el escáner cuando se desmonta el componente
    return () => {
      if (escanerActivo) {
        Quagga.stop()
      }
    }
  }, [escanerActivo])

  const handleCodigoBarrasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodigoBarras(e.target.value)
  }

  const handleBuscarProducto = async () => {
    if (!codigoBarras) return
    setCargando(true)
    setError(null)

    try {
      // Buscar el producto en la base de datos
      const { data: productos, error: errorProducto } = await supabase
        .from("productos")
        .select(`
          *,
          inventario(cantidad)
        `)
        .eq("codigo_barras", codigoBarras)
        .eq("activo", true)
        .limit(1)

      if (errorProducto) throw errorProducto

      if (!productos || productos.length === 0) {
        setError(`No se encontró ningún producto con el código ${codigoBarras}`)
        setCargando(false)
        return
      }

      const producto = productos[0]
      const stockDisponible =
        producto.inventario && producto.inventario.length > 0 ? producto.inventario[0].cantidad : 0

      if (stockDisponible <= 0) {
        setError(`El producto ${producto.nombre} no tiene stock disponible`)
        setCargando(false)
        return
      }

      // Verificar si el producto ya está en el carrito
      const productoExistente = carrito.find((p) => p.id === producto.id)

      if (productoExistente) {
        // Si ya existe, verificar si hay suficiente stock
        if (productoExistente.cantidad >= stockDisponible) {
          setError(`No hay suficiente stock disponible de ${producto.nombre}`)
          setCargando(false)
          return
        }

        // Si hay stock, aumentamos la cantidad
        const nuevoCarrito = carrito.map((p) =>
          p.id === producto.id
            ? {
                ...p,
                cantidad: p.cantidad + 1,
                subtotal: (p.cantidad + 1) * p.precio,
              }
            : p,
        )
        setCarrito(nuevoCarrito)
        calcularTotales(nuevoCarrito)
      } else {
        // Si no existe, lo agregamos al carrito
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

      // Limpiar el campo de código de barras
      setCodigoBarras("")
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
    setCodigoBarras(code)
    // Buscar y agregar el producto inmediatamente
    const buscarYAgregarProducto = async () => {
      setCargando(true)
      setError(null)

      try {
        // Buscar el producto en la base de datos
        const { data: productos, error: errorProducto } = await supabase
          .from("productos")
          .select(`
            *,
            inventario(cantidad)
          `)
          .eq("codigo_barras", code)
          .eq("activo", true)
          .limit(1)

        if (errorProducto) throw errorProducto

        if (!productos || productos.length === 0) {
          setError(`No se encontró ningún producto con el código ${code}`)
          setCargando(false)
          return
        }

        const producto = productos[0]
        const stockDisponible =
          producto.inventario && producto.inventario.length > 0 ? producto.inventario[0].cantidad : 0

        if (stockDisponible <= 0) {
          setError(`El producto ${producto.nombre} no tiene stock disponible`)
          setCargando(false)
          return
        }

        // Verificar si el producto ya está en el carrito
        const productoExistente = carrito.find((p) => p.id === producto.id)

        if (productoExistente) {
          // Si ya está en el carrito, incrementar la cantidad
          setCarrito(
            carrito.map((p) =>
              p.id === producto.id
                ? {
                    ...p,
                    cantidad: p.cantidad + 1,
                    subtotal: (p.cantidad + 1) * p.precio,
                  }
                : p
            )
          )
        } else {
          // Si no está en el carrito, agregarlo
          setCarrito([
            ...carrito,
            {
              id: producto.id,
              codigo: producto.codigo_barras,
              nombre: producto.nombre,
              precio: producto.precio_venta,
              cantidad: 1,
              subtotal: producto.precio_venta,
              stock_disponible: stockDisponible,
            },
          ])
        }

        setError(null)
        setCodigoBarras("")
      } catch (err: any) {
        console.error("Error al buscar producto:", err)
        setError("Error al buscar el producto. Inténtalo de nuevo.")
      } finally {
        setCargando(false)
      }
    }

    buscarYAgregarProducto()
  }

  const cerrarComprobante = () => {
    setVentaExitosa(false)
    setUltimaVenta(null)
  }

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return "0";
    return value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Punto de Venta</CardTitle>
            <CardDescription>Escanea o ingresa el código de barras del producto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Código de barras"
                  value={codigoBarras}
                  onChange={handleCodigoBarrasChange}
                  onKeyPress={(e) => e.key === "Enter" && handleBuscarProducto()}
                />
              </div>
              <Button onClick={handleBuscarProducto} disabled={cargando}>
                <Barcode className="mr-2 h-4 w-4" />
                Buscar
              </Button>
              <Button onClick={() => setEscanerActivo(true)}>
                <Camera className="mr-2 h-4 w-4" />
                Iniciar Escáner
              </Button>
            </div>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo del Escáner */}
      <Dialog open={escanerActivo} onOpenChange={setEscanerActivo}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Escáner de Código de Barras</DialogTitle>
            <DialogDescription>
              Apunta la cámara hacia el código de barras del producto
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4" ref={videoRef}>
            <BarcodeScanner 
              onDetected={handleCodigoDetectado} 
              onClose={() => setEscanerActivo(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Productos ({carrito.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {carrito.map((producto) => (
                <Card key={producto.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-medium">{producto.nombre}</h3>
                      <p className="text-sm text-muted-foreground">
                        Código: {producto.codigo}
                      </p>
                      <p className="text-sm font-medium">
                        ${producto.precio.toFixed(2)} c/u
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEliminarProducto(producto.id)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCambiarCantidad(producto.id, -1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="font-medium">{producto.cantidad}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCambiarCantidad(producto.id, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Subtotal</p>
                      <p className="font-medium">${producto.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                </Card>
              ))}
              {carrito.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay productos en el carrito
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={handleFinalizarVenta}
              disabled={carrito.length === 0}
            >
              Finalizar Venta
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Diálogo de finalización de venta */}
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

      {/* Diálogo de comprobante */}
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
              <p className="text-responsive">Total: ${formatCurrency(ultimaVenta?.total)}</p>
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
