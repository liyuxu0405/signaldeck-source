import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, validEmail, verifyPassword } from "./auth";

describe("站长账号哈希", () => {
  it("规范化邮箱并校验格式", () => {
    expect(normalizeEmail("  Foo@Example.COM ")).toBe("foo@example.com");
    expect(validEmail("foo@example.com")).toBe(true);
    expect(validEmail("not-an-email")).toBe(false);
  });

  it("密码哈希可验证且错误密码失败", async () => {
    const stored = await hashPassword("correct-horse");
    expect(await verifyPassword("correct-horse", stored)).toBe(true);
    expect(await verifyPassword("wrong-password", stored)).toBe(false);
  });
});
