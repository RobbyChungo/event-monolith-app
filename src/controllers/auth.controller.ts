import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmail } from "../services/email.service";

const prisma = new PrismaClient();

// ✅ Signup Handler
export const signupHandler = async (ctx) => {
  const { email, password, name, role } = await ctx.request.json();

  if (!email || !password) {
    ctx.set.status = 400;
    return { error: "Email and password are required." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    ctx.set.status = 409;
    return { error: "Email already registered." };
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: role || "ATTENDEE", // ✅ Defaults to ATTENDEE
    },
  });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  await sendEmail(
    user.email,
    "Verify Your Account",
    `<p>Hello ${name},</p>
     <p>Click below to verify your account:</p>
     <a href="http://localhost:3000/auth/verify?token=${token}">Verify Account</a>`
  );

  ctx.set.status = 201;
  return { message: "Verification email sent." };
};

// ✅ Verify Email
export const verifyEmailHandler = async (ctx) => {
  const url = new URL(ctx.request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    ctx.set.status = 400;
    return { error: "Verification token is required." };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { verified: true },
    });

    ctx.set.status = 200;
    return { message: "Email verified successfully." };
  } catch {
    ctx.set.status = 400;
    return { error: "Invalid or expired verification token." };
  }
};

// ✅ Login Handler
export const loginHandler = async (ctx) => {
  const { email, password } = await ctx.request.json();

  if (!email || !password) {
    ctx.set.status = 400;
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    ctx.set.status = 404;
    return { error: "User not found." };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    ctx.set.status = 401;
    return { error: "Invalid credentials." };
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  ctx.set.status = 200;
  return { message: "Login successful.", token, role: user.role };
};
