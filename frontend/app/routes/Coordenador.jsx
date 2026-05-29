import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import "../styles/reservasRecentes.css";

const menuActions = [
    {
    icon: <svg viewBox="0 0 24 24">
      <path d="M17 1l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 23l-4-4 4-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>,
    title: "Reserva Recorrente",
    desc: "Crie reservas para todo o semestre",
    to: "/reserva-recorrente",
  },
  {
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
    title: "Grade de Reservas",
    desc: "Visualize a grade completa do dia",
    to: "/visualizacao-reservas",
  },
  {
    icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
    title: "Reservar Sala",
    desc: "Reserva com aprovação imediata",
    to: "/reserva-coordenador",
  },
  {
    icon: <svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M11 20H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v10" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    title: "Solicitações de Reserva",
    desc: "Aprove ou rejeite solicitações pendentes",
    to: "/coordenador-solicitacoes",
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="#C0121C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               className="lucide lucide-list-icon lucide-list">
      <path d="M3 5h.01"/>
      <path d="M3 12h.01"/>
      <path d="M3 19h.01"/>
      <path d="M8 5h13"/>
      <path d="M8 12h13"/>
      <path d="M8 19h13"/>
    </svg>,
    title: "Todas as Reservas",
    desc: "Visualize e gerencie histórico completo",
    to: "/todas-reservas",
  },
  {
    icon: <svg viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4"/>
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>,
    title: "Gerenciar Usuários",
    desc: "Gerencie os usuários do sistema",
    to: "/gerenciar-usuarios",
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="#C0121C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               className="lucide lucide-check-icon lucide-check">
      <path d="M20 6 9 17l-5-5"/>
    </svg>,
    title: "Aprovação de Cadastro",
    desc: "Aprove novos professores e coordenadores",
    to: "/confirmar",
  },
  {
    icon: <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
    title: "Configurações",
    desc: "Configure períodos e semestres",
    to: "/configuracao",
  },
  {
    icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
               stroke="#C0121C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               className="lucide lucide-building2-icon lucide-building-2">
      <path d="M10 12h4"/>
      <path d="M10 8h4"/>
      <path d="M14 21v-3a2 2 0 0 0-4 0v3"/>
      <path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/>
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>
    </svg>,
    title: "Gerenciar Salas",
    desc: "Adicione, edite ou desative salas",
    to: "/gerenciar-salas",
  },
  {
    icon: <svg viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>,
    title: "Relatórios",
    desc: "Uso de salas e estatísticas do semestre",
    to: "/relatorio-reservas",
  },
];

const statusLabels = {
  APPROVED: "Confirmada",
  ACTIVE: "Ativa",
  PENDING: "Pendente",
  CANCELLED: "Cancelada",
  REJECTED: "Recusada",
};

const statusClasses = {
  APPROVED: "status-ok",
  ACTIVE: "status-ok",
  PENDING: "status-pend",
  CANCELLED: "status-cancel",
  REJECTED: "status-red",
};

