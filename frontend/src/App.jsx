import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  const stats = [
    { label: "Productos", value: "2,438", trend: "+4.2%" },
    { label: "Ventas", value: "$1,240", trend: "+12%" },
    { label: "Stock", value: "8", trend: "-2" },
    { label: "Vence", value: "23", trend: "+3" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-xl font-bold text-emerald-600">
            PharmaSphere
          </span>
          <div className="flex gap-3">
            <button className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Login
            </button>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-emerald-700">
              Register
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Lmaooooooooo H11111
          </h1>
          <p className="mt-1 text-slate-500">
            test p
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              <span
                className={`mt-1 inline-block text-xs font-medium ${
                  stat.trend.startsWith("+")
                    ? "text-emerald-600"
                    : "text-red-500"
                }`}
              >
                {stat.trend} vs ayer
              </span>
            </div>
          ))}
        </section>

        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold">Alertas de inventario</h2>
            <ul className="mt-4 divide-y divide-slate-100">
              {[
                { name: "Pastilla 500mg", status: "Stock", color: "bg-red-100 text-red-700" },
                { name: "Cum 50mg", status: "Vencee", color: "bg-amber-100 text-amber-700" },
                { name: "Lmao 400mg", status: "Stock bajo", color: "bg-amber-100 text-amber-700" },
              ].map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between py-3"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {item.name}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${item.color}`}
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Prueba </h2>
            <p className="mt-2 text-sm text-slate-500">
              Contador
            </p>
            <button
              onClick={() => setCount((c) => c + 1)}
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-95"
            >
              Clicks: {count}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
