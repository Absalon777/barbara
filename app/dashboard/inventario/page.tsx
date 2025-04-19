"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Edit, Plus, Search, Camera, Barcode, Save, X } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

// Importar la biblioteca para escaneo de códigos de barras
import Quagga from "quagga"

export default function InventarioPage() {
  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [productoEditando, setProductoEditando] = useState<any>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoMovimientoAbierto, setDialogoMovimientoAbierto] = useState(false)
  const [productoMovimiento, setProductoMovimiento] = useState<any>(null)
  const [cantidadMovimiento, setCantidadMovimiento] = useState(0)
  const [tipoMovimiento, setTipoMovimiento] = useState("entrada")
  const [motivoMovimiento, setMotivoMovimiento] = useState("compra")
  const [escanerActivo, setEscanerActivo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [tabActiva, setTabActiva] = useState("productos")
  const [movimientos, setMovimientos] = useState<any[]>([])

  const videoRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const isMobile = useMobile()

  useEffect(() => {
    const verificarRol = () => {
      const usuarioActualStr = localStorage.getItem("usuarioActual")
      if (usuarioActualStr) {
        const usuarioActual = JSON.parse(usuarioActualStr)
        setEsAdmin(usuarioActual.rol === "administrador")
      }
    }

    verificarRol()
    cargarDatos()
  }, [])

  useEffect(() => {
    // Limpiar el escáner cuando se desmonta el componente
    return () => {
      if (escanerActivo) {
        Quagga.stop()
      }
    }
  }, [escanerActivo])

  const cargarDatos = async () => {
    setCargando(true)
    try {
      // Cargar productos
      const { data: productosData, error: productosError } = await supabase
        .from("productos")
        .select(`
          *,
          categoria:categoria_id(nombre),
          proveedor:proveedor_id(nombre),
          inventario(cantidad)
        `)
        .eq("activo", true)
        .order("nombre")

      if (productosError) throw productosError

      // Cargar categorías
      const { data: categoriasData, error: categoriasError } = await supabase
        .from("categorias")
        .select("*")
        .order("nombre")

      if (categoriasError) throw categoriasError

      // Cargar proveedores
      const { data: proveedoresData, error: proveedoresError } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre")

      if (proveedoresError) throw proveedoresError

      // Cargar movimientos de inventario
      const { data: movimientosData, error: movimientosError } = await supabase
        .from("movimientos_inventario")
        .select(`
          *,
          producto:producto_id(nombre, codigo_barras),
          usuario:usuario_id(nombre)
        `)
        .order("fecha", { ascending: false })
        .limit(50)

      if (movimientosError) throw movimientosError

      // Formatear productos para mostrar la cantidad de inventario
      const productosFormateados = productosData.map((producto) => ({
        ...producto,
        stock: producto.inventario && producto.inventario.length > 0 ? producto.inventario[0].cantidad : 0,
        categoria_nombre: producto.categoria ? producto.categoria.nombre : "Sin categoría",
        proveedor_nombre: producto.proveedor ? producto.proveedor.nombre : "Sin proveedor",
      }))

      setProductos(productosFormateados)
      setCategorias(categoriasData)
      setProveedores(proveedoresData)
      setMovimientos(movimientosData)
      setError(null)
    } catch (err: any) {
      console.error("Error al cargar datos:", err)
      setError("Error al cargar los datos. Por favor, intenta de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  const handleBuscar = () => {
    if (!busqueda) {
      cargarDatos()
      return
    }

    const resultados = productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo_barras.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()),
    )

    setProductos(resultados)
  }

  const handleNuevoProducto = () => {
    if (!esAdmin) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para crear productos",
        variant: "destructive",
      })
      return
    }

    setProductoEditando({
      id: "",
      codigo_barras: "",
      nombre: "",
      descripcion: "",
      categoria_id: "",
      precio_venta: 0,
      precio_costo: 0,
      stock_minimo: 5,
      proveedor_id: "",
      stock: 0,
    })
    setDialogoAbierto(true)
  }

  const handleEditarProducto = (producto: any) => {
    if (!esAdmin) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para editar productos",
        variant: "destructive",
      })
      return
    }

    setProductoEditando(producto)
    setDialogoAbierto(true)
  }

  const handleGuardarProducto = async () => {
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

      if (productoEditando.id) {
        // Actualizar producto existente
        const { error } = await supabase
          .from("productos")
          .update({
            codigo_barras: productoEditando.codigo_barras,
            nombre: productoEditando.nombre,
            descripcion: productoEditando.descripcion,
            categoria_id: productoEditando.categoria_id,
            precio_venta: productoEditando.precio_venta,
            precio_costo: productoEditando.precio_costo,
            stock_minimo: productoEditando.stock_minimo,
            proveedor_id: productoEditando.proveedor_id,
            updated_at: new Date(),
          })
          .eq("id", productoEditando.id)

        if (error) throw error

        // Registrar la acción en logs
        await supabase.from("logs_actividad").insert({
          usuario_id: usuarioActual.id,
          accion: "editar",
          tabla: "productos",
          registro_id: productoEditando.id,
          detalles: `Actualización de producto: ${productoEditando.nombre}`,
          ip_address: "127.0.0.1",
        })

        toast({
          title: "Producto actualizado",
          description: "El producto se ha actualizado correctamente",
        })
      } else {
        // Crear nuevo producto
        const { data, error } = await supabase
          .from("productos")
          .insert({
            codigo_barras: productoEditando.codigo_barras,
            nombre: productoEditando.nombre,
            descripcion: productoEditando.descripcion,
            categoria_id: productoEditando.categoria_id,
            precio_venta: productoEditando.precio_venta,
            precio_costo: productoEditando.precio_costo,
            stock_minimo: productoEditando.stock_minimo,
            proveedor_id: productoEditando.proveedor_id,
            activo: true,
          })
          .select()

        if (error) throw error

        // Inicializar el inventario
        if (data && data.length > 0) {
          const nuevoProductoId = data[0].id

          await supabase.from("inventario").insert({
            producto_id: nuevoProductoId,
            cantidad: productoEditando.stock || 0,
            ubicacion: "Bodega Principal",
          })

          // Si hay stock inicial, registrar el movimiento
          if (productoEditando.stock > 0) {
            await supabase.from("movimientos_inventario").insert({
              producto_id: nuevoProductoId,
              tipo_movimiento: "entrada",
              cantidad: productoEditando.stock,
              motivo: "stock_inicial",
              usuario_id: usuarioActual.id,
              fecha: new Date(),
            })
          }

          // Registrar la acción en logs
          await supabase.from("logs_actividad").insert({
            usuario_id: usuarioActual.id,
            accion: "crear",
            tabla: "productos",
            registro_id: nuevoProductoId,
            detalles: `Creación de producto: ${productoEditando.nombre}`,
            ip_address: "127.0.0.1",
          })
        }

        toast({
          title: "Producto creado",
          description: "El producto se ha creado correctamente",
        })
      }

      setDialogoAbierto(false)
      cargarDatos()
    } catch (err: any) {
      console.error("Error al guardar producto:", err)
      toast({
        title: "Error",
        description: err.message || "Error al guardar el producto",
        variant: "destructive",
      })
    }
  }

  const handleAbrirMovimiento = (producto: any) => {
    if (!esAdmin) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para modificar el inventario",
        variant: "destructive",
      })
      return
    }

    setProductoMovimiento(producto)
    setCantidadMovimiento(1)
    setTipoMovimiento("entrada")
    setMotivoMovimiento("compra")
    setDialogoMovimientoAbierto(true)
  }

  const handleGuardarMovimiento = async () => {
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

      // Registrar el movimiento
      await supabase.from("movimientos_inventario").insert({
        producto_id: productoMovimiento.id,
        tipo_movimiento: tipoMovimiento,
        cantidad: cantidadMovimiento,
        motivo: motivoMovimiento,
        usuario_id: usuarioActual.id,
        fecha: new Date(),
      })

      // Actualizar el inventario
      const { data: inventarioActual } = await supabase
        .from("inventario")
        .select("id, cantidad")
        .eq("producto_id", productoMovimiento.id)
        .single()

      if (inventarioActual) {
        const nuevaCantidad =
          tipoMovimiento === "entrada"
            ? inventarioActual.cantidad + cantidadMovimiento
            : Math.max(0, inventarioActual.cantidad - cantidadMovimiento)

        await supabase
          .from("inventario")
          .update({ cantidad: nuevaCantidad, updated_at: new Date() })
          .eq("id", inventarioActual.id)
      }

      // Registrar la acción en logs
      await supabase.from("logs_actividad").insert({
        usuario_id: usuarioActual.id,
        accion: "movimiento_inventario",
        tabla: "inventario",
        registro_id: productoMovimiento.id,
        detalles: `${tipoMovimiento} de ${cantidadMovimiento} unidades de ${productoMovimiento.nombre}. Motivo: ${motivoMovimiento}`,
        ip_address: "127.0.0.1",
      })

      toast({
        title: "Movimiento registrado",
        description: "El movimiento de inventario se ha registrado correctamente",
      })

      setDialogoMovimientoAbierto(false)
      cargarDatos()
    } catch (err: any) {
      console.error("Error al registrar movimiento:", err)
      toast({
        title: "Error",
        description: err.message || "Error al registrar el movimiento",
        variant: "destructive",
      })
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
            setBusqueda(code)
            detenerEscaner()

            // Buscar el producto inmediatamente
            const buscarProducto = async () => {
              setCargando(true)
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

                // Producto encontrado, actualizar la lista filtrada
                const productosFormateados = productos.map((producto) => ({
                  ...producto,
                  stock: producto.inventario && producto.inventario.length > 0 ? producto.inventario[0].cantidad : 0,
                  categoria_nombre: producto.categoria ? producto.categoria.nombre : "Sin categoría",
                  proveedor_nombre: producto.proveedor ? producto.proveedor.nombre : "Sin proveedor",
                }))

                setProductos(productosFormateados)
                setError(null)

                toast({
                  title: "Producto encontrado",
                  description: `Se encontró el producto: ${productosFormateados[0].nombre}`,
                })
              } catch (err: any) {
                console.error("Error al buscar producto:", err)
                setError("Error al buscar el producto. Inténtalo de nuevo.")
              } finally {
                setCargando(false)
              }
            }

            buscarProducto()
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
        {esAdmin && (
          <Button onClick={handleNuevoProducto}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <Tabs value={tabActiva} onValueChange={setTabActiva} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="productos">
          <Card>
            <CardHeader>
              <CardTitle>Catálogo de Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 mb-4">
                <div className="relative w-full">
                  <Input
                    placeholder="Buscar por nombre o código de barras"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pr-10"
                  />
                  {busqueda && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => {
                        setBusqueda("")
                        cargarDatos()
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleBuscar}>
                    <Search className="mr-2 h-4 w-4" />
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

              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cargando ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">Cargando productos...</p>
                          </TableCell>
                        </TableRow>
                      ) : productos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No se encontraron productos
                          </TableCell>
                        </TableRow>
                      ) : (
                        productos.map((producto) => (
                          <TableRow key={producto.id}>
                            <TableCell className="font-mono text-sm">{producto.codigo_barras}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{producto.nombre}</div>
                                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                  {producto.descripcion}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{producto.categoria_nombre}</Badge>
                            </TableCell>
                            <TableCell className="text-right">${producto.precio_venta.toLocaleString()}</TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={producto.stock < producto.stock_minimo ? "destructive" : "default"}
                                className="w-16"
                              >
                                {producto.stock}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEditarProducto(producto)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleAbrirMovimiento(producto)}>
                                  <Barcode className="h-4 w-4" />
                                </Button>
                              </div>
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
        </TabsContent>

        <TabsContent value="movimientos">
          <Card>
            <CardHeader>
              <CardTitle>Movimientos de Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Usuario</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cargando ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">Cargando movimientos...</p>
                          </TableCell>
                        </TableRow>
                      ) : movimientos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No se encontraron movimientos
                          </TableCell>
                        </TableRow>
                      ) : (
                        movimientos.map((movimiento) => (
                          <TableRow key={movimiento.id}>
                            <TableCell>
                              {new Date(movimiento.fecha).toLocaleDateString("es-CL", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{movimiento.producto?.nombre || "Producto eliminado"}</div>
                                <div className="text-sm text-muted-foreground">
                                  {movimiento.producto?.codigo_barras || ""}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={movimiento.tipo_movimiento === "entrada" ? "default" : "destructive"}>
                                {movimiento.tipo_movimiento === "entrada" ? "Entrada" : "Salida"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">{movimiento.cantidad}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {movimiento.motivo === "compra"
                                  ? "Compra"
                                  : movimiento.motivo === "venta"
                                    ? "Venta"
                                    : movimiento.motivo === "ajuste"
                                      ? "Ajuste"
                                      : movimiento.motivo === "devolucion"
                                        ? "Devolución"
                                        : movimiento.motivo === "stock_inicial"
                                          ? "Stock Inicial"
                                          : movimiento.motivo}
                              </Badge>
                            </TableCell>
                            <TableCell>{movimiento.usuario?.nombre || "Usuario desconocido"}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo para editar/crear producto */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{productoEditando?.id ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>Complete los datos del producto y guarde los cambios.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de Barras</Label>
                <Input
                  id="codigo"
                  value={productoEditando?.codigo_barras || ""}
                  onChange={(e) => setProductoEditando({ ...productoEditando, codigo_barras: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={productoEditando?.nombre || ""}
                  onChange={(e) => setProductoEditando({ ...productoEditando, nombre: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={productoEditando?.descripcion || ""}
                onChange={(e) => setProductoEditando({ ...productoEditando, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={productoEditando?.categoria_id || ""}
                  onValueChange={(value) => setProductoEditando({ ...productoEditando, categoria_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proveedor">Proveedor</Label>
                <Select
                  value={productoEditando?.proveedor_id || ""}
                  onValueChange={(value) => setProductoEditando({ ...productoEditando, proveedor_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((proveedor) => (
                      <SelectItem key={proveedor.id} value={proveedor.id}>
                        {proveedor.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precio_venta">Precio Venta</Label>
                <Input
                  id="precio_venta"
                  type="number"
                  value={productoEditando?.precio_venta || 0}
                  onChange={(e) => setProductoEditando({ ...productoEditando, precio_venta: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_costo">Precio Costo</Label>
                <Input
                  id="precio_costo"
                  type="number"
                  value={productoEditando?.precio_costo || 0}
                  onChange={(e) => setProductoEditando({ ...productoEditando, precio_costo: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock_minimo">Stock Mínimo</Label>
                <Input
                  id="stock_minimo"
                  type="number"
                  value={productoEditando?.stock_minimo || 0}
                  onChange={(e) => setProductoEditando({ ...productoEditando, stock_minimo: Number(e.target.value) })}
                />
              </div>
            </div>

            {!productoEditando?.id && (
              <div className="space-y-2">
                <Label htmlFor="stock_inicial">Stock Inicial</Label>
                <Input
                  id="stock_inicial"
                  type="number"
                  value={productoEditando?.stock || 0}
                  onChange={(e) => setProductoEditando({ ...productoEditando, stock: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarProducto}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para registrar movimiento de inventario */}
      <Dialog open={dialogoMovimientoAbierto} onOpenChange={setDialogoMovimientoAbierto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento de Inventario</DialogTitle>
            <DialogDescription>
              Producto: {productoMovimiento?.nombre} (Stock actual: {productoMovimiento?.stock})
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_movimiento">Tipo de Movimiento</Label>
              <Select value={tipoMovimiento} onValueChange={setTipoMovimiento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cantidad">Cantidad</Label>
              <Input
                id="cantidad"
                type="number"
                min="1"
                value={cantidadMovimiento}
                onChange={(e) => setCantidadMovimiento(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Select value={motivoMovimiento} onValueChange={setMotivoMovimiento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipoMovimiento === "entrada" ? (
                    <>
                      <SelectItem value="compra">Compra</SelectItem>
                      <SelectItem value="devolucion">Devolución</SelectItem>
                      <SelectItem value="ajuste">Ajuste de Inventario</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="venta">Venta</SelectItem>
                      <SelectItem value="perdida">Pérdida o Daño</SelectItem>
                      <SelectItem value="ajuste">Ajuste de Inventario</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoMovimientoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarMovimiento}>
              <Save className="mr-2 h-4 w-4" />
              Registrar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
