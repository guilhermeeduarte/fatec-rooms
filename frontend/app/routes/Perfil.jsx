import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

const API_URL = "/api";

export default function UserProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [user, setUser] = useState({
    firstname: "",
    lastname: "",
    email: "",
    authlevel: null,
  });

  const [editando, setEditando] = useState(false);

  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchUser();
  }, [navigate, token]);

  async function fetchUser() {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Erro ao carregar dados do usuário");
      const data = await response.json();
      setUser({
        firstname: data.firstname || "",
        lastname: data.lastname || "",
        email: data.email || "",
        authlevel: data.authlevel,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick() {
    setFormData({
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
    });
    setError(null);
    setSuccess(null);
    setEditando(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${API_URL}/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: formData.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao atualizar perfil");
      }

      const data = await response.json();
      setSuccess("Perfil atualizado com sucesso!");
      setUser({
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        authlevel: data.authlevel,
      });
      setEditando(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSolicitarTrocaSenha() {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_URL}/users/password/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (!response.ok) throw new Error("Erro ao solicitar troca de senha");
      setSuccess(
        `E-mail de redefinição enviado para ${user.email}. Verifique sua caixa de entrada.`
      );
    } catch (err) {
      setError(err.message);
    }
  }

  const getCargoLabel = (authlevel) => {
    if (authlevel === 1) return "Coordenador";
    if (authlevel === 2) return "Professor";
    return "Usuário";
  };

  const getCargoColor = (authlevel) => {
    if (authlevel === 1) return { background: "#ede9fe", color: "#7c3aed" };
    if (authlevel === 2) return { background: "#dbeafe", color: "#1d4ed8" };
    return { background: "#f3f4f6", color: "#6b7280" };
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar activePage="Perfil" />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontFamily: "var(--font-main)", color: "var(--gray-500)" }}>Carregando...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar activePage="Perfil" />

      <PageHero
        title="Seu Perfil"
        tag="Painel do Usuário"
        description="Edite e gerencie suas informações."
      />

      <div className="perfil-page">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {!editando ? (
          <div className="perfil-grid">

            {/* Card principal — avatar + nome + cargo */}
            <div className="perfil-card perfil-card--hero">
              <div className="perfil-avatar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
              </div>
              <h2 className="perfil-nome">{user.firstname} {user.lastname}</h2>
              <span className="perfil-cargo-badge" style={getCargoColor(user.authlevel)}>
                {getCargoLabel(user.authlevel)}
              </span>
              <p className="perfil-email-hint">{user.email}</p>
            </div>

            {/* Card de informações detalhadas */}
            <div className="perfil-card perfil-card--info">
              <h3 className="perfil-section-title">Informações da conta</h3>

              <div className="perfil-info-grid">
                <div className="perfil-info-item">
                  <span className="perfil-info-label">Nome</span>
                  <span className="perfil-info-value">{user.firstname}</span>
                </div>
                <div className="perfil-info-item">
                  <span className="perfil-info-label">Sobrenome</span>
                  <span className="perfil-info-value">{user.lastname}</span>
                </div>
                <div className="perfil-info-item perfil-info-item--wide">
                  <span className="perfil-info-label">E-mail</span>
                  <span className="perfil-info-value">{user.email}</span>
                </div>
                <div className="perfil-info-item">
                  <span className="perfil-info-label">Cargo</span>
                  <span className="perfil-info-value">{getCargoLabel(user.authlevel)}</span>
                </div>
              </div>

              <div className="perfil-actions">
                <button className="btn-action" onClick={handleEditClick}>
                  Editar informações
                </button>
                <button
                  className="btn-action btn-secondary"
                  onClick={handleSolicitarTrocaSenha}
                >
                  Alterar senha por e-mail
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="perfil-grid perfil-grid--form">
            <div className="perfil-card perfil-card--form">
              <h3 className="perfil-section-title">Editar Informações</h3>

              <form onSubmit={handleSubmit}>
                <div className="perfil-form-row">
                  <div className="form-group">
                    <label>Nome</label>
                    <input
                      type="text"
                      name="firstname"
                      value={formData.firstname}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sobrenome</label>
                    <input
                      type="text"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>E-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="perfil-actions">
                  <button
                    type="button"
                    className="btn-action btn-secondary"
                    onClick={() => {
                      setEditando(false);
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-action"
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}