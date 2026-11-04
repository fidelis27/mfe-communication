import React, { lazy, Suspense } from "react";
import { loadRemote } from "../../../remoteLoadingMetrics";
import type { ActiveModule } from "../../navigation/modules";
import { RemoteSkeleton } from "./RemoteSkeleton";

const StudentApp = lazy(() => loadRemote("student", () => import("mfe_student/App")));
const ActivityApp = lazy(() => loadRemote("activity", () => import("mfe_activity/App")));
const InstitutionApp = lazy(() => loadRemote("institution", () => import("mfe_institution/App")));
const DashboardApp = lazy(() => loadRemote("dashboard", () => import("mfe_dashboard/App")));
const AdminApp = lazy(() => loadRemote("admin", () => import("mfe_admin/App")));

export function RemoteContent({
  activeModule,
  moduleLabel,
}: {
  activeModule: ActiveModule;
  moduleLabel: (moduleId: string) => string;
}) {
  switch (activeModule) {
    case "student":
      return (
        <Suspense fallback={<RemoteSkeleton label="Carregando módulo de estudantes" />}>
          <StudentApp />
        </Suspense>
      );
    case "activity":
      return (
        <Suspense fallback={<RemoteSkeleton label="Carregando atividade" />}>
          <ActivityApp />
        </Suspense>
      );
    case "institution":
      return (
        <Suspense fallback={<RemoteSkeleton label="Carregando módulo de instituições" />}>
          <InstitutionApp />
        </Suspense>
      );
    case "dashboard":
      return (
        <Suspense fallback={<RemoteSkeleton label="Carregando dashboard" />}>
          <DashboardApp />
        </Suspense>
      );
    case "admin":
      return (
        <Suspense fallback={<RemoteSkeleton label="Carregando administração" />}>
          <AdminApp />
        </Suspense>
      );
    default:
      return (
        <section className="remote-state">
          <p className="eyebrow">Módulo em preparação</p>
          <h1>{moduleLabel(activeModule)}</h1>
          <p>A estrutura está pronta para receber o próximo remote.</p>
        </section>
      );
  }
}
