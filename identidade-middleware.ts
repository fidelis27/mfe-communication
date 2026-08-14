import type { NextFunction, Request, Response } from "express";

/**
 * Resultado de AUTENTICAÇÃO (quem é), não de autorização (o que pode).
 * Só o id estável emitido pelo SSO/IdP — nome, e-mail "de exibição",
 * status e superAdmin são dados NOSSOS, resolvidos depois por
 * carregar-usuario-middleware a partir do cadastro de Pessoa.
 */
export interface Identidade {
  userId: string;
}

declare module "express-serve-static-core" {
  interface Request {
    identidade?: Identidade;
  }
}

/**
 * Este middleware é deliberadamente um placeholder fino: `validarSessao`
 * deve ser a lib de sessão/OIDC oficial da organização (equivalente ao
 * `auth-protocol-node`/`@platsec-security/identity` no mundo Meli) — nunca
 * parsing de token feito na mão aqui dentro. A identidade nunca é lida de
 * `req.headers`/`req.query` diretamente nesta função: isso seria CWE-1390
 * (Missing Authentication) — o cliente poderia simplesmente setar esses
 * valores. `validarSessao` é quem sabe validar assinatura/expiração do
 * cookie ou token real.
 */
export function autenticacao(
  validarSessao: (req: Request) => Promise<Identidade | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identidade = await validarSessao(req);
    if (!identidade) return res.status(401).json({ error: "unauthorized" });

    req.identidade = identidade;
    next();
  };
}
