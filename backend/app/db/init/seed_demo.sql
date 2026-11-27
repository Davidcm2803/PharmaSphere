
-- ============================================================
-- PHARMASPHERE
-- ISSUE #26: DATOS DE DEMOSTRACION
-- Historial de ventas y lotes proximos a vencer
-- ============================================================

-- Control para evitar ejecutar dos veces este seed.
CREATE TABLE IF NOT EXISTS pharmasphere_seed_control (
    clave VARCHAR(100) PRIMARY KEY,
    ejecutado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
    i INTEGER;

    v_id_venta INTEGER;
    v_id_cliente INTEGER;
    v_id_sucursal INTEGER;
    v_id_empleado INTEGER;

    v_producto1 INTEGER;
    v_producto2 INTEGER;

    v_cantidad1 INTEGER;
    v_cantidad2 INTEGER;

    v_precio1 NUMERIC(12, 2);
    v_precio2 NUMERIC(12, 2);
    v_total NUMERIC(12, 2);

    v_fecha TIMESTAMP;

    v_tipo VARCHAR(20);
    v_estado VARCHAR(20);
    v_metodo VARCHAR(30);

BEGIN

    -- --------------------------------------------------------
    -- Verificar si el seed ya fue ejecutado.
    -- --------------------------------------------------------

    IF EXISTS (
        SELECT 1
        FROM pharmasphere_seed_control
        WHERE clave = 'issue-26-demo-data-v1'
    ) THEN
        RAISE NOTICE 'Los datos demo del issue #26 ya existen.';
        RETURN;
    END IF;


    -- --------------------------------------------------------
    -- LOTES PROXIMOS A VENCER
    -- Los tres lotes vencidos originales se conservan
    -- en el seed.sql existente.
    -- --------------------------------------------------------

    INSERT INTO lote (
        id_producto,
        id_sucursal,
        id_compra,
        numero_lote,
        fecha_vencimiento,
        cantidad
    )
    VALUES
        (1, 1, NULL, 'DEMO-PARA-2026-12',
         '2026-12-15', 12),

        (2, 1, NULL, 'DEMO-IBU-2026-12',
         '2026-12-22', 12),

        (4, 1, NULL, 'DEMO-LORA-2027-01',
         '2027-01-10', 12),

        (5, 2, NULL, 'DEMO-OMEP-2026-12',
         '2026-12-18', 12),

        (8, 3, NULL, 'DEMO-VITC-2026-12',
         '2026-12-30', 12);


    -- Actualizar las existencias para reflejar los
    -- nuevos lotes agregados.

    UPDATE inventario
    SET cantidad = cantidad + 12
    WHERE (id_producto, id_sucursal) IN (
        (1, 1),
        (2, 1),
        (4, 1),
        (5, 2),
        (8, 3)
    );


    -- --------------------------------------------------------
    -- HISTORIAL DE VENTAS
    -- Genera 180 ventas distribuidas en 180 días.
    -- --------------------------------------------------------

    FOR i IN 1..180 LOOP

        -- Distribución de las ventas entre sucursales.
        v_id_sucursal := ((i - 1) % 3) + 1;

        -- Distribución de clientes.
        v_id_cliente := ((i - 1) % 3) + 1;

        -- Productos de la venta.
        v_producto1 := ((i - 1) % 8) + 1;
        v_producto2 := ((i + 2) % 8) + 1;

        -- Cantidades variables.
        v_cantidad1 := 1 + (i % 3);
        v_cantidad2 := 1 + (i % 2);

        -- Fecha dentro de los últimos 180 días.
        v_fecha :=
            (CURRENT_DATE - ((i - 1) % 180))
            + TIME '09:00'
            + (((i * 37) % 480) * INTERVAL '1 minute');


        -- Tipo de venta.
        IF i % 5 = 0 THEN
            v_tipo := 'online';
        ELSE
            v_tipo := 'mostrador';
        END IF;


        -- Estado de venta.
        IF i % 19 = 0 THEN
            v_estado := 'cancelada';

        ELSIF v_tipo = 'online' THEN
            v_estado := 'retirada';

        ELSE
            v_estado := 'pagada';
        END IF;


        -- Método de pago.
        IF i % 2 = 0 THEN
            v_metodo := 'tarjeta';
        ELSE
            v_metodo := 'efectivo';
        END IF;


        -- Asignación de empleado según sucursal.
        IF v_tipo = 'online' THEN

            v_id_empleado := NULL;

        ELSIF v_id_sucursal = 1 THEN

            IF i % 2 = 0 THEN
                v_id_empleado := 2;
            ELSE
                v_id_empleado := 1;
            END IF;

        ELSIF v_id_sucursal = 2 THEN

            v_id_empleado := 3;

        ELSE

            v_id_empleado := 4;

        END IF;


        -- Obtener precios reales desde el catálogo.
        SELECT precio
        INTO v_precio1
        FROM producto
        WHERE id_producto = v_producto1;

        SELECT precio
        INTO v_precio2
        FROM producto
        WHERE id_producto = v_producto2;


        -- Calcular el total de la venta.
        v_total :=
            (v_precio1 * v_cantidad1)
            +
            (v_precio2 * v_cantidad2);


        -- Registrar venta.
        INSERT INTO venta (
            fecha,
            id_sucursal,
            id_empleado,
            id_cliente,
            total,
            tipo,
            estado,
            metodo_pago,
            tarjeta_ultimos_4
        )
        VALUES (
            v_fecha,
            v_id_sucursal,
            v_id_empleado,
            v_id_cliente,
            v_total,
            v_tipo,
            v_estado,
            v_metodo,
            CASE
                WHEN v_metodo = 'tarjeta' THEN '4242'
                ELSE NULL
            END
        )
        RETURNING id_venta INTO v_id_venta;


        -- Registrar primer producto.
        INSERT INTO detalleventa (
            id_venta,
            id_producto,
            cantidad,
            precio_unitario
        )
        VALUES (
            v_id_venta,
            v_producto1,
            v_cantidad1,
            v_precio1
        );


        -- Registrar segundo producto.
        INSERT INTO detalleventa (
            id_venta,
            id_producto,
            cantidad,
            precio_unitario
        )
        VALUES (
            v_id_venta,
            v_producto2,
            v_cantidad2,
            v_precio2
        );

    END LOOP;


    -- --------------------------------------------------------
    -- MARCAR SEED COMO EJECUTADO
    -- --------------------------------------------------------

    INSERT INTO pharmasphere_seed_control (clave)
    VALUES ('issue-26-demo-data-v1');

    RAISE NOTICE 'Se generaron 180 ventas de demostracion.';

END $$;
