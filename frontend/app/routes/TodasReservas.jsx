import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

const WEEKDAY_LABELS = {
  MONDAY: "SEG", TUESDAY: "TER", WEDNESDAY: "QUA",
  THURSDAY: "QUI", FRIDAY: "SEX", SATURDAY: "SAB",
};
const JS_DAY_TO_WEEKDAY = {
  1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY",
  4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
};

export default function TodasReservas() {
  const [reservas, setReservas] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtros básicos
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataReservaFiltro, setDataReservaFiltro] = useState("");
  const [dataSolicitacaoFiltro, setDataSolicitacaoFiltro] = useState("");
  const [tipoReservaFiltro, setTipoReservaFiltro] = useState("");

  // Filtros avançados
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    pessoa: "",
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
      case "APPROVED": case "ACEITA": case "ACEITO": case "ACTIVE": return "Ativa";
      case "REJECTED": return "Recusada";
      case "CANCELLED": return "Cancelada";
      default: return status || "Pendente";
    }
  }

  function formatRecurringDays(days = []) {
    return days.map((day) => WEEKDAY_LABELS[day] || day).join(", ");
  }

  function isRecurringOnDate(dateString, weekDays = []) {
    if (!dateString || weekDays.length === 0) return false;
    const date = new Date(dateString);
    const weekdayName = JS_DAY_TO_WEEKDAY[date.getDay()];
    return weekDays.includes(weekdayName);
  }

  async function fetchReservas(pageNum, append = false) {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const [bookingsRes, recurringRes] = await Promise.all([
        fetch(`/api/bookings/admin/all?page=${pageNum}&size=${PAGE_SIZE}`, { headers }),
        pageNum === 0 ? fetch("/api/recurring-bookings?page=0&size=200", { headers }) : Promise.resolve(null),
      ]);

      if (!bookingsRes.ok) throw new Error("Falha ao carregar as reservas.");

      const bookingsData = await bookingsRes.json(); // PagedResponseDTO
      if (pageNum === 0 && recurringRes?.ok) {
        const recurringData = await recurringRes.json();
        const recurringList = recurringData.content ?? recurringData;
        const mappedRecurring = recurringList.map((reserva) => {
          const periods = reserva.periods || [];
          const first = periods[0];
          const last = periods[periods.length - 1];
          const createdAt = reserva.createdAt?.split("T")[0] || "";
          const weekDays = reserva.weekDays || [];
          const startTime = first?.periodStart?.slice(0,5) || "";
          return {
            id: `recurring-${reserva.id}`,
            bookingDate: "", createdAt,
            data: formatRecurringDays(weekDays) || "Recorrente",
            dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
            tipoReserva: "Recorrente",
            espaco: reserva.roomName,
            horaInicio: startTime,
            horaFim: last?.periodEnd?.slice(0,5) || "--:--",
            motivo: reserva.subject || reserva.notes || "",
            status: traduzirStatus(reserva.status),
            professor: reserva.createdByUsername || "Desconhecido",
            periodo: extrairPeriodo(startTime),
            curso: extrairCurso(reserva.notes),
            weekDays,
          };
        });

        const mappedBookings = mapBookings(bookingsData.content);
        const combined = [...mappedBookings, ...mappedRecurring];
        setReservas(combined);
      } else {
        const mappedBookings = mapBookings(bookingsData.content);
        setReservas(prev => append ? [...prev, ...mappedBookings] : mappedBookings);
      }

      setHasMore(!bookingsData.last);
    } catch (err) {
      setError(err.message || "Erro ao carregar as reservas.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  function mapBookings(list) {
    return (list || []).map((reserva) => {
      const periods = reserva.periods || [];
      const first = periods[0];
      const last = periods[periods.length - 1];
      const bookingDate = reserva.bookingDate?.split("T")[0] || reserva.bookingDate || "";
      const createdAt = reserva.createdAt?.split("T")[0] || "";
      const startTime = first?.periodStart?.slice(0,5) || "";
      return {
        id: `booking-${reserva.id}`,
        bookingDate, createdAt,
        data: bookingDate ? bookingDate.split("-").reverse().join("/") : "",
        dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
        tipoReserva: "Comum",
        espaco: reserva.roomName,
        horaInicio: startTime,
        horaFim: last?.periodEnd?.slice(0,5) || "--:--",
        motivo: reserva.subject || reserva.notes || "",
        status: traduzirStatus(reserva.status),
        professor: reserva.userDisplayName || reserva.username || "Desconhecido",
        periodo: extrairPeriodo(startTime),
        curso: extrairCurso(reserva.notes),
      };
    });
  }


  useEffect(() => { fetchReservas(0); }, []);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchReservas(next, true);
  }
  async function cancelarReserva(reserva) {
    const confirmacao = window.confirm("Deseja realmente cancelar essa reserva?");
    if (!confirmacao) return;
    const token = localStorage.getItem("token");
    if (!token) { setError("Faça login para cancelar a reserva."); return; }
    const id = reserva.id.replace(/^(booking|recurring)-/, "");
    const endpoint = reserva.tipoReserva === "Recorrente"
      ? `/api/recurring-bookings/${id}/cancel`
      : `/api/bookings/admin/${id}/cancel`;
    try {
      setCancellingId(reserva.id);
      const response = await fetch(endpoint, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Falha ao cancelar a reserva.");
      setReservas((prev) => prev.map(r => r.id === reserva.id ? { ...r, status: "Cancelada" } : r));
    } catch (err) {
      setError(err.message || "Erro ao cancelar a reserva.");
    } finally {
      setCancellingId(null);
    }
  }

  const limparFiltros = () => {
    setBusca("");
    setStatusFiltro("");
    setDataReservaFiltro("");
    setDataSolicitacaoFiltro("");
    setTipoReservaFiltro("");
    setFiltrosAvancados({ pessoa: "", sala: "", periodo: "", curso: "" });
    setShowAdvancedFilters(false);
  };

  const reservasFiltradas = reservas.filter((reserva) => {
    const matchBuscaGeral = busca === "" ||
      reserva.espaco.toLowerCase().includes(busca.toLowerCase()) ||
      reserva.motivo.toLowerCase().includes(busca.toLowerCase()) ||
      reserva.professor.toLowerCase().includes(busca.toLowerCase()) ||
      reserva.status.toLowerCase().includes(busca.toLowerCase());

    const matchStatus = statusFiltro ? reserva.status === statusFiltro : true;
    const matchDataReserva = dataReservaFiltro
      ? reserva.bookingDate === dataReservaFiltro || isRecurringOnDate(dataReservaFiltro, reserva.weekDays)
      : true;
    const matchDataSolicitacao = dataSolicitacaoFiltro ? reserva.createdAt === dataSolicitacaoFiltro : true;
    const matchTipoReserva = tipoReservaFiltro ? reserva.tipoReserva === tipoReservaFiltro : true;

    // Filtros avançados
    const matchPessoa = reserva.professor.toLowerCase().includes(filtrosAvancados.pessoa.toLowerCase());
    const matchSala = reserva.espaco.toLowerCase().includes(filtrosAvancados.sala.toLowerCase());
    const matchPeriodo = filtrosAvancados.periodo ? reserva.periodo === filtrosAvancados.periodo : true;
    const matchCurso = reserva.curso.toLowerCase().includes(filtrosAvancados.curso.toLowerCase());

    return matchBuscaGeral && matchStatus && matchDataReserva && matchDataSolicitacao && matchTipoReserva &&
           matchPessoa && matchSala && matchPeriodo && matchCurso;
  });

  const reservasOrdenadas = statusFiltro ? reservasFiltradas : [...reservasFiltradas].sort((a,b) => {
    const order = { Pendente: 1, Ativa: 1, Recusada: 2, Cancelada: 3 };
    return (order[a.status] || 5) - (order[b.status] || 5);
  });

  return (
    <>
      <Navbar activePage="Todas as Reservas" />
      <PageHero title="Gerenciar Reservas" className="page-hero-reservas" tag="Área do Coordenador" description="Visualize, filtre e gerencie todas as reservas do sistema." />
      <div className="layout-reservas">
        <div className="lado-direito">
          {/* Bloco único de filtros */}
          <div className="filtros-unificados">
            {/* Linha 1: Filtros básicos */}
            <div className="filtros-basicos">
              <input type="text" placeholder="Buscar (sala, motivo, prof, status)" value={busca} onChange={e => setBusca(e.target.value)} className="input-busca" />
              <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="select-status">
                <option value="">Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Ativa">Ativas</option>
                <option value="Cancelada">Cancelada</option>
                <option value="Recusada">Recusada</option>
              </select>
              <select value={tipoReservaFiltro} onChange={e => setTipoReservaFiltro(e.target.value)} className="select-tipo">
                <option value="">Tipo</option>
                <option value="Comum">Comum</option>
                <option value="Recorrente">Recorrente</option>
              </select>
              <div className="filtro-data-wrapper">
                <div className="grupo-data">
                  <label>Data reserva</label>
                  <input type="date" value={dataReservaFiltro} onChange={e => setDataReservaFiltro(e.target.value)} />
                </div>
                <div className="grupo-data">
                  <label>Data solicitação</label>
                  <input type="date" value={dataSolicitacaoFiltro} onChange={e => setDataSolicitacaoFiltro(e.target.value)} />
                </div>
              </div>
              <button type="button" className="btn-toggle-advanced" onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}>
                {showAdvancedFilters ? "▲ Menos filtros" : "▼ Mais filtros"}
              </button>
              <button type="button" className="btn-red" onClick={limparFiltros}>Limpar</button>
            </div>

            {/* Linha 2: Filtros avançados (colapsável) */}
            {showAdvancedFilters && (
              <div className="filtros-avancados">
                <input type="text" placeholder="Pessoa (professor)" value={filtrosAvancados.pessoa} onChange={e => setFiltrosAvancados({...filtrosAvancados, pessoa: e.target.value})} />
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

          {/* Listagem de reservas */}
          <div className="container-reservas">
            {loading && <p>Carregando reservas...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && reservasFiltradas.length === 0 && <p>Nenhuma reserva encontrada.</p>}
            {reservasOrdenadas.map((reserva) => (
              <div key={reserva.id} className={`card-reserva ${reserva.tipoReserva.toLowerCase()} ${reserva.status.toLowerCase()}`} data-status={reserva.status}>
                <div className="info-reserva completa">
                  <div className="item-reserva"><span className="label">Data da Reserva</span><span className="valor">{reserva.data}</span></div>
                  <div className="item-reserva"><span className="label">Data da Solicitação</span><span className="valor">{reserva.dataSolicitacao}</span></div>
                  <div className="item-reserva"><span className="label">Tipo</span><span className="valor">{reserva.tipoReserva}</span></div>
                  <div className="item-reserva"><span className="label">Espaço</span><span className="valor">{reserva.espaco}</span></div>
                  <div className="item-reserva"><span className="label">Horário</span><span className="valor">{reserva.horaInicio} - {reserva.horaFim}</span></div>
                  <div className="item-reserva"><span className="label">Professor</span><span className="valor">{reserva.professor}</span></div>
                  <div className="item-reserva"><span className="label">Período</span><span className="valor">{reserva.periodo}</span></div>
                  <div className="item-reserva"><span className="label">Curso</span><span className="valor">{reserva.curso || "-"}</span></div>
                  <div className="item-reserva"><span className="label">Motivo</span><span className="valor">{reserva.motivo}</span></div>
                  <div className="item-reserva"><span className="label">Status</span><span className={`valor ${reserva.status.toLowerCase()}`}>{reserva.status}</span></div>
                  {reserva.status !== "Cancelada" && reserva.status !== "Recusada" && (
                    <div className="item-reserva">
                      <span className="label">&nbsp;</span>
                      <button type="button" className="btn-cancelar" onClick={() => cancelarReserva(reserva)} disabled={cancellingId === reserva.id}>
                        {cancellingId === reserva.id ? "Cancelando..." : "Cancelar"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {hasMore && !loading && (
          <div style={{ textAlign: "center", margin: "20px 0" }}>
            <button
                className="btn-submit"
                onClick={loadMore}
                disabled={loadingMore}
                style={{ width: "200px" }}
            >
              {loadingMore ? "Carregando..." : "Carregar mais"}
            </button>
          </div>
      )}
      <Footer />
    </>
  );
}