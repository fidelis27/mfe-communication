export type UsuarioId = string;
export type GrupoId = string;
export type InstituicaoId = string;

export type PapelGrupo = "admin" | "membro";
export type StatusPessoa = "ativo" | "inativo";

/**
 * Registro interno tipo CRM: `id` é a mesma identidade estável que vem do
 * SSO/IdP (ex: e-mail corporativo), mas nome/email/status/superAdmin são
 * dados que ESTE sistema é dono — o SSO não sabe disso, só autentica.
 * Uma Pessoa autenticada com sucesso no SSO mas sem registro aqui, ou com
 * status "inativo", não tem acesso a nada (ver carregar-usuario-middleware).
 */
export interface Usuario {
  id: UsuarioId;
  nome: string;
  email: string;
  status: StatusPessoa;
  superAdmin: boolean;
}

export interface Grupo {
  id: GrupoId;
  instituicaoId: InstituicaoId;
}

export interface MembroGrupo {
  usuarioId: UsuarioId;
  grupoId: GrupoId;
  papel: PapelGrupo;
}
