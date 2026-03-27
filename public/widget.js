/**
 * LBKH Liaison Embeddable Chat Widget
 * Drop this script on any page to embed the project liaison chat.
 *
 * Usage:
 *   <script
 *     src="https://your-deployment.pages.dev/widget.js"
 *     data-worker-url="https://your-worker.workers.dev"
 *     data-bucket="your-bucket-name"
 *     data-secret="your-upload-secret"
 *     data-gemini-key="your-gemini-api-key"
 *     data-primary-color="#40E0D0"
 *     data-secondary-color="#00B5A8"
 *     data-company-name="Your Company"
 *     data-is-live="true"
 *   ></script>
 */
(function () {
  'use strict';

  const script = document.currentScript;
  const cfg = {
    workerUrl: script.getAttribute('data-worker-url') || '',
    bucket: script.getAttribute('data-bucket') || '',
    secret: script.getAttribute('data-secret') || '',
    geminiKey: script.getAttribute('data-gemini-key') || '',
    primaryColor: script.getAttribute('data-primary-color') || '#40E0D0',
    secondaryColor: script.getAttribute('data-secondary-color') || '#00B5A8',
    companyName: script.getAttribute('data-company-name') || 'Project Liaison',
    isLive: script.getAttribute('data-is-live') === 'true',
  };

  // --- Styles ---
  const style = document.createElement('style');
  style.textContent = `
    #lbkh-widget-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99998;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      background: ${cfg.primaryColor};
    }
    #lbkh-widget-btn:hover { transform: scale(1.08); box-shadow: 0 6px 32px rgba(0,0,0,0.5); }
    #lbkh-widget-btn svg { width: 24px; height: 24px; fill: none; stroke: #000; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    #lbkh-widget-panel {
      position: fixed;
      bottom: 92px;
      right: 24px;
      width: 380px;
      max-width: calc(100vw - 48px);
      height: 560px;
      max-height: calc(100vh - 120px);
      background: #050505;
      border: 1px solid ${cfg.primaryColor}40;
      border-radius: 20px;
      box-shadow: 0 8px 48px rgba(0,0,0,0.7), 0 0 40px ${cfg.primaryColor}15;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      z-index: 99999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      transform: scale(0.95) translateY(10px);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
    }
    #lbkh-widget-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1;
      pointer-events: all;
    }

    #lbkh-widget-header {
      padding: 16px 20px;
      border-bottom: 1px solid ${cfg.primaryColor}25;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #0a0a0a;
    }
    #lbkh-widget-header .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: ${cfg.primaryColor};
      box-shadow: 0 0 8px ${cfg.primaryColor};
      animation: lbkh-pulse 2s infinite;
    }
    @keyframes lbkh-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    #lbkh-widget-header .title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: ${cfg.primaryColor};
      flex: 1;
    }
    #lbkh-widget-header .subtitle {
      font-size: 9px;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    #lbkh-widget-close {
      background: none; border: none; cursor: pointer;
      color: rgba(255,255,255,0.3); font-size: 18px; line-height: 1;
      padding: 4px; border-radius: 6px; transition: color 0.15s;
    }
    #lbkh-widget-close:hover { color: rgba(255,255,255,0.8); }

    #lbkh-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: ${cfg.primaryColor}30 transparent;
    }
    .lbkh-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.5;
    }
    .lbkh-msg.user {
      align-self: flex-end;
      background: ${cfg.primaryColor};
      color: #000;
      border-bottom-right-radius: 4px;
      font-weight: 600;
    }
    .lbkh-msg.bot {
      align-self: flex-start;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.85);
      border-bottom-left-radius: 4px;
    }
    .lbkh-msg.bot a { color: ${cfg.primaryColor}; }
    .lbkh-typing {
      align-self: flex-start;
      display: flex;
      gap: 4px;
      padding: 10px 14px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      border-bottom-left-radius: 4px;
    }
    .lbkh-typing span {
      width: 6px; height: 6px; border-radius: 50%;
      background: ${cfg.primaryColor};
      animation: lbkh-bounce 1.2s infinite;
    }
    .lbkh-typing span:nth-child(2) { animation-delay: 0.2s; }
    .lbkh-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes lbkh-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-6px)} }

    #lbkh-widget-input-row {
      padding: 12px 16px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex;
      gap: 8px;
      background: #0a0a0a;
    }
    #lbkh-widget-input {
      flex: 1;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      color: #fff;
      outline: none;
      transition: border-color 0.15s;
    }
    #lbkh-widget-input:focus { border-color: ${cfg.primaryColor}60; }
    #lbkh-widget-input::placeholder { color: rgba(255,255,255,0.25); }
    #lbkh-widget-send {
      width: 40px; height: 40px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      background: ${cfg.primaryColor};
      transition: opacity 0.15s;
      flex-shrink: 0;
    }
    #lbkh-widget-send:disabled { opacity: 0.4; cursor: not-allowed; }
    #lbkh-widget-send svg { width: 16px; height: 16px; fill: none; stroke: #000; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }

    #lbkh-widget-footer {
      padding: 8px 16px;
      text-align: center;
      font-size: 9px;
      color: rgba(255,255,255,0.15);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: #0a0a0a;
      border-top: 1px solid rgba(255,255,255,0.04);
    }

    /* Coming soon state */
    #lbkh-widget-coming-soon {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      text-align: center;
      gap: 12px;
    }
    #lbkh-widget-coming-soon .cs-icon {
      width: 48px; height: 48px; border-radius: 12px;
      background: ${cfg.primaryColor}15;
      border: 1px solid ${cfg.primaryColor}30;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 4px;
    }
    #lbkh-widget-coming-soon .cs-icon svg { width: 24px; height: 24px; fill: none; stroke: ${cfg.primaryColor}; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    #lbkh-widget-coming-soon h3 {
      font-size: 13px; font-weight: 900; text-transform: uppercase;
      letter-spacing: 0.1em; color: ${cfg.primaryColor}; margin: 0;
    }
    #lbkh-widget-coming-soon p {
      font-size: 12px; color: rgba(255,255,255,0.45); margin: 0; line-height: 1.5;
    }
  `;
  document.head.appendChild(style);

  // --- Toggle Button ---
  const btn = document.createElement('button');
  btn.id = 'lbkh-widget-btn';
  btn.setAttribute('aria-label', 'Open project liaison chat');
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
  document.body.appendChild(btn);

  // --- Panel ---
  const panel = document.createElement('div');
  panel.id = 'lbkh-widget-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', `${cfg.companyName} Project Liaison`);

  panel.innerHTML = `
    <div id="lbkh-widget-header">
      <div class="dot"></div>
      <div>
        <div class="title">${cfg.companyName}</div>
        <div class="subtitle">Project Liaison · Ask Anything</div>
      </div>
      <button id="lbkh-widget-close" aria-label="Close chat">✕</button>
    </div>

    ${cfg.isLive ? `
      <div id="lbkh-widget-messages"></div>
      <div id="lbkh-widget-input-row">
        <input id="lbkh-widget-input" type="text" placeholder="Ask about this project..." autocomplete="off" />
        <button id="lbkh-widget-send" aria-label="Send">
          <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
      <div id="lbkh-widget-footer">Powered by LBKH Liaison · Source-locked answers</div>
    ` : `
      <div id="lbkh-widget-coming-soon">
        <div class="cs-icon">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h3>Coming Soon</h3>
        <p>Answers, care of <strong style="color:${cfg.primaryColor}">${cfg.companyName}</strong>.<br/>This project's liaison is being configured.</p>
      </div>
      <div id="lbkh-widget-footer">Powered by LBKH Liaison</div>
    `}
  `;
  document.body.appendChild(panel);

  // --- Toggle logic ---
  let isOpen = false;
  function togglePanel() {
    isOpen = !isOpen;
    panel.classList.toggle('open', isOpen);
    btn.innerHTML = isOpen
      ? `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    if (isOpen && cfg.isLive && !hasGreeted) greet();
  }
  btn.addEventListener('click', togglePanel);
  document.getElementById('lbkh-widget-close')?.addEventListener('click', togglePanel);

  if (!cfg.isLive) return; // No chat logic needed for coming-soon mode

  // --- Chat logic ---
  const messagesEl = document.getElementById('lbkh-widget-messages');
  const inputEl = document.getElementById('lbkh-widget-input');
  const sendEl = document.getElementById('lbkh-widget-send');
  let isLoading = false;
  let hasGreeted = false;
  const history = [];

  function appendMsg(text, role) {
    const div = document.createElement('div');
    div.className = `lbkh-msg ${role}`;
    // Simple markdown-ish: bold, links
    div.innerHTML = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\n/g, '<br>');
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'lbkh-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    div.id = 'lbkh-typing-indicator';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    document.getElementById('lbkh-typing-indicator')?.remove();
  }

  async function greet() {
    hasGreeted = true;
    showTyping();
    await new Promise(r => setTimeout(r, 800));
    removeTyping();
    appendMsg(`Hello! I'm the ${cfg.companyName} Project Liaison. I can answer questions about this project using verified source documents. What would you like to know?`, 'bot');
  }

  async function sendMessage(text) {
    if (!text.trim() || isLoading) return;
    isLoading = true;
    sendEl.disabled = true;
    inputEl.value = '';

    appendMsg(text, 'user');
    history.push({ role: 'user', parts: [{ text }] });

    showTyping();

    try {
      // Load source docs for context
      let sourceContext = '';
      if (cfg.workerUrl && cfg.secret && cfg.bucket) {
        try {
          const listRes = await fetch(`${cfg.workerUrl}/list?prefix=sources/`, {
            headers: { 'X-Upload-Secret': cfg.secret, 'X-Bucket': cfg.bucket },
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const docs = (listData.objects || []).slice(0, 5);
            for (const doc of docs) {
              try {
                const docRes = await fetch(`${cfg.workerUrl}/get/${encodeURIComponent(doc.key)}`, {
                  headers: { 'X-Upload-Secret': cfg.secret, 'X-Bucket': cfg.bucket },
                });
                if (docRes.ok) {
                  const blob = await docRes.blob();
                  const docText = await blob.text();
                  sourceContext += `\n\n[Document: ${doc.name}]\n${docText.slice(0, 1500)}`;
                }
              } catch { /* skip */ }
            }
          }
        } catch { /* skip */ }
      }

      const systemPrompt = `You are the ${cfg.companyName} Project Liaison. Answer questions about this project using ONLY the provided source documents. Be concise, factual, and cite sources. Never reveal full document contents. If you cannot answer from the documents, say so clearly.\n\nSource Documents:${sourceContext || '\n(No documents loaded yet.)'}`;

      const payload = {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: 'Understood. I will answer only from the provided source documents.' }] },
          ...history,
        ],
        generationConfig: { maxOutputTokens: 512, temperature: 0.3 },
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cfg.geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );

      removeTyping();

      if (!res.ok) throw new Error('AI request failed');
      const data = await res.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I was unable to generate a response. Please try again.';
      appendMsg(reply, 'bot');
      history.push({ role: 'model', parts: [{ text: reply }] });

      // Log anonymous Q&A
      if (cfg.workerUrl && cfg.secret && cfg.bucket) {
        try {
          await fetch(`${cfg.workerUrl}/log-qa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Upload-Secret': cfg.secret, 'X-Bucket': cfg.bucket },
            body: JSON.stringify({ question: text, answer: reply.slice(0, 500), timestamp: new Date().toISOString() }),
          });
        } catch { /* ignore */ }
      }
    } catch {
      removeTyping();
      appendMsg('I encountered an error. Please try again in a moment.', 'bot');
    } finally {
      isLoading = false;
      sendEl.disabled = false;
      inputEl.focus();
    }
  }

  sendEl?.addEventListener('click', () => sendMessage(inputEl.value));
  inputEl?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); } });
})();
