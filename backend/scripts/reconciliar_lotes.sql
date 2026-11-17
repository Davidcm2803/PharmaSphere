\set ON_ERROR_STOP on
\pset pager off

BEGIN;

SELECT 'ANTES' AS fase, count(*) AS descuadres
FROM (
    SELECT i.id_producto, i.id_sucursal
    FROM inventario i
    LEFT JOIN lote l ON l.id_producto = i.id_producto AND l.id_sucursal = i.id_sucursal
    GROUP BY i.id_producto, i.id_sucursal, i.cantidad
    HAVING i.cantidad <> COALESCE(SUM(l.cantidad), 0)
) t;

DO $$
DECLARE
    r RECORD;
    l RECORD;
    restante INT;
    quitar INT;
    creados INT := 0;
    recortados INT := 0;
BEGIN
    FOR r IN
        SELECT i.id_producto,
               i.id_sucursal,
               i.cantidad AS inv,
               COALESCE((
                   SELECT SUM(x.cantidad)
                   FROM lote x
                   WHERE x.id_producto = i.id_producto AND x.id_sucursal = i.id_sucursal
               ), 0) AS lotes
        FROM inventario i
        ORDER BY i.id_producto, i.id_sucursal
    LOOP
        IF r.inv > r.lotes THEN
            INSERT INTO lote (id_producto, id_sucursal, numero_lote, fecha_vencimiento, cantidad, cantidad_inicial)
            VALUES (
                r.id_producto,
                r.id_sucursal,
                'REG-' || r.id_producto || '-' || r.id_sucursal,
                CURRENT_DATE + (20 + ((r.id_producto * 37 + r.id_sucursal * 11) % 380)),
                r.inv - r.lotes,
                r.inv - r.lotes
            )
            ON CONFLICT ON CONSTRAINT lote_id_producto_id_sucursal_numero_lote_key
            DO UPDATE SET
                cantidad = lote.cantidad + EXCLUDED.cantidad,
                cantidad_inicial = lote.cantidad_inicial + EXCLUDED.cantidad_inicial;
            creados := creados + 1;
            RAISE NOTICE 'producto % sucursal %: lote REG con % unidades (inventario %, lotes %)',
                r.id_producto, r.id_sucursal, r.inv - r.lotes, r.inv, r.lotes;
        ELSIF r.inv < r.lotes THEN
            restante := r.lotes - r.inv;
            FOR l IN
                SELECT id_lote, numero_lote, cantidad
                FROM lote
                WHERE id_producto = r.id_producto
                  AND id_sucursal = r.id_sucursal
                  AND cantidad > 0
                ORDER BY (fecha_vencimiento < CURRENT_DATE), fecha_vencimiento, id_lote
                FOR UPDATE
            LOOP
                EXIT WHEN restante = 0;
                quitar := LEAST(l.cantidad, restante);
                UPDATE lote SET cantidad = cantidad - quitar WHERE id_lote = l.id_lote;
                restante := restante - quitar;
                RAISE NOTICE 'producto % sucursal %: lote % baja % unidades (inventario %, lotes %)',
                    r.id_producto, r.id_sucursal, l.numero_lote, quitar, r.inv, r.lotes;
            END LOOP;
            recortados := recortados + 1;
        END IF;
    END LOOP;
    RAISE NOTICE 'Resumen: % pares con lote REG creado, % pares con lotes recortados', creados, recortados;
END
$$;

SELECT 'DESPUES' AS fase, count(*) AS descuadres
FROM (
    SELECT i.id_producto, i.id_sucursal
    FROM inventario i
    LEFT JOIN lote l ON l.id_producto = i.id_producto AND l.id_sucursal = i.id_sucursal
    GROUP BY i.id_producto, i.id_sucursal, i.cantidad
    HAVING i.cantidad <> COALESCE(SUM(l.cantidad), 0)
) t;

SELECT 'LOTES SIN FILA DE INVENTARIO' AS aviso, count(*) AS cantidad
FROM (
    SELECT l.id_producto, l.id_sucursal
    FROM lote l
    LEFT JOIN inventario i ON i.id_producto = l.id_producto AND i.id_sucursal = l.id_sucursal
    WHERE i.id_inventario IS NULL AND l.cantidad > 0
    GROUP BY l.id_producto, l.id_sucursal
) t;

\if :{?commit}
    \echo '>>> COMMIT: cambios guardados'
    COMMIT;
\else
    \echo '>>> PRUEBA: no se guardo nada (ROLLBACK). Para guardar agrega -v commit=1'
    ROLLBACK;
\endif
