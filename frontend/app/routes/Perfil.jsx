import { useState } from "react";
import Navbar from "../components/Navbar";
import PageHero from "../components/PageHero";
import Footer from "../components/Footer";

export default function UserProfile() {
  const [user, setUser] = useState({
    nome: "Guilherme Arroz",
    email: "guilherme.arroz@prof.cps.sp.gov.br",
    cargo: "Corpo Docente",
    senha: "************",
  });

  const [editando, setEditando] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setEditando(false);
    console.log("Dados atualizados:", user);
  }

  return (
    <>
      <Navbar activePage="Painel do Usuário" />

      <PageHero
        title="Seu Perfil"
        tag="Painel do Usuário"
        description="Edite e gerencie suas informações."
      />

      <div className="user-profile">
        {!editando ? (
          <div className="user-card">
            <div className="user-avatar">
              {/* Ícone simples de usuário */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
              </svg>
            </div>

            <h3>Suas Informações</h3>
            <div className="user-info">
              <p><strong>Nome:</strong> {user.nome}</p>
              <p><strong>E-mail:</strong> {user.email}</p>
              <p><strong>Área de Atuação:</strong> {user.cargo}</p>
              <p><strong>Senha:</strong> {user.senha}</p>
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
                name="nome"
                value={user.nome}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input
                type="email"
                name="email"
                value={user.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Área de Atuação</label>
              <input
                type="text"
                name="cargo"
                value={user.cargo}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                name="senha"
                value={user.senha}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-submit">
              Salvar Alterações
            </button>
          </form>
        )}
      </div>

      <Footer />
    </>
  );
}
