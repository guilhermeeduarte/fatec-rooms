import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export default function AdicionarSala() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bookable, setBookable] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const authlevel = localStorage.getItem("authlevel");
    if (authlevel !== "1") {
      navigate("/");
    }
  }, [navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("token");
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim(),
          bookable: bookable ? 1 : 0,
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Falha ao adicionar sala.");
      }

      setSuccess("Sala cadastrada com sucesso.");
      setName("");
      setLocation("");
      setBookable(true);
      setNotes("");
    } catch (err) {
      setError(err.message || "Erro ao adicionar sala.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar activePage="Adicionar Sala" />
      <PageHero
        tag="Novo cadastro"
        title="Adicionar Sala"
        description="Cadastre uma nova sala para uso nas reservas." 
      />

      <div className="content">
        <div className="form-title">Adicionar nova sala</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome da sala</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Localização</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Disponível para reserva</label>
            <select value={bookable ? "1" : "0"} onChange={(e) => setBookable(e.target.value === "1") }>
              <option value="1">Sim</option>
              <option value="0">Não</option>
            </select>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button className="btn-submit" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar sala"}
          </button>

          {success && <div className="success-msg"><p>{success}</p></div>}
          {error && <div className="success-msg"><p>Erro: {error}</p></div>}
        </form>

        <div className="section-title section-title--top-space">
          <Link className="see-all" to="/gerenciar-salas">Voltar ao gerenciamento</Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
