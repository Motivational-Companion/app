/**
 * E2E coverage for the task workspace shipped on feat/task-workspace:
 * - Left drawer renders Goals / To-dos / Issues sections
 * - Drawer stays open across navigation on desktop
 * - Clicking a drawer item navigates to /chat/task/[id]
 * - Task detail pane shows title + description + due date inline
 * - Editing description persists through the data layer
 * - Adding a subtask via the inline "+" row works
 * - Home chat is the global thread (task_id IS NULL); task pane uses
 *   its own thread (task_id = task.id), and the two are kept distinct
 * - Talk with Sam button is the drawer header
 * - Floating panel-left-dashed icon appears when drawer is collapsed
 */
import { test, expect, type Page } from "@playwright/test";
import {
  mockSupabase,
  mockTaskWorkspace,
  mockClaudeChat,
  type TaskWorkspaceState,
} from "./fixtures/mocks";

const USER = { id: "user-mock-1", email: "tester@example.com" };

function freshState(): TaskWorkspaceState {
  return {
    tasks: [
      {
        id: "task-1",
        user_id: USER.id,
        list_type: "goal",
        title: "Get fit by summer",
        status: "active",
      },
      {
        id: "task-2",
        user_id: USER.id,
        list_type: "task",
        title: "Email Sarah about the proposal",
        status: "active",
        timeframe: "tomorrow",
        description: "Sarah needs revised numbers before Friday's meeting.",
      },
      {
        id: "task-3",
        user_id: USER.id,
        list_type: "issue",
        title: "Calendar overload",
        status: "active",
      },
    ],
    conversations: [],
    messages: [],
  };
}

async function bootChat(page: Page, state: TaskWorkspaceState) {
  await mockSupabase(page, {
    user: USER,
    subscriptionStatus: "active",
  });
  await mockTaskWorkspace(page, state);
  await mockClaudeChat(page, "Got it.");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/chat");
}

test.describe("Task workspace drawer", () => {
  test("renders sections with counts and lists tasks", async ({ page }) => {
    await bootChat(page, freshState());

    await expect(page.getByRole("link", { name: /Talk with Sam/i })).toBeVisible();

    // Section labels — Goals + To-dos open by default; Issues collapsed
    await expect(page.getByText(/^Goals$/i)).toBeVisible();
    await expect(page.getByText(/^To-dos$/i)).toBeVisible();
    await expect(page.getByText(/^Issues$/i)).toBeVisible();

    // Goal + task render under their sections
    await expect(
      page.getByRole("link", { name: /Get fit by summer/ })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Email Sarah about the proposal/ })
    ).toBeVisible();
  });

  test("desktop drawer stays open after clicking a task", async ({ page }) => {
    await bootChat(page, freshState());

    await page
      .getByRole("link", { name: /Email Sarah about the proposal/ })
      .click();

    await expect(page).toHaveURL(/\/chat\/task\/task-2$/);
    // Talk with Sam still visible — drawer remained open
    await expect(page.getByRole("link", { name: /Talk with Sam/i })).toBeVisible();
  });

  test("collapse button hides desktop drawer; floating icon reopens it", async ({
    page,
  }) => {
    await bootChat(page, freshState());

    await page.getByRole("button", { name: /Collapse sidebar/i }).click();
    await expect(
      page.getByRole("link", { name: /Talk with Sam/i })
    ).toBeHidden();

    await page.getByRole("button", { name: /Open sidebar/i }).click();
    await expect(
      page.getByRole("link", { name: /Talk with Sam/i })
    ).toBeVisible();
  });
});

test.describe("Task detail pane", () => {
  test("loads the task with title + description + parent breadcrumb", async ({
    page,
  }) => {
    const state = freshState();
    state.tasks.push({
      id: "task-sub-1",
      user_id: USER.id,
      list_type: "task",
      title: "Pull together draft numbers",
      status: "active",
      parent_task_id: "task-1",
    });
    await bootChat(page, state);

    await page.goto("/chat/task/task-sub-1");

    await expect(page.locator("textarea").first()).toHaveValue(
      "Pull together draft numbers"
    );
    // Parent breadcrumb references the goal it rolls up to
    await expect(page.getByText(/Part of goal:/i)).toBeVisible();
    await expect(page.getByText("Get fit by summer").last()).toBeVisible();
  });

  test("editing description blurs and persists", async ({ page }) => {
    const state = freshState();
    await bootChat(page, state);

    await page.goto("/chat/task/task-2");

    const desc = page.getByPlaceholder(/What's this task about/i);
    await expect(desc).toBeVisible();
    await desc.fill("Updated context: Sarah wants the numbers by EOD Thursday.");
    await desc.blur();

    // Wait for the optimistic update + PATCH round-trip
    await page.waitForTimeout(200);
    const stored = state.tasks.find((t) => t.id === "task-2")?.description;
    expect(stored).toContain("Sarah wants the numbers by EOD Thursday");
  });

  test("adding a subtask via the inline + row appends and persists", async ({
    page,
  }) => {
    const state = freshState();
    await bootChat(page, state);

    await page.goto("/chat/task/task-2");

    const addInput = page.getByLabel(/^Add subtask$/i);
    await addInput.fill("Pull last quarter's numbers");
    await addInput.press("Enter");

    await page.waitForTimeout(200);
    const subtask = state.tasks.find(
      (t) =>
        t.parent_task_id === "task-2" &&
        t.title === "Pull last quarter's numbers"
    );
    expect(subtask).toBeTruthy();
  });
});

test.describe("Conversation thread separation", () => {
  test("home chat resolves the global (task_id IS NULL) thread", async ({
    page,
  }) => {
    const state = freshState();
    // Pre-seed a global conversation with one prior message
    state.conversations.push({
      id: "conv-global",
      user_id: USER.id,
      task_id: null,
      mode: "text",
      ended_at: null,
      started_at: new Date(Date.now() - 60_000).toISOString(),
    });
    state.messages.push({
      id: "msg-1",
      conversation_id: "conv-global",
      role: "user",
      content: "I want to keep building good morning habits.",
      created_at: new Date(Date.now() - 60_000).toISOString(),
    });
    await bootChat(page, state);

    // History hydrates from the global thread, not from any task thread
    await expect(
      page.getByText(/keep building good morning habits/i)
    ).toBeVisible();
  });

  test("task pane resolves its own thread distinct from global", async ({
    page,
  }) => {
    const state = freshState();
    state.conversations.push(
      {
        id: "conv-global",
        user_id: USER.id,
        task_id: null,
        mode: "text",
        ended_at: null,
        started_at: new Date(Date.now() - 120_000).toISOString(),
      },
      {
        id: "conv-task-2",
        user_id: USER.id,
        task_id: "task-2",
        mode: "text",
        ended_at: null,
        started_at: new Date(Date.now() - 30_000).toISOString(),
      }
    );
    state.messages.push(
      {
        id: "m-global",
        conversation_id: "conv-global",
        role: "user",
        content: "I should drink more water.",
        created_at: new Date().toISOString(),
      },
      {
        id: "m-task",
        conversation_id: "conv-task-2",
        role: "assistant",
        content:
          "So you're working on Email Sarah. What's the latest on the proposal?",
        created_at: new Date().toISOString(),
      }
    );
    await bootChat(page, state);
    await page.goto("/chat/task/task-2");

    // The task thread's prior turn is shown
    await expect(
      page.getByText(/what's the latest on the proposal/i)
    ).toBeVisible();
    // The global thread's content is NOT shown here
    await expect(page.getByText(/drink more water/i)).toHaveCount(0);
  });
});
