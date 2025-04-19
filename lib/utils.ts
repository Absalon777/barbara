import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validarRut(rut: string): boolean {
  // Eliminar puntos y guiones
  const rutLimpio = rut.replace(/\./g, "").replace(/-/g, "")

  // Verificar que el RUT tenga al menos 2 caracteres (1 dígito + dígito verificador)
  if (rutLimpio.length < 2) return false

  // Separar cuerpo y dígito verificador
  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1).toUpperCase()

  // Verificar que el cuerpo solo contenga números
  if (!/^\d+$/.test(cuerpo)) return false

  // Calcular dígito verificador
  let suma = 0
  let multiplicador = 2

  // Recorrer el cuerpo de derecha a izquierda
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number.parseInt(cuerpo.charAt(i)) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const dvEsperado = 11 - (suma % 11)
  const dvCalculado = dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString()

  // Comparar dígito verificador calculado con el proporcionado
  return dv === dvCalculado
}

export function formatearRut(rut: string): string {
  // Eliminar puntos y guiones
  const rutLimpio = rut.replace(/\./g, "").replace(/-/g, "")

  // Si el RUT es muy corto, devolverlo sin formato
  if (rutLimpio.length < 2) return rutLimpio

  // Separar cuerpo y dígito verificador
  const cuerpo = rutLimpio.slice(0, -1)
  const dv = rutLimpio.slice(-1)

  // Formatear el cuerpo con puntos
  let rutFormateado = ""
  let contador = 0

  // Recorrer el cuerpo de derecha a izquierda
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    rutFormateado = cuerpo.charAt(i) + rutFormateado
    contador++
    if (contador === 3 && i !== 0) {
      rutFormateado = "." + rutFormateado
      contador = 0
    }
  }

  // Agregar el guión y el dígito verificador
  return rutFormateado + "-" + dv
}

// Función para generar un ID único
export function generarId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Función para formatear fecha
export function formatearFecha(fecha: Date | string): string {
  const fechaObj = typeof fecha === "string" ? new Date(fecha) : fecha
  return fechaObj.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Función para formatear moneda
export function formatearMoneda(valor: number): string {
  return valor.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  })
}
