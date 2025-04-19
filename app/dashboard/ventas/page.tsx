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
    const nuevoImpuestos = nuevoSubtotal * 0.19 // IVA 19%
    const nuevoTotal = nuevoSubtotal + nuevoImpuestos

    setSubtotal(nuevoSubtotal)
    setImpuestos(nuevoImpuestos)
    setTotal(nuevoTotal)
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

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="container-responsive">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sección de búsqueda y escaneo */}
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle className="heading-responsive">Agregar Productos</CardTitle>
                <CardDescription className="text-responsive">
                  Escanea o ingresa el código de barras del producto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Código de barras"
                      value={codigoBarras}
                      onChange={handleCodigoBarrasChange}
                      className="text-responsive"
                    />
                    <Button
                      onClick={handleBuscarProducto}
                      disabled={cargando}
                      className="text-responsive"
                    >
                      <Barcode className="mr-2 h-4 w-4" />
                      Buscar
                    </Button>
                  </div>
                  {isMobile && (
                    <Button
                      variant="outline"
                      onClick={() => setEscanerActivo(!escanerActivo)}
                      className="w-full text-responsive"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {escanerActivo ? "Detener Escáner" : "Iniciar Escáner"}
                    </Button>
                  )}
                </div>
                {escanerActivo && (
                  <div className="mt-4" ref={videoRef}>
                    <BarcodeScanner onDetected={handleCodigoDetectado} onClose={() => setEscanerActivo(false)} />
                  </div>
                )}
                {error && (
                  <Alert variant="destructive" className="mt-4 text-responsive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Sección del carrito */}
            <Card className="card-responsive">
              <CardHeader>
                <CardTitle className="heading-responsive">Carrito de Compras</CardTitle>
                <CardDescription className="text-responsive">
                  {carrito.length} productos en el carrito
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="table-responsive">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-responsive">Producto</TableHead>
                        <TableHead className="text-responsive">Cantidad</TableHead>
                        <TableHead className="text-responsive">Precio</TableHead>
                        <TableHead className="text-responsive">Subtotal</TableHead>
                        <TableHead className="text-responsive">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carrito.map((producto) => (
                        <TableRow key={producto.id}>
                          <TableCell className="text-responsive">{producto.nombre}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCambiarCantidad(producto.id, -1)}
                                className="h-8 w-8"
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="text-responsive">{producto.cantidad}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleCambiarCantidad(producto.id, 1)}
                                className="h-8 w-8"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-responsive">
                            ${producto.precio.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-responsive">
                            ${producto.subtotal.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarProducto(producto.id)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-responsive">
                    <span>Subtotal:</span>
                    <span>${subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-responsive">
                    <span>IVA (19%):</span>
                    <span>${impuestos.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-responsive">
                    <span>Total:</span>
                    <span>${total.toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  onClick={handleFinalizarVenta}
                  disabled={carrito.length === 0}
                  className="w-full text-responsive"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Finalizar Venta
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
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
              <p className="text-responsive">Total: ${ultimaVenta?.total.toLocaleString()}</p>
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
