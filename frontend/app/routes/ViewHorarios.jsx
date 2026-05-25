import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import "../styles/app.css";

const TIME_SLOTS = [
  { id: "t1",  label: "07:30", end: "08:20", period: "Manhã" },
  { id: "t2",  label: "08:20", end: "09:10", period: "Manhã" },
  { id: "t3",  label: "09:10", end: "10:00", period: "Manhã" },
  { id: "t4",  label: "10:10", end: "11:00", period: "Manhã" },
  { id: "t5",  label: "11:00", end: "11:50", period: "Manhã" },
  { id: "t6",  label: "13:00", end: "13:50", period: "Tarde" },
  { id: "t7",  label: "13:50", end: "14:40", period: "Tarde" },
  { id: "t8",  label: "14:50", end: "15:40", period: "Tarde" },
  { id: "t9",  label: "15:40", end: "16:30", period: "Tarde" },
  { id: "t10", label: "16:40", end: "17:30", period: "Tarde" },
  { id: "t11", label: "19:20", end: "20:10", period: "Noite" },
  { id: "t12", label: "20:10", end: "21:00", period: "Noite" },
  { id: "t13", label: "21:10", end: "22:00", period: "Noite" },
  { id: "t14", label: "22:00", end: "22:50", period: "Noite" },
];

const ROOMS = [
  { id: "r1",  name: "Lab 111",         capacity: 30 },
  { id: "r2",  name: "Lab 112",         capacity: 30 },
  { id: "r3",  name: "Laboratório 101", capacity: 35 },
  { id: "r4",  name: "Laboratório 102", capacity: 35 },
  { id: "r5",  name: "Laboratório 103", capacity: 35 },
  { id: "r6",  name: "Laboratório 201", capacity: 40 },
  { id: "r7",  name: "Laboratório 202", capacity: 40 },
  { id: "r8",  name: "Laboratório 203", capacity: 40 },
  { id: "r9",  name: "T01",             capacity: 45 },
  { id: "r10", name: "T02",             capacity: 45 },
];

const RESERVATIONS = [
  { id:"res1",  roomId:"r1",  slotId:"t1",  span:5, class:"1º RH",               professor:"Prof. Ana Lima",       color:"recurring" },
  { id:"res2",  roomId:"r1",  slotId:"t11", span:4, class:"1º AMS ADS",         professor:"Prof. Carlos Souza",   color:"recurring" },
  { id:"res3",  roomId:"r2",  slotId:"t1",  span:5, class:"1º GE",              professor:"Prof. Maria Oliveira", color:"simple" },
  { id:"res4",  roomId:"r2",  slotId:"t11", span:4, class:"2º AMS ADS",         professor:"Prof. João Silva",     color:"recurring" },
  { id:"res5",  roomId:"r3",  slotId:"t1",  span:5, class:"4º DSM",             professor:"Prof. Rafael Costa",   color:"recurring" },
  { id:"res8",  roomId:"r4",  slotId:"t1",  span:5, class:"2º DSM",             professor:"Prof. Lucas Ferreira", color:"recurring" },
  { id:"res9",  roomId:"r4",  slotId:"t6",  span:4, class:"1º ADS Tarde",       professor:"Prof. Sandra Rocha",   color:"simple" },
  { id:"res10", roomId:"r4",  slotId:"t11", span:3, class:"5º ADS Noite",       professor:"Prof. Paulo Mendes",   color:"recurring" },
  { id:"res11", roomId:"r5",  slotId:"t1",  span:5, class:"6º DSM",             professor:"Prof. Carla Dias",     color:"recurring" },
  { id:"res13", roomId:"r5",  slotId:"t11", span:3, class:"Luís Sasaki",        professor:"Prof. Luís Sasaki",    color:"recurring" },
  { id:"res14", roomId:"r6",  slotId:"t1",  span:5, class:"3º Log",             professor:"Prof. Fátima Torres",  color:"recurring" },
  { id:"res15", roomId:"r6",  slotId:"t6",  span:4, class:"3º ADS Tarde",       professor:"Prof. Eduardo Lopes",  color:"simple" },
  { id:"res17", roomId:"r7",  slotId:"t1",  span:5, class:"1º DSM",             professor:"Prof. Vera Santos",    color:"recurring" },
  { id:"res19", roomId:"r7",  slotId:"t11", span:3, class:"4º ADS Noite",       professor:"Prof. Tânia Braga",    color:"recurring" },
  { id:"res20", roomId:"r8",  slotId:"t6",  span:4, class:"Josue Mario",        professor:"Prof. Josue Mario",    color:"simple" },
  { id:"res21", roomId:"r9",  slotId:"t1",  span:5, class:"1º Log",             professor:"Prof. Rita Campos",    color:"recurring" },
  { id:"res22", roomId:"r9",  slotId:"t11", span:4, class:"1º ADS Noite",       professor:"Prof. Nelson Vieira",  color:"recurring" },
  { id:"res23", roomId:"r10", slotId:"t1",  span:5, class:"4º Log",             professor:"Prof. Helena Cruz",    color:"recurring" },
  { id:"res24", roomId:"r10", slotId:"t6",  span:4, class:"4º COMEX Tarde",     professor:"Prof. Jorge Alves",    color:"simple" },
];

