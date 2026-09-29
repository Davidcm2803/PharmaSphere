
-- PharmaSphere DB
-- Se ejecuta solo cuando el volumen de PostgreSQL esta vacio
-- El orden de las tablas importa por las Foreign Key


-- SUCURSAL
CREATE TABLE sucursal (
    id_sucursal SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255),
    telefono VARCHAR(50),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PROVEEDOR
CREATE TABLE proveedor (
    id_proveedor SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    contacto VARCHAR(150),
    telefono VARCHAR(50),
    correo VARCHAR(150),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- PRODUCTO
CREATE TABLE producto (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion VARCHAR(500),
    categoria VARCHAR(100),
    precio NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    costo NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (costo >= 0),
    requiere_receta BOOLEAN NOT NULL DEFAULT FALSE,
    imagen_url VARCHAR(500),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    id_proveedor INT REFERENCES proveedor(id_proveedor),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- EMPLEADO
CREATE TABLE empleado (
    id_empleado SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    puesto VARCHAR(100),
    id_sucursal INT REFERENCES sucursal(id_sucursal),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- CLIENTE
CREATE TABLE cliente (
    id_cliente SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    cedula VARCHAR(50) UNIQUE,
    telefono VARCHAR(50),
    correo VARCHAR(150) UNIQUE,
    direccion VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- USUARIO (login por Firebase o local, al menos uno de los dos debe existir)
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE,       
    password_hash VARCHAR(255),             
    correo VARCHAR(150) NOT NULL UNIQUE,
    nombre VARCHAR(150),
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente'
        CHECK (rol IN ('admin', 'empleado', 'cliente')),
    id_cliente INT REFERENCES cliente(id_cliente),
    id_empleado INT REFERENCES empleado(id_empleado),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_usuario_auth CHECK (firebase_uid IS NOT NULL OR password_hash IS NOT NULL)
);

-- INVENTARIO (total por producto y sucursal)
CREATE TABLE inventario (
    id_inventario SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_sucursal INT NOT NULL REFERENCES sucursal(id_sucursal),
    cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    UNIQUE (id_producto, id_sucursal)
);

-- COMPRA (a proveedores)
CREATE TABLE compra (
    id_compra SERIAL PRIMARY KEY,
    id_proveedor INT NOT NULL REFERENCES proveedor(id_proveedor),
    id_sucursal INT NOT NULL REFERENCES sucursal(id_sucursal),
    id_usuario INT REFERENCES usuario(id_usuario),
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_recepcion TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'recibida', 'cancelada')),
    total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0)
);

-- DETALLE COMPRA
CREATE TABLE detallecompra (
    id_detallecompra SERIAL PRIMARY KEY,
    id_compra INT NOT NULL REFERENCES compra(id_compra) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    costo_unitario NUMERIC(10,2) NOT NULL CHECK (costo_unitario >= 0)
);

-- LOTE (con fecha de vencimiento)
CREATE TABLE lote (
    id_lote SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_sucursal INT NOT NULL REFERENCES sucursal(id_sucursal),
    id_compra INT REFERENCES compra(id_compra),
    numero_lote VARCHAR(100) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    cantidad INT NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (id_producto, id_sucursal, numero_lote)
);

-- VENTA
CREATE TABLE venta (
    id_venta SERIAL PRIMARY KEY,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    id_sucursal INT NOT NULL REFERENCES sucursal(id_sucursal),
    id_empleado INT REFERENCES empleado(id_empleado),  -- null en compras online
    id_cliente INT REFERENCES cliente(id_cliente),
    total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    tipo VARCHAR(20) NOT NULL DEFAULT 'mostrador'
        CHECK (tipo IN ('online', 'mostrador')),
    estado VARCHAR(20) NOT NULL DEFAULT 'pagada'
        CHECK (estado IN ('pendiente', 'pagada', 'retirada', 'cancelada')),
    metodo_pago VARCHAR(50),
    tarjeta_ultimos_4 VARCHAR(4)  -- solo para mostrar en el recibo, el pago se simula en el frontend
);

-- DETALLE VENTA
CREATE TABLE detalleventa (
    id_detalleventa SERIAL PRIMARY KEY,
    id_venta INT NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10,2) NOT NULL CHECK (precio_unitario >= 0)
);

-- RECETA
CREATE TABLE receta (
    id_receta SERIAL PRIMARY KEY,
    id_cliente INT NOT NULL REFERENCES cliente(id_cliente),
    medico VARCHAR(150),
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia_hasta DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'vigente'
        CHECK (estado IN ('vigente', 'usada', 'vencida')),
    archivo_url VARCHAR(500),
    id_venta INT REFERENCES venta(id_venta)  -- venta en la que se uso la receta
);

-- MOVIMIENTO DE INVENTARIO (historial / kardex)
-- cantidad positiva = entra stock, negativa = sale stock
CREATE TABLE movimiento_inventario (
    id_movimiento SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_sucursal INT NOT NULL REFERENCES sucursal(id_sucursal),
    id_lote INT REFERENCES lote(id_lote),
    tipo VARCHAR(30) NOT NULL
        CHECK (tipo IN ('venta', 'compra', 'ajuste',
                        'transferencia_entrada', 'transferencia_salida', 'vencimiento')),
    cantidad INT NOT NULL CHECK (cantidad <> 0),
    motivo VARCHAR(255),
    id_usuario INT REFERENCES usuario(id_usuario),
    id_venta INT REFERENCES venta(id_venta),
    id_compra INT REFERENCES compra(id_compra),
    fecha TIMESTAMP NOT NULL DEFAULT NOW()
);

-- DOCUMENTO (para el RAG)
CREATE TABLE documento (
    id_documento SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    tipo VARCHAR(50),
    contenido TEXT,
    ruta VARCHAR(500),
    indexado BOOLEAN NOT NULL DEFAULT FALSE,
    id_usuario INT REFERENCES usuario(id_usuario),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- INDICES UTILES
CREATE INDEX idx_producto_proveedor ON producto(id_proveedor);
CREATE INDEX idx_producto_nombre ON producto(nombre);
CREATE INDEX idx_producto_categoria ON producto(categoria);

CREATE INDEX idx_usuario_cliente ON usuario(id_cliente);
CREATE INDEX idx_usuario_empleado ON usuario(id_empleado);

CREATE INDEX idx_inventario_producto ON inventario(id_producto);
CREATE INDEX idx_inventario_sucursal ON inventario(id_sucursal);

CREATE INDEX idx_compra_proveedor ON compra(id_proveedor);
CREATE INDEX idx_compra_estado ON compra(estado);
CREATE INDEX idx_detallecompra_compra ON detallecompra(id_compra);

CREATE INDEX idx_lote_producto ON lote(id_producto);
CREATE INDEX idx_lote_vencimiento ON lote(fecha_vencimiento);

CREATE INDEX idx_venta_sucursal ON venta(id_sucursal);
CREATE INDEX idx_venta_cliente ON venta(id_cliente);
CREATE INDEX idx_venta_fecha ON venta(fecha);
CREATE INDEX idx_detalleventa_venta ON detalleventa(id_venta);
CREATE INDEX idx_detalleventa_producto ON detalleventa(id_producto);

CREATE INDEX idx_receta_cliente ON receta(id_cliente);
CREATE INDEX idx_receta_producto ON receta(id_producto);

CREATE INDEX idx_movimiento_producto ON movimiento_inventario(id_producto, id_sucursal);
CREATE INDEX idx_movimiento_fecha ON movimiento_inventario(fecha);