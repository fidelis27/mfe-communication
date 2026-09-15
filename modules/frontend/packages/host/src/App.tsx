import { lazy, Suspense, useState } from "react";
import "./App.css";

const StudentApp = lazy(() => import("mfe_student/App"));
const ActivityApp = lazy(() => import("mfe_activity/App"));
const InstitutionApp = lazy(() => import("mfe_institution/App"));
const DashboardApp = lazy(() => import("mfe_dashboard/App"));
const AdminApp = lazy(() => import("mfe_admin/App"));

const modules = [
  { id: "student", label: "Estudantes", detail: "Cadastros e vínculos" },
  { id: "institution", label: "Instituições", detail: "Unidades e escopos" },
  { id: "activity", label: "Atividade", detail: "Eventos do sistema" },
  { id: "dashboard", label: "Dashboard", detail: "Indicadores" },
  { id: "admin", label: "Admin", detail: "Pessoas e grupos" },
];

export default function App() {
  const [activeModule, setActiveModule] = useState("student");

  return (
    <div className="host-shell">
      <aside className="host-sidebar">
        <div className="brand"><span>SE</span><div>Secretaria<br /><b>Escolar</b></div></div>
        <p className="sidebar-label">Módulos</p>
        <nav aria-label="Módulos da secretaria">
          {modules.map((module) => (
            <button className={activeModule === module.id ? "nav-item active" : "nav-item"} key={module.id} onClick={() => setActiveModule(module.id)}>
              <span className="nav-mark">{module.id === "student" ? "01" : module.id === "institution" ? "02" : module.id === "activity" ? "03" : module.id === "dashboard" ? "04" : "05"}</span>
              <span><b>{module.label}</b><small>{module.detail}</small></span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="online-dot" /> Ambiente local<br /><small>API + WebSocket</small></div>
      </aside>
      <main className="host-main">
        <header className="topbar"><span>Workspace / {modules.find((module) => module.id === activeModule)?.label}</span><span className="user-chip">● Demo Active</span></header>
        {activeModule === "student" ? (
          <Suspense fallback={<div className="remote-state">Carregando módulo de estudantes...</div>}>
            <StudentApp />
          </Suspense>
        ) : activeModule === "activity" ? (
          <Suspense fallback={<div className="remote-state">Carregando atividade...</div>}>
            <ActivityApp />
          </Suspense>
        ) : activeModule === "institution" ? (
          <Suspense fallback={<div className="remote-state">Carregando módulo de instituições...</div>}>
            <InstitutionApp />
          </Suspense>
        ) : activeModule === "dashboard" ? (
          <Suspense fallback={<div className="remote-state">Carregando dashboard...</div>}>
            <DashboardApp />
          </Suspense>
        ) : activeModule === "admin" ? (
          <Suspense fallback={<div className="remote-state">Carregando administração...</div>}>
            <AdminApp />
          </Suspense>
        ) : (
          <section className="remote-state"><p className="eyebrow">Módulo em preparação</p><h1>{modules.find((module) => module.id === activeModule)?.label}</h1><p>A estrutura está pronta para receber o próximo remote.</p></section>
        )}
      </main>
    </div>
  );
}