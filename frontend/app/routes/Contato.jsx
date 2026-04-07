import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";

export async function loader() {
  return null;
}

const contactInfo = [
  {
    label: "E-mail",
    value: "fatecrooms@fatec.sp.gov.br",
    href: "mailto:fatecrooms@fatec.sp.gov.br",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M2 7l10 7 10-7" />
      </svg>
    ),
  },
  {
    label: "Telefone",
    value: "(11) 3339-9500",
    href: "tel:+551133399500",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.8 19.8 0 0 1 2.08 5.18 2 2 0 0 1 4.08 3h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.72 2.82a2 2 0 0 1-.45 2.1L8.09 10.9a16 16 0 0 0 5 5l1.27-1.27a2 2 0 0 1 2.1-.45c.92.36 1.86.6 2.82.72A2 2 0 0 1 21 16.92z" />
      </svg>
    ),
  },
  {
    label: "Endereço",
    value: "Av. Tiradentes, 615 – SP",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

const arrowIcon = (
  <svg viewBox="0 0 24 24">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export default function Contato() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    assunto: "",
    mensagem: "",
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <Navbar activePage="Contato" />

      <PageHero
        tag="Fale conosco"
        title="Contato"
        description="Tem dúvidas ou sugestões? Estamos aqui para ajudar."
      />

      <div className="content">

        {/* Cards de contato direto */}
        <div className="contact-cards">
          {contactInfo.map((item) => (
            <a key={item.label} className="contact-card" href={item.href}>
              <div className="card-icon">{item.icon}</div>
              <div className="card-info">
                <div className="card-label">{item.label}</div>
                <div className="card-value">{item.value}</div>
              </div>
              <div className="card-arrow">{arrowIcon}</div>
            </a>
          ))}
        </div>

        {/* Divisor */}
        <div className="divider">
          <div className="divider-line" />
          <span className="divider-text">ou envie uma mensagem</span>
          <div className="divider-line" />
        </div>

        {/* Formulário ou mensagem de sucesso */}
        {submitted ? (
          <div className="success-msg">
            <div className="success-icon">
              <svg viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3>Mensagem enviada!</h3>
            <p>Em breve nossa equipe entrará em contato com você.</p>
          </div>
        ) : (
          <>
            <p className="form-title">Envie sua mensagem</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome completo</label>
                <input
                  type="text"
                  name="nome"
                  placeholder="Ex: João Silva"
                  value={form.nome}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>E-mail institucional</label>
                <input
                  type="email"
                  name="email"
                  placeholder="joao@fatec.sp.gov.br"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Assunto</label>
                <select name="assunto" value={form.assunto} onChange={handleChange}>
                  <option value="">Selecione o assunto</option>
                  <option>Dúvida sobre reservas</option>
                  <option>Problema técnico</option>
                  <option>Sugestão de melhoria</option>
                  <option>Outros</option>
                </select>
              </div>
              <div className="form-group">
                <label>Mensagem</label>
                <textarea
                  name="mensagem"
                  placeholder="Descreva sua dúvida ou sugestão..."
                  value={form.mensagem}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="btn-submit">
                Enviar mensagem
              </button>
            </form>
          </>
        )}
      </div>

      <Footer />
    </>
  );
}
