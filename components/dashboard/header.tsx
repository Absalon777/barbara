"use client"

import { Bell, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"
import { useRouter } from "next/navigation"

interface HeaderProps {
  onMenuClick: () => void
  userName?: string
}

export function Header({ onMenuClick, userName = "Usuario" }: HeaderProps) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleLogout = async () => {
    try {
      // Obtener información del usuario actual
      const usuarioActualStr = localStorage.getItem("usuarioActual")

      if (usuarioActualStr) {
        const usuarioActual = JSON.parse(usuarioActualStr)

        // Registrar el cierre de sesión
        await supabase.from("logs_actividad").insert({
          usuario_id: usuarioActual.id,
          accion: "logout",
          tabla: "usuarios",
          registro_id: usuarioActual.id,
          detalles: "Cierre de sesión",
          ip_address: "127.0.0.1", // En un sistema real, se obtendría la IP real
        })
      }

      // Limpiar localStorage
      localStorage.removeItem("usuarioActual")

      // Cerrar sesión en Supabase Auth (por si acaso)
      await supabase.auth.signOut()

      // Redirigir al login
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      // Redirigir al login de todos modos
      router.push("/login")
    }
  }

  return (
    <header className="flex h-16 items-center px-4 border-b bg-white">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <div className="ml-auto flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
          <span className="sr-only">Notificaciones</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
              <span className="sr-only">Perfil</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/perfil")}>Mi Perfil</DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>Cerrar Sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
