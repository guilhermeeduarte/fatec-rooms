import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export default function GerenciarUsuario() {
    const navigate = useNavigate();
    const [token, setToken] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [successMessage, setSuccessMessage] = useState(null);
    const [usuarios, setUsuarios] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showReativarModal, setShowReativarModal] = useState(false);

    // --- Filtros ---
    const [searchQuery, setSearchQuery] = useState("");
    const [filterTipo, setFilterTipo] = useState("todos");
    const [filterStatus, setFilterStatus] = useState("todos");

    // Buscar token apenas no cliente
    useEffect(() => {
        const t = localStorage.getItem("token");
        const a = localStorage.getItem("authlevel");
        setToken(t);

        if (!t || a !== "1") {
            navigate("/");
            return;
        }
    }, [navigate]);

    // Carregar usuários quando token estiver disponível
    useEffect(() => {
        if (!token) return;

        async function loadUsers() {
            try {
                setLoading(true);
                const meResponse = await fetch("/api/users/me", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (meResponse.ok) {
                    const meData = await meResponse.json();
                    setCurrentUserId(meData.id);
                }

                const response = await fetch("/api/admin/users", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (response.status === 401 || response.status === 403) {
                    navigate("/login");
                    return;
                }

                if (!response.ok) {
                    const data = await response.json().catch(() => null);
                    throw new Error(data?.message || "Falha ao carregar usuários.");
                }

                const users = await response.json();
                setUsuarios(
                    users.map((user) => {
                        let tipo = "";
                        let status = user.enabled === 1 ? 1 : 0;

                        if (user.authlevel === 1) {
                            tipo = "Coordenador";
                        } else if (user.authlevel === 2) {
                            tipo = "Professor";
                        } else {
                            tipo = "Pendente";
                            status = 2; // Status 2 para pendente (não é ativo nem desativado)
                        }

                        return {
                            id: user.id,
                            nome: `${user.firstname} ${user.lastname}`,
                            email: user.email,
                            authlevel: user.authlevel,
                            tipo: tipo,
                            status: status,
                        };
                    })
                );
            } catch (err) {
                setError(err.message || "Erro desconhecido ao buscar usuários.");
            } finally {
                setLoading(false);
            }
        }

        loadUsers();
    }, [token, navigate]);

    // --- Lógica de filtro ---
    const usuariosSemSi = usuarios.filter((u) => currentUserId !== u.id);

    const usuariosFiltrados = usuariosSemSi
        .filter((u) => {
            const query = searchQuery.trim().toLowerCase();
            if (query === "") return true;
            return (
                u.nome.toLowerCase().includes(query) ||
                u.email.toLowerCase().includes(query)
            );
        })
        .filter((u) => {
            if (filterTipo === "todos") return true;
            return u.tipo === filterTipo;
        })
        .filter((u) => {
            if (filterStatus === "todos") return true;
            return filterStatus === "ativo" ? u.status === 1 : u.status === 0;
        });

    function clearFilters() {
        setSearchQuery("");
        setFilterTipo("todos");
        setFilterStatus("todos");
    }

    const hasActiveFilters =
        searchQuery.trim() !== "" ||
        filterTipo !== "todos" ||
        filterStatus !== "todos";

    // --- Helpers de status ---
    // --- Helpers de status ---
    function getStatusLabel(status) {
        if (status === 1) return "Ativo";
        if (status === 0) return "Desativado";
        if (status === 2) return "Pendente";
        return "Desconhecido";
    }

    function getStatusClass(status) {
        if (status === 1) return "status-ok";
        if (status === 0) return "status-cancel";
        if (status === 2) return "status-pend";
        return "";
    }

    // --- Handlers de modal ---
    function handleOpenModal(usuario, action = "desativar") {
        setSelectedUser(usuario);
        if (action === "reativar") {
            setShowReativarModal(true);
            setShowModal(false); // Garante que o modal de desativar não abra
        } else {
            setShowModal(true);
            setShowReativarModal(false); // Garante que o modal de reativar não abra
        }
    }
    function openEditModal(usuario) {
        setEditingUser(usuario);
        setSuccessMessage(null);
        setShowEditModal(true);
    }

    async function reativarUsuario(userId) {
        if (!token) throw new Error("Token não encontrado");
        const response = await fetch(`/api/admin/users/${userId}/enable`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const data = await response.text().catch(() => null);
            throw new Error(data || "Não foi possível reativar o usuário.");
        }

        return await response.text();
    }

    async function handleConfirmReativar() {
        if (!selectedUser || !token) return;

        try {
            await reativarUsuario(selectedUser.id);
            setUsuarios((prev) =>
                prev.map((user) =>
                    user.id === selectedUser.id ? { ...user, status: 1 } : user
                )
            );
            setShowConfirmModal(false);
            setShowModal(false);
            setSelectedUser(null);
        } catch (err) {
            alert(err.message || "Erro ao reativar usuário.");
        }
    }

    async function saveUserEdit() {
        if (!editingUser || !token) {
            setError("Token não encontrado. Faça login novamente.");
            return;
        }
        setSavingEdit(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}/authlevel`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ authlevel: editingUser.authlevel }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || "Não foi possível salvar o usuário.");
            }

            const updated = await response.json();
            setUsuarios((prev) =>
                prev.map((user) =>
                    user.id === updated.id
                        ? {
                            ...user,
                            authlevel: updated.authlevel,
                            tipo: updated.authlevel === 1 ? "Coordenador" : "Professor",
                        }
                        : user
                )
            );
            setSuccessMessage("Alteração salva.");

            // Fechar modal após 1.5 segundos
            setTimeout(() => {
                setShowEditModal(false);
                setSuccessMessage(null);
            }, 1500);
        } catch (err) {
            setError(err.message || "Erro ao salvar usuário.");
        } finally {
            setSavingEdit(false);
        }
    }

    async function disableUser(userId) {
        if (!token) throw new Error("Token não encontrado");
        const response = await fetch(`/api/admin/users/${userId}/disable`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            const data = await response.text().catch(() => null);
            throw new Error(data || "Não foi possível desativar o usuário.");
        }

        return await response.text();
    }

    async function handleConfirmDisable() {
        if (!selectedUser || !token) return;

        try {
            await disableUser(selectedUser.id);
            setUsuarios((prev) =>
                prev.map((user) =>
                    user.id === selectedUser.id ? { ...user, status: 0 } : user
                )
            );
            setShowConfirmModal(false);
            setShowModal(false);
            setSelectedUser(null);
        } catch (err) {
            alert(err.message || "Erro ao desativar usuário.");
        }
    }

    if (loading) {
        return (
            <>
                <Navbar activePage="gerenciar-usuarios" />
                <PageHero
                    tag="Gerenciamento"
                    title="Gerenciamento de Usuários"
                    description="Veja todos os usuários cadastrados e acesse as ações de editar ou desativar."
                />
                <div className="content">
                    <p>Carregando usuários...</p>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar activePage="gerenciar-usuarios" />

            <PageHero
                tag="Gerenciamento"
                title="Gerenciamento de Usuários"
                description="Veja todos os usuários cadastrados e acesse as ações de editar ou desativar."
            />

            <div className="content">

                {/* Barra de busca e filtros — usa classes já existentes no app.css */}
                <div className="filtros">
                    <input
                        type="text"
                        placeholder="Buscar por nome ou e-mail..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    <select
                        value={filterTipo}
                        onChange={(e) => setFilterTipo(e.target.value)}
                    >
                        <option value="todos">Todos os tipos</option>
                        <option value="Coordenador">Coordenador</option>
                        <option value="Professor">Professor</option>
                        <option value="Pendente">Pendente</option>
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="todos">Todos os status</option>
                        <option value="ativo">Ativo</option>
                        <option value="desativado">Desativado</option>
                    </select>

                    {hasActiveFilters && (
                        <button
                            className="btn-action btn-secondary"
                            onClick={clearFilters}
                        >
                            Limpar filtros
                        </button>
                    )}
                </div>

                {error ? (
                    <div className="error-message">Erro: {error}</div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="empty-state">
                        {hasActiveFilters
                            ? "Nenhum usuário corresponde aos filtros aplicados."
                            : "Nenhum usuário encontrado."}
                    </div>
                ) : (
                    <>
                        <div className="reservas-list">
                            {usuariosFiltrados.map((usuario) => (
                                <div key={usuario.id} className="reserva-item" style={{flexDirection:"column"}}>
  <div className="usuario-info">
    <div className="reserva-sala-user">{usuario.nome}</div>
    <div className="usuario-detalhes">
      <div style={{display:"flex", gap:"8px", flexWrap:"wrap", marginTop:"6px"}}>
  <div className="usuario-box">
    <span className="usuario-label">E-mail</span>
    <span className="usuario-value">{usuario.email}</span>
  </div>
  <div className="usuario-box">
    <span className="usuario-label">Tipo</span>
    <span className="usuario-value">{usuario.tipo}</span>
  </div>
</div>
    </div>
  </div>
                                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", width:"100%", marginTop:"8px"}}>
                                        <div className={`reserva-status ${getStatusClass(usuario.status)}`}>
                                            {getStatusLabel(usuario.status)}
                                        </div>
                                        <div style={{display:"flex", gap:"8px"}}>
                                            {/* Usuário Pendente - botões desabilitados e com opacidade */}
                                            {usuario.tipo === "Pendente" ? (
                                                <>
                                                    <button className="btn-action btn-secondary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                                                        Editar
                                                    </button>
                                                    <button className="btn-action btn-danger" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                                                        Desativar
                                                    </button>
                                                </>
                                            ) : usuario.status === 1 ? (
                                                // Usuário Ativo
                                                <>
                                                    <button className="btn-action btn-secondary" onClick={() => openEditModal(usuario)}>
                                                        Editar
                                                    </button>
                                                    <button className="btn-action btn-danger" onClick={() => handleOpenModal(usuario)}>
                                                        Desativar
                                                    </button>
                                                </>
                                            ) : (
                                                // Usuário Desativado
                                                <>
                                                    <button className="btn-action btn-secondary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                                                        Editar
                                                    </button>
                                                    <button
                                                        className="btn-action btn-success"
                                                        onClick={() => handleOpenModal(usuario, "reativar")}
                                                        style={{ background: "#16a34a", color: "white" }}
                                                    >
                                                        Reativar
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
</div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Modal: desativar - primeiro aviso */}
            {showModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="confirm-modal">
                        <div className="confirm-icon" style={{ background: "#fef3c7"}}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></div>
                        <h2>Desativar usuário</h2>
                        <p>
                            Você está prestes a desativar o usuário <br/> <strong>{selectedUser.nome}</strong>.
                            <br />
                            <span style={{ fontSize: "0.8rem", color: "#d97706", display: "block", marginTop: "8px" }}>
                    Esta ação pode ser revertida posteriormente.
                </span>
                        </p>
                        <div className="confirm-buttons">
                            <button
                                className="btn-action btn-secondary"
                                onClick={() => setShowModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-action btn-danger"
                                onClick={() => {
                                    setShowModal(false);
                                    setShowConfirmModal(true);
                                }}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: editar */}
            {showEditModal && editingUser && (
                <div className="modal-overlay">
                    <div className="modal-box">
                        <h2>Editar usuário</h2>
                        <form
                            className="modal-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                saveUserEdit();
                            }}
                        >
                            <div className="field-group">
                                <label>Nome</label>
                                <div className="field-value">{editingUser.nome}</div>
                            </div>

                            <div className="field-group">
                                <label>E-mail</label>
                                <div className="field-value">{editingUser.email}</div>
                            </div>

                            <div className="field-group">
                                <label>Nível de acesso</label>
                                <select
                                    value={editingUser.authlevel}
                                    onChange={(event) =>
                                        setEditingUser((prev) => ({
                                            ...prev,
                                            authlevel: Number(event.target.value),
                                        }))
                                    }
                                >
                                    <option value={1}>Coordenador</option>
                                    <option value={2}>Professor</option>
                                </select>
                            </div>

                            {successMessage && (
                                <div className="success-message">{successMessage}</div>
                            )}

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-action btn-cancel"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn-action btn-save"
                                    disabled={savingEdit}
                                >
                                    {savingEdit ? "Salvando..." : "Salvar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: confirmação de desativação */}
            {showConfirmModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="confirm-modal">
                        <div className="confirm-icon">!</div>
                        <h2>Confirmar desativação</h2>
                        <p>
                            Tem certeza que deseja desativar o usuário <br/> <strong>{selectedUser.nome}</strong>?
                            <br />
                            <span style={{ fontSize: "0.8rem", color: "#dc2626", display: "block", marginTop: "8px" }}>
                    O usuário perderá acesso ao sistema até que seja reabilitado pela equipe.
                </span>
                        </p>
                        <div className="confirm-buttons">
                            <button
                                className="btn-action btn-secondary"
                                onClick={() => setShowConfirmModal(false)}
                            >
                                Voltar
                            </button>
                            <button
                                className="btn-action btn-danger"
                                onClick={handleConfirmDisable}
                            >
                                Sim, desativar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: confirmação de reativação */}
            {showReativarModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="confirm-modal">
                        <div className="confirm-icon" style={{background: "#dcfce7"}}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"
                                 fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round"
                                 stroke-linejoin="round"
                                 className="lucide lucide-circle-check-icon lucide-circle-check">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="m9 12 2 2 4-4"/>
                            </svg>
                        </div>
                        <h2>Confirmar reativação</h2>
                        <p>
                            Tem certeza que deseja reativar o usuário <br/> <strong>{selectedUser.nome}</strong>?
                            <br/>
                            <span style={{fontSize: "0.8rem", color: "#16a34a", display: "block", marginTop: "8px" }}>
                    O usuário voltará a ter acesso normal ao sistema.
                </span>
                        </p>
                        <div className="confirm-buttons">
                            <button
                                className="btn-action btn-secondary"
                                onClick={() => {
                                    setShowReativarModal(false);
                                    setSelectedUser(null);
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn-action btn-success"
                                onClick={handleConfirmReativar}
                            >
                                Sim, reativar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <Footer />
        </>
    );
}