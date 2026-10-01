import {
  Component,
  ErrorInfo,
  FormEvent,
  lazy,
  ReactNode,
  Suspense,
  useEffect,
  useState,
} from "react";
import { initializeAuth, login, logout, subscribeToAuthState } from "@mfe/shared";
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export default function App() {
  const [activeModule, setActiveModule] = useState(() =>
    moduleFromPath(typeof window === "undefined" ? "/estudantes" : window.location.pathname),
  );
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setAuthReady(true);
      return;
    }

    let active = true;
    let unsubscribe = () => {};
    void initializeAuth({ url: supabaseUrl, anonKey: supabaseAnonKey })
      .then((hasSession) => {
        if (!active) return;
        setAuthenticated(hasSession);
        setAuthReady(true);
        unsubscribe = subscribeToAuthState(setAuthenticated);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : "Não foi possível iniciar a sessão.");
        setAuthReady(true);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

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

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setSigningIn(true);
    try {
      await login(email, password);
      setAuthenticated(true);
      setPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    setAuthError("");
    try {
      await logout();
      setAuthenticated(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível encerrar a sessão.");
    }
  }

  if (!authReady) {
    return (
      <main className="remote-state" aria-live="polite">
        <p className="eyebrow">Secretaria escolar</p>
        <h1>Verificando sessão</h1>
      </main>
    );
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <main className="remote-state" role="alert">
        <p className="eyebrow">Secretaria escolar</p>
        <h1>Autenticação não configurada</h1>
        <p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o login.</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="remote-state">
        <p className="eyebrow">Secretaria escolar</p>
        <h1>Login necessário</h1>
        <p>Entre com sua conta autorizada para acessar os módulos.</p>
        <form onSubmit={signIn}>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {authError && <p role="alert">{authError}</p>}
          <button type="submit" disabled={signingIn}>
            {signingIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
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
          {authError && <span role="alert">{authError}</span>}
          <button className="user-chip" type="button" onClick={() => void signOut()}>
            Sair
          </button>
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
