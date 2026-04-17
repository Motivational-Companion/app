import { chromium } from "@playwright/test";
import { createInbox, waitForOtpCode } from "./e2e/live/mail-tm";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    recordVideo: { dir: "/tmp/mc-demo-video", size: { width: 390, height: 844 } },
    viewport: { width: 390, height: 844 },
    isMobile: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
  });
  const page = await context.newPage();

  const inbox = await createInbox();
  console.log("Inbox:", inbox.email);

  // 1. Landing
  await page.goto("https://companion.jamesferrer.com");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  console.log("1. Landing loaded");
  await page.screenshot({ path: "/tmp/mc-demo-video/01-landing.png" });

  // 2. Click CTA
  const cta = page.getByRole("link", { name: /start|begin|get started|free/i }).first();
  if (await cta.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cta.click();
    await page.waitForTimeout(1500);
    console.log("2. CTA clicked");
  } else {
    console.log("2. No CTA, trying scroll...");
  }
  await page.screenshot({ path: "/tmp/mc-demo-video/02-after-cta.png" });

  // 3. Quiz screens
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(800);
    const url = page.url();
    if (url.includes("stripe") || url.includes("success") || url.includes("signin")) {
      console.log(`3. Left quiz at step ${i}, url: ${url}`);
      break;
    }

    // Try clicking first quiz option
    const options = page.locator("button").filter({ hasText: /.{3,}/ });
    const count = await options.count();
    if (count > 1) {
      await options.first().click();
      await page.waitForTimeout(600);
    }

    // Textarea (vision question)
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 500 }).catch(() => false)) {
      await textarea.fill("I want to wake up calm and clear about what matters.");
      await page.waitForTimeout(500);
    }

    // Next/continue
    const nextBtn = page.locator("button").filter({ hasText: /next|continue|let|see.*plan|start.*trial|get.*started|submit/i }).first();
    if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
      console.log(`  Quiz step ${i + 1}`);
    }

    await page.screenshot({ path: `/tmp/mc-demo-video/quiz-${String(i+1).padStart(2,"0")}.png` });
  }

  await page.screenshot({ path: "/tmp/mc-demo-video/03-after-quiz.png" });
  console.log("Quiz done, at:", page.url());

  // 4. Signin flow
  await page.goto("https://companion.jamesferrer.com/signin");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/mc-demo-video/04-signin.png" });
  console.log("4. Signin page");

  await page.getByPlaceholder(/email/i).fill(inbox.email);
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: /sign.?in/i }).click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/tmp/mc-demo-video/05-code-screen.png" });
  console.log("5. Waiting for OTP...");

  const code = await waitForOtpCode(inbox.token, 60000);
  console.log("6. OTP:", code);

  const codeInput = page.getByLabel(/verification code/i);
  await codeInput.waitFor({ timeout: 5000 });
  await codeInput.fill(code);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/tmp/mc-demo-video/06-code-entered.png" });

  await page.waitForURL(/\/chat/, { timeout: 20000 }).catch(() => {
    console.log("   Not at /chat, at:", page.url());
  });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "/tmp/mc-demo-video/07-chat.png" });
  console.log("7. Final:", page.url());

  await context.close();
  await browser.close();
  console.log("\nDone! Check /tmp/mc-demo-video/");
})();
