export const modules = [
  { id: "student", path: "/estudantes", label: "Estudantes", detail: "Cadastros e vínculos" },
  { id: "institution", path: "/instituicoes", label: "Instituições", detail: "Unidades e escopos" },
  { id: "activity", path: "/atividade", label: "Atividade", detail: "Eventos do sistema" },
  { id: "dashboard", path: "/dashboard", label: "Dashboard", detail: "Indicadores" },
  { id: "admin", path: "/admin", label: "Admin", detail: "Pessoas e grupos" },
] as const;

export type ModuleId = (typeof modules)[number]["id"];
export type ActiveModule = ModuleId | "preparing";

export function moduleFromPath(pathname: string): ActiveModule {
  return modules.find((module) => module.path === pathname)?.id ?? "preparing";
}

export function moduleLabel(moduleId: string) {
  return modules.find((module) => module.id === moduleId)?.label ?? "Módulo em preparação";
}
