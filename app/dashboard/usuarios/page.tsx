"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Edit, Plus, Search, Save } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { useToast } from "@/hooks/use-toast"
import { validarRut, formatearRut } from "@/lib/utils"
import { useRouter } from "next/navigation"
import * as bcrypt from "bcryptjs"

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [usuarioEditando, setUsuarioEditando] = useState<any>({
    id: null,
    rut: "",
    nombre: "",
    email: "",
    rol: "vendedor",
    activo: true,
    password: "",
  })
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    cargarUsuarios()
  }, [router])

  const cargarUsuarios = async () => {
    setCargando(true)
    try {
      const { data, error: errorUsuarios } = await supabase.from("usuarios").select("*").order("nombre")

      if (errorUsuarios) throw errorUsuarios

      setUsuarios(data || [])
      setError(null)
    } catch (err: any) {
      console.error("Error al cargar usuarios:", err)
      setError("Error al cargar los usuarios. Por favor, intenta de nuevo.")
    } finally {
      setCargando(false)
    }
  }

  const handleBuscar = () => {
    if (!busqueda) {
      cargarUsuarios()
      return
    }

    const resultados = usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.rut.toLowerCase().includes(busqueda.toLowerCase()) ||
        u.email.toLowerCase().includes(busqueda.toLowerCase()),
    )

    setUsuarios(resultados)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    try {
      // Validar campos requeridos
      if (!usuarioEditando.nombre || !usuarioEditando.email || !usuarioEditando.rol) {
        setError("Todos los campos son requeridos")
        setCargando(false)
        return
      }

      // Si es un nuevo usuario, validar contraseña
      if (!usuarioEditando.id && !usuarioEditando.password) {
        setError("La contraseña es requerida para nuevos usuarios")
        setCargando(false)
        return
      }

      // Crear o actualizar usuario
      if (!usuarioEditando.id) {
        // Crear nuevo usuario
        const { data: newUser, error: createError } = await supabase
          .from("usuarios")
          .insert({
            rut: usuarioEditando.rut,
            nombre: usuarioEditando.nombre,
            email: usuarioEditando.email,
            rol: usuarioEditando.rol,
            activo: true,
            password: usuarioEditando.password, // Temporalmente guardamos la contraseña sin hash
          })
          .select()
          .single()

        if (createError) {
          console.error("Error al crear usuario:", createError)
          setError("Error al crear el usuario. Por favor, intenta nuevamente.")
          setCargando(false)
          return
        }

        toast({
          title: "Usuario creado",
          description: "El usuario se ha creado correctamente.",
        })
      } else {
        // Actualizar usuario existente
        const updateData: any = {
          nombre: usuarioEditando.nombre,
          email: usuarioEditando.email,
          rol: usuarioEditando.rol,
          activo: usuarioEditando.activo,
        }

        // Solo actualizar la contraseña si se proporciona una nueva
        if (usuarioEditando.password) {
          const salt = bcrypt.genSaltSync(10)
          const hash = bcrypt.hashSync(usuarioEditando.password, salt)
          updateData.password_hash = hash
        }

        const { error: updateError } = await supabase
          .from("usuarios")
          .update(updateData)
          .eq("id", usuarioEditando.id)

        if (updateError) {
          console.error("Error al actualizar usuario:", updateError)
          setError(`Error al actualizar el usuario: ${updateError.message}. Por favor, intenta nuevamente.`)
          setCargando(false)
          return
        }

        toast({
          title: "Usuario actualizado",
          description: "El usuario se ha actualizado correctamente.",
        })
      }

      // Limpiar formulario y recargar usuarios
      setUsuarioEditando({
        id: null,
        rut: "",
        nombre: "",
        email: "",
        rol: "vendedor",
        activo: true,
        password: "",
      })
      setDialogoAbierto(false)
      cargarUsuarios()
    } catch (err) {
      console.error("Error en el manejo del usuario:", err)
      setError("Ocurrió un error. Por favor, intenta nuevamente.")
    } finally {
      setCargando(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <Button onClick={() => setDialogoAbierto(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Buscar por nombre, RUT o email"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBuscar}>
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </div>

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
                    <TableHead>RUT</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
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
                        <p className="mt-2 text-sm text-muted-foreground">Cargando usuarios...</p>
                      </TableCell>
                    </TableRow>
                  ) : usuarios.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No se encontraron usuarios
                      </TableCell>
                    </TableRow>
                  ) : (
                    usuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell>{usuario.rut}</TableCell>
                        <TableCell>
                          <div className="font-medium">{usuario.nombre}</div>
                        </TableCell>
                        <TableCell>{usuario.email}</TableCell>
                        <TableCell>
                          <Badge variant={usuario.rol === "administrador" ? "default" : "outline"}>
                            {usuario.rol === "administrador" ? "Administrador" : "Vendedor"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={usuario.activo ? "success" : "destructive"}>
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setUsuarioEditando({
                              ...usuario,
                              password: "", // No mostrar la contraseña actual
                            })
                            setDialogoAbierto(true)
                          }}>
                            <Edit className="h-4 w-4" />
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

      {/* Diálogo para editar/crear usuario */}
      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{usuarioEditando?.id ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>Complete los datos del usuario y guarde los cambios.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                value={usuarioEditando?.rut || ""}
                onChange={(e) => setUsuarioEditando({ ...usuarioEditando, rut: e.target.value })}
                disabled={!!usuarioEditando?.id} // Deshabilitar edición de RUT para usuarios existentes
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre Completo</Label>
              <Input
                id="nombre"
                value={usuarioEditando?.nombre || ""}
                onChange={(e) => setUsuarioEditando({ ...usuarioEditando, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={usuarioEditando?.email || ""}
                onChange={(e) => setUsuarioEditando({ ...usuarioEditando, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {usuarioEditando?.id ? "Nueva Contraseña (dejar en blanco para mantener)" : "Contraseña"}
              </Label>
              <Input
                id="password"
                type="text" // Temporalmente mostramos la contraseña
                value={usuarioEditando?.password || ""}
                onChange={(e) => setUsuarioEditando({ ...usuarioEditando, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={usuarioEditando?.rol || "vendedor"}
                onValueChange={(value) => setUsuarioEditando({ ...usuarioEditando, rol: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {usuarioEditando?.id && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={usuarioEditando?.activo || false}
                  onCheckedChange={(checked) => setUsuarioEditando({ ...usuarioEditando, activo: checked })}
                />
                <Label htmlFor="activo">Usuario Activo</Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
