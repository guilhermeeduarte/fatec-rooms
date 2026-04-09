import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export async function loader() {
    return null;
}

// Função para buscar todos os usuários (pendentes + aprovados) da API
async function fetchRegistrations() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/admin/users', {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        let errorMessage = 'Erro ao buscar cadastros pendentes';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            errorMessage = response.statusText || `Erro ${response.status}`;
        }
        throw new Error(errorMessage);
    }
    const data = await response.json();
    return data.map(user => ({
        id: user.id,
        nome: `${user.firstname} ${user.lastname}`,
        apelido: user.username,
        area: "Não especificado", // Ajuste se houver campo de departamento
        email: user.email,
        cargo: user.authlevel === 0 ? "pendente" : (user.authlevel === 1 ? "coordenador" : "professor"),
        authLevel: user.authlevel,
        status: user.enabled === 0 ? "pendente" : "aprovado"
    }));
}

// Função para aprovar cadastro
async function approveRegistration(id, authLevel) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/users/${id}/approve`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ authlevel: authLevel })
    });
    if (!response.ok) {
        let errorMessage = 'Erro ao aprovar cadastro';
        try {
            const errorData = await response.text();
            errorMessage = errorData || errorMessage;
        } catch (e) {
            errorMessage = response.statusText || `Erro ${response.status}`;
        }
        throw new Error(errorMessage);
    }
    return await response.text();
}

// Função para rejeitar cadastro
async function rejectRegistration(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/admin/users/${id}/reject`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        let errorMessage = 'Erro ao rejeitar cadastro';
        try {
            const errorData = await response.text();
            errorMessage = errorData || errorMessage;
        } catch (e) {
            errorMessage = response.statusText || `Erro ${response.status}`;
        }
        throw new Error(errorMessage);
    }
    return await response.text();
}

const authLevelOptions = [
    { value: 1, label: "Coordenador", desc: "Gerenciar salas e aprovar cadastros" },
    { value: 2, label: "Professor", desc: "Reservar e visualizar salas" },
];

