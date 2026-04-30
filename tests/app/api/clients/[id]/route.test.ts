import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/src/lib/db", () => ({
  prisma: {
    client: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    },
  },
}));

import { DELETE } from "@/src/app/api/clients/[id]/route";

const buildRequest = (url: string) => new NextRequest(new URL(url));
const buildParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("DELETE /api/clients/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hard未指定: isActiveをfalseにする（無効化）", async () => {
    mockUpdate.mockResolvedValue({ id: "c1", isActive: false });

    const res = await DELETE(buildRequest("http://localhost/api/clients/c1"), buildParams("c1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("クライアントを無効化しました");
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { isActive: false },
    });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("hard=true かつ サイト0件: 物理削除する", async () => {
    mockFindUnique.mockResolvedValue({ id: "c1", _count: { sites: 0 } });
    mockDelete.mockResolvedValue({ id: "c1" });

    const res = await DELETE(
      buildRequest("http://localhost/api/clients/c1?hard=true"),
      buildParams("c1")
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe("クライアントを削除しました");
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("hard=true かつ サイトあり: 400を返す", async () => {
    mockFindUnique.mockResolvedValue({ id: "c1", _count: { sites: 2 } });

    const res = await DELETE(
      buildRequest("http://localhost/api/clients/c1?hard=true"),
      buildParams("c1")
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("サイトが登録されているクライアントは削除できません");
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("hard=true かつ クライアント存在しない: 404を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await DELETE(
      buildRequest("http://localhost/api/clients/missing?hard=true"),
      buildParams("missing")
    );
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("クライアントが見つかりません");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("hard=false（明示的に偽）は無効化として扱う", async () => {
    mockUpdate.mockResolvedValue({ id: "c1", isActive: false });

    const res = await DELETE(
      buildRequest("http://localhost/api/clients/c1?hard=false"),
      buildParams("c1")
    );

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
