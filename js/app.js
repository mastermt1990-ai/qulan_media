/** Google Sheets — кестені Share → Anyone with the link (Viewer) етіп жариялаңыз */
const SHEET_ID = "1IRJWxPyANfO0h0RVSc7sW7RgVcxehJdw4rUiYTUBFuA";
const SHEET_GID = "0";          // 1-парақ: мақалалар
const SOCIAL_GID = "1";         // 2-парақ: Instagram/TikTok/Facebook жаңалықтары
const SHEETS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const SOCIAL_CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SOCIAL_GID}`;
const LOCAL_CSV_PATH = "data/articles.csv";

let articlesCache = null;

function parseBool(value) {
  return String(value).toUpperCase() === "TRUE";
}

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&q=80";

function convertDriveUrl(url) {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && url.includes("drive.google.com")) {
    return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }
  return url;
}

function resolveImageUrl(raw) {
  const url = String(raw || "").trim();
  if (!url) return PLACEHOLDER_IMAGE;
  if (!/^https?:\/\//i.test(url)) return PLACEHOLDER_IMAGE;
  return convertDriveUrl(url);
}

function imgTag(src, alt, loading) {
  const safeSrc = escapeHtml(src);
  const safeAlt = escapeHtml(alt);
  const fallback = escapeHtml(PLACEHOLDER_IMAGE);
  const loadAttr = loading ? ` loading="${loading}"` : "";
  return `<img src="${safeSrc}" alt="${safeAlt}"${loadAttr} onerror="this.onerror=null;this.src='${fallback}'" />`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function articleUrl(article) {
  const slug = article.slug || article.id;
  return `article.html?slug=${encodeURIComponent(slug)}`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("kk-KZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));

  if (hours < 1) return "Жаңа ғана";
  if (hours < 24) return `${hours} сағат бұрын`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Кеше";
  if (days < 7) return `${days} күн бұрын`;
  return formatDate(dateStr);
}

function normalizeArticles(rows) {
  return rows.map((a) => ({
    ...a,
    views: Number(a.views) || 0,
    isFeatured: parseBool(a.isFeatured),
    isBreaking: parseBool(a.isBreaking),
    imageUrl: resolveImageUrl(a.imageUrl),
  }));
}

async function fetchCsvText(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();
  if (text.includes("Sign in") && text.includes("Google")) {
    throw new Error("Кесте жарияланбаған — Share → Anyone with the link (Viewer)");
  }
  return text;
}

/** Google Sheets кейде 1-жолда «Столбец 1» қалады — id бағанын табамыз */
function parseArticlesCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const first = lines[i].split(",")[0].replace(/^"|"$/g, "").trim().toLowerCase();
    if (first === "id") {
      startIdx = i;
      break;
    }
  }
  return parseCSV(lines.slice(startIdx).join("\n"));
}

function filterValidArticles(rows) {
  return rows.filter((row) => row.title && String(row.title).trim() !== "");
}

async function loadArticles() {
  if (articlesCache) return articlesCache;

  let rows = [];
  let source = "sheets";

  try {
    const text = await fetchCsvText(`${SHEETS_CSV_URL}&_=${Date.now()}`);
    rows = filterValidArticles(parseArticlesCsv(text));
    if (rows.length === 0) throw new Error("Кестеде мақала жоқ");
  } catch (sheetErr) {
    console.warn("Google Sheets:", sheetErr.message, "— жергілікті CSV қолданылады");
    source = "local";
    const text = await fetchCsvText(LOCAL_CSV_PATH);
    rows = filterValidArticles(parseArticlesCsv(text));
  }

  if (rows.length === 0) throw new Error("Мақала табылмады");
  console.info(`Жаңалықтар жүктелді: ${rows.length} (${source})`);
  articlesCache = normalizeArticles(rows);
  return articlesCache;
}

function setTodayDate() {
  const el = document.getElementById("today-date");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("kk-KZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function renderTicker(articles) {
  const track = document.getElementById("ticker-track");
  if (!track) return;
  const breaking = articles.filter((a) => a.isBreaking);
  if (breaking.length === 0) {
    track.innerHTML = '<span class="ticker-item">Жаңалықтар жүктелуде...</span>';
    return;
  }
  const items = breaking
    .map(
      (a) =>
        `<a class="ticker-item" href="${articleUrl(a)}">${escapeHtml(a.title)}</a>`
    )
    .join('<span class="ticker-sep">•</span>');
  track.innerHTML = items + items;
}

function renderHero(article) {
  const hero = document.getElementById("hero");
  if (!hero || !article) return;
  hero.innerHTML = `
    <a href="${articleUrl(article)}" class="hero-link">
      <div class="hero-image-wrap">
        ${imgTag(article.imageUrl, article.title, "eager")}
        <span class="category-badge">${escapeHtml(article.category)}</span>
      </div>
      <div class="hero-body">
        <h1 class="hero-title">${escapeHtml(article.title)}</h1>
        <p class="hero-summary">${escapeHtml(article.summary)}</p>
        <div class="hero-meta">
          <span>${formatRelative(article.publishedAt)}</span>
          <span class="meta-dot">•</span>
          <span>${article.views.toLocaleString("kk-KZ")} көру</span>
        </div>
      </div>
    </a>
  `;
}

function renderGrid(articles) {
  const grid = document.getElementById("news-grid");
  if (!grid) return;
  grid.innerHTML = articles
    .map(
      (a) => `
    <article class="news-card">
      <a href="${articleUrl(a)}" class="card-link">
        <div class="card-image">
          ${imgTag(a.imageUrl, a.title, "lazy")}
        </div>
        <div class="card-body">
          <span class="card-category">${escapeHtml(a.category)}</span>
          <h2 class="card-title">${escapeHtml(a.title)}</h2>
          <time class="card-time">${formatRelative(a.publishedAt)}</time>
        </div>
      </a>
    </article>
  `
    )
    .join("");
}

function renderMostRead(articles) {
  const list = document.getElementById("most-read-list");
  if (!list) return;
  const sorted = [...articles].sort((a, b) => b.views - a.views).slice(0, 4);
  list.innerHTML = sorted
    .map(
      (a, i) => `
    <li>
      <span class="most-read-num">${i + 1}</span>
      <a href="${articleUrl(a)}">${escapeHtml(a.title)}</a>
    </li>
  `
    )
    .join("");
}

function findArticle(articles, params) {
  const slug = params.get("slug");
  const id = params.get("id");
  if (slug) return articles.find((a) => a.slug === slug);
  if (id) return articles.find((a) => String(a.id) === String(id));
  return null;
}

function renderArticlePage(article) {
  const main = document.getElementById("article-main");
  if (!main) return;
  if (!article) {
    main.innerHTML = '<p class="error-msg">Мақала табылмады.</p>';
    return;
  }
  document.title = `${article.title} — QULAN MEDIA`;
  main.innerHTML = `
    <article class="article-full">
      <span class="category-badge category-badge--inline">${escapeHtml(article.category)}</span>
      <h1 class="article-title">${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <time>${formatDate(article.publishedAt)}</time>
        <span class="meta-dot">•</span>
        <span>${article.views.toLocaleString("kk-KZ")} көру</span>
      </div>
      <div class="article-image">
        ${imgTag(article.imageUrl, article.title)}
      </div>
      <p class="article-lead">${escapeHtml(article.summary)}</p>
      <div class="article-content">${escapeHtml(article.content).replace(/\n/g, "<br>")}</div>
    </article>
  `;
}

/* ── Әлеуметтік желі посттары ── */

const PLATFORM_META = {
  instagram: { label: "Instagram", icon: "📸", color: "#833ab4" },
  tiktok:    { label: "TikTok",    icon: "🎵", color: "#000"    },
  facebook:  { label: "Facebook",  icon: "📘", color: "#1877f2" },
};

async function loadSocialPosts() {
  try {
    const text = await fetchCsvText(`${SOCIAL_CSV_URL}&_=${Date.now()}`);
    return parseArticlesCsv(text).filter((r) => r.platform && r.text);
  } catch (err) {
    console.warn("Әлеуметтік желі CSV:", err.message);
    return [];
  }
}

function renderSocialFeed(posts) {
  const wrap = document.getElementById("social-feed");
  if (!wrap) return;
  if (posts.length === 0) {
    wrap.innerHTML = '<p class="social-empty">Жаңалықтар жоқ</p>';
    return;
  }
  wrap.innerHTML = posts
    .slice(0, 6)
    .map((p) => {
      const key = String(p.platform).toLowerCase();
      const meta = PLATFORM_META[key] || { label: p.platform, icon: "🔗", color: "#555" };
      const imgHtml = p.imageUrl
        ? `<div class="sf-img"><img src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy"/></div>`
        : "";
      const linkHtml = p.url
        ? `<a class="sf-link" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">Толығырақ →</a>`
        : "";
      return `
      <div class="sf-card">
        <div class="sf-header" style="--sf-color:${meta.color}">
          <span class="sf-icon">${meta.icon}</span>
          <span class="sf-platform">${meta.label}</span>
          <span class="sf-date">${formatRelative(p.publishedAt || "")}</span>
        </div>
        ${imgHtml}
        <p class="sf-text">${escapeHtml(p.text)}</p>
        ${linkHtml}
      </div>`;
    })
    .join("");
}

