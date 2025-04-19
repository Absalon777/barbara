"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home, ShoppingCart, Box, Users, BarChart2, History, ClipboardList, Menu, X 
} from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { Button } from "./button"

// Definir la interfaz UserInfo aquí
interface UserInfo {
  nombre: string;
  rol: string;
}

export function Sidebar() {
  const pathname = usePathname()
  const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false)
  const isMobile = useMobile();

  React.useEffect(() => {
    const storedUser = localStorage.getItem("usuarioActual")
    if (storedUser) {
      try {
        setUserInfo(JSON.parse(storedUser))
      } catch (error) {
        console.error("Error parsing user info from localStorage:", error)
      }
    }
  }, [])

  const isAdmin = userInfo?.rol === "administrador"

  const menuItems = [
    // { href: "/dashboard", label: "Dashboard", icon: Home, adminOnly: true }, // Descomentar si Dashboard es solo admin
    { href: "/dashboard/ventas", label: "Ventas", icon: ShoppingCart, adminOnly: false },
    { href: "/dashboard/inventario", label: "Inventario", icon: Box, adminOnly: false },
    { href: "/dashboard/historial-ventas", label: "Historial de Ventas", icon: History, adminOnly: false },
    { href: "/dashboard/categorias", label: "Categorías", icon: ClipboardList, adminOnly: true },
    { href: "/dashboard/usuarios", label: "Usuarios", icon: Users, adminOnly: true },
    { href: "/dashboard/reportes", label: "Reportes", icon: BarChart2, adminOnly: true },
  ]

  const toggleSidebar = () => {
      setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
      setIsSidebarOpen(false);
  }

  const NavLink = ({ href, label, icon: Icon, adminOnly }: typeof menuItems[0]) => {
    if (adminOnly && !isAdmin) {
      return null
    }
    // No mostrar nada hasta que sepamos el rol
    if (userInfo === null) return null; 

    return (
      <Link
        href={href}
        onClick={closeSidebar}
            className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
          pathname === href && "bg-muted text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
      )
    }

    return (
    <>
        {/* Botón Hamburguesa para Móvil */} 
        {isMobile && (
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar} 
                className="fixed top-4 left-4 z-50 lg:hidden bg-background/80 backdrop-blur-sm" // Añadido fondo para visibilidad
            >
                {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
        )}

        {/* Sidebar */} 
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 lg:static lg:inset-auto lg:z-auto lg:block", // Ajuste z-index para desktop
            "border-r bg-background transition-transform duration-300 ease-in-out", 
            isMobile ? (isSidebarOpen ? "translate-x-0 w-64 shadow-lg" : "-translate-x-full w-64") : "w-64", // Mantener lógica móvil
             "flex-shrink-0" // Asegurar que no se comprima
          )}
        >
            {/* Overlay para cerrar en móvil */}
            {isMobile && isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/30 z-30 lg:hidden"
                    onClick={closeSidebar}
                />
            )}
          {/* Contenido del Sidebar */}
          <div className="flex h-full max-h-screen flex-col gap-2 relative z-40 bg-background"> {/* Asegurar bg aquí */}
            <div className="flex h-16 items-center border-b px-6 flex-shrink-0">
                <Link href={isAdmin ? "/dashboard" : "/dashboard/ventas"} className="flex items-center gap-2 font-semibold" onClick={closeSidebar}>
                    <span className="">Mi Negocio</span> {/* Cambiar por tu logo/nombre */}
                </Link>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-4 text-sm font-medium space-y-1">
              {/* Renderizar Home/Dashboard sólo si es admin o si no está definido como adminOnly */}
               {(isAdmin) && ( // Ajustar esta condición según si Dashboard es adminOnly
                 <NavLink href="/dashboard" label="Dashboard" icon={Home} adminOnly={true} />
               )}
              {menuItems.map((item) => (
                // Evitar renderizar el link a dashboard de nuevo si ya se hizo arriba
                item.href !== "/dashboard" && <NavLink key={item.href} {...item} /> 
              ))}
            </nav>
            <div className="mt-auto p-4 border-t">
              {userInfo && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">{userInfo.nombre}</p>
                  <p className="capitalize">{userInfo.rol}</p> {/* Capitalize para mejor display */}
                </div>
              )}
              {/* Aquí podría ir el botón de Cerrar Sesión */}
            </div>
          </div>
        </div>
    </>
  )
}

// --- Mantener el resto de exportaciones si existen ---
// Por ejemplo, si tenías SidebarHeader, SidebarContent, etc., mantenlos aquí.
// Si tu componente Sidebar anterior era diferente, necesitarás ajustar esto.
// Asegúrate de que este componente `Sidebar` sea el que se usa en tu layout principal.

// Ejemplo de cómo podrían ser si existían (¡Adapta según tu código original!):
// const SidebarContext = React.createContext</* tipo */>({});
// export const useSidebar = () => React.useContext(SidebarContext);
// export const SidebarProvider = ({ children }: { children: React.ReactNode }) => { /* ... */ };
// export const SidebarHeader = ({ children }: { children: React.ReactNode }) => <div className="sidebar-header">{children}</div>;
// export const SidebarContent = ({ children }: { children: React.ReactNode }) => <div className="sidebar-content">{children}</div>;
// export const SidebarFooter = ({ children }: { children: React.ReactNode }) => <div className="sidebar-footer">{children}</div>;

