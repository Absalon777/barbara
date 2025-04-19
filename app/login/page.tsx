"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { validarRut, formatearRut } from "@/lib/utils"
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

      console.log("Intentando autenticar con:", rutConFormato, password)

      // Para fines de demostración, permitimos iniciar sesión con credenciales fijas
      // En un sistema real, esto se haría con Supabase Auth
      if (
        (rutConFormato === "21003588-5" && password === "Admin123") ||
        (rutConFormato === "22222222-2" && password === "Vendedor123456")
      ) {
        console.log("Autenticación exitosa con credenciales fijas")

        // Obtener información del usuario
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("id, rol, activo, nombre")
          .eq("rut", rutConFormato)
          .single()

        if (userError || !userData) {
          console.error("Error al obtener datos del usuario:", userError)
          setError("Usuario no encontrado o inactivo")
          setLoading(false)
          return
        }

        if (!userData.activo) {
          setError("Tu cuenta está desactivada. Contacta al administrador.")
          setLoading(false)
          return
        }

        // Almacenar información del usuario en localStorage para simular una sesión
        localStorage.setItem(
          "usuarioActual",
          JSON.stringify({
            id: userData.id,
            rut: rutConFormato,
            nombre: userData.nombre,
            rol: userData.rol,
            activo: userData.activo,
          }),
        )

        // Registrar el inicio de sesión en logs_actividad
        await supabase.from("logs_actividad").insert({
          usuario_id: userData.id,
          accion: "login",
          tabla: "usuarios",
          registro_id: userData.id,
          detalles: "Inicio de sesión exitoso",
          ip_address: "127.0.0.1", // En un sistema real, se obtendría la IP real
        })

        // Redirigir según el rol
        if (userData.rol === "administrador") {
          router.push("/dashboard")
        } else {
          router.push("/dashboard/ventas")
        }
      } else {
        // Intento de autenticación con Supabase Auth (para sistemas reales)
        try {
          const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: `${rutConFormato}@sistema.cl`,
            password,
          })

          if (authError) {
            console.error("Error de autenticación con Supabase:", authError)
            setError("Credenciales incorrectas. Por favor, verifica tu RUT y contraseña.")
            setLoading(false)
            return
          }

          // Verificar el rol del usuario en la tabla usuarios
          const { data: userData, error: userError } = await supabase
            .from("usuarios")
            .select("rol, activo")
            .eq("rut", rutConFormato)
            .single()

          if (userError || !userData) {
            setError("Usuario no encontrado o inactivo")
            setLoading(false)
            return
          }

          if (!userData.activo) {
            setError("Tu cuenta está desactivada. Contacta al administrador.")
            setLoading(false)
            return
          }

          // Redirigir según el rol
          if (userData.rol === "administrador") {
            router.push("/dashboard")
          } else {
            router.push("/dashboard/ventas")
          }
        } catch (authErr) {
          console.error("Error en autenticación con Supabase:", authErr)
          setError("Credenciales incorrectas. Por favor, verifica tu RUT y contraseña.")
        }
      }
    } catch (err) {
      console.error("Error en el inicio de sesión:", err)
      setError("Ocurrió un error durante el inicio de sesión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">Ingresa tu RUT y contraseña para acceder al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rut">RUT</Label>
              <Input
                id="rut"
                placeholder="Ingresa tu RUT"
                value={rut.length > 1 ? formatearRut(rut) : rut}
                onChange={handleRutChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <p className="text-sm text-muted-foreground">Sistema de Gestión de Ventas e Inventario</p>
          <div className="text-xs text-muted-foreground">
            <p>Credenciales de prueba:</p>
            <p>Admin: 21.003.588-5 / Admin123</p>
            <p>Vendedor: 22.222.222-2 / Vendedor123456</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
