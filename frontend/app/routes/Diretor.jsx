import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";


export async function loader() {
  return null;
}

const stats = [
  {
    highlight: true,
    number: 12,
    label: "Salas ativas",
  },
  {
    number: 37,
    label: "Reservas hoje",
  },
  {
    number: 28,
    label: "Professores",
  },
  {
    number: 3,
    label: "Pendentes",
  },
];

export default function Diretor() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Navbar activePage="Área do Diretor" />

      <PageHero
        variant="diretor"
        tag="Painel Administrativo"
        title="Área do Diretor"
        description="Gerencie salas, professores e reservas."
      />

      <div className="stats-row">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-number">{s.number}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <button onClick={() => setModalOpen(true)}>
        Gerenciar salas
      </button>

      {modalOpen && (
        <div>
          modal aberto
          <button onClick={() => setModalOpen(false)}>
            fechar
          </button>
        </div>
      )}

      <Footer />
    </>
  );
}