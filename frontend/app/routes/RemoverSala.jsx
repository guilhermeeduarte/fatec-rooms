import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export default function RemoverSala() {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const roomId = query.get("id");

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
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
      setLoading(false);
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
        setRoom(data);
      } catch (err) {
        setError(err.message || "Erro ao buscar sala.");
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
  }, [navigate, roomId]);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const token = localStorage.getItem("token");

    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Falha ao remover a sala.");
      }

      setSuccess("Sala removida com sucesso.");
      setTimeout(() => navigate("/gerenciar-salas"), 800);
    } catch (err) {
      setError(err.message || "Erro ao remover sala.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Navbar activePage="Remover Sala" />
      <PageHero
        tag="Exclusão"
        title="Remover Sala"
        description="Confirme antes de excluir uma sala do sistema." 
      />

      <div className="content">
        {loading ? (
          <div className="form-title">Carregando sala...</div>
        ) : error ? (
          <div className="form-title">Erro: {error}</div>
        ) : (
          <>
            <div className="form-title">Confirmar exclusão</div>
            <div className="dashboard-panel">
              <p className="modal-desc">Tem certeza que deseja remover a sala abaixo? Esta ação não pode ser desfeita.</p>
              <div className="form-group">
                <label>Nome</label>
                <input type="text" value={room.name} readOnly />
              </div>
              <div className="form-group">
                <label>Localização</label>
                <input type="text" value={room.location || "-"} readOnly />
              </div>
              <div className="form-group">
                <label>Observações</label>
                <textarea value={room.notes || "Sem observações"} readOnly />
              </div>

              <div className="modal-acoes" style={{ marginTop: "16px" }}>
                <Link className="modal-btn-cancelar" to="/gerenciar-salas">
                  Cancelar
                </Link>
                <button
                  className="modal-btn-confirmar-red"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Removendo..." : "Remover sala"}
                </button>
              </div>

              {success && <div className="success-msg"><p>{success}</p></div>}
              {error && <div className="success-msg"><p>Erro: {error}</p></div>}
            </div>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
