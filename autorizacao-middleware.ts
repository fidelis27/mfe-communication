import type { NextFunction, Request, Response } from "express";
import type { AutorizacaoPolicy } from "../domain/autorizacao-policy";
import type { InstituicaoId } from "../domain/tipos";
import "./carregar-usuario-middleware"; // declara req.usuario

/**
 * Estes middlewares assumem a cadeia:
 *   autenticacao() → carregarUsuarioAutorizacao() → require*Permission()
 * `req.usuario` já vem resolvido e ativo (status "ativo") quando chega
 * aqui — nunca lido de req.body/req.query/req.headers diretamente. Ver
 * identidade-middleware.ts e carregar-usuario-middleware.ts para a
 * resolução completa (CWE-1390 / CWE-639).
 */

/**
 * Protege rotas cuja Instituição já é conhecida diretamente pela URL
 * (ex: PUT /instituicoes/:instituicaoId).
 */
export function requireInstituicaoEditPermission(policy: AutorizacaoPolicy) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario;
    if (!usuario) return res.status(401).json({ error: "unauthorized" });

    const instituicaoId = req.params.instituicaoId as InstituicaoId;
    const autorizado = await policy.podeEditarInstituicao(usuario, instituicaoId);
    if (!autorizado) return res.status(403).json({ error: "forbidden" });

    next();
  };
}

/**
 * Protege rotas de Aluno. A Instituição do Aluno NUNCA é lida do
 * req.body/req.query (o client poderia mandar um instituicaoId diferente
 * do real e tentar editar/mover um aluno para fora do escopo do seu
 * grupo — CWE-639). Ela é resolvida a partir do registro persistido,
 * via a função injetada `loadAluno`.
 */
export function requireAlunoEditPermission(
  policy: AutorizacaoPolicy,
  loadAluno: (alunoId: string) => Promise<{ instituicaoId: InstituicaoId } | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario;
    if (!usuario) return res.status(401).json({ error: "unauthorized" });

    const aluno = await loadAluno(req.params.alunoId);
    if (!aluno) return res.status(404).json({ error: "not found" });

    const autorizado = await policy.podeEditarInstituicao(usuario, aluno.instituicaoId);
    if (!autorizado) return res.status(403).json({ error: "forbidden" });

    next();
  };
}

/**
 * Protege as rotas do próprio mfe-admin (gestão de Grupo) — recurso
 * privilegiado à parte, nunca reaproveita a checagem de Instituição.
 */
export function requireGrupoManagePermission(policy: AutorizacaoPolicy) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.usuario;
    if (!usuario) return res.status(401).json({ error: "unauthorized" });

    const grupoId = req.params.grupoId;
    const autorizado = await policy.podeGerenciarGrupo(usuario, grupoId);
    if (!autorizado) return res.status(403).json({ error: "forbidden" });

    next();
  };
}
