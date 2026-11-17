import { useCallback, useEffect, useState } from "react";
import {
  cerrarCasoEscalado,
  listCasosEscalados,
  reabrirCasoEscalado,
  tomarCasoEscalado,
} from "../services/casoEscaladoService";

export default function useCasosEscalados({ estado = "", nivel = "" } = {}) {
  const [casos, setCasos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actuandoId, setActuandoId] = useState(null); // id_caso con una accion en curso

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCasosEscalados({
        estado: estado || undefined,
        nivel: nivel || undefined,
        page,
        page_size: pageSize,
      });
      setCasos(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [estado, nivel, page, pageSize]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const conAccion = useCallback(async (idCaso, accion) => {
    setActuandoId(idCaso);
    setError(null);
    try {
      const actualizado = await accion(idCaso);
      setCasos((prev) => prev.map((c) => (c.id_caso === idCaso ? actualizado : c)));
    } catch (err) {
      setError(err.message);
    } finally {
      setActuandoId(null);
    }
  }, []);

  const tomar = useCallback((idCaso) => conAccion(idCaso, tomarCasoEscalado), [conAccion]);
  const cerrar = useCallback((idCaso) => conAccion(idCaso, cerrarCasoEscalado), [conAccion]);
  const reabrir = useCallback((idCaso) => conAccion(idCaso, reabrirCasoEscalado), [conAccion]);

  return { casos, total, page, pageSize, setPage, loading, error, actuandoId, tomar, cerrar, reabrir, recargar: cargar };
}