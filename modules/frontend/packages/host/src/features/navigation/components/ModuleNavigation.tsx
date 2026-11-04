import React, { type MouseEvent, type RefObject } from "react";
import { modules, type ActiveModule } from "../modules";

export function ModuleNavigation({
  activeModule,
  navigationOpen,
  onNavigate,
  onCloseNavigation,
  firstLinkRef,
}: {
  activeModule: ActiveModule;
  navigationOpen: boolean;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, moduleId: string, path: string) => void;
  onCloseNavigation: () => void;
  firstLinkRef: RefObject<HTMLAnchorElement | null>;
}) {
  return (
    <>
      {navigationOpen && (
        <button
          aria-label="Fechar navegação"
          className="navigation-backdrop"
          onClick={onCloseNavigation}
          type="button"
        />
      )}
      <aside
        aria-label="Navegação principal"
        className={navigationOpen ? "host-sidebar navigation-open" : "host-sidebar"}
        id="module-navigation"
      >
        <div className="brand">
          <span>SE</span>
          <div>
            Secretaria
            <br />
            <b>Escolar</b>
          </div>
        </div>
        <p className="sidebar-label">Módulos</p>
        <div className="host-nav-wrap">
          <nav aria-label="Módulos da secretaria">
            {modules.map((module, index) => (
              <a
                className={activeModule === module.id ? "nav-item active" : "nav-item"}
                key={module.id}
                href={module.path}
                onClick={(event) => onNavigate(event, module.id, module.path)}
                aria-current={activeModule === module.id ? "page" : undefined}
                ref={index === 0 ? firstLinkRef : undefined}
              >
                <span className="nav-copy">
                  <b>{module.label}</b>
                  <small>{module.detail}</small>
                </span>
              </a>
            ))}
          </nav>
        </div>
        {import.meta.env.DEV && (
          <div className="sidebar-footer">
            <span className="online-dot" /> Ambiente local
            <br />
            <small>API + WebSocket</small>
          </div>
        )}
      </aside>
    </>
  );
}
