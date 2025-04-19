"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, ClipboardList, Home, LogOut, Package, Settings, ShoppingCart, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-auth"

interface SidebarProps {
  className?: string
  isAdmin?: boolean
}

export function Sidebar({ className, isAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const handleLogout = async () => {
    // Limpiar localStorage
    localStorage.removeItem("usuarioActual")

    // Cerrar sesión en Supabase Auth (por si acaso)
    await supabase.auth.signOut()

    // Redirigir al login
    router.push("/login")
  }

  return (
    <div className={cn("pb-12 border-r h-screen", className)}>
      <div className="space-y-4 py-4">
        <div className="px-4 py-2">
          <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight">Sistema de Gestión</h2>
          <div className="space-y-1">
            <Link href="/dashboard">
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <Home className="mr-2 h-4 w-4" />
                Inicio
              </Button>
            </Link>
            <Link href="/dashboard/ventas">
              <Button
                variant={pathname.includes("/dashboard/ventas") ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Punto de Venta
              </Button>
            </Link>
            <Link href="/dashboard/productos">
              <Button
                variant={pathname.includes("/dashboard/productos") ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <Package className="mr-2 h-4 w-4" />
                Productos
              </Button>
            </Link>
            <Link href="/dashboard/inventario">
              <Button
                variant={pathname.includes("/dashboard/inventario") ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Inventario
              </Button>
            </Link>
            <Link href="/dashboard/reportes">
              <Button
                variant={pathname.includes("/dashboard/reportes") ? "secondary" : "ghost"}
                size="sm"
                className="w-full justify-start"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Reportes
              </Button>
            </Link>

            {isAdmin && (
              <>
                <Link href="/dashboard/usuarios">
                  <Button
                    variant={pathname.includes("/dashboard/usuarios") ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Usuarios
                  </Button>
                </Link>
                <Link href="/dashboard/configuracion">
                  <Button
                    variant={pathname.includes("/dashboard/configuracion") ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 px-4 w-full">
        <Button variant="outline" size="sm" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
