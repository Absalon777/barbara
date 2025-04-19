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

  const iniciarEscaner = () => {
    if (!videoRef.current) return

    setEscanerActivo(true)
    setError(null)

    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: videoRef.current,
          constraints: {
            facingMode: "environment", // Usar cámara trasera en móviles
            width: { min: 450 },
            height: { min: 300 },
            aspectRatio: { min: 1, max: 2 },
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: 4,
        frequency: 10,
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader",
            "code_128_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "upc_reader",
            "upc_e_reader",
          ],
          debug: {
            showCanvas: true,
            showPatches: true,
            showFoundPatches: true,
            showSkeleton: true,
            showLabels: true,
            showPatchLabels: true,
            showRemainingPatchLabels: true,
          },
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error("Error al iniciar el escáner:", err)
          toast({
            title: "Error",
            description: "No se pudo iniciar la cámara. Verifica los permisos.",
            variant: "destructive",
          })
          setEscanerActivo(false)
          return
        }

        console.log("Escáner iniciado correctamente")
        Quagga.start()

        // Mejorar la detección de códigos de barras
        Quagga.onDetected((result) => {
          const code = result.codeResult.code
          if (code) {
            console.log("Código detectado:", code)
            setCodigoBarras(code)
            detenerEscaner()

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

                  toast({
                    title: "Producto agregado",
                    description: `Se agregó una unidad más de ${producto.nombre}`,
                  })
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

                  toast({
                    title: "Producto agregado",
                    description: `Se agregó ${producto.nombre} al carrito`,
                  })
                }
              } catch (err: any) {
                console.error("Error al buscar producto:", err)
                setError("Error al buscar el producto. Inténtalo de nuevo.")
              } finally {
                setCargando(false)
              }
            }

            buscarYAgregarProducto()
          }
        })

        // Agregar manejo de errores durante el escaneo
        Quagga.onProcessed((result) => {
          const drawingCtx = Quagga.canvas.ctx.overlay
          const drawingCanvas = Quagga.canvas.dom.overlay

          if (result) {
            if (result.boxes) {
              drawingCtx.clearRect(
                0,
                0,
                Number.parseInt(drawingCanvas.getAttribute("width")),
                Number.parseInt(drawingCanvas.getAttribute("height")),
              )
              result.boxes
                .filter((box) => box !== result.box)
                .forEach((box) => {
                  Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, {
                    color: "green",
                    lineWidth: 2,
                  })
                })
            }

            if (result.box) {
              Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, {
                color: "#00F",
                lineWidth: 2,
              })
            }

            if (result.codeResult && result.codeResult.code) {
              Quagga.ImageDebug.drawPath(result.line, { x: "x", y: "y" }, drawingCtx, { color: "red", lineWidth: 3 })
            }
          }
        })
      },
    )
  }

  const detenerEscaner = () => {
    if (escanerActivo) {
      Quagga.stop()
      setEscanerActivo(false)
    }
  }

  const cerrarComprobante = () => {
    setVentaExitosa(false)
    setUltimaVenta(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Carrito de Compra</CardTitle>
              <CardDescription>Productos agregados a la venta actual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 mb-4">
                <div className="relative w-full">
                  <Input
                    placeholder="Escanea o ingresa el código de barras"
                    value={codigoBarras}
                    onChange={handleCodigoBarrasChange}
                    className="pr-10"
                  />
                  {codigoBarras && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setCodigoBarras("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleBuscarProducto} disabled={cargando || !codigoBarras}>
                    <Barcode className="mr-2 h-4 w-4" />
                    Buscar
                  </Button>
                  <Button variant="outline" onClick={iniciarEscaner} disabled={escanerActivo}>
                    <Camera className="mr-2 h-4 w-4" />
                    Escanear
                  </Button>
                </div>
              </div>

              {escanerActivo && (
                <div className="mb-4">
                  <div className="relative">
                    <div ref={videoRef} className="w-full h-64 bg-black rounded-md overflow-hidden"></div>
                    <Button variant="destructive" size="sm" className="absolute top-2 right-2" onClick={detenerEscaner}>
                      <X className="h-4 w-4 mr-1" /> Cerrar
                    </Button>
                  </div>
                  <p className="text-sm text-center mt-2 text-muted-foreground">
                    Apunta la cámara al código de barras del producto
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="border rounded-md">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {carrito.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No hay productos en el carrito
                          </TableCell>
                        </TableRow>
                      ) : (
                        carrito.map((producto) => (
                          <TableRow key={producto.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{producto.nombre}</div>
                                <div className="text-sm text-muted-foreground">{producto.codigo}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">${producto.precio.toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleCambiarCantidad(producto.id, -1)}
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center">{producto.cantidad}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleCambiarCantidad(producto.id, 1)}
                                  disabled={producto.cantidad >= producto.stock_disponible}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">${producto.subtotal.toLocaleString()}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEliminarProducto(producto.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (19%):</span>
                <span>${impuestos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                disabled={carrito.length === 0 || cargando}
                onClick={handleFinalizarVenta}
              >
                <ShoppingCart className="mr-2 h-5 w-5" />
                Finalizar Venta
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Diálogo para finalizar venta */}
      <Dialog open={dialogoFinalizarAbierto} onOpenChange={setDialogoFinalizarAbierto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Finalizar Venta</DialogTitle>
            <DialogDescription>Confirma los detalles de la venta para procesarla</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="metodo_pago">Método de Pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta de Crédito/Débito</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-md p-4 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA (19%):</span>
                <span>${impuestos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total a pagar:</span>
                <span>${total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoFinalizarAbierto(false)} disabled={cargando}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarVenta} disabled={cargando}>
              {cargando ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Procesando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Confirmar Venta
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de comprobante de venta */}
      <Dialog open={ventaExitosa} onOpenChange={cerrarComprobante}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center text-center">
              <Receipt className="mr-2 h-5 w-5" />
              Comprobante de Venta
            </DialogTitle>
          </DialogHeader>

          {ultimaVenta && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold">Sistema de Gestión de Ventas</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(ultimaVenta.fecha).toLocaleDateString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm">Venta #{ultimaVenta.id.substring(0, 8)}</p>
                <p className="text-sm">Vendedor: {ultimaVenta.vendedor}</p>
              </div>

              <div className="border-t border-b py-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-center">Cant</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ultimaVenta.productos.map((producto: any) => (
                      <TableRow key={producto.id}>
                        <TableCell className="py-1">{producto.nombre}</TableCell>
                        <TableCell className="text-right py-1">${producto.precio.toLocaleString()}</TableCell>
                        <TableCell className="text-center py-1">{producto.cantidad}</TableCell>
                        <TableCell className="text-right py-1">${producto.subtotal.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${ultimaVenta.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (19%):</span>
                  <span>${ultimaVenta.impuestos.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${ultimaVenta.total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Método de pago:</span>
                  <span>
                    {ultimaVenta.metodoPago === "efectivo"
                      ? "Efectivo"
                      : ultimaVenta.metodoPago === "tarjeta"
                        ? "Tarjeta"
                        : "Transferencia"}
                  </span>
                </div>
              </div>

              <div className="text-center text-sm text-muted-foreground pt-2 border-t">
                <p>¡Gracias por su compra!</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={cerrarComprobante} className="w-full">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
