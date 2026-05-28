import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import Popup from "../components/Popup";
import "../styles/yoshi.css";
import {
  CalendarCheck,
  ShieldCheck,
  Plus,
  Trash2,
  Edit,
  X,
  Download,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const API_URL = "/api";

const EMPTY_EXAM_WEEK = {
  examType: "P1",
  startDate: "",
  endDate: "",
  description: "",
};

const EMPTY_HOLIDAY = {
  name: "",
  holidayDate: "",
  type: "CUSTOM",
  description: "",
};

const EMPTY_SEMESTER = {
  name: "",
  startDate: "",
  endDate: "",
};

export default function Configuracao() {
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [authlevel, setAuthlevel] = useState(null);

  const [showDeleteSemesterModal, setShowDeleteSemesterModal] = useState(false);
  const [semesterToDelete, setSemesterToDelete] = useState(null);
  const [showDeleteExamWeekModal, setShowDeleteExamWeekModal] = useState(false);
  const [examWeekToDelete, setExamWeekToDelete] = useState(null);
  const [showDeleteHolidayModal, setShowDeleteHolidayModal] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  // Prazo
  const [prazo, setPrazo] = useState(7);
  const [editandoPrazo, setEditandoPrazo] = useState(false);
  const [valorTempPrazo, setValorTempPrazo] = useState(7);
  const [savingPrazo, setSavingPrazo] = useState(false);

  // Semestres
  const [semestres, setSemestres] = useState([]);
  const [semesterSelecionado, setSemesterSelecionado] = useState("");

  // CRUD Semestres
  const [allSemestres, setAllSemestres] = useState([]);
  const [showSemesterModal, setShowSemesterModal] = useState(false);
  const [editingSemesterId, setEditingSemesterId] = useState(null);
  const [currentSemester, setCurrentSemester] = useState(EMPTY_SEMESTER);
  const [savingSemester, setSavingSemester] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [semestersAbertos, setSemestersAbertos] = useState(false);

  // Semanas de avaliação
  const [examWeeks, setExamWeeks] = useState([]);
  const [loadingExamWeeks, setLoadingExamWeeks] = useState(false);
  const [savingExamWeek, setSavingExamWeek] = useState(false);
  const [showExamWeekForm, setShowExamWeekForm] = useState(false);
  const [currentExamWeek, setCurrentExamWeek] = useState(EMPTY_EXAM_WEEK);
  const [editingExamWeekId, setEditingExamWeekId] = useState(null);

  // Feriados
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState(EMPTY_HOLIDAY);
  const [importingNational, setImportingNational] = useState(false);
  const [nationalYear, setNationalYear] = useState(new Date().getFullYear());
  const [previewHolidays, setPreviewHolidays] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [feriadosAbertos, setFeriadosAbertos] = useState(false);

  // Suspensão
  const [bookingSuspended, setBookingSuspended] = useState(false);
  const [savingSuspension, setSavingSuspension] = useState(false);

  // -------------------- Efeito inicial (cliente) --------------------
  useEffect(() => {
    const t = localStorage.getItem("token");
    const a = localStorage.getItem("authlevel");
    setToken(t);
    setAuthlevel(a);

    if (!t || a !== "1") {
      navigate("/");
      return;
    }

    async function load() {
      await carregarInicial(t);
      await carregarTodosSemestres(t);
    }
    load();
  }, [navigate]);

  // -------------------- Observador de semestre selecionado --------------------
  useEffect(() => {
    if (semesterSelecionado && semesterSelecionado > 0 && token) {
      carregarExamWeeks(semesterSelecionado, token);
    } else {
      setExamWeeks([]);
    }
  }, [semesterSelecionado, token]);

  useEffect(() => {
    if (token) carregarFeriados(token);
  }, [token]);

  // Bloqueio de scroll para modais
  useEffect(() => {
    if (showExamWeekForm || showSemesterModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showExamWeekForm, showSemesterModal]);

  useEffect(() => {
    if (error) setShowErrorPopup(true);
  }, [error]);

  // -------------------- Função para formatar nome do semestre na exibição --------------------
  function formatarNomeSemestre(name) {
    if (!name) return "";
    const pattern = /^(\d{4})\/([1-2])$/;
    const match = name?.trim().match(pattern);
    if (match) {
      const year = match[1];
      const period = match[2] === "1" ? "1º Semestre" : "2º Semestre";
      return `${period} - ${year}`;
    }
    return name;
  }

  function verificarSemestreDuplicado(nome) {
    return allSemestres.some(sem => sem.name === nome.trim());
  }
  // -------------------- Funções que recebem token por parâmetro --------------------
  async function carregarInicial(tokenParam) {
    try {
      setLoading(true);
      setError(null);
      const [configResp, semResp, suspensionResp] = await Promise.all([
        fetch(`${API_URL}/config/booking/min-advance-days`, { headers: { Authorization: `Bearer ${tokenParam}` } }),
        fetch(`${API_URL}/semesters`, { headers: { Authorization: `Bearer ${tokenParam}` } }),
        fetch(`${API_URL}/config/booking/suspend-teacher-bookings`, { headers: { Authorization: `Bearer ${tokenParam}` } }),
      ]);
      if (!configResp.ok) throw new Error("Erro ao carregar prazo mínimo");
      if (!semResp.ok) throw new Error("Erro ao carregar semestres");

      const configData = await configResp.json();
      const semData = await semResp.json();

      setPrazo(configData.days || 7);
      setValorTempPrazo(configData.days || 7);

      const lista = Array.isArray(semData) ? semData : semData.content || [];
      setSemestres(lista);

      if (lista.length > 0 && (!semesterSelecionado || !lista.find(s => s.id === semesterSelecionado))) {
        const ativo = lista.find((s) => s.active === 1);
        const primeiro = ativo || lista[0];
        if (primeiro?.id) setSemesterSelecionado(primeiro.id);
      }

      if (suspensionResp.ok) {
        const suspData = await suspensionResp.json();
        setBookingSuspended(suspData.suspended ?? false);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarTodosSemestres(tokenParam) {
    setLoadingSemesters(true);
    try {
      const resp = await fetch(`${API_URL}/semesters/all`, { headers: { Authorization: `Bearer ${tokenParam}` } });
      if (!resp.ok) throw new Error("Erro ao carregar todos os semestres");
      const data = await resp.json();
      const lista = Array.isArray(data) ? data : [];
      setAllSemestres(lista);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSemesters(false);
    }
  }

  async function carregarExamWeeks(semesterId, tokenParam) {
    if (!semesterId || !tokenParam) return;
    setLoadingExamWeeks(true);
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/semesters/${semesterId}/exam-weeks`, { headers: { Authorization: `Bearer ${tokenParam}` } });
      if (!resp.ok) throw new Error("Erro ao carregar semanas de prova");
      const data = await resp.json();
      setExamWeeks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setExamWeeks([]);
    } finally {
      setLoadingExamWeeks(false);
    }
  }

  function openDeleteHolidayModal(holiday) {
    setHolidayToDelete(holiday);
    setShowDeleteHolidayModal(true);
  }

  async function confirmDeleteHoliday() {
    if (!token || !holidayToDelete) return;

    try {
      const resp = await fetch(`${API_URL}/holidays/${holidayToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Erro ao remover feriado");
      setSuccess(`"${holidayToDelete.name}" removido.`);
      setShowPopup(true);
      await carregarFeriados(token);
    } catch (err) {
      setError(err.message);
      setShowErrorPopup(true);
    } finally {
      setShowDeleteHolidayModal(false);
      setHolidayToDelete(null);
    }
  }

  async function carregarFeriados(tokenParam) {
    setLoadingHolidays(true);
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/holidays`, { headers: { Authorization: `Bearer ${tokenParam}` } });
      if (!resp.ok) throw new Error("Erro ao carregar feriados");
      const data = await resp.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
      setHolidays([]);
    } finally {
      setLoadingHolidays(false);
    }
  }

  function openDeleteExamWeekModal(examWeek) {
    setExamWeekToDelete(examWeek);
    setShowDeleteExamWeekModal(true);
  }

  async function confirmDeleteExamWeek() {
    if (!token || !examWeekToDelete) return;

    try {
      const resp = await fetch(`${API_URL}/semesters/${semesterSelecionado}/exam-weeks/${examWeekToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Erro ao remover");
      setSuccess(`Semana de ${examWeekToDelete.examType} removida.`);
      setShowPopup(true);
      await carregarExamWeeks(semesterSelecionado, token);
    } catch (err) {
      setError(err.message);
      setShowErrorPopup(true);
    } finally {
      setShowDeleteExamWeekModal(false);
      setExamWeekToDelete(null);
    }
  }
  // -------------------- Funções que usam o token do estado (já disponível) --------------------
  async function salvarPrazo() {
    if (valorTempPrazo < 1) { setError("O prazo deve ser maior que 0."); return; }
    if (!token) return;
    setSavingPrazo(true);
    setError(null);
    setSuccess(null);
    try {
      const resp = await fetch(`${API_URL}/config/booking/min-advance-days`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ days: valorTempPrazo }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.error || "Erro ao salvar prazo"); }
      const data = await resp.json();
      setPrazo(data.days);
      setEditandoPrazo(false);
      setSuccess("Prazo de antecedência atualizado com sucesso!");
      setShowPopup(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPrazo(false);
    }
  }

  async function toggleSuspension() {
    if (!token) return;
    setSavingSuspension(true);
    setError(null);

    const newState = !bookingSuspended;
    setBookingSuspended(newState);

    try {
      const resp = await fetch(`${API_URL}/config/booking/suspend-teacher-bookings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suspended: newState }),
      });

      if (!resp.ok) {
        setBookingSuspended(!newState);
        let errorMessage = "Erro ao alterar suspensão";
        try {
          const errorData = await resp.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = (await resp.text()) || errorMessage;
        }
        throw new Error(errorMessage);
      }
    } catch (err) {
      setError(err.message);
      setShowErrorPopup(true);
    } finally {
      setSavingSuspension(false);
    }
  }

  async function salvarSemester(e) {
    e.preventDefault();
    if (!token) return;
    const { name, startDate, endDate } = currentSemester;
    const nomeTrimmed = name?.trim() || "";

    // Validação 1: campos obrigatórios
    if (!nomeTrimmed || !startDate || !endDate) {
      setError("Preencha todos os campos obrigatórios.");
      setShowErrorPopup(true);
      return;
    }

    // Validação 2: formato do nome
    const nomeValido = /^(\d{4})\/([1-2])$/.test(nomeTrimmed);
    if (!nomeValido) {
      setError("Formato inválido! Use o padrão AAAA/X (ex: 2026/1 para 1º semestre ou 2026/2 para 2º semestre)");
      setShowErrorPopup(true);
      return;
    }

    // Validação 3: duplicata (apenas para novos semestres, não para edição)
    if (!editingSemesterId) {
      const existeDuplicata = allSemestres.some(sem => sem.name === nomeTrimmed);
      if (existeDuplicata) {
        setError(`O semestre "${nomeTrimmed}" já existe. Não é possível criar duplicatas.`);
        setShowErrorPopup(true);
        return;
      }
    }

    // Validação 4: datas
    if (new Date(startDate) > new Date(endDate)) {
      setError("A data de início não pode ser posterior à data de fim.");
      setShowErrorPopup(true);
      return;
    }

    setSavingSemester(true);
    setError(null);
    setSuccess(null);

    try {
      let resp;
      if (editingSemesterId) {
        resp = await fetch(`${API_URL}/semesters/${editingSemesterId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: nomeTrimmed, startDate, endDate }),
        });
      } else {
        resp = await fetch(`${API_URL}/semesters`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: nomeTrimmed, startDate, endDate }),
        });
      }

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.message || "Erro ao salvar semestre");
      }

      setSuccess(editingSemesterId ? "Semestre atualizado com sucesso!" : "Semestre criado com sucesso!");
      setShowPopup(true);
      handleCloseSemesterModal();
      await carregarTodosSemestres(token);
      await carregarInicial(token);
    } catch (err) {
      setError(err.message);
      setShowErrorPopup(true);
    } finally {
      setSavingSemester(false);
    }
  }

  function openDeleteSemesterModal(semester) {
    setSemesterToDelete(semester);
    setShowDeleteSemesterModal(true);
  }

  async function confirmDeleteSemester() {
    if (!token || !semesterToDelete) return;

    try {
      const resp = await fetch(`${API_URL}/semesters/${semesterToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Erro ao excluir semestre");
      setSuccess(`Semestre "${semesterToDelete.name}" excluído.`);
      setShowPopup(true);
      await carregarTodosSemestres(token);
      await carregarInicial(token);
      if (semesterSelecionado === semesterToDelete.id) {
        const novosAtivos = semestres.filter(s => s.id !== semesterToDelete.id);
        if (novosAtivos.length > 0) setSemesterSelecionado(novosAtivos[0].id);
        else setSemesterSelecionado("");
      }
    } catch (err) {
      setError(err.message);
      setShowErrorPopup(true);
    } finally {
      setShowDeleteSemesterModal(false);
      setSemesterToDelete(null);
    }
  }

  async function toggleSemesterActive(id) {
    if (!token) return;
    try {
      const resp = await fetch(`${API_URL}/semesters/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Erro ao alterar status do semestre");
      const updated = await resp.json();
      setSuccess(`Semestre ${updated.active ? "ativado" : "desativado"} com sucesso.`);
      setShowPopup(true);
      await carregarTodosSemestres(token);
      await carregarInicial(token);
      if (!updated.active && semesterSelecionado === id) {
        const novosAtivos = semestres.filter(s => s.id !== id);
        if (novosAtivos.length > 0) setSemesterSelecionado(novosAtivos[0].id);
        else setSemesterSelecionado("");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvarExamWeek(e) {
    e.preventDefault();
    if (!token || !semesterSelecionado) return;
    const { examType, startDate, endDate, description } = currentExamWeek;
    if (!examType || !startDate || !endDate) {
      setError("Preencha tipo, data início e data fim.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError("Data início não pode ser posterior à data fim.");
      return;
    }
    setSavingExamWeek(true);
    setError(null);
    setSuccess(null);
    try {
      const url = editingExamWeekId
          ? `${API_URL}/semesters/${semesterSelecionado}/exam-weeks/${editingExamWeekId}`
          : `${API_URL}/semesters/${semesterSelecionado}/exam-weeks`;
      const resp = await fetch(url, {
        method: editingExamWeekId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ examType, startDate, endDate, description }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || "Erro ao salvar"); }
      setSuccess(editingExamWeekId ? "Semana atualizada!" : "Semana criada!");
      setShowPopup(true);
      handleCloseExamWeekForm();
      await carregarExamWeeks(semesterSelecionado, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingExamWeek(false);
    }
  }

  async function deletarExamWeek(id, examType) {
    if (!token) return;
    if (!window.confirm(`Remover semana de ${examType}?`)) return;
    try {
      const resp = await fetch(`${API_URL}/semesters/${semesterSelecionado}/exam-weeks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Erro ao remover");
      setSuccess(`Semana de ${examType} removida.`);
      setShowPopup(true);
      await carregarExamWeeks(semesterSelecionado, token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function salvarFeriado(e) {
    e.preventDefault();
    if (!token) return;
    const { name, holidayDate, type, description } = currentHoliday;
    if (!name || !holidayDate) { setError("Nome e data são obrigatórios."); return; }
    setSavingHoliday(true);
    setError(null);
    setSuccess(null);
    try {
      const resp = await fetch(`${API_URL}/holidays`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, holidayDate, type, description }),
      });
      if (!resp.ok) { const e = await resp.json(); throw new Error(e.message || "Erro ao criar feriado"); }
      setSuccess("Feriado criado com sucesso!");
      setShowPopup(true);
      setShowHolidayForm(false);
      setCurrentHoliday(EMPTY_HOLIDAY);
      await carregarFeriados(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingHoliday(false);
    }
  }

  async function deletarFeriado(id, name) {
    if (!token) return;
    if (!window.confirm(`Remover "${name}"?`)) return;
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/holidays/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Erro ao remover feriado");
      setSuccess(`"${name}" removido.`);
      setShowPopup(true);
      await carregarFeriados(token);
    } catch (err) {
      setError(err.message);
    }
  }

  async function previewNacionais() {
    if (!token) return;
    setLoadingPreview(true);
    setError(null);
    setShowPreview(false);
    try {
      const resp = await fetch(`${API_URL}/holidays/national/preview?year=${nationalYear}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error("Erro ao buscar prévia");
      const data = await resp.json();
      setPreviewHolidays(data);
      setShowPreview(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function importarNacionais() {
    if (!token) return;
    setImportingNational(true);
    setError(null);
    setSuccess(null);
    try {
      const resp = await fetch(`${API_URL}/holidays/national/import?year=${nationalYear}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Erro ao importar");
      const data = await resp.json();
      setSuccess(`${data.length} feriados nacionais de ${nationalYear} importados!`);
      setShowPopup(true);
      setShowPreview(false);
      await carregarFeriados(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setImportingNational(false);
    }
  }

  // -------------------- Handlers para modais --------------------
  function handleOpenSemesterModal(semester = null) {
    if (semester) {
      setEditingSemesterId(semester.id);
      setCurrentSemester({
        name: semester.name,
        startDate: semester.startDate || "",
        endDate: semester.endDate || "",
      });
    } else {
      setEditingSemesterId(null);
      setCurrentSemester(EMPTY_SEMESTER);
    }
    setShowSemesterModal(true);
  }

  function handleCloseSemesterModal() {
    setShowSemesterModal(false);
    setCurrentSemester(EMPTY_SEMESTER);
    setEditingSemesterId(null);
    setError(null);
  }

  function handleOpenExamWeekForm(examWeek = null) {
    if (examWeek) {
      setEditingExamWeekId(examWeek.id);
      setCurrentExamWeek({
        examType: examWeek.examType,
        startDate: examWeek.startDate,
        endDate: examWeek.endDate,
        description: examWeek.description || "",
      });
    } else {
      setEditingExamWeekId(null);
      setCurrentExamWeek(EMPTY_EXAM_WEEK);
    }
    setShowExamWeekForm(true);
  }

  function handleCloseExamWeekForm() {
    setShowExamWeekForm(false);
    setCurrentExamWeek(EMPTY_EXAM_WEEK);
    setEditingExamWeekId(null);
    setError(null);
  }

  // -------------------- Utilitários de UI --------------------
  function traduzirTipo(type) {
    switch (type) {
      case "NATIONAL": return "Nacional";
      case "CUSTOM": return "Local";
      default: return type;
    }
  }

  function tipoCor(type) {
    switch (type) {
      case "NATIONAL": return { background: "#dbeafe", color: "#1d4ed8" };
      case "CUSTOM": return { background: "#fef9c3", color: "#854d0e" };
      default: return { background: "#f3f4f6", color: "#374151" };
    }
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  // -------------------- Renderização condicional --------------------
  if (loading) return (
      <>
        <Navbar activePage="configuracao" />
        <div className="content">Carregando configurações...</div>
        <Footer />
      </>
  );

  // -------------------- JSX --------------------
  return (
      <>
        <Navbar activePage="configuracao" />
        <PageHero
            tag="Área de Configuração"
            title="Configurações do sistema"
            description="Gerencie suas preferências e configurações do sistema."
        />

        <div className="content-config">
          {/* Prazo */}
          <h2 className="secao-titulo">Reservas</h2>
          <div className="card" style={{ flexWrap: "wrap" }}>
            <div className="card-left" style={{ flex: "1 1 200px" }}>
              <div className="icon-box"><CalendarCheck size={28} /></div>
              <div className="card-info">
                <h3>Prazo de antecedência</h3>
                <p>Defina com quantos dias de antecedência uma sala pode ser reservada.</p>
              </div>
            </div>
            {!editandoPrazo ? (
                <div className="card-right" style={{ flex: "1 1 auto", justifyContent: "flex-end", flexWrap: "wrap", gap: "12px" }}>
                  <span className="badge">{prazo} dias</span>
                  <button className="btn-action btn-editar" onClick={() => setEditandoPrazo(true)}>Editar</button>
                </div>
            ) : (
                <div className="card-right" style={{ flex: "1 1 auto", justifyContent: "flex-end", flexWrap: "wrap", gap: "12px" }}>
                  <div className="input-group">
                    <input type="number" value={valorTempPrazo} onChange={(e) => setValorTempPrazo(Number(e.target.value))} min="1" />
                    <span>dias</span>
                  </div>
                  <div className="botoes">
                    <button className="btn-action btn-bowser" onClick={() => { setEditandoPrazo(false); setValorTempPrazo(prazo); }} disabled={savingPrazo}>Cancelar</button>
                    <button className="btn-action btn-caca" onClick={salvarPrazo} disabled={savingPrazo}>{savingPrazo ? "Salvando..." : "Salvar"}</button>
                  </div>
                </div>
            )}
          </div>

          {/* Suspensão */}
          <h2 className="secao-titulo">Disponibilidade</h2>
          <div className="card">
            <div className="card-left">
              <div className="icon-box" style={{ background: bookingSuspended ? "#fee2e2" : undefined }}>
                <ShieldCheck size={28} color={bookingSuspended ? "#dc2626" : undefined} />
              </div>
              <div className="card-info">
                <h3>Suspensão de reservas</h3>
                <p>
                  {bookingSuspended
                      ? "Reservas estão suspensas. Professores não podem criar novas reservas."
                      : "Reservas estão ativas. Professores podem criar reservas normalmente."}
                </p>
              </div>
            </div>
            <div className="card-right">
              <div className="toggle-switch">
                <label className="toggle-label">
                  <div className="toggle-status">
                    <span className={`status-badge ${!bookingSuspended ? "active" : "suspended"}`}>
                      {!bookingSuspended ? "Ativas" : "Suspensas"}
                    </span>
                  </div>
                  <div className="toggle-wrapper">
                    <input
                        type="checkbox"
                        checked={!bookingSuspended}
                        onChange={toggleSuspension}
                        disabled={savingSuspension}
                        className="toggle-input"
                    />
                    <div className="toggle-slider"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Feriados */}
          <h2 className="secao-titulo">Feriados</h2>
          <div className="card" style={{ marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
            <div className="card-left">
              <div className="icon-box"><Download size={22} /></div>
              <div className="card-info">
                <h3>Importar feriados nacionais</h3>
                <p>Busca automaticamente via BrasilAPI. Duplicatas são ignoradas.</p>
              </div>
            </div>
            <div className="card-right" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
              <input
                  type="number"
                  value={nationalYear}
                  onChange={(e) => setNationalYear(Number(e.target.value))}
                  min="2024" max="2030"
                  style={{ width: "90px", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #ccc" }}
              />
              <button className="btn-action btn-editar" onClick={previewNacionais} disabled={loadingPreview}>
                {loadingPreview ? "Buscando..." : "Prévia"}
              </button>
              <button className="btn-action btn-caca" onClick={importarNacionais} disabled={importingNational}>
                {importingNational ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>

          {showPreview && previewHolidays.length > 0 && (
              <div className="card" style={{ flexDirection: "column", alignItems: "stretch", marginBottom: "1rem", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Prévia — {previewHolidays.length} feriados nacionais de {nationalYear}</strong>
                  <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "200px", overflowY: "auto" }}>
                  {previewHolidays.map((h, i) => (
                      <div key={i} style={{ display: "flex", gap: "12px", fontSize: "0.9rem", padding: "4px 0", borderBottom: "1px solid #f0f0f0" }}>
                        <span style={{ color: "#555", minWidth: "90px" }}>{h.date?.split("-").reverse().join("/")}</span>
                        <span>{h.name}</span>
                      </div>
                  ))}
                </div>
                <button className="btn-action btn-caca" style={{ width: "fit-content" }} onClick={importarNacionais} disabled={importingNational}>
                  {importingNational ? "Importando..." : "Confirmar importação"}
                </button>
              </div>
          )}

          <div className="card" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.75rem" }}>
            <div onClick={() => setFeriadosAbertos(prev => !prev)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
              <strong style={{ fontSize: "0.95rem" }}>
                {holidays.length} feriado{holidays.length !== 1 ? "s" : ""} cadastrado{holidays.length !== 1 ? "s" : ""}
              </strong>
              <span style={{ fontSize: "0.85rem", color: "#888" }}>{feriadosAbertos ? "▲ Recolher" : "▼ Expandir"}</span>
            </div>
            {feriadosAbertos && (
                <>
                  {loadingHolidays ? (
                      <p>Carregando feriados...</p>
                  ) : holidays.length === 0 ? (
                      <p style={{ color: "#888" }}>Nenhum feriado cadastrado.</p>
                  ) : (
                      holidays.slice().sort((a, b) => a.holidayDate?.localeCompare(b.holidayDate)).map((h) => (
                          <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 0.75rem", borderRadius: "8px", background: "#f9f9f9", border: "1px solid #eee" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                              <span style={{ color: "#555", minWidth: "80px", fontSize: "0.9rem" }}>{h.holidayDate?.split("-").reverse().join("/")}</span>
                              <strong>{h.name}</strong>
                              <span style={{ fontSize: "0.72rem", borderRadius: "4px", padding: "0.1rem 0.5rem", fontWeight: 600, ...tipoCor(h.type) }}>
                                {traduzirTipo(h.type)}
                              </span>
                              {h.description && <span style={{ color: "#888", fontSize: "0.85rem" }}>{h.description}</span>}
                            </div>
                            <button
                                onClick={() => openDeleteHolidayModal(h)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c" }}
                                title="Remover"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                      ))
                  )}
                </>
            )}
            {showHolidayForm ? (
                <form onSubmit={salvarFeriado} style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.5rem", borderTop: "1px solid #eee", paddingTop: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <input className={"tr-filters__search"} type="text" placeholder="Nome do feriado *" value={currentHoliday.name} onChange={(e) => setCurrentHoliday({ ...currentHoliday, name: e.target.value })} required style={{ flex: 2, minWidth: "160px", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                    <input className={"tr-filters__search"} type="date" value={currentHoliday.holidayDate} onChange={(e) => setCurrentHoliday({ ...currentHoliday, holidayDate: e.target.value })} required style={{ flex: 1, minWidth: "140px", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                    <select className={"tr-filters__select"} value={currentHoliday.type} onChange={(e) => setCurrentHoliday({ ...currentHoliday, type: e.target.value })} style={{ padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #ccc" }}>
                      <option value="NATIONAL">Nacional</option>
                      <option value="CUSTOM">Local</option>
                    </select>
                  </div>
                  <input className={"tr-filters__search"} type="text" placeholder="Descrição (opcional)" value={currentHoliday.description} onChange={(e) => setCurrentHoliday({ ...currentHoliday, description: e.target.value })} style={{ flex: 2, minWidth: "160px", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #ccc" }} />
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn-action btn-bowser" type="button" onClick={() => { setShowHolidayForm(false); setCurrentHoliday(EMPTY_HOLIDAY); }}>Cancelar</button>
                    <button className="btn-action btn-caca" type="submit" disabled={savingHoliday}>{savingHoliday ? "Salvando..." : "Salvar feriado"}</button>
                  </div>
                </form>
            ) : (
                <button onClick={() => setShowHolidayForm(true)} style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "none", border: "1px dashed #aaa", borderRadius: "8px", padding: "0.5rem 1rem", cursor: "pointer", color: "#555", marginTop: "0.25rem", width: "fit-content" }}>
                  <Plus size={16} /> Adicionar feriado
                </button>
            )}
          </div>

          {/* Semanas de avaliação */}
          <h2 className="secao-titulo">Semanas de Avaliação (P1, P2, P3)</h2>
          {semestres.length === 0 ? (
              <div className="card"><p>Nenhum semestre cadastrado.</p></div>
          ) : (
              <>
                <div className="card" style={{ marginBottom: "1rem" }}>
                  <div className="card-left">
                    <div className="card-info">
                      <h3>Semestre ativo</h3>
                      <p>Selecione o semestre para gerenciar as semanas de prova.</p>
                    </div>
                  </div>
                  <div className="card-right">
                    <select className={"eastereggguilhermastico"} value={semesterSelecionado} onChange={(e) => setSemesterSelecionado(Number(e.target.value))} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid var(--gray-200)" }}>
                      {semestres.map((sem) => (<option key={sem.id} value={sem.id}>{formatarNomeSemestre(sem.name)} {sem.active === 1 ? "(Ativo)" : "(Inativo)"}</option>))}
                    </select>
                  </div>
                </div>
                <div className="card" style={{ flexDirection: "column", alignItems: "stretch" }}>
                  {loadingExamWeeks ? <p>Carregando semanas de avaliação...</p> : examWeeks.length === 0 ? <p style={{ color: "var(--gray-500)" }}>Nenhuma semana de avaliação cadastrada.</p> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {examWeeks.map((ew) => (
                            <div key={ew.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--gray-50)", borderRadius: "12px", border: "1px solid var(--gray-200)" }}>
                              <div>
                                <strong style={{ fontSize: "1rem", marginRight: "12px" }}>{ew.examType}</strong>
                                <span style={{ color: "var(--gray-700)" }}>{ew.startDate.split("-").reverse().join("/")} a {ew.endDate.split("-").reverse().join("/")}</span>
                                {ew.description && <span style={{ marginLeft: "12px", fontSize: "0.85rem", color: "var(--gray-500)" }}>– {ew.description}</span>}
                              </div>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button onClick={() => handleOpenExamWeekForm(ew)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2196F3" }} title="Editar"><Edit size={18} /></button>
                                {/* CORRIJA AQUI: use deletarExamWeek, NÃO openDeleteSemesterModal */}
                                <button onClick={() => openDeleteExamWeekModal(ew)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }} title="Excluir"><Trash2 size={18} /></button>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                  <button onClick={() => handleOpenExamWeekForm()} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "20px", background: "none", border: "1px dashed var(--gray-400)", borderRadius: "12px", padding: "10px 16px", cursor: "pointer", width: "fit-content", color: "var(--gray-700)" }}>
                    <Plus size={18} /> Adicionar semana de avaliação
                  </button>
                </div>
              </>
          )}

          {/* Semestres */}
          <h2 className="secao-titulo">Gerenciamento de Semestres</h2>
          <div className="card" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.75rem" }}>
            <div onClick={() => setSemestersAbertos(prev => !prev)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
              <strong style={{ fontSize: "0.95rem" }}>{allSemestres.length} semestre{allSemestres.length !== 1 ? "s" : ""} cadastrado{allSemestres.length !== 1 ? "s" : ""}</strong>
              <span style={{ fontSize: "0.85rem", color: "#888" }}>{semestersAbertos ? "▲ Recolher" : "▼ Expandir"}</span>
            </div>
            {semestersAbertos && (
                <>
                  {loadingSemesters ? <p>Carregando semestres...</p> : allSemestres.length === 0 ? <p style={{ color: "#888" }}>Nenhum semestre cadastrado. Clique em "Adicionar semestre" para começar.</p> : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {allSemestres.map((sem) => (
                            <div key={sem.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f9f9f9", borderRadius: "12px", border: "1px solid #eee", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                                <strong style={{ minWidth: "180px" }}>{formatarNomeSemestre(sem.name)}</strong>
                                <span style={{ color: "#555", fontSize: "0.85rem" }}>{formatDateBR(sem.startDate)} → {formatDateBR(sem.endDate)}</span>
                                <span style={{ fontSize: "0.7rem", fontWeight: "bold", padding: "2px 8px", borderRadius: "20px", background: sem.active === 1 ? "#c8e6c9" : "#ffcdd2", color: sem.active === 1 ? "#2e7d32" : "#c62828" }}>
                                  {sem.active === 1 ? "ATIVO" : "INATIVO"}
                                </span>
                              </div>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <button onClick={() => toggleSemesterActive(sem.id)} style={{ background: "none", border: "none", cursor: "pointer", color: sem.active === 1 ? "#f39c12" : "#2ecc71", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }} title={sem.active === 1 ? "Desativar" : "Ativar"}>
                                  {sem.active === 1 ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                  {sem.active === 1 ? "Desativar" : "Ativar"}
                                </button>
                                <button onClick={() => handleOpenSemesterModal(sem)} style={{ background: "none", border: "none", cursor: "pointer", color: "#2196F3" }} title="Editar"><Edit size={18} /></button>
                                <button
                                    onClick={() => openDeleteSemesterModal(sem)}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#e74c3c" }}
                                    title="Excluir"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </>
            )}
            <button onClick={() => handleOpenSemesterModal()} style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", background: "none", border: "1px dashed #aaa", borderRadius: "12px", padding: "10px 16px", cursor: "pointer", width: "fit-content", color: "#555" }}>
              <Plus size={18} /> Adicionar semestre
            </button>
          </div>
        </div>

        {/* Modal Semestre */}
        {showSemesterModal && (
            <div className="modal-overlay" onClick={handleCloseSemesterModal}>
              <div className="modal-espacos" onClick={(e) => e.stopPropagation()}>
                <div className="modal-topo">
                  <h2>{editingSemesterId ? "Editar Semestre" : "Novo Semestre"}</h2>
                  <button className="btn-close-modal" onClick={handleCloseSemesterModal}><X size={20} /></button>
                </div>
                <form onSubmit={salvarSemester}>
                  <div className="form-group-reserva">
                    <label>Nome do semestre *</label>
                    <input
                        type="text"
                        value={currentSemester.name}
                        onChange={(e) => {
                          const novoValor = e.target.value;
                          setCurrentSemester({ ...currentSemester, name: novoValor });
                        }}
                        placeholder="Ex.: 2026/1"
                        required
                        style={{
                          borderColor: currentSemester.name && !/^(\d{4})\/([1-2])$/.test(currentSemester.name.trim())
                              ? "#dc2626"
                              : "#d1d5db"
                        }}
                    />
                    <small style={{ color: "#6b7280", fontSize: "0.7rem", display: "block", marginTop: "4px" }}>
                      Formato obrigatório: <strong>AAAA/X</strong> (ex: 2026/1 para primeiro semestre, 2026/2 para segundo semestre)
                    </small>
                    {currentSemester.name && !/^(\d{4})\/([1-2])$/.test(currentSemester.name.trim()) && (
                        <small style={{ color: "#dc2626", fontSize: "0.7rem", display: "block", marginTop: "4px" }}>
                          ⚠ Formato inválido! Use AAAA/1 ou AAAA/2 (ex: 2026/1)
                        </small>
                    )}
                  </div>
                  <div className="form-group-reserva">
                    <label>Data início *</label>
                    <input
                        type="date"
                        value={currentSemester.startDate}
                        onChange={(e) => setCurrentSemester({ ...currentSemester, startDate: e.target.value })}
                        required
                    />
                  </div>
                  <div className="form-group-reserva">
                    <label>Data fim *</label>
                    <input
                        type="date"
                        value={currentSemester.endDate}
                        onChange={(e) => setCurrentSemester({ ...currentSemester, endDate: e.target.value })}
                        required
                    />
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                    <button type="submit" className="btn-submit-reserva" disabled={savingSemester}>
                      {savingSemester ? "Salvando..." : editingSemesterId ? "Atualizar" : "Criar"}
                    </button>
                    <button type="button" className="btn-cancelar" onClick={handleCloseSemesterModal}>
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {showExamWeekForm && (
            <div className="modal-overlay" onClick={handleCloseExamWeekForm}>
              <div className="modal-espacos" onClick={(e) => e.stopPropagation()}>
                <div className="modal-topo">
                  <h2>{editingExamWeekId ? "Editar" : "Nova"} semana de avaliação</h2>
                  <button className="btn-close-modal" onClick={handleCloseExamWeekForm}><X size={20} /></button>
                </div>
                <form onSubmit={salvarExamWeek}>
                  <div className="form-group-reserva"><label>Tipo de prova *</label><select value={currentExamWeek.examType} onChange={(e) => setCurrentExamWeek({ ...currentExamWeek, examType: e.target.value })} required><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option></select></div>
                  <div className="form-group-reserva"><label>Data início *</label><input type="date" value={currentExamWeek.startDate} onChange={(e) => setCurrentExamWeek({ ...currentExamWeek, startDate: e.target.value })} required /></div>
                  <div className="form-group-reserva"><label>Data fim *</label><input type="date" value={currentExamWeek.endDate} onChange={(e) => setCurrentExamWeek({ ...currentExamWeek, endDate: e.target.value })} required /></div>
                  <div className="form-group-reserva"><label>Descrição (opcional)</label><input type="text" placeholder="" value={currentExamWeek.description} onChange={(e) => setCurrentExamWeek({ ...currentExamWeek, description: e.target.value })} /></div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                    <button type="submit" className="btn-submit-reserva" disabled={savingExamWeek}>{savingExamWeek ? "Salvando..." : editingExamWeekId ? "Atualizar" : "Criar"}</button>
                    <button type="button" className="btn-cancelar" onClick={handleCloseExamWeekForm}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {showPopup && <Popup message={success} onClose={() => setShowPopup(false)} />}
        {showErrorPopup && <Popup message={error} onClose={() => setShowErrorPopup(false)} type="error" />}

        {/* Modal de confirmação de exclusão de semestre */}
        {showDeleteSemesterModal && semesterToDelete && (
            <div className="modal-overlay">
              <div className="confirm-modal">
                <div className="confirm-icon">!</div>
                <h2>Confirmar exclusão</h2>
                <p>
                  Tem certeza que deseja excluir o semestre <strong>{semesterToDelete.name}</strong>?
                  <br />
                  <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>
          Esta ação não pode ser desfeita e pode afetar reservas vinculadas.
        </span>
                </p>
                <div className="confirm-buttons">
                  <button
                      className="btn-action btn-secondary"
                      onClick={() => {
                        setShowDeleteSemesterModal(false);
                        setSemesterToDelete(null);
                      }}
                  >
                    Cancelar
                  </button>
                  <button
                      className="btn-action btn-danger"
                      onClick={confirmDeleteSemester}
                  >
                    Sim, excluir
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Modal de confirmação de exclusão de semana de prova */}
        {showDeleteExamWeekModal && examWeekToDelete && (
            <div className="modal-overlay">
              <div className="confirm-modal">
                <div className="confirm-icon">!</div>
                <h2>Confirmar exclusão</h2>
                <p>
                  Tem certeza que deseja excluir a semana de <strong>{examWeekToDelete.examType}</strong>?
                  <br />
                  <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>
          Esta ação não pode ser desfeita.
        </span>
                </p>
                <div className="confirm-buttons">
                  <button
                      className="btn-action btn-secondary"
                      onClick={() => {
                        setShowDeleteExamWeekModal(false);
                        setExamWeekToDelete(null);
                      }}
                  >
                    Cancelar
                  </button>
                  <button
                      className="btn-action btn-danger"
                      onClick={confirmDeleteExamWeek}
                  >
                    Sim, excluir
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* Modal de confirmação de exclusão de feriado */}
        {showDeleteHolidayModal && holidayToDelete && (
            <div className="modal-overlay">
              <div className="confirm-modal">
                <div className="confirm-icon">!</div>
                <h2>Confirmar exclusão</h2>
                <p>
                  Tem certeza que deseja excluir o feriado <strong>{holidayToDelete.name}</strong>?
                  <br />
                  <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>
          Esta ação não pode ser desfeita.
        </span>
                </p>
                <div className="confirm-buttons">
                  <button
                      className="btn-action btn-secondary"
                      onClick={() => {
                        setShowDeleteHolidayModal(false);
                        setHolidayToDelete(null);
                      }}
                  >
                    Cancelar
                  </button>
                  <button
                      className="btn-action btn-danger"
                      onClick={confirmDeleteHoliday}
                  >
                    Sim, excluir
                  </button>
                </div>
              </div>
            </div>
        )}
        <Footer />
      </>
  );
}