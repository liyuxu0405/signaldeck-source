import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { readSession } from "./store";

export const SESSION_COOKIE = "sd_session";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validEmail(email: string) {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email) && email.length <= 120;
}

export function validDomainVerificationToken(token: string) {
  return /^[a-f0-9]{64}$/.test(token);
}

export function randomDomainVerificationToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function issueDomainVerificationToken(email: string, domain: string, secret?: string) {
  if (secret && secret.length >= 32) return domainVerificationToken(email, domain, secret);
  return randomDomainVerificationToken();
}

export async function domainVerificationToken(email: string, domain: string, secret: string) {
  if (secret.length < 32) throw new Error("DOMAIN_VERIFICATION_SECRET 至少需要 32 个字符");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${normalizeEmail(email)}\n${domain.toLowerCase()}`),
  );
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password: string, salt: Uint8Array) {
  const material = new Uint8Array(salt);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: material, iterations: 80_000 }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt);
  return `${Buffer.from(salt).toString("base64url")}.${Buffer.from(hash).toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltB64, hashB64] = stored.split(".");
  if (!saltB64 || !hashB64) return false;
  const salt = new Uint8Array(Buffer.from(saltB64, "base64url"));
  const expected = Buffer.from(hashB64, "base64url");
  const actual = Buffer.from(await pbkdf2(password, salt));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function newSessionId() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(18))).toString("base64url");
}

export function sessionCookie(value: string) {
  return {
    name: SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function emailFromRequest(request: NextRequest) {
  const id = request.cookies.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return readSession(id);
}
