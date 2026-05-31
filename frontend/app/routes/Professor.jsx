import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import { LoadingState, ErrorState } from "../components/PageState";

const menuActions = [
  {
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
    title: "Reservar Sala",
    desc: "Solicite novo horário em minutos.",
    to: "/solicitar-reserva",
  },
  {
    icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
    title: "Minhas Solicitações",
    desc: "Acompanhe o status das reservas.",
    to: "/minhas-reservas",
  },
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const statusLabels = {
  APPROVED: "Confirmada",
  PENDING: "Pendente",
  CANCELLED: "Cancelada",
  REJECTED: "Rejeitada",
};
const statusClasses = {
  APPROVED: "status-ok",
  PENDING: "status-pend",
  CANCELLED: "status-cancel",
  REJECTED: "status-red",
};

function formatDate(isoDate) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  return timeStr.length > 5 ? timeStr.slice(0, 5) : timeStr;
}

const statusColorMap = {
  APPROVED: { bg: "#DCFCE7", text: "#166534", border: "#22C55E" },
  PENDING: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B" },
  CANCELLED: { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" },
  REJECTED: { bg: "#FEE2E2", text: "#991B1B", border: "#EF4444" },
};

export default function Professor() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [examDatesSet, setExamDatesSet] = useState(new Set());
  const [examInfoByDate, setExamInfoByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingSuspended, setBookingSuspended] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState(null);
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");
      const authlevel = localStorage.getItem("authlevel");

      if (!token) { navigate("/"); return; }
      if (authlevel !== "2") { navigate(authlevel === "1" ? "/coordenador" : "/"); return; }

      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      try {
        const [
              userResponse,
              bookingsResponse,
              roomsResponse,
              periodsResponse,
              holidaysResponse,
              semestersResponse,
              suspendResponse,
]    = await Promise.all([
          fetch("/api/users/me", { headers }),
          fetch("/api/bookings/my", { headers }),
          fetch("/api/rooms", { headers }),
          fetch("/api/periods", { headers }),
          fetch("/api/holidays", { headers }),
          fetch("/api/semesters", { headers }),
          fetch("/api/config/booking/suspend-teacher-bookings", { headers }),
        ]);

        if (!userResponse.ok) throw new Error("Falha ao obter dados do usuário.");
        if (!bookingsResponse.ok) throw new Error("Falha ao obter suas reservas.");
        if (!roomsResponse.ok) throw new Error("Falha ao obter salas.");
        if (!periodsResponse.ok) throw new Error("Falha ao obter horários.");

        const userData = await userResponse.json();
        const bookingsData = await bookingsResponse.json();
        const roomsData = await roomsResponse.json();
        const periodsData = await periodsResponse.json();
        const holidaysData = holidaysResponse.ok ? await holidaysResponse.json() : [];
        const semestersData = semestersResponse.ok ? await semestersResponse.json() : [];
        const suspendData = suspendResponse.ok
          ? await suspendResponse.json()
          : { suspended: false };

        bookingsData.sort((a, b) => {
          const dateA = new Date(a.bookingDate).getTime();
          const dateB = new Date(b.bookingDate).getTime();
          if (dateA !== dateB) return dateA - dateB;
          return (a.periodStart || "").localeCompare(b.periodStart || "");
        });

        // --- semanas de avaliação ---
        const examDates = new Set();
        const examDetails = {};
        const activeSemesters = Array.isArray(semestersData) ? semestersData : (semestersData.content || []);
        await Promise.all(
          activeSemesters.map(async (semester) => {
            if (semester.active !== 1) return;
            try {
              const examRes = await fetch(`/api/semesters/${semester.id}/exam-weeks`, { headers });
              if (examRes.ok) {
                const weeks = await examRes.json();
                weeks.forEach(week => {
                  const start = new Date(week.startDate);
                  const end = new Date(week.endDate);
                  const current = new Date(start);
                  while (current <= end) {
                    const iso = current.toISOString().split('T')[0];
                    examDates.add(iso);
                    if (!examDetails[iso]) examDetails[iso] = new Set();
                    examDetails[iso].add(week.examType);
                    current.setDate(current.getDate() + 1);
                  }
                });
              }
            } catch (err) {
              console.error(`Erro ao carregar exam-weeks do semestre ${semester.id}`, err);
            }
          })
        );

        const examInfo = {};
        Object.keys(examDetails).forEach(date => {
          examInfo[date] = Array.from(examDetails[date]).sort().join(", ");
        });

        setExamDatesSet(examDates);
        setExamInfoByDate(examInfo);
        // ------------------------------------

        setUser(userData);
        setBookings(bookingsData);
        setRooms(roomsData);
        setPeriods(periodsData);
        setHolidays(Array.isArray(holidaysData) ? holidaysData : []);
        setBookingSuspended(suspendData.suspended ?? false);
      } catch (err) {
        setError(err.message || "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [navigate]);

  const summary = useMemo(() => {
    const totalReservations = bookings.length;
    const pendingReservations = bookings.filter((item) => item.status === "PENDING").length;
    const uniqueRooms = new Set(bookings.map((item) => item.roomId)).size;
    const latestBooking = bookings[bookings.length - 1] || null;
    return { totalReservations, pendingReservations, uniqueRooms, totalRooms: rooms.length, latestBooking };
  }, [bookings, rooms.length]);

  const changeMonth = (delta) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
    setHoveredDay(null);
    setTooltipData(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setHoveredDay(null);
    setTooltipData(null);
  };

  // 🔥 CORREÇÃO: busca o feriado diretamente no array holidays, garantindo que o objeto holiday fique disponível
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString("pt-BR", { month: "long", year: "numeric" });
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const dayBookings = {};
    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.bookingDate);
      if (bookingDate.getMonth() !== month || bookingDate.getFullYear() !== year) return;
      const day = bookingDate.getDate();
      if (!dayBookings[day]) dayBookings[day] = [];
      dayBookings[day].push({ ...booking, date: bookingDate });
    });

    Object.keys(dayBookings).forEach(day => {
      dayBookings[day].sort((a, b) => {
        const aStart = a.periods?.[0]?.periodStart || "";
        const bStart = b.periods?.[0]?.periodStart || "";
        return aStart.localeCompare(bStart);
      });
    });

    const emptyCell = { date: "", status: "empty", bookings: [], isHoliday: false, holiday: null, isExam: false, examTypes: "" };

    const cells = Array.from({ length: startOffset }, () => ({ ...emptyCell })).concat(
      Array.from({ length: daysInMonth }, (_, index) => {
        const day = index + 1;
        const dayBookingsList = dayBookings[day] || [];

        const mm = String(month + 1).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        const isoDate = `${year}-${mm}-${dd}`;

        // ✅ busca direta do feriado
        const holidayObj = holidays.find(h => h.holidayDate === isoDate);
        const isHoliday = !!holidayObj;

        const isExam = examDatesSet.has(isoDate);
        const examTypes = examInfoByDate[isoDate] || "";

        let status = "none";
        if (isHoliday) {
          status = "holiday";
        } else if (isExam) {
          status = "exam";
        } else if (dayBookingsList.length > 0) {
          const hasApproved = dayBookingsList.some(b => b.status === "APPROVED");
          const hasPending = dayBookingsList.some(b => b.status === "PENDING");
          if (hasApproved) status = "confirmed";
          else if (hasPending) status = "pending";
          else status = "cancelled";
        }

        return {
          date: day,
          status,
          bookings: dayBookingsList,
          isHoliday,
          holiday: holidayObj,
          isExam,
          examTypes,
        };
      })
    );

    return { monthName, cells, year, month };
  }, [bookings, currentDate, holidays, examDatesSet, examInfoByDate]);

  const handleMouseEnter = (event, cell) => {
    if (!cell.date) return;
    if (cell.bookings.length === 0 && !cell.isHoliday && !cell.isExam) return;
    setHoveredDay(cell.date);
    setTooltipData({ bookings: cell.bookings, holiday: cell.holiday, isExam: cell.isExam, examTypes: cell.examTypes });
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
    setTooltipData(null);
  };

  const handleMouseMove = (event) => {
    if (tooltipData) setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const getCellClassName = (status) => {
    switch(status) {
      case "confirmed": return "calendar-confirmed";
      case "pending":   return "calendar-pending";
      case "cancelled": return "calendar-cancelled";
      case "holiday":   return "dia-feriado";
      case "exam":      return "dia-avaliacao";
      default:          return "";
    }
  };



    if (loading) {
        return (
            <LoadingState
                activePage="Área do Professor"
                heroTag="Painel do Professor"
                heroTitle="Área do Professor"
                heroDescription="Acompanhe suas reservas, solicite novas salas e controle seu calendário."
                description="Carregando dados do professor..."
            />
        );
    }

    if (error) {
        return (
            <ErrorState
                error={error}
                activePage="Área do Professor"
                heroTag="Painel do Professor"
                heroTitle="Área do Professor"
                heroDescription="Acompanhe suas reservas, solicite novas salas e controle seu calendário."
            />
        );
    }

  return (
    <>
      <Navbar activePage="Área do Professor" />

      <PageHero
        tag="Painel do Professor"
        title={user ? `Bem-vindo, ${user.firstname}` : "Área do Professor"}
        description="Acompanhe suas reservas, solicite novas salas e controle seu calendário."
      />

      <main className="content plok" style={{boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", borderRadius: "20px",marginTop: "2em", marginBottom: "3em"}}>
        <div className="dashboard-top-grid">
          <div>
            <div className="stats-row">
              {[
                { highlight: true, icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>, number: summary.totalReservations, label: "Minhas reservas" },
                { icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>, number: summary.uniqueRooms, label: "Salas usadas" },
                { icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, number: summary.pendingReservations, label: "Pendentes" },
              ].map((s) => (
                <div key={s.label} className={`stat-card ${s.highlight ? "highlight" : ""}`}>
                  <div className="stat-icon">{s.icon}</div>
                  <div className="stat-number">{s.number}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
                {bookingSuspended && (
  <div className="booking-suspended-alert">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>

    <span>
      As reservas estão suspensas no momento.
    </span>
  </div>
)}
            {summary.pendingReservations > 0 && (
              <div className="alert-card">
                <div className="alert-icon">
                  <svg viewBox="0 0 24 24">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="alert-text">
                  <h4>{summary.pendingReservations} reservas aguardando ação</h4>
                  <p>Você pode cancelar ou revisar o status de reservas pendentes.</p>
                </div>
              </div>
            )}

            <div className="section-title">Ações rápidas</div>
            <div className="menu-grid">
              {menuActions.map((action) => {
  const isReserveButton =
    action.to === "/solicitar-reserva";

  const disabled =
    bookingSuspended && isReserveButton;

  return (
    <Link
      key={action.title}
      className={`menu-card ${
        disabled ? "menu-card-disabled" : ""
      }`}
      to={disabled ? "#" : action.to}
      onClick={(e) => {
        if (disabled) {
          e.preventDefault();
        }
      }}
    >
        <div className={`menu-icon ${disabled ? "menu-icon-disabled" : ""}`}>
            {action.icon}
        </div>

      <h3>{action.title}</h3>

      <p>{action.desc}</p>
    </Link>
  );
})}
            </div>

            <div className="section-title section-title--top-space">
              Minhas reservas recentes
              <Link className="see-all" to="/minhas-reservas">Ver todas</Link>
            </div>

            <div className="reservas-list">
              {bookings.length === 0 ? (
                <div className="reserva-item">
                  <div className="reserva-info">
                    <div className="reserva-sala">Nenhuma reserva encontrada.</div>
                    <div className="reserva-prof">Crie sua primeira solicitação.</div>
                  </div>
                </div>
              ) : (
                bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="reserva-item">
                    <div className={`reserva-dot ${statusClasses[booking.status] || "dot-green"}`} />
                    <div className="reserva-info">
                      <div className="reserva-sala">{booking.roomName} — {booking.roomLocation}</div>
                      <div className="reserva-prof">{booking.subject || "Sem assunto"}</div>
                    </div>
                    <div className="reserva-time">
                      {formatDate(booking.bookingDate)}<br />
                      {booking.periods && booking.periods.length > 0 ? (
                        <>{formatTime(booking.periods[0].periodStart)}–{formatTime(booking.periods[booking.periods.length - 1].periodEnd)}</>
                      ) : "--:-- – --:--"}
                      <div className={`reserva-status ${statusClasses[booking.status] || "status-ok"}`}>
                        {statusLabels[booking.status] || booking.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <aside className="dashboard-sidebar">
            <div className="dashboard-panel summary-card">
              <h3>Resumo rápido</h3>
              <div className="summary-grid">
                <div><span>Última reserva</span><strong>{summary.latestBooking ? summary.latestBooking.roomName : "Nenhuma"}</strong></div>
              </div>
            </div>

            <div className="dashboard-panel calendar-card">
              <div className="calendar-header">
                <div>
                  <button className="calendar-nav" onClick={() => changeMonth(-1)}>←</button>
                  <span className="calendar-month">{calendarData.monthName}</span>
                  <button className="calendar-nav" onClick={() => changeMonth(1)}>→</button>
                </div>
                <button className="calendar-action" onClick={goToToday}>Hoje</button>
              </div>

              <div className="calendar-grid">
                {weekDays.map((day) => (
                  <div key={day} className="calendar-day-name">{day}</div>
                ))}
                {calendarData.cells.map((cell, index) => {
                  const className = `calendar-cell ${cell.status !== "none" ? getCellClassName(cell.status) : ""}`;
                  return (
                    <div
                      key={`${cell.date}-${index}`}
                      className={className}
                      onMouseEnter={(e) => handleMouseEnter(e, cell)}
                      onMouseLeave={handleMouseLeave}
                      onMouseMove={handleMouseMove}
                      title={cell.isHoliday ? cell.holiday?.name : (cell.isExam ? `Avaliação: ${cell.examTypes}` : undefined)}
                    >
                      {cell.date || ""}
                    </div>
                  );
                })}
              </div>

              <div className="calendar-legend">
                <div className="legend-item"><span className="legend-badge legend-confirmed"></span> Confirmadas</div>
                <div className="legend-item"><span className="legend-badge legend-pending"></span> Pendentes</div>
                <div className="legend-item"><span className="legend-badge legend-cancelled"></span> Canceladas</div>
                <div className="legend-item"><span className="legend-badge legend-holiday"></span> Feriados</div>
                <div className="legend-item"><span className="legend-badge legend-exam"></span> Avaliações</div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* TOOLTIP – com feriado (roxo), avaliação (magenta) e reservas */}
      {tooltipData && hoveredDay && (
        <div
          style={{
            position: "fixed",
            left: tooltipPosition.x + 15,
            top: tooltipPosition.y - 10,
            zIndex: 1000,
            backgroundColor: "#FFFFFF",
            borderRadius: "16px",
            boxShadow: "0 20px 35px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.05)",
            padding: "12px 16px",
            minWidth: "260px",
            maxWidth: "340px",
            maxHeight: "400px",
            overflowY: "auto",
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: "0.85rem",
            color: "#1F2937",
            lineHeight: 1.4,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "10px", borderBottom: "1px solid #E5E7EB", paddingBottom: "6px", display: "flex", justifyContent: "space-between" }}>
            <span>Dia {hoveredDay}</span>
            <span style={{ background: "#F3F4F6", padding: "2px 10px", borderRadius: "20px", fontSize: "0.7rem", fontWeight: "500" }}>
              {tooltipData.bookings.length} reserva(s)
            </span>
          </div>

          {tooltipData.isExam && (
            <div style={{ marginBottom: "10px", padding: "8px", background: "#FDF2F8", borderRadius: "12px", borderLeft: "4px solid #E83E8C" }}>
              <div style={{ fontWeight: 700, color: "#E83E8C", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "4px" }}>Semana de Avaliação</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>Provas: {tooltipData.examTypes}</div>
            </div>
          )}

          {tooltipData.holiday && (
            <div style={{ marginBottom: "10px", padding: "8px", background: "#F3E8FF", borderRadius: "12px", borderLeft: "4px solid #A855F7" }}>
              <div style={{ fontWeight: 700, color: "#6D28D9", fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "4px" }}>Feriado</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>{tooltipData.holiday.name}</div>
              {tooltipData.holiday.description && (
                <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: "4px" }}>{tooltipData.holiday.description}</div>
              )}
            </div>
          )}

          {tooltipData.bookings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {tooltipData.bookings.map((booking) => {
                const statusKey = booking.status;
                const colors = statusColorMap[statusKey] || statusColorMap.PENDING;
                return (
                  <div
                    key={booking.id}
                    style={{
                      background: colors.bg,
                      borderLeft: `4px solid ${colors.border}`,
                      borderRadius: "12px",
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "0.8rem", color: colors.text, marginBottom: "6px" }}>
                      {statusLabels[statusKey] || statusKey}
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1F2937" }}>
                      {booking.periods && booking.periods.length > 0
                        ? `${formatTime(booking.periods[0].periodStart)} – ${formatTime(booking.periods[booking.periods.length - 1].periodEnd)}`
                        : "Horário não definido"}
                    </div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#374151", marginTop: "4px" }}>
                      {booking.roomName}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#6B7280", marginTop: "2px" }}>
                      {booking.subject || "Sem assunto"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Footer />
    </>
  );
}