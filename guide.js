// Step-by-step run guide shown after a prompt is built (styles.html). Progress is kept per browser.
(function () {
  const OS = {
    win: {
      name: 'Windows',
      term: 'PowerShell را باز کن (Start → بنویس PowerShell → Enter). لازم نیست Administrator باشد.',
      pre: 'winget install -e --id Git.Git\nwinget install -e --id OpenJS.NodeJS.LTS\nwinget install -e --id Python.Python.3.12\nwinget install -e --id Gyan.FFmpeg',
      claude: 'irm https://claude.ai/install.ps1 | iex',
      folder: 'mkdir $HOME\\lab-films; cd $HOME\\lab-films; claude',
    },
    mac: {
      name: 'macOS',
      term: 'Terminal را باز کن (Cmd+Space → Terminal).',
      pre: 'brew install git node python@3.12 ffmpeg',
      claude: 'curl -fsSL https://claude.ai/install.sh | bash',
      folder: 'mkdir -p ~/lab-films && cd ~/lab-films && claude',
    },
  };
  const check = 'git --version\nnode --version\npython --version\nffmpeg -version';
  const plugin = 'claude plugin marketplace add lemomo-ai/lemo-opuscar\nclaude plugin install lemo-opuscar@lemolab';
  const steps = os => [
    { once: 1, t: 'ترمینال را باز کن', d: OS[os].term },
    { once: 1, t: 'پیش‌نیازها را نصب کن', d: 'Git، Node 20+، Python 3.11+ و ffmpeg 7+. اگر قبلاً داری، رد شو. بعد از نصب ترمینال را ببند و دوباره باز کن.', c: OS[os].pre },
    { once: 1, t: 'نصب را چک کن', d: 'هر چهار دستور باید نسخه نشان بدهند (Node ≥ 20، ffmpeg ≥ 7). اگر یکی «not recognized» گفت، ترمینال را دوباره باز کن یا همان مورد را دوباره نصب کن.', c: check },
    { once: 1, t: 'Claude Code را نصب کن', d: 'بعد ترمینال را ببند و باز کن و <code>claude --version</code> را بزن. اولین اجرای <code>claude</code> برای ورود به حساب Claude مرورگر را باز می‌کند.', c: OS[os].claude },
    { once: 1, t: 'پلاگین Lemo-Opuscar را نصب کن', d: 'در ترمینال معمولی (نه داخل Claude). یک‌بار برای همیشه.', c: plugin },
    { t: 'پوشه‌ی فیلم را بساز و Claude را باز کن', d: 'Claude Code داخل این پوشه باز می‌شود. اگر پرسید «Do you trust this folder?» بزن Yes.', c: OS[os].folder },
    { t: 'سطح تلاش را بالا ببر', d: 'داخل Claude Code بنویس و Enter بزن:', c: '/effort high' },
    { t: 'پرامپت را بچسبان', d: 'پرامپت را کپی کن و داخل Claude Code بچسبان (Windows: Ctrl+V یا کلیک راست) و Enter بزن.', prompt: 1 },
    { t: 'به سؤال‌های اول جواب بده', d: 'Claude یک‌بار چند سؤال می‌پرسد (زبان، صدا/موسیقی، چیزهای جاافتاده روی سیستم). اگر گفت ابزاری کم است، اجازه بده نصبش کند. وقتی برای اجرای دستوری اجازه خواست، بخوان و Yes بزن.' },
    { t: 'استوری‌بورد را تأیید کن', d: 'تصاویر استوری‌بورد سبک اول را نشان می‌دهد و صبر می‌کند. اگر خوب بود بنویس «OK ادامه بده»، وگرنه بگو چه چیزی عوض شود.' },
    { t: 'صبر کن تا رندر تمام شود', d: 'هر فیلم بسته به سبک و GPU حدود ۳۰ تا ۶۰ دقیقه. ترمینال را نبند؛ کامپیوتر نباید به خواب برود.' },
    { t: 'خروجی را بردار', d: 'فایل‌ها در <code>lab-films\\films\\&lt;نام پروژه&gt;\\</code> هستند: یک mp4 برای هر سبک، ریل پشت‌سرهم، گرید مقایسه و contact sheet. Claude در پایان مسیر دقیق را می‌گوید.' },
  ];
  const KEY = 'lab_guide_v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} };
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function copy(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = 'کپی شد ✓'; setTimeout(() => (btn.textContent = o), 1400); };
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(done).catch(() => { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove(); });
  }
  window.renderGuide = function (box, getPrompt) {
    const st = load(); st.os = st.os || (/Mac/.test(navigator.platform) ? 'mac' : 'win'); st.done = st.done || {}; st.path = st.path || 'local';
    const draw = () => {
      const S = steps(st.os), n = S.filter((_, i) => st.done[st.os + i]).length;
      const local = S.map((s, i) => {
        const id = st.os + i, ok = !!st.done[id];
        return `<li class="gs${ok ? ' ok' : ''}${s.once ? ' once' : ''}">
          <label class="gh"><input type="checkbox" data-i="${id}"${ok ? ' checked' : ''}><b>${i + 1}. ${s.t}</b>${s.once ? '<small>یک‌بار</small>' : ''}</label>
          <div class="gb"><p>${s.d}</p>${s.c ? `<pre dir="ltr">${esc(s.c)}</pre><button class="gc" data-c="${i}">کپی دستور</button>` : ''}${s.prompt ? '<button class="gc" data-p="1">کپی پرامپت</button>' : ''}</div></li>`; }).join('');
      const cloud = `<ol class="gl">
        <li class="gs"><b>1. پرامپت را کپی کن</b><div class="gb"><button class="gc" data-p="1">کپی پرامپت</button></div></li>
        <li class="gs"><b>2. یک گفتگوی تازه در Claude باز کن</b><div class="gb"><p>در claude.ai، داخل پروژه‌ی CLAUDE REPOS.</p></div></li>
        <li class="gs"><b>3. پرامپت را بچسبان و بفرست</b><div class="gb"><p>Claude در محیط ابری کد فیلم‌ها را می‌نویسد، رندر می‌کند و mp4 را همان‌جا می‌فرستد.</p></div></li>
        <li class="gs"><b>4. محدودیت را بدان</b><div class="gb"><p>بدون GPU: سبک‌های WebGL ساده‌تر و کندتر، و معمولاً بدون صدا. برای تست ایده و مقایسه‌ی سبک‌ها کافی است؛ برای نسخه‌ی نهایی راه «روی سیستم خودم».</p></div></li></ol>`;
      box.innerHTML = `<div class="gt"><b>حالا چطور فیلم ساخته شود؟</b><p>این سایت فقط پرامپت را می‌سازد. فیلم را Claude می‌سازد. یک راه را انتخاب کن و قدم‌به‌قدم جلو برو.</p></div>
        <div class="gtabs"><button data-path="local" class="${st.path === 'local' ? 'on' : ''}">روی سیستم خودم (کیفیت کامل)</button><button data-path="cloud" class="${st.path === 'cloud' ? 'on' : ''}">بدون نصب، در Claude (تست سریع)</button></div>
        ${st.path === 'local' ? `<div class="gtabs os">${Object.keys(OS).map(k => `<button data-os="${k}" class="${st.os === k ? 'on' : ''}">${OS[k].name}</button>`).join('')}<span class="gp">${n} از ${S.length} انجام شده</span>${n ? '<button data-reset="1" class="gr">از نو</button>' : ''}</div>
        <div class="gbar"><i style="width:${(n / S.length) * 100}%"></i></div><ol class="gl">${local}</ol>
        <p class="gn">قدم‌های «یک‌بار» را فقط بار اول انجام می‌دهی؛ برای فیلم‌های بعدی از قدم ۶ شروع کن (تیک‌ها در همین مرورگر می‌مانند).</p>` : cloud}`;
      box.querySelectorAll('[data-i]').forEach(c => c.onchange = () => { st.done[c.dataset.i] = c.checked; save(st); draw(); });
      box.querySelectorAll('[data-os]').forEach(b => b.onclick = () => { st.os = b.dataset.os; save(st); draw(); });
      box.querySelectorAll('[data-path]').forEach(b => b.onclick = () => { st.path = b.dataset.path; save(st); draw(); });
      box.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => { Object.keys(st.done).forEach(k => k.startsWith(st.os) && delete st.done[k]); save(st); draw(); });
      box.querySelectorAll('[data-c]').forEach(b => b.onclick = () => copy(steps(st.os)[+b.dataset.c].c, b));
      box.querySelectorAll('[data-p]').forEach(b => b.onclick = () => copy(getPrompt(), b));
    };
    draw(); box.hidden = false;
  };
})();
