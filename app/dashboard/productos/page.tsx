"use client"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Plus, Search } from "lucide-react"

// Datos de ejemplo para la demostración
const productosEjemplo = [
  {
    id: "1",
    codigo: "PRD001",
    nombre: 'Laptop HP 15.6"',
    descripcion: "Laptop HP con procesador i5, 8GB RAM, 256GB SSD",
    categoria: "Electrónica",
    precio_venta: 599990,
    precio_costo: 450000,
    stock: 15,
    proveedor: "HP Chile",
  },
  {
    id: "2",
    codigo: "PRD002",
    nombre: "Mouse Inalámbrico",
    descripcion: "Mouse inalámbrico ergonómico con batería recargable",
    categoria: "Accesorios",
    precio_venta: 19990,
    precio_costo: 12000,
    stock: 50,
    proveedor: "Logitech",
  },
  {
    id: "3",
    codigo: "PRD003",
    nombre: 'Monitor 24"',
    descripcion: "Monitor LED Full HD 24 pulgadas",
    categoria: "Electrónica",
    precio_venta: 149990,
    precio_costo: 100000,
    stock: 8,
    proveedor: "Samsung",
  },
  {
    id: "4",
    codigo: "PRD004",
    nombre: "Teclado Mecánico",
    descripcion: "Teclado mecánico RGB para gaming",
    categoria: "Accesorios",
    precio_venta: 49990,
    precio_costo: 30000,
    stock: 25,
    proveedor: "Redragon",
  },
  {
    id: "5",
    codigo: "PRD005",
    nombre: "Audífonos Bluetooth",
    descripcion: "Audífonos inalámbricos con cancelación de ruido",
    categoria: "Audio",
    precio_venta: 89990,
    precio_costo: 60000,
    stock: 12,
    proveedor: "Sony",
  },
]

export default function ProductosPage() {
  const [productos, setProductos] = useState(productosEjemplo)
  const [busqueda, setBusqueda] = useState("")
  const [productoEditando, setProductoEditando] = useState<any>(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)

  const handleBuscar = () => {
    if (!busqueda) {
      setProductos(productosEjemplo)
      return
    }

    const resultados = productosEjemplo.filter(
      (p) =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo.toLowerCase().includes(busqueda.toLowerCase()),
    )

    setProductos(resultados)
  }

  const handleNuevoProducto = () => {
    setProductoEditando({
      id: "",
      codigo: "",
      nombre: "",
      descripcion: "",
      categoria: "",
      precio_venta: 0,
      precio_costo: 0,
      stock: 0,
      proveedor: "",
    })
    setDialogoAbierto(true)
  }

  const handleEditarProducto = (producto: any) => {
    setProductoEditando(producto)
    setDialogoAbierto(true)
  }

  const handleGuardarProducto = () => {
    // En un sistema real, aquí se guardaría el producto en la base de datos
    setDialogoAbierto(false)
    // Actualizar la lista de productos (simulado)
    if (productoEditando.id) {
      setProductos(productos.map((p) => (p.id === productoEditando.id ? productoEditando : p)))
    } else {
      const nuevoProducto = {
        ...productoEditando,
        id: "prod-" + Math.random().toString(36).substr(2, 9),
      }
      setProductos([...productos, nuevoProducto])
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
        <Button onClick={handleNuevoProducto}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Input
              placeholder="Buscar por nombre o código"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleBuscar}>
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Precio Venta</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No se encontraron productos
                    </TableCell>
                  </TableRow>
                ) : (
                  productos.map((producto) => (
                    <TableRow key={producto.id}>
                      <TableCell>{producto.codigo}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{producto.nombre}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {producto.descripcion}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{producto.categoria}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${producto.precio_venta.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={producto.stock < 10 ? "destructive" : "default"} className="w-16">
                          {producto.stock}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditarProducto(producto)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{productoEditando?.id ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>Complete los datos del producto y guarde los cambios.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código de Barras</Label>
                <Input
                  id="codigo"
                  value={productoEditando?.codigo || ""}
                  onChange={(e) => setProductoEditando({ ...productoEditando, codigo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={productoEditando?.nombre || ""}
                  onChange={(e) => setProductoEditando({ ...productoEditando, nombre: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={productoEditando?.descripcion || ""}
                onChange={(e) => setProductoEditando({ ...productoEditando, descripcion: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={productoEditando?.categoria || ""}
                  onValueChange={(value) => setProductoEditando({ ...productoEditando, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electrónica">Electrónica</SelectItem>
                    <SelectItem value="Accesorios">Accesorios</SelectItem>
                    <SelectItem value="Audio">Audio</SelectItem>
                    <SelectItem value="Computación">Computación</SelectItem>
                    <SelectItem value="Otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proveedor">Proveedor</Label>
                <Input
                  id="proveedor"
                  value={productoEditando?.proveedor || ""}
                  onChange={(e) => setProductoEditando({ ...productoEditando, proveedor: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precio_venta">Precio Venta</Label>
                <Input
                  id="precio_venta"
                  type="number"
                  value={productoEditando?.precio_venta || 0}
                  onChange={(e) =>
                    setProductoEditando({ ...productoEditando, precio_venta: Number.parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio_costo">Precio Costo</Label>
                <Input
                  id="precio_costo"
                  type="number"
                  value={productoEditando?.precio_costo || 0}
                  onChange={(e) =>
                    setProductoEditando({ ...productoEditando, precio_costo: Number.parseInt(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={productoEditando?.stock || 0}
                  onChange={(e) => setProductoEditando({ ...productoEditando, stock: Number.parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogoAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGuardarProducto}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
