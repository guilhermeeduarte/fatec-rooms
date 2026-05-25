import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

export default function EditarReserva() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [novoMotivo, setNovoMotivo] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtros básicos
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");

  // Filtros avançados
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    sala: "",
    periodo: "",
    curso: ""
  });

  function extrairCurso(notes) {
    if (!notes) return "";
    const match = notes.match(/Curso:\s*([^,\n]+)/i);
    return match ? match[1].trim() : "";
  }

  function extrairPeriodo(startTime) {
    if (!startTime) return "";
    const hora = parseInt(startTime.slice(0,2), 10);
    if (hora < 12) return "Manhã";
    if (hora < 18) return "Tarde";
    return "Noite";
  }

  function traduzirStatus(status) {
    switch ((status || "").toUpperCase()) {
      case "PENDING": return "Pendente";
      case "APPROVED": return "Aceita";
      case "REJECTED": return "Recusada";
      case "CANCELLED": return "Cancelada";
      default: return status || "Pendente";
    }
  }

  useEffect(() => {
    async function loadReservas() {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Faça login para ver suas reservas.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/bookings/my", {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Falha ao carregar suas reservas.");
        const data = await response.json();
        setReservas(data.map((reserva) => {
          const periods = reserva.periods || [];
          const first = periods[0];
          const last = periods[periods.length - 1];
          const startTime = first?.periodStart?.slice(0,5) || "";
          return {
            id: reserva.id,
            data: reserva.bookingDate?.split("-").reverse().join("/") || "",
            espaco: reserva.roomName,
            horaInicio: startTime,
            horaFim: last?.periodEnd?.slice(0,5) || "--:--",
            motivo: reserva.subject || reserva.notes || "",
            status: traduzirStatus(reserva.status),
            periodo: extrairPeriodo(startTime),
            curso: extrairCurso(reserva.notes),
            rawDate: reserva.bookingDate || "",
          };
        }));
      } catch (err) {
        setError(err.message || "Erro ao carregar suas reservas.");
      } finally {
        setLoading(false);
      }
    }
    loadReservas();
  }, []);

  function iniciarEdicao(reserva) {
    setEditandoId(reserva.id);
    setNovoMotivo(reserva.motivo);
  }

  async function salvarEdicao(id) {
    const token = localStorage.getItem("token");
    if (!token) { setError("Faça login para editar a reserva."); return; }
    try {
      const response = await fetch(`/api/bookings/${id}/notes`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ notes: novoMotivo }),
      });
      if (!response.ok) throw new Error("Falha ao atualizar o motivo.");
      setReservas((prev) => prev.map((r) => r.id === id ? { ...r, motivo: novoMotivo } : r));
      setEditandoId(null);
    } catch (err) {
      setError(err.message || "Erro ao salvar a edição.");
    }
  }

  async function cancelarReserva(id) {
    if (!window.confirm("Deseja realmente cancelar essa reserva?")) return;
    const token = localStorage.getItem("token");
    if (!token) { setError("Faça login para cancelar a reserva."); return; }
    try {
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Falha ao cancelar a reserva.");
      setReservas((prev) => prev.map((r) => r.id === id ? { ...r, status: "Cancelada" } : r));
    } catch (err) {
      setError(err.message || "Erro ao cancelar a reserva.");
    }
  }

  function formatarDataBRparaISO(dataBR) {
    const [dia, mes, ano] = dataBR.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  const limparFiltros = () => {
    setBusca("");
    setStatusFiltro("");
    setDataFiltro("");
    setFiltrosAvancados({ sala: "", periodo: "", curso: "" });
    setShowAdvancedFilters(false);
  };

  const reservasFiltradas = reservas.filter((reserva) => {
    // Busca geral (texto)
    const buscaLower = busca.toLowerCase();
    const matchBusca =
      reserva.espaco.toLowerCase().includes(buscaLower) ||
      reserva.motivo.toLowerCase().includes(buscaLower) ||
      reserva.status.toLowerCase().includes(buscaLower) ||
      reserva.curso.toLowerCase().includes(buscaLower);

    const matchStatus = statusFiltro ? reserva.status === statusFiltro : true;
    const matchData = dataFiltro ? reserva.rawDate === dataFiltro : true;

    // Filtros avançados
    const matchSala = reserva.espaco.toLowerCase().includes(filtrosAvancados.sala.toLowerCase());
    const matchPeriodo = filtrosAvancados.periodo ? reserva.periodo === filtrosAvancados.periodo : true;
    const matchCurso = reserva.curso.toLowerCase().includes(filtrosAvancados.curso.toLowerCase());

    return matchBusca && matchStatus && matchData && matchSala && matchPeriodo && matchCurso;
  });

  return (
    <>
      <Navbar activePage="Minhas Reservas" />
      <PageHero
        title="Minhas Reservas"
        className="page-hero-cadastro"
        tag="Área de Edição de Reservas"
        description="Visualize, filtre e gerencie suas reservas."
      />
      <div className="layout-reservas">
        <div className="lado-direito">
          {/* Filtros unificados */}
          <div className="filtros-unificados">
            <div className="filtros-basicos">
              <input type="text" placeholder="Buscar (sala, motivo, status, matéria, curso)" value={busca} onChange={e => setBusca(e.target.value)} className="input-busca" />
              <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="select-status">
                <option value="">Todos os status</option>
                <option value="Pendente">Pendente</option>
                <option value="Aceita">Aceita</option>
                <option value="Cancelada">Cancelada</option>
              </select>
              <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)} className="input-data" />
              <button type="button" className="btn-toggle-advanced" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                {showAdvancedFilters ? "▲ Menos filtros" : "▼ Mais filtros"}
              </button>
              <button type="button" className="btn-red" onClick={limparFiltros}>Limpar</button>
            </div>

            {showAdvancedFilters && (
              <div className="filtros-avancados">
                <input type="text" placeholder="Sala" value={filtrosAvancados.sala} onChange={e => setFiltrosAvancados({...filtrosAvancados, sala: e.target.value})} />
                <select value={filtrosAvancados.periodo} onChange={e => setFiltrosAvancados({...filtrosAvancados, periodo: e.target.value})}>
                  <option value="">Período</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                </select>
                <input type="text" placeholder="Curso" value={filtrosAvancados.curso} onChange={e => setFiltrosAvancados({...filtrosAvancados, curso: e.target.value})} />
              </div>
            )}
          </div>

          {/* Cards */}
          <div className="container-reservas">
            {loading && <p>Carregando reservas...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && reservasFiltradas.length === 0 && <p>Nenhuma reserva encontrada.</p>}
            {reservasFiltradas.map((reserva) => (
              <div key={reserva.id} className="card-reserva" data-status={reserva.status}>
                <div className="info-reserva completa">
                  <div className="item-reserva"><span className="label">Data</span><span className="valor">{reserva.data}</span></div>
                  <div className="item-reserva"><span className="label">Espaço</span><span className="valor">{reserva.espaco}</span></div>
    
                  <div className="item-reserva"><span className="label">Horário</span><span className="valor">{reserva.horaInicio} - {reserva.horaFim}</span></div>
                  <div className="item-reserva"><span className="label">Período</span><span className="valor">{reserva.periodo}</span></div>
                  <div className="item-reserva"><span className="label">Curso</span><span className="valor">{reserva.curso || "-"}</span></div>
                  <div className="item-reserva"><span className="label">Motivo</span>
                    {editandoId === reserva.id ? (
                      <>
                        <input value={novoMotivo} onChange={(e) => setNovoMotivo(e.target.value)} />
                        <button className="btn-salvar" onClick={() => salvarEdicao(reserva.id)}>Salvar</button>
                      </>
                    ) : (
                      <span className="valor">{reserva.motivo}</span>
                    )}
                  </div>
                  <div className="item-reserva"><span className="label">Status</span><span className={`valor ${reserva.status.toLowerCase()}`}>{reserva.status}</span></div>
                </div>
                {reserva.status !== "Cancelada" && (
                  <div className="acoes">
                    <button onClick={() => iniciarEdicao(reserva)}>Editar</button>
                    <button onClick={() => cancelarReserva(reserva.id)}>Cancelar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}