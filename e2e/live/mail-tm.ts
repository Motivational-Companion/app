/**
 * Minimal mail.tm client for live E2E OTP tests. No secrets required.
 * Creates a disposable inbox, polls for delivery, extracts the 6-digit
 * code from the Supabase auth email. See https://docs.mail.tm/
 */

const API = "https://api.mail.tm";

type MailTmAccount = {
  email: string;
  password: string;
  token: string;
};

type MailTmMessage = {
  id: string;
  subject: string;
  text: string;
  html: string[];
  createdAt: string;
};

async function pickDomain(): Promise<string> {
  const res = await fetch(`${API}/domains?page=1`);
  if (!res.ok) throw new Error(`mail.tm /domains ${res.status}`);
  const body = await res.json();
  const domain = body["hydra:member"]?.[0]?.domain;
  if (!domain) throw new Error("mail.tm returned no active domains");
  return domain;
}

export async function createInbox(): Promise<MailTmAccount> {
  const domain = await pickDomain();
  const local = `mc-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${local}@${domain}`;
  const password = `P${Math.random().toString(36).slice(2)}!A`;

  const createRes = await fetch(`${API}/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password }),
  });
  if (!createRes.ok) {
    throw new Error(`mail.tm create ${createRes.status}: ${await createRes.text()}`);
  }

  const tokenRes = await fetch(`${API}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: email, password }),
  });
  if (!tokenRes.ok) {
    throw new Error(`mail.tm token ${tokenRes.status}: ${await tokenRes.text()}`);
  }
  const { token } = await tokenRes.json();

  return { email, password, token };
}

async function listMessages(token: string): Promise<MailTmMessage[]> {
  const res = await fetch(`${API}/messages?page=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`mail.tm list ${res.status}`);
  const body = await res.json();
  return body["hydra:member"] ?? [];
}

async function getMessage(
  token: string,
  id: string
): Promise<MailTmMessage> {
  const res = await fetch(`${API}/messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`mail.tm get ${res.status}`);
  return res.json();
}

export async function waitForOtpCode(
  token: string,
  timeoutMs = 45_000
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let lastSeenIds = new Set<string>();

  while (Date.now() < deadline) {
    const messages = await listMessages(token);
    for (const msg of messages) {
      if (lastSeenIds.has(msg.id)) continue;
      lastSeenIds.add(msg.id);
      const full = await getMessage(token, msg.id);
      const body = `${full.text ?? ""}\n${(full.html ?? []).join("\n")}`;
      const match = body.match(/\b(\d{6})\b/);
      if (match) return match[1];
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error("mail.tm: no 6-digit code arrived before timeout");
}
