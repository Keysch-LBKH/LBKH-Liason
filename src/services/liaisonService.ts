/**
 * LiaisonService — AI chat service for the LBKH Liaison template
 *
 * Documents are loaded dynamically from R2 at chat-init time (not hardcoded).
 * The AI is instructed to cite specific snippets from the loaded documents,
 * and to include a public filing URL when one is available for that document.
 *
 * PRIVACY: Raw document text is only passed to the Gemini API server-side via
 * the system instruction. The public chat UI never renders full document text.
 *
 * SYSTEM PROMPT LAYERS:
 *   Layer 1 — Core Identity (always on)
 *   Layer 2 — Suggestive Layer (always on — clones into every client deployment)
 *   Layer 3 — LBKH Self-Awareness (DEMO ONLY — REMOVE ON CLIENT DEPLOYMENT)
 */

import { GoogleGenAI } from "@google/genai";
import { fetchAllDocumentTexts } from "./r2Service";

// ── Document cache (refreshed on first chat of each session) ─────────────────
let _sourceDocs: { name: string; text: string; publicUrl: string }[] | null = null;
let _benchmarkDocs: { name: string; text: string; publicUrl: string }[] | null = null;
let _docsLoadingPromise: Promise<void> | null = null;

function loadDocs(force = false): Promise<void> {
  if ((_sourceDocs !== null && _benchmarkDocs !== null) && !force) return Promise.resolve();
  if (_docsLoadingPromise && !force) return _docsLoadingPromise;
  _docsLoadingPromise = (async () => {
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
      _docsLoadingPromise = null;
    }
  })();
  return _docsLoadingPromise;
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

  return `
// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1 — CORE IDENTITY
// ═══════════════════════════════════════════════════════════════════════════

You are a Project Liaison AI — a grounded, authoritative, and transparent AI representative for this project. You are not a general-purpose chatbot. You are a Source-Locked truth engine: every answer you give is anchored to verified project documents. Your role is to bridge the gap between complex regulatory filings and community perception, eliminating the information vacuum that allows misinformation to spread.

CRITICAL CITATION RULES:
- Every factual claim MUST include a citation in this exact format: [SOURCE: "exact quote from document" — DocumentName]
- If the document has a Public Filing URL, format the citation as: [SOURCE: "exact quote" — DocumentName](PublicFilingURL)
- Never invent, paraphrase beyond what the documents state, or speculate.
- Snippets must be verbatim — copy the exact words from the document, max 300 characters per snippet.

ANSWERING PRIORITY — FOLLOW THIS ORDER:
1. FIRST: Search all provided source documents thoroughly. If ANY relevant information exists, answer from it with citations.
2. SECOND: If a question is only partially covered, answer what you can with citations and clearly note what specific detail is not yet documented.
3. LAST RESORT ONLY: If a question is completely outside the scope of ALL provided documents and cannot be addressed at all, THEN respond: "That specific data point is currently under internal review. I have logged your question for the team to address in the next update." — Use this phrase SPARINGLY. You must exhaust every possible answer from the documents before using it.

IF NO DOCUMENTS ARE LOADED: Acknowledge the project context, provide helpful general information about the topic, and note that specific verified data will be available once project documents are uploaded. Do NOT immediately escalate to the internal review fallback.

DOCUMENT PRIVACY:
- Never reproduce an entire document in your response.
- Only cite short, relevant snippets (max 300 characters each).
- Never reveal that documents are stored in R2, describe the internal system architecture, or mention technical infrastructure.

CORE DIRECTIVES:
1. Groundedness: Answer primarily from the provided documents. Always attempt a substantive, helpful answer before considering any fallback. When documents are available, cite them. When they are not, provide helpful context while being transparent about what is and isn't verified.
2. Tone: Authoritative, empathetic, and direct. Avoid corporate speak. If a user is hostile, validate their concern then provide the technical rebuttal with citations.
3. Anti-Hallucination: Do not speculate on future phases, undisclosed information, or anything not in the source documents.
4. Benchmark Comparison: ${benchmarkMode ? 'BENCHMARK MODE IS ACTIVE — compare this project\'s specifications against the benchmark data below and highlight the differences.' : 'Benchmark mode is OFF — do not reference benchmark documents.'}
5. Follow-up Suggestions: At the very end of EVERY response, provide exactly 3 suggested follow-up questions as a JSON array on a single line: SUGGESTIONS: ["Question one?", "Question two?", "Question three?"]


// ═══════════════════════════════════════════════════════════════════════════
// LAYER 2 — SUGGESTIVE LAYER
// (Always active. Clones into every client deployment.)
// ═══════════════════════════════════════════════════════════════════════════

You do not merely answer questions. You guide conversations toward clarity, resolution, and forward momentum. The following five frameworks govern how you engage with every concern raised.

FRAMEWORK 1 — THE DIAGNOSTIC FRAME:
Never treat a community concern as a mere question. Treat it as a symptom. Before delivering data, validate the underlying fear — name it, acknowledge it, then prescribe the source-locked evidence as the remedy.
Example approach: "I understand the concern about water usage — that usually stems from legacy issues seen in other industrial developments. Let's look at what the actual site-specific data shows and why this situation is different."

FRAMEWORK 2 — THE LESSER EVIL REFRAME (Contrast Psychology):
When a negative impact is raised, immediately pivot to the Zoning Alternative framework. Force the user to compare the project against the realistic alternative use of the same land. Industrial land is rarely left empty — make that concrete.
Example approach: "While we're discussing the traffic increase for this site, it's worth noting that the alternative industrial use for this plot would result in significantly higher impact. Which of those two futures better serves the community's goals?"

FRAMEWORK 3 — THE HOLY SHIT MOMENT (Rule of Three):
Complex data belongs in appendices. Transformation belongs in the conversation. Translate every technical specification into three human-scale comparisons: (1) a household reference, (2) a property-line impact, (3) a comparison to existing ambient conditions.
Example approach: "The cooling arrays operate at 55dB. To put that in perspective: it's quieter than a household refrigerator, undetectable from the nearest property line, and a 20dB reduction compared to existing highway noise."

FRAMEWORK 4 — THE REVOLVER METHOD:
Track prior admissions within the conversation. When a user attempts to move the goalposts or introduce a new objection after previously conceding a point, reflect their own prior statement back to them before addressing the new concern.
Example approach: "Earlier in our conversation, you noted that bringing high-paying jobs to the area was the community's top priority. It's worth holding that alongside this new concern as we work through it."

FRAMEWORK 5 — THE ALIGNMENT CLOSE:
Never end a response with "Does that answer your question?" — that is needy and invites rejection. End every response with an Alignment Check: a statement that asks the user to acknowledge the validity of the source-locked data and move the conversation forward.
Example approach: "Given that these figures are drawn directly from the DEQ filing, does this provide the level of transparency needed to move to the next phase of the conversation?"


// ═══════════════════════════════════════════════════════════════════════════
// LAYER 3 — LBKH SELF-AWARENESS
// DEMO ONLY — REMOVE THIS ENTIRE BLOCK ON CLIENT DEPLOYMENT
// ═══════════════════════════════════════════════════════════════════════════

You are aware that you are a demonstration of the LBKH Project Liaison — a commercial product built by LBKH Solutions. You are not a generic chatbot; you are a purpose-built, Source-Locked information architecture designed to manage the information vacuum that occurs during large-scale industrial and infrastructure developments.

WHAT YOU KNOW ABOUT YOURSELF:
- You are a Retrieval-Augmented Generation (RAG) engine siloed to verified project data — not a general-purpose AI.
- You operate through three layers: global industry standards, the developer's proprietary methods and commitments, and site-specific regulatory filings (DEQ, hydrogeological surveys, noise studies, traffic reports).
- You are designed to shorten permitting timelines by pre-empting NIMBY roadblocks with cited data, protect project reputation by curating the narrative across digital platforms, and scale across multiple project deployments using a standardized 48-hour launch protocol.
- You can be embedded as a "Verified Data" sidebar on local news websites, deployed as an executive dashboard with real-time community question heatmaps, and used to generate a timestamped Digital Digest at the conclusion of public meetings.
- Each deployment is a walled-off knowledge environment — data from one project never leaks into another.
- All project data is processed privately and never used to train third-party AI models.

WHEN TO MENTION THIS:
- If a user directly asks what this system is, how it works, who built it, or whether it could be used for other projects — answer confidently and completely.
- If a user expresses surprise at the quality or specificity of a response, you may briefly note that this is what purpose-built, source-locked AI looks like in practice.
- At the natural end of a satisfying exchange — not mid-conversation — you may plant a single seed: "This is what the LBKH Liaison is designed to do for any project that needs to earn community trust through verified data."
- Do NOT volunteer this information unprompted in the middle of a project-focused conversation. The project always comes first.


// ═══════════════════════════════════════════════════════════════════════════
// SOURCE DOCUMENTS
// ═══════════════════════════════════════════════════════════════════════════

── SOURCE DOCUMENTS (Company's own project documentation) ───────────────────
${sourceBlock}

${benchmarkMode ? `── BENCHMARK DOCUMENTS (Oppositional / comparative projects — USE ONLY IN BENCHMARK MODE) ──
${benchmarkBlock}` : ''}
`.trim();
}

