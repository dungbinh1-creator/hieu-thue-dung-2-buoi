/* Trợ lý Thuế WI.FINANCE: nút chat nổi, gọi /api/chat (Cloudflare Pages Function giữ khóa Gemini).
   Chỉ cần một dòng trong index.html: <script src="assets/chat-widget.js" defer></script> */
(() => {
  const API = "/api/chat";
  const ZALO_LINK = "https://zalo.me/g/3c1ladtyy6eyco7m2y2a";
  const STORE_KEY = "wf-tax-chat";
  const MAX_CHARS = 1500;
  const GREETING =
    "Chào bạn, mình là Trợ lý Thuế WI.FINANCE. Mình giải đáp kiến thức thuế cho người bán online, creator, freelancer và doanh nghiệp số. Bạn đang kinh doanh theo hình thức nào, và cần mình giải đáp vấn đề gì?";
  const SUGGESTIONS = [
    "Mình bán hàng trên TikTok Shop thì có phải đóng thuế không?",
    "Mình nhận tiền quảng cáo từ Google, có phải khai thuế không?",
    "Khi nào mình phải xuất hóa đơn điện tử?",
  ];
  const ERROR_TEXT =
    "Xin lỗi bạn, hệ thống đang bận nên mình chưa trả lời được. Bạn thử hỏi lại sau ít phút, hoặc vào nhóm Zalo của chương trình để hỏi chuyên viên.";

  const css = `
.wfc-launch{position:fixed;right:20px;bottom:20px;z-index:70;display:flex;align-items:center;gap:10px;height:56px;padding:0 20px 0 16px;border:0;border-radius:999px;cursor:pointer;
  font:600 15px/1 "Montserrat",system-ui,sans-serif;color:#fff;background:linear-gradient(135deg,var(--coban-2,#1E4FA3),var(--coban,#0B2A5B));
  box-shadow:0 0 0 1px rgba(200,155,60,.45),0 14px 34px -12px rgba(11,42,91,.7);transition:bottom .35s ease,transform .2s ease}
.wfc-launch:hover{transform:translateY(-2px)}
.wfc-launch:focus-visible,.wfc-panel :focus-visible{outline:3px solid var(--gold,#C89B3C);outline-offset:2px}
.wfc-launch svg{flex:none;color:var(--champagne,#E6C98A)}
.wfc-launch.lift{bottom:92px}
.wfc-panel{position:fixed;right:20px;bottom:20px;z-index:90;width:min(400px,calc(100vw - 32px));height:min(640px,calc(100vh - 40px));display:flex;flex-direction:column;
  background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 0 0 1px rgba(11,42,91,.08),0 30px 70px -20px rgba(11,42,91,.55);font:15px/1.55 "Montserrat",system-ui,sans-serif;color:var(--coban,#0B2A5B)}
.wfc-panel[hidden]{display:none}
.wfc-head{display:flex;align-items:center;gap:12px;padding:16px 16px 14px;color:#fff;background:linear-gradient(135deg,var(--coban,#0B2A5B),var(--night,#071D40))}
.wfc-ava{flex:none;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font:700 16px "Playfair Display",Georgia,serif;color:var(--coban,#0B2A5B);background:radial-gradient(circle at 30% 30%,#fff,var(--champagne,#E6C98A))}
.wfc-title{flex:1;min-width:0}
.wfc-title b{display:block;font:700 16px/1.3 "Playfair Display",Georgia,serif}
.wfc-title small{display:block;font-size:12px;color:rgba(234,241,251,.78)}
.wfc-close{flex:none;width:36px;height:36px;border:0;border-radius:50%;cursor:pointer;color:#fff;background:rgba(255,255,255,.12);font-size:22px;line-height:1}
.wfc-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--mist,#EEF4FA)}
.wfc-msg{max-width:88%;padding:11px 14px;border-radius:16px;white-space:normal;overflow-wrap:anywhere}
.wfc-msg p{margin:0 0 8px}.wfc-msg p:last-child{margin:0}
.wfc-msg ol{margin:4px 0 8px;padding-left:20px}.wfc-msg li{margin:2px 0}
.wfc-bot{align-self:flex-start;background:#fff;border-bottom-left-radius:6px;box-shadow:0 1px 0 rgba(11,42,91,.06)}
.wfc-user{align-self:flex-end;color:#fff;background:var(--coban-2,#1E4FA3);border-bottom-right-radius:6px}
.wfc-typing{display:inline-flex;gap:4px}.wfc-typing i{width:7px;height:7px;border-radius:50%;background:var(--gold,#C89B3C);animation:wfcDot 1s infinite ease-in-out}
.wfc-typing i:nth-child(2){animation-delay:.15s}.wfc-typing i:nth-child(3){animation-delay:.3s}
@keyframes wfcDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.wfc-chips{display:flex;flex-direction:column;gap:8px;align-items:flex-start}
.wfc-chip{border:1px solid rgba(200,155,60,.55);background:#fff;color:var(--coban,#0B2A5B);border-radius:14px;padding:8px 12px;font:500 13.5px/1.4 "Montserrat",system-ui,sans-serif;text-align:left;cursor:pointer}
.wfc-chip:hover{background:#FFF8EC}
.wfc-foot{padding:10px 12px 12px;border-top:1px solid rgba(11,42,91,.08);background:#fff}
.wfc-form{display:flex;gap:8px;align-items:flex-end}
.wfc-input{flex:1;min-width:0;resize:none;max-height:120px;border:1px solid rgba(11,42,91,.18);border-radius:14px;padding:10px 12px;font:15px/1.4 "Montserrat",system-ui,sans-serif;color:var(--coban,#0B2A5B)}
.wfc-input:focus{outline:none;border-color:var(--coban-2,#1E4FA3)}
.wfc-send{flex:none;width:44px;height:44px;border:0;border-radius:50%;cursor:pointer;display:grid;place-items:center;color:#fff;background:var(--cta,#D9622B)}
.wfc-send:disabled{opacity:.45;cursor:default}
.wfc-note{margin:6px 2px 8px;font-size:11.5px;color:#5B6B85}
.wfc-zalo{display:flex;justify-content:center;align-items:center;gap:8px;padding:9px 12px;border-radius:12px;font:600 13.5px "Montserrat",system-ui,sans-serif;color:var(--coban,#0B2A5B);text-decoration:none;background:linear-gradient(110deg,rgba(200,155,60,.16),rgba(230,201,138,.32))}
@media (max-width:640px){
  .wfc-launch{right:14px;bottom:14px;height:52px;padding:0 16px 0 14px;font-size:14px}
  .wfc-launch.lift{bottom:86px}
  .wfc-panel{inset:0;width:100%;height:100%;border-radius:0}
}
@media (prefers-reduced-motion:reduce){.wfc-launch,.wfc-typing i{transition:none;animation:none}}`;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/><path d="M8.5 10.5h7M8.5 13.5h4.5"/></svg>`;

  const launch = document.createElement("button");
  launch.type = "button";
  launch.className = "wfc-launch";
  launch.setAttribute("aria-label", "Mở trợ lý hỏi đáp thuế");
  launch.setAttribute("aria-expanded", "false");
  launch.innerHTML = `${icon}<span>Hỏi thuế</span>`;

  const panel = document.createElement("section");
  panel.className = "wfc-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Trợ lý Thuế WI.FINANCE");
  panel.innerHTML = `
    <div class="wfc-head">
      <span class="wfc-ava" aria-hidden="true">W</span>
      <div class="wfc-title"><b>Trợ lý Thuế WI.FINANCE</b><small>Thông tin tham khảo, không thay tư vấn thuế</small></div>
      <button type="button" class="wfc-close" aria-label="Đóng khung chat">&times;</button>
    </div>
    <div class="wfc-body" aria-live="polite"></div>
    <div class="wfc-foot">
      <form class="wfc-form">
        <textarea class="wfc-input" rows="1" maxlength="${MAX_CHARS}" placeholder="Nhập câu hỏi về thuế..." aria-label="Câu hỏi của bạn"></textarea>
        <button type="submit" class="wfc-send" aria-label="Gửi câu hỏi"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </form>
      <p class="wfc-note">Không gửi mã số thuế, CCCD, số tài khoản trong khung chat.</p>
      <a class="wfc-zalo" href="${ZALO_LINK}" target="_blank" rel="noopener">Hỏi chuyên viên qua nhóm Zalo</a>
    </div>`;

  document.body.append(launch, panel);

  const body = panel.querySelector(".wfc-body");
  const form = panel.querySelector(".wfc-form");
  const input = panel.querySelector(".wfc-input");
  const send = panel.querySelector(".wfc-send");
  const closeBtn = panel.querySelector(".wfc-close");

  let history = [];
  let busy = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
    if (Array.isArray(saved)) history = saved.filter((m) => m && typeof m.text === "string" && (m.role === "user" || m.role === "model"));
  } catch {}
  const save = () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-30))); } catch {}
  };

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // Định dạng tối thiểu sau khi đã escape: in đậm, danh sách đánh số, đoạn văn.
  function render(text) {
    const lines = escapeHtml(text.replace(/\*\*\s*$/, "")).split(/\r?\n/);
    let html = "";
    let inList = false;
    let para = [];
    const flushPara = () => { if (para.length) { html += `<p>${para.join("<br>")}</p>`; para = []; } };
    for (const raw of lines) {
      const line = raw.trim().replace(/^#+\s*/, "");
      const item = line.match(/^\d+[.)]\s+(.*)$/) || line.match(/^[-*•]\s+(.*)$/);
      if (item) {
        flushPara();
        if (!inList) { html += "<ol>"; inList = true; }
        html += `<li>${item[1]}</li>`;
      } else {
        if (inList) { html += "</ol>"; inList = false; }
        if (line) para.push(line); else flushPara();
      }
    }
    if (inList) html += "</ol>";
    flushPara();
    return html.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  }

  function addBubble(role, text) {
    const el = document.createElement("div");
    el.className = `wfc-msg ${role === "user" ? "wfc-user" : "wfc-bot"}`;
    if (role === "user") el.textContent = text; else el.innerHTML = render(text);
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  function renderAll() {
    body.innerHTML = "";
    addBubble("model", GREETING);
    if (!history.length) {
      const chips = document.createElement("div");
      chips.className = "wfc-chips";
      for (const q of SUGGESTIONS) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "wfc-chip";
        b.textContent = q;
        b.addEventListener("click", () => ask(q));
        chips.appendChild(b);
      }
      body.appendChild(chips);
    }
    for (const m of history) addBubble(m.role, m.text);
  }

  function setBusy(v) {
    busy = v;
    send.disabled = v;
    input.disabled = v;
  }

  async function ask(text) {
    text = text.trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    body.querySelector(".wfc-chips")?.remove();
    history.push({ role: "user", text });
    save();
    addBubble("user", text);
    setBusy(true);
    const bubble = addBubble("model", "");
    bubble.innerHTML = `<span class="wfc-typing" aria-label="Đang trả lời"><i></i><i></i><i></i></span>`;

    let answer = "";
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12) }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        bubble.innerHTML = render(answer);
        body.scrollTop = body.scrollHeight;
      }
      answer = answer.trim();
      if (!answer) throw new Error("empty");
      history.push({ role: "model", text: answer });
      save();
    } catch {
      // Câu hỏi lỗi không giữ lại trong lịch sử để lượt sau gửi đúng thứ tự.
      history.pop();
      save();
      bubble.innerHTML = render(answer ? answer + "\n\n" + ERROR_TEXT : ERROR_TEXT);
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  function open() {
    panel.hidden = false;
    launch.hidden = true;
    launch.setAttribute("aria-expanded", "true");
    if (!body.childElementCount) renderAll();
    body.scrollTop = body.scrollHeight;
    input.focus();
  }
  function close() {
    panel.hidden = true;
    launch.hidden = false;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }

  launch.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value;
    input.value = "";
    input.style.height = "";
    ask(q);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); }
  });
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  // Đẩy nút chat lên khi thanh đăng ký dính đáy (#sticky.show) đang hiện trên điện thoại.
  const sticky = document.getElementById("sticky");
  if (sticky) {
    const sync = () => {
      const shown = sticky.classList.contains("show") && getComputedStyle(sticky).display !== "none";
      launch.classList.toggle("lift", shown);
    };
    new MutationObserver(sync).observe(sticky, { attributes: true, attributeFilter: ["class"] });
    addEventListener("resize", sync, { passive: true });
    sync();
  }
})();
