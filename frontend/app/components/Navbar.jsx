import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const menuLinksPublic = [
  { label: "Entrar", href: "/" },
  { label: "Contato", href: "/contato" },
];

const menuLinksTeacher = [
  { label: "Reservar Sala", href: "/solicitar-reserva" },
  { label: "Minhas Reservas", href: "/minhas-reservas" },
];

const menuLinksCoordinator = [
  { label: "Grade de Reservas", href: "/visualizacao-reservas" },
  { label: "Solicitações", href: "/coordenador-solicitacoes" },
  { label: "Todas as Reservas", href: "/todas-reservas" },
  { label: "Reserva Recorrente", href: "/reserva-recorrente" },
  { label: "Configurações", href: "/configuracao" },
];

export default function Navbar({ activePage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const [token, setToken] = useState(null);
  const [authlevel, setAuthlevel] = useState(null);
  useEffect(() => {
    setToken(localStorage.getItem("token"));
    setAuthlevel(localStorage.getItem("authlevel"));
}, []);
  const userAreaPath = authlevel === "1" ? "/coordenador" : "/professor";
  const userAreaLabel = authlevel === "1" ? "Área do Coordenador" : "Área do Professor";

  const menuLinks = !token
    ? menuLinksPublic
    : authlevel === "1"
    ? menuLinksCoordinator
    : menuLinksTeacher;

  function handleLogout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("authlevel");
      localStorage.removeItem("username");
    }
    setUserMenuOpen(false);
    setMenuOpen(false);
    navigate("/");
  }

  return (
    <nav className="navbar">
      <button
        className={`navbar__hamburger ${menuOpen ? "open" : ""}`}
        onClick={() => {
          setMenuOpen((prev) => !prev);
          setUserMenuOpen(false);
        }}
        aria-label="Menu"
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <Link className="navbar__logo" to={token ? userAreaPath : "/"}>
        F<span>R</span>
      </Link>

      <div className="navbar__actions">

        {token ? (
          <div className="navbar__user">
            <button
              className="navbar__icon"
              type="button"
              aria-label="Perfil"
              onClick={() => {
                setUserMenuOpen((prev) => !prev);
                setMenuOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" strokeWidth="1.8">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </button>

            <div className={`navbar__user-menu ${userMenuOpen ? "open" : ""}`}>

              <Link to="/perfil" onClick={() => setUserMenuOpen(false)}>
                Meu Perfil
              </Link>
              <Link to={userAreaPath} onClick={() => setUserMenuOpen(false)}>
                {userAreaLabel}
              </Link>
              <button type="button" className="navbar__user-logout" onClick={handleLogout}>
                Deslogar
              </button>
            </div>
          </div>
        ) : (
          <Link className="navbar__icon navbar__icon-link" to="/" aria-label="Login">
            <svg viewBox="0 0 24 24" strokeWidth="1.8">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </Link>
        )}
      </div>

      <div className={`navbar__menu ${menuOpen ? "open" : ""}`}>
        {menuLinks.map((link) => (
          <Link
            key={link.label}
            to={link.href}
            className={activePage === link.label ? "active" : ""}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}