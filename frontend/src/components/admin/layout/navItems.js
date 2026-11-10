import {
  Pill, LayoutGrid, Package, ChartColumn, ShoppingBag, Truck,
  Clock, FileText, Users, ClipboardList, Store, UserCog, ShoppingCart,
} from "lucide-react";

export const NAV_ITEMS = [
  { path: "dashboard", label: "Resumen", icon: LayoutGrid, quick: true, roles: ["admin"] },
  { path: "inventario", label: "Inventario", icon: Package, quick: true },
  { path: "productos", label: "Medicamentos", icon: Pill, quick: true },
  { path: "ventas", label: "Ventas", icon: ChartColumn, quick: true, roles: ["admin"] },
  { path: "punto-de-venta", label: "Punto de venta", icon: ShoppingCart },
  { path: "compras", label: "Compras", icon: ShoppingBag, roles: ["admin"] },
  { path: "proveedores", label: "Proveedores", icon: Truck, Users, roles: ["admin"] },
  { path: "clientes", label: "Clientes", icon: Users, roles: ["admin"] },
  { path: "recetas", label: "Recetas", icon: ClipboardList },
  { path: "sucursales", label: "Sucursales", icon: Store, roles: ["admin"] },
  { path: "empleados", label: "Empleados", icon: UserCog, roles: ["admin"] },
  { path: "vencimientos", label: "Vencimientos", icon: Clock },
  { path: "reportes", label: "Reportes", icon: FileText, roles: ["admin"] },
];

export const visibleItems = (rol) =>
  NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(rol));