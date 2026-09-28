/* ============================================================
   观易 · 易经研习 —— 应用逻辑
   功能：hash 路由 / 六十四卦研读 / 爻位程序化分析 / 起卦解卦 /
        入门研习文章 / 名词速查 / 主题切换
   ============================================================ */
"use strict";

/* ---------------- 工具函数 ---------------- */
const $ = (sel) => document.querySelector(sel);
const app = () => document.getElementById("app");

/* 三爻 bits → 八卦符号（自下而上） */
const TRIGRAM_BY_BITS = {
  "000": "☷", "001": "☶", "010": "☵", "011": "☴",
  "100": "☳", "101": "☲", "110": "☱", "111": "☰"
};

/* 八卦名称（用于显示"下卦"） */
const trigramInfo = (sym) => TRIGRAMS[sym] || { name: "?", nature: "?", virtue: "?", family: "?", dir: "?" };

/* 查找卦：按 id 或 bits */
const hexById = (id) => HEXAGRAMS.find((h) => h.id === Number(id));
const hexByBits = (bits) => HEXAGRAMS.find((h) => h.bits === bits);

/* 阴阳翻转 / 上下颠倒 */
const flipBits = (bits) => bits.split("").map((b) => (b === "1" ? "0" : "1")).join("");
const reverseBits = (bits) => bits.split("").reverse().join("");

/* 渲染卦画（爻堆）：bits 自下而上；moving 为动爻索引集合 */
function yaoStackHTML(bits, moving = [], opts = {}) {
  const cls = opts.cls ? " " + opts.cls : "";
  let html = `<span class="yao-stack${cls}" aria-hidden="true">`;
  for (let i = 0; i < 6; i++) {
    const yin = bits[5 - i] === "0"; // 显示从上到下
    const idx = 5 - i; // 爻位索引（0=初）
    const mv = moving.includes(idx) ? " moving" : "";
    html += `<span class="yao${yin ? " yin" : ""}${mv}"></span>`;
  }
  html += `</span>`;
  return html;
}

/* 单个爻渲染（小号） */
function yaoMiniHTML(yin, moving) {
  return `<span class="yao${yin ? " yin" : ""}${moving ? " moving" : ""}"></span>`;
}

/* 转义 */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* 三才 / 爻位名称 */
const POS_NAME = ["初", "二", "三", "四", "五", "上"];
const POS_CAI = ["地位", "地位", "人位", "人位", "天位", "天位"];

/* 爻位程序化分析：返回分析条目 */
function analyzeLine(hex, idx) {
  const pos = idx + 1;
  const val = hex.bits[idx] === "1" ? "阳" : "阴";
  const yang = hex.bits[idx] === "1";
  const items = [];
  // 三才
  items.push(`${POS_CAI[idx]}（${POS_NAME[idx]}爻）`);
  // 当位
  const proper = (yang && pos % 2 === 1) || (!yang && pos % 2 === 0);
  items.push(proper ? "当位（正）" : "不当位");
  // 中正
  if (pos === 2 || pos === 5) {
    items.push("居中（二五为中）");
    if ((pos === 5 && yang) || (pos === 2 && !yang)) items.push("中正");
  }
  // 承（在下）与乘（在上）
  if (idx > 0) {
    const below = hex.bits[idx - 1] === "1" ? "阳" : "阴";
    if (!yang && below === "阳") items.push("乘刚（阴乘阳，多不利）");
    else items.push(`承${below}爻`);
  } else {
    items.push("全卦根基");
  }
  if (idx < 5) {
    const above = hex.bits[idx + 1] === "1" ? "阳" : "阴";
    items.push(`下临${above}爻`);
  }
  // 应
  const pair = idx < 3 ? idx + 3 : idx - 3;
  const pairVal = hex.bits[pair] === "1" ? "阳" : "阴";
  if (val !== pairVal) items.push(`与${POS_NAME[pair]}爻${pairVal}相应（阴阳相应）`);
  else items.push(`与${POS_NAME[pair]}爻同性（无应）`);
  // 上爻/初爻特殊说明
  if (pos === 6) items.push("卦之终结，贵在知止");
  if (pos === 1) items.push("卦之开端，贵在审慎");
  return items.join(" · ");
}

/* 错卦 / 综卦 */
function relationsOf(hex) {
  const cuo = hexByBits(flipBits(hex.bits));
  const zong = hexByBits(reverseBits(hex.bits));
  return { cuo, zong };
}

/* ---------------- 主题切换 ---------------- */
function bindTheme() {
  const btn = document.querySelector("[data-theme-toggle]");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("iching-theme", next); } catch (e) {}
  });
}

/* ---------------- 导航激活 ---------------- */
function setActiveNav(route) {
  document.querySelectorAll(".site-nav-menu a").forEach((a) => {
    const r = a.dataset.route;
    a.classList.toggle("active", route.startsWith(r === "home" ? "home" : r));
  });
}

/* ---------------- Reveal 动效 ---------------- */
function bindReveal(root) {
  const els = (root || document).querySelectorAll(".reveal");
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  els.forEach((el) => io.observe(el));
}

