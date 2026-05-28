import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import Popup from "../components/Popup";
import { Search } from 'lucide-react';

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
    // Remove a parte do curso se existir
    const motivoParte = notes.split(/\nCurso:/i)[0];
    // Se não tiver nada antes de "Curso:", retorna vazio
    return motivoParte.trim();
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

        // Se o motivo estiver vazio, tenta usar o r.subject como fallback
        const motivoFinal = motivo || r.subject || "Sem motivo";
        const cursoFinal = curso || "—";

        return {
          id: r.id,
          data: r.bookingDate?.split("-").reverse().join("/") || "",
          rawDate: r.bookingDate || "",
          espaco: r.roomName || "",
          horaInicio: startTime,
          horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
          motivo: motivoFinal,
          status: traduzirStatus(r.status),
          periodo: extrairPeriodo(startTime),
          curso: cursoFinal,
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
          notesOriginal: notes, // Guarda as notas originais
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

      // Encontra a reserva original
      const reservaOriginal = reservas.find(r => r.id === id);

      // Extrai o curso das notas originais (se existir)
      let cursoParte = "";
      const cursoMatch = reservaOriginal?.notesOriginal?.match(/Curso:\s*([^\n]+)/i);
      if (cursoMatch) {
        cursoParte = `\nCurso: ${cursoMatch[1]}`;
      }

      // Constrói o novo notes: novo motivo + curso (se existir)
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

      // Atualiza o estado local
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

  async function cancelarReserva(id) {
    if (!window.confirm("Deseja realmente cancelar essa reserva?")) return;
    const token = localStorage.getItem("token");
    if (!token) { setError("Faça login para cancelar."); setShowErrorPopup(true); return; }
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, {
        method: "PATCH", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Falha ao cancelar a reserva.");
      setReservas((prev) => prev.map((r) => r.id === id ? { ...r, status: "Cancelada" } : r));
      setSuccess("Reserva cancelada.");
      setShowSuccessPopup(true);
    } catch (err) {
      setError(err.message || "Erro ao cancelar."); setShowErrorPopup(true);
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
    if (s === "Aceita") return "#16a34a";
    if (s === "Pendente") return "#d97706";
    return "#dc2626";
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
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f9fafb" }}>
        <Navbar activePage="Minhas Reservas" />
        <PageHero title="Minhas Reservas" tag="Área do Professor" description="Visualize, filtre e gerencie suas reservas." />

        <main style={{ flex: 1, width: "100%", maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>

          {/* ── Filtros ── */}
          <div style={{ background: "white", borderRadius: 14, padding: "1rem 1.25rem", marginBottom: "1.25rem", boxShadow: "0 2px 8px rgba(0,0,0,.06)", border: "1px solid #e5e7eb" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", alignItems: "center" }}>
              <div style={{ flex: "2 1 240px", position: "relative" }}>
                <Search
                    size={18}
                    color="#9ca3af"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none"
                    }}
                />
                <input
                    type="text"
                    placeholder="Buscar por sala, motivo, curso..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.85rem 0.5rem 38px",
                      border: "1.5px solid #d1d5db",
                      borderRadius: 8,
                      fontSize: "0.85rem",
                      background: "#f9fafb"
                    }}
                />
              </div>
              <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}
                      style={{ flex: "1 1 160px", padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.85rem", background: "#f9fafb" }}>
                <option value="">Todos os status</option>
                <option value="Pendente">Pendente</option>
                <option value="Aceita">Aceita</option>
                <option value="Cancelada">Cancelada</option>
                <option value="Recusada">Recusada</option>
              </select>
              <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)}
                     style={{ flex: "1 1 160px", padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.85rem", background: "#f9fafb" }}
              />
              <button type="button" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      style={{ padding: "0.5rem 1rem", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 8, cursor: "pointer", fontSize: "0.83rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                {showAdvancedFilters ? "▲ Menos" : "▼ Mais filtros"}
              </button>
              {hasActiveFilters && (
                  <button type="button" onClick={limparFiltros}
                          style={{ padding: "0.5rem 1rem", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "0.83rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                    Limpar
                  </button>
              )}
            </div>

            {showAdvancedFilters && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px dashed #e5e7eb" }}>
                  <input type="text" placeholder="Sala" value={filtrosAvancados.sala}
                         onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, sala: e.target.value })}
                         style={{ flex: "1 1 160px", padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.83rem", background: "#f9fafb" }}
                  />
                  <select value={filtrosAvancados.periodo} onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, periodo: e.target.value })}
                          style={{ flex: "1 1 140px", padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.83rem", background: "#f9fafb" }}>
                    <option value="">Período</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                  <input type="text" placeholder="Curso" value={filtrosAvancados.curso}
                         onChange={(e) => setFiltrosAvancados({ ...filtrosAvancados, curso: e.target.value })}
                         style={{ flex: "1 1 160px", padding: "0.45rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.83rem", background: "#f9fafb" }}
                  />
                </div>
            )}

            <p style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.6rem", marginBottom: 0 }}>
              {loading ? "Carregando..." : `${reservasFiltradas.length} reserva${reservasFiltradas.length !== 1 ? "s" : ""} encontrada${reservasFiltradas.length !== 1 ? "s" : ""}${hasActiveFilters ? " com os filtros aplicados" : ""}`}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {!loading && reservasFiltradas.length === 0 && (
                <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", background: "white", borderRadius: 14, border: "1.5px dashed #e5e7eb" }}>
                  {hasActiveFilters ? "Nenhuma reserva corresponde aos filtros." : "Você ainda não possui reservas."}
                </div>
            )}

            {reservasFiltradas.map((reserva) => (
                <div key={reserva.id} style={{
                  background: "white",
                  borderRadius: 14,
                  border: "1.5px solid #e5e7eb",
                  borderLeft: `5px solid ${borderColor(reserva.status)}`,
                  padding: "1.25rem 1.5rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                  transition: "transform .18s, box-shadow .18s",
                }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem 1.5rem" }}>
                    <Field label="Data" value={reserva.data} />
                    <Field label="Espaço" value={reserva.espaco} />
                    <Field label="Horário" value={`${reserva.horaInicio} – ${reserva.horaFim}`} />
                    <Field label="Período" value={reserva.periodo || "—"} />
                    <Field label="Curso" value={reserva.curso || "—"} />

                    <div>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Status</div>
                      <span style={{ display: "inline-block", fontSize: "0.8rem", fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: statusBg(reserva.status), color: statusColor(reserva.status) }}>
                        {reserva.status}
                      </span>
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Motivo</div>
                      {editandoId === reserva.id ? (
                          <input value={novoMotivo} onChange={(e) => setNovoMotivo(e.target.value)}
                                 style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1.5px solid #d1d5db", borderRadius: 8, fontSize: "0.9rem" }}
                          />
                      ) : (
                          <div style={{ fontSize: "0.9rem", color: "#1e293b" }}>{reserva.motivo || "—"}</div>
                      )}
                    </div>
                  </div>

                  {podeAcionar(reserva) && (
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid #f3f4f6" }}>
                        {editandoId === reserva.id ? (
                            <>
                              <button onClick={cancelarEdicao} className="btn-action btn-cancel">Voltar</button>
                              <button onClick={() => salvarEdicao(reserva.id)} disabled={salvando} className="btn-action btn-save">
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
                              <button onClick={() => cancelarReserva(reserva.id)} className="btn-action">
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

        <Footer />

        {showSuccessPopup && <Popup message={success} onClose={() => setShowSuccessPopup(false)} />}
        {showErrorPopup && <Popup message={error} onClose={() => setShowErrorPopup(false)} type="error" />}
      </div>
  );
}

function Field({ label, value }) {
  return (
      <div>
        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: "0.9rem", color: "#1e293b" }}>{value}</div>
      </div>
  );
}