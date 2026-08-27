import jwt from "jsonwebtoken";
import type { AppUser } from "../types.js";

export type AuthUser = Pick<AppUser, "id" | "email" | "name" | "role">;

const secret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || "clarifi-dev-secret";

export const signUser = (user: AuthUser) => jwt.sign(user, secret(), { expiresIn: "8h" });

export const verifyUser = (token: string) => jwt.verify(token, secret()) as AuthUser;
