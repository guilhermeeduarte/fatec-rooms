import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const menuLinks = [
  { label: "Reservar Sala", href: "/" },
  { label: "Contato", href: "/contato" },
];

export default function Navbar({ activePage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authlevel = typeof window !== "undefined" ? localStorage.getItem("authlevel") : null;
  const userAreaPath = authlevel === "1" ? "/coordenador" : "/professor";
  const userAreaLabel = authlevel === "1" ? "Área do Coordenador" : "Área do Professor";

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

      <Link className="navbar__logo" to="/">
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