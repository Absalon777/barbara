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
import BarcodeScanner from "@/components/ui/barcode-scanner"

// Definir tipos para mayor claridad (opcional pero recomendado)
interface ProductoInventario {
  id: string;
  codigo_barras: string;
  nombre: string;
  descripcion: string;
  categoria_id: string | null;
  precio_venta: number | null;
  precio_costo: number | null;
  stock_minimo: number | null;
  proveedor_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  stock: number | null; // Añadido en formateo
  categoria_nombre: string; // Añadido en formateo
  proveedor_nombre: string; // Añadido en formateo
}

interface Categoria {
  id: string;
  nombre: string;
  // ... otros campos si existen
}

interface Proveedor {
  id: string;
  nombre: string;
  // ... otros campos si existen
}

interface MovimientoInventario {
  id: string;
  fecha: string;
  producto?: { nombre?: string; codigo_barras?: string }; // Anidado y opcional
  tipo_movimiento: string;
  cantidad: number;
  motivo: string;
  usuario?: { nombre?: string }; // Anidado y opcional
  // ... otros campos
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<ProductoInventario[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [productoEditando, setProductoEditando] = useState<ProductoInventario | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoMovimientoAbierto, setDialogoMovimientoAbierto] = useState(false)
  const [productoMovimiento, setProductoMovimiento] = useState<ProductoInventario | null>(null)
  const [cantidadMovimiento, setCantidadMovimiento] = useState<number>(0)
  const [tipoMovimiento, setTipoMovimiento] = useState("entrada")
  const [motivoMovimiento, setMotivoMovimiento] = useState("compra")
  const [escanerActivo, setEscanerActivo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  const [tabActiva, setTabActiva] = useState("productos")
  const [nuevaCategoria, setNuevaCategoria] = useState("")
  const [creandoCategoria, setCreandoCategoria] = useState(false)
  const [searchInput, setSearchInput] = useState("")

  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()
  const isMobile = useMobile()

  // Cargar datos iniciales y verificar rol
  useEffect(() => {
    const verificarRol = () => {
      const usuarioActualStr = localStorage.getItem("usuarioActual")
      if (usuarioActualStr) {
        try {
          const usuarioActual = JSON.parse(usuarioActualStr)
          setEsAdmin(usuarioActual?.rol === "administrador")
        } catch (e) { console.error("Error parsing user data:", e); }
      }
    }
    verificarRol()
    cargarDatos()
  }, [])

  // Efecto para filtrar productos cuando cambia la búsqueda o la lista original
  useEffect(() => {
    let items = [...productos] // Copia de la lista original
    if (busqueda.trim()) { // Filtrar solo si hay texto de búsqueda
      const busquedaLower = busqueda.toLowerCase()
      items = items.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(busquedaLower) ||
          p.codigo_barras?.toLowerCase().includes(busquedaLower) ||
          p.descripcion?.toLowerCase().includes(busquedaLower) ||
          p.categoria_nombre?.toLowerCase().includes(busquedaLower) ||
          p.proveedor_nombre?.toLowerCase().includes(busquedaLower)
      )
    }
    setProductosFiltrados(items)
  }, [busqueda, productos])

  const cargarDatos = async () => {
    setCargando(true)
    setError(null)
    console.log("Cargando datos...")
    try {
      // Usar Promise.all para cargar en paralelo
      const [productosRes, categoriasRes, proveedoresRes, movimientosRes] = await Promise.all([
        supabase
          .from("productos")
          .select(`*, categoria:categoria_id(nombre), proveedor:proveedor_id(nombre), inventario(cantidad)`)
          .eq("activo", true)
          .order("nombre"),
        supabase.from("categorias").select("*").order("nombre"),
        supabase.from("proveedores").select("*").order("nombre"),
        supabase
          .from("movimientos_inventario")
          .select(`*, producto:producto_id(nombre, codigo_barras), usuario:usuario_id(nombre)`)
          .order("fecha", { ascending: false })
          .limit(50)
      ]);

      // Manejo de errores individuales
      if (productosRes.error) throw productosRes.error;
      if (categoriasRes.error) throw categoriasRes.error;
      if (proveedoresRes.error) throw proveedoresRes.error;
      if (movimientosRes.error) throw movimientosRes.error;

      const productosFormateados = (productosRes.data || []).map((producto) => ({
        ...producto,
        stock: producto.inventario?.[0]?.cantidad ?? 0,
        categoria_nombre: producto.categoria?.nombre ?? "Sin categoría",
        proveedor_nombre: producto.proveedor?.nombre ?? "Sin proveedor",
      }))

      setProductos(productosFormateados)
      setCategorias(categoriasRes.data || [])
      setProveedores(proveedoresRes.data || [])
      setMovimientos(movimientosRes.data || [])
      console.log("Datos cargados exitosamente.")

    } catch (err: any) {
      console.error("Error al cargar datos:", err)
      setError(`Error al cargar datos: ${err.message || 'Error desconocido'}`)
      toast({ title: "Error", description: "No se pudieron cargar los datos.", variant: "destructive" })
    } finally {
      setCargando(false)
    }
  }

