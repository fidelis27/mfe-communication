import { default as React, FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { type EventPayloadMap, useDispatch, useDomainEvents, useListen } from "@mfe/shared";
import { getUnpublishedEvents } from "./features/domain-events/publishedEvents";
import { useHostAuth } from "./features/auth/hooks/useHostAuth";
import { moduleFromPath, moduleLabel } from "./features/navigation/modules";
import { ModuleNavigation } from "./features/navigation/components/ModuleNavigation";
import { RemoteBoundary } from "./features/remotes/components/RemoteBoundary";
import { RemoteContent } from "./features/remotes/components/RemoteContent";
import styles from "./App.module.css";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

type HostDomainEvent = {
  [K in keyof EventPayloadMap]: { type: K; payload: EventPayloadMap[K]; eventId: string };
}[keyof EventPayloadMap];

function HostApplication() {
  const [activeModule, setActiveModule] = useState(() =>
    moduleFromPath(typeof window === "undefined" ? "/estudantes" : window.location.pathname),
  );
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const {
    configured,
    authReady,
    authenticated,
    authError,
    signingIn,
    signIn: authenticate,
    signOut: endSession,
  } = useHostAuth(supabaseUrl, supabaseAnonKey);
  const dispatchDomain = useDispatch("domain");
  const dispatchHost = useDispatch("host");
  const { events: domainEvents, connection: domainConnection } = useDomainEvents(apiUrl);
  const publishedEventIds = useRef(new Set<string>());
  const mainRef = useRef<HTMLElement>(null);
  const navigationToggleRef = useRef<HTMLButtonElement>(null);
  const firstNavigationLinkRef = useRef<HTMLAnchorElement>(null);
  const accountToggleRef = useRef<HTMLButtonElement>(null);
  const accountWasOpen = useRef(false);
  const navigationWasOpen = useRef(false);

  useEffect(() => {
    (globalThis as typeof globalThis & { __mfeHostReady?: boolean }).__mfeHostReady = true;
    dispatchHost("host:ready", { ready: true });
    return () => {
      Reflect.deleteProperty(globalThis, "__mfeHostReady");
      dispatchHost("host:ready", { ready: false });
    };
  }, [dispatchHost]);

  useEffect(() => {
    dispatchDomain("domain:connection", domainConnection);
  }, [dispatchDomain, domainConnection]);

  useEffect(() => {
    for (const event of getUnpublishedEvents(
      domainEvents as HostDomainEvent[],
      publishedEventIds.current,
    )) {
      dispatchDomain("domain:event", event);
      dispatchDomain(event.type, event.payload);
    }
  }, [dispatchDomain, domainEvents]);

  useListen("mfe_student", "evt:navigate", ({ path }) => {
    if (path) navigateToPath(path);
  });

  useListen("mfe_activity", "evt:navigate", ({ path }) => {
    if (path) navigateToPath(path);
  });

  useListen("mfe_dashboard", "evt:navigate", ({ path }) => {
    if (path) navigateToPath(path);
  });

  useEffect(() => {
    const handlePopState = () => {
      setActiveModule(moduleFromPath(window.location.pathname));
      navigationWasOpen.current = false;
      accountWasOpen.current = false;
      setNavigationOpen(false);
      setAccountMenuOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    main.scrollTop = 0;

    const focusHeading = () => {
      const heading = main.querySelector("h1");
      if (!heading) return false;

      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
      return true;
    };

    if (focusHeading()) return;

    const observer = new MutationObserver(() => {
      if (focusHeading()) observer.disconnect();
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [activeModule, authenticated]);

  useEffect(() => {
    const target = navigationOpen
      ? firstNavigationLinkRef.current
      : navigationWasOpen.current
        ? navigationToggleRef.current
        : null;
    navigationWasOpen.current = navigationOpen;
    if (!target) return;

    const focusTimer = window.setTimeout(() => target.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [navigationOpen]);

  useEffect(() => {
    if (!accountMenuOpen && accountWasOpen.current) {
      accountToggleRef.current?.focus();
    }
    accountWasOpen.current = accountMenuOpen;
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!navigationOpen && !accountMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNavigationOpen(false);
      setAccountMenuOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [accountMenuOpen, navigationOpen]);

  function navigateToPath(path: string) {
    window.history.pushState({}, "", path);
    setActiveModule(moduleFromPath(path));
    navigationWasOpen.current = false;
    accountWasOpen.current = false;
    setNavigationOpen(false);
    setAccountMenuOpen(false);
  }

  function handleNavigationClick(
    event: MouseEvent<HTMLAnchorElement>,
    moduleId: string,
    path: string,
  ) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (window.location.pathname === path && activeModule === moduleId) {
      setNavigationOpen(false);
      return;
    }
    navigateToPath(path);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await authenticate(email, password)) setPassword("");
  }

  async function signOut() {
    accountWasOpen.current = false;
    setAccountMenuOpen(false);
    await endSession();
  }

  if (!authReady) {
    return (
      <main className="remote-state" aria-live="polite">
        <p className="eyebrow">Secretaria escolar</p>
        <h1>Verificando sessão</h1>
      </main>
    );
  }

  if (!configured) {
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
      <ModuleNavigation
        activeModule={activeModule}
        navigationOpen={navigationOpen}
        onNavigate={handleNavigationClick}
        onCloseNavigation={() => setNavigationOpen(false)}
        firstLinkRef={firstNavigationLinkRef}
      />
      <main className="host-main" id="module-content" ref={mainRef} tabIndex={-1}>
        <header className="topbar">
          <div className="topbar-start">
            <button
              aria-controls="module-navigation"
              aria-expanded={navigationOpen}
              className="mobile-nav-toggle"
              onClick={() => setNavigationOpen((open) => !open)}
              ref={navigationToggleRef}
              type="button"
            >
              {navigationOpen ? "Fechar menu" : "Menu"}
            </button>
            <nav aria-label="Breadcrumb" className="breadcrumb">
              <ol>
                <li>
                  <a
                    href="/dashboard"
                    onClick={(event) => handleNavigationClick(event, "dashboard", "/dashboard")}
                  >
                    Início
                  </a>
                </li>
                <li aria-current="page">{moduleLabel(activeModule)}</li>
              </ol>
            </nav>
          </div>
          <div className="topbar-end">
            {authError && <span role="alert">{authError}</span>}
            <div className="account-menu">
              <button
                aria-controls="account-actions"
                aria-expanded={accountMenuOpen}
                className="user-chip"
                onClick={() => setAccountMenuOpen((open) => !open)}
                ref={accountToggleRef}
                type="button"
              >
                Conta
              </button>
              <div
                aria-label="Ações da conta"
                className="account-popup"
                hidden={!accountMenuOpen}
                id="account-actions"
                role="group"
              >
                <button onClick={() => void signOut()} type="button">
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>
        <RemoteBoundary key={activeModule} moduleName={moduleLabel(activeModule)}>
          <RemoteContent activeModule={activeModule} moduleLabel={moduleLabel} />
        </RemoteBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <div className={styles.appRoot}>
      <HostApplication />
    </div>
  );
}
