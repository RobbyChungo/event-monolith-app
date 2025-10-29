import jwt from "jsonwebtoken";

export const requireRole = (roles: string[]) => {
  return async (ctx, next) => {
    const authHeader = ctx.request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.set.status = 401;
      return { error: "Unauthorized. Token missing." };
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!roles.includes(decoded.role)) {
        ctx.set.status = 403;
        return { error: "Forbidden. Insufficient permissions." };
      }

      ctx.user = decoded;
      await next();
    } catch {
      ctx.set.status = 401;
      return { error: "Invalid or expired token." };
    }
  };
};
