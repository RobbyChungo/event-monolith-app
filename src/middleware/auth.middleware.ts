// src/middleware/auth.middleware.ts
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "../utils/jwt.utils";

const prisma = new PrismaClient();

export async function requireAuth(ctx: any, next: any) {
  const auth = ctx.request.headers["authorization"] || ctx.request.headers["Authorization"];
  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return ctx.status(401).body({ error: "Missing Authorization header" });
  }

  const token = auth.split(" ")[1];
  try {
    const payload = verifyToken<{ userId: string; role?: string }>(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return ctx.status(401).body({ error: "User not found" });

    // attach user to ctx for downstream handlers
    ctx.user = { id: user.id, email: user.email, role: user.role };
    return next();
  } catch (err: any) {
    return ctx.status(401).body({ error: "Invalid token", details: err.message });
  }
}

export function requireRole(allowedRoles: string[]) {
  return async (ctx: any, next: any) => {
    // assume requireAuth ran before; if not, run it
    if (!ctx.user) {
      const res = await requireAuth(ctx, async () => {});
      if (res) return res; // returns response if auth failed
    }

    if (!allowedRoles.includes(ctx.user.role)) {
      return ctx.status(403).body({ error: "Insufficient role" });
    }

    return next();
  };
}