/* 回到顶部 */
function bindBackTop() {
  const btn = document.querySelector("[data-backtop]");
  if (!btn) return;
  const onScroll = () => btn.classList.toggle("show", window.scrollY > 500);
  window.addEventListener("scroll", onScroll, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  onScroll();
}

/* 跳转顶部 */
function scrollTop() { window.scrollTo({ top: 0 }); }

/* ============================================================
   页面渲染
   ============================================================ */

/* ---------- 首页 ---------- */
function renderHome() {
  const featured = [1, 11, 15, 24, 29, 64].map((id) => HEXAGRAMS[id - 1]);
  return `
  <section class="hero glass page">
    <div class="hero-copy">
      <span class="kicker">群经之首 · 大道之源</span>
      <h1>观乎天文，以察时变<br /><span class="text-gradient">观乎人文，以化成天下</span></h1>
      <p class="lead">《易经》以阴阳之变囊括宇宙人生：六十四卦，三百八十四爻，穷理尽性，以至于命。这里是为你准备的一处研习之所——读原文、究义理、起卦玩占、由浅入深。</p>
      <div class="hero-actions">
        <a href="#/hexagrams" class="btn btn-primary">开始读经</a>
        <a href="#/divination" class="btn">在线起卦</a>
        <a href="#/learn" class="btn btn-ghost">入门研习</a>
      </div>
      <p class="hero-note">易有三义：变易、不易、简易 —— 一阴一阳之谓道。</p>
    </div>
    <div class="taiji-wrap">
      <div class="taiji-glow"></div>
      <svg class="taiji-big" viewBox="0 0 200 200" aria-hidden="true">
        <circle class="ring" cx="100" cy="100" r="96" fill="none" stroke="var(--gold)" stroke-width="1.4" opacity=".6"/>
        <circle cx="100" cy="100" r="92" fill="#12100c" stroke="var(--gold)" stroke-width="1.2" opacity=".85"/>
        <g class="spin">
          <path d="M100 8 A92 92 0 0 1 100 192 A46 46 0 0 0 100 100 A46 46 0 0 1 100 8 Z" fill="var(--cinnabar)"/>
          <path d="M100 8 A92 92 0 0 0 100 192 A46 46 0 0 1 100 100 A46 46 0 0 0 100 8 Z" fill="var(--paper)"/>
          <circle cx="100" cy="42" r="10" fill="var(--paper)"/>
          <circle cx="100" cy="158" r="10" fill="var(--cinnabar)"/>
        </g>
      </svg>
      <div class="taiji-caption">易 · 太极</div>
    </div>
  </section>

  <section class="info-strip page">
    <div class="glass info-card reveal"><div class="ic-num">64</div><div class="ic-label">卦 · 周流六虚，弥纶天地</div></div>
    <div class="glass info-card reveal"><div class="ic-num">384</div><div class="ic-label">爻 · 时位变化，尽在其中</div></div>
    <div class="glass info-card reveal"><div class="ic-num">10</div><div class="ic-label">翼 · 十翼辅经，义理灿然</div></div>
    <div class="glass info-card reveal"><div class="ic-num">2</div><div class="ic-label">仪 · 一阴一阳之谓道</div></div>
  </section>

  <section class="quick-grid page">
    <a class="glass quick-card reveal" href="#/hexagrams">
      <span class="qc-icon">经</span><h3>六十四卦全文</h3>
      <p>卦辞、彖传、大象、爻辞、小象逐卦研读，配以爻位关系程序化解析与错综卦互参。</p>
    </a>
    <a class="glass quick-card reveal" href="#/divination">
      <span class="qc-icon">占</span><h3>起卦 · 玩占</h3>
      <p>铜钱法与数字法两种起卦方式，自动推演本卦、变卦与动爻，给出经文依据与解读要点。</p>
    </a>
    <a class="glass quick-card reveal" href="#/learn">
      <span class="qc-icon">学</span><h3>入门研习</h3>
      <p>从易之源流到太极阴阳、八卦四象、卦序哲学与十翼导读，一步步建立易学框架。</p>
    </a>
    <a class="glass quick-card reveal" href="#/glossary">
      <span class="qc-icon">典</span><h3>名词速查</h3>
      <p>太极、当位、中正、错综互变、大衍之数……遇到不懂的术语，随时翻查。</p>
    </a>
    <a class="glass quick-card reveal" href="#/videos">
      <span class="qc-icon">讲</span><h3>白话讲易 · 视频</h3>
      <p>推荐 B 站《通俗易懂讲易经》系列，逐卦白话讲解，配以文字研习事半功倍。</p>
    </a>
  </section>

  <section class="page">
    <div class="section-head reveal">
      <h2>学习路径 <span class="text-gradient">· 由浅入深</span></h2>
      <p>不求速成，贵在循序渐进，久久为功。</p>
    </div>
    <div class="path-list">
      <div class="glass path-item reveal"><div class="path-step">1</div><div><h4>认识易</h4><p>先明三易、经传之别，理解"易"的三种含义，建立正确的心态：善易者不占。</p></div></div>
      <div class="glass path-item reveal"><div class="path-step">2</div><div><h4>建立基础</h4><p>太极、阴阳、四象、八卦、六十四卦的结构与爻位关系，掌握读卦的语言。</p></div></div>
      <div class="glass path-item reveal"><div class="path-step">3</div><div><h4>通读经文</h4><p>依卦序通读六十四卦：先卦辞后爻辞，再参彖传、象传，观其象而玩其辞。</p></div></div>
      <div class="glass path-item reveal"><div class="path-step">4</div><div><h4>研习十翼</h4><p>《系辞》为易之总纲，精读之则义理自明；辅以说卦、序卦、杂卦以明卦象卦序。</p></div></div>
      <div class="glass path-item reveal"><div class="path-step">5</div><div><h4>玩占验象</h4><p>以铜钱或数字起卦为引，借占习易；占而后悟，悟而后不占。</p></div></div>
    </div>
  </section>

  <section class="page">
    <div class="section-head reveal">
      <h2>选读卦例 <span class="text-gradient">· 管中窥豹</span></h2>
      <p>从几个最经典的卦开始。</p>
    </div>
    <div class="hex-grid">
      ${featured.map((h) => `
        <a class="glass hex-card reveal" href="#/hex/${h.id}">
          <div class="hex-no">第${h.id}卦</div>
          <div class="hex-symbol">${h.symbol}</div>
          <div class="hex-name">${h.name}</div>
          <div class="hex-upper">${h.desc}</div>
        </a>`).join("")}
    </div>
  </section>`;
}

/* ---------- 六十四卦列表 ---------- */
function renderHexagrams(filter = "all", query = "") {
  const q = query.trim().toLowerCase();
  let list = [...HEXAGRAMS];
  if (filter === "upper") list = list.filter((h) => h.id <= 30);
  if (filter === "lower") list = list.filter((h) => h.id > 30);
  if (q) {
    list = list.filter((h) =>
      h.name.includes(q) || h.desc.includes(q) || h.guaci.includes(q) || String(h.id) === q || h.pinyin.includes(q)
    );
  }
  const groups = {};
  (filter === "all" ? ["上经（第1—30卦）", "下经（第31—64卦）"] : [filter === "upper" ? "上经（第1—30卦）" : "下经（第31—64卦）"]).forEach((g) => (groups[g] = []));
  list.forEach((h) => {
    const g = h.id <= 30 ? "上经（第1—30卦）" : "下经（第31—64卦）";
    (groups[g] = groups[g] || []).push(h);
  });
  const empty = Object.keys(groups).every((g) => groups[g].length === 0);
  return `
  <div class="page">
    <div class="section-head">
      <h2>六十四卦 <span class="text-gradient">· 观象玩辞</span></h2>
      <p>点击任意卦卡进入详解：卦辞、彖传、大象、六爻爻辞与爻位分析。</p>
    </div>
    <div class="search-box">
      <span class="s-icon">⌕</span>
      <input id="hex-search" type="search" placeholder="搜索卦名、卦辞、卦序（如：乾 / 天行健 / 15）" value="${esc(query)}" />
    </div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.2rem;">
      <button class="btn ${filter === "all" ? "btn-primary" : ""}" data-hf="all">全部</button>
      <button class="btn ${filter === "upper" ? "btn-primary" : ""}" data-hf="upper">上经三十</button>
      <button class="btn ${filter === "lower" ? "btn-primary" : ""}" data-hf="lower">下经三十四</button>
    </div>
    ${empty ? `<div class="glass card" style="padding:2rem;text-align:center;color:var(--text-dim);">未找到匹配的卦，换个关键词试试。</div>` : ""}
    ${Object.entries(groups).map(([g, hs]) => `
      <div class="section-head" style="margin-top:1.6rem;"><h2 style="font-size:1.15rem;color:var(--text-dim);letter-spacing:.2em;">${g}</h2></div>
      <div class="hex-grid">
        ${hs.map((h) => `
          <a class="glass hex-card reveal" href="#/hex/${h.id}">
            <div class="hex-no">第${h.id}卦</div>
            <div style="margin:.3rem 0;">${yaoStackHTML(h.bits)}</div>
            <div class="hex-name">${h.name}</div>
            <div class="hex-upper">${h.desc}</div>
            <div class="hex-guaci">${h.guaci}</div>
          </a>`).join("")}
      </div>`).join("")}
  </div>`;
}

/* ---------- 卦详情 ---------- */
function renderHexDetail(id) {
  const hex = hexById(id);
  if (!hex) return `<div class="page"><p>未找到该卦。</p></div>`;
  const lower = trigramInfo(hex.lower);
  const upper = trigramInfo(hex.upper);
  const { cuo, zong } = relationsOf(hex);
  const rels = [];
  if (cuo) rels.push({ label: "错卦", hex: cuo, sub: "阴阳全变" });
  if (zong && zong.id !== hex.id) rels.push({ label: "综卦", hex: zong, sub: "上下颠倒" });
  const prev = hex.id > 1 ? hexById(hex.id - 1) : null;
  const next = hex.id < 64 ? hexById(hex.id + 1) : null;

  const yaoHTML = hex.yao.map((y, i) => {
    const bits6 = hex.bits;
    // 用九/用六是乾坤特有附加条目
    if (y.tag === "用九" || y.tag === "用六") {
      return `
      <div class="glass yao-item reveal">
        <div><span class="yao-tag">${y.tag}</span></div>
        <div>
          <div class="yao-text">${esc(y.text)}</div>
          <div class="yao-analysis"><b>小象</b>：${esc(y.xiao)}</div>
          <div class="yao-analysis"><b>义理</b>：${y.tag === "用九" ? "乾之全德，刚而能柔，不为群龙之首，故吉。" : "坤之全德，柔而能守，永守贞常乃能大终。"}</div>
        </div>
      </div>`;
    }
    const analysis = analyzeLine(hex, i);
    const isMoving = false;
    return `
    <div class="glass yao-item reveal">
      <div style="display:flex;flex-direction:column;align-items:center;gap:.45rem;">
        <span class="yao-tag">${y.tag}</span>
        ${yaoMiniHTML(hex.bits[i] === "0", isMoving)}
      </div>
      <div>
        <div class="yao-text">${esc(y.text)}</div>
        <div class="yao-analysis"><b>爻位</b>：${analysis}</div>
        <div class="yao-analysis"><b>小象</b>：${esc(y.xiao)}</div>
      </div>
    </div>`;
  }).join("");

  return `
  <div class="page">
    <a class="back-link" href="#/hexagrams">← 返回六十四卦</a>
    <div class="glass hex-detail-hero">
      <div>
        <div style="display:flex;gap:2rem;align-items:center;justify-content:center;">
          ${yaoStackHTML(hex.bits)}
        </div>
      </div>
      <div class="hex-detail-title">
        <div class="kicker" style="margin-bottom:.6rem;">第${hex.id}卦 · ${hex.id <= 30 ? "上经" : "下经"} · 上${upper.name}下${lower.name}</div>
        <h1>${hex.name}<span style="font-size:.9rem;color:var(--text-faint);margin-left:.6rem;">${hex.pinyin}</span>
          <span style="margin-left:.8rem;color:var(--gold);">${hex.symbol}</span></h1>
        <div class="sub">${hex.desc} · ${lower.nature}在下，${upper.nature}在上 · 上卦主外主用，下卦主内主体</div>
        <div class="rel">
          <span class="tag">下卦：${lower.name}为${lower.nature}（${lower.virtue}）</span>
          <span class="tag">上卦：${upper.name}为${upper.nature}（${upper.virtue}）</span>
        </div>
      </div>
    </div>

    <div class="glass hex-body hex-section reveal">
      <div class="hex-section-title">卦辞</div>
      <div class="hex-original"><span class="ref">【经】</span>${esc(hex.guaci)}</div>
    </div>

    <div class="glass hex-body hex-section reveal">
      <div class="hex-section-title">彖传</div>
      <div class="hex-original"><span class="ref">【彖曰】</span>${esc(hex.tuanc)}</div>
      <p style="color:var(--text-faint);font-size:.82rem;margin:.6rem 0 0;">彖者，断也。断一卦之义，明卦德与时用。</p>
    </div>

    <div class="glass hex-body hex-section reveal">
      <div class="hex-section-title">大象传</div>
      <div class="hex-original"><span class="ref">【象曰】</span>${esc(hex.xiang)}</div>
      <p style="color:var(--text-faint);font-size:.82rem;margin:.6rem 0 0;">大象以上下卦之象立义，开示君子修身处世之法。</p>
    </div>

    <div class="glass hex-body hex-section reveal">
      <div class="hex-section-title">六爻详解</div>
      <p style="color:var(--text-faint);font-size:.85rem;margin:0 0 .9rem;">爻位分析按"当位、中正、乘承比应"等体例自动生成，供观象参考。</p>
      <div class="yao-list">${yaoHTML}</div>
    </div>

    ${rels.length ? `
    <div class="hex-section reveal">
      <div class="hex-section-title" style="margin-bottom:.4rem;">错综之变</div>
      <p style="color:var(--text-faint);font-size:.85rem;margin:0 0 .4rem;">错综其数，通其变，遂成天地之文。</p>
      <div class="rel-grid">
        ${rels.map((r) => `
          <a class="glass rel-card" href="#/hex/${r.hex.id}">
            <div class="rel-label">${r.label}</div>
            <div class="rel-name">${r.hex.symbol} ${r.hex.name}</div>
            <div class="rel-sub">${r.sub} · 第${r.hex.id}卦</div>
          </a>`).join("")}
      </div>
    </div>` : ""}

    <div class="glass hex-body hex-section reveal" style="margin-top:1.2rem;">
      <div class="hex-section-title">卦德简注</div>
      <p style="margin:.2rem 0 0;line-height:2;color:var(--text-dim);">${esc(HEX_INSIGHT[hex.id] || "")}</p>
    </div>

    <div style="display:flex;justify-content:space-between;gap:1rem;margin-top:1.4rem;flex-wrap:wrap;">
      ${prev ? `<a class="btn" href="#/hex/${prev.id}">← 第${prev.id}卦 ${prev.name}</a>` : `<span></span>`}
      ${next ? `<a class="btn" href="#/hex/${next.id}">第${next.id}卦 ${next.name} →</a>` : ""}
    </div>
  </div>`;
}

/* ============================================================
   起卦
   ============================================================ */

/* 六爻结果：[{yang, moving}] 自初爻起 */
function tossCoins() {
  const lines = [];
  for (let i = 0; i < 6; i++) {
    const backs = [0, 1, 2].reduce((s) => s + (Math.random() < 0.5 ? 1 : 0), 0);
    // 字记二、背记三：3背=9老阳(动) 2背=8少阴 1背=7少阳 0背=6老阴(动)
    const sum = 6 + backs;
    const yang = sum === 9 || sum === 7;
    const moving = sum === 9 || sum === 6;
    lines.push({ yang, moving, sum });
  }
  return lines;
}

/* 数字法起卦：三组数 → 本卦/动爻 */
function divinateByNumbers(a, b, c) {
  const mod8 = (n) => { const r = n % 8; return r === 0 ? 8 : r; };
  const mod6 = (n) => { const r = n % 6; return r === 0 ? 6 : r; };
  const lower = TRIGRAM_BY_BITS[String(mod8(a) - 1).padStart(3, "0")];
  const upper = TRIGRAM_BY_BITS[String(mod8(b) - 1).padStart(3, "0")];
  const moving = mod6(c); // 1-6，1=初爻
  return { lower, upper, moving };
}

/* 由上下卦符号构造六爻 bits（自下而上：下卦在前三爻、上卦在后三爻） */
function bitsFromTrigrams2(upper, lower) {
  return TRIGRAMS[lower].bits + TRIGRAMS[upper].bits;
}

/* 本卦 bits（铜钱法） */
function bitsFromLines(lines) {
  return lines.map((l) => (l.yang ? "1" : "0")).join("");
}

/* 变卦 bits：动爻翻转 */
function changedBits(bits, movingIdxs) {
  let arr = bits.split("");
  movingIdxs.forEach((i) => { arr[i] = arr[i] === "1" ? "0" : "1"; });
  return arr.join("");
}

/* 解读文本 */
function buildReading(hex, changedHex, movingIdxs) {
  const blocks = [];
  blocks.push({
    title: "本卦 · " + hex.name + "（" + hex.desc + "）",
    text: hex.guaci,
    note: "卦辞为全卦总纲，观其德、察其时、明其用。"
  });
  if (movingIdxs.length === 0) {
    blocks.push({
      title: "静卦之断",
      text: "六爻皆静，无动爻可据，当以本卦卦辞为断，并参彖传之义。",
      note: "静则守正，观其象而审其时，不轻举妄动。"
    });
  } else {
    movingIdxs.forEach((mi, k) => {
      const y = hex.yao[mi];
      if (!y) return;
      const yinYang = hex.bits[mi] === "1" ? "阳爻" : "阴爻";
      const change = hex.bits[mi] === "1" ? "阳动变阴" : "阴动变阳";
      blocks.push({
        title: `动爻 ${y.tag}（${POS_NAME[mi]}爻 · ${yinYang} · ${change}）`,
        text: y.text,
        note: "《系辞》：动则观其变而玩其占。此为所占之机要。",
        xiao: y.xiao
      });
    });
    blocks.push({
      title: "变卦 · " + changedHex.name + "（" + changedHex.desc + "）",
      text: changedHex.guaci,
      note: "变卦示事态演化之趋向。可参变卦卦辞，亦可将变卦与（互卦）合观。"
    });
  }
  return blocks;
}

/* 起卦页面 */
function renderDivination() {
  return `
  <div class="page">
    <div class="section-head">
      <h2>起卦 <span class="text-gradient">· 借占习易</span></h2>
      <p>先诚心默念所问之事，再选择起卦方式。占筮是观象玩辞的入门之阶，而非趋吉避凶的捷径。</p>
    </div>
    <div class="divin-layout">
      <div class="glass divin-panel">
        <div class="method-tabs">
          <button class="method-tab active" data-method="coins">铜钱法<small>三枚铜钱 · 六掷成卦</small></button>
          <button class="method-tab" data-method="numbers">数字法<small>三组数字 · 即刻成卦</small></button>
        </div>
        <div id="method-panel"></div>
      </div>
      <div class="glass divin-panel" id="divin-result">
        <h3 style="margin:0 0 .4rem;letter-spacing:.1em;">卦象</h3>
        <p style="color:var(--text-faint);font-size:.85rem;margin:0;">起卦后在此显示本卦、动爻与变卦。</p>
      </div>
    </div>
  </div>`;
}

function coinPanelHTML() {
  return `
    <div class="coin-legend">
      <span><b>字面（有字）</b> · 记为二</span>
      <span><b>背面（无字）</b> · 记为三</span>
    </div>
    <div class="coin-area">
      ${[0, 1, 2].map((i) => `
        <div class="coin" data-coin="${i}">
          <div class="coin-face">爻</div>
        </div>`).join("")}
    </div>
    <div style="text-align:center;margin-bottom:1rem;">
      <button class="btn btn-primary" id="toss-btn">掷铜钱</button>
      <span id="toss-state" style="margin-left:.8rem;color:var(--text-faint);font-size:.88rem;"></span>
    </div>
    <div id="coin-lines" style="display:flex;gap:.4rem;justify-content:center;align-items:flex-end;min-height:70px;flex-wrap:wrap;"></div>
    <p class="divin-rule">规则：三枚铜钱一掷。三背为老阳（⚊ 动），二背为少阴（⚋），一背为少阳（⚊），零背为老阴（⚋ 动）。自下而上六掷成卦；动爻所在即变爻，其爻辞为所占之机。</p>`;
}

function numberPanelHTML() {
  return `
    <div class="number-fields">
      <div class="field">
        <label for="n1">第一组数（1–999）· 定下卦</label>
        <input id="n1" type="number" min="1" max="999" value="3" />
        <div class="hint">三数除以八，余数定卦：1乾 2兑 3离 4震 5巽 6坎 7艮 8坤。</div>
      </div>
      <div class="field">
        <label for="n2">第二组数（1–999）· 定上卦</label>
        <input id="n2" type="number" min="1" max="999" value="5" />
        <div class="hint">同上，余数定上卦。</div>
      </div>
      <div class="field">
        <label for="n3">第三组数（1–999）· 定动爻</label>
        <input id="n3" type="number" min="1" max="999" value="7" />
        <div class="hint">除以六，余数定动爻：余1为初爻……余6为上爻（余0作6）。</div>
      </div>
    </div>
    <div style="text-align:center;">
      <button class="btn btn-primary" id="num-btn">起卦</button>
    </div>`;
}

/* 渲染起卦结果 */
function showResult(bits, changed, movingIdxs) {
  const hex = hexByBits(bits);
  const chHex = hexByBits(changed);
  const resultEl = document.getElementById("divin-result");
  if (!hex) { resultEl.innerHTML = `<p style="color:var(--cinnabar-bright);">卦象解析失败，请重试。</p>`; return; }
  const blocks = buildReading(hex, chHex, movingIdxs);
  const hexName = (h) => (h ? `<span style="font-size:1.2rem;font-weight:700;">${h.symbol} ${h.name}</span><span style="color:var(--text-faint);font-size:.82rem;">（${h.desc}）</span>` : "未知");
  resultEl.innerHTML = `
    <h3 style="margin:0 0 1rem;letter-spacing:.1em;">卦象 · 占断</h3>
    <div class="hex-change-grid">
      <div class="hex-change-item">
        ${yaoStackHTML(bits, movingIdxs, { cls: "large" })}
        <div class="hc-name">本卦</div>
        <div class="hc-sub">${hexName(hex)}</div>
      </div>
      <div class="hex-arrow">⟶</div>
      <div class="hex-change-item">
        ${yaoStackHTML(changed, [], { cls: "large" })}
        <div class="hc-name">变卦</div>
        <div class="hc-sub">${chHex ? hexName(chHex) : "—"}</div>
      </div>
    </div>
    ${movingIdxs.length ? `
      <div class="move-lines">
        ${movingIdxs.map((mi) => `<span class="move-tag">动爻 ${hex.yao[mi] ? hex.yao[mi].tag : POS_NAME[mi]}</span>`).join("")}
      </div>` : `<div class="move-lines"><span class="tag">六爻皆静 · 以卦辞为断</span></div>`}
    <div class="reading">
      ${blocks.map((b) => `
        <div class="glass reading-block reveal">
          <h4>${esc(b.title)}</h4>
          <p class="rb-text">${esc(b.text)}</p>
          ${b.xiao ? `<p class="rb-note"><b style="color:var(--jade-bright);">小象</b>：${esc(b.xiao)}</p>` : ""}
          <p class="rb-note">${esc(b.note)}</p>
        </div>`).join("")}
    </div>
    <p class="divin-rule" style="margin-top:1rem;">《易》为君子谋，不为小人谋。占筮之要在启发反思，最终仍归于"善易者不占"。若占得凶卦，不必忧惧——知几而改，凶亦化吉。</p>`;
}

/* 绑定起卦页交互 */
function bindDivination() {
  const panel = document.getElementById("method-panel");
  const resultEl = document.getElementById("divin-result");
  if (!panel) return;
  let method = "coins";
  panel.innerHTML = coinPanelHTML();

  document.querySelectorAll(".method-tab").forEach((t) => {
    t.addEventListener("click", () => {
      document.querySelectorAll(".method-tab").forEach((x) => x.classList.remove("active"));
      t.classList.add("active");
      method = t.dataset.method;
      panel.innerHTML = method === "coins" ? coinPanelHTML() : numberPanelHTML();
      bindMethod(method);
    });
  });
  bindMethod(method);
}

function bindMethod(method) {
  if (method === "coins") {
    let lines = [];
    let tossed = 0;
    const faceEls = () => document.querySelectorAll(".coin");
    const linesEl = document.getElementById("coin-lines");
    const stateEl = document.getElementById("toss-state");
    const btn = document.getElementById("toss-btn");

    const renderLines = () => {
      linesEl.innerHTML = lines.map((l) => `
        <div style="display:flex;flex-direction:column;align-items:center;gap:.3rem;">
          ${yaoMiniHTML(!l.yang, l.moving)}
          <span style="font-size:.68rem;color:var(--text-faint);">${l.moving ? "动" : ""}</span>
        </div>`).join("");
    };

    btn.addEventListener("click", () => {
      if (tossed >= 6) {
        // 重来
        lines = []; tossed = 0;
        btn.textContent = "掷铜钱";
        stateEl.textContent = "";
        renderLines();
        return;
      }
      btn.disabled = true;
      faceEls().forEach((c) => c.classList.add("flipping"));
      const backs = [];
      for (let i = 0; i < 3; i++) backs.push(Math.random() < 0.5 ? 1 : 0);
      setTimeout(() => {
        faceEls().forEach((c, i) => {
          c.classList.remove("flipping");
          const face = c.querySelector(".coin-face");
          const sum = 6 + backs[i];
          face.textContent = sum === 9 ? "老阳" : sum === 8 ? "少阴" : sum === 7 ? "少阳" : "老阴";
          face.style.fontSize = "1rem";
        });
        const sum = 6 + backs.reduce((s, b) => s + b, 0);
        const yang = sum === 9 || sum === 7;
        const moving = sum === 9 || sum === 6;
        lines.push({ yang, moving, sum });
        tossed++;
        stateEl.textContent = `第 ${tossed} / 6 掷 · 三枚之和 ${sum}（${sum === 9 ? "老阳" : sum === 8 ? "少阴" : sum === 7 ? "少阳" : "老阴"}）`;
        if (tossed >= 6) {
          btn.textContent = "重新起卦";
          const bits = bitsFromLines(lines);
          const movingIdxs = lines.map((l, i) => (l.moving ? i : -1)).filter((i) => i >= 0);
          const changed = changedBits(bits, movingIdxs);
          showResult(bits, changed, movingIdxs);
        }
        renderLines();
        btn.disabled = false;
      }, 560);
    });
  } else {
    const btn = document.getElementById("num-btn");
    btn.addEventListener("click", () => {
      const a = parseInt(document.getElementById("n1").value, 10);
      const b = parseInt(document.getElementById("n2").value, 10);
      const c = parseInt(document.getElementById("n3").value, 10);
      if (![a, b, c].every((n) => Number.isFinite(n) && n >= 1 && n <= 999)) {
        alert("请输入 1–999 之间的三组数字。");
        return;
      }
      const { lower, upper, moving } = divinateByNumbers(a, b, c);
      const bits = bitsFromTrigrams2(upper, lower);
      const movingIdx = moving - 1;
      const changed = changedBits(bits, [movingIdx]);
      showResult(bits, changed, [movingIdx]);
    });
  }
}

/* ============================================================
   入门研习文章
   ============================================================ */
const LEARN_ARTICLES = [
  {
    slug: "origin",
    title: "易之源流：群经之首，大道之源",
    icon: "源",
    summary: "《周易》的成书、三易之别、经传之分，以及它为何被称为群经之首。",
    body: `
      <p class="a-ref">【文献】《汉书·艺文志》《易纬·乾凿度》</p>
      <p>《易经》是中国最古老的经典之一，被誉为"群经之首，大道之源"。它并非出自一人一时之手，而是"人更三圣，世历三古"的集体结晶：伏羲画八卦，文王演为六十四卦并系卦辞，周公作爻辞（一说文王作），孔子作《十翼》以阐发义理。</p>
      <h3>三易之别</h3>
      <p>上古有"三易"：《连山》以艮卦为首（如山之连绵），《归藏》以坤卦为首（万物归藏于地），《周易》以乾卦为首（周流不息、周而复始）。前二者已佚，仅存《周易》，故后世言《易》即指《周易》。</p>
      <h3>经与传</h3>
      <p>《周易》分经、传两部分。经文含六十四卦的卦符、卦名、卦辞与爻辞，共四百五十条筮辞（六十四卦辞加三百八十六爻辞，其中乾用九、坤用六不计于三百八十四爻之内）。传文即"十翼"：《彖》上下、《象》上下、《文言》、《系辞》上下、《说卦》、《序卦》、《杂卦》，共十篇，如鸟之两翼辅翼经文。</p>
      <blockquote>《易》与天地准，故能弥纶天地之道。——《系辞上》</blockquote>
      <p>《周易》在汉代列为"五经"之首，历代注疏数以千计，从王弼的义理易到邵雍、朱熹的象数易，形成了源远流长的易学传统。它既是一套符号系统，也是一种思维方法——阴阳对立统一、穷通变化、物极必反，这些观念早已渗透进中国人的文化基因。</p>
      <div class="callout"><b>学习提示</b>：初学不必纠结于"占卜"还是"哲理"。先通读卦辞爻辞，建立文本直觉；再读《系辞》掌握总纲；最后回头看八卦卦象与爻位关系，自然融会贯通。</div>`
  },
  {
    slug: "taiji",
    title: "太极与阴阳：一阴一阳之谓道",
    icon: "☯",
    summary: "太极图到底在说什么？阴阳的四种基本关系与辩证智慧。",
    body: `
      <p class="a-ref">【文献】《系辞上》《太极图说》（周敦颐）</p>
      <p>"太极"一词首见《系辞上》："易有太极，是生两仪，两仪生四象，四象生八卦。"太极是宇宙未分之混沌本源，其动而生阳，静而生阴。宋代周敦颐作《太极图说》："无极而太极。太极动而生阳，动极而静，静而生阴。"将宇宙生成论推向体系化。</p>
      <h3>读太极图</h3>
      <p>黑白两鱼互相环抱，恰可说明阴阳的几层关系：</p>
      <ul>
        <li><b>对立</b>——阴阳属性相反：天/地、动/静、刚/柔、明/暗、奇/偶。</li>
        <li><b>互根</b>——孤阴不生，独阳不长；无阴则无阳，无阳亦无阴。</li>
        <li><b>消长</b>——阴消则阳长，阳消则阴长，如昼夜寒暑之循环。</li>
        <li><b>互含</b>——阳中有阴（鱼眼），阴中有阳，阴至极而阳生，阳至极而阴生。</li>
      </ul>
      <blockquote>一阴一阳之谓道，继之者善也，成之者性也。——《系辞上》</blockquote>
      <h3>阴阳辩证与今日之用</h3>
      <p>阴阳思维不是简单的二元对立，而是一种动态平衡观：物极必反、否极泰来、亢龙有悔。用在现代语境中——竞争中求合作（同人）、盛时思危（既济）、乱中见机（未济）、柔能克刚（巽）、刚能济柔（乾）——都源于这一对基本范畴的推演。理解阴阳，是读懂六十四卦的第一把钥匙。</p>`
  },
  {
    slug: "bagua",
    title: "四象与八卦：乾坤六子，天地定位",
    icon: "卦",
    summary: "两仪生四象，四象生八卦。八卦卦象歌、先天与后天方位。",
    body: `
      <p class="a-ref">【文献】《系辞上》《说卦传》</p>
      <p>阴阳再分老少，得四象：太阳（⚌）、少阴（⚍）、少阳（⚎）、太阴（⚏）。四象再各生一阴一阳，得八卦：乾☰、兑☱、离☲、震☳、巽☴、坎☵、艮☶、坤☷。</p>
      <h3>卦象歌（必背）</h3>
      <blockquote>乾三连 ☰ · 坤六断 ☷ · 震仰盂 ☳ · 艮覆碗 ☶<br/>离中虚 ☲ · 坎中满 ☵ · 兑上缺 ☱ · 巽下断 ☴</blockquote>
      <h3>八卦之德与家人</h3>
      <p>乾：天，健，父；坤：地，顺，母；震：雷，动，长男；巽：风，入，长女；坎：水，陷，中男；离：火，丽，中女；艮：山，止，少男；兑：泽，说，少女。乾坤生六子，六子分阴阳，故八卦实为阴阳关系之全谱。</p>
      <div class="figure">
        <svg viewBox="0 0 420 220" role="img" aria-label="先天八卦方位图">
          <circle cx="210" cy="110" r="96" fill="none" stroke="var(--gold)" stroke-width="1.2" opacity=".55"/>
          <g font-size="20" text-anchor="middle" dominant-baseline="central" fill="currentColor">
            <text x="210" y="20">☰ 乾</text><text x="210" y="200">☷ 坤</text>
            <text x="318" y="110">☲ 离</text><text x="102" y="110">☵ 坎</text>
            <text x="286" y="34">☱ 兑</text><text x="134" y="34">☴ 巽</text>
            <text x="134" y="186">☳ 震</text><text x="286" y="186">☶ 艮</text>
          </g>
          <g font-size="11" fill="var(--text-faint)" text-anchor="middle">
            <text x="210" y="6">南</text><text x="210" y="216">北</text>
            <text x="338" y="110">东</text><text x="82" y="110">西</text>
          </g>
        </svg>
        <div class="fig-cap">先天八卦：乾南坤北，离东坎西（数往者顺，知来者逆）</div>
      </div>
      <h3>先天与后天</h3>
      <p>先天八卦（伏羲）讲宇宙生成之序：乾南坤北、离东坎西，乾坤定上下之位，天地定位而万物生焉。后天八卦（文王）讲四时运行之用：离南坎北、震东兑西，帝出乎震，齐乎巽，相见乎离……八卦配方位与季节，成为历法与风水的底层框架。</p>`
  },
  {
    slug: "structure",
    title: "六十四卦的结构：重卦与爻位",
    icon: "爻",
    summary: "八八六十四，卦卦皆重卦。六爻之位次、三才、承乘比应。",
    body: `
      <p class="a-ref">【文献】《说卦传》《系辞下》</p>
      <p>八卦两两相重，得六十四卦，故每卦皆有下卦（内卦、贞）与上卦（外卦、悔）两层结构。下卦为体、为本、为内、为己；上卦为用、为末、为外、为人。</p>
      <h3>六爻位次</h3>
      <p>自下而上六爻，各有名称与含义：</p>
      <table>
        <tr><th>爻位</th><th>初</th><th>二</th><th>三</th><th>四</th><th>五</th><th>上</th></tr>
        <tr><td>三才</td><td colspan="2">地</td><td colspan="2">人</td><td colspan="2">天</td></tr>
        <tr><td>取义</td><td>难知</td><td>多誉</td><td>多凶</td><td>多惧</td><td>多功</td><td>易知</td></tr>
        <tr><td>贵贱</td><td>元士</td><td>大夫</td><td>三公</td><td>诸侯</td><td>天子</td><td>宗庙</td></tr>
      </table>
      <blockquote>二与四同功而异位，其善不同；二多誉，四多惧，近也。三与五同功而异位；三多凶，五多功，贵贱之等也。——《系辞下》</blockquote>
      <h3>爻际关系：当位 · 中正 · 乘承比应</h3>
      <ul>
        <li><b>当位</b>：初、三、五为阳位，二、四、上为阴位。阳爻居阳位、阴爻居阴位为"当位"（正），反之"不当位"。</li>
        <li><b>中</b>：二爻为下卦之中，五爻为上卦之中。居中则能守正不偏。</li>
        <li><b>乘承</b>：下爻承上爻为"承"；上爻据下爻为"乘"。阴乘阳（如六四乘九三）为"乘刚"，多示凌驾失宜。</li>
        <li><b>比</b>：相邻两爻的关系，近比则相亲。</li>
        <li><b>应</b>：初与四、二与五、三与上相应。阴阳相应为吉，同性无应则孤。</li>
      </ul>
      <p>本站在每卦六爻详解中，已按此体例自动生成了各爻的爻位分析，读经时不妨对照验证——先看爻辞，再看位理，体会古人"观其象而玩其辞"的方法。</p>`
  },
  {
    slug: "order",
    title: "卦序的深意：从乾到未济",
    icon: "序",
    summary: "为什么屯在乾坤之后？为什么既济之后还有未济？序卦传给出的答案。",
    body: `
      <p class="a-ref">【文献】《序卦传》《周易正义》</p>
      <p>六十四卦的排列并非随机，而是一条环环相扣的"人生问题链"。《序卦传》用"故受之以……"串起全部六十四卦，揭示卦与卦之间的因果与转化。</p>
      <h3>开篇：天地生万物</h3>
      <p>有天地然后万物生焉，故乾坤居首。盈天地之间者唯万物，故受之以屯；屯者盈也，物之始生也。万物初生必蒙昧，故受之以蒙；蒙者蒙也，物之稚也。物稚不可不养也，故受之以需……这一串推演，将宇宙论、人生论、社会论熔于一炉。</p>
      <h3>上经主天道，下经主人事</h3>
      <p>上经三十卦起于乾坤、终于坎离，讲天道阴阳之体；下经三十四卦起于咸恒、终于既济未济，讲人伦情欲之用。咸者感也，少男少女相感；恒者久也，夫妇之道恒久；而既济之后仍以未济收尾——物不可穷也，终则有始，生生不息。</p>
      <blockquote>物不可穷也，故受之以未济终焉。——《序卦传》</blockquote>
      <h3>错综与互变</h3>
      <p>卦与卦之间存在多重变换关系：错卦（阴阳全变，如乾之坤）、综卦（上下颠倒，如屯之蒙）、互卦（中四爻交互成卦，如噬嗑之颐）。错综其数，通其变，遂成天地之文——这正是易学"观其变"的入门功夫。</p>`
  },
  {
    slug: "wuxing",
    title: "五行学说：与易理互补的框架",
    icon: "行",
    summary: "金木水火土，相生相克；五行与八卦、河洛的关系。",
    body: `
      <p class="a-ref">【文献】《尚书·洪范》《汉书·五行志》</p>
      <p>五行——水、火、木、金、土——与阴阳并列为中华思想的另一根支柱。《尚书·洪范》："五行：一曰水，二曰火，三曰木，四曰金，五曰土。水曰润下，火曰炎上，木曰曲直，金曰从革，土爰稼穑。"</p>
      <h3>相生相克</h3>
      <p>相生：木生火，火生土，土生金，金生水，水生木（循环）。<br/>相克：木克土，土克水，水克火，火克金，金克木（循环）。</p>
      <p>生与克构成"生克制化"的动态平衡：有生则有源，有克则有制。五行还与方位、季节、脏腑、五色、五味等系统对应，形成中国人"天人相应"的整体观。</p>
      <table>
        <tr><th>五行</th><th>木</th><th>火</th><th>土</th><th>金</th><th>水</th></tr>
        <tr><td>方位</td><td>东</td><td>南</td><td>中</td><td>西</td><td>北</td></tr>
        <tr><td>季节</td><td>春</td><td>夏</td><td>长夏</td><td>秋</td><td>冬</td></tr>
        <tr><td>八卦</td><td>震巽</td><td>离</td><td>坤艮</td><td>乾兑</td><td>坎</td></tr>
        <tr><td>色</td><td>青</td><td>赤</td><td>黄</td><td>白</td><td>黑</td></tr>
      </table>
      <p>五行与八卦可互配：震巽属木、离属火、坤艮属土、乾兑属金、坎属水。后世占筮中的"纳甲""六亲"即以干支五行配入卦爻，那是《火珠林》以降的术数体系；研经者可先了解框架，不必急于深入术数。</p>`
  },
  {
    slug: "hetuluoshu",
    title: "河图洛书：数之源头，易之纲领",
    icon: "图",
    summary: "河出图，洛出书。从黑白点阵看先天数理。",
    body: `
      <p class="a-ref">【文献】《系辞上》《易学启蒙》（朱熹）</p>
      <blockquote>河出图，洛出书，圣人则之。——《系辞上》</blockquote>
      <p>传说伏羲时黄河出龙马，背负河图；夏禹时洛水出神龟，背负洛书。圣人取法作图，遂成八卦与九畴之数。宋代邵雍、朱熹、蔡元定将河图洛书与八卦一一对应，成为象数易学的基础。</p>
      <h3>河图：五行生成之数</h3>
      <p>河图之数：一六共宗居北，二七为朋居南，三八同道居东，四九为友居西，五十同途居中。奇数为生数（天一生水……），偶数为成数（地六成之……），生数加五即得成数，象征五行之生成。</p>
      <h3>洛书：九宫之数</h3>
      <p>洛书即九宫图：戴九履一，左三右七，二四为肩，六八为足，五居中央。纵、横、斜三数之和皆为十五。洛书之数配后天八卦方位与九宫飞星，是风水与奇门的基础框架。</p>
      <table>
        <tr><th>九宫</th><td>4 巽</td><td>9 离</td><td>2 坤</td></tr>
        <tr><th> </th><td>3 震</td><td>5 中</td><td>7 兑</td></tr>
        <tr><th> </th><td>8 艮</td><td>1 坎</td><td>6 乾</td></tr>
      </table>
      <p class="fig-cap" style="text-align:center;">洛书九宫：纵、横、斜三数之和皆十五</p>
      <p>河图主先天，洛书主后天；河图为体，洛书为用。初学不必穷究其源，先记口诀、观其象、验其数，便已触摸到"易以道阴阳，阴阳本于数"的门径。</p>`
  },
  {
    slug: "divination",
    title: "占筮原理：大衍之数与三枚铜钱",
    icon: "占",
    summary: "揲蓍成卦的完整推演，以及今日铜钱起卦的来历与读卦方法。",
    body: `
      <p class="a-ref">【文献】《系辞上》大衍之数章</p>
      <blockquote>大衍之数五十，其用四十有九。分而为二以象两，挂一以象三，揲之以四以象四时，归奇于扐以象闰。五岁再闰，故再扐而后挂。——《系辞上》</blockquote>
      <p>传统占筮用五十根蓍草，取四十九根，经过"分二、挂一、揲四、归奇"四营三变得一爻，十八变得六爻成卦。每一步都在"象"天地四时闰余——占筮不是随机游戏，而是一场严肃的宇宙仪式。</p>
      <h3>三变定一爻</h3>
      <p>三变之后，每变蓍策的余数（或35/32/28/24策）除以四，得九、八、七、六四种数：七为少阳⚊（不变）、八为少阴⚋（不变）、九为老阳⚊（变）、六为老阴⚋（变）。老阳老阴为"动爻"，动则变——本卦中阳爻变阴、阴爻变阳，即得变卦。</p>
      <h3>铜钱法的来历</h3>
      <p>为求简便，后世以三枚铜钱代蓍草：有字为阴记二，无字为阳记三，三枚之和即六、七、八、九。三背为九老阳，二背为八少阴，一背为七少阳，零背为六老阴。六掷成卦，其概率分布与揲蓍法完全一致——这是对古法忠实的简化。</p>
      <h3>如何读所成之卦</h3>
      <ul>
        <li>无动爻（静卦）：以本卦卦辞为主，参彖传。</li>
        <li>一动爻：以该动爻爻辞为断（朱熹之法）。</li>
        <li>多动爻：以变卦为主，参动爻之辞；或本卦为主、变卦为客，观其往来之机。</li>
        <li>占筮四戒：不诚不占，不义不占，不疑不占，戏占不灵。</li>
      </ul>
      <div class="callout"><b>本站起卦</b>：提供铜钱法（含动画）与数字法（三组数字）两种方式，自动推演本卦、动爻与变卦，并给出经文依据。占问之后，更重要的功课是回到卦辞爻辞中去体会其中道理。</div>`
  },
  {
    slug: "shiyi",
    title: "十翼导读：经之外的七种声音",
    icon: "翼",
    summary: "彖、象、文言、系辞、说卦、序卦、杂卦——十翼各讲什么，怎么读。",
    body: `
      <p class="a-ref">【文献】《易传》（十翼）</p>
      <p>相传孔子晚年读易，韦编三绝，作十翼以解经。十翼共七种十篇，是理解经文最权威的"说明书"：</p>
      <table>
        <tr><th>篇目</th><th>主旨</th><th>读法</th></tr>
        <tr><td>《彖传》（上下）</td><td>断一卦之体德与时用</td><td>每卦卦辞后必读</td></tr>
        <tr><td>《象传》（上下）</td><td>大象言卦象之德，小象释爻辞之义</td><td>与爻辞对照读</td></tr>
        <tr><td>《文言》</td><td>专释乾坤二卦，文饰其言</td><td>乾坤精义全在此</td></tr>
        <tr><td>《系辞》（上下）</td><td>易学总纲，论道论象论占</td><td>全书精华，反复精读</td></tr>
        <tr><td>《说卦》</td><td>八卦取象大全：天、地、人、物、德</td><td>观象之依据</td></tr>
        <tr><td>《序卦》</td><td>六十四卦排列之由</td><td>通读一遍即明卦序</td></tr>
        <tr><td>《杂卦》</td><td>两两对举，撮其要义</td><td>速记卦德的捷径</td></tr>
      </table>
      <h3>《系辞》为什么最重要</h3>
      <p>《系辞》是十翼之首，系统阐述了"易"的哲学基础：太极阴阳之化、观象系辞之法、圣人忧患之思、神以知来知以藏往的占筮观。朱熹称其"言天地阴阳之理，兼圣人体用之全"。研经者若能精读《系辞》，便掌握了理解全部卦爻辞的总钥匙。</p>
      <blockquote>居则观其象而玩其辞，动则观其变而玩其占。——《系辞上》</blockquote>`
  },
  {
    slug: "modern",
    title: "易经的现代启示：从二进制到算法思维",
    icon: "现",
    summary: "莱布尼茨与二进制、DNA与六十四卦，以及易学思维在工程与科研中的回响。",
    body: `
      <p class="a-ref">【延伸】莱布尼茨《论二进制算术》、现代易学跨学科研究</p>
      <p>《易经》的符号系统在近代不断与科学相遇，产生奇妙的共鸣。</p>
      <h3>二进制与计算机</h3>
      <p>德国数学家莱布尼茨受邵雍《皇极经世》六十四卦图启发，确认其二进制算术与"阴爻=0、阳爻=1"的卦爻表示完全同构：六位二进制恰好对应六十四卦。今天的计算机以0与1构筑整个数字世界，而三千年前的卦画早已用两爻穷尽了六十四种组合——这是"简易"与"变易"最直观的现代注脚。</p>
      <h3>六十四卦与遗传密码</h3>
      <p>上世纪分子生物学发现，遗传密码由四种碱基三联体组成，共有六十四种密码子，恰与六十四卦数目相等。这一"巧合"吸引了许多研究者从卦序与密码子排布中寻找对应，虽非严格科学结论，却提醒我们：六十四卦或许是一套关于"组合与变化"的原初模型。</p>
      <h3>易学思维与工程方法</h3>
      <p>对工程师与研究者而言，易学思维至少有三种可迁移的方法论价值：</p>
      <ul>
        <li><b>系统观</b>：六爻成卦、位理相应，恰如系统之结构、接口与反馈——调整一位，全局皆变。</li>
        <li><b>时机观</b>："时止则止，时行则行"；算法调度、资源分配的"时机"，正是《易经》反复强调的"与时偕行"。</li>
        <li><b>风险观</b>：亢龙有悔、履霜坚冰至、思患而豫防——对极端情况的预判与冗余设计，与工程中的鲁棒性思维不谋而合。</li>
      </ul>
      <p>当然，我们不必把《易经》神化为"科学预言书"。它真正的价值，在于提供了一套观察变化、权衡时位的思维体操——而这，正是它在任何时代都不会过时的原因。</p>`
  }
];

/* ---------- 学习页 ---------- */
function renderLearn() {
  return `
  <div class="page">
    <div class="section-head">
      <h2>入门研习 <span class="text-gradient">· 循序渐进</span></h2>
      <p>十篇专题，从源流到应用，帮你建立完整的易学知识框架。</p>
    </div>
    <div class="learn-toc">
      ${LEARN_ARTICLES.map((a, i) => `
        <a class="glass learn-card reveal" href="#/learn/${a.slug}">
          <h3><span style="color:var(--cinnabar-bright);margin-right:.4rem;">${String(i + 1).padStart(2, "0")}</span>${a.icon} ${a.title}</h3>
          <p>${a.summary}</p>
        </a>`).join("")}
    </div>
  </div>`;
}

/* 文章页 */
function renderArticle(slug) {
  const a = LEARN_ARTICLES.find((x) => x.slug === slug);
  if (!a) return renderLearn();
  return `
  <div class="page">
    <a class="back-link" href="#/learn">← 返回研习目录</a>
    <article class="glass article reveal">
      <h2>${a.icon} ${a.title}</h2>
      <div class="a-meta">观易 · 入门研习 · 第${LEARN_ARTICLES.indexOf(a) + 1}篇</div>
      ${a.body}
    </article>
    <div style="display:flex;justify-content:space-between;gap:1rem;margin-top:1.2rem;flex-wrap:wrap;">
      ${LEARN_ARTICLES.indexOf(a) > 0 ? `<a class="btn" href="#/learn/${LEARN_ARTICLES[LEARN_ARTICLES.indexOf(a) - 1].slug}">← ${LEARN_ARTICLES[LEARN_ARTICLES.indexOf(a) - 1].title}</a>` : "<span></span>"}
      ${LEARN_ARTICLES.indexOf(a) < LEARN_ARTICLES.length - 1 ? `<a class="btn" href="#/learn/${LEARN_ARTICLES[LEARN_ARTICLES.indexOf(a) + 1].slug}">${LEARN_ARTICLES[LEARN_ARTICLES.indexOf(a) + 1].title} →</a>` : ""}
    </div>
  </div>`;
}

/* ============================================================
   名词速查
   ============================================================ */
const GLOSSARY = [
  { cat: "基本概念", items: [
    { t: "易", p: "yì", d: "《易经》之名。易有三义：变易（变化不息）、不易（规律恒常）、简易（大道至简）。" },
    { t: "三易", p: "sān yì", d: "《连山》《归藏》《周易》三部上古易书。连山首艮、归藏首坤、周易首乾，前二已佚。" },
    { t: "太极", p: "tài jí", d: "宇宙未分之本源。《系辞》：易有太极，是生两仪。" },
    { t: "两仪", p: "liǎng yí", d: "阴阳。太极动而生阳，静而生阴。" },
    { t: "四象", p: "sì xiàng", d: "太阳、少阴、少阳、太阴，由阴阳二分再分老少而成。" },
    { t: "八卦", p: "bā guà", d: "乾☰兑☱离☲震☳巽☴坎☵艮☶坤☷，由四象再分而成，象征天地雷风水火山泽。" },
    { t: "六十四卦", p: "liù shí sì guà", d: "八卦两两相重而成，共六十四卦、三百八十四爻，穷尽阴阳组合之变化。" },
    { t: "爻", p: "yáo", d: "构成卦画的基本符号。阳爻⚊、阴爻⚋；六爻自下而上为初、二、三、四、五、上。" },
    { t: "卦", p: "guà", d: "由六爻构成的符号整体，配以卦名、卦辞、爻辞，构成易的基本单位。" },
    { t: "卦辞", p: "guà cí", d: "统论一卦吉凶休咎的经文，如乾卦之「元亨利贞」" },
    { t: "爻辞", p: "yáo cí", d: "分论各爻的经文。阳爻称九（初九、九二……），阴爻称六（初六、六二……）。" },
    { t: "彖", p: "tuàn", d: "《彖传》之简称，断一卦之义，解释卦辞与卦德。" },
    { t: "象", p: "xiàng", d: "《象传》之简称。大象以上下卦之象明修德，小象释各爻爻辞。" },
    { t: "文言", p: "wén yán", d: "十翼之一，专释乾坤二卦，文辞华美，义理精微。" },
    { t: "系辞", p: "xì cí", d: "十翼之首，分上下篇，总论易之原理、象数与占筮，为易学之纲领。" },
    { t: "说卦", p: "shuō guà", d: "十翼之一，备述八卦取象：天地人物、性情方位、远取诸物近取诸身。" },
    { t: "序卦", p: "xù guà", d: "十翼之一，以「故受之以」贯通六十四卦，阐明卦序之逻辑。" },
    { t: "杂卦", p: "zá guà", d: "十翼之一，两卦对举、撮要明义，可作卦德速记口诀。" },
    { t: "十翼", p: "shí yì", d: "彖上下、象上下、文言、系辞上下、说卦、序卦、杂卦，共十篇辅翼经文，相传为孔子所作。" },
    { t: "河图", p: "hé tú", d: "一六居北、二七居南、三八居东、四九居西、五十居中，主先天五行生成之数。" },
    { t: "洛书", p: "luò shū", d: "戴九履一、左三右七、二四为肩、六八为足、五居中央，纵横斜和皆十五，主后天九宫。" },
    { t: "五行", p: "wǔ xíng", d: "木火土金水。相生：木火土金水；相克：木土水火金。与八卦、方位、季节相配。" },
    { t: "先天八卦", p: "xiān tiān", d: "伏羲八卦，乾南坤北离东坎西，明天地定位、宇宙生成之理。" },
    { t: "后天八卦", p: "hòu tiān", d: "文王八卦，离南坎北震东兑西，明四时运行、方位应用之序。" }
  ]},
  { cat: "卦爻关系", items: [
    { t: "当位", p: "dāng wèi", d: "阳爻居阳位（初三五）、阴爻居阴位（二四上）为当位，反之不当位。当位则正，不当位则常示位不称。" },
    { t: "中正", p: "zhōng zhèng", d: "二爻为下卦之中、五爻为上卦之中；五爻阳、二爻阴既中且正，为全卦最吉之位。" },
    { t: "承", p: "chéng", d: "下爻承上爻谓之承，柔承刚为顺。" },
    { t: "乘", p: "chéng", d: "上爻凌下爻谓之乘，阴乘阳为「乘刚」，多示僭越失宜。" },
    { t: "比", p: "bǐ", d: "相邻两爻相亲相比。近比则近而得助。" },
    { t: "应", p: "yìng", d: "初与四、二与五、三与上相应。阴阳相应则和，同性无应则孤。" },
    { t: "错卦", p: "cuò guà", d: "六爻阴阳全变所得之卦，如乾之坤。错者，对待也。" },
    { t: "综卦", p: "zōng guà", d: "六爻上下颠倒所得之卦，如屯之蒙。综者，反覆也。" },
    { t: "互卦", p: "hù guà", d: "以卦中二三四爻为下卦、三四五爻为上卦交互而成之卦，示卦中藏变。" },
    { t: "本卦", p: "běn guà", d: "占筮所得之卦，示所占之事当下之象。" },
    { t: "变卦", p: "biàn guà", d: "动爻阴阳翻转所得之卦，示事态演化之趋向。" },
    { t: "动爻", p: "dòng yáo", d: "老阳老阴之爻。动则变，其爻辞为所占之机要。" },
    { t: "三才", p: "sān cái", d: "天道、地道、人道。六爻中初二位为地、三四位为人、五六位为天。" },
    { t: "十二消息卦", p: "shí èr xiāo xī", d: "以复临泰大壮夬乾、姤遁否观剥坤十二卦配十二月，示阴阳消长之序。" },
    { t: "卦变", p: "guà biàn", d: "由本卦之爻位变化生变卦、互卦等，观卦与卦之间的流转关系。" }
  ]},
  { cat: "占筮与术数", items: [
    { t: "大衍之数", p: "dà yǎn zhī shù", d: "五十。其用四十有九，揲蓍成卦之数理基础。" },
    { t: "揲蓍", p: "shé shī", d: "以蓍草分二、挂一、揲四、归奇推演卦爻，三变成爻，十八变成卦。" },
    { t: "铜钱法", p: "tóng qián fǎ", d: "以三枚铜钱代蓍草：三背为九老阳、二背为八少阴、一背为七少阳、零背为六老阴。" },
    { t: "六爻", p: "liù yáo", d: "一卦六爻。亦指以卦爻与干支五行结合断吉凶的术数（火珠林法）。" },
    { t: "纳甲", p: "nà jiǎ", d: "将天干地支纳入八卦卦爻之体系，为京房易之核心。" },
    { t: "体用", p: "tǐ yòng", d: "梅花易数之要：体卦为己、用卦为事，体用生克定吉凶。" },
    { t: "梅花易数", p: "méi huā yì shù", d: "邵雍所传之简便占法，以时间、字数、声音等起卦，重体用生克。" },
    { t: "京房易", p: "jīng fáng yì", d: "西汉京房所创，以八宫、纳甲、世应、飞伏系统化六爻占断。" },
    { t: "火珠林", p: "huǒ zhū lín", d: "唐代占卜典籍，确立了六爻钱卜（摇卦）的基本框架。" },
    { t: "周易参同契", p: "zhōu yì cān tóng qì", d: "东汉魏伯阳著，以易理讲丹道，开道教易学与内丹之先河。" }
  ]},
  { cat: "易学人物", items: [
    { t: "伏羲", p: "fú xī", d: "画八卦，为易之肇始。" },
    { t: "文王", p: "wén wáng", d: "演六十四卦并系卦辞（一说并系爻辞）。" },
    { t: "周公", p: "zhōu gōng", d: "一说作爻辞。" },
    { t: "孔子", p: "kǒng zǐ", d: "晚年读易韦编三绝，作十翼阐发义理。" },
    { t: "王弼", p: "wáng bì", d: "魏晋玄学易代表，一扫汉易象数之繁，以义理注易，其《周易注》为通行本之源。" },
    { t: "邵雍", p: "shào yōng", d: "北宋象数易学大师，著《皇极经世》，发明先天图与二进制同构之六十四卦排列。" },
    { t: "朱熹", p: "zhū xī", d: "南宋理学集大成者，著《周易本义》，重占筮原义，其卦序与筮法影响至今。" },
    { t: "程颐", p: "chéng yí", d: "北宋理学家，著《伊川易传》，以义理言人事，与朱《本义》并称程朱易学。" }
  ]}
];

function renderGlossary() {
  return `
  <div class="page">
    <div class="section-head">
      <h2>名词速查 <span class="text-gradient">· 随查随学</span></h2>
      <p>读经遇到不懂的术语？按分类或直接搜索。</p>
    </div>
    <div class="glossary-layout">
      <nav class="glass gloss-nav" aria-label="名词分类">
        ${GLOSSARY.map((g) => `<a href="#/glossary" data-gcat="${g.cat}">${g.cat}</a>`).join("")}
      </nav>
      <div class="gloss-content">
        ${GLOSSARY.map((g) => `
          <section id="gloss-${g.cat}" data-gsec="${g.cat}">
            <div class="section-head" style="margin-top:.4rem;"><h2 style="font-size:1.25rem;">${g.cat}</h2></div>
            ${g.items.map((it) => `
              <div class="glass gloss-item">
                <h3>${it.t} <span class="g-pinyin">${it.p}</span></h3>
                <p>${esc(it.d)}</p>
              </div>`).join("")}
          </section>`).join("")}
      </div>
    </div>
  </div>`;
}

/* ---------- 白话讲易 · B站视频 ---------- */
function renderVideos() {
  const total = BILI_VIDEOS.length;
  const covered = BILI_VIDEOS.filter((v) => v.no).length;
  return `
  <div class="page video-page">
    <div class="section-head reveal">
      <h2>白话讲易 <span class="text-gradient">· 视频研习</span></h2>
      <p>推荐 B 站系列《${esc(BILI_SEASON)}》——用通俗易懂的大白话逐卦讲解《易经》，与本站文字研习互为补充。</p>
    </div>

    <div class="glass video-meta reveal">
      <div class="vm-info">
        <h3>${esc(BILI_SEASON)}</h3>
        <p>已收录 ${total} 期 · 覆盖第 1–${covered} 卦（持续更新中）。点击任意卡片直达对应视频，建议与「六十四卦」页面对照研读。</p>
      </div>
      <a class="btn btn-ghost" href="${BILI_SEASON_URL}" target="_blank" rel="noopener">在 B 站打开合集 ↗</a>
    </div>

    <div class="video-grid">
      ${BILI_VIDEOS.map((v) => videoCard(v)).join("")}
    </div>
  </div>`;
}

function videoCard(v) {
  const h = v.no ? HEXAGRAMS[v.no - 1] : null;
  const bits = h ? h.bits : null;
  const yao = bits
    ? bits.split("").reverse().map((b) => `<i class="${b === "1" ? "yang" : "yin"}"></i>`).join("")
    : `<i class="yang"></i><i class="yin"></i><i class="yang"></i><i class="yin"></i><i class="yang"></i><i class="yin"></i>`;
  const url = `https://www.bilibili.com/video/${v.bvid}`;
  const date = v.pub ? new Date(v.pub * 1000).toLocaleDateString("zh-CN") : "";
  return `
  <a class="glass video-card reveal" href="${url}" target="_blank" rel="noopener">
    <div class="vc-media">
      <div class="vc-yao" aria-hidden="true">${yao}</div>
      <img src="${v.pic}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'" />
      <span class="vc-no">${v.no ? `第${v.no}卦 · ${esc(v.name)}` : "研习视频"}</span>
      <span class="vc-dur">${v.dur}</span>
    </div>
    <div class="vc-body">
      <h4 class="vc-title">${esc(v.title)}</h4>
      <div class="vc-meta">
        <span class="vm-play">▶ ${v.view}</span>
        ${date ? `<span>${date}</span>` : ""}
      </div>
    </div>
  </a>`;
}

function bindVideos() {
  // 封面加载失败时自动露出卦画（由 img onerror 内联处理），此处无需额外逻辑
}

/* ============================================================
   路由
   ============================================================ */
function router() {
  const hash = location.hash || "#/home";
  const parts = hash.replace(/^#\//, "").split("/");
  const route = parts[0] || "home";
  const arg = parts[1] || "";
  let html = "";
  let scrollToGloss = null;

  switch (route) {
    case "hexagrams":
      html = renderHexagrams("all", arg === "q" ? decodeURIComponent(parts[2] || "") : "");
      break;
    case "hex":
      html = renderHexDetail(parseInt(arg, 10) || 1);
      break;
    case "divination":
      html = renderDivination();
      break;
    case "learn":
      html = arg ? renderArticle(arg) : renderLearn();
      break;
    case "glossary":
      html = renderGlossary();
      const gcat = hash.includes("#gloss-") ? hash.split("#gloss-")[1] : null;
      if (gcat) scrollToGloss = gcat;
      break;
    case "videos":
      html = renderVideos();
      break;
    default:
      html = renderHome();
  }

  app().innerHTML = html;
  setActiveNav(route);
  bindReveal(app());

  // 页面级绑定
  if (route === "divination") bindDivination();
  if (route === "hexagrams") bindHexagramList();
  if (route === "glossary") bindGlossaryNav();
  if (route === "videos") bindVideos();

  // 名词锚点滚动
  if (scrollToGloss) {
    setTimeout(() => {
      const el = document.querySelector(`#gloss-${CSS.escape(scrollToGloss)}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  scrollTop();
}

/* 六十四卦页绑定：搜索 + 分组过滤 */
function bindHexagramList() {
  const input = document.getElementById("hex-search");
  if (!input) return;
  let timer = null;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = input.value;
      // 就地刷新：重建列表以应用搜索
      renderHexagramsInPlace(q);
    }, 220);
  });
  document.querySelectorAll("[data-hf]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-hf]").forEach((b) => b.classList.remove("btn-primary"));
      btn.classList.add("btn-primary");
      const q = (document.getElementById("hex-search") || { value: "" }).value || "";
      renderHexagramsInPlace(q, btn.dataset.hf);
    });
  });
}

function renderHexagramsInPlace(query, filter = "all") {
  // 从当前按钮状态读取筛选
  if (!filter) {
    const active = document.querySelector("[data-hf].btn-primary");
    filter = active ? active.dataset.hf : "all";
  }
  const listEl = app();
  const oldScroll = window.scrollY;
  listEl.innerHTML = renderHexagrams(filter, query || "");
  bindReveal(listEl);
  bindHexagramList();
  window.scrollTo(0, Math.min(oldScroll, 200));
  const input = document.getElementById("hex-search");
  if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
}

/* 名词页导航高亮 + 点击平滑滚动 */
function bindGlossaryNav() {
  const links = document.querySelectorAll(".gloss-nav a");
  const secs = document.querySelectorAll("[data-gsec]");
  links.forEach((l) => {
    l.addEventListener("click", (e) => {
      e.preventDefault();
      const el = document.querySelector(`#gloss-${CSS.escape(l.dataset.gcat)}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.toggle("active", l.dataset.gcat === e.target.dataset.gsec));
      }
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  secs.forEach((s) => io.observe(s));
}

/* ---------------- 启动 ---------------- */
window.addEventListener("hashchange", router);
document.addEventListener("DOMContentLoaded", () => {
  bindTheme();
  bindBackTop();
  router();
});
