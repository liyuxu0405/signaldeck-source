import { describe, expect, it } from "vitest";
import { consumeRateLimit, type KvLike } from "./store";

class FakeStore implements KvLike {
  readonly values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async put(key: string, value: string) { this.values.set(key, value); }
  async delete(key: string) { this.values.delete(key); }
}

describe("持久化限流", () => {
  it("在固定窗口内达到上限后拒绝请求", async () => {
    const store = new FakeStore();
    const now = Date.parse("2026-09-14T10:00:00.000Z");
    expect(await consumeRateLimit("login", "203.0.113.10", 2, 60, store, now)).toBe(true);
    expect(await consumeRateLimit("login", "203.0.113.10", 2, 60, store, now)).toBe(true);
    expect(await consumeRateLimit("login", "203.0.113.10", 2, 60, store, now)).toBe(false);
  });

  it("不同窗口重新放行", async () => {
    const store = new FakeStore();
    const now = Date.parse("2026-09-14T10:00:00.000Z");
    expect(await consumeRateLimit("login", "same-ip", 1, 60, store, now)).toBe(true);
    expect(await consumeRateLimit("login", "same-ip", 1, 60, store, now + 61_000)).toBe(true);
  });
});
