import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

const WEEKDAY_LABELS = {
  MONDAY: "SEG",
  TUESDAY: "TER",
  WEDNESDAY: "QUA",
  THURSDAY: "QUI",
  FRIDAY: "SEX",
  SATURDAY: "SAB",
};

const JS_DAY_TO_WEEKDAY = {
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export default function TodasReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  function traduzirStatus(status) {
    switch ((status || "").toUpperCase()) {
      case "PENDING":
      case "PENDENTE":
        return "Pendente";
      case "APPROVED":
      case "ACEITA":
      case "ACEITO":
      case "ACTIVE":
      case "ATIVA":
        return "Ativa";
      case "REJECTED":
      case "RECUSADA":
        return "Recusada";
      case "CANCELLED":
      case "CANCELADA":
        return "Cancelada";
      default:
        return status || "Pendente";
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

  useEffect(() => {
    async function loadReservas() {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Faça login para ver as reservas.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const headers = {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        };

        const [bookingsRes, recurringRes] = await Promise.all([
          fetch("/api/bookings/admin/all", { headers }),
          fetch("/api/recurring-bookings", { headers }),
        ]);

        if (!bookingsRes.ok) {
          throw new Error("Falha ao carregar as reservas.");
        }
        if (!recurringRes.ok) {
          throw new Error("Falha ao carregar as reservas recorrentes.");
        }

        const [bookingsData, recurringData] = await Promise.all([
          bookingsRes.json(),
          recurringRes.json(),
        ]);

        const mappedBookings = bookingsData.map((reserva) => {
          const periods = reserva.periods || [];
          const first = periods[0];
          const last = periods[periods.length - 1];
          const bookingDate = reserva.bookingDate?.split("T")[0] || reserva.bookingDate || "";
          const createdAt = reserva.createdAt?.split("T")[0] || "";

          return {
            id: `booking-${reserva.id}`,
            bookingDate,
            createdAt,
            data: bookingDate ? bookingDate.split("-").reverse().join("/") : "",
            dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
            tipoReserva: reserva.reservationType || "Comum",
            espaco: reserva.roomName,
            horaInicio: first?.periodStart?.slice(0, 5) || "--:--",
            horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
            motivo: reserva.subject || reserva.notes || "",
            status: traduzirStatus(reserva.status),
            professor: reserva.userDisplayName || reserva.username || "Desconhecido",
          };
        });

        const mappedRecurring = recurringData.map((reserva) => {
          const periods = reserva.periods || [];
          const first = periods[0];
          const last = periods[periods.length - 1];
          const createdAt = reserva.createdAt?.split("T")[0] || "";
          const weekDays = reserva.weekDays || [];

          return {
            id: `recurring-${reserva.id}`,
            bookingDate: "",
            createdAt,
            data: formatRecurringDays(weekDays) || "Recorrente",
            dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
            tipoReserva: "Recorrente",
            espaco: reserva.roomName,
            horaInicio: first?.periodStart?.slice(0, 5) || "--:--",
            horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
            motivo: reserva.subject || reserva.notes || "",
            status: traduzirStatus(reserva.status),
            professor: reserva.createdByUsername || "Desconhecido",
            weekDays,
          };
        });

        setReservas([...mappedBookings, ...mappedRecurring]);
      } catch (err) {
        setError(err.message || "Erro ao carregar as reservas.");
      } finally {
        setLoading(false);
      }
    }

    loadReservas();
  }, []);

  async function cancelarReserva(reserva) {
    const confirmacao = window.confirm("Deseja realmente cancelar essa reserva?");
    if (!confirmacao) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Faça login para cancelar a reserva.");
      return;
    }

    const id = reserva.id.replace(/^(booking|recurring)-/, "");
    const endpoint = reserva.tipoReserva === "Recorrente"
      ? `/api/recurring-bookings/${id}/cancel`
      : `/api/bookings/admin/${id}/cancel`;

    try {
      setCancellingId(reserva.id);
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Falha ao cancelar a reserva.");
      }
      setReservas((prev) => prev.map((r) =>
        r.id === reserva.id ? { ...r, status: "Cancelada" } : r
      ));
    } catch (err) {
      setError(err.message || "Erro ao cancelar a reserva.");
    } finally {
      setCancellingId(null);
    }
  }

  // 🔍 FILTROS
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataReservaFiltro, setDataReservaFiltro] = useState("");
  const [dataSolicitacaoFiltro, setDataSolicitacaoFiltro] = useState("");
  const [tipoReservaFiltro, setTipoReservaFiltro] = useState("");

  const limparFiltros = () => {
    setBusca("");
    setStatusFiltro("");
    setDataReservaFiltro("");
    setDataSolicitacaoFiltro("");
    setTipoReservaFiltro("");
  };

  const reservasFiltradas = reservas.filter((reserva) => {
    const buscaLower = busca.toLowerCase();
    const matchBusca =
      reserva.espaco.toLowerCase().includes(buscaLower) ||
      reserva.motivo.toLowerCase().includes(buscaLower) ||
      reserva.professor.toLowerCase().includes(buscaLower) ||
      reserva.status.toLowerCase().includes(buscaLower);

    const matchStatus = statusFiltro
      ? reserva.status === statusFiltro
      : true;

    const matchDataReserva = dataReservaFiltro
      ? reserva.bookingDate === dataReservaFiltro || isRecurringOnDate(dataReservaFiltro, reserva.weekDays)
      : true;

    const matchDataSolicitacao = dataSolicitacaoFiltro
      ? reserva.createdAt === dataSolicitacaoFiltro
      : true;

    const matchTipoReserva = tipoReservaFiltro
      ? reserva.tipoReserva === tipoReservaFiltro
      : true;

    return matchBusca && matchStatus && matchDataReserva && matchDataSolicitacao && matchTipoReserva;
  });

  // Ordenar apenas quando "Todos os status" estiver selecionado
  const reservasOrdenadas = statusFiltro ? reservasFiltradas : [...reservasFiltradas].sort((a, b) => {
    const order = { Pendente: 1, Ativa: 1, Recusada: 2, Cancelada: 3 };
    return (order[a.status] || 5) - (order[b.status] || 5);
  });

  return (
    <>
      <Navbar activePage="Todas as Reservas" />

      <PageHero
        title="Gerenciar Reservas"
        className="page-hero-reservas"
        tag="Área do Coordenador"
        description="Visualize, filtre e gerencie todas as reservas do sistema."
      />

      <div className="layout-reservas">

        <div className="lado-direito">

          {/* 🔍 FILTROS */}
          <div className="filtros">
            <input
              type="text"
              placeholder="Buscar por sala, motivo ou professor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input-busca"
            />

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="select-status"
            >
              <option value="">Todos os status</option>
              <option value="Pendente">Pendente</option>
              <option value="Ativa">Ativas</option>
              <option value="Cancelada">Cancelada</option>
              <option value="Recusada">Recusada</option>
            </select>

            <select
              value={tipoReservaFiltro}
              onChange={(e) => setTipoReservaFiltro(e.target.value)}
              className="select-tipo"
            >
              <option value="">Todos os tipos</option>
              <option value="Comum">Comum</option>
              <option value="Recorrente">Recorrente</option>
              <option value="Especial">Especial</option>
            </select>

            <div className="filtro-data-wrapper">
              <div className="grupo-data">
                <label>Dia da Reserva</label>
                <input
                  type="date"
                  value={dataReservaFiltro}
                  onChange={(e) => setDataReservaFiltro(e.target.value)}
                  className="input-data"
                  title="Filtrar por dia da reserva"
                />
              </div>
              <div className="grupo-data">
                <label>Dia da Solicitação</label>
                <input
                  type="date"
                  value={dataSolicitacaoFiltro}
                  onChange={(e) => setDataSolicitacaoFiltro(e.target.value)}
                  className="input-data"
                  title="Filtrar por dia da solicitação"
                />
              </div>
            </div>

            <button type="button" className="btn-red" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>

          {/* 🧾 CARDS */}
          <div className="container-reservas">
            {loading && <p>Carregando reservas...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && reservasFiltradas.length === 0 && (
              <p>Nenhuma reserva encontrada.</p>
            )}
            {reservasOrdenadas.map((reserva) => (
              <div
                key={reserva.id}
                className={`card-reserva ${reserva.tipoReserva.toLowerCase()} ${reserva.status.toLowerCase()}`}
                data-status={reserva.status}
                id={`reserva-${reserva.id}-${Math.random().toString(36).substr(2, 9)}`}
              >
                <div className="info-reserva completa">

                  <div className="item-reserva">
                    <span className="label">Data da Reserva</span>
                    <span className="valor">{reserva.data}</span>
                  </div>

                  <div className="item-reserva">
                    <span className="label">Data da Solicitação</span>
                    <span className="valor">{reserva.dataSolicitacao}</span>
                  </div>

                  <div className="item-reserva">
                    <span className="label">Tipo</span>
                    <span className="valor">{reserva.tipoReserva}</span>
                  </div>

                  <div className="item-reserva">
                    <span className="label">Espaço</span>
                    <span className="valor">{reserva.espaco}</span>
                  </div>

                  <div className="item-reserva">
                    <span className="label">Horário</span>
                    <span className="valor">
                      {reserva.horaInicio} - {reserva.horaFim}
                    </span>
                  </div>

                  <div className="item-reserva">
                    <span className="label">Professor</span>
                    <span className="valor">{reserva.professor}</span>
                  </div>

                  <div className="item-reserva">
                    <span className="label">Motivo</span>
                    <span className="valor">{reserva.motivo}</span>
                  </div>

                  <div className="item-reserva">
                    <span className="label">Status</span>
                    <span className={`valor ${reserva.status.toLowerCase()}`}>{reserva.status}</span>
                  </div>

                  {reserva.status !== "Cancelada" && reserva.status !== "Recusada" && (
                    <div className="item-reserva">
                      <span className="label">&nbsp;</span>
                      <button
                        type="button"
                        className="btn-cancelar"
                        onClick={() => cancelarReserva(reserva)}
                        disabled={cancellingId === reserva.id}
                      >
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

      <Footer />
    </>
  );
}