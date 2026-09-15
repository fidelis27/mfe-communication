import type { NextFunction, Request, Response } from "express";
import type { AuthorizationPolicy } from "../domain/authorization-policy";
import type { InstitutionId } from "../domain/types";
import "./load-user-middleware"; // declares req.user

export function requireInstitutionEditPermission(policy: AuthorizationPolicy) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const institutionId = req.params.institutionId as InstitutionId;
    const allowed = await policy.canEditInstitution(user, institutionId);
    if (!allowed) return res.status(403).json({ error: "forbidden" });

    next();
  };
}

export function requireStudentEditPermission(
  policy: AuthorizationPolicy,
  loadStudent: (studentId: string) => Promise<{ institutionId: InstitutionId } | null>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const student = await loadStudent(req.params.studentId);
    if (!student) return res.status(404).json({ error: "not found" });

    const allowed = await policy.canEditInstitution(user, student.institutionId);
    if (!allowed) return res.status(403).json({ error: "forbidden" });

    next();
  };
}

export function requireGroupManagePermission(policy: AuthorizationPolicy) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "unauthorized" });

    const groupId = req.params.groupId;
    const allowed = await policy.canManageGroup(user, groupId);
    if (!allowed) return res.status(403).json({ error: "forbidden" });

    next();
  };
}
