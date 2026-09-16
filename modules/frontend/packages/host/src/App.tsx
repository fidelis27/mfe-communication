import { Component, ErrorInfo, lazy, ReactNode, Suspense, useEffect, useState } from "react";
import "./App.css";

const StudentApp = lazy(() => import("mfe_student/App"));
const ActivityApp = lazy(() => import("mfe_activity/App"));
const InstitutionApp = lazy(() => import("mfe_institution/App"));
const DashboardApp = lazy(() => import("mfe_dashboard/App"));
const AdminApp = lazy(() => import("mfe_admin/App"));

const modules = [
  { id: "student", path: "/estudantes", label: "Estudantes", detail: "Cadastros e vínculos" },
  { id: "institution", path: "/instituicoes", label: "Instituições", detail: "Unidades e escopos" },
  { id: "activity", path: "/atividade", label: "Atividade", detail: "Eventos do sistema" },
  { id: "dashboard", path: "/dashboard", label: "Dashboard", detail: "Indicadores" },
  { id: "admin", path: "/admin", label: "Admin", detail: "Pessoas e grupos" },
];

function moduleFromPath(pathname: string) {
  return modules.find((module) => module.path === pathname)?.id ?? "preparing";
}

function moduleLabel(moduleId: string) {
  return modules.find((module) => module.id === moduleId)?.label ?? "Módulo em preparação";
}

type RemoteBoundaryProps = { moduleName: string; children: ReactNode };
type RemoteBoundaryState = { hasError: boolean };

class RemoteBoundary extends Component<RemoteBoundaryProps, RemoteBoundaryState> {
  state: RemoteBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RemoteBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Remote failed to load", { error, componentStack: info.componentStack });
  }

  retry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <section className="remote-state remote-error" role="alert">
          <p className="eyebrow">Módulo indisponível</p>
          <h1>{this.props.moduleName}</h1>
          <p>Não foi possível carregar este módulo agora.</p>
          <button type="button" onClick={this.retry}>
            Tentar novamente
          </button>
        </section>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeModule, setActiveModule] = useState(() =>
    moduleFromPath(typeof window === "undefined" ? "/estudantes" : window.location.pathname),
  );

  useEffect(() => {
    const handlePopState = () => setActiveModule(moduleFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(moduleId: string) {
    const module = modules.find((item) => item.id === moduleId);
    if (!module) return;
    window.history.pushState({}, "", module.path);
    setActiveModule(module.id);
  }

  return (
    <div className="host-shell">
      <a className="skip-link" href="#module-content">
        Ir para o conteúdo
      </a>
      <aside className="host-sidebar">
        <div className="brand">
          <span>SE</span>
          <div>
            Secretaria
            <br />
            <b>Escolar</b>
          </div>
        </div>
        <p className="sidebar-label">Módulos</p>
        <nav aria-label="Módulos da secretaria">
          {modules.map((module) => (
            <button
              className={activeModule === module.id ? "nav-item active" : "nav-item"}
              key={module.id}
              onClick={() => navigate(module.id)}
              aria-current={activeModule === module.id ? "page" : undefined}
            >
              <span className="nav-mark">
                {module.id === "student"
                  ? "01"
                  : module.id === "institution"
                    ? "02"
                    : module.id === "activity"
                      ? "03"
                      : module.id === "dashboard"
                        ? "04"
                        : "05"}
              </span>
              <span>
                <b>{module.label}</b>
                <small>{module.detail}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="online-dot" /> Ambiente local
          <br />
          <small>API + WebSocket</small>
        </div>
      </aside>
      <main className="host-main" id="module-content" tabIndex={-1}>
        <header className="topbar">
          <span>Workspace / {moduleLabel(activeModule)}</span>
          <span className="user-chip">● Demo Active</span>
        </header>
        <RemoteBoundary key={activeModule} moduleName={moduleLabel(activeModule)}>
          {activeModule === "student" ? (
            <Suspense
              fallback={<div className="remote-state">Carregando módulo de estudantes...</div>}
            >
              <StudentApp />
            </Suspense>
          ) : activeModule === "activity" ? (
            <Suspense fallback={<div className="remote-state">Carregando atividade...</div>}>
              <ActivityApp />
            </Suspense>
          ) : activeModule === "institution" ? (
            <Suspense
              fallback={<div className="remote-state">Carregando módulo de instituições...</div>}
            >
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
            <section className="remote-state">
              <p className="eyebrow">Módulo em preparação</p>
              <h1>{moduleLabel(activeModule)}</h1>
              <p>A estrutura está pronta para receber o próximo remote.</p>
            </section>
          )}
        </RemoteBoundary>
      </main>
    </div>
  );
}