const WEEKDAY_LABELS = {
  MONDAY: "Seg", TUESDAY: "Ter", WEDNESDAY: "Qua",
  THURSDAY: "Qui", FRIDAY: "Sex", SATURDAY: "Sáb",
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

export default function Coordenador() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [professors, setProfessors] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentRecurring, setRecentRecurring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingUsers, setPendingUsers] = useState([]);

  useEffect(() => {
    const authlevel = localStorage.getItem('authlevel');
    if (authlevel !== '1') {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      };
      const today = new Date().toISOString().slice(0, 10);

      try {
        const [roomsResp, usersResp, todayResp, recentResp, pendingResp, recurringResp, pendingUsersResp] = await Promise.all([
          fetch('/api/rooms', { headers }),
          fetch('/api/admin/users', { headers }),
          fetch(`/api/bookings/admin/by-date?date=${today}`, { headers }),
          fetch('/api/bookings/admin/all?page=0&size=5', { headers }),
          fetch('/api/bookings/admin/pending?page=0&size=50', { headers }),
          fetch('/api/recurring-bookings?page=0&size=5', { headers }),
          fetch('/api/admin/users/pending', { headers }), // Novo endpoint
        ]);

        if (!roomsResp.ok) throw new Error('Falha ao buscar salas');
        if (!usersResp.ok) throw new Error('Falha ao buscar professores');
        if (!todayResp.ok) throw new Error('Falha ao buscar reservas de hoje');
        if (!pendingResp.ok) throw new Error('Falha ao buscar reservas pendentes');
        if (!recentResp.ok) throw new Error('Falha ao buscar reservas recentes');

        const roomsData = await roomsResp.json();
        const usersData = await usersResp.json();
        const todayData = await todayResp.json();
        const recentData = await recentResp.json();
        const pendingData = await pendingResp.json();
        const recurringData = recurringResp.ok ? await recurringResp.json() : { content: [] };

        // Usar o endpoint específico para usuários pendentes
        let pendingUsersData = [];
        if (pendingUsersResp.ok) {
          pendingUsersData = await pendingUsersResp.json();
        }

        setPendingUsers(pendingUsersData || []);
        setRooms(roomsData || []);
        setProfessors((usersData || []).filter((user) => user.authlevel === 2));
        setTodayBookings(todayData.content ?? todayData);
        setRecentBookings(recentData.content ?? recentData);
        setPendingBookings(pendingData.content ?? pendingData);
        setRecentRecurring(recurringData.content ?? recurringData ?? []);
      } catch (err) {
        setError(err.message || 'Erro ao carregar painel do coordenador.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const stats = useMemo(() => [
    {
      highlight: true,
      icon: <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>,
      number: rooms.length,
      label: "Salas ativas",
    },
    {
      icon: <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
      number: todayBookings.length,
      label: "Reservas hoje",
    },
    {
      icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>,
      number: professors.length,
      label: "Professores",
    },
    {
      icon: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
      number: pendingBookings.length,
      label: "Reservas Pendentes",
    },
  ], [rooms.length, todayBookings.length, professors.length, pendingBookings.length]);

  if (loading) {
    return (
      <>
        <Navbar activePage="Área do Coordenador" />
        <div className="content">Carregando painel do coordenador...</div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar activePage="Área do Coordenador" />
        <div className="content">Erro: {error}</div>
        <Footer />
      </>
    );
  }

  // Combine reservas simples + recorrentes recentes (até 5 total)
  const allRecent = [
    ...recentBookings.map((b) => ({ ...b, _type: "simple" })),
    ...recentRecurring.map((b) => ({ ...b, _type: "recurring" })),
  ].slice(0, 5);

  return (
      <>
        <Navbar activePage="Área do Coordenador" />

        <PageHero
            variant="coordenador"
            tag="Painel Administrativo"
            title="Área do Coordenador"
            description="Gerencie salas, professores e reservas."
        />

        <main className="content dashboard-page plok2" style={{boxShadow: "0 1px 4px rgba(0,0,0,.1)", border: "1px solid #e5e7eb", marginTop:"2em"}}>
          <div className="dashboard-top-grid">

            {/* Coluna principal */}
            <div>
              {/* Estatísticas */}
              <div className="stats-row2">
                {stats.map((s) => (
                    <div key={s.label} className={`stat-card ${s.highlight ? "highlight" : ""}`}>
                      <div className="stat-icon">{s.icon}</div>
                      <div className="stat-number">{s.number}</div>
                      <div className="stat-label">{s.label}</div>
                    </div>
                ))}
              </div>

              {/* Alerta de reservas pendentes */}
              {pendingBookings.length > 0 && (
                  <div className="alert-card">
                    <div className="alert-icon">
                      <svg viewBox="0 0 24 24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div className="alert-text">
                      <h4>{pendingBookings.length} reservas aguardando aprovação</h4>
                      <p>Professores estão aguardando sua confirmação.</p>
                    </div>
                  </div>
              )}

              {/* Alerta de usuários pendentes */}
              {pendingUsers.length > 0 && (
                  <div className="alert-card" style={{ background: "#eff6ff", borderColor: "#3b82f6" }}>
                    <div className="alert-icon" style={{ background: "#3b82f6" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                      </svg>
                    </div>
                    <div className="alert-text">
                      <h4 style={{ color: "#1e40af" }}>
                        {pendingUsers.length} cadastro{pendingUsers.length !== 1 ? "s" : ""} pendente{pendingUsers.length !== 1 ? "s" : ""}
                      </h4>
                      <p style={{ color: "#1e3a8a" }}>
                        Novos usuários aguardam aprovação de cadastro.
                      </p>
                    </div>
                  </div>
              )}

              {/* Menu de ações */}
              <div className="section-title">Ações rápidas</div>
              <div className="menu-grid">
                {menuActions.map((action) => (
                    <Link key={action.title} className="menu-card" to={action.to}>
                      <div className="menu-icon">{action.icon}</div>
                      <h3>{action.title}</h3>
                      <p>{action.desc}</p>
                    </Link>
                ))}
              </div>
            </div>

            {/* Sidebar - Reservas recentes (mantendo estilização original) */}
            <aside className="dashboard-sidebar">
              <div className="dashboard-panel summary-card">
                <div className="section-title" style={{ padding: "0", marginBottom: "16px" }}>
                  Reservas recentes
                  <Link className="see-all" to="/todas-reservas">Ver todas</Link>
                </div>

                <div className="reservas-list" style={{ padding: "0" }}>
                  {recentBookings.length === 0 ? (
                      <div className="reserva-item">
                        <div className="reserva-info">
                          <div className="reserva-sala">Nenhuma reserva recente encontrada.</div>
                        </div>
                      </div>
                  ) : (
                      recentBookings.map((booking) => (
                          <div key={booking.id} className="reserva-item">
                            <div className={`reserva-dot ${statusClasses[booking.status] || "dot-green"}`} />
                            <div className="reserva-info">
                              <div className="reserva-sala">{booking.roomName} — {booking.roomLocation}</div>
                              <div className="reserva-prof">{booking.userDisplayName || booking.username}</div>
                            </div>
                            <div className="reserva-time">
                              {formatDate(booking.bookingDate)}<br />
                              {booking.periods && booking.periods.length > 0 ? (
                                  <>
                                    {formatTime(booking.periods[0].periodStart)}–{formatTime(booking.periods[booking.periods.length - 1].periodEnd)}
                                  </>
                              ) : (
                                  "--:-- – --:--"
                              )}
                              <div className={`reserva-status ${statusClasses[booking.status] || "status-ok"}`}>
                                {statusLabels[booking.status] || booking.status}
                              </div>
                            </div>
                          </div>
                      ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        </main>

        <div className="spacer" />
        <Footer />
      </>
  );
}