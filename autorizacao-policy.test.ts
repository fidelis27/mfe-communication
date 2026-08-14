import { describe, expect, it } from "vitest";
import { AutorizacaoPolicy, type MembroGrupoRepository } from "./autorizacao-policy";
import type { MembroGrupo, Usuario } from "./tipos";

function criarRepoFake(membros: MembroGrupo[]): MembroGrupoRepository {
  return {
    async findByUsuarioAndInstituicao(usuarioId, instituicaoId) {
      // grupo->instituicao normalmente é um JOIN no banco real; aqui o fixture
      // já vem achatado (grupoId "g-inst-X" convencionado para o teste).
      return membros.filter(
        (m) => m.usuarioId === usuarioId && m.grupoId.includes(instituicaoId)
      );
    },
    async findByUsuarioAndGrupo(usuarioId, grupoId) {
      return (
        membros.find((m) => m.usuarioId === usuarioId && m.grupoId === grupoId) ??
        null
      );
    },
  };
}

const superAdmin: Usuario = { id: "u-super", superAdmin: true };
const admin: Usuario = { id: "u-admin", superAdmin: false };
const membroLeitura: Usuario = { id: "u-membro", superAdmin: false };
const semVinculo: Usuario = { id: "u-fora", superAdmin: false };

const membros: MembroGrupo[] = [
  { usuarioId: "u-admin", grupoId: "g-inst-A", papel: "admin" },
  { usuarioId: "u-membro", grupoId: "g-inst-A", papel: "membro" },
];

describe("AutorizacaoPolicy", () => {
  const policy = new AutorizacaoPolicy(criarRepoFake(membros));

  it("super-admin edita qualquer instituição, mesmo sem vínculo de grupo", async () => {
    await expect(policy.podeEditarInstituicao(superAdmin, "inst-B")).resolves.toBe(true);
  });

  it("admin do grupo edita a instituição vinculada ao seu grupo", async () => {
    await expect(policy.podeEditarInstituicao(admin, "inst-A")).resolves.toBe(true);
  });

  it("admin do grupo NÃO edita uma instituição diferente da sua (sem escalada cross-instituição)", async () => {
    await expect(policy.podeEditarInstituicao(admin, "inst-B")).resolves.toBe(false);
  });

  it("membro (leitura) lê mas não edita a instituição do seu grupo", async () => {
    await expect(policy.podeLerInstituicao(membroLeitura, "inst-A")).resolves.toBe(true);
    await expect(policy.podeEditarInstituicao(membroLeitura, "inst-A")).resolves.toBe(false);
  });

  it("usuário sem nenhum vínculo não lê nem edita", async () => {
    await expect(policy.podeLerInstituicao(semVinculo, "inst-A")).resolves.toBe(false);
    await expect(policy.podeEditarInstituicao(semVinculo, "inst-A")).resolves.toBe(false);
  });

  it("só super-admin pode criar Grupo novo", () => {
    expect(policy.podeCriarGrupo(superAdmin)).toBe(true);
    expect(policy.podeCriarGrupo(admin)).toBe(false);
  });

  it("admin do grupo gerencia membros do próprio grupo, não de outro", async () => {
    await expect(policy.podeGerenciarGrupo(admin, "g-inst-A")).resolves.toBe(true);
    await expect(policy.podeGerenciarGrupo(admin, "g-inst-B")).resolves.toBe(false);
  });
});