const COLOR_LABEL = {
  recurring: "Recorrente",
  simple: "Simples",
};

function getSlotIndex(id) {
  return TIME_SLOTS.findIndex((s) => s.id === id);
}

function Tooltip({ res, roomName, x, y }) {
  if (!res) return null;

  const start = TIME_SLOTS.find((s) => s.id === res.slotId);
  const end = TIME_SLOTS[getSlotIndex(res.slotId) + res.span - 1];

  return (
    <div
      className={`gr-tip gr-tip--${res.color}`}
      style={{ left: x + 14, top: y - 8 }}
    >
      <strong>{roomName}</strong>

      <span className={`gr-tip__badge gr-tip__badge--${res.color}`}>
        {COLOR_LABEL[res.color]}
      </span>

      <span className="gr-tip__hora">
        {start?.label} – {end?.end}
      </span>

      <span className="gr-tip__turma">{res.class}</span>
    </div>
  );
}

/* ─── mini calendário ───────────────────────────────────────────────────── */
function MiniCalendar({ onSelect, onClose }) {
  const today = new Date(2026, 4, 25);

  const [cur, setCur] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const year = cur.getFullYear();
  const month = cur.getMonth();

  const monthName = cur.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = Array(firstDay)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const weeks = [];

  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="gr-minical">
      <div className="gr-minical__nav">
        <button onClick={() => setCur(new Date(year, month - 1, 1))}>
          ‹
        </button>

        <span>{monthName}</span>

        <button onClick={() => setCur(new Date(year, month + 1, 1))}>
          ›
        </button>
      </div>

      <div className="gr-minical__grid">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <span key={i} className="gr-minical__wd">
            {d}
          </span>
        ))}

        {weeks.flat().map((day, i) => (
          <button
            key={i}
            className={`gr-minical__day${
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear()
                ? " gr-minical__day--today"
                : ""
            }${!day ? " gr-minical__day--empty" : ""}`}
            disabled={!day}
            onClick={() => {
              if (day) {
                onSelect(new Date(year, month, day));
                onClose();
              }
            }}
          >
            {day || ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScheduleGrid() {
  const [tip, setTip] = useState({
    res: null,
    roomName: "",
    x: 0,
    y: 0,
  });

  const periods = ["Manhã", "Tarde", "Noite"];

  const periodSlots = {
    Manhã: TIME_SLOTS.filter((s) => s.period === "Manhã"),
    Tarde: TIME_SLOTS.filter((s) => s.period === "Tarde"),
    Noite: TIME_SLOTS.filter((s) => s.period === "Noite"),
  };

  function getRes(roomId, slotId) {
    return RESERVATIONS.find(
      (r) => r.roomId === roomId && r.slotId === slotId
    );
  }

  function isCovered(roomId, slotId) {
    const idx = getSlotIndex(slotId);

    return RESERVATIONS.some((r) => {
      if (r.roomId !== roomId) return false;

      const s = getSlotIndex(r.slotId);

      return idx > s && idx < s + r.span;
    });
  }

  return (
    <div className="gr-wrap">
      {tip.res && (
        <Tooltip
          res={tip.res}
          roomName={tip.roomName}
          x={tip.x}
          y={tip.y}
        />
      )}

      {/* períodos */}
      <div className="gr-head gr-head--period">
        <div className="gr-sala-col" />

        {periods.map((p) => (
          <div
            key={p}
            className={`gr-period gr-period--${p.toLowerCase()}`}
            style={{ gridColumn: `span ${periodSlots[p].length}` }}
          >
            {p}
          </div>
        ))}
      </div>

      {/* horários */}
      <div className="gr-head gr-head--slots">
        <div className="gr-sala-col" />

        {TIME_SLOTS.map((s) => (
          <div key={s.id} className="gr-slot-th">
            <span className="gr-slot-th__h">{s.label}</span>
            <span className="gr-slot-th__e">{s.end}</span>
          </div>
        ))}
      </div>

      {/* linhas */}
      {ROOMS.map((room) => (
        <div key={room.id} className="gr-row">
          <div className="gr-sala-col">
            <div className="gr-sala">
              <span className="gr-sala__nome">{room.name}</span>
              <span className="gr-sala__cap">
                {room.capacity} lug.
              </span>
            </div>
          </div>

          {TIME_SLOTS.map((slot) => {
            if (isCovered(room.id, slot.id)) return null;

            const res = getRes(room.id, slot.id);

            if (res) {
              return (
                <div
                  key={slot.id}
                  className={`gr-cell gr-block gr-block--${res.color}`}
                  style={{ gridColumn: `span ${res.span}` }}
                  onMouseEnter={(e) =>
                    setTip({
                      res,
                      roomName: room.name,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseMove={(e) =>
                    setTip((t) => ({
                      ...t,
                      x: e.clientX,
                      y: e.clientY,
                    }))
                  }
                  onMouseLeave={() =>
                    setTip({
                      res: null,
                      roomName: "",
                      x: 0,
                      y: 0,
                    })
                  }
                >
                  <span className="gr-block__class">
                    {res.class}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={slot.id}
                className="gr-cell gr-cell--empty"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function FilterBar() {
  const [showCal, setShowCal] = useState(false);

  const [selDate, setSelDate] = useState(
    new Date(2026, 4, 25)
  );

  const fmt = selDate.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="gr-filters">
      {/* data */}
      <div
        className="gr-filters__date"
        style={{ position: "relative" }}
      >
        <button
          className="gr-filters__nav"
          onClick={() =>
            setSelDate(
              (d) =>
                new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate() - 1
                )
            )
          }
        >
          ‹
        </button>

        <button
          className="gr-filters__date-txt"
          onClick={() => setShowCal((v) => !v)}
        >
          📅 {fmt}
        </button>

        <button
          className="gr-filters__nav"
          onClick={() =>
            setSelDate(
              (d) =>
                new Date(
                  d.getFullYear(),
                  d.getMonth(),
                  d.getDate() + 1
                )
            )
          }
        >
          ›
        </button>

        {showCal && (
          <MiniCalendar
            onSelect={setSelDate}
            onClose={() => setShowCal(false)}
          />
        )}
      </div>

      <div className="gr-filters__sep" />

      {[
        ["1º Semestre 2026", "2º Semestre 2026", "1º Semestre 2025"],
        ["Todos os períodos", "Manhã", "Tarde", "Noite"],
        ["Todos os cursos", "ADS", "DSM", "LOG", "RH"],
        ["Todos os laboratórios", "Lab 111", "Lab 112", "Labs 100", "Labs 200"],
      ].map((opts, i) => (
        <select key={i} className="gr-filters__select">
          {opts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ))}

      <div className="gr-filters__search">
        <span>🔍</span>
        <input placeholder="Pesquisar turma, professor..." />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="gr-legend">
      <span className="gr-legend__title">LEGENDA:</span>

      {[
        { key: "recurring", label: "Recorrente" },
        { key: "simple", label: "Simples" },
      ].map(({ key, label }) => (
        <span key={key} className="gr-legend__item">
          <span
            className={`gr-legend__dot gr-legend__dot--${key}`}
          />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function GradeReservas() {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="gr-page">
      <Navbar activePage="Reservas" />

      <PageHero
        tag="Grade Semanal"
        title="Grade de Reservas"
        description="Visualize e gerencie as reservas de salas e laboratórios."
      />

      <main className="gr-main">
        <div className="gr-breadcrumb">
          <span>Início</span>

          <span className="gr-breadcrumb__sep">›</span>

          <span className="gr-breadcrumb__active">
            Grade de Reservas
          </span>
        </div>

        <FilterBar />
        <Legend />

        <div className="gr-card">
          <div className="gr-card__hd">
            <div>
              <h2 className="gr-card__title">
                Grade de Horários
              </h2>

              <p className="gr-card__sub">
                Segunda-feira, 25 de Maio de 2026 ·
                1º Semestre 2026
              </p>
            </div>

            <div className="gr-card__actions">
              <button className="gr-card__btn">
                📤 Exportar
              </button>

              <button className="gr-card__btn">
                🖨️ Imprimir
              </button>

              <button
                className="gr-card__btn"
                onClick={() => setFullscreen(true)}
                title="Tela cheia"
              >
                ⛶
              </button>
            </div>
          </div>

          <div className="gr-card__body">
            <ScheduleGrid />
          </div>

          {/* footer */}
          <div className="gr-card__footer">
            <button className="gr-filters__btn-outline">
              🔄 Reserva Recorrente
            </button>

            <button className="gr-filters__btn-red">
              + Nova Reserva
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {/* fullscreen */}
      {fullscreen && (
        <div className="gr-fullscreen">
          <div className="gr-fullscreen__bar">
            <span className="gr-fullscreen__bar-title">
              🏛️ Grade de Horários
            </span>

            <button
              className="gr-fullscreen__close"
              onClick={() => setFullscreen(false)}
            >
              ✕ Fechar
            </button>
          </div>

          <div className="gr-fullscreen__body">
            <ScheduleGrid />
          </div>
        </div>
      )}
    </div>
  );
}