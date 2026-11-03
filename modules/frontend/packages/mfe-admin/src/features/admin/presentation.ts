import type { GroupFormErrors, MemberFormErrors, UserFormErrors } from "./types";
import type { MembershipRole } from "@mfe/shared";

export function translateRole(role: MembershipRole) {
  return role === "admin" ? "Administrador" : "Membro";
}

export function translateStatus(status: string) {
  return status.toLowerCase() === "inactive" ? "Inativo" : "Ativo";
}

export function mapUserFormError(message: string): UserFormErrors {
  const normalized = message.toLowerCase();
  if (normalized.includes("e-mail") || normalized.includes("email")) return { email: message };
  if (normalized.includes("nome")) return { name: message };
  return { form: message };
}

export function mapGroupFormError(message: string): GroupFormErrors {
  const normalized = message.toLowerCase();
  if (normalized.includes("institui")) return { institutionId: message };
  if (normalized.includes("nome")) return { name: message };
  return { form: message };
}

export function mapMemberFormError(message: string): MemberFormErrors {
  const normalized = message.toLowerCase();
  if (normalized.includes("papel")) return { role: message };
  if (
    normalized.includes("pessoa") ||
    normalized.includes("usuário") ||
    normalized.includes("usuario") ||
    normalized.includes("membro")
  ) {
    return { userId: message };
  }
  return { form: message };
}
