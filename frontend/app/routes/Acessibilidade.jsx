import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";




export default function Acessibilidade() {
    const navigate = useNavigate();

    //acess
    const [fontSize, setFontSize] = useState(
        Number(localStorage.getItem("fontSize")) || 14
    );

    const [daltonicMode, setDaltonicMode] = useState(
        localStorage.getItem("daltonicMode") === "true"
    );

    useEffect(() => {
        document.documentElement.style.setProperty(
            "--user-font-size",
            `${fontSize}px`
        );

        localStorage.setItem("fontSize", fontSize);
    }, [fontSize]);

    useEffect(() => {
        if (daltonicMode) {
            document.body.classList.add("daltonic-mode");
        } else {
            document.body.classList.remove("daltonic-mode");
        }

        localStorage.setItem("daltonicMode", daltonicMode);
    }, [daltonicMode]);

    //



    return (
        <>
            <Navbar activePage="Acessibilidade" />

            <PageHero
                title="Acessibilidade"
                tag="Painel do Acessibilidade"
                description="Configure o sistemas para uma melhor navegação."
            />

            <div className="user-profile">

                {/*ACESS*/}
                <div className="accessibility-card">
                    <h3>Acessibilidade</h3>

                    <div className="accessibility-option">
                        <label>Modo para Daltonismo</label>

                        <button
                            type="button"
                            className={`btn-accessibility ${daltonicMode ? "active" : ""}`}
                            onClick={() => setDaltonicMode(!daltonicMode)}
                        >
                            {daltonicMode ? "Ativado" : "Desativado"}
                        </button>
                    </div>

                    <div className="accessibility-option">
                        <label>
                            Tamanho da Fonte: <strong>{fontSize}px</strong>
                        </label>

                        <input
                            type="range"
                            min="14"
                            max="20"
                            step="1"
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="font-slider"
                        />
                    </div>
                </div>
                {/* --- */}
            </div>

            <Footer />
        </>
    );
}