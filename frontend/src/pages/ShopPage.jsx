import { AsyncProducts } from "../components/AsyncProducts";
import { HeroSection } from "../components/HeroSection";

export function ShopPage({ navigate }) {
  return <>
    <HeroSection navigate={navigate} showTrust={false} />
    <section className="section shop-products">
      <div className="container">
        <div className="section-head">
          <div><span className="eyebrow">Elegidos para vos</span><h2>Productos populares</h2></div>
          <button className="text-button" onClick={() => navigate("/productos")}>Ver todos →</button>
        </div>
        <AsyncProducts params={{ pageSize: 12 }} navigate={navigate} />
      </div>
    </section>
  </>;
}
