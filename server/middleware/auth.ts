import type { NextFunction, Request, Response } from "express";
import { verifyUser, type AuthUser } from "../auth/jwt.js";
import { getAppStore } from "../repositories/appStore.js";
import type { AppUser, UserRole } from "../types.js";

const tokenFrom = (req: Request) =>
  req.cookies?.["clarifi.jwt"] || req.header("authorization")?.replace(/^Bearer\s+/i, "");

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  const token = tokenFrom(req);
  if (!token) return next();
  try {
    const payload = verifyUser(token);
    const user = await getAppStore().getUserById(payload.id);
    req.user = user || undefined;
  } catch {
    req.user = undefined;
  }
  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  next();
};

export const requireRole = (role: UserRole) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) return res.status(401).json({ error: "Authentication required" });
  if (req.user.role !== role) return res.status(403).json({ error: `${role} access required` });
  next();
};

export const publicUser = (user: AppUser | AuthUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role
});

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}
