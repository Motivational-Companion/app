/**
 * Network mocks for E2E tests.
 *
 * We intercept external service calls at the Playwright level so tests are
 * deterministic and never hit production APIs. Each helper installs a set
 * of routes on a page and returns nothing (side effects only).
 */
import type { Page, Route } from "@playwright/test";

const SUPABASE_URL_PATTERN = /https:\/\/[a-z0-9-]+\.supabase\.co\//;

export type MockSupabaseOptions = {
  /** If set, /auth/v1/user and related endpoints return this user. */
  user?: { id: string; email: string } | null;
  /** If set, the profile subscription_status returned by queries. */
  subscriptionStatus?: "active" | "trialing" | "canceled" | "past_due" | null;
  /** If true, signInWithOtp returns success. Default true. */
  otpSendOk?: boolean;
  /** If true, verifyOtp returns success. Default true. */
  otpVerifyOk?: boolean;
  /** Custom error message returned when otpSendOk=false. */
  otpSendError?: string;
  /** Custom error message returned when otpVerifyOk=false. */
  otpVerifyError?: string;
};

/**
 * Install Supabase auth mocks on the given page. Intercepts:
 * - auth/v1/otp (signInWithOtp)
 * - auth/v1/verify (verifyOtp)
 * - auth/v1/user (getUser, used by useAuth)
 * - rest/v1/profiles (subscription_status lookup in middleware)
 */
export async function mockSupabase(page: Page, options: MockSupabaseOptions = {}) {
  const {
    user = null,
    subscriptionStatus = null,
    otpSendOk = true,
    otpVerifyOk = true,
    otpSendError = "Something went wrong",
    otpVerifyError = "Invalid code",
  } = options;

  await page.route(SUPABASE_URL_PATTERN, async (route: Route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();

    // signInWithOtp. Real API returns { data: {}, error: null } or an
    // error envelope. Supabase JS client wraps this — returning an empty
    // object would leave `data` undefined and break the client.
    if (path.endsWith("/auth/v1/otp") && method === "POST") {
      if (otpSendOk) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({ data: {}, error: null }),
        });
      }
      return route.fulfill({
        status: 400,
        body: JSON.stringify({ msg: otpSendError, error_code: "otp_error" }),
      });
    }

    // verifyOtp
    if (path.endsWith("/auth/v1/verify") && method === "POST") {
      if (otpVerifyOk && user) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: {
              id: user.id,
              email: user.email,
              aud: "authenticated",
              role: "authenticated",
            },
          }),
        });
      }
      return route.fulfill({
        status: 400,
        body: JSON.stringify({ msg: otpVerifyError, error_code: "otp_expired" }),
      });
    }

    // getUser
    if (path.endsWith("/auth/v1/user") && method === "GET") {
      if (user) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            aud: "authenticated",
            role: "authenticated",
          }),
        });
      }
      return route.fulfill({
        status: 401,
        body: JSON.stringify({ msg: "not authenticated" }),
      });
    }

    // profiles query (used by middleware subscription gate)
    if (path.includes("/rest/v1/profiles")) {
      if (user && subscriptionStatus) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([{ subscription_status: subscriptionStatus }]),
        });
      }
      return route.fulfill({
        status: 200,
        body: JSON.stringify([]),
      });
    }

    // Any other Supabase call: fall through to a 200 empty response
    return route.fulfill({
      status: 200,
      body: JSON.stringify({}),
    });
  });
}

/**
 * Mock the Stripe Checkout session creation endpoint.
 * Redirects the client to a mocked success page.
 */
export async function mockStripeCheckout(page: Page) {
  await page.route("**/api/stripe/checkout", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: `${new URL(page.url()).origin}/success?session_id=cs_test_mock_session`,
      }),
    });
  });
}

/**
 * Mock the Stripe session retrieval endpoint used by the success page.
 */
export async function mockStripeSession(
  page: Page,
  options: { email?: string; customerId?: string } = {}
) {
  const {
    email = "buyer@example.com",
    customerId = "cus_test_mock",
  } = options;

  await page.route("**/api/stripe/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        customer_id: customerId,
        customer_email: email,
        subscription_id: "sub_test_mock",
        payment_status: "paid",
      }),
    });
  });
}

/**
 * Mock the task workspace surface: tasks list, task detail load, task
 * mutations (description/title/due_date/subtasks/status), and the
 * conversation lookup/create + messages load that the chat surfaces use.
 *
 * Provides a mutable in-memory store so tests can verify both reads
 * and writes against the same shape without hitting Supabase.
 */
export type TaskFixture = {
  id: string;
  user_id: string;
  list_type: "issue" | "goal" | "task";
  title: string;
  status?: "active" | "completed";
  description?: string | null;
  due_date?: string | null;
  parent_task_id?: string | null;
  timeframe?: string | null;
};

export type TaskWorkspaceState = {
  tasks: TaskFixture[];
  conversations: Array<{
    id: string;
    user_id: string;
    task_id: string | null;
    mode: "text" | "voice";
    ended_at: string | null;
    started_at: string;
  }>;
  messages: Array<{
    id: string;
    conversation_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
  }>;
};

