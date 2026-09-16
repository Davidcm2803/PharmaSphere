CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SUCURSAL
CREATE TABLE sucursal (
    id_sucursal SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255),
    telefono VARCHAR(50)
);

-- PROVEEDOR
CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(150)
);

-- PRODUCTO
CREATE TABLE producto (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500),
    categoria VARCHAR(100),
    precio FLOAT NOT NULL,
    requiere_receta BOOLEAN NOT NULL DEFAULT FALSE,
    id_proveedor INT REFERENCES proveedor(id_proveedor)
);

-- EMPLEADO
CREATE TABLE empleado (
    id_empleado SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    puesto VARCHAR(100),
    id_sucursal INT REFERENCES sucursal(id_sucursal)
);


-- CLIENTE
CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    cedula VARCHAR(50) UNIQUE,
    telefono VARCHAR(50),
    correo VARCHAR(150),
    direccion VARCHAR(255)
);

-- INVENTARIO
CREATE TABLE inventario (
    id_inventario SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_sucursal INT NOT NULL REFERENCES sucursal(id_sucursal),
    cantidad INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 0,
    UNIQUE (id_producto, id_sucursal)
);

-- VENTA
CREATE TABLE venta (
    id_venta SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    id_sucursal INT NOT NULL REFERENCES sucursal(id_sucursal),
    id_empleado INT NOT NULL REFERENCES empleado(id_empleado),
    id_cliente INT REFERENCES cliente(id_cliente),
    total FLOAT NOT NULL DEFAULT 0,
    tipo VARCHAR(50)
);

-- DETALLE VENTA
CREATE TABLE detalleventa (
    id_detalleventa SERIAL PRIMARY KEY,
    id_venta INT NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL,
    precio_unitario FLOAT NOT NULL
);

-- RECETA
CREATE TABLE receta (
    id_receta SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cliente(id_cliente),
    medico VARCHAR(150),
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE
);

-- INDICES UTILES
CREATE INDEX idx_inventario_producto ON inventario(id_producto);
CREATE INDEX idx_inventario_sucursal ON inventario(id_sucursal);
CREATE INDEX idx_venta_sucursal ON venta(id_sucursal);
CREATE INDEX idx_venta_cliente ON venta(id_cliente);
CREATE INDEX idx_detalleventa_venta ON detalleventa(id_venta);
CREATE INDEX idx_receta_cliente ON receta(id_cliente);
CREATE INDEX idx_producto_proveedor ON producto(id_proveedor);
