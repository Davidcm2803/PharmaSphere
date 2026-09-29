-- SEED DATA - PharmaSphere

-- SUCURSAL
INSERT INTO sucursal (nombre, direccion, telefono) VALUES
('Farmacia Central', 'Av. Central 123, San Jose', '2222-1111'),
('Farmacia Norte', 'Barrio Norte 45, Heredia', '2222-2222'),
('Farmacia Sur', 'Calle Sur 78, Cartago', '2222-3333');

-- PROVEEDOR
INSERT INTO proveedor (nombre, contacto, telefono, correo) VALUES
('Farmindustria S.A.', 'Ventas Farmindustria', '2233-1000', 'ventas@farmindustria.com'),
('Laboratorios Bayer CR', 'Contacto Bayer', '2233-2000', 'contacto@bayer.co.cr'),
('Distribuidora Medica CR', 'Info DistMedica', '2233-3000', 'info@distmedica.com');

-- PRODUCTO
INSERT INTO producto (nombre, descripcion, categoria, precio, costo, requiere_receta, id_proveedor) VALUES
('Paracetamol 500mg', 'Analgesico y antipiretico', 'Analgesicos', 1500.00, 800.00, FALSE, 1),
('Ibuprofeno 400mg', 'Antiinflamatorio no esteroideo', 'Analgesicos', 1800.00, 950.00, FALSE, 1),
('Amoxicilina 500mg', 'Antibiotico de amplio espectro', 'Antibioticos', 3500.00, 1900.00, TRUE, 2),
('Loratadina 10mg', 'Antihistaminico', 'Alergias', 2000.00, 1050.00, FALSE, 2),
('Omeprazol 20mg', 'Inhibidor de bomba de protones', 'Gastrointestinal', 2800.00, 1500.00, FALSE, 3),
('Losartan 50mg', 'Antihipertensivo', 'Cardiovascular', 4200.00, 2300.00, TRUE, 3),
('Metformina 850mg', 'Antidiabetico oral', 'Endocrino', 3100.00, 1700.00, TRUE, 3),
('Vitamina C 1000mg', 'Suplemento vitaminico', 'Suplementos', 2500.00, 1200.00, FALSE, 1);

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

-- USUARIO
-- Contraseña del admin: admin123 (hash bcrypt real, cambiarla luego)
INSERT INTO usuario (password_hash, correo, nombre, rol, id_empleado) VALUES
('$2b$12$3X8wfv6cJB/zl4P2mtHNLuF9RhTnQLHCWlaKQa6EYT5l6o8TkzKYy', 'admin@pharmasphere.com', 'Administrador', 'admin', NULL);

INSERT INTO usuario (password_hash, correo, nombre, rol, id_empleado) VALUES
('$2b$12$3X8wfv6cJB/zl4P2mtHNLuF9RhTnQLHCWlaKQa6EYT5l6o8TkzKYy', 'maria.rodriguez@pharmasphere.com', 'Maria Rodriguez', 'empleado', 1),
('$2b$12$3X8wfv6cJB/zl4P2mtHNLuF9RhTnQLHCWlaKQa6EYT5l6o8TkzKYy', 'carlos.jimenez@pharmasphere.com', 'Carlos Jimenez', 'empleado', 2);

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

-- COMPRA
INSERT INTO compra (id_proveedor, id_sucursal, id_usuario, fecha, fecha_recepcion, estado, total) VALUES
(1, 1, 1, '2026-08-15', '2026-08-18', 'recibida', 400000.00),
(2, 2, 1, '2026-08-20', '2026-08-23', 'recibida', 190000.00),
(3, 3, 1, '2026-09-15', NULL, 'pendiente', 170000.00);

-- DETALLE COMPRA
INSERT INTO detallecompra (id_compra, id_producto, cantidad, costo_unitario) VALUES
(1, 1, 200, 800.00),
(1, 2, 150, 950.00),
(2, 3, 100, 1900.00),
(3, 7, 100, 1700.00);

-- LOTE
INSERT INTO lote (id_producto, id_sucursal, id_compra, numero_lote, fecha_vencimiento, cantidad) VALUES
(1, 1, 1, 'LOT-PARA-001', '2027-06-30', 150),
(2, 1, 1, 'LOT-IBU-001', '2027-05-31', 100),
(3, 1, 2, 'LOT-AMOX-001', '2026-10-15', 40),
(1, 2, NULL, 'LOT-PARA-002', '2027-01-31', 90),
(6, 2, NULL, 'LOT-LOSA-001', '2026-10-05', 25),
(7, 3, NULL, 'LOT-METF-001', '2026-11-20', 35);

-- VENTA
INSERT INTO venta (fecha, id_sucursal, id_empleado, id_cliente, total, tipo, estado, metodo_pago, tarjeta_ultimos_4) VALUES
('2026-09-01 10:15:00', 1, 1, 1, 4800.00, 'mostrador', 'pagada', 'efectivo', NULL),
('2026-09-05 14:30:00', 1, 2, 2, 3500.00, 'mostrador', 'pagada', 'tarjeta', '4242'),
('2026-09-10 09:00:00', 2, NULL, 3, 5600.00, 'online', 'retirada', 'tarjeta', '4242'),
('2026-09-12 16:45:00', 3, 4, 1, 3100.00, 'mostrador', 'pagada', 'efectivo', NULL);

-- DETALLE VENTA
INSERT INTO detalleventa (id_venta, id_producto, cantidad, precio_unitario) VALUES
(1, 1, 2, 1500.00),
(1, 2, 1, 1800.00),
(2, 3, 1, 3500.00),
(3, 5, 2, 2800.00),
(4, 7, 1, 3100.00);

-- RECETA
INSERT INTO receta (id_cliente, medico, id_producto, cantidad, fecha, vigencia_hasta, estado, id_venta) VALUES
(1, 'Dr. Roberto Alvarado', 3, 1, '2026-08-28', '2026-11-28', 'usada', 2),
(2, 'Dra. Silvia Castro', 6, 1, '2026-09-08', '2026-12-08', 'vigente', NULL),
(3, 'Dr. Manuel Rojas', 7, 1, '2026-09-11', '2026-12-11', 'usada', 4);

-- MOVIMIENTO INVENTARIO
INSERT INTO movimiento_inventario (id_producto, id_sucursal, id_lote, tipo, cantidad, motivo, id_usuario, id_venta, id_compra) VALUES
(1, 1, 1, 'compra', 200, 'Recepcion de compra inicial', 1, NULL, 1),
(1, 1, 1, 'venta', -2, NULL, 2, 1, NULL),
(2, 1, 2, 'venta', -1, NULL, 2, 1, NULL),
(3, 1, 3, 'venta', -1, NULL, 2, 2, NULL);

-- DOCUMENTO
INSERT INTO documento (titulo, tipo, contenido, indexado, id_usuario) VALUES
('Manual de dispensacion de medicamentos con receta', 'manual', 'Todo medicamento marcado como requiere_receta debe verificarse contra una receta vigente antes de completar la venta. La receta cambia a estado usada una vez aplicada.', FALSE, 1),
('Politica de devoluciones', 'politica', 'Los medicamentos no se aceptan de vuelta una vez entregados, salvo error de despacho comprobado dentro de las 24 horas siguientes a la compra.', FALSE, 1),
('Ficha tecnica - Amoxicilina 500mg', 'ficha', 'Antibiotico de amplio espectro. Contraindicado en personas alergicas a la penicilina. Conservar a temperatura ambiente, protegido de la humedad.', FALSE, 1);