import type { StatusPessoa, Usuario, UsuarioId } from "./tipos";

export interface DadosNovaPessoa {
  /** Mesma identidade estável emitida pelo SSO/IdP (ex: e-mail corporativo)
   * — não é gerada por nós, é a chave de correspondência entre "quem
   * autenticou" e "quem está cadastrado aqui". */
  id: UsuarioId;
  nome: string;
  email: string;
}

/**
 * Porta para o cadastro de Pessoas (CRM interno) e para os dados de
 * autorização que este sistema é dono (superAdmin) — distintos da
 * identidade que vem do provedor de SSO/IdP. O SSO só sabe "quem é";
 * "quem está cadastrado e o que pode" é dado nosso, gerido via mfe-admin.
 */
export interface UsuarioRepository {
  findById(id: UsuarioId): Promise<Usuario | null>;
  findByEmail(email: string): Promise<Usuario | null>;
  create(dados: DadosNovaPessoa): Promise<Usuario>;
  updateStatus(id: UsuarioId, status: StatusPessoa): Promise<void>;
  promoverSuperAdmin(id: UsuarioId, superAdmin: boolean): Promise<void>;
}
