
-- SEED DATA - PharmaSphere

-- SUCURSAL
INSERT INTO sucursal (nombre, direccion, telefono) VALUES
('Farmacia Central', 'Av. Central 123, San Jose', '2222-1111'),
('Farmacia Norte', 'Barrio Norte 45, Heredia', '2222-2222'),
('Farmacia Sur', 'Calle Sur 78, Cartago', '2222-3333');

-- PROVEEDOR
INSERT INTO proveedor (nombre, contacto) VALUES
('Farmindustria S.A.', 'ventas@farmindustria.com'),
('Laboratorios Bayer CR', 'contacto@bayer.co.cr'),
('Distribuidora Medica CR', 'info@distmedica.com');

-- PRODUCTO
INSERT INTO producto (nombre, descripcion, categoria, precio, requiere_receta, id_proveedor) VALUES
('Paracetamol 500mg', 'Analgesico y antipiretico', 'Analgesicos', 1500.00, FALSE, 1),
('Ibuprofeno 400mg', 'Antiinflamatorio no esteroideo', 'Analgesicos', 1800.00, FALSE, 1),
('Amoxicilina 500mg', 'Antibiotico de amplio espectro', 'Antibioticos', 3500.00, TRUE, 2),
('Loratadina 10mg', 'Antihistaminico', 'Alergias', 2000.00, FALSE, 2),
('Omeprazol 20mg', 'Inhibidor de bomba de protones', 'Gastrointestinal', 2800.00, FALSE, 3),
('Losartan 50mg', 'Antihipertensivo', 'Cardiovascular', 4200.00, TRUE, 3),
('Metformina 850mg', 'Antidiabetico oral', 'Endocrino', 3100.00, TRUE, 3),
('Vitamina C 1000mg', 'Suplemento vitaminico', 'Suplementos', 2500.00, FALSE, 1);

-- EMPLEADO
INSERT INTO empleado (nombre, puesto, id_sucursal) VALUES
('Maria Rodriguez', 'Farmaceutica', 1),
('Carlos Jimenez', 'Cajero', 1),
('Ana Vargas', 'Farmaceutica', 2),
('Luis Mora', 'Cajero', 3);

-- CLIENTE
INSERT INTO cliente (nombre, cedula, telefono, correo, direccion) VALUES
('Jose Fernandez', '1-1111-1111', '8888-1111', 'jose.fernandez@mail.com', 'San Jose, Costa Rica'),
('Laura Chinchilla', '2-2222-2222', '8888-2222', 'laura.chinchilla@mail.com', 'Heredia, Costa Rica'),
('Pedro Solano', '3-3333-3333', '8888-3333', 'pedro.solano@mail.com', 'Cartago, Costa Rica');

-- INVENTARIO
INSERT INTO inventario (id_producto, id_sucursal, cantidad, stock_minimo) VALUES
(1, 1, 150, 30),
(2, 1, 100, 20),
(3, 1, 40, 15),
(4, 1, 80, 20),
(1, 2, 90, 30),
(5, 2, 60, 15),
(6, 2, 25, 10),
(1, 3, 70, 30),
(7, 3, 35, 10),
(8, 3, 50, 15);

-- VENTA
INSERT INTO venta (fecha, id_sucursal, id_empleado, id_cliente, total, tipo) VALUES
('2026-09-01', 1, 1, 1, 4500.00, 'presencial'),
('2026-09-05', 1, 2, 2, 3500.00, 'presencial'),
('2026-09-10', 2, 3, 3, 5600.00, 'online'),
('2026-09-12', 3, 4, 1, 3100.00, 'presencial');

-- DETALLE VENTA
INSERT INTO detalleventa (id_venta, id_producto, cantidad, precio_unitario) VALUES
(1, 1, 2, 1500.00),
(1, 2, 1, 1800.00),
(2, 3, 1, 3500.00),
(3, 5, 2, 2800.00),
(4, 7, 1, 3100.00);

-- RECETA
INSERT INTO receta (id_cliente, medico, id_producto, fecha) VALUES
(1, 'Dr. Roberto Alvarado', 3, '2026-08-28'),
(2, 'Dra. Silvia Castro', 6, '2026-09-08'),
(3, 'Dr. Manuel Rojas', 7, '2026-09-11');
