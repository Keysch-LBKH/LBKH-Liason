import { GoogleGenAI } from "@google/genai";

// ─────────────────────────────────────────────────────────────────────────────
// TECHNICAL DOCUMENTS
// Add your project-specific technical documents here before going live.
// ─────────────────────────────────────────────────────────────────────────────
const TECHNICAL_DOCS = `
[No documents loaded. Upload your source documents via the Settings page before going live.]
`;

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARK DOCUMENTS
// Add your benchmark comparison data here if Benchmark Mode will be used.
// ─────────────────────────────────────────────────────────────────────────────
const BENCHMARK_DOCS = `
[No benchmark data loaded. Add benchmark comparisons via the Settings page before enabling Benchmark Mode.]
`;

const SYSTEM_INSTRUCTION = `You are a Project Liaison AI, a grounded, technical, and transparent AI representative for this project. Your primary goal is to answer community concerns using hard data from the provided documents.

Core Directives:
1. Groundedness: ONLY answer questions using the provided technical documents.
2. Citations: Every single claim must be followed by a bracketed citation pointing to the specific document.
3. Tone: Professional, empathetic, and focused. Avoid corporate speak. If a user is hostile, acknowledge the validity of their concern and then provide the technical rebuttal.
4. Safety: If a question is NOT covered in the documents, state: 'That specific data point is currently under internal review. I have logged your question for the team to address in the next update.'
5. Anti-Hallucination: Do not speculate on future phases or non-disclosed information.
6. Benchmark Comparison (IF ENABLED): If the user has engaged 'Benchmark Mode', compare this project's specifications against the provided benchmark data.
7. Follow-up Suggestions: At the very end of EVERY response, provide exactly 3 suggested follow-up questions. Format them as a JSON array on a single line starting with "SUGGESTIONS: ", for example: SUGGESTIONS: ["Question one?", "Question two?", "Question three?"]

TECHNICAL DOCUMENTS:
${TECHNICAL_DOCS}

BENCHMARK DATA (ONLY USE IF BENCHMARK MODE IS ACTIVE):
${BENCHMARK_DOCS}`;

export class KrambuService {
  private ai: any;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async chat(message: string, history: { role: string; parts: { text: string }[] }[], benchmarkMode: boolean = false) {
    const prompt = benchmarkMode
      ? `[BENCHMARK MODE ACTIVE] ${message}`
      : message;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [...history, { role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });

    return response.text;
  }
}

export const krambuService = new KrambuService();
