"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BarChart3, ClipboardList, Home, LogOut, Menu, Package, ShoppingCart, Users, X, Receipt, Truck } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [usuario, setUsuario] = useState<any>(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const usuarioActualStr = localStorage.getItem("usuarioActual")
    if (usuarioActualStr) {
      const usuarioActual = JSON.parse(usuarioActualStr)
      setUsuario(usuarioActual)
    }
  }, [])

  const handleLogout = async () => {
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut()
      
      // Limpiar localStorage
      localStorage.removeItem("usuarioActual")
      
      // Redirigir al login
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  const menuItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
      roles: ["administrador", "vendedor"],
    },
    {
      title: "Ventas",
      href: "/dashboard/ventas",
      icon: ShoppingCart,
      roles: ["administrador", "vendedor"],
    },
    {
      title: "Inventario",
      href: "/dashboard/inventario",
      icon: Package,
      roles: ["administrador", "vendedor"],
    },
    {
      title: "Proveedores",
      href: "/dashboard/proveedores",
      icon: Truck,
      roles: ["administrador"],
    },
    {
      title: "Categorías",
      href: "/dashboard/categorias",
      icon: ClipboardList,
      roles: ["administrador"],
    },
    {
      title: "Usuarios",
      href: "/dashboard/usuarios",
      icon: Users,
      roles: ["administrador"],
    },
    {
      title: "Reportes",
      href: "/dashboard/reportes",
      icon: BarChart3,
      roles: ["administrador"],
    },
    {
      title: "Historial de Ventas",
      href: "/dashboard/historial-ventas",
      icon: Receipt,
      roles: ["administrador", "vendedor"],
    },
  ]

  // Filtrar elementos del menú según el rol del usuario
  const filteredMenuItems = usuario ? menuItems.filter((item) => item.roles.includes(usuario.rol)) : []

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar para móviles */}
      <div
        className={`fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity lg:hidden ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform lg:translate-x-0 lg:static lg:inset-auto lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <h2 className="text-xl font-bold">Sistema de Gestión</h2>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <div className="py-4">
          <nav className="space-y-1 px-2">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm rounded-md ${
                  pathname === item.href ? "bg-primary text-primary-foreground" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          {usuario && (
            <div className="flex flex-col space-y-2">
              <div className="text-sm">
                <div className="font-medium">{usuario.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {usuario.rol === "administrador" ? "Administrador" : "Vendedor"}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-6">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="lg:hidden">
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex items-center space-x-2">
            <ClipboardList className="h-6 w-6" />
            <span className="font-medium">Sistema de Ventas e Inventario</span>
          </div>
          <div className="flex items-center space-x-4">
            {usuario && (
              <div className="hidden md:block text-sm text-right">
                <div className="font-medium">{usuario.nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {usuario.rol === "administrador" ? "Administrador" : "Vendedor"}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
