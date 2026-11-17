import Hero from "../../components/home/HeroSection";
import CategoriesSection from "../../components/home/CategoriesSection";
import FeaturedProducts from "../../components/home/FeaturedProducts";

// El Navbar y el Footer los pone PublicLayout; aquí solo van las secciones del inicio
export default function Home() {
  return (
    <>
      <Hero />
      <FeaturedProducts />
      <CategoriesSection />
    </>
  );
}