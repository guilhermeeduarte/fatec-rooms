import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

// Mapa de cores por status
const COLOR_MAP_AVULSAS = {
  "Aprovadas": "#22C55E",    // Verde
  "Pendentes": "#F59E0B",    // Amarelo
  "Canceladas": "#EF4444",   // Vermelho
};

const COLOR_MAP_RECURRING = {
  "Ativas": "#22C55E",                           // Verde
  "Canceladas": "#EF4444",                       // Vermelho
  "Puladas (feriado/conflito)": "#9CA3AF",      // Cinza
};

const COLORS_AVULSAS   = ["#22C55E", "#F59E0B", "#6B7280", "#EF4444"];
const COLORS_RECURRING = ["#22C55E", "#EF4444", "#9CA3AF"];

export default function RelatorioReservas() {
  const [salas,      setSalas]      = useState([]);
  const [recurring,  setRecurring]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [busca,      setBusca]      = useState("");
  const [activeTab,  setActiveTab]  = useState("salas"); // "salas" | "recorrentes"

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

        const [roomsRes, recurringRes] = await Promise.all([
          fetch("/api/reports/rooms",     { headers }),
          fetch("/api/reports/recurring", { headers }),
        ]);

        if (!roomsRes.ok)     throw new Error("Falha ao carregar relatório de salas.");
        if (!recurringRes.ok) throw new Error("Falha ao carregar relatório de recorrentes.");

        setSalas(await roomsRes.json());
        setRecurring(await recurringRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);

  // ── Filtros ──────────────────────────────────────────────────────────────────
  const salasFiltradas = salas.filter((s) =>
    s.name.toLowerCase().includes(busca.toLowerCase()) ||
    (s.location || "").toLowerCase().includes(busca.toLowerCase())
  );

  const recurringFiltrados = recurring.filter((r) =>
    r.roomName.toLowerCase().includes(busca.toLowerCase()) ||
    r.classGroupLabel.toLowerCase().includes(busca.toLowerCase()) ||
    r.courseName.toLowerCase().includes(busca.toLowerCase()) ||
    r.semesterName.toLowerCase().includes(busca.toLowerCase())
  );

  // ── Totais — aba Salas ────────────────────────────────────────────────────────
  const totalAvulsas        = salasFiltradas.reduce((a, s) => a + s.totalBookings, 0);
  const totalAprovadas      = salasFiltradas.reduce((a, s) => a + s.approvedBookings, 0);
  const totalPendentes      = salasFiltradas.reduce((a, s) => a + s.pendingBookings, 0);
  const totalCanceladas     = salasFiltradas.reduce((a, s) => a + s.cancelledBookings + s.rejectedBookings, 0);
  const totalRInstancias    = salasFiltradas.reduce((a, s) => a + s.recurringTotalInstances, 0);
  const totalRAtivas        = salasFiltradas.reduce((a, s) => a + s.recurringActiveInstances, 0);
  const totalCombinado      = salasFiltradas.reduce((a, s) => a + s.combinedOccupations, 0);

  // ── Totais — aba Recorrentes ─────────────────────────────────────────────────
  const rTotal    = recurringFiltrados.reduce((a, r) => a + r.totalInstances, 0);
  const rAtivas   = recurringFiltrados.reduce((a, r) => a + r.activeInstances, 0);
  const rCanceladas = recurringFiltrados.reduce((a, r) => a + r.cancelledInstances, 0);
  const rSkipped  = recurringFiltrados.reduce((a, r) => a + r.skippedInstances, 0);
  const rAtivas_rb = recurringFiltrados.filter(r => r.status === "ACTIVE").length;
  const rCanceladas_rb = recurringFiltrados.filter(r => r.status === "CANCELLED").length;

  // ── Dados dos gráficos ────────────────────────────────────────────────────────
  const pieAvulsas = [
    { name: "Aprovadas",  value: totalAprovadas },
    { name: "Pendentes",  value: totalPendentes },
    { name: "Canceladas", value: totalCanceladas },
  ].filter(d => d.value > 0);

  const pieInstancias = [
    { name: "Ativas",     value: totalRAtivas },
    { name: "Canceladas", value: salasFiltradas.reduce((a, s) => a + s.recurringCancelledInstances, 0) },
    { name: "Puladas",    value: salasFiltradas.reduce((a, s) => a + s.recurringSkippedInstances, 0) },
  ].filter(d => d.value > 0);

  const barData = salasFiltradas
    .filter(s => s.combinedOccupations > 0)
    .sort((a, b) => b.combinedOccupations - a.combinedOccupations)
    .slice(0, 10)
    .map(s => ({
      name: s.name,
      "Simples aprovadas":    s.approvedBookings,
      "Recorrentes ativas":   s.recurringActiveInstances,
      "Pendentes":            s.pendingBookings,
    }));

  const pieRecurring = [
    { name: "Ativas",     value: rAtivas },
    { name: "Canceladas", value: rCanceladas },
    { name: "Puladas (feriado/conflito)", value: rSkipped },
  ].filter(d => d.value > 0);

  // ── CSV export ────────────────────────────────────────────────────────────────
  function exportarCSV() {
    if (activeTab === "salas") {
      const headers = [
        "Sala","Localização",
        "Simples Total","Aprovadas","Pendentes","Canceladas","Rejeitadas",
        "Recorrentes Total","Recorrentes Ativas","Recorrentes Canceladas","Recorrentes Puladas",
        "Ocupações Combinadas",
      ];
      const rows = salasFiltradas.map(s => [
        s.name, s.location || "",
        s.totalBookings, s.approvedBookings, s.pendingBookings, s.cancelledBookings, s.rejectedBookings,
        s.recurringTotalInstances, s.recurringActiveInstances, s.recurringCancelledInstances, s.recurringSkippedInstances,
        s.combinedOccupations,
      ]);
      downloadCSV(headers, rows, "relatorio_salas.csv");
    } else {
      const headers = [
        "ID","Sala","Localização","Semestre","Turma","Curso","Matéria","Status",
        "Total Instâncias","Ativas","Canceladas","Puladas",
      ];
      const rows = recurringFiltrados.map(r => [
        r.recurringBookingId, r.roomName, r.roomLocation || "", r.semesterName,
        r.classGroupLabel, r.courseName, r.subject, r.status === "ACTIVE" ? "Ativa" : "Cancelada",
        r.totalInstances, r.activeInstances, r.cancelledInstances, r.skippedInstances,
      ]);
      downloadCSV(headers, rows, "relatorio_recorrentes.csv");
    }
  }

  function downloadCSV(headers, rows, filename) {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) return (
    <>
      <Navbar activePage="Relatórios" />
      <div className="content">Carregando relatórios...</div>
      <Footer />
    </>
  );

  if (error) return (
    <>
      <Navbar activePage="Relatórios" />
      <div className="content">Erro: {error}</div>
      <Footer />
    </>
  );

  return (
    <>
      <Navbar activePage="Relatórios" />

      <PageHero
        title="Relatórios de Uso"
        className="page-hero-relatorios"
        tag="Análise de Reservas"
        description="Visualize estatísticas de utilização das salas — simples e recorrentes."
      />

      <div className="layout-relatorios">

        {/* ── ABAS ─────────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "12px", borderBottom: "2px solid var(--gray-200)", paddingBottom: "0" }}>
          {[
            { key: "salas",       label: "Salas" },
            { key: "recorrentes", label: "Reservas Recorrentes" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setBusca(""); }}
              style={{
                padding: "10px 20px",
                border: "none",
                borderBottom: activeTab === tab.key ? "3px solid var(--red)" : "3px solid transparent",
                background: "none",
                fontFamily: "var(--font-main)",
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: "14px",
                color: activeTab === tab.key ? "var(--red)" : "var(--gray-500)",
                cursor: "pointer",
                borderRadius: "0",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ABA: SALAS ────────────────────────────────────────────────────────── */}
        {activeTab === "salas" && (
          <>
            {/* Stats */}
            <div className="stats-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              <StatCard highlight label="Ocupações Totais" value={totalCombinado} />
              <StatCard label="Simples"         value={totalAvulsas} />
              <StatCard label="Aprovadas"       value={totalAprovadas} />
              <StatCard label="Pendentes"       value={totalPendentes} />
              <StatCard label="Inst. Recorrentes" value={totalRInstancias} />
              <StatCard label="Recorrentes Ativas" value={totalRAtivas} />
            </div>

            {/* Filtro */}
            <FiltroBar busca={busca} setBusca={setBusca} onExport={exportarCSV} onClear={() => setBusca("")} />

            {/* Gráficos */}
            <div className="graficos-grid">
              <div className="grafico-card">
                <h2>Reservas Simples por Status</h2>
                {pieAvulsas.length === 0
                  ? <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Nenhum dado.</p>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={pieAvulsas} cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100} dataKey="value">
                          {pieAvulsas.map((item) => (
                            <Cell key={item.name} fill={COLOR_MAP_AVULSAS[item.name]} />
                          ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              padding: "8px 12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              border: "none",
                              backgroundColor: "#ffffff",
                              fontSize: "12px",
                              fontFamily: "var(--font-main)"
                            }}
                        /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              </div>

              <div className="grafico-card">
                <h2>Instâncias Recorrentes por Status</h2>
                {pieInstancias.length === 0
                  ? <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Nenhum dado.</p>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={pieInstancias} cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100} dataKey="value">
                          {pieInstancias.map((item) => (
                            <Cell key={item.name} fill={COLOR_MAP_RECURRING[item.name]} />
                          ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              padding: "8px 12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              border: "none",
                              backgroundColor: "#ffffff",
                              fontSize: "12px",
                              fontFamily: "var(--font-main)"
                            }}
                        /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              </div>
            </div>

            {/* Barras combinadas */}
            <div className="grafico-card">
              <h2>Ocupações por Sala — Top 10 (simples + recorrentes)</h2>
              {barData.length === 0
                ? <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Nenhuma sala com ocupação encontrada.</p>
                : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barData} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={55} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            padding: "8px 12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            border: "none",
                            backgroundColor: "#ffffff",
                            fontSize: "12px",
                            fontFamily: "var(--font-main)"
                          }}
                      />
                      <Legend />
                      <Bar dataKey="Simples aprovadas"  stackId="a" fill="#22C55E" />
                      <Bar dataKey="Recorrentes ativas" stackId="a" fill="#3B82F6" />
                      <Bar dataKey="Pendentes"          stackId="a" fill="#F59E0B" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
            </div>

            {/* Tabela detalhada */}
            <div className="grafico-card">
              <h2>Detalhamento por Sala</h2>
              {salasFiltradas.length === 0
                ? <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Nenhuma sala encontrada.</p>
                : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--gray-200)", background: "var(--gray-50)" }}>
                          <Th>Sala</Th>
                          <Th>Local</Th>
                          <Th center>Simples</Th>
                          <Th center color="#22C55E">Aprovadas</Th>
                          <Th center color="#F59E0B">Pendentes</Th>
                          <Th center color="#EF4444">Canceladas</Th>
                          <Th center>Inst. Rec.</Th>
                          <Th center color="#22C55E">Rec. Ativas</Th>
                          <Th center color="#EF4444">Rec. Canceladas</Th>
                          <Th center color="#9CA3AF">Puladas</Th>
                          <Th center color="#3B82F6">Combinado</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {salasFiltradas.map((s, i) => (
                          <tr key={s.roomId} style={{
                            borderBottom: "1px solid var(--gray-200)",
                            background: i % 2 === 0 ? "transparent" : "var(--gray-50)",
                          }}>
                            <Td bold>{s.name}</Td>
                            <Td gray>{s.location || "—"}</Td>
                            <Td center bold>{s.totalBookings}</Td>
                            <Td center color="#22C55E">{s.approvedBookings}</Td>
                            <Td center color="#F59E0B">{s.pendingBookings}</Td>
                            <Td center color="#EF4444">{s.cancelledBookings + s.rejectedBookings}</Td>
                            <Td center>{s.recurringTotalInstances}</Td>
                            <Td center color="#22C55E">{s.recurringActiveInstances}</Td>
                            <Td center color="#EF4444">{s.recurringCancelledInstances}</Td>
                            <Td center color="#9CA3AF">{s.recurringSkippedInstances}</Td>
                            <Td center bold color="#3B82F6">{s.combinedOccupations}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </>
        )}

        {/* ── ABA: RECORRENTES ─────────────────────────────────────────────────── */}
        {activeTab === "recorrentes" && (
          <>
            {/* Stats */}
            <div className="stats-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
              <StatCard highlight label="Séries Ativas"       value={rAtivas_rb} />
              <StatCard label="Séries Canceladas" value={rCanceladas_rb} />
              <StatCard label="Total Instâncias"  value={rTotal} />
              <StatCard label="Inst. Ativas"      value={rAtivas} />
              <StatCard label="Inst. Canceladas"  value={rCanceladas} />
              <StatCard label="Puladas"           value={rSkipped} />
            </div>

            {/* Filtro */}
            <FiltroBar busca={busca} setBusca={setBusca} onExport={exportarCSV} onClear={() => setBusca("")}
              placeholder="Buscar por sala, turma, curso ou semestre..." />

            {/* Gráfico de instâncias */}
            <div className="graficos-grid">
              <div className="grafico-card">
                <h2>Distribuição de Instâncias</h2>
                {pieRecurring.length === 0
                  ? <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Nenhum dado.</p>
                  : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={pieRecurring} cx="50%" cy="50%" labelLine={false}
                          label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100} dataKey="value">
                          {pieRecurring.map((item) => (
                            <Cell key={item.name} fill={COLOR_MAP_RECURRING[item.name]} />
                          ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              padding: "8px 12px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              border: "none",
                              backgroundColor: "#ffffff",
                              fontSize: "12px",
                              fontFamily: "var(--font-main)"
                            }}
                        /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
              </div>

              <div className="grafico-card">
                <h2>Top Salas por Instâncias Ativas</h2>
                {(() => {
                  const grouped = {};
                  recurringFiltrados.forEach(r => {
                    if (!grouped[r.roomName]) grouped[r.roomName] = 0;
                    grouped[r.roomName] += r.activeInstances;
                  });
                  const data = Object.entries(grouped)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([name, value]) => ({ name, "Instâncias ativas": value }));

                  return data.length === 0
                    ? <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Nenhum dado.</p>
                    : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data} margin={{ left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={55} />
                          <YAxis allowDecimals={false} />
                          <Tooltip
                              contentStyle={{
                                borderRadius: "12px",
                                padding: "8px 12px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                border: "none",
                                backgroundColor: "#ffffff",
                                fontSize: "12px",
                                fontFamily: "var(--font-main)"
                              }}
                          />
                          <Bar dataKey="Instâncias ativas" fill="#3B82F6" />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                })()}
              </div>
            </div>

            {/* Tabela de recorrentes */}
            <div className="grafico-card">
              <h2>Detalhamento das Reservas Recorrentes</h2>
              {recurringFiltrados.length === 0
                ? <p style={{ color: "var(--gray-500)", fontSize: 14 }}>Nenhuma reserva recorrente encontrada.</p>
                : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--gray-200)", background: "var(--gray-50)" }}>
                          <Th>Sala</Th>
                          <Th>Semestre</Th>
                          <Th>Turma</Th>
                          <Th>Matéria</Th>
                          <Th center>Status</Th>
                          <Th center>Total</Th>
                          <Th center color="#22C55E">Ativas</Th>
                          <Th center color="#EF4444">Canceladas</Th>
                          <Th center color="#9CA3AF">Puladas</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {recurringFiltrados.map((r, i) => (
                          <tr key={r.recurringBookingId} style={{
                            borderBottom: "1px solid var(--gray-200)",
                            background: i % 2 === 0 ? "transparent" : "var(--gray-50)",
                          }}>
                            <Td bold>{r.roomName}</Td>
                            <Td gray>{r.semesterName}</Td>
                            <Td>{r.classGroupLabel}</Td>
                            <Td>{r.subject}</Td>
                            <Td center>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 10px",
                                borderRadius: "20px",
                                fontSize: 11,
                                fontWeight: 700,
                                background: r.status === "ACTIVE" ? "#DCFCE7" : "#FEE2E2",
                                color: r.status === "ACTIVE" ? "#166534" : "#991B1B",
                              }}>
                                {r.status === "ACTIVE" ? "Ativa" : "Cancelada"}
                              </span>
                            </Td>
                            <Td center bold>{r.totalInstances}</Td>
                            <Td center color="#22C55E">{r.activeInstances}</Td>
                            <Td center color="#EF4444">{r.cancelledInstances}</Td>
                            <Td center color="#9CA3AF">{r.skippedInstances}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </>
        )}

      </div>
      <Footer />
    </>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────
function StatCard({ label, value, highlight }) {
  return (
    <div className={`stat-card ${highlight ? "highlight" : ""}`}>
      <div className="stat-number">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function FiltroBar({ busca, setBusca, onExport, onClear, placeholder }) {
  return (
    <div className="grafico-card">
      <div className="filtros" style={{ gap: "10px", background: "none", border: "none", padding: 0 }}>
        <input
          type="text"
          placeholder={placeholder || "Buscar por sala ou localização..."}
          value={busca}
          onChange={e => setBusca(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn-action btn-danger" onClick={onClear}>Limpar</button>
        <button className="btn-action btn-secondary" onClick={onExport}>Exportar CSV</button>
      </div>
    </div>
  );
}

function Th({ children, center, color }) {
  return (
    <th style={{
      textAlign: center ? "center" : "left",
      padding: "10px 10px",
      fontFamily: "var(--font-main)",
      fontWeight: 700,
      fontSize: 12,
      color: color || "inherit",
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}

function Td({ children, center, bold, color, gray }) {
  return (
    <td style={{
      padding: "9px 10px",
      textAlign: center ? "center" : "left",
      fontWeight: bold ? 700 : 400,
      color: color || (gray ? "var(--gray-500)" : "inherit"),
      fontSize: 13,
    }}>
      {children}
    </td>
  );
}
