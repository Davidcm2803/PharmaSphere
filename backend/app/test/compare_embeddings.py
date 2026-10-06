import time

import numpy as np

from app.rag import embeddings

# modelos que se van a comparar
MODELS = [
    "paraphrase-multilingual-MiniLM-L12-v2",
    "intfloat/multilingual-e5-small",
    "intfloat/multilingual-e5-base",
]

# documentos de ejemplo con vocabulario de farmacia
DOCS = {
    "ibuprofeno": "El ibuprofeno es un antiinflamatorio que alivia el dolor, la inflamacion y la fiebre. Se toma con comida.",
    "paracetamol": "El paracetamol es un analgesico y antipiretico para el dolor leve y la fiebre. No exceder 4 gramos al dia.",
    "loratadina": "La loratadina es un antihistaminico que alivia los sintomas de la alergia como estornudos y picazon.",
    "omeprazol": "El omeprazol reduce el acido del estomago y se usa para la gastritis y el reflujo.",
    "amoxicilina": "La amoxicilina es un antibiotico que requiere receta medica y se usa en infecciones bacterianas.",
    "receta": "Politica de ventas: los medicamentos con receta solo se venden con una receta vigente y valida.",
    "vencimiento": "Los productos proximos a vencer se separan del inventario y se registran como movimiento de vencimiento.",
    "devolucion": "Politica de devoluciones: se aceptan cambios dentro de 8 dias con factura, salvo medicamentos refrigerados.",
    "vitamina_c": "La vitamina C fortalece el sistema inmunologico y se vende en tabletas efervescentes.",
    "jarabe_tos": "El jarabe para la tos alivia la tos seca y la irritacion de garganta en adultos y ninos.",
}

# cada pregunta con el documento que deberia salir primero
QUERIES = [
    ("que me puedo tomar para la fiebre", "paracetamol"),
    ("tengo dolor de cabeza y el cuerpo inflamado", "ibuprofeno"),
    ("medicina para la alergia y los estornudos", "loratadina"),
    ("me arde el estomago despues de comer", "omeprazol"),
    ("necesito un antibiotico para una infeccion", "amoxicilina"),
    ("puedo comprar un medicamento controlado sin receta", "receta"),
    ("que hacen con los productos vencidos", "vencimiento"),
    ("puedo devolver un producto que compre ayer", "devolucion"),
    ("algo para subir las defensas", "vitamina_c"),
    ("mi hijo tiene tos seca por la noche", "jarabe_tos"),
]


def evaluar(model_name: str) -> dict:
    # tiempo que tarda en cargar el modelo
    t0 = time.perf_counter()
    embeddings.get_model(model_name)
    carga = time.perf_counter() - t0

    # tiempo que tarda en generar los vectores
    ids = list(DOCS.keys())
    t0 = time.perf_counter()
    doc_vecs = np.array(
        embeddings.embed_texts(list(DOCS.values()), kind="passage", model_name=model_name)
    )
    query_vecs = np.array(
        [embeddings.embed_query(q, model_name=model_name) for q, _ in QUERIES]
    )
    embed = time.perf_counter() - t0

    # cuenta cuantas veces el documento correcto queda primero o en el top 3
    top1 = 0
    top3 = 0
    fallos = []
    for (pregunta, esperado), qv in zip(QUERIES, query_vecs):
        scores = doc_vecs @ qv
        orden = [ids[i] for i in np.argsort(-scores)]
        top1 += orden[0] == esperado
        top3 += esperado in orden[:3]
        if orden[0] != esperado:
            fallos.append((pregunta, esperado, orden[0]))

    return {
        "model": model_name,
        "dim": doc_vecs.shape[1],
        "top1": top1,
        "top3": top3,
        "carga": carga,
        "embed": embed,
        "fallos": fallos,
    }


def main() -> None:
    resultados = []
    for nombre in MODELS:
        print(f"\nProbando {nombre}")
        r = evaluar(nombre)
        resultados.append(r)
        for pregunta, esperado, obtenido in r["fallos"]:
            print(f"  fallo: {pregunta} esperaba {esperado} dio {obtenido}")

    # tabla final de resultados
    n = len(QUERIES)
    print("\n" + "=" * 92)
    print(f"{'modelo':<42}{'dim':>5}{'top1':>8}{'top3':>8}{'carga(s)':>11}{'embed(s)':>11}")
    print("-" * 92)
    for r in resultados:
        print(
            f"{r['model']:<42}{r['dim']:>5}{r['top1']:>5}/{n:<2}{r['top3']:>5}/{n:<2}"
            f"{r['carga']:>11.1f}{r['embed']:>11.2f}"
        )


if __name__ == "__main__":
    main()