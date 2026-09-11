import type { NextFunction, Request, Response } from "express";

export interface Identity {
  userId: string;
}

declare module "express-serve-static-core" {
  interface Request {
    identity?: Identity;
  }
}

export function authentication(validateSession: (req: Request) => Promise<Identity | null>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identity = await validateSession(req);
    if (!identity) return res.status(401).json({ error: "unauthorized" });

    req.identity = identity;
    next();
  };
}
