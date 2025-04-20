"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Edit, Plus, Trash2, Search } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"

interface Proveedor {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  direccion: string | null
  created_at: string
  updated_at: string
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proveedoresFiltrados, setProveedoresFiltrados] = useState<Proveedor[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [proveedorEditando, setProveedorEditando] = useState<Proveedor | null>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)

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

  // Efecto para filtrar proveedores
  useEffect(() => {
    let items = [...proveedores]
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase()
      items = items.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(busquedaLower) ||
          p.telefono?.toLowerCase().includes(busquedaLower) ||
          p.email?.toLowerCase().includes(busquedaLower) ||
          p.direccion?.toLowerCase().includes(busquedaLower)
      )
    }
    setProveedoresFiltrados(items)
  }, [busqueda, proveedores])

  const cargarDatos = async () => {
    setCargando(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("proveedores")
        .select("*")
        .order("nombre")

      if (error) throw error

      setProveedores(data || [])
    } catch (err: any) {
      console.error("Error al cargar proveedores:", err)
      setError(`Error al cargar proveedores: ${err.message}`)
      toast({ title: "Error", description: "No se pudieron cargar los proveedores.", variant: "destructive" })
    } finally {
      setCargando(false)
    }
  }

  const handleNuevoProveedor = () => {
    if (!esAdmin) return toast({ title: "Acceso denegado", variant: "destructive" });
    setProveedorEditando({
      id: "",
      nombre: "",
      telefono: null,
      email: null,
      direccion: null,
      created_at: "",
      updated_at: ""
    })
    setDialogoAbierto(true)
  }

  const handleEditarProveedor = (proveedor: Proveedor) => {
    if (!esAdmin) return toast({ title: "Acceso denegado", variant: "destructive" });
    setProveedorEditando(proveedor)
    setDialogoAbierto(true)
  }

  const handleGuardarProveedor = async () => {
    if (!proveedorEditando) return

    try {
      if (!proveedorEditando.nombre.trim()) {
        toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" })
        return
      }

      let error = null
      if (proveedorEditando.id) {
        const { error: updateError } = await supabase
          .from("proveedores")
          .update({
            nombre: proveedorEditando.nombre,
            telefono: proveedorEditando.telefono,
            email: proveedorEditando.email,
            direccion: proveedorEditando.direccion,
            updated_at: new Date()
          })
          .eq("id", proveedorEditando.id)
        error = updateError
      } else {
        const { error: insertError } = await supabase
          .from("proveedores")
          .insert([{
            nombre: proveedorEditando.nombre,
            telefono: proveedorEditando.telefono,
            email: proveedorEditando.email,
            direccion: proveedorEditando.direccion
          }])
        error = insertError
      }

      if (error) throw error

      toast({ title: "Éxito", description: "Proveedor guardado correctamente" })
      setDialogoAbierto(false)
      cargarDatos()
    } catch (err: any) {
      console.error("Error guardando proveedor:", err)
      toast({ title: "Error", description: `No se pudo guardar el proveedor: ${err.message}`, variant: "destructive" })
    }
  }

  const handleEliminarProveedor = async (id: string) => {
    if (!esAdmin) return toast({ title: "Acceso denegado", variant: "destructive" });

    if (!confirm("¿Estás seguro de eliminar este proveedor?")) return

    try {
      const { error } = await supabase
        .from("proveedores")
        .delete()
        .eq("id", id)

      if (error) throw error

      toast({ title: "Éxito", description: "Proveedor eliminado correctamente" })
      cargarDatos()
    } catch (err: any) {
      console.error("Error eliminando proveedor:", err)
      toast({ title: "Error", description: `No se pudo eliminar el proveedor: ${err.message}`, variant: "destructive" })
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Barra de búsqueda y botones */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar proveedor..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="max-w-sm flex-grow"
        />
        {esAdmin && (
          <Button onClick={handleNuevoProveedor}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
          </Button>
        )}
      </div>

      {error && (
        <div className="text-destructive text-sm">{error}</div>
      )}

      {/* Tabla de proveedores */}
      <Card>
        <CardHeader>
          <CardTitle>Proveedores ({proveedoresFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cargando ? (
            <div className="text-center py-8">Cargando...</div>
          ) : proveedoresFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No se encontraron proveedores.</div>
          ) : (
            <>
              {/* Vista Tabla (No Móvil) */}
              {!isMobile && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Dirección</TableHead>
                      {esAdmin && <TableHead className="text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {proveedoresFiltrados.map((proveedor) => (
                      <TableRow key={proveedor.id}>
                        <TableCell>{proveedor.nombre}</TableCell>
                        <TableCell>{proveedor.telefono || "-"}</TableCell>
                        <TableCell>{proveedor.email || "-"}</TableCell>
                        <TableCell>{proveedor.direccion || "-"}</TableCell>
                        {esAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditarProveedor(proveedor)}
                              className="mr-2"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarProveedor(proveedor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Vista Tarjetas (Móvil) */}
              {isMobile && (
                <div className="space-y-3">
                  {proveedoresFiltrados.map((proveedor) => (
                    <Card key={proveedor.id} className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm">{proveedor.nombre}</h3>
                        {esAdmin && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditarProveedor(proveedor)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEliminarProveedor(proveedor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p>Tel: {proveedor.telefono || "-"}</p>
                        <p>Email: {proveedor.email || "-"}</p>
                        <p>Dir: {proveedor.direccion || "-"}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de edición/creación */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{proveedorEditando?.id ? "Editar" : "Nuevo"} Proveedor</DialogTitle>
            <DialogDescription>
              {proveedorEditando?.id ? "Modifica los detalles del proveedor." : "Ingresa los detalles del nuevo proveedor."}
            </DialogDescription>
          </DialogHeader>
          {proveedorEditando && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nombre" className="text-right">Nombre</Label>
                <Input
                  id="nombre"
                  value={proveedorEditando.nombre}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, nombre: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="telefono" className="text-right">Teléfono</Label>
                <Input
                  id="telefono"
                  value={proveedorEditando.telefono || ""}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, telefono: e.target.value || null})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={proveedorEditando.email || ""}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, email: e.target.value || null})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="direccion" className="text-right">Dirección</Label>
                <Input
                  id="direccion"
                  value={proveedorEditando.direccion || ""}
                  onChange={(e) => setProveedorEditando({...proveedorEditando, direccion: e.target.value || null})}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>Cancelar</Button>
            <Button onClick={handleGuardarProveedor}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 