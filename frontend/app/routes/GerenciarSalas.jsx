import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import Popup from "../components/Popup";

export default function GerenciarSalas() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para o modal de confirmação
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  useEffect(() => {
    const authlevel = localStorage.getItem("authlevel");
    if (authlevel !== "1") {
      navigate("/");
      return;
    }
    async function loadRooms() {
      const token = localStorage.getItem("token");
      try {
        const response = await fetch("/api/rooms/all", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          throw new Error("Falha ao carregar as salas.");
        }
        const data = await response.json();
        setRooms(data || []);
      } catch (err) {
        setError(err.message || "Erro ao buscar salas.");
      } finally {
        setLoading(false);
      }
    }
    loadRooms();
  }, [navigate]);

  function getStatusLabel(bookable) {
    return bookable === 1 ? "Ativa" : "Desativada";
  }
  function getStatusClass(bookable) {
    return bookable === 1 ? "status-ok" : "status-red";
  }

  function openDeleteModal(room) {
    setRoomToDelete(room);
    setShowDeleteModal(true);
  }

  async function confirmDeleteRoom() {
    if (!roomToDelete) return;

    const token = localStorage.getItem("token");
    setDeleting(true);

    try {
      const response = await fetch(`/api/rooms/${roomToDelete.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage = "Falha ao remover a sala.";

        try {
          const errorData = await response.json();
          // Tratamento específico para erro de reservas vinculadas
          if (response.status === 500 || errorData.message?.includes("reserva") || errorData.error?.includes("reserva")) {
            errorMessage = `Não é possível remover a sala "${roomToDelete.name}". Existem reservas vinculadas a esta sala.`;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          const textError = await response.text();
          if (textError.includes("reserva") || textError.includes("booking")) {
            errorMessage = `Não é possível remover a sala "${roomToDelete.name}". Existem reservas vinculadas a esta sala.`;
          } else {
            errorMessage = textError || "Falha ao remover a sala.";
          }
        }

        throw new Error(errorMessage);
      }

      // Remove a sala da lista localmente
      setRooms(prev => prev.filter(room => room.id !== roomToDelete.id));
      setPopupMessage(`Sala "${roomToDelete.name}" removida com sucesso.`);
      setShowPopup(true);

      // Fecha o popup após 3 segundos
      setTimeout(() => setShowPopup(false), 3000);
    } catch (err) {
      setPopupMessage(err.message);
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 4000); // Tempo maior para ler a mensagem
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      setRoomToDelete(null);
    }
  }

  return (
      <>
        <Navbar activePage="Gerenciar Salas" />
        <PageHero
            tag="Gerenciamento"
            title="Gerenciamento de Salas"
            description="Veja todas as salas cadastradas e acesse as ações de adicionar, editar ou remover."
        />
        <div className="content plok" style={{boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px",marginTop: "2em", marginBottom: "3em"}}>
          <div className="section-title">
            Salas cadastradas
            <Link className="see-all" to="/cadastro-salas">
              Adicionar sala
            </Link>
          </div>
          {loading && <div className="form-title">Carregando salas...</div>}
          {error && <div className="form-title">Erro: {error}</div>}
          {!loading && !error && rooms.length === 0 && (
              <div className="form-title">Nenhuma sala cadastrada encontrada.</div>
          )}
          <div className="reservas-list">
            {rooms.map((room) => (
                <div key={room.id} className="reserva-item" style={{flexDirection:"column"}}>
                  <div>
                    <div className="reserva-sala">{room.name}</div>
                    <div className="reserva-prof">{room.location || "Local não definido"}</div>
                    <div className="reserva-prof">{room.notes || "Sem observações"}</div>
                  </div>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", marginTop:"8px"}}>
                    <div className={`reserva-status ${getStatusClass(room.bookable)}`}>
                      {getStatusLabel(room.bookable)}
                    </div>
                    <div style={{display:"flex", gap:"8px"}}>
                      <Link className="btn-action btn-secondary" to={`/salas-editar?id=${room.id}`}>
                        Editar
                      </Link>
                      <button
                          className="btn-action btn-danger"
                          onClick={() => openDeleteModal(room)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Modal de confirmação de exclusão de sala */}
        {showDeleteModal && roomToDelete && (
            <div className="modal-overlay">
              <div className="confirm-modal">
                <div className="confirm-icon">!</div>
                <h2>Confirmar exclusão</h2>
                <p>
                  Tem certeza que deseja excluir a sala <strong>{roomToDelete.name}</strong>?
                  <br />
                  <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>
                Esta ação não pode ser desfeita.
              </span>
                </p>
                <div className="confirm-buttons">
                  <button
                      className="sonic"
                      onClick={() => {
                        setShowDeleteModal(false);
                        setRoomToDelete(null);
                      }}
                      disabled={deleting}
                  >
                    Cancelar
                  </button>
                  <button
                      className="btn-action btn-danger"
                      onClick={confirmDeleteRoom}
                      disabled={deleting}
                  >
                    {deleting ? "Excluindo..." : "Sim, excluir"}
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Popup de sucesso */}
        {showPopup && (
            <Popup message={popupMessage} onClose={() => setShowPopup(false)} type="success" />
        )}

        {/* Popup de erro */}
        {showErrorPopup && (
            <Popup message={popupMessage} onClose={() => setShowErrorPopup(false)} type="error" />
        )}

        <Footer />
      </>
  );
}