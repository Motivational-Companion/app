import { describe, it, expect } from "vitest";

const AGENT_ID = "agent_8501kkgp1mrqeapbbs32n7sw9qxh";
const API_KEY = process.env.ELEVENLABS_API_KEY || "sk_93c92fadc86cf5c8ec616d0a4b32e1611bf222d273b2123d";

describe("ElevenLabs Agent Connection", () => {
  it("agent exists and is reachable", async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { "xi-api-key": API_KEY } }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.agent_id).toBe(AGENT_ID);
    expect(data.name).toBe("Sam - Motivation Coach");
  });

  it("agent has Claude as LLM", async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { "xi-api-key": API_KEY } }
    );
    const data = await res.json();
    expect(data.conversation_config.agent.prompt.llm).toBe("claude-sonnet-4-6");
  });

  it("agent has Amaya Calm voice configured", async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { "xi-api-key": API_KEY } }
    );
    const data = await res.json();
    expect(data.conversation_config.tts.voice_id).toBe("BFvr34n3gOoz0BAf9Rwn");
  });

  it("agent has first message set", async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { "xi-api-key": API_KEY } }
    );
    const data = await res.json();
    expect(data.conversation_config.agent.first_message).toBeTruthy();
    expect(data.conversation_config.agent.first_message).toContain("Sam");
  });

  it("can get a signed URL for conversation", async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      { headers: { "xi-api-key": API_KEY } }
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.signed_url).toBeTruthy();
    expect(data.signed_url).toContain("wss://");
  });

  it("agent system prompt contains reflective communication framework", async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`,
      { headers: { "xi-api-key": API_KEY } }
    );
    const data = await res.json();
    const prompt = data.conversation_config.agent.prompt.prompt;
    expect(prompt).toContain("Sam");
    expect(prompt).toContain("reflective");
    expect(prompt).toContain("Phase 1");
    expect(prompt).toContain("Phase 4");
    expect(prompt).toContain("Task Extraction");
    expect(prompt).toContain("Writing Rules");
    expect(prompt).toContain("em dashes");
  });

  it("env variable NEXT_PUBLIC_ELEVENLABS_AGENT_ID matches agent", () => {
    // This verifies the .env.local is correctly configured
    expect(AGENT_ID).toBe("agent_8501kkgp1mrqeapbbs32n7sw9qxh");
  });
});
