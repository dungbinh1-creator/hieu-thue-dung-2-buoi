/* Trợ lý Thuế WI.FINANCE: nút chat nổi, gọi /api/chat (Cloudflare Pages Function giữ khóa Gemini).
   Chỉ cần một dòng trong index.html: <script src="assets/chat-widget.js" defer></script> */
(() => {
  // Gọi Worker (chạy vùng Mỹ) vì Gemini chặn máy chủ Cloudflare ở Hồng Kông.
  const API = "https://wifinance-tax-chat.dungbinh1.workers.dev";
  const HOTLINE = "0948 387 418";
  const SESSION_KEY = "wf-tax-session";
  const AVATAR = "assets/wifinance-icon.jpg";
  const STORE_KEY = "wf-tax-chat";
  const MAX_CHARS = 1500;
  const GREETING =
    "Chào bạn, mình là Trợ lý Thuế WI.FINANCE. Mình giải đáp kiến thức thuế cho người bán online, creator, freelancer và doanh nghiệp số. Bạn đang kinh doanh theo hình thức nào, và cần mình giải đáp vấn đề gì?";
  const SUGGESTIONS = [
    "Bán hàng trên TikTok Shop có phải đóng thuế không?",
    "Nhận tiền quảng cáo Google có phải khai thuế không?",
    "Khi nào phải xuất hóa đơn điện tử?",
  ];
  const ERROR_TEXT =
    "Xin lỗi bạn, hệ thống đang bận nên mình chưa trả lời được. Bạn thử hỏi lại sau ít phút, hoặc gọi hotline 0948 387 418 để được chuyên viên hỗ trợ.";

  const css = `
.wfc,.wfc *{box-sizing:border-box}
.wfc{--wc-ink:var(--coban,#0B2A5B);--wc-blue:var(--coban-2,#1E4FA3);--wc-gold:var(--gold,#C89B3C);--wc-cham:var(--champagne,#E6C98A);--wc-cta:var(--cta,#D9622B);--wc-mist:var(--mist,#EEF4FA);--wc-muted:#5B6B85;--wc-line:rgba(11,42,91,.10);
  font:14.5px/1.55 "Montserrat",system-ui,-apple-system,sans-serif;color:var(--wc-ink)}
.wfc button{font:inherit}
.wfc :focus-visible{outline:2px solid var(--wc-gold);outline-offset:2px}

/* Nút mở */
.wfc-launch{position:fixed;right:20px;bottom:20px;z-index:70;display:flex;align-items:center;gap:10px;height:52px;padding:0 18px 0 6px;border:0;border-radius:999px;cursor:pointer;
  color:#fff;background:var(--wc-ink);box-shadow:0 0 0 1px rgba(200,155,60,.5),0 12px 30px -10px rgba(11,42,91,.6);transition:bottom .35s ease,transform .2s ease,box-shadow .2s ease}
.wfc-launch:hover{transform:translateY(-2px);box-shadow:0 0 0 1px var(--wc-gold),0 16px 36px -10px rgba(11,42,91,.7)}
.wfc-launch img{width:40px;height:40px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:0 0 0 2px var(--wc-cham)}
.wfc-launch span{font-weight:600;font-size:14.5px;letter-spacing:.01em}
.wfc-launch.lift{bottom:88px}
.wfc-launch[hidden]{display:none}

/* Khung chat */
.wfc-panel{position:fixed;right:20px;bottom:20px;z-index:90;width:390px;max-width:calc(100vw - 32px);height:min(720px,calc(100vh - 32px));margin:0;padding:0;display:flex;flex-direction:column;
  background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 0 0 1px var(--wc-line),0 28px 64px -18px rgba(11,42,91,.45);
  transform-origin:bottom right;animation:wfcIn .22s cubic-bezier(.2,.7,.2,1)}
.wfc-panel[hidden]{display:none}
@keyframes wfcIn{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}

.wfc-head{margin:0;display:flex;align-items:center;gap:12px;padding:14px 12px 14px 16px;color:#fff;background:var(--wc-ink);border-bottom:2px solid var(--wc-gold)}
.wfc-head img{flex:none;width:40px;height:40px;border-radius:50%;object-fit:cover;background:#fff}
.wfc-title{flex:1;min-width:0}
.wfc-title b{display:block;font:700 15.5px/1.3 "Playfair Display",Georgia,serif;letter-spacing:.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wfc-title small{display:flex;align-items:center;gap:6px;font-size:12px;color:rgba(234,241,251,.75);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wfc-title small::before{content:"";flex:none;width:7px;height:7px;border-radius:50%;background:#3FC380;box-shadow:0 0 0 3px rgba(63,195,128,.2)}
.wfc-icon{flex:none;width:34px;height:34px;border:0;border-radius:10px;cursor:pointer;display:grid;place-items:center;color:rgba(255,255,255,.85);background:transparent;transition:background .15s}
.wfc-icon:hover{background:rgba(255,255,255,.12);color:#fff}

.wfc-body{flex:1;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:14px;background:#F7F9FC;scroll-behavior:smooth}
.wfc-body::-webkit-scrollbar{width:6px}.wfc-body::-webkit-scrollbar-thumb{background:rgba(11,42,91,.15);border-radius:3px}
.wfc-row{display:flex;gap:8px;align-items:flex-end;max-width:100%}
.wfc-row.me{justify-content:flex-end}
.wfc-row > img{flex:none;width:26px;height:26px;border-radius:50%;object-fit:cover;background:#fff;box-shadow:0 0 0 1px var(--wc-line)}
.wfc-msg{max-width:84%;padding:10px 14px;border-radius:14px;overflow-wrap:anywhere}
.wfc-msg p{margin:0 0 8px}.wfc-msg p:last-child{margin:0}
.wfc-msg ol{margin:4px 0 8px;padding-left:20px}.wfc-msg li{margin:3px 0}.wfc-msg li::marker{color:var(--wc-gold);font-weight:700}
.wfc-msg b{font-weight:700;color:var(--wc-ink)}
.wfc-bot{background:#fff;border:1px solid var(--wc-line);border-bottom-left-radius:4px}
.wfc-me{color:#fff;background:var(--wc-blue);border-bottom-right-radius:4px}
.wfc-err{border-color:rgba(217,98,43,.35);background:#FFF8F3}
.wfc-typing{display:inline-flex;gap:4px;padding:4px 2px}.wfc-typing i{width:6px;height:6px;border-radius:50%;background:var(--wc-gold);animation:wfcDot 1s infinite ease-in-out}
.wfc-typing i:nth-child(2){animation-delay:.15s}.wfc-typing i:nth-child(3){animation-delay:.3s}
@keyframes wfcDot{0%,80%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}

.wfc-sugg{margin:2px 0 0 34px;display:flex;flex-direction:column;gap:6px}
.wfc-sugg small{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--wc-muted)}
.wfc-chip{align-self:flex-start;border:1px solid rgba(30,79,163,.22);background:#fff;color:var(--wc-blue);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:500;line-height:1.35;text-align:left;cursor:pointer;transition:background .15s,border-color .15s}
.wfc-chip:hover{background:var(--wc-mist);border-color:var(--wc-blue)}

.wfc-foot{margin:0;padding:10px 12px;border-top:1px solid var(--wc-line);background:#fff}
.wfc-form{display:flex;align-items:flex-end;gap:6px;padding:5px 5px 5px 14px;border:1px solid rgba(11,42,91,.16);border-radius:14px;background:#fff;transition:border-color .15s,box-shadow .15s}
.wfc-form:focus-within{border-color:var(--wc-blue);box-shadow:0 0 0 3px rgba(30,79,163,.12)}
.wfc-input{flex:1;min-width:0;resize:none;border:0;outline:none;background:transparent;max-height:110px;padding:7px 0;font:14.5px/1.45 "Montserrat",system-ui,sans-serif;color:var(--wc-ink)}
.wfc-input::placeholder{color:#8A97AD}
.wfc .wfc-input:focus-visible{outline:none}
.wfc-send{flex:none;width:38px;height:38px;border:0;border-radius:10px;cursor:pointer;display:grid;place-items:center;color:#fff;background:var(--wc-cta);transition:opacity .15s,transform .15s}
.wfc-send:hover:not(:disabled){transform:translateY(-1px)}
.wfc-send:disabled{opacity:.35;cursor:default}
.wfc-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:8px;font-size:11.5px;color:var(--wc-muted)}
.wfc-hotline{flex:none;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:700;color:#fff;background:var(--wc-cta);text-decoration:none;white-space:nowrap;transition:transform .15s}
.wfc-hotline:hover{transform:translateY(-1px)}

@media (max-width:640px){
  .wfc-launch{right:14px;bottom:14px;height:48px;padding:0 16px 0 5px}
  .wfc-launch img{width:38px;height:38px}
  .wfc-launch.lift{bottom:84px}
  .wfc-panel{inset:0;width:100%;max-width:none;height:100%;border-radius:0;animation:none}
  .wfc-head{padding-top:calc(14px + env(safe-area-inset-top))}
  .wfc-foot{padding-bottom:calc(10px + env(safe-area-inset-bottom))}
  .wfc-input{font-size:16px}
  .wfc-title b{font-size:14.5px}
  .wfc-head{gap:10px;padding-left:12px;padding-right:8px}
}
@media (prefers-reduced-motion:reduce){.wfc-panel,.wfc-typing i{animation:none}.wfc-launch,.wfc-chip,.wfc-send{transition:none}}`;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const svg = {
    refresh: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>`,
    close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    phone: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z"/></svg>`,
  };

  const root = document.createElement("div");
  root.className = "wfc";
  root.innerHTML = `
    <button type="button" class="wfc-launch" aria-label="Mở Trợ lý Thuế WI.FINANCE" aria-expanded="false">
      <img src="${AVATAR}" alt=""><span>Hỏi đáp thuế</span>
    </button>
    <div class="wfc-panel" role="dialog" aria-label="Trợ lý Thuế WI.FINANCE" hidden>
      <div class="wfc-head">
        <img src="${AVATAR}" alt="">
        <div class="wfc-title"><b>Trợ lý Thuế WI.FINANCE</b><small>Trả lời tự động, tham khảo</small></div>
        <button type="button" class="wfc-icon wfc-reset" aria-label="Bắt đầu cuộc trò chuyện mới" title="Cuộc trò chuyện mới">${svg.refresh}</button>
        <button type="button" class="wfc-icon wfc-close" aria-label="Đóng khung chat" title="Đóng">${svg.close}</button>
      </div>
      <div class="wfc-body" aria-live="polite"></div>
      <div class="wfc-foot">
        <form class="wfc-form">
          <textarea class="wfc-input" rows="1" maxlength="${MAX_CHARS}" placeholder="Nhập câu hỏi về thuế..." aria-label="Câu hỏi của bạn"></textarea>
          <button type="submit" class="wfc-send" aria-label="Gửi câu hỏi" disabled>${svg.send}</button>
        </form>
        <div class="wfc-meta">
          <span>Không gửi MST, CCCD, số tài khoản.</span>
          <a class="wfc-hotline" href="tel:${HOTLINE.replace(/\s/g, "")}" aria-label="Gọi hotline ${HOTLINE}">${svg.phone}Hotline ${HOTLINE}</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);

  const launch = root.querySelector(".wfc-launch");
  const panel = root.querySelector(".wfc-panel");
  const body = root.querySelector(".wfc-body");
  const form = root.querySelector(".wfc-form");
  const input = root.querySelector(".wfc-input");
  const send = root.querySelector(".wfc-send");

  let history = [];
  let busy = false;
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]");
    if (Array.isArray(saved)) history = saved.filter((m) => m && typeof m.text === "string" && (m.role === "user" || m.role === "model"));
  } catch {}
  // Mã phiên gom các câu hỏi cùng một cuộc trò chuyện khi lưu về Google Sheet.
  const newSession = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  let session = "";
  try { session = sessionStorage.getItem(SESSION_KEY) || ""; } catch {}
  const setSession = (v) => { session = v; try { sessionStorage.setItem(SESSION_KEY, v); } catch {} };
  if (!session) setSession(newSession());
  const save = () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-30))); } catch {}
  };

  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  // Định dạng tối thiểu sau khi đã escape: in đậm, danh sách, đoạn văn.
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

  const scrollDown = () => { body.scrollTop = body.scrollHeight; };

  function addMessage(role, text) {
    const row = document.createElement("div");
    row.className = `wfc-row${role === "user" ? " me" : ""}`;
    const msg = document.createElement("div");
    msg.className = `wfc-msg ${role === "user" ? "wfc-me" : "wfc-bot"}`;
    if (role === "user") msg.textContent = text; else msg.innerHTML = render(text);
    if (role !== "user") {
      const ava = document.createElement("img");
      ava.src = AVATAR;
      ava.alt = "";
      row.appendChild(ava);
    }
    row.appendChild(msg);
    body.appendChild(row);
    scrollDown();
    return msg;
  }

  function renderAll() {
    body.innerHTML = "";
    addMessage("model", GREETING);
    if (!history.length) {
      const box = document.createElement("div");
      box.className = "wfc-sugg";
      box.innerHTML = "<small>Câu hỏi gợi ý</small>";
      for (const q of SUGGESTIONS) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "wfc-chip";
        b.textContent = q;
        b.addEventListener("click", () => ask(q));
        box.appendChild(b);
      }
      body.appendChild(box);
    }
    for (const m of history) addMessage(m.role, m.text);
  }

  const syncSend = () => { send.disabled = busy || !input.value.trim(); };
  function setBusy(v) {
    busy = v;
    input.disabled = v;
    syncSend();
  }

  async function ask(text) {
    text = text.trim().slice(0, MAX_CHARS);
    if (!text || busy) return;
    body.querySelector(".wfc-sugg")?.remove();
    history.push({ role: "user", text });
    save();
    addMessage("user", text);
    setBusy(true);
    const msg = addMessage("model", "");
    msg.innerHTML = `<span class="wfc-typing" aria-label="Đang trả lời"><i></i><i></i><i></i></span>`;

    let answer = "";
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), session }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        msg.innerHTML = render(answer);
        scrollDown();
      }
      answer = answer.trim();
      if (!answer) throw new Error("empty");
      history.push({ role: "model", text: answer });
      save();
    } catch {
      // Câu hỏi lỗi không giữ lại trong lịch sử để lượt sau gửi đúng thứ tự.
      history.pop();
      save();
      msg.classList.add("wfc-err");
      msg.innerHTML = render(answer ? answer + "\n\n" + ERROR_TEXT : ERROR_TEXT);
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
    scrollDown();
    input.focus();
  }
  function close() {
    panel.hidden = true;
    launch.hidden = false;
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }
  function reset() {
    if (busy) return;
    history = [];
    save();
    setSession(newSession());
    renderAll();
    input.focus();
  }

  launch.addEventListener("click", open);
  root.querySelector(".wfc-close").addEventListener("click", close);
  root.querySelector(".wfc-reset").addEventListener("click", reset);
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
    input.style.height = Math.min(input.scrollHeight, 110) + "px";
    syncSend();
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