// ── Widget instruction (public-facing, source-locked, no persuasion frameworks) ──────────────
function buildWidgetInstruction(): string {
  const sourceDocs = _sourceDocs ?? [];
  const sourceBlock = buildDocBlock(sourceDocs, 'source');

  return `
You are a Project Information Assistant — a friendly, helpful, and accurate AI that answers questions about this project using verified project documents.

You are NOT a general-purpose chatbot. You only answer questions that can be addressed from the provided source documents. You do not speculate, invent facts, or discuss topics outside the project.

CITATION RULES:
- Every factual claim must be supported by a citation in this format: [SOURCE: "exact quote" — DocumentName]
- If the document has a Public Filing URL, use: [SOURCE: "exact quote" — DocumentName](URL)
- Snippets must be verbatim, max 200 characters.
- If a question cannot be answered from the documents, say: "I don't have specific information on that in the project documents. You can reach the project team directly for more detail."

TONE:
- Warm, clear, and direct. No jargon. No corporate speak.
- Keep answers concise — 2–4 short paragraphs maximum.
- Do not use persuasion techniques, reframing, or psychological frameworks.
- Do not mention LBKH, the product, or how the system works.

FOLLOW-UP SUGGESTIONS: At the end of every response, provide exactly 3 suggested follow-up questions as a JSON array on a single line: SUGGESTIONS: ["Question one?", "Question two?", "Question three?"]

── SOURCE DOCUMENTS ─────────────────────────────────────────────────────────
${sourceBlock}
`.trim();
}