async function initHome() {
  setTodayDate();
  try {
    const articles = await loadArticles();
    const featured = articles.find((a) => a.isFeatured) || articles[0];
    const gridArticles = articles
      .filter((a) => a !== featured)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 4);

    renderTicker(articles);
    renderHero(featured);
    renderGrid(gridArticles);
    renderMostRead(articles);
  } catch (err) {
    console.error(err);
    const hero = document.getElementById("hero");
    if (hero) {
      hero.innerHTML =
        '<p class="error-msg">Жаңалықтар жүктелмеді. <code>npx serve .</code> қолданыңыз. Google Sheets: Share → Anyone with the link (Viewer). Кесте: <a href="https://docs.google.com/spreadsheets/d/1IRJWxPyANfO0h0RVSc7sW7RgVcxehJdw4rUiYTUBFuA/edit">ашу</a></p>';
    }
  }

  loadSocialPosts().then(renderSocialFeed);
}

async function initArticle() {
  setTodayDate();
  try {
    const articles = await loadArticles();
    const params = new URLSearchParams(window.location.search);
    const article = findArticle(articles, params);
    renderArticlePage(article);
    renderTicker(articles);
    renderMostRead(articles);
  } catch (err) {
    console.error(err);
    renderArticlePage(null);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "article") initArticle();
  else initHome();
});
