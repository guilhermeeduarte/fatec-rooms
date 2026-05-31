import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Popup from "../components/Popup";
import { LoadingState, ErrorState } from "../components/PageState";

export default function CoordenadorSolicitacoes() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  // Modal para rejeitar
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingReserva, setRejectingReserva] = useState(null);
  const [notaRejeicao, setNotaRejeicao] = useState("");
  const [rejectError, setRejectError] = useState("");

  // Modal para aprovar
  const [showConfirmAprovarModal, setShowConfirmAprovarModal] = useState(false);
  const [reservaToApprove, setReservaToApprove] = useState(null);

  // Popup de erro
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");

  // FILTROS
  const [busca, setBusca] = useState("");

  function traduzirStatus(status) {
    switch ((status || "").toUpperCase()) {
      case "PENDING":
      case "PENDENTE":
        return "Pendente";
      case "APPROVED":
      case "ACEITA":
        return "Aceita";
      case "REJECTED":
      case "RECUSADA":
        return "Recusada";
      case "CANCELLED":
      case "CANCELADA":
        return "Cancelada";
      default:
        return status;
    }
  }

  async function loadReservas(pageNum = 0, append = false) {
    const token = localStorage.getItem("token");
    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const response = await fetch(
          `/api/bookings/admin/by-status?status=PENDING&page=${pageNum}&size=${PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      if (!response.ok) throw new Error("Falha ao carregar as solicitações.");

      const data = await response.json();
      const mapped = (data.content || []).map((reserva) => {
        const periods = reserva.periods || [];
        const first = periods[0];
        const last = periods[periods.length - 1];
        const createdAt = reserva.createdAt?.split("T")[0] || "";

        return {
          id: reserva.id,
          data: reserva.bookingDate?.split("-").reverse().join("/") || "",
          dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
          espaco: reserva.roomName,
          professor: reserva.userDisplayName || reserva.username || "Desconhecido",
          horaInicio: first?.periodStart?.slice(0, 5) || "--:--",
          horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
          motivo: extrairMotivo(reserva.notes) || reserva.subject || "",
          status: "Pendente",
        };
      });

      setReservas(prev => append ? [...prev, ...mapped] : mapped);
      setHasMore(!data.last);
    } catch (err) {
      setError(err.message || "Erro ao carregar solicitações.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { loadReservas(0); }, []);

  function extrairMotivo(notes) {
    if (!notes) return "";
    const motivoParte = notes.split(/\nCurso:/i)[0];
    return motivoParte.trim();
  }

  // Função para abrir modal de confirmação de aprovação
  function openConfirmAprovarModal(reserva) {
    setReservaToApprove(reserva);
    setShowConfirmAprovarModal(true);
  }

  // Função para confirmar aprovação
  async function handleConfirmAprovar() {
    if (!reservaToApprove) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Faça login para aprovar a solicitação.");
      return;
    }

    try {
      const response = await fetch(`/api/bookings/admin/${reservaToApprove.id}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approved: true }),
      });
      if (!response.ok) {
        throw new Error("Falha ao aprovar a solicitação.");
      }
      setReservas((prev) => prev.filter((r) => r.id !== reservaToApprove.id));
      setShowConfirmAprovarModal(false);
      setReservaToApprove(null);
    } catch (err) {
      setError(err.message || "Erro ao aprovar a solicitação.");
    }
  }

  // Função para abrir modal de rejeição
  function openRejectModal(reserva) {
    setRejectingReserva(reserva);
    setNotaRejeicao("");
    setRejectError("");
    setShowRejectModal(true);
  }

  // Função para confirmar rejeição com validação
  async function handleConfirmReject() {
    // Validação: motivo é obrigatório
    if (!notaRejeicao.trim()) {
      setRejectError("O motivo da rejeição é obrigatório.");
      return;
    }

    if (!rejectingReserva) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setPopupMessage("Faça login para rejeitar a solicitação.");
      setShowErrorPopup(true);
      setShowRejectModal(false);
      return;
    }

    try {
      const response = await fetch(`/api/bookings/admin/${rejectingReserva.id}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approved: false, rejectReason: notaRejeicao }),
      });
      if (!response.ok) {
        throw new Error("Falha ao rejeitar a solicitação.");
      }
      setReservas((prev) => prev.filter((r) => r.id !== rejectingReserva.id));
      setShowRejectModal(false);
      setRejectingReserva(null);
      setNotaRejeicao("");
      setRejectError("");

      // Opcional: mostrar popup de sucesso
      setPopupMessage("Reserva rejeitada com sucesso!");
      setShowErrorPopup(true);
      setTimeout(() => setShowErrorPopup(false), 3000);
    } catch (err) {
      setPopupMessage(err.message || "Erro ao rejeitar a solicitação.");
      setShowErrorPopup(true);
    }
  }

  const reservasFiltradas = reservas.filter((reserva) => {
    const buscaLower = busca.toLowerCase();
    return (
        reserva.espaco.toLowerCase().includes(buscaLower) ||
        reserva.professor.toLowerCase().includes(buscaLower) ||
        reserva.motivo.toLowerCase().includes(buscaLower)
    );
  });

  function loadMore() {
    if (!hasMore) return;
    const next = page + 1;
    setPage(next);
    loadReservas(next, true);
  }

  // Função para tentar recarregar os dados
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    loadReservas(0);
  };

  // Estado de loading
  if (loading) {
    return (
        <LoadingState
            activePage="Coordenação"
            heroTag="Área do Coordenador"
            heroTitle="Solicitações de Reserva"
            heroDescription="Aprove ou rejeite as solicitações de reservas pendentes."
            description="Carregando solicitações pendentes..."
        />
    );
  }

  // Estado de erro
  if (error) {
    return (
        <ErrorState
            error={error}
            title="Erro ao carregar solicitações"
            onRetry={handleRetry}
            onBack={() => window.location.href = "/"}
            activePage="Coordenação"
            heroTag="Área do Coordenador"
            heroTitle="Solicitações de Reserva"
            heroDescription="Aprove ou rejeite as solicitações de reservas pendentes."
        />
    );
  }

  return (
      <>
        <Navbar activePage="Coordenação" />

        <PageHero
            title="Solicitações de Reserva"
            tag="Área do Coordenador"
            description="Aprove ou rejeite as solicitações de reservas pendentes."
        />

        <div className="layout-reservas">
          <div className="lado-direito">

            {/* BUSCA */}
            <div className="filtros">
              <input
                  type="text"
                  placeholder="Buscar por professor, sala ou motivo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="input-busca"
              />
            </div>

            {/* LISTA DE SOLICITAÇÕES */}
            <div className="container-reservas">
              {!loading && !error && reservasFiltradas.length === 0 && (
                  <div className="empty-state">
                    {busca ? "Nenhuma solicitação corresponde à busca." : "Nenhuma solicitação pendente."}
                  </div>
              )}
              {reservasFiltradas.map((reserva) => (
                  <div
                      key={reserva.id}
                      className="card-reserva pendente"
                      id={`reserva-${reserva.id}`}
                  >
                    <div className="info-reserva completa">

                      <div className="item-reserva">
                        <span className="label">Professor</span>
                        <span className="valor">{reserva.professor}</span>
                      </div>

                      <div className="item-reserva">
                        <span className="label">Espaço</span>
                        <span className="valor">{reserva.espaco}</span>
                      </div>

                      <div className="item-reserva">
                        <span className="label">Data da Reserva</span>
                        <span className="valor">{reserva.data}</span>
                      </div>

                      <div className="item-reserva">
                        <span className="label">Horário</span>
                        <span className="valor">
                          {reserva.horaInicio} - {reserva.horaFim}
                        </span>
                      </div>

                      <div className="item-reserva">
                        <span className="label">Data da Solicitação</span>
                        <span className="valor">{reserva.dataSolicitacao}</span>
                      </div>

                      <div className="item-reserva">
                        <span className="label">Motivo</span>
                        <span className="valor">{reserva.motivo}</span>
                      </div>

                    </div>

                    <div className="acoes">
                      <button
                          className="btn-aprovar"
                          onClick={() => openConfirmAprovarModal(reserva)}
                      >
                        Aprovar
                      </button>
                      <button
                          className="btn-action btn-danger"
                          onClick={() => openRejectModal(reserva)}
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
              ))}
            </div>

          </div>
        </div>

        {hasMore && reservasFiltradas.length > 0 && (
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <button className="btn-submit" onClick={loadMore} disabled={loadingMore} style={{ width: "200px" }}>
                {loadingMore ? "Carregando..." : "Carregar mais"}
              </button>
            </div>
        )}

        {/* Modal de confirmação de aprovação */}
        {showConfirmAprovarModal && reservaToApprove && (
            <div className="modal-overlay">
              <div className="confirm-modal">
                <div className="confirm-icon" style={{background: "#dcfce7"}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                       fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"
                       strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <h2>Confirmar aprovação</h2>
                <p>
                  Tem certeza que deseja aprovar esta reserva?
                  <br />
                  <strong>{reservaToApprove.espaco}</strong> - {reservaToApprove.data} - {reservaToApprove.horaInicio} às {reservaToApprove.horaFim}
                  <br />
                  <span style={{ fontSize: "0.8rem", color: "#16a34a", display: "block", marginTop: "8px" }}>
                    Professor: {reservaToApprove.professor}
                  </span>
                </p>
                <div className="confirm-buttons">
                  <button
                      className="sonic"
                      onClick={() => {
                        setShowConfirmAprovarModal(false);
                        setReservaToApprove(null);
                      }}
                  >
                    Cancelar
                  </button>
                  <button
                      className="btn-action btn-success"
                      onClick={handleConfirmAprovar}
                  >
                    Sim, aprovar
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Modal de rejeição com validação */}
        {showRejectModal && rejectingReserva && (
            <div className="modal-overlay">
              <div className="confirm-modal" style={{ maxWidth: "450px" }}>
                <div className="confirm-icon" style={{background: "#fee2e2"}}>
                  !
                </div>
                <h2>Rejeitar reserva</h2>
                <p>
                  Tem certeza que deseja rejeitar esta reserva?
                  <br />
                  <strong>{rejectingReserva.espaco}</strong> - {rejectingReserva.data} - {rejectingReserva.horaInicio} às {rejectingReserva.horaFim}
                  <br />
                  <span style={{ fontSize: "0.8rem", color: "#dc2626", display: "block", marginTop: "8px" }}>
                    Professor: {rejectingReserva.professor}
                  </span>
                </p>

                <div style={{ marginTop: "16px", textAlign: "left" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
                    Motivo (obrigatório):
                  </label>
                  <textarea
                      value={notaRejeicao}
                      onChange={(e) => {
                        setNotaRejeicao(e.target.value);
                        if (e.target.value.trim()) {
                          setRejectError("");
                        }
                      }}
                      placeholder="Digite o motivo da rejeição..."
                      rows="3"
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: rejectError ? "1px solid #dc2626" : "1px solid #d1d5db",
                        fontSize: "0.85rem",
                        fontFamily: "inherit",
                        resize: "vertical"
                      }}
                  />
                  {rejectError && (
                      <div style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "4px" }}>
                        {rejectError}
                      </div>
                  )}
                </div>

                <div className="confirm-buttons" style={{ marginTop: "20px" }}>
                  <button
                      className="sonic"
                      onClick={() => {
                        setShowRejectModal(false);
                        setRejectingReserva(null);
                        setNotaRejeicao("");
                        setRejectError("");
                      }}
                  >
                    Cancelar
                  </button>
                  <button
                      className="btn-action btn-danger"
                      onClick={handleConfirmReject}
                  >
                    Sim, rejeitar
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Popup de erro/sucesso */}
        {showErrorPopup && (
            <Popup
                message={popupMessage}
                onClose={() => setShowErrorPopup(false)}
                type={popupMessage.includes("sucesso") ? "success" : "error"}
            />
        )}

        <Footer />
      </>
  );
}