import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import PageHero from "../components/PageHero.jsx";

export default function Home() {
  return (
    <>
      <Navbar activePage="Home" />

      <PageHero
        tag="Bem-vindo"
        title="Fatec Rooms"
        description="Gerencie suas reservas e visualize informações das salas."
      />

      <div className="content">
        <p>Esta é a página inicial.</p>
      </div>

      <Footer />
    </>
  );
}