// components/PageState.jsx
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import PageHero from "./PageHero";
import Footer from "./Footer";

export function LoadingState({
                                 title = "Carregando",
                                 description = "Aguarde um momento...",
                                 activePage = "",
                                 heroVariant = null,
                                 heroTag = "Carregando",
                                 heroTitle = "Carregando",
                                 heroDescription = "Aguarde um momento..."
                             }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar activePage={activePage} />
            <PageHero
                variant={heroVariant}
                tag={heroTag}
                title={heroTitle}
                description={heroDescription}
            />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                <div className="confirm-modal" style={{
                    maxWidth: "350px",
                    margin: "0 auto",
                    textAlign: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,.1)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "20px",
                    padding: "2rem"
                }}>
                    <div className="confirm-icon" style={{
                        width: "48px",
                        height: "48px",
                        background: "none",
                        border: "3px solid #e5e7eb",
                        borderTopColor: "#dc2626",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        margin: "0 auto 1rem auto"
                    }} />
                    <p style={{
                        color: "#6b7280",
                        fontSize: "0.9rem",
                        fontFamily: "var(--font-main)",
                        margin: 0
                    }}>{description}</p>
                </div>
            </div>
            <Footer />
        </div>
    );
}

export function ErrorState({
                               error,
                               title = "Erro ao carregar dados",
                               onRetry,
                               onBack,
                               activePage = "",
                               heroVariant = null,
                               heroTag = "Erro",
                               heroTitle = "Ops! Algo deu errado",
                               heroDescription = "Não foi possível carregar os dados"
                           }) {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate("/");
        }
    };

    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            window.location.reload();
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <Navbar activePage={activePage} />
            <PageHero
                variant={heroVariant}
                tag={heroTag}
                title={heroTitle}
                description={heroDescription}
            />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
                <div className="confirm-modal" style={{
                    maxWidth: "450px",
                    margin: "0 auto",
                    textAlign: "center",
                    boxShadow: "0 1px 4px rgba(0,0,0,.1)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "20px",
                    padding: "2rem"
                }}>
                    <div className="confirm-icon" style={{ background: "#fee2e2", margin: "0 auto 1rem auto" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                    </div>
                    <h2 style={{ color: "#991b1b", marginBottom: "0.5rem" }}>{title}</h2>
                    <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>{error}</p>
                    <div className="confirm-buttons" style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                        <button
                            className="sonic"
                            onClick={handleBack}
                        >
                            Voltar ao início
                        </button>
                        <button
                            className="btn-action btn-danger"
                            onClick={handleRetry}
                        >
                            Tentar novamente
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}