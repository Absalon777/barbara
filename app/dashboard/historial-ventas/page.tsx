"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function HistorialVentasPage() {
  const [ventas, setVentas] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [ventaSeleccionada, setVentaSeleccionada] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Cargar ventas desde la base de datos
    cargarVentas()
  }, [])

  const cargarVentas = async () => {
    try {
      const { data: ventas, error } = await supabase
        .from("ventas")
        .select(`
          id,
          numero_venta,
          fecha,
          subtotal,
          impuestos,
          descuento,
          total,
          metodo_pago,
          estado,
          usuarios ( id, nombre, email, rol )
        `)
        .order('fecha', { ascending: false })

      if (error) throw error

      setVentas(ventas || [])
    } catch (error) {
      console.error("Error al cargar ventas:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las ventas. Por favor, intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleBuscar = () => {
    // Lógica para buscar ventas
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  const handleVerDetalles = async (venta: any) => {
    try {
      const { data: detallesVenta, error } = await supabase
        .from("detalle_ventas")
        .select(`
          id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal,
          productos (
            nombre,
            codigo_barras
          )
        `)
        .eq('venta_id', venta.id)

      if (error) throw error

      setVentaSeleccionada({ ...venta, detalles: detallesVenta })
    } catch (error) {
      console.error("Error al cargar detalles de la venta:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles de la venta. Por favor, intenta nuevamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Buscar por número de venta, fecha o vendedor"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBuscar}>Buscar</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ventas.map((venta) => (
                  <TableRow key={venta.id}>
                    <TableCell>{venta.numero_venta}</TableCell>
                    <TableCell>{new Date(venta.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{venta.usuarios.nombre}</TableCell>
                    <TableCell>{formatCurrency(venta.total)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleVerDetalles(venta)}>Ver Detalles</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {ventaSeleccionada && (
        <Dialog open={!!ventaSeleccionada} onOpenChange={() => setVentaSeleccionada(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalles de la Venta</DialogTitle>
            </DialogHeader>
            <div>
              <p>Número de Venta: {ventaSeleccionada.numero_venta}</p>
              <p>Fecha: {new Date(ventaSeleccionada.fecha).toLocaleDateString()}</p>
              <p>Vendedor: {ventaSeleccionada.usuarios.nombre}</p>
              <p>Total: {formatCurrency(ventaSeleccionada.total)}</p>
              <h3 className="mt-4 font-bold">Productos Vendidos:</h3>
              <ul>
                {ventaSeleccionada.detalles.map((detalle: any) => (
                  <li key={detalle.id} className="mt-2">
                    <p>Producto: {detalle.productos.nombre}</p>
                    <p>Código de Barras: {detalle.productos.codigo_barras}</p>
                    <p>Cantidad: {detalle.cantidad}</p>
                    <p>Precio Unitario: {formatCurrency(detalle.precio_unitario)}</p>
                    <p>Subtotal: {formatCurrency(detalle.subtotal)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 