export async function mockTaskWorkspace(page: Page, state: TaskWorkspaceState) {
  const taskIdSeq = { n: 1000 };
  const convIdSeq = { n: 2000 };

  await page.route(/\/rest\/v1\/tasks(\?.*)?$/, async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "GET") {
      const userIdEq = url.searchParams.get("user_id");
      const statusEq = url.searchParams.get("status");
      const parentIs = url.searchParams.get("parent_task_id");
      const idEq = url.searchParams.get("id");
      let rows = state.tasks.slice();
      if (userIdEq) rows = rows.filter((r) => `eq.${r.user_id}` === userIdEq);
      if (statusEq) {
        rows = rows.filter(
          (r) => `eq.${r.status ?? "active"}` === statusEq
        );
      }
      if (parentIs) {
        const parentId = parentIs.replace(/^eq\./, "");
        rows = rows.filter((r) => r.parent_task_id === parentId);
      }
      if (idEq) {
        const id = idEq.replace(/^eq\./, "");
        rows = rows.filter((r) => r.id === id);
      }
      return route.fulfill({
        status: 200,
        body: JSON.stringify(
          rows.map((r) => ({
            id: r.id,
            user_id: r.user_id,
            list_type: r.list_type,
            title: r.title,
            timeframe: r.timeframe ?? null,
            status: r.status ?? "active",
            description: r.description ?? null,
            due_date: r.due_date ?? null,
            parent_task_id: r.parent_task_id ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            rank: 0,
          }))
        ),
      });
    }

    if (method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const incoming = Array.isArray(body) ? body : [body];
      const created = incoming.map((row) => {
        const id = `task-mock-${++taskIdSeq.n}`;
        const newTask: TaskFixture = {
          id,
          user_id: row.user_id,
          list_type: row.list_type,
          title: row.title,
          status: row.status ?? "active",
          description: row.description ?? null,
          due_date: row.due_date ?? null,
          parent_task_id: row.parent_task_id ?? null,
          timeframe: row.timeframe ?? null,
        };
        state.tasks.push(newTask);
        return newTask;
      });
      return route.fulfill({
        status: 201,
        body: JSON.stringify(created),
      });
    }

    if (method === "PATCH") {
      const idEq = url.searchParams.get("id");
      const id = idEq?.replace(/^eq\./, "") ?? "";
      const body = JSON.parse(route.request().postData() ?? "{}");
      const idx = state.tasks.findIndex((t) => t.id === id);
      if (idx !== -1) state.tasks[idx] = { ...state.tasks[idx], ...body };
      return route.fulfill({ status: 204, body: "" });
    }

    if (method === "DELETE") {
      const idEq = url.searchParams.get("id");
      const id = idEq?.replace(/^eq\./, "") ?? "";
      state.tasks = state.tasks.filter((t) => t.id !== id);
      return route.fulfill({ status: 204, body: "" });
    }

    return route.fulfill({ status: 200, body: "[]" });
  });

  await page.route(/\/rest\/v1\/conversations(\?.*)?$/, async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "GET") {
      const userIdEq = url.searchParams.get("user_id");
      const taskIdParam = url.searchParams.get("task_id");
      let rows = state.conversations.slice();
      if (userIdEq) rows = rows.filter((c) => `eq.${c.user_id}` === userIdEq);
      if (taskIdParam === "is.null") {
        rows = rows.filter((c) => c.task_id === null);
      } else if (taskIdParam) {
        const taskId = taskIdParam.replace(/^eq\./, "");
        rows = rows.filter((c) => c.task_id === taskId);
      }
      return route.fulfill({
        status: 200,
        body: JSON.stringify(rows.map((c) => ({ id: c.id }))),
      });
    }

    if (method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}");
      const incoming = Array.isArray(body) ? body : [body];
      const created = incoming.map((row) => ({
        id: `conv-mock-${++convIdSeq.n}`,
        user_id: row.user_id,
        task_id: row.task_id ?? null,
        mode: row.mode ?? "text",
        ended_at: null,
        started_at: new Date().toISOString(),
      }));
      state.conversations.push(...created);
      return route.fulfill({
        status: 201,
        body: JSON.stringify(created),
      });
    }

    return route.fulfill({ status: 200, body: "[]" });
  });

  await page.route(/\/rest\/v1\/messages(\?.*)?$/, async (route: Route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();

    if (method === "GET") {
      const convEq = url.searchParams.get("conversation_id");
      const cid = convEq?.replace(/^eq\./, "") ?? "";
      const rows = state.messages.filter((m) => m.conversation_id === cid);
      return route.fulfill({
        status: 200,
        body: JSON.stringify(
          rows.map((r) => ({ role: r.role, content: r.content }))
        ),
      });
    }

    if (method === "POST") {
      const body = JSON.parse(route.request().postData() ?? "{}");
      state.messages.push({
        id: `msg-mock-${state.messages.length + 1}`,
        conversation_id: body.conversation_id,
        role: body.role,
        content: body.content,
        created_at: new Date().toISOString(),
      });
      return route.fulfill({ status: 201, body: "[]" });
    }

    return route.fulfill({ status: 200, body: "[]" });
  });
}

/**
 * Mock the Claude chat streaming endpoint with a simple scripted response.
 */
export async function mockClaudeChat(page: Page, responseText = "Hi, I'm Sam.") {
  await page.route("**/api/chat", async (route) => {
    const sseBody = [
      `data: ${JSON.stringify({ type: "text", content: responseText })}\n\n`,
      `data: [DONE]\n\n`,
    ].join("");

    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sseBody,
    });
  });
}
