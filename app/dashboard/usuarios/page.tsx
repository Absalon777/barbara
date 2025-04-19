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

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [esAdmin, setEsAdmin] = useState(false)

  const supabase = getSupabaseBrowserClient()
  const { toast } = useToast()

  useEffect(() => {
    const verificarRol = () => {
      const usuarioActualStr = localStorage.getItem("usuarioActual")
      if (usuarioActualStr) {
        const usuarioActual = JSON.parse(usuarioActualStr)
        setEsAdmin(usuarioActual.rol === "administrador")

        if (usuarioActual.rol !== "administrador") {
          // Redirigir si no es administrador
          window.location.href = "/dashboard"
        }
      } else {
        // Redirigir si no hay usuario
        window.location.href = "/login"
      }
    }

    verificarRol()
    cargarUsuarios()
  }, [])

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

  const handleNuevoUsuario = () => {
    setUsuarioEditando({
      id: "",
      rut: "",
      nombre: "",
      email: "",
      password: "",
      rol: "vendedor",
      activo: true,
    })
    setDialogoAbierto(true)
  }

  const handleEditarUsuario = (usuario: any) => {
    setUsuarioEditando({
      ...usuario,
      password: "", // No mostrar la contraseña actual
    })
    setDialogoAbierto(true)
  }

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\./g, "").replace(/-/g, "")
    if (value.length <= 9 && /^[0-9kK]*$/.test(value)) {
      setUsuarioEditando({ ...usuarioEditando, rut: value })
    }
  }

  const handleGuardarUsuario = async () => {
    try {
      // Validar RUT
      const rutFormateado = usuarioEditando.rut.replace(/\./g, "").replace(/-/g, "")
      const rutCuerpo = rutFormateado.slice(0, -1)
      const dv = rutFormateado.slice(-1)
      const rutConFormato = `${rutCuerpo}-${dv}`

      if (!validarRut(rutConFormato)) {
        toast({
          title: "RUT inválido",
          description: "El RUT ingresado no es válido",
          variant: "destructive",
        })
        return
      }

      // Validar campos obligatorios
      if (!usuarioEditando.nombre || !usuarioEditando.email) {
        toast({
          title: "Campos incompletos",
          description: "Todos los campos son obligatorios",
          variant: "destructive",
        })
        return
      }

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

      if (usuarioEditando.id) {
        // Actualizar usuario existente
        const datosActualizados: any = {
          rut: rutConFormato,
          nombre: usuarioEditando.nombre,
          email: usuarioEditando.email,
          rol: usuarioEditando.rol,
          activo: usuarioEditando.activo,
          updated_at: new Date(),
        }

        // Solo actualizar la contraseña si se proporciona una nueva
        if (usuarioEditando.password) {
          datosActualizados.password_hash = "$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGq4V41JGqMgvQ7U.yKJSq" // Contraseña simulada
        }

        const { error } = await supabase.from("usuarios").update(datosActualizados).eq("id", usuarioEditando.id)

        if (error) throw error

        // Registrar la acción en logs
        await supabase.from("logs_actividad").insert({
          usuario_id: usuarioActual.id,
          accion: "editar",
          tabla: "usuarios",
          registro_id: usuarioEditando.id,
          detalles: `Actualización de usuario: ${usuarioEditando.nombre}`,
          ip_address: "127.0.0.1",
        })

        toast({
          title: "Usuario actualizado",
          description: "El usuario se ha actualizado correctamente",
        })
      } else {
        // Crear nuevo usuario
        if (!usuarioEditando.password) {
          toast({
            title: "Contraseña requerida",
            description: "Debe proporcionar una contraseña para el nuevo usuario",
            variant: "destructive",
          })
          return
        }

        const { data, error } = await supabase
          .from("usuarios")
          .insert({
            rut: rutConFormato,
            nombre: usuarioEditando.nombre,
            email: usuarioEditando.email,
            password_hash: "$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGq4V41JGqMgvQ7U.yKJSq", // Contraseña simulada
            rol: usuarioEditando.rol,
            activo: usuarioEditando.activo,
          })
          .select()

        if (error) throw error

        if (data && data.length > 0) {
          // Registrar la acción en logs
          await supabase.from("logs_actividad").insert({
            usuario_id: usuarioActual.id,
            accion: "crear",
            tabla: "usuarios",
            registro_id: data[0].id,
            detalles: `Creación de usuario: ${usuarioEditando.nombre}`,
            ip_address: "127.0.0.1",
          })
        }

        toast({
          title: "Usuario creado",
          description: "El usuario se ha creado correctamente",
        })
      }

      setDialogoAbierto(false)
      cargarUsuarios()
    } catch (err: any) {
      console.error("Error al guardar usuario:", err)
      toast({
        title: "Error",
        description: err.message || "Error al guardar el usuario",
        variant: "destructive",
      })
    }
  }

  if (!esAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta sección.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <Button onClick={handleNuevoUsuario}>
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
                          <Button variant="ghost" size="icon" onClick={() => handleEditarUsuario(usuario)}>
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
                value={usuarioEditando?.rut.length > 1 ? formatearRut(usuarioEditando.rut) : usuarioEditando?.rut || ""}
                onChange={handleRutChange}
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
                type="password"
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
            <Button onClick={handleGuardarUsuario}>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
