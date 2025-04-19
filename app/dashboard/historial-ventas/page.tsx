"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useMobile } from "@/hooks/use-mobile"
import { Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UsuarioSimple {
  nombre?: string | null;
}

interface Venta {
  id: string;
  numero_venta: number | null;
  fecha: string;
  total: number;
  usuarios: UsuarioSimple | null;
}

interface ProductoSimple {
  nombre?: string | null;
  codigo_barras?: string | null;
}

interface DetalleVenta {
  id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  productos: ProductoSimple | null;
}

interface VentaSeleccionada extends Venta {
  detalles: DetalleVenta[];
}

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [ventasFiltradas, setVentasFiltradas] = useState<Venta[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [ventaSeleccionada, setVentaSeleccionada] = useState<VentaSeleccionada | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const isMobile = useMobile()
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    cargarVentas()
  }, [])

  useEffect(() => {
    let items = [...ventas]
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase()
      items = items.filter(venta => 
        (venta.numero_venta?.toString().includes(busquedaLower)) ||
        (venta.usuarios?.nombre?.toLowerCase().includes(busquedaLower)) ||
        (new Date(venta.fecha).toLocaleDateString('es-CL').includes(busquedaLower))
      )
    }
    setVentasFiltradas(items)
  }, [busqueda, ventas])

  const cargarVentas = async () => {
    setCargando(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("ventas")
        .select(`id, numero_venta, fecha, total, usuarios ( nombre )`)
        .order('fecha', { ascending: false })

      if (error) throw error

      setVentas((data as Venta[]) || [])
    } catch (err: any) {
      console.error("Error al cargar ventas:", err)
      setError(`Error al cargar ventas: ${err.message || 'Error desconocido'}`)
      toast({ title: "Error", description: "No se pudieron cargar las ventas.", variant: "destructive" })
    } finally {
      setCargando(false)
    }
  }

  const formatCurrency = (value: number | undefined): string => {
    if (value === undefined || isNaN(value)) return "$0";
    return "$" + value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  const handleVerDetalles = async (ventaId: string) => {
    const ventaCompleta = ventas.find(v => v.id === ventaId)
    if (!ventaCompleta) return;

    try {
      const { data: detallesVenta, error } = await supabase
        .from("detalle_ventas")
        .select(`id, cantidad, precio_unitario, subtotal, productos ( nombre, codigo_barras )`)
        .eq('venta_id', ventaId)

      if (error) throw error

      setVentaSeleccionada({ ...ventaCompleta, detalles: (detallesVenta as DetalleVenta[]) || [] })
    } catch (err: any) {
      console.error("Error al cargar detalles de la venta:", err)
      toast({ title: "Error", description: "No se pudieron cargar los detalles.", variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
          <CardDescription>Consulta las ventas realizadas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Buscar por nº, fecha o vendedor..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1"
            />
          </div>
          {error && (
              <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}
          
          <div className="overflow-x-auto"> 
            {cargando ? (
                <div className="text-center py-8">Cargando historial...</div>
            ) : ventasFiltradas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No se encontraron ventas.</div>
            ) : (
                <>
                  {!isMobile && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nº Venta</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ventasFiltradas.map((venta) => (
                            <TableRow key={venta.id}>
                              <TableCell>{venta.numero_venta ?? 'N/A'}</TableCell>
                              <TableCell>{new Date(venta.fecha).toLocaleDateString('es-CL')}</TableCell>
                              <TableCell>{venta.usuarios?.nombre ?? 'N/A'}</TableCell>
                              <TableCell className="text-right">{formatCurrency(venta.total)}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleVerDetalles(venta.id)}>
                                  <Eye className="mr-1 h-4 w-4" /> Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                  )}

                  {isMobile && (
                      <div className="space-y-3">
                          {ventasFiltradas.map((venta) => (
                              <Card key={venta.id} className="p-3">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <p className="text-xs text-muted-foreground">Nº: {venta.numero_venta ?? 'N/A'}</p>
                                          <p className="text-sm font-semibold">{formatCurrency(venta.total)}</p>
                                      </div>
                                      <Button variant="outline" size="sm" onClick={() => handleVerDetalles(venta.id)} className="h-8 px-2">
                                          <Eye className="mr-1 h-4 w-4" /> Ver
                                      </Button>
                                  </div>
                                  <div className="text-xs space-y-1 text-muted-foreground">
                                      <p>Fecha: {new Date(venta.fecha).toLocaleDateString('es-CL')}</p>
                                      <p>Vendedor: {venta.usuarios?.nombre ?? 'N/A'}</p>
                                  </div>
                              </Card>
                          ))}
                      </div>
                  )}
                </>
            )}
          </div> 
        </CardContent>
      </Card>

      <Dialog open={!!ventaSeleccionada} onOpenChange={() => setVentaSeleccionada(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalles Venta Nº {ventaSeleccionada?.numero_venta ?? 'N/A'}</DialogTitle>
          </DialogHeader>
          {ventaSeleccionada && (
              <div>
                <p className="text-sm mb-1">Fecha: {new Date(ventaSeleccionada.fecha).toLocaleString('es-CL')}</p>
                <p className="text-sm mb-1">Vendedor: {ventaSeleccionada.usuarios?.nombre ?? 'N/A'}</p>
                <p className="text-sm mb-3 font-semibold">Total Venta: {formatCurrency(ventaSeleccionada.total)}</p>
                
                <h3 className="mt-4 mb-2 text-md font-semibold border-t pt-3">Productos Vendidos:</h3>
                <ul className="space-y-2">
                  {ventaSeleccionada.detalles.map((detalle) => (
                    <li key={detalle.id} className="text-xs border-b pb-2 last:border-b-0">
                      <p className="font-medium">{detalle.productos?.nombre ?? 'Producto no encontrado'}</p>
                      <p className="text-muted-foreground">Código: {detalle.productos?.codigo_barras ?? 'N/A'}</p>
                      <div className="flex justify-between mt-1">
                         <span>Cant: {detalle.cantidad} x {formatCurrency(detalle.precio_unitario)}</span>
                         <span className="font-semibold">Subtotal: {formatCurrency(detalle.subtotal)}</span>
                      </div>
                    </li>
                  ))}
                   {ventaSeleccionada.detalles.length === 0 && (
                      <li className="text-xs text-muted-foreground">No hay detalles de productos para esta venta.</li>
                   )}
                </ul>
              </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 