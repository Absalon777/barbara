"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Plus, Edit, Trash2, AlertTriangle } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { useToast } from "@/hooks/use-toast"

interface Categoria {
  id: string
  nombre: string
  cantidad_productos: number
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<Categoria | null>(null)
  const [nuevoNombre, setNuevoNombre] = useState("")
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    cargarCategorias()
  }, [])

  const cargarCategorias = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select(`
          *,
          productos:productos(count)
        `)
        .order("nombre")

      if (error) throw error

      const categoriasFormateadas = data.map(cat => ({
        id: cat.id,
        nombre: cat.nombre,
        cantidad_productos: cat.productos[0].count
      }))

      setCategorias(categoriasFormateadas)
      setError(null)
    } catch (err: any) {
      console.error("Error al cargar categorías:", err)
      setError("Error al cargar las categorías")
    } finally {
      setCargando(false)
    }
  }

  const handleNuevaCategoria = () => {
    setCategoriaEditando(null)
    setNuevoNombre("")
    setDialogoAbierto(true)
  }

  const handleEditarCategoria = (categoria: Categoria) => {
    setCategoriaEditando(categoria)
    setNuevoNombre(categoria.nombre)
    setDialogoAbierto(true)
  }

  const handleGuardarCategoria = async () => {
    try {
      // Validar nombre único
      const { data: categoriaExistente, error: errorBusqueda } = await supabase
        .from("categorias")
        .select("id")
        .eq("nombre", nuevoNombre)
        .neq("id", categoriaEditando?.id || "")
        .single()

      if (categoriaExistente) {
        toast({
          title: "Error",
          description: "Ya existe una categoría con ese nombre",
          variant: "destructive",
        })
        return
      }

      if (categoriaEditando) {
        // Actualizar categoría existente
        const { error } = await supabase
          .from("categorias")
          .update({ nombre: nuevoNombre })
          .eq("id", categoriaEditando.id)

        if (error) throw error

        toast({
          title: "Categoría actualizada",
          description: "La categoría se ha actualizado correctamente",
        })
      } else {
        // Crear nueva categoría
        const { error } = await supabase
          .from("categorias")
          .insert({ nombre: nuevoNombre })

        if (error) throw error

        toast({
          title: "Categoría creada",
          description: "La categoría se ha creado correctamente",
        })
      }

      setDialogoAbierto(false)
      cargarCategorias()
    } catch (err: any) {
      console.error("Error al guardar categoría:", err)
      toast({
        title: "Error",
        description: "Error al guardar la categoría",
        variant: "destructive",
      })
    }
  }

  const handleEliminarCategoria = async (categoria: Categoria) => {
    if (categoria.cantidad_productos > 0) {
      setCategoriaEditando(categoria)
      setDialogoEliminarAbierto(true)
      return
    }

    try {
      const { error } = await supabase
        .from("categorias")
        .delete()
        .eq("id", categoria.id)

      if (error) throw error

      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente",
      })

      cargarCategorias()
    } catch (err: any) {
      console.error("Error al eliminar categoría:", err)
      toast({
        title: "Error",
        description: "Error al eliminar la categoría",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Categorías</h1>
        <Button onClick={handleNuevaCategoria}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Categoría
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Productos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">Cargando categorías...</p>
                </TableCell>
              </TableRow>
            ) : categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  No hay categorías registradas
                </TableCell>
              </TableRow>
            ) : (
              categorias.map((categoria) => (
                <TableRow key={categoria.id}>
                  <TableCell className="font-medium">{categoria.nombre}</TableCell>
                  <TableCell className="text-right">{categoria.cantidad_productos}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditarCategoria(categoria)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEliminarCategoria(categoria)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Diálogo para crear/editar categoría */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {categoriaEditando ? "Editar Categoría" : "Nueva Categoría"}
            </DialogTitle>
            <DialogDescription>
              {categoriaEditando
                ? "Modifica el nombre de la categoría"
                : "Ingresa el nombre de la nueva categoría"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Nombre de la categoría"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarCategoria}>
              {categoriaEditando ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar categoría con productos */}
      <Dialog open={dialogoEliminarAbierto} onOpenChange={setDialogoEliminarAbierto}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>No se puede eliminar la categoría</DialogTitle>
            <DialogDescription>
              La categoría "{categoriaEditando?.nombre}" tiene {categoriaEditando?.cantidad_productos} productos asociados.
              No se puede eliminar mientras tenga productos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">
              Primero debes mover o eliminar los productos asociados a esta categoría.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoEliminarAbierto(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 