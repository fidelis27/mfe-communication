import type { NextFunction, Request, Response } from "express";
import type { UsuarioRepository } from "../domain/usuario-repository";
import type { Usuario } from "../domain/tipos";

declare module "express-serve-static-core" {
  interface Request {
    usuario?: Usuario;
  }
}

/**
 * Ponte entre autenticação (req.identidade, "quem é") e autorização
 * (req.usuario, "o que pode"). Precisa rodar DEPOIS de `autenticacao()` e
 * ANTES de qualquer middleware de `autorizacao-middleware.ts`.
 *
 * Dois motivos de bloqueio aqui, e são diferentes de um 401 de sessão
 * inválida:
 * - Autenticado no SSO mas nunca cadastrado como Pessoa neste sistema.
 * - Cadastrado, porém com status "inativo" (ex: alguém que saiu do time
 *   de secretaria) — a pessoa continua existindo e autenticando no SSO da
 *   empresa, mas perde acesso aqui assim que um super-admin a inativa.
 */
export function carregarUsuarioAutorizacao(usuarios: UsuarioRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.identidade) return res.status(401).json({ error: "unauthorized" });

    const usuario = await usuarios.findById(req.identidade.userId);
    if (!usuario || usuario.status !== "ativo") {
      return res.status(403).json({ error: "forbidden" });
    }

    req.usuario = usuario;
    next();
  };
}