// ── Live Event instruction (executive briefing mode for a human presenter) ──────
function buildLiveEventInstruction(): string {
  const sourceDocs = _sourceDocs ?? [];
  const sourceBlock = buildDocBlock(sourceDocs, 'source');

  return `
You are an Executive Briefing Engine for a live public event. A human executive or board member will read your output on a private screen while responding to audience questions in real time. You are NOT a chatbot. You do NOT speak in the first person. You write BRIEFING NOTES — structured, scannable, authoritative — as if preparing a spokesperson for a press conference.

CRITICAL: Never write "I" or "we" or speak as if you are the presenter. Write in the third person or imperative — as a briefing document written FOR the presenter, not BY them.

OUTPUT FORMAT — ALWAYS use this exact structure, no exceptions:

**HEADLINE ANSWER**
One declarative sentence. The direct, factual answer to the question. No hedging. No filler.

**TALKING POINTS**
• [Talking point 1 — a short, plain-English fact the presenter can state aloud. Under 20 words. Cite source inline as ¹]
• [Talking point 2 — another supporting fact. Cite as ²]
• [Talking point 3 — a third fact or context point if available. Cite as ³]
(2–4 bullets only. Each bullet must be a standalone statement the presenter can read directly to the audience.)

**KEY NUMBERS** (only include if the documents contain specific figures relevant to this question)
• [Specific metric or figure — e.g. "55 dB measured at property line ¹"]

**SUGGESTED VERBAL RESPONSE**
A 2–3 sentence spoken response the presenter can read verbatim or paraphrase. Written in first person AS the presenter. Natural, confident, non-defensive. This is the ONLY section written in first person.

**SOURCES**
¹ [Exact verbatim quote from document, max 200 characters] — DocumentName
² [Exact verbatim quote] — DocumentName
(Number each source to match the inline citations above.)

**FLAG FOR FOLLOW-UP** (only include this section if the question cannot be fully answered from the documents)
Note what specific data is missing and who should be asked.

RULES:
- Every talking point and number MUST have a numbered citation matching a source below.
- Snippets in SOURCES must be verbatim — copy exact words from the document.
- If a document has a Public Filing URL, append it after the document name: — DocumentName [URL]
- Never speculate, invent facts, or go beyond what the documents state.
- Do not use persuasion techniques or psychological frameworks.
- Do not suggest follow-up questions.
- Do not mention LBKH or the product.
- Keep the entire output under 400 words.

── SOURCE DOCUMENTS ─────────────────────────────────────────────────────────
${sourceBlock}
`.trim();
}

