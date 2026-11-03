import { describe, expect, it } from "vitest";
import {
  mapGroupFormError,
  mapMemberFormError,
  mapUserFormError,
  translateRole,
  translateStatus,
} from "./presentation";

describe("admin presentation helpers", () => {
  it("maps user and group errors to their relevant fields", () => {
    expect(mapUserFormError("E-mail inválido")).toEqual({ email: "E-mail inválido" });
    expect(mapUserFormError("Nome obrigatório")).toEqual({ name: "Nome obrigatório" });
    expect(mapGroupFormError("Instituição inválida")).toEqual({
      institutionId: "Instituição inválida",
    });
    expect(mapGroupFormError("Erro inesperado")).toEqual({ form: "Erro inesperado" });
  });

  it("maps membership errors and translates roles and statuses", () => {
    expect(mapMemberFormError("Papel inválido")).toEqual({ role: "Papel inválido" });
    expect(mapMemberFormError("Pessoa não encontrada")).toEqual({
      userId: "Pessoa não encontrada",
    });
    expect(mapMemberFormError("Erro inesperado")).toEqual({ form: "Erro inesperado" });
    expect(translateRole("admin")).toBe("Administrador");
    expect(translateRole("member")).toBe("Membro");
    expect(translateStatus("inactive")).toBe("Inativo");
    expect(translateStatus("active")).toBe("Ativo");
  });
});
