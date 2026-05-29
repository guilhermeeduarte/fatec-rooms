import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Popup from "../components/Popup";
import { Search } from 'lucide-react';
import "../styles/todasReservas.css";

export default function MinhasReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const [editandoId, setEditandoId] = useState(null);
  const [novoMotivo, setNovoMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Estados para o modal de confirmação de cancelamento
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedReserva, setSelectedReserva] = useState(null);

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({ sala: "", periodo: "", curso: "" });

  function extrairCurso(notes) {
    if (!notes) return "";
    const match = notes.match(/Curso:\s*([^,\n]+)/i);
    return match ? match[1].trim() : "";
  }

  function extrairMotivo(notes) {
    if (!notes) return "";
    const motivoParte = notes.split(/\nCurso:/i)[0];
    return motivoParte.trim();
  }

  function extrairPeriodo(startTime) {
    if (!startTime) return "";
    const h = parseInt(startTime.slice(0, 2), 10);
    if (h < 12) return "Manhã";
    if (h < 18) return "Tarde";
    return "Noite";
  }

  function traduzirStatus(status) {
    switch ((status || "").toUpperCase()) {
      case "PENDING":   return "Pendente";
      case "APPROVED":  return "Aceita";
      case "REJECTED":  return "Recusada";
      case "CANCELLED": return "Cancelada";
      default: return status || "Pendente";
    }
  }

  async function carregar() {
    const token = localStorage.getItem("token");
    if (!token) { setError("Faça login para ver suas reservas."); setLoading(false); return; }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/bookings/my", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Falha ao carregar suas reservas.");
      const data = await res.json();
      setReservas(data.map((r) => {
        const periods = r.periods || [];
        const first = periods[0];
        const last = periods[periods.length - 1];
        const startTime = first?.periodStart?.slice(0, 5) || "";

        const notes = r.notes || "";
        const motivo = extrairMotivo(notes);
        const curso = extrairCurso(notes);

        return {
          id: r.id,
          data: r.bookingDate?.split("-").reverse().join("/") || "",
          rawDate: r.bookingDate || "",
          espaco: r.roomName || "",
          horaInicio: startTime,
          horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
          motivo: motivo || r.subject || "—",
          status: traduzirStatus(r.status),
          periodo: extrairPeriodo(startTime),
          curso: curso || "—",
          notesOriginal: notes,
        };
      }));
    } catch (err) {
      setError(err.message || "Erro ao carregar suas reservas.");
      setShowErrorPopup(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function iniciarEdicao(reserva) {
    setEditandoId(reserva.id);
    setNovoMotivo(reserva.motivo);
  }
  function cancelarEdicao() {
    setEditandoId(null);
    setNovoMotivo("");
  }

  async function salvarEdicao(id) {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Faça login para editar.");
      setShowErrorPopup(true);
      return;
    }
    try {
      setSalvando(true);

      const reservaOriginal = reservas.find(r => r.id === id);
      let cursoParte = "";
      const cursoMatch = reservaOriginal?.notesOriginal?.match(/Curso:\s*([^\n]+)/i);
      if (cursoMatch) {
        cursoParte = `\nCurso: ${cursoMatch[1]}`;
      }

      let novoNotes = novoMotivo;
      if (cursoParte) {
        novoNotes = novoMotivo + cursoParte;
      }

      const res = await fetch(`/api/bookings/${id}/notes`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ notes: novoNotes }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Falha ao atualizar o motivo.");
      }

      setReservas((prev) => prev.map((r) =>
          r.id === id
              ? {
                ...r,
                motivo: novoMotivo,
                notesOriginal: novoNotes,
                curso: cursoMatch ? cursoMatch[1] : "—"
              }
              : r
      ));

      setEditandoId(null);
      setNovoMotivo("");
      setSuccess("Motivo atualizado com sucesso.");
      setShowSuccessPopup(true);

    } catch (err) {
      setError(err.message || "Erro ao salvar.");
      setShowErrorPopup(true);
    } finally {
      setSalvando(false);
    }
  }

  // Função para abrir o modal de confirmação
  function openConfirmCancelModal(reserva) {
    setSelectedReserva(reserva);
    setShowConfirmModal(true);
  }

  // Função para confirmar o cancelamento
  async function handleConfirmCancel() {
    if (!selectedReserva) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Faça login para cancelar a reserva.");
      setShowErrorPopup(true);
      setShowConfirmModal(false);
      setSelectedReserva(null);
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${selectedReserva.id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao cancelar a reserva.");

      setReservas((prev) => prev.map((r) =>
          r.id === selectedReserva.id ? { ...r, status: "Cancelada" } : r
      ));

      setSuccess("Reserva cancelada com sucesso.");
      setShowSuccessPopup(true);
      setShowConfirmModal(false);
      setSelectedReserva(null);
    } catch (err) {
      setError(err.message || "Erro ao cancelar.");
      setShowErrorPopup(true);
    }
  }

  const hasActiveFilters = busca || statusFiltro || dataFiltro ||
      filtrosAvancados.sala || filtrosAvancados.periodo || filtrosAvancados.curso;

  const limparFiltros = () => {
    setBusca(""); setStatusFiltro(""); setDataFiltro("");
    setFiltrosAvancados({ sala: "", periodo: "", curso: "" });
    setShowAdvancedFilters(false);
  };

  const reservasFiltradas = reservas.filter((r) => {
    const q = busca.toLowerCase();
    const matchBusca = !busca ||
        r.espaco.toLowerCase().includes(q) || r.motivo.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) || r.curso.toLowerCase().includes(q);
    const matchStatus = !statusFiltro || r.status === statusFiltro;
    const matchData = !dataFiltro || r.rawDate === dataFiltro;
    const matchSala = !filtrosAvancados.sala || r.espaco.toLowerCase().includes(filtrosAvancados.sala.toLowerCase());
    const matchPeriodo = !filtrosAvancados.periodo || r.periodo === filtrosAvancados.periodo;
    const matchCurso = !filtrosAvancados.curso || r.curso.toLowerCase().includes(filtrosAvancados.curso.toLowerCase());
    return matchBusca && matchStatus && matchData && matchSala && matchPeriodo && matchCurso;
  });

  const statusColor = (s) => {
    if (s === "Aceita") return "#166534";
    if (s === "Pendente") return "#d97706";
    return "#991b1b";
  };
  const statusBg = (s) => {
    if (s === "Aceita") return "#dcfce7";
    if (s === "Pendente") return "#fef9c3";
    return "#fee2e2";
  };
  const borderColor = (s) => {
    if (s === "Aceita") return "#22c55e";
    if (s === "Pendente") return "#f59e0b";
    return "#ef4444";
  };

  const podeEditar = (r) => r.status === "Pendente" || r.status === "Aceita";
  const podeAcionar = (r) => r.status !== "Cancelada" && r.status !== "Recusada";

  return (
      <div className="tr-page">
        <Navbar activePage="Minhas Reservas" />
        <PageHero
            title="Minhas Reservas"
            tag="Área do Professor"
            description="Visualize, filtre e gerencie suas reservas."
        />

        <main className="tr-main">
          {/* ── Filtros (estilo TodasReservas) ── */}
          <div className="tr-filters">
            <div className="tr-filters__row">
              <input
                  type="text"
                  placeholder="Buscar por sala, motivo, solicitante ou status…"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="tr-filters__search"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'%3E%3C/circle%3E%3Cline x1='21' y1='21' x2='16.65' y2='16.65'%3E%3C/line%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "12px center",
                    backgroundSize: "18px",
                    paddingLeft: "38px"
                  }}
              />
              <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="tr-filters__select">
                <option value="">Todos os status</option>
                <option value="Pendente">Pendente</option>
                <option value="Aceita">Aceita</option>
                <option value="Cancelada">Cancelada</option>
                <option value="Recusada">Recusada</option>
              </select>
            </div>

            <div className="tr-filters__row tr-filters__row--dates">
              <div className="tr-filters__date-group">
                <label>Data da reserva</label>
                <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} />
              </div>
              <div className="tr-filters__actions">
                <button
                    className="tr-filters__btn-toggle"
                    onClick={() => setShowAdvancedFilters(v => !v)}
                >
                  {showAdvancedFilters ? "▲ Menos filtros" : "▼ Mais filtros"}
                </button>
                <button className="tr-filters__btn-clear" onClick={limparFiltros}>
                  Limpar
                </button>
              </div>
            </div>

            {showAdvancedFilters && (
                <div className="tr-filters__advanced">
                  <input
                      type="text"
                      placeholder="Sala"
                      value={filtrosAvancados.sala}
                      onChange={e => setFiltrosAvancados({ ...filtrosAvancados, sala: e.target.value })}
                  />
                  <select
                      value={filtrosAvancados.periodo}
                      onChange={e => setFiltrosAvancados({ ...filtrosAvancados, periodo: e.target.value })}
                  >
                    <option value="">Período</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                  <input
                      type="text"
                      placeholder="Curso"
                      value={filtrosAvancados.curso}
                      onChange={e => setFiltrosAvancados({ ...filtrosAvancados, curso: e.target.value })}
                  />
                </div>
            )}
          </div>

          {/* ── Contador de resultados ── */}
          <p className="tr-count">
            {loading ? "Carregando…" : `${reservasFiltradas.length} reserva${reservasFiltradas.length !== 1 ? "s" : ""} encontrada${reservasFiltradas.length !== 1 ? "s" : ""}`}
          </p>

          {/* ── Erro ── */}
          {error && <div className="tr-error">{error}</div>}

          {/* ── Lista ── */}
          <div className="tr-list">
            {!loading && reservasFiltradas.length === 0 && (
                <div className="tr-empty">
                  {hasActiveFilters ? "Nenhuma reserva corresponde aos filtros." : "Você ainda não possui reservas."}
                </div>
            )}

            {reservasFiltradas.map((reserva) => (
                <div key={reserva.id} className="tr-card" style={{ boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px" }}>
                  <div className="tr-card__grid">
                    <div className="tr-field">
                      <span className="tr-field__label">Data</span>
                      <span className="tr-field__value">{reserva.data || "—"}</span>
                    </div>
                    <div className="tr-field">
                      <span className="tr-field__label">Espaço</span>
                      <span className="tr-field__value">{reserva.espaco}</span>
                    </div>
                    <div className="tr-field">
                      <span className="tr-field__label">Horário</span>
                      <span className="tr-field__value">{reserva.horaInicio} – {reserva.horaFim}</span>
                    </div>
                    <div className="tr-field">
                      <span className="tr-field__label">Período</span>
                      <span className="tr-field__value">{reserva.periodo || "—"}</span>
                    </div>
                    <div className="tr-field">
                      <span className="tr-field__label">Curso</span>
                      <span className="tr-field__value">{reserva.curso || "—"}</span>
                    </div>

                    <div className="tr-field">
                      <span className="tr-field__label">Status</span>
                      <span className={"tr-status"} style={{
                        display: "inline-block",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 12px",
                        borderRadius: 20,
                        background: statusBg(reserva.status),
                        color: statusColor(reserva.status)
                      }}>
                    {reserva.status}
                  </span>
                    </div>

                    <div className="tr-field tr-field--wide">
                      <span className="tr-field__label">Motivo</span>
                      {editandoId === reserva.id ? (
                          <input value={novoMotivo} onChange={(e) => setNovoMotivo(e.target.value)}
                                 style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.9rem" }}
                          />
                      ) : (
                          <span className="tr-field__value">{reserva.motivo || "—"}</span>
                      )}
                    </div>
                  </div>

                  {podeAcionar(reserva) && (
                      <div className="tr-card__footer">
                        {editandoId === reserva.id ? (
                            <>
                              <button onClick={cancelarEdicao} className="sonic">Cancelar</button>
                              <button onClick={() => salvarEdicao(reserva.id)} disabled={salvando} className="btn-action btn-success2">
                                {salvando ? "Salvando..." : "Salvar"}
                              </button>
                            </>
                        ) : (
                            <>
                              {podeEditar(reserva) && (
                                  <button onClick={() => iniciarEdicao(reserva)} className="btn-action btn-secondary">
                                    Editar motivo
                                  </button>
                              )}
                              <button onClick={() => openConfirmCancelModal(reserva)} className="btn-action btn-danger">
                                Cancelar reserva
                              </button>
                            </>
                        )}
                      </div>
                  )}
                </div>
            ))}
          </div>
        </main>

        {/* Modal de confirmação de cancelamento */}
        {showConfirmModal && selectedReserva && (
            <div className="modal-overlay">
              <div className="confirm-modal">
                <div className="confirm-icon">!</div>
                <h2>Confirmar cancelamento</h2>
                <p>
                  Tem certeza que deseja cancelar esta reserva?
                  <br />
                  <strong>{selectedReserva.espaco}</strong> - {selectedReserva.data} - {selectedReserva.horaInicio} às {selectedReserva.horaFim}
                </p>
                <div className="confirm-buttons">
                  <button
                      className="sonic"
                      onClick={() => {
                        setShowConfirmModal(false);
                        setSelectedReserva(null);
                      }}
                  >
                    Voltar
                  </button>
                  <button
                      className="btn-action btn-danger"
                      onClick={handleConfirmCancel}
                  >
                    Sim, cancelar
                  </button>
                </div>
              </div>
            </div>
        )}

        <Footer />

        {showSuccessPopup && <Popup message={success} onClose={() => setShowSuccessPopup(false)} />}
        {showErrorPopup && <Popup message={error} onClose={() => setShowErrorPopup(false)} type="error" />}
      </div>
  );
}