import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ Initialize Gemini AI client (optional if key is missing)
const geminiApiKey = process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;

// 🧠 Simple in-memory cache of the last suggestion to reduce rate limits
type SuggestionResult =
  | { message: string; suggestion: string; suggestions?: string[] }
  | { error: string; details?: string };
let lastPrompt: string | null = null;
let lastResult: SuggestionResult | null = null;
let lastAtMs = 0;
const CACHE_TTL_MS = 60_000; // 60s

function getCached(prompt: string): SuggestionResult | null {
  if (!lastPrompt || !lastResult) return null;
  const fresh = Date.now() - lastAtMs < CACHE_TTL_MS;
  if (fresh && prompt.trim() === lastPrompt.trim()) return lastResult;
  return null;
}

function setCached(prompt: string, result: SuggestionResult) {
  lastPrompt = prompt;
  lastResult = result;
  lastAtMs = Date.now();
}

function buildPrompt(basePrompt: string, count: number): string {
  const n = Math.min(Math.max(count || 5, 1), 10);
  const instruction = `Return ${n} distinct event ideas as a simple list. Each item should be one short line: Title — one sentence.`;
  return basePrompt ? `${basePrompt}\n\n${instruction}` : `Suggest ${n} compelling event ideas. ${instruction}`;
}

function toList(text: string, count: number): string[] {
  const lines = (text || "")
    .split(/\r?\n+/)
    .map((l) => l.replace(/^\s*[-*\d.\)]\s*/, "").trim())
    .filter(Boolean);
  if (lines.length >= 2) return lines.slice(0, Math.min(lines.length, Math.max(count || 5, 1)));
  // fallback: split by semicolon or bullet dots
  const parts = text.split(/;|•|·|\|/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, Math.min(parts.length, Math.max(count || 5, 1)));
  return [text.trim()].filter(Boolean);
}

/**
 * AI suggester using Google Gemini (with development fallback)
 * @param prompt - The prompt or query for the AI model
 * @returns Object containing message + AI suggestion
 */
export async function suggestWithGemini(prompt: string, count = 5): Promise<SuggestionResult> {
  const trimmed = (prompt || "").trim();

  // 🔁 Cache check
  const cached = getCached(trimmed);
  if (cached) return cached;

  // 🧩 Development or missing API key => mock response
  const isDev = process.env.NODE_ENV === "development";
  if (isDev || !genAI) {
    const mock: SuggestionResult = {
      message: isDev ? "Mock AI response (development mode)" : "Mock AI response (no Gemini key)",
      suggestion:
        "1) Community Health Day — free screenings and wellness talks.\n2) Tech & Teens — coding and robotics demos.\n3) Local Innovators Expo — startup lightning talks.",
      suggestions: [
        "Community Health Day — free screenings and wellness talks.",
        "Tech & Teens — coding and robotics demos.",
        "Local Innovators Expo — startup lightning talks.",
      ],
    };
    setCached(trimmed, mock);
    return mock;
  }

  // 👉 Ensure the prompt is meaningful
  const effectivePrompt = buildPrompt(trimmed, count);

  // Primary: Gemini
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(effectivePrompt);
    const responseText =
      // @ts-expect-error Gemini types vary by version; attempt common accessors
      (result?.response?.text?.() as string) ||
      // @ts-expect-error fallback shape
      (result?.response?.candidates?.[0]?.content?.parts?.map((p: any) => p.text)?.join(" ") as string) ||
      "No suggestion returned";

    const list = toList(responseText, count);
    const ok: SuggestionResult = {
      message: "AI suggestion generated via Gemini",
      suggestion: responseText.trim(),
      suggestions: list,
    };
    setCached(trimmed, ok);
    return ok;
  } catch (geminiErr: any) {
    console.error("❌ Gemini suggestion error:", geminiErr);

    // Secondary: OpenAI fallback (optional)
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      try {
        // Dynamic import to keep dependency optional
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { default: OpenAI } = (await import("openai").catch(() => ({ default: null }))) as any;
        if (OpenAI) {
          const openai = new OpenAI({ apiKey: openAiKey });
          const completion = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are an assistant that generates concise, useful event ideas. Return a short list in plain text.",
              },
              { role: "user", content: effectivePrompt },
            ],
            temperature: 0.7,
            max_tokens: 300,
          });
          const text = completion?.choices?.[0]?.message?.content?.trim() || "No suggestion returned";
          const list = toList(text, count);
          const ok: SuggestionResult = { message: "AI suggestion generated via OpenAI fallback", suggestion: text, suggestions: list };
          setCached(trimmed, ok);
          return ok;
        }
      } catch (openaiErr: any) {
        console.error("❌ OpenAI fallback error:", openaiErr);
      }
    }

    // Tertiary: Hard fallback
    const fallback: SuggestionResult = {
      message: "Fallback suggestion",
      suggestion:
        "1) Local Innovators Expo — showcase startups with lightning talks.\n2) Community Wellness Fair — screenings and mindfulness sessions.",
      suggestions: [
        "Local Innovators Expo — showcase startups with lightning talks.",
        "Community Wellness Fair — screenings and mindfulness sessions.",
      ],
    };
    setCached(trimmed, fallback);
    return fallback;
  }
}