export default function AprovarCadastros() {
    const [cadastros, setCadastros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtro, setFiltro] = useState("pendente");
    const [confirmacao, setConfirmacao] = useState(null);
    // confirmacao: { id, acao: "aprovado"|"recusado", authLevel }

    useEffect(() => {
        async function loadCadastros() {
            try {
                const data = await fetchRegistrations();
                setCadastros(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        loadCadastros();
    }, []);

    function abrirAprovar(cadastro) {
        setConfirmacao({
            id: cadastro.id,
            acao: "aprovado",
            authLevel: 2, // Padrão para professor
        });
    }

    function abrirRejeitar(cadastro) {
        setConfirmacao({
            id: cadastro.id,
            acao: "recusado",
            authLevel: cadastro.authLevel,
        });
    }

    async function confirmarAcao() {
        const { id, acao, authLevel } = confirmacao;
        try {
            if (acao === "aprovado") {
                await approveRegistration(id, authLevel);
                setCadastros((prev) =>
                    prev.map((c) =>
                        c.id === id
                            ? {
                                  ...c,
                                  status: "aprovado",
                                  authLevel,
                                  cargo: authLevel === 1 ? "coordenador" : "professor",
                              }
                            : c
                    )
                );
            } else {
                await rejectRegistration(id);
                setCadastros((prev) => prev.filter((c) => c.id !== id));
            }
            setConfirmacao(null);
        } catch (err) {
            alert(`Erro: ${err.message}`);
        }
    }

    const filtrados = cadastros.filter((c) => c.status === filtro);
    const totalPendente = cadastros.filter((c) => c.status === "pendente").length;
    const cadastroEmConfirmacao = confirmacao
        ? cadastros.find((c) => c.id === confirmacao.id)
        : null;

    if (loading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error}</div>;

    return (
        <>
            <Navbar activePage="Área do Coordenador" />

            <PageHero
                variant="coordenador"
                title="Solicitações de Cadastro"
                description="Aceite ou recuse cadastros"
            />

            {/* Filtros */}
            <div className="aprovacao-filtros">
                {["pendente", "aprovado", "recusado"].map((f) => (
                    <button
                        key={f}
                        className={`filtro-btn ${filtro === f ? "active" : ""}`}
                        onClick={() => setFiltro(f)}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                        {f === "pendente" && totalPendente > 0 && (
                            <span className="filtro-badge">{totalPendente}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Lista */}
            <div className="aprovacao-lista">
                {filtrados.length === 0 ? (
                    <div className="aprovacao-vazia">
                        <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 15s1.5-2 4-2 4 2 4 2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                        </svg>
                        <p>
                            Nenhuma solicitação{" "}
                            {filtro === "pendente" ? "pendente"
                                : filtro === "aprovado" ? "aprovada"
                                : "recusada"}.
                        </p>
                    </div>
                ) : (
                    filtrados.map((c, i) => (
                        <div
                            key={c.id}
                            className="aprovacao-card"
                            style={{ animationDelay: `${i * 0.07}s` }}
                        >
                            {/* Cabeçalho */}
                            <div className="aprovacao-card-header">
                                <div className={`aprovacao-dot ${
                                    c.status === "aprovado" ? "dot-green"
                                    : c.status === "recusado" ? "dot-red"
                                    : "dot-yellow"
                                }`} />
                                <div className="aprovacao-nome-wrap">
                                    <span className="aprovacao-apelido">{c.apelido}</span>
                                    <span className={`aprovacao-badge ${c.authLevel === 1 ? "badge-blue" : "badge-red"}`}>
                                        {c.status === "pendente" ? "PENDENTE" : c.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {/* Detalhes */}
                            <div className="aprovacao-detalhes">
                                <div className="aprovacao-detalhe-row">
                                    <span className="detalhe-label">Nome:</span>
                                    <span className="detalhe-valor">{c.nome}</span>
                                </div>
                                <div className="aprovacao-detalhe-row">
                                    <span className="detalhe-label">Área:</span>
                                    <span className="detalhe-valor">{c.area}</span>
                                </div>
                                <div className="aprovacao-detalhe-row">
                                    <span className="detalhe-label">E-mail:</span>
                                    <span className="detalhe-valor detalhe-email">{c.email}</span>
                                </div>
                                <div className="aprovacao-detalhe-row">
                                    <span className="detalhe-label">Cargo:</span>
                                    <span className="detalhe-valor">
                                        {c.authLevel === 1 ? "Coordenador" : "Professor"}
                                        <span className="detalhe-authlevel"> (authLevel {c.authLevel})</span>
                                    </span>
                                </div>
                            </div>

                            {/* Botões — só aparecem se pendente */}
                            {c.status === "pendente" && (
                                <div className="aprovacao-acoes">
                                    <button className="btn-aprovar" onClick={() => abrirAprovar(c)}>
                                        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                                        Aprovar
                                    </button>
                                    <button className="btn-rejeitar" onClick={() => abrirRejeitar(c)}>
                                        <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        Rejeitar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="spacer" />
            <Footer />

            {/* Modal de confirmação */}
            {confirmacao && cadastroEmConfirmacao && (
                <div
                    className="modal-overlay"
                    onClick={(e) => e.target === e.currentTarget && setConfirmacao(null)}
                >
                    <div className="modal">
                        <div className="modal-handle" />

                        <h3>
                            {confirmacao.acao === "aprovado"
                                ? "Aprovar cadastro?"
                                : "Rejeitar cadastro?"}
                        </h3>

                        <p className="modal-desc">
                            <strong>{cadastroEmConfirmacao.nome}</strong>
                            {confirmacao.acao === "aprovado"
                                ? " terá acesso ao sistema com o nível definido abaixo."
                                : " não terá acesso ao sistema."}
                        </p>

                        {/* Seletor de authLevel — só aparece ao aprovar */}
                        {confirmacao.acao === "aprovado" && (
                            <div className="modal-authlevel">
                                <span className="modal-authlevel-label">
                                    Definir nível de acesso:
                                </span>
                                <div className="modal-authlevel-options">
                                    {authLevelOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            className={`authlevel-option ${confirmacao.authLevel === opt.value ? "selected" : ""}`}
                                            onClick={() =>
                                                setConfirmacao((prev) => ({
                                                    ...prev,
                                                    authLevel: opt.value,
                                                }))
                                            }
                                        >
                                            <span className="authlevel-num">{opt.value}</span>
                                            <div className="authlevel-info">
                                                <span className="authlevel-title">{opt.label}</span>
                                                <span className="authlevel-desc">{opt.desc}</span>
                                            </div>
                                            {confirmacao.authLevel === opt.value && (
                                                <svg className="authlevel-check" viewBox="0 0 24 24">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="modal-acoes">
                            <button
                                className="modal-btn-cancelar"
                                onClick={() => setConfirmacao(null)}
                            >
                                Cancelar
                            </button>
                            <button
                                className={confirmacao.acao === "aprovado"
                                    ? "modal-btn-confirmar-green"
                                    : "modal-btn-confirmar-red"}
                                onClick={confirmarAcao}
                            >
                                {confirmacao.acao === "aprovado" ? "Sim, aprovar" : "Sim, rejeitar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}