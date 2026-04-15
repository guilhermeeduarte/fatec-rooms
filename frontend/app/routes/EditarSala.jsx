import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export default function EditarSala() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const roomId = query.get("id");

  const [name, setName] = useState("");
  const [locationValue, setLocationValue] = useState("");
  const [bookable, setBookable] = useState(true);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const authlevel = localStorage.getItem("authlevel");
    if (authlevel !== "1") {
      navigate("/");
      return;
    }

    if (!roomId) {
      setError("ID da sala não informado.");
      setLoadingRoom(false);
      return;
    }

    async function loadRoom() {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch(`/api/rooms/${roomId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Falha ao carregar a sala.");
        }

        const data = await response.json();
        setName(data.name || "");
        setLocationValue(data.location || "");
        setBookable(data.bookable === 1);
        setNotes(data.notes || "");
      } catch (err) {
        setError(err.message || "Erro ao buscar sala.");
      } finally {
        setLoadingRoom(false);
      }
    }

    loadRoom();
  }, [navigate, roomId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          location: locationValue.trim(),
          bookable: bookable ? 1 : 0,
          notes: notes.trim(),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Falha ao atualizar a sala.");
      }

      setSuccess("Sala atualizada com sucesso.");
    } catch (err) {
      setError(err.message || "Erro ao atualizar sala.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar activePage="Editar Sala" />
      <PageHero
        tag="Gerenciar"
        title="Editar Sala"
        description="Ajuste os dados de uma sala existente." 
      />

      <div className="content">
        {loadingRoom ? (
          <div className="form-title">Carregando sala...</div>
        ) : error ? (
          <div className="form-title">Erro: {error}</div>
        ) : (
          <>
            <div className="form-title">Editar sala</div>
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
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Disponível para reserva</label>
                <select
                  value={bookable ? "1" : "0"}
                  onChange={(e) => setBookable(e.target.value === "1")}
                >
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
                {loading ? "Atualizando..." : "Salvar alterações"}
              </button>

              {success && <div className="success-msg"><p>{success}</p></div>}
              {error && <div className="success-msg"><p>Erro: {error}</p></div>}
            </form>
          </>
        )}

        <div className="section-title section-title--top-space">
          <Link className="see-all" to="/gerenciar-salas">Voltar ao gerenciamento</Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
