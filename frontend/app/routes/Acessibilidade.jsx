import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";




export default function Acessibilidade() {
 const navigate = useNavigate();

    const [fontSize, setFontSize] = useState(14);
    const [daltonicMode, setDaltonicMode] = useState(false);
    const [highContrast, setHighContrast] = useState(false);


    /* Carrega configurações */
    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedFontSize = localStorage.getItem("fontSize");
            const savedDaltonicMode = localStorage.getItem("daltonicMode");

            if (savedFontSize) {
                setFontSize(Number(savedFontSize));
            }

            if (savedDaltonicMode === "true") {
                setDaltonicMode(true);
            }
        }
    }, []);

    

    /* Atualiza tamanho da fonte */
    useEffect(() => {
        document.documentElement.style.setProperty(
            "--user-font-size",
            `${fontSize}px`
        );

        if (typeof window !== "undefined") {
            localStorage.setItem("fontSize", fontSize);
        }
    }, [fontSize]);

    /* Atualiza modo daltônico */
    useEffect(() => {
        if (daltonicMode) {
            document.body.classList.add("daltonic-mode");
        } else {
            document.body.classList.remove("daltonic-mode");
        }

        if (typeof window !== "undefined") {
            localStorage.setItem("daltonicMode", daltonicMode);
        }
    }, [daltonicMode]);



    return (
        <>
            <Navbar activePage="Acessibilidade" />

            <PageHero
                title="Acessibilidade"
                tag="Painel do Acessibilidade"
                description="Configure o sistemas para uma melhor navegação."
            />

            <div className="container-acess">

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