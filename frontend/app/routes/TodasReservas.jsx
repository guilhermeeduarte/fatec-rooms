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
    pessoa: "", sala: "", periodo: "", curso: ""
  });

  function extrairCurso(notes) {
    if (!notes) return "";
    const match = notes.match(/Curso:\s*([^,\n]+)/i);
    return match ? match[1].trim() : "";
  }

  function extrairPeriodo(startTime) {
    if (!startTime) return "";
    const hora = parseInt(startTime.slice(0, 2), 10);
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

  function mapBookings(list) {
    return (list || []).map((reserva) => {
      const periods = reserva.periods || [];
      const first = periods[0];
      const last = periods[periods.length - 1];
      const bookingDate = reserva.bookingDate?.split("T")[0] || reserva.bookingDate || "";
      const createdAt = reserva.createdAt?.split("T")[0] || "";
      const startTime = first?.periodStart?.slice(0, 5) || "";
      return {
        id: `booking-${reserva.id}`,
        bookingDate, createdAt,
        data: bookingDate ? bookingDate.split("-").reverse().join("/") : "",
        dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
        tipoReserva: "Comum",
        espaco: reserva.roomName,
        horaInicio: startTime,
        horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
        motivo: reserva.subject || reserva.notes || "",
        status: traduzirStatus(reserva.status),
        professor: reserva.userDisplayName || reserva.username || "Desconhecido",
        periodo: extrairPeriodo(startTime),
        curso: extrairCurso(reserva.notes),
      };
    });
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

      const bookingsData = await bookingsRes.json();

      if (pageNum === 0 && recurringRes?.ok) {
        const recurringData = await recurringRes.json();
        const recurringList = recurringData.content ?? recurringData;
        const mappedRecurring = recurringList.map((reserva) => {
          const periods = reserva.periods || [];
          const first = periods[0];
          const last = periods[periods.length - 1];
          const createdAt = reserva.createdAt?.split("T")[0] || "";
          const weekDays = reserva.weekDays || [];
          const startTime = first?.periodStart?.slice(0, 5) || "";
          return {
            id: `recurring-${reserva.id}`,
            bookingDate: "", createdAt,
            data: formatRecurringDays(weekDays) || "Recorrente",
            dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
            tipoReserva: "Recorrente",
            espaco: reserva.roomName,
            horaInicio: startTime,
            horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
            motivo: reserva.subject || reserva.notes || "",
            status: traduzirStatus(reserva.status),
            professor: reserva.createdByUsername || "Desconhecido",
            periodo: extrairPeriodo(startTime),
            curso: extrairCurso(reserva.notes),
            weekDays,
          };
        });

        const mappedBookings = mapBookings(bookingsData.content);
        setReservas([...mappedBookings, ...mappedRecurring]);
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
      setReservas(prev => prev.map(r => r.id === reserva.id ? { ...r, status: "Cancelada" } : r));
    } catch (err) {
      setError(err.message || "Erro ao cancelar a reserva.");
    } finally {
      setCancellingId(null);
    }
  }

  const limparFiltros = () => {
    setBusca(""); setStatusFiltro(""); setDataReservaFiltro("");
    setDataSolicitacaoFiltro(""); setTipoReservaFiltro("");
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
    const matchPessoa = reserva.professor.toLowerCase().includes(filtrosAvancados.pessoa.toLowerCase());
    const matchSala = reserva.espaco.toLowerCase().includes(filtrosAvancados.sala.toLowerCase());
    const matchPeriodo = filtrosAvancados.periodo ? reserva.periodo === filtrosAvancados.periodo : true;
    const matchCurso = reserva.curso.toLowerCase().includes(filtrosAvancados.curso.toLowerCase());
    return matchBuscaGeral && matchStatus && matchDataReserva && matchDataSolicitacao &&
      matchTipoReserva && matchPessoa && matchSala && matchPeriodo && matchCurso;
  });

  const reservasOrdenadas = statusFiltro ? reservasFiltradas : [...reservasFiltradas].sort((a, b) => {
    const order = { Pendente: 1, Ativa: 1, Recusada: 2, Cancelada: 3 };
    return (order[a.status] || 5) - (order[b.status] || 5);
  });

  function statusClass(status) {
    switch (status) {
      case "Ativa": return "tr-status tr-status--ativa";
      case "Pendente": return "tr-status tr-status--pendente";
      case "Cancelada": return "tr-status tr-status--cancelada";
      case "Recusada": return "tr-status tr-status--recusada";
      default: return "tr-status";
    }
  }

  function cardBorderClass(reserva) {
    const tipo = reserva.tipoReserva === "Recorrente" ? " tr-card--recorrente" : "";
    switch (reserva.status) {
      case "Ativa": return "tr-card tr-card--ativa" + tipo;
      case "Pendente": return "tr-card tr-card--pendente" + tipo;
      case "Cancelada": return "tr-card tr-card--cancelada" + tipo;
      case "Recusada": return "tr-card tr-card--recusada" + tipo;
      default: return "tr-card" + tipo;
    }
  }

  return (
    <div className="tr-page">
      <Navbar activePage="Todas as Reservas" />
      <PageHero
        title="Gerenciar Reservas"
        tag="Área do Coordenador"
        description="Visualize, filtre e gerencie todas as reservas do sistema."
      />

      <main className="tr-main">
        {/* ── Filtros ── */}
        <div className="tr-filters">
          <div className="tr-filters__row">
            <input
              type="text"
              placeholder="🔍  Buscar por sala, motivo, professor ou status…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="tr-filters__search"
            />
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="tr-filters__select">
              <option value="">Todos os status</option>
              <option value="Pendente">Pendente</option>
              <option value="Ativa">Ativa</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Recusada">Recusada</option>
            </select>
            <select value={tipoReservaFiltro} onChange={e => setTipoReservaFiltro(e.target.value)} className="tr-filters__select">
              <option value="">Todos os tipos</option>
              <option value="Comum">Comum</option>
              <option value="Recorrente">Recorrente</option>
            </select>
          </div>

          <div className="tr-filters__row tr-filters__row--dates">
            <div className="tr-filters__date-group">
              <label>Data da reserva</label>
              <input type="date" value={dataReservaFiltro} onChange={e => setDataReservaFiltro(e.target.value)} />
            </div>
            <div className="tr-filters__date-group">
              <label>Data da solicitação</label>
              <input type="date" value={dataSolicitacaoFiltro} onChange={e => setDataSolicitacaoFiltro(e.target.value)} />
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
                placeholder="Professor / pessoa"
                value={filtrosAvancados.pessoa}
                onChange={e => setFiltrosAvancados({ ...filtrosAvancados, pessoa: e.target.value })}
              />
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
          {loading ? "Carregando…" : `${reservasOrdenadas.length} reserva${reservasOrdenadas.length !== 1 ? "s" : ""} encontrada${reservasOrdenadas.length !== 1 ? "s" : ""}`}
        </p>

        {/* ── Erro ── */}
        {error && <div className="tr-error">{error}</div>}

        {/* ── Lista ── */}
        <div className="tr-list">
          {!loading && !error && reservasOrdenadas.length === 0 && (
            <div className="tr-empty">Nenhuma reserva encontrada para os filtros selecionados.</div>
          )}

          {reservasOrdenadas.map((reserva) => (
            <div key={reserva.id} className={cardBorderClass(reserva)}>
              {/* Badge tipo */}
              <span className={`tr-badge tr-badge--${reserva.tipoReserva === "Recorrente" ? "recorrente" : "comum"}`}>
                {reserva.tipoReserva}
              </span>

              <div className="tr-card__grid">
                <div className="tr-field">
                  <span className="tr-field__label">Data da Reserva</span>
                  <span className="tr-field__value">{reserva.data || "—"}</span>
                </div>
                <div className="tr-field">
                  <span className="tr-field__label">Solicitado em</span>
                  <span className="tr-field__value">{reserva.dataSolicitacao || "—"}</span>
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
                  <span className="tr-field__label">Professor</span>
                  <span className="tr-field__value">{reserva.professor}</span>
                </div>
                <div className="tr-field">
                  <span className="tr-field__label">Curso</span>
                  <span className="tr-field__value">{reserva.curso || "—"}</span>
                </div>
                <div className="tr-field tr-field--wide">
                  <span className="tr-field__label">Motivo</span>
                  <span className="tr-field__value">{reserva.motivo || "—"}</span>
                </div>
                <div className="tr-field">
                  <span className="tr-field__label">Status</span>
                  <span className={statusClass(reserva.status)}>{reserva.status}</span>
                </div>
                {reserva.status !== "Cancelada" && reserva.status !== "Recusada" && (
                  <div className="tr-field tr-field--action">
                    <button
                      className="tr-btn-cancel"
                      onClick={() => cancelarReserva(reserva)}
                      disabled={cancellingId === reserva.id}
                    >
                      {cancellingId === reserva.id ? "Cancelando…" : "Cancelar reserva"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Carregar mais ── */}
        {hasMore && !loading && (
          <div className="tr-loadmore">
            <button className="tr-loadmore__btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Carregando…" : "Carregar mais"}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}