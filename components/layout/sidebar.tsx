"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Truck } from "lucide-react";

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex flex-col space-y-4">
      <Link
        href="/dashboard/inventario"
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
          pathname === "/dashboard/inventario" ? "bg-muted text-primary" : ""
        }`}
      >
        <Package className="h-4 w-4" />
        Inventario
      </Link>
      <Link
        href="/dashboard/proveedores"
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
          pathname === "/dashboard/proveedores" ? "bg-muted text-primary" : ""
        }`}
      >
        <Truck className="h-4 w-4" />
        Proveedores
      </Link>
    </div>
  );
};

export default Sidebar; 