import type { NextFunction, Request, Response } from "express";
import type { UserRepository } from "../domain/user-repository";
import type { User } from "../domain/types";

declare module "express-serve-static-core" {
  interface Request {
    user?: User;
  }
}

export function loadUserForAuthorization(users: UserRepository) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.identity) return res.status(401).json({ error: "unauthorized" });

    const user = await users.findById(req.identity.userId);
    if (!user || user.status !== "active") {
      return res.status(403).json({ error: "forbidden" });
    }

    req.user = user;
    next();
  };
}
