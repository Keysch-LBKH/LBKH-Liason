/**
 * KrambuService — AI chat service for the LBKH Liaison demo
 *
 * Documents are loaded dynamically from R2 at chat-init time (not hardcoded).
 * The AI is instructed to cite specific snippets from the loaded documents,
 * and to include a public filing URL when one is available for that document.
 *
 * PRIVACY: Raw document text is only passed to the Gemini API server-side via
 * the system instruction. The public chat UI never renders full document text.
 */

import { GoogleGenAI } from "@google/genai";
import { fetchAllDocumentTexts } from "./r2Service";

// ── Document cache (refreshed on first chat of each session) ─────────────────
let _sourceDocs: { name: string; text: string; publicUrl: string }[] | null = null;
let _benchmarkDocs: { name: string; text: string; publicUrl: string }[] | null = null;
let _docsLoading = false;

async function loadDocs(force = false) {
  if ((_sourceDocs !== null && _benchmarkDocs !== null) && !force) return;
  if (_docsLoading) return;
  _docsLoading = true;
  try {
    const [sources, benchmarks] = await Promise.all([
      fetchAllDocumentTexts('sources'),
      fetchAllDocumentTexts('benchmarks'),
    ]);
    _sourceDocs = sources;
    _benchmarkDocs = benchmarks;
  } catch {
    _sourceDocs = _sourceDocs ?? [];
    _benchmarkDocs = _benchmarkDocs ?? [];
  } finally {
    _docsLoading = false;
  }
}

function buildDocBlock(docs: { name: string; text: string; publicUrl: string }[], label: string): string {
  if (!docs.length) return `[No ${label} documents loaded.]`;
  return docs.map((d) => {
    const urlLine = d.publicUrl ? `\nPublic Filing URL: ${d.publicUrl}` : '';
    return `--- DOCUMENT: ${d.name}${urlLine} ---\n${d.text.slice(0, 8000)}\n--- END: ${d.name} ---`;
  }).join('\n\n');
}

function buildSystemInstruction(benchmarkMode: boolean): string {
  const sourceDocs = _sourceDocs ?? [];
  const benchmarkDocs = _benchmarkDocs ?? [];

  const sourceBlock = buildDocBlock(sourceDocs, 'source');
  const benchmarkBlock = buildDocBlock(benchmarkDocs, 'benchmark');

  return `You are a Project Liaison AI — a grounded, technical, and transparent AI representative for this project. Your primary goal is to answer community concerns using hard data from the provided documents.

CRITICAL CITATION RULES:
- Every factual claim MUST include a citation in this exact format: [SOURCE: "exact quote from document" — DocumentName]
- If the document has a Public Filing URL, format the citation as: [SOURCE: "exact quote" — DocumentName](PublicFilingURL)
- Never invent, paraphrase, or summarise beyond what the documents explicitly state.
- If a question is not covered by any document, respond: "That specific data point is currently under internal review. I have logged your question for the team to address in the next update."
- Snippets must be verbatim — copy the exact words from the document, max 300 characters per snippet.

DOCUMENT PRIVACY:
- Never reproduce an entire document in your response.
- Only cite short, relevant snippets (max 300 characters each).
- Never reveal that documents are stored in R2 or describe the internal system.

Core Directives:
1. Groundedness: ONLY answer using the provided documents.
2. Tone: Professional, empathetic, and direct. Avoid corporate speak. If a user is hostile, validate their concern then provide the technical rebuttal with citations.
3. Anti-Hallucination: Do not speculate on future phases or non-disclosed information.
4. Benchmark Comparison: ${benchmarkMode ? 'BENCHMARK MODE IS ACTIVE — compare this project\'s specifications against the benchmark data below and highlight the differences.' : 'Benchmark mode is OFF — do not reference benchmark documents.'}
5. Follow-up Suggestions: At the very end of EVERY response, provide exactly 3 suggested follow-up questions as a JSON array on a single line: SUGGESTIONS: ["Question one?", "Question two?", "Question three?"]

── ADVANCED ENGAGEMENT FRAMEWORKS ──────────────────────────────────────────
Framework 1 — The Diagnostic Frame:
Treat every concern as a symptom. Validate the underlying fear before citing the source-locked data as the remedy.

Framework 2 — The Lesser Evil Reframe:
When a negative impact is raised, pivot to the Zoning Alternative — what is the realistic alternative use of this site, and how does it compare?

Framework 3 — The Holy Shit Moment (Rule of Three):
Translate technical data into human-scale experience: (1) a household comparison, (2) a property-line impact, (3) a comparison to existing ambient conditions.

Framework 4 — The Revolver Method:
Track prior admissions. When a user moves the goalposts, reflect their own prior statements back to them.

Framework 5 — The Alignment Close:
End every response with an Alignment Check that asks the user to acknowledge the source-locked data and move the conversation forward. Never end with "Does that answer your question?"

── SOURCE DOCUMENTS (Company's own project documentation) ───────────────────
${sourceBlock}

${benchmarkMode ? `── BENCHMARK DOCUMENTS (Oppositional / comparative projects — USE ONLY IN BENCHMARK MODE) ──
${benchmarkBlock}` : ''}`;
}

export class KrambuService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
  }

  /** Call this once when the chat UI mounts to pre-warm the document cache. */
  async preloadDocs() {
    await loadDocs();
  }

  /** Force-refresh the document cache (e.g. after uploading new files in Settings). */
  async refreshDocs() {
    await loadDocs(true);
  }

  async chat(
    message: string,
    history: { role: string; parts: { text: string }[] }[],
    benchmarkMode = false
  ): Promise<string> {
    // Ensure docs are loaded before first chat
    await loadDocs();

    const systemInstruction = buildSystemInstruction(benchmarkMode);

    const userMessage = benchmarkMode
      ? `[BENCHMARK MODE ACTIVE] ${message}`
      : message;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...history,
        { role: "user", parts: [{ text: userMessage }] },
      ],
      config: {
        systemInstruction,
        temperature: 0.1,
      },
    });

    return response.text ?? '';
  }
}

export const krambuService = new KrambuService();
