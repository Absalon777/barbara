"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { validarRut, formatearRut } from "@/lib/utils"
import * as bcrypt from "bcryptjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const [rut, setRut] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\./g, "").replace(/-/g, "")
    if (value.length <= 9 && /^[0-9kK]*$/.test(value)) {
      setRut(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Formatear RUT para validación
      const rutFormateado = rut.replace(/\./g, "").replace(/-/g, "")
      const rutCuerpo = rutFormateado.slice(0, -1)
      const dv = rutFormateado.slice(-1)
      const rutConFormato = `${rutCuerpo}-${dv}`

      if (!validarRut(rutConFormato)) {
        setError("El RUT ingresado no es válido")
        setLoading(false)
        return
      }

      // Buscar usuario por RUT
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("rut", rutConFormato)
        .single()

      if (userError || !userData) {
        console.error("Error al obtener usuario:", userError)
        setError("Usuario no encontrado")
        setLoading(false)
        return
      }

      if (!userData.activo) {
        setError("Tu cuenta está desactivada. Contacta al administrador.")
        setLoading(false)
        return
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, userData.password_hash)
      if (!isValidPassword) {
        setError("Contraseña incorrecta")
        setLoading(false)
        return
      }

      // Almacenar información del usuario en localStorage
      localStorage.setItem(
        "usuarioActual",
        JSON.stringify({
          id: userData.id,
          rut: userData.rut,
          nombre: userData.nombre,
          rol: userData.rol,
          activo: userData.activo,
        })
      )

      // Registrar el inicio de sesión en logs_actividad
      await supabase.from("logs_actividad").insert({
        usuario_id: userData.id,
        accion: "login",
        tabla: "usuarios",
        registro_id: userData.id,
        detalles: "Inicio de sesión exitoso",
        ip_address: "127.0.0.1",
      })

      // Redirigir según el rol
      if (userData.rol === "administrador") {
        router.push("/dashboard")
      } else {
        router.push("/dashboard/ventas")
      }
    } catch (err) {
      console.error("Error en el inicio de sesión:", err)
      setError("Ocurrió un error durante el inicio de sesión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
          </div>
          <CardTitle className="heading-responsive text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-responsive text-center">
            Ingresa tu RUT y contraseña para acceder al sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rut" className="text-responsive">RUT</Label>
              <Input
                id="rut"
                placeholder="Ingresa tu RUT"
                value={rut.length > 1 ? formatearRut(rut) : rut}
                onChange={handleRutChange}
                required
                className="text-responsive"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-responsive">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="text-responsive"
              />
            </div>
            {error && (
              <Alert variant="destructive" className="text-responsive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full text-responsive" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-sm sm:text-base text-muted-foreground text-center">
            Sistema de Gestión de Ventas e Inventario
          </p>
          <div className="text-xs sm:text-sm text-muted-foreground text-center">
            <p>Credenciales de prueba:</p>
            <p>Admin: 21.003.588-5 / Admin123</p>
            <p>Vendedor: 22.222.222-2 / Vendedor123456</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
