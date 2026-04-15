import { useState } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

export default function EditarReserva() {
  const [reservas, setReservas] = useState([
    {
      id: 1,
      data: "09/04/2026",
      espaco: "Sala 101",
      horaInicio: "10:00",
      horaFim: "12:00",
      motivo: "Aula de Banco de Dados",
      status: "Pendente",
    },
    {
      id: 2,
      data: "10/04/2026",
      espaco: "Laboratório 201",
      horaInicio: "08:00",
      horaFim: "10:00",
      motivo: "Prova prática",
      status: "Aceita",
    },
    {
      id: 3,
      data: "20/04/2026",
      espaco: "Laboratório 231",
      horaInicio: "08:00",
      horaFim: "10:00",
      motivo: "Prova prática",
      status: "Aceita",
    },
    {
      id: 4,
      data: "20/04/2026",
      espaco: "Laboratório 231",
      horaInicio: "08:00",
      horaFim: "10:00",
      motivo: "Aula de Programação",
      status: "Cancelada",
    },
  ]);

  const [editandoId, setEditandoId] = useState(null);
  const [novoMotivo, setNovoMotivo] = useState("");

  // 🔍 FILTROS
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [dataFiltro, setDataFiltro] = useState("");

  function iniciarEdicao(reserva) {
    setEditandoId(reserva.id);
    setNovoMotivo(reserva.motivo);
  }

  function salvarEdicao(id) {
    setReservas((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, motivo: novoMotivo } : r
      )
    );
    setEditandoId(null);
  }

  function cancelarReserva(id) {
    const confirmar = window.confirm("Deseja realmente cancelar essa reserva?");
    if (!confirmar) return;

    setReservas((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "Cancelada" } : r
      )
    );
  }

  // 🔄 converter BR → ISO
  function formatarDataBRparaISO(dataBR) {
    const [dia, mes, ano] = dataBR.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  // 🔎 FILTRO COMPLETO
  const reservasFiltradas = reservas.filter((reserva) => {
    const matchBusca = reserva.espaco
      .toLowerCase()
      .includes(busca.toLowerCase());

    const matchStatus = statusFiltro
      ? reserva.status === statusFiltro
      : true;

    const matchData = dataFiltro
      ? formatarDataBRparaISO(reserva.data) === dataFiltro
      : true;

    return matchBusca && matchStatus && matchData;
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

          {/* 🔍 FILTROS */}
          <div className="filtros">
            <input
              type="text"
              placeholder="Buscar por sala..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="Pendente">Pendente</option>
              <option value="Aceita">Aceita</option>
              <option value="Cancelada">Cancelada</option>
            </select>

            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
            />
          </div>

          {/* 🧾 CARDS */}
          <div className="container-reservas">
            {reservasFiltradas.map((reserva) => (
              <div
                key={reserva.id}
                className="card-reserva"
                data-status={reserva.status}
              >
                <div className="info-reserva">

                  <div className="item-reserva">
                    <span className="label">Data</span>
                    <span className="valor">{reserva.data}</span>
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
                    <span className="label">Motivo</span>

                    {editandoId === reserva.id ? (
                      <>
                        <input
                          value={novoMotivo}
                          onChange={(e) => setNovoMotivo(e.target.value)}
                        />
                        <button
                          className="btn-salvar"
                          onClick={() => salvarEdicao(reserva.id)}
                        >
                          Salvar
                        </button>
                      </>
                    ) : (
                      <span className="valor">{reserva.motivo}</span>
                    )}
                  </div>

                  <div className="item-reserva">
                    <span className="label">Status</span>
                    <span className="valor">{reserva.status}</span>
                  </div>

                </div>

                {reserva.status !== "Cancelada" && (
                  <div className="acoes">
                    <button onClick={() => iniciarEdicao(reserva)}>
                      Editar
                    </button>

                    <button onClick={() => cancelarReserva(reserva.id)}>
                      Cancelar
                    </button>
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