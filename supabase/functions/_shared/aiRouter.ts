export type AIRouterMode = "primary" | "analysis";
export type AIRouterResult = { content: string; provider: string };

function buildProviderAttempts(prompt: string, mode: AIRouterMode): Array<() => Promise<AIRouterResult>> {
  const providerAttempts: Array<() => Promise<AIRouterResult>> = [];

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (openAiKey) {
    providerAttempts.push(async () => {
      const model = mode === "primary" ? "gpt-4.1" : "gpt-4o-mini";
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "Return concise, well-structured answers." },
            { role: "user", content: prompt },
          ],
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("OpenAI response missing content");
      }
      return { content, provider: "openai" };
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    providerAttempts.push(async () => {
      const model = mode === "primary" ? "claude-3-5-sonnet-20240620" : "claude-3-haiku-20240307";
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 800,
          system: "Return concise, well-structured answers.",
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      const content = data?.content?.[0]?.text;
      if (!content || typeof content !== "string") {
        throw new Error("Anthropic response missing content");
      }
      return { content, provider: "anthropic" };
    });
  }

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    providerAttempts.push(async () => {
      const model = mode === "primary" ? "gemini-pro" : "gemini-flash-lite";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.6 },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Gemini error: ${response.status} ${await response.text()}`);
      }

      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content || typeof content !== "string") {
        throw new Error("Gemini response missing content");
      }
      return { content, provider: "gemini" };
    });
  }

  return providerAttempts;
}

export async function aiRouter(prompt: string, mode: AIRouterMode = "primary"): Promise<AIRouterResult> {
  const providerAttempts = buildProviderAttempts(prompt, mode);
  const errors: string[] = [];

  for (const attempt of providerAttempts) {
    try {
      return await attempt();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(`All providers failed: ${errors.join(" | ")}`);
}