  const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusqueda(e.target.value)
  }

  // Activa/Desactiva el scanner
  const toggleEscaner = () => {
    setEscanerActivo(!escanerActivo)
  }

  // Callback cuando el scanner detecta un código
  const handleCodigoDetectado = (codigo: string) => {
    setEscanerActivo(false);
    
    // Si estamos en el diálogo de producto (creando o editando)
    if (dialogoAbierto && productoEditando) {
      setProductoEditando({ ...productoEditando, codigo_barras: codigo });
    } else {
      // Si estamos en la vista principal, actualizar la búsqueda
      setBusqueda(codigo);
    }
    
    toast({
      title: "Código detectado",
      description: `Se detectó el código: ${codigo}`,
    });
  };

  // --- Funciones CRUD y Movimientos (Asegurarse que usan encadenamiento opcional si es necesario) ---

  const handleNuevoProducto = () => {
    if (!esAdmin) return toast({ title: "Acceso denegado", variant: "destructive" });
    setProductoEditando({ // Objeto inicial vacío/por defecto
      id: "", 
      codigo_barras: "", 
      nombre: "", 
      descripcion: "", 
      categoria_id: null,
      precio_venta: null, 
      precio_costo: null, 
      stock_minimo: null, 
      proveedor_id: null,
      activo: true, 
      created_at: "", 
      updated_at: "", 
      stock: null,
      categoria_nombre: "", 
      proveedor_nombre: ""
    });
    setDialogoAbierto(true)
  }

  const handleEditarProducto = (producto: ProductoInventario) => {
    if (!esAdmin) return toast({ title: "Acceso denegado", variant: "destructive" });
    setProductoEditando(producto)
    setDialogoAbierto(true)
  }

  const handleGuardarProducto = async () => {
    if (!productoEditando) return;
    console.log("Guardando producto:", productoEditando);
    // ... (lógica de validación y guardado) ...
    // Asegurar que la lógica aquí maneja bien productoEditando.categoria_id, etc. (pueden ser null)
    try {
      const datosGuardar = {
        codigo_barras: productoEditando.codigo_barras,
        nombre: productoEditando.nombre,
        descripcion: productoEditando.descripcion,
        categoria_id: productoEditando.categoria_id || null, // Asegurar null si es vacío
        precio_venta: Number(productoEditando.precio_venta) || 0,
        precio_costo: Number(productoEditando.precio_costo) || 0,
        stock_minimo: Number(productoEditando.stock_minimo) || 0,
        proveedor_id: productoEditando.proveedor_id || null, // Asegurar null si es vacío
        updated_at: new Date(),
      };

      let error = null;
      if (productoEditando.id) { // Actualizar
        const { error: updateError } = await supabase.from("productos").update(datosGuardar).eq("id", productoEditando.id);
        error = updateError;
      } else { // Crear
        // Validar código de barras único al crear
        const { data: existente } = await supabase.from("productos").select('id').eq('codigo_barras', productoEditando.codigo_barras).maybeSingle();
        if (existente) {
          toast({ title: "Error", description: "El código de barras ya existe.", variant: "destructive" });
          return;
        }
        const { error: insertError } = await supabase.from("productos").insert([{ ...datosGuardar, activo: true }]);
        error = insertError;
      }

      if (error) throw error;

      toast({ title: "Éxito", description: "Producto guardado correctamente." });
      setDialogoAbierto(false);
      cargarDatos(); // Recargar datos
    } catch (err: any) {
      console.error("Error guardando producto:", err);
      toast({ title: "Error", description: `No se pudo guardar el producto: ${err.message}`, variant: "destructive" });
    }
  }

  const handleGuardarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    setCreandoCategoria(true);
    try {
      const { data, error } = await supabase.from("categorias").insert([{ nombre: nuevaCategoria }]).select().single();
      if (error) throw error;
      toast({ title: "Éxito", description: "Categoría creada." });
      setCategorias([...categorias, data]); // Actualizar lista
      setNuevaCategoria("");
      // Si estamos editando un producto, asignarle la nueva categoría
      if (productoEditando) {
        setProductoEditando({ ...productoEditando, categoria_id: data.id });
      }
    } catch (err: any) {
      console.error("Error creando categoría:", err);
      toast({ title: "Error", description: "No se pudo crear la categoría.", variant: "destructive" });
    } finally {
      setCreandoCategoria(false);
    }
  };

  const handleAbrirMovimiento = (producto: ProductoInventario) => {
    if (!esAdmin) {
      toast({ title: "Acceso denegado", description: "Solo los administradores pueden modificar el stock.", variant: "destructive" });
      return;
    }
    setProductoMovimiento(producto);
    setCantidadMovimiento(0);
    setTipoMovimiento("entrada");
    setMotivoMovimiento(tipoMovimiento === 'entrada' ? 'compra' : 'venta');
    setDialogoMovimientoAbierto(true);
  };

  const handleGuardarMovimiento = async () => {
    if (!productoMovimiento || cantidadMovimiento <= 0) {
      toast({title: "Error", description: "Selecciona un producto y una cantidad válida.", variant: "destructive"});
      return;
    }

    console.log("Guardando movimiento para:", productoMovimiento.id, "Tipo:", tipoMovimiento, "Cantidad:", cantidadMovimiento, "Motivo:", motivoMovimiento);

    const usuarioActualStr = localStorage.getItem("usuarioActual");
    if (!usuarioActualStr) {
      toast({ title: "Error", description: "No se pudo identificar al usuario.", variant: "destructive" });
      return;
    }
    const usuarioActual = JSON.parse(usuarioActualStr);

    setCargando(true);
    try {
      // 1. Registrar movimiento
      const { error: movError } = await supabase.from("movimientos_inventario").insert({
        producto_id: productoMovimiento.id,
        tipo_movimiento: tipoMovimiento,
        cantidad: cantidadMovimiento,
        motivo: motivoMovimiento,
        usuario_id: usuarioActual.id,
        fecha: new Date(),
      });
      if (movError) throw movError;

      // 2. Actualizar stock en tabla inventario
      const { data: invActual, error: invError } = await supabase
        .from("inventario")
        .select("id, cantidad")
        .eq("producto_id", productoMovimiento.id)
        .single();

      if (invError && invError.code !== 'PGRST116') { // Ignorar error si no existe registro aún
        throw invError;
      }

      let nuevoStock = 0;
      if (invActual) {
        nuevoStock = tipoMovimiento === 'entrada'
          ? invActual.cantidad + cantidadMovimiento
          : Math.max(0, invActual.cantidad - cantidadMovimiento);
        
        const { error: updateInvError } = await supabase
          .from("inventario")
          .update({ cantidad: nuevoStock, updated_at: new Date() })
          .eq("id", invActual.id);
        if (updateInvError) throw updateInvError;

      } else { // Si no existe registro en inventario, crearlo (solo para entradas)
        if (tipoMovimiento === 'entrada') {
          nuevoStock = cantidadMovimiento;
          const { error: insertInvError } = await supabase
            .from("inventario")
            .insert({ producto_id: productoMovimiento.id, cantidad: nuevoStock });
          if (insertInvError) throw insertInvError;
        } else {
          console.warn("Intentando salida sin registro de inventario para producto:", productoMovimiento.id);
          // Opcional: Lanzar error o permitir stock negativo virtualmente
        }
      }

      toast({ title: "Éxito", description: "Movimiento registrado y stock actualizado." });
      setDialogoMovimientoAbierto(false);
      cargarDatos(); // Recargar datos para reflejar cambios

    } catch (err: any) {
      console.error("Error guardando movimiento:", err);
      toast({ title: "Error", description: `No se pudo guardar el movimiento: ${err.message}`, variant: "destructive" });
    } finally {
      setCargando(false);
    }
  };

  // --- Renderizado --- 

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "$0";
    return "$" + value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Scanner Condicional */}
      {escanerActivo && (
        <div className="fixed inset-0 z-[100]">
          <BarcodeScanner
            onDetected={handleCodigoDetectado}
            onClose={() => {
              setEscanerActivo(false);
              // No cerramos el diálogo del producto aquí
            }}
          />
        </div>
      )}

      {/* Contenido principal (oculto si scanner activo) */}
      <div className={`flex flex-1 flex-col overflow-hidden ${escanerActivo ? 'hidden' : ''}`}>
         <Tabs value={tabActiva} onValueChange={setTabActiva} className="flex flex-col flex-1 h-full overflow-hidden">
             <div className="border-b p-4 flex-shrink-0">
                 <TabsList>
                     <TabsTrigger value="productos">Productos</TabsTrigger>
                     <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
                 </TabsList>
             </div>

            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                {/* --- Pestaña Productos --- */}
                <TabsContent value="productos" className="mt-0 space-y-4">
                    {/* Barra de Búsqueda y Botones */}    
                    <div className="flex flex-wrap items-center gap-2">
                       <Input
                        placeholder="Buscar producto..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="max-w-sm flex-grow"
                      />
                      <Button onClick={() => setEscanerActivo(true)} variant="outline"> 
                          <Camera className="mr-2 h-4 w-4" /> Escanear
                      </Button>
                      {esAdmin && (
                        <Button onClick={handleNuevoProducto}>
                          <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
                        </Button>
                      )}
                    </div>
                    {error && (
                      <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    
                    {/* Vista Productos: Tabla (Desktop) o Tarjetas (Mobile) */}
                    <Card>
                        <CardHeader>
                          <CardTitle>Inventario ({productosFiltrados.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {cargando ? (
                              <div className="text-center py-8">Cargando...</div>
                          ) : productosFiltrados.length === 0 ? (
                              <div className="text-center py-8 text-muted-foreground">No se encontraron productos.</div>
                          ) : ( 
                              <> 
                                  {/* Vista Tabla (No Móvil) */}
                                  {!isMobile && (
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Código</TableHead>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Categoría</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>P. Venta</TableHead>
                                            {esAdmin && <TableHead>P. Costo</TableHead>}
                                            <TableHead>Proveedor</TableHead>
                                            <TableHead>Stock Mín.</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {productosFiltrados.map((producto) => (
                                            <TableRow key={producto.id}>
                                              <TableCell className="font-mono text-xs">{producto.codigo_barras}</TableCell>
                                              <TableCell>{producto.nombre}</TableCell>
                                              <TableCell>{producto.categoria_nombre}</TableCell>
                                              <TableCell className="text-center">
                                                <Badge variant={producto.stock !== null && producto.stock_minimo !== null && producto.stock <= producto.stock_minimo ? "destructive" : "secondary"}>
                                                  {producto.stock ?? 0}
                                                </Badge>
                                              </TableCell>
                                              <TableCell className="text-right">{formatCurrency(producto.precio_venta)}</TableCell>
                                              {esAdmin && <TableCell className="text-right">{formatCurrency(producto.precio_costo)}</TableCell>}
                                              <TableCell>{producto.proveedor_nombre}</TableCell>
                                              <TableCell className="text-center">{producto.stock_minimo ?? 0}</TableCell>
                                              <TableCell className="text-right">
                                                {esAdmin && (
                                                  <Button variant="outline" size="sm" onClick={() => handleAbrirMovimiento(producto)} className="mr-1 h-8 px-2">+/-</Button>
                                                )}
                                                {esAdmin && (
                                                  <Button variant="ghost" size="icon" onClick={() => handleEditarProducto(producto)} className="h-8 w-8">
                                                    <Edit className="h-4 w-4" />
                                                  </Button>
                                                )}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                  )}
                                  
                                  {/* Vista Tarjetas (Móvil) */}
                                  {isMobile && (
                                      <div className="space-y-3">
                                          {productosFiltrados.map((producto) => (
                                              <Card key={producto.id} className="p-3">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div>
                                                          <h3 className="font-semibold text-sm">{producto.nombre}</h3>
                                                          <p className="text-xs text-muted-foreground">{producto.codigo_barras}</p>
                                                      </div>
                                                      <Badge variant={producto.stock !== null && producto.stock_minimo !== null && producto.stock <= producto.stock_minimo ? "destructive" : "secondary"} className="ml-2 shrink-0">
                                                          Stock: {producto.stock ?? 0}
                                                      </Badge>
                                                  </div>
                                                  <div className="text-xs space-y-1 text-muted-foreground mb-2">
                                                      <p>Cat: {producto.categoria_nombre}</p>
                                                      <p>P.Venta: <span className="font-medium text-foreground">{formatCurrency(producto.precio_venta)}</span></p>
                                                      {esAdmin && <p>P.Costo: <span className="font-medium text-foreground">{formatCurrency(producto.precio_costo)}</span></p>}
                                                      <p>Prov: {producto.proveedor_nombre}</p>
                                                      <p>Stock Mín: {producto.stock_minimo ?? 0}</p>
                                                  </div>
                                                  <div className="flex justify-end gap-2">
                                                      {esAdmin && (
                                                        <Button variant="outline" size="sm" onClick={() => handleAbrirMovimiento(producto)} className="h-8 px-2">+/- Stock</Button>
                                                      )}
                                                      {esAdmin && (
                                                          <Button variant="ghost" size="icon" onClick={() => handleEditarProducto(producto)} className="h-8 w-8">
                                                              <Edit className="h-4 w-4" />
                                                          </Button>
                                                      )}
                                                  </div>
                                              </Card>
                                          ))}
                                      </div>
                                  )}
                              </>
                          )}
                        </CardContent>
                    </Card>
                </TabsContent>
                
                {/* --- Pestaña Movimientos --- */}
                <TabsContent value="movimientos" className="mt-0 space-y-4">
                    <Card>
                       <CardHeader>
                            <CardTitle>Últimos Movimientos ({movimientos.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cargando ? (
                                <div className="text-center py-8">Cargando...</div>
                            ) : movimientos.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No hay movimientos registrados.</div>
                            ) : (
                                <> 
                                    {/* Vista Tabla (No Móvil) */}
                                    {!isMobile && (
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
                                                {movimientos.map((mov) => (
                                                <TableRow key={mov.id}>
                                                    <TableCell>{new Date(mov.fecha).toLocaleString('es-CL')}</TableCell>
                                                    <TableCell>{mov.producto?.nombre ?? 'N/A'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={mov.tipo_movimiento === 'entrada' ? 'default' : 'outline'}>
                                                            {mov.tipo_movimiento}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className={`text-center font-medium ${mov.tipo_movimiento === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {mov.tipo_movimiento === 'entrada' ? '+' : '-'}{mov.cantidad}
                                                    </TableCell>
                                                    <TableCell>{mov.motivo}</TableCell>
                                                    <TableCell>{mov.usuario?.nombre ?? 'N/A'}</TableCell>
                                                </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}

                                    {/* Vista Tarjetas (Móvil) */}
                                    {isMobile && (
                                        <div className="space-y-3">
                                            {movimientos.map((mov) => (
                                                <Card key={mov.id} className="p-3">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-semibold text-sm">{mov.producto?.nombre ?? 'N/A'}</h3>
                                                        <Badge variant={mov.tipo_movimiento === 'entrada' ? 'default' : 'outline'} className="ml-2 shrink-0">
                                                            {mov.tipo_movimiento}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-xs space-y-1 text-muted-foreground">
                                                        <p>{new Date(mov.fecha).toLocaleString('es-CL')}</p>
                                                        <p className={`font-medium ${mov.tipo_movimiento === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                                                            Cantidad: {mov.tipo_movimiento === 'entrada' ? '+' : '-'}{mov.cantidad}
                                                        </p>
                                                        <p>Motivo: {mov.motivo}</p>
                                                        <p>Usuario: {mov.usuario?.nombre ?? 'N/A'}</p>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </> 
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </main>
         </Tabs>
      </div>

      {/* --- DIÁLOGOS --- */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{productoEditando?.id ? "Editar" : "Nuevo"} Producto</DialogTitle>
            <DialogDescription>
              {productoEditando?.id ? "Modifica los detalles del producto." : "Ingresa los detalles del nuevo producto."}
            </DialogDescription>
          </DialogHeader>
          {productoEditando && (
            <div className="grid gap-4 py-4">
              {/* Código de barras */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="codigo_barras" className="text-right">Código de barras</Label>
                <div className="col-span-3 flex gap-2">
                  <Input 
                    id="codigo_barras" 
                    value={productoEditando.codigo_barras} 
                    onChange={(e) => setProductoEditando({...productoEditando, codigo_barras: e.target.value})} 
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setEscanerActivo(true)}
                    title="Escanear código de barras"
                  >
                    <Barcode className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Nombre */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">Nombre</Label>
                <Input 
                  id="nombre" 
                  value={productoEditando.nombre} 
                  onChange={(e) => setProductoEditando({...productoEditando, nombre: e.target.value})} 
                  className="col-span-3" 
                />
              </div>

              {/* Categoría */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="categoria" className="text-right">Categoría</Label>
                <Select
                  value={productoEditando.categoria_id || "none"}
                  onValueChange={(value) => setProductoEditando({ 
                    ...productoEditando, 
                    categoria_id: value === "none" ? null : value 
                  })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><em>Sin categoría</em></SelectItem>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
                    ))}
                    <div className="p-2 border-t mt-2">
                      <Input 
                        placeholder="Nueva categoría..."
                        value={nuevaCategoria}
                        onChange={(e) => setNuevaCategoria(e.target.value)}
                        className="mb-2"
                      />
                      <Button 
                        onClick={handleGuardarCategoria} 
                        disabled={creandoCategoria || !nuevaCategoria.trim()} 
                        size="sm" 
                        className="w-full"
                      >
                        {creandoCategoria ? "Creando..." : "Crear Categoría"}
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Precio de venta */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="precio_venta" className="text-right">Precio de venta</Label>
                <Input 
                  id="precio_venta" 
                  type="number" 
                  value={productoEditando.precio_venta ?? ""} 
                  onChange={(e) => setProductoEditando({...productoEditando, precio_venta: e.target.value ? Number(e.target.value) : null})} 
                  className="col-span-3" 
                />
              </div>

              {/* Precio de costo */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="precio_costo" className="text-right">Precio de costo</Label>
                <Input 
                  id="precio_costo" 
                  type="number" 
                  value={productoEditando.precio_costo ?? ""} 
                  onChange={(e) => setProductoEditando({...productoEditando, precio_costo: e.target.value ? Number(e.target.value) : null})} 
                  className="col-span-3" 
                />
              </div>

              {/* Proveedor */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="proveedor" className="text-right">Proveedor</Label>
                <Select
                  value={productoEditando.proveedor_id || "none"}
                  onValueChange={(value) => setProductoEditando({ 
                    ...productoEditando, 
                    proveedor_id: value === "none" ? null : value 
                  })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><em>Sin proveedor</em></SelectItem>
                    {proveedores.map((prov) => (
                      <SelectItem key={prov.id} value={prov.id}>{prov.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock mínimo */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock_minimo" className="text-right">Stock mínimo</Label>
                <Input 
                  id="stock_minimo" 
                  type="number" 
                  value={productoEditando.stock_minimo ?? ""} 
                  onChange={(e) => setProductoEditando({...productoEditando, stock_minimo: e.target.value ? Number(e.target.value) : null})} 
                  className="col-span-3" 
                />
              </div>

              {/* Stock inicial */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock_inicial" className="text-right">Stock inicial</Label>
                <Input 
                  id="stock_inicial" 
                  type="number" 
                  value={productoEditando.stock ?? ""} 
                  onChange={(e) => setProductoEditando({...productoEditando, stock: e.target.value ? Number(e.target.value) : null})} 
                  className="col-span-3" 
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>Cancelar</Button>
            <Button onClick={handleGuardarProducto}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogoMovimientoAbierto} onOpenChange={setDialogoMovimientoAbierto}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Movimiento</DialogTitle>
            <DialogDescription>
              Ajustar stock para: {productoMovimiento?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="tipoMovimiento" className="text-right">Tipo</Label>
               <Select value={tipoMovimiento} onValueChange={setTipoMovimiento} >
                  <SelectTrigger className="col-span-3">
                      <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                  </SelectContent>
               </Select>
             </div>
            <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="cantidadMovimiento" className="text-right">Cantidad</Label>
               <Input 
                 id="cantidadMovimiento" 
                 type="number" 
                 placeholder="Ingresa cantidad"
                 value={cantidadMovimiento === 0 ? '' : cantidadMovimiento}
                 onChange={(e) => setCantidadMovimiento(Number(e.target.value) || 0)}
                 className="col-span-3" 
               />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="motivoMovimiento" className="text-right">Motivo</Label>
               <Input id="motivoMovimiento" value={motivoMovimiento} onChange={(e) => setMotivoMovimiento(e.target.value)} className="col-span-3" />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoMovimientoAbierto(false)}>Cancelar</Button>
            <Button onClick={handleGuardarMovimiento} disabled={cargando || cantidadMovimiento <= 0}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