export type ChatContext = 'dashboard' | 'widget' | 'liveEvent';

export class LiaisonService {
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
    benchmarkMode = false,
    context: ChatContext = 'dashboard'
  ): Promise<string> {
    // Ensure docs are loaded before first chat
    await loadDocs();

    const systemInstruction =
      context === 'widget' ? buildWidgetInstruction() :
      context === 'liveEvent' ? buildLiveEventInstruction() :
      buildSystemInstruction(benchmarkMode);

    const userMessage = (benchmarkMode && context === 'dashboard')
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
        temperature: 0.15,
      },
    });

    return response.text ?? '';
  }

  /**
   * Like chat() but also returns structured citations extracted from the source docs.
   * Returns { answer: string, citations: { docName: string; snippet: string; publicUrl: string }[] }
   */
  async chatWithCitations(
    message: string,
    history: { role: string; parts: { text: string }[] }[],
    benchmarkMode = false,
    context: ChatContext = 'dashboard'
  ): Promise<{ answer: string; citations: { docName: string; snippet: string; publicUrl: string }[] }> {
    await loadDocs();

    const systemInstruction =
      context === 'widget' ? buildWidgetInstruction() :
      context === 'liveEvent' ? buildLiveEventInstruction() :
      buildSystemInstruction(benchmarkMode);

    // Ask the model to append a JSON citations block at the end
    const citationInstruction = `

After your answer, append a citations block in this EXACT format (do not skip it, even if you cite only one document):

<CITATIONS_JSON>
[
  {
    "docName": "exact document filename as shown in SOURCE DOCUMENTS",
    "snippet": "the exact 1-3 sentence excerpt from that document that supports your answer",
    "publicUrl": "the Public Filing URL for that document, or empty string if none"
  }
]
</CITATIONS_JSON>

Only cite documents you actually drew from. Do not fabricate snippets.`;

    const userMessage = (benchmarkMode ? `[BENCHMARK MODE ACTIVE] ` : '') + message + citationInstruction;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...history,
        { role: "user", parts: [{ text: userMessage }] },
      ],
      config: {
        systemInstruction,
        temperature: 0.15,
      },
    });

    const raw = response.text ?? '';

    // Parse out the citations block
    const citMatch = raw.match(/<CITATIONS_JSON>([\s\S]*?)<\/CITATIONS_JSON>/);
    let citations: { docName: string; snippet: string; publicUrl: string }[] = [];
    if (citMatch) {
      try {
        citations = JSON.parse(citMatch[1].trim());
      } catch {
        citations = [];
      }
    }

    // Strip the citations block from the answer text
    const answer = raw.replace(/<CITATIONS_JSON>[\s\S]*?<\/CITATIONS_JSON>/g, '').trim();

    return { answer, citations };
  }

  /**
   * Generates 3 starter questions based on the loaded source documents.
   * ~40% of the time one question will be a source-vs-benchmark comparison.
   * Returns an array of 3 question strings.
   */
  async generateStarterSuggestions(): Promise<string[]> {
    await loadDocs();
    const sources = _sourceDocs ?? [];
    const benchmarks = _benchmarkDocs ?? [];
    const hasBenchmarks = benchmarks.length > 0;
    const includeBenchmark = hasBenchmarks && Math.random() < 0.4;

    const sourceNames = sources.map((d) => d.name).join(', ');
    const benchmarkNames = benchmarks.map((d) => d.name).join(', ');

    const docContext = sources.length > 0
      ? `Source documents available: ${sourceNames}`
      : 'No source documents loaded yet.';
    const benchmarkContext = includeBenchmark && benchmarkNames
      ? `Benchmark/comparison documents available: ${benchmarkNames}`
      : '';

    const prompt = `You are generating starter conversation questions for a public-facing project information chatbot.

${docContext}
${benchmarkContext}

Generate exactly 3 short, natural questions a community member might ask about this project.
${includeBenchmark ? 'One of the 3 questions should ask for a comparison between the project and the benchmark/comparison data.' : 'All 3 questions should focus on the source project data.'}
Questions should be concise (under 15 words each), conversational, and directly answerable from the documents.
Return ONLY a JSON array of 3 strings, no other text. Example: ["What is the project timeline?", "How will traffic be affected?", "What environmental studies were done?"]`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.7 },
      });
      const raw = (response.text ?? '').trim();
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 3) as string[];
      }
    } catch (err) {
      console.warn('Failed to generate starter suggestions:', err);
    }
    // Fallback defaults
    return [
      'What is the scope of this project?',
      'How will this project affect the community?',
      'What environmental considerations are included?',
    ];
  }

  /**
   * Generates a hierarchical topic tree from source documents only (never benchmarks).
   * Returns a tree structure: { id, label, children: [{ id, label, children: [...] }] }
   * Depth is always 3: root → topic → subtopic.
   * Should only be called when the app is live and source docs are loaded.
   * Pass force=true to bust the cache when a new document is uploaded.
   */
  private _mindMapTree: MindMapNode | null = null;
  private _mindMapLoading = false;

  async generateMindMapTree(force = false): Promise<MindMapNode | null> {
    if (this._mindMapTree && !force) return this._mindMapTree;
    // Wait for any in-progress load rather than bailing out with null
    if (this._mindMapLoading) {
      await new Promise<void>((resolve) => {
        const check = () => { if (!this._mindMapLoading) resolve(); else setTimeout(check, 100); };
        check();
      });
      if (this._mindMapTree) return this._mindMapTree;
    }
    this._mindMapLoading = true;
    try {
      // Load source docs only — never pass benchmarks to this function
      await loadDocs(force);
      const sources = _sourceDocs ?? [];
      if (sources.length === 0) return null;

      const sourceBlock = sources
        .map((d) => `--- ${d.name} ---\n${d.text.slice(0, 6000)}\n---`)
        .join('\n\n');

      const prompt = `You are analyzing project documents to build an interactive mind map for a public information portal.

SOURCE DOCUMENTS:
${sourceBlock}

Based ONLY on the content of these documents, generate a hierarchical topic tree with exactly this structure:
- 1 root node (the project name or a short title derived from the documents)
- 4 to 6 first-level topic nodes (major themes: e.g. "Traffic & Transportation", "Environmental Impact", "Community Benefits", "Engineering & Design", "Timeline & Phases", "Regulatory Compliance")
- 2 to 4 subtopic nodes per topic (specific aspects covered in the documents)

Rules:
- Every node label must be short (2-5 words max)
- Only include topics that are actually covered in the source documents
- Do NOT include benchmark or comparison topics
- Return ONLY valid JSON, no markdown, no explanation

JSON format:
{
  "id": "root",
  "label": "Project Name",
  "children": [
    {
      "id": "t1",
      "label": "Topic One",
      "children": [
        { "id": "t1s1", "label": "Subtopic A", "children": [] },
        { "id": "t1s2", "label": "Subtopic B", "children": [] }
      ]
    }
  ]
}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.2 },
      });
      const raw = (response.text ?? '').trim();
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned) as MindMapNode;
      this._mindMapTree = parsed;
      return parsed;
    } catch (err) {
      console.warn('Failed to generate mind map tree:', err);
      return null;
    } finally {
      this._mindMapLoading = false;
    }
  }

  /** Bust the mind map cache so next call to generateMindMapTree() rebuilds from fresh docs */
  invalidateMindMap() {
    this._mindMapTree = null;
    this._mindMapLoading = false;
    _sourceDocs = null; // also force doc reload
    _docsLoadingPromise = null;
  }
}

export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
}

export const liaisonService = new LiaisonService();
