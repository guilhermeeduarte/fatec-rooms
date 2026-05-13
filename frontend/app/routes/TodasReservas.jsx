import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

export default function TodasReservas() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  function traduzirStatus(status) {
    switch ((status || "").toUpperCase()) {
      case "PENDING":
      case "PENDENTE":
        return "Pendente";
      case "APPROVED":
      case "ACEITA":
      case "ACEITO":
        return "Aceita";
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

  useEffect(() => {
    async function loadReservas() {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Faça login para ver as reservas.");
        setLoading(false);
        navigate("/login");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/bookings/admin/all", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) throw new Error("Falha ao carregar as reservas.");
        const data = await response.json();

        setReservas(
          data.map((reserva) => {
            const periods = reserva.periods || [];
            const first = periods[0];
            const last = periods[periods.length - 1];
            const bookingDate = reserva.bookingDate?.split("T")[0] || reserva.bookingDate || "";
            const createdAt = reserva.createdAt?.split("T")[0] || "";

            const isRecorrente = reserva.recurringBookingId != null || reserva.reservationType === "RECORRENTE";

            return {
              id: reserva.id,
              bookingDate,
              createdAt,
              data: bookingDate ? bookingDate.split("-").reverse().join("/") : "",
              dataSolicitacao: createdAt ? createdAt.split("-").reverse().join("/") : "",
              tipoReserva: isRecorrente ? "Recorrente" : "Comum",
              recurringBookingId: reserva.recurringBookingId,
              espaco: reserva.roomName,
              horaInicio: first?.periodStart?.slice(0, 5) || "--:--",
              horaFim: last?.periodEnd?.slice(0, 5) || "--:--",
              motivo: reserva.subject || reserva.notes || "",
              status: traduzirStatus(reserva.status),
              professor: reserva.userDisplayName || reserva.username || "Desconhecido",
            };
          })
        );
      } catch (err) {
        setError(err.message || "Erro ao carregar as reservas.");
      } finally {
        setLoading(false);
      }
    }
    loadReservas();
  }, [navigate]);

  // Filtros (igual ao original)
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

    const matchStatus = statusFiltro ? reserva.status === statusFiltro : true;
    const matchDataReserva = dataReservaFiltro ? reserva.bookingDate === dataReservaFiltro : true;
    const matchDataSolicitacao = dataSolicitacaoFiltro ? reserva.createdAt === dataSolicitacaoFiltro : true;
    const matchTipoReserva = tipoReservaFiltro ? reserva.tipoReserva === tipoReservaFiltro : true;

    return matchBusca && matchStatus && matchDataReserva && matchDataSolicitacao && matchTipoReserva;
  });

  // Agrupa recorrentes
  const groupedData = useMemo(() => {
    const groups = {};
    const singles = [];

    reservasFiltradas.forEach((reserva) => {
      if (reserva.recurringBookingId && reserva.tipoReserva === "Recorrente") {
        const key = reserva.recurringBookingId;
        if (!groups[key]) {
          groups[key] = {
            id: key,
            recurringBookingId: key,
            tipoReserva: "Recorrente",
            espaco: reserva.espaco,
            professor: reserva.professor,
            motivo: reserva.motivo,
            occurrences: [],
          };
        }
        groups[key].occurrences.push(reserva);
      } else {
        singles.push(reserva);
      }
    });

    Object.values(groups).forEach((group) => {
      group.occurrences.sort((a, b) => new Date(a.bookingDate) - new Date(b.bookingDate));
      group.status = group.occurrences[0]?.status || "Pendente";
      group.espaco = group.occurrences[0]?.espaco;
      group.professor = group.occurrences[0]?.professor;
      group.motivo = group.occurrences[0]?.motivo;
    });

    return { groups: Object.values(groups), singles };
  }, [reservasFiltradas]);

  const singlesOrdenados = statusFiltro
    ? groupedData.singles
    : [...groupedData.singles].sort((a, b) => {
        const order = { Pendente: 1, Aceita: 2, Recusada: 3, Cancelada: 4 };
        return (order[a.status] || 5) - (order[b.status] || 5);
      });

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  if (loading) return <p>Carregando reservas...</p>;
  if (error) return <p className="error-message">{error}</p>;

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
          {/* Filtros */}
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
              <option value="Aceita">Aceita</option>
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
            </select>
            <div className="filtro-data-wrapper">
              <div className="grupo-data">
                <label>Dia da Reserva</label>
                <input
                  type="date"
                  value={dataReservaFiltro}
                  onChange={(e) => setDataReservaFiltro(e.target.value)}
                  className="input-data"
                />
              </div>
              <div className="grupo-data">
                <label>Dia da Solicitação</label>
                <input
                  type="date"
                  value={dataSolicitacaoFiltro}
                  onChange={(e) => setDataSolicitacaoFiltro(e.target.value)}
                  className="input-data"
                />
              </div>
            </div>
            <button type="button" className="btn-red" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </div>

          {/* Cards */}
          <div className="container-reservas">
            {groupedData.groups.length === 0 && singlesOrdenados.length === 0 && (
              <p>Nenhuma reserva encontrada.</p>
            )}

            {/* Reservas recorrentes agrupadas */}
            {groupedData.groups.map((group) => {
              const isExpanded = expandedGroups[group.id];
              return (
                <div
                  key={`rec-${group.id}`}
                  className={`card-reserva ${group.status.toLowerCase()}`}
                  data-status={group.status}
                >
                  {/* Header do card (clicável) */}
                  <div
                    className="info-reserva completa"
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <div className="item-reserva">
                      <span className="label">Data da Reserva</span>
                      <span className="valor">{group.occurrences[0]?.data || "--"}</span>
                    </div>
                    <div className="item-reserva">
                      <span className="label">Data da Solicitação</span>
                      <span className="valor">{group.occurrences[0]?.dataSolicitacao || "--"}</span>
                    </div>
                    <div className="item-reserva">
                      <span className="label">Tipo</span>
                      <span className="valor">🔄 Recorrente</span>
                    </div>
                    <div className="item-reserva">
                      <span className="label">Espaço</span>
                      <span className="valor">{group.espaco}</span>
                    </div>
                    <div className="item-reserva">
                      <span className="label">Professor</span>
                      <span className="valor">{group.professor}</span>
                    </div>
                    <div className="item-reserva">
                      <span className="label">Motivo</span>
                      <span className="valor">{group.motivo}</span>
                    </div>
                    <div className="item-reserva">
                      <span className="label">Status</span>
                      <span className={`valor ${group.status.toLowerCase()}`}>{group.status}</span>
                    </div>
                    <div className="item-reserva">
                      <span className="label">Ocorrências</span>
                      <span className="valor">{group.occurrences.length}</span>
                    </div>
                  </div>

                  {/* Dropdown - lista de ocorrências (ajustado para melhor visualização) */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: "16px",
                        padding: "12px 0 0 0",
                        borderTop: "1px solid #E5E7EB",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "0 0 16px 16px",
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr) 0.5fr",
                          gap: "12px",
                          padding: "8px 12px",
                          backgroundColor: "#F3F4F6",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#6B7280",
                          borderRadius: "8px",
                          marginBottom: "8px",
                        }}
                      >
                        <span>Data</span>
                        <span>Horário</span>
                        <span>Status</span>
                        <span style={{ textAlign: "right" }}>ID</span>
                      </div>
                      {group.occurrences.map((occ) => (
                        <div
                          key={occ.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(3, 1fr) 0.5fr",
                            gap: "12px",
                            alignItems: "center",
                            padding: "10px 12px",
                            borderBottom: "1px solid #E5E7EB",
                            backgroundColor: "#F9FAFB",
                            borderRadius: "8px",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ fontWeight: "500", color: "#111827" }}>{occ.data}</span>
                          <span style={{ color: "#4B5563" }}>
                            {occ.horaInicio} – {occ.horaFim}
                          </span>
                          <span
                            className={`reserva-status ${
                              occ.status === "Aceita"
                                ? "status-ok"
                                : occ.status === "Pendente"
                                ? "status-pend"
                                : "status-cancel"
                            }`}
                          >
                            {occ.status}
                          </span>
                          <span style={{ fontSize: "11px", color: "#9CA3AF", textAlign: "right" }}>
                            #{occ.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Reservas comuns (individuais) */}
            {singlesOrdenados.map((reserva) => (
              <div
                key={reserva.id}
                className={`card-reserva ${reserva.status.toLowerCase()}`}
                data-status={reserva.status}
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