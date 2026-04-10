import { describe, it, expect, vi, beforeEach } from "vitest";
import { getOrCreateActiveConversation } from "@/lib/supabase/data";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Build a mock Supabase client whose `from("conversations")` chain returns
 * whatever query result we set, and records what was inserted.
 */
function buildMockClient(
  queryResult: { data: unknown; error: unknown },
  insertResult: { data: unknown; error: unknown }
) {
  const insertCalls: unknown[] = [];

  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(queryResult),
  };

  const insertSingle = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(insertResult),
  };

  const mock = {
    from: vi.fn((_table: string) => ({
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn((row: unknown) => {
        insertCalls.push(row);
        return insertSingle;
      }),
    })),
  } as unknown as SupabaseClient;

  return { mock, insertCalls };
}

describe("getOrCreateActiveConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an existing active conversation when one is found", async () => {
    const { mock, insertCalls } = buildMockClient(
      { data: [{ id: "convo-123" }], error: null },
      { data: null, error: null }
    );

    const id = await getOrCreateActiveConversation(mock, "user-1", "text");

    expect(id).toBe("convo-123");
    expect(insertCalls).toEqual([]);
  });

  it("creates a new conversation when no active one exists", async () => {
    const { mock, insertCalls } = buildMockClient(
      { data: [], error: null },
      { data: { id: "convo-new" }, error: null }
    );

    const id = await getOrCreateActiveConversation(mock, "user-1", "text");

    expect(id).toBe("convo-new");
    expect(insertCalls).toEqual([{ user_id: "user-1", mode: "text" }]);
  });

  it("returns null and does not create when the lookup errors out", async () => {
    const { mock, insertCalls } = buildMockClient(
      { data: null, error: { message: "boom" } },
      { data: null, error: null }
    );

    const id = await getOrCreateActiveConversation(mock, "user-1", "text");

    expect(id).toBeNull();
    expect(insertCalls).toEqual([]);
  });

  it("uses the mode parameter to scope the lookup", async () => {
    const { mock } = buildMockClient(
      { data: [{ id: "convo-voice" }], error: null },
      { data: null, error: null }
    );

    const id = await getOrCreateActiveConversation(mock, "user-2", "voice");

    expect(id).toBe("convo-voice");
  });
});
