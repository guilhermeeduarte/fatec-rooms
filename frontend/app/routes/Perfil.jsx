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
    password: "",
  });
  const [editando, setEditando] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    async function fetchUser() {
      try {
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Erro ao carregar dados do usuário");
        }

        const data = await response.json();
        setUser({
          firstname: data.firstname || "",
          lastname: data.lastname || "",
          email: data.email || "",
          authlevel: data.authlevel,
          password: "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [navigate, token]);

  function handleChange(e) {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
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
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          password: user.password || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao atualizar perfil");
      }

      const data = await response.json();
      setUser({
        firstname: data.firstname,
        lastname: data.lastname,
        email: data.email,
        authlevel: data.authlevel,
        password: "",
      });
      setEditando(false);
      setSuccess("Perfil atualizado com sucesso!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const getCargoLabel = (authlevel) => {
    if (authlevel === 1) return "Coordenador";
    if (authlevel === 2) return "Professor";
    return "Usuário";
  };

  if (loading) {
    return (
      <>
        <Navbar activePage="Perfil" />
        <div className="loading-container">
          <p>Carregando...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar activePage="Perfil" />

      <PageHero
        title="Seu Perfil"
        tag="Painel do Usuário"
        description="Edite e gerencie suas informações."
      />

      <div className="user-profile">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {!editando ? (
          <div className="user-card">
            <div className="user-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </div>

            <h3>Suas Informações</h3>
            <div className="user-info">
              <p><strong>Nome:</strong> {user.firstname} {user.lastname}</p>
              <p><strong>E-mail:</strong> {user.email}</p>
              <p><strong>Área de Atuação:</strong> {getCargoLabel(user.authlevel)}</p>
            </div>

            <button className="btn-edit" onClick={() => setEditando(true)}>
              Editar Informações
            </button>
          </div>
        ) : (
          <form className="user-form" onSubmit={handleSubmit}>
            <h3>Editar Informações</h3>

            <div className="form-group">
              <label>Nome</label>
              <input
                type="text"
                name="firstname"
                value={user.firstname}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Sobrenome</label>
              <input
                type="text"
                name="lastname"
                value={user.lastname}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                name="email"
                value={user.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Nova Senha (deixe em branco para manter a atual)</label>
              <input
                type="password"
                name="password"
                value={user.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => {
                  setEditando(false);
                  setError(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        )}
      </div>

      <Footer />
    </>
  );
}
