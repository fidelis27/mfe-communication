import type {
  GrupoId,
  InstituicaoId,
  MembroGrupo,
  PapelGrupo,
  Usuario,
  UsuarioId,
} from "./tipos";

/**
 * Port (Dependency Inversion): a policy não sabe se isso vem de Postgres,
 * de um cache, ou de um array em memória num teste — só pede o dado.
 */
export interface MembroGrupoRepository {
  findByUsuarioAndInstituicao(
    usuarioId: UsuarioId,
    instituicaoId: InstituicaoId
  ): Promise<MembroGrupo[]>;

  findByUsuarioAndGrupo(
    usuarioId: UsuarioId,
    grupoId: GrupoId
  ): Promise<MembroGrupo | null>;
}

/**
 * Regra de autorização (ADR-4 da spec técnica): esta é a ÚNICA fonte de
 * verdade sobre quem pode fazer o quê. Nenhum adapter (HTTP, frontend,
 * fila) reimplementa esta lógica — todos chamam esta classe.
 */
export class AutorizacaoPolicy {
  constructor(private readonly membros: MembroGrupoRepository) {}

  async podeEditarInstituicao(
    usuario: Usuario,
    instituicaoId: InstituicaoId
  ): Promise<boolean> {
    if (usuario.superAdmin) return true;
    const papel = await this.papelNaInstituicao(usuario.id, instituicaoId);
    return papel === "admin";
  }

  async podeLerInstituicao(
    usuario: Usuario,
    instituicaoId: InstituicaoId
  ): Promise<boolean> {
    if (usuario.superAdmin) return true;
    const papel = await this.papelNaInstituicao(usuario.id, instituicaoId);
    return papel !== null;
  }

  /** Só super-admin cria Grupo novo — regra 4.6 da spec funcional. */
  podeCriarGrupo(usuario: Usuario): boolean {
    return usuario.superAdmin;
  }

  /** Cadastro de Pessoa (CRM interno) e mudança de status/superAdmin são
   * operações sensíveis o bastante para ficarem restritas a super-admin —
   * não é a mesma permissão de "admin de Grupo". */
  podeGerenciarPessoas(usuario: Usuario): boolean {
    return usuario.superAdmin;
  }

  /** Admin do próprio Grupo, ou super-admin, gerencia membros daquele Grupo. */
  async podeGerenciarGrupo(
    usuario: Usuario,
    grupoId: GrupoId
  ): Promise<boolean> {
    if (usuario.superAdmin) return true;
    const membership = await this.membros.findByUsuarioAndGrupo(
      usuario.id,
      grupoId
    );
    return membership?.papel === "admin";
  }

  private async papelNaInstituicao(
    usuarioId: UsuarioId,
    instituicaoId: InstituicaoId
  ): Promise<PapelGrupo | null> {
    const memberships = await this.membros.findByUsuarioAndInstituicao(
      usuarioId,
      instituicaoId
    );
    // Se o usuário está em mais de um Grupo da mesma Instituição com papéis
    // diferentes, admin prevalece — é o caso menos restritivo, mas deliberado:
    // ter admin em qualquer Grupo daquela Instituição já concede escrita.
    if (memberships.some((m) => m.papel === "admin")) return "admin";
    if (memberships.length > 0) return "membro";
    return null;
  }
}
