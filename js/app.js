/** Google Sheets — кестені Share → Anyone with the link (Viewer) етіп жариялаңыз */
const SHEET_ID = "1IRJWxPyANfO0h0RVSc7sW7RgVcxehJdw4rUiYTUBFuA";
const SHEET_GID = "0";          // 1-парақ: мақалалар
const SOCIAL_GID = "1";         // 2-парақ: Instagram/TikTok/Facebook жаңалықтары
const VIDEOS_GID = "2128631468"; // 3-парақ: Facebook/YouTube бейнероликтері (platform, title, url)
const SHEETS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
const SOCIAL_CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SOCIAL_GID}`;
const VIDEOS_CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${VIDEOS_GID}`;
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

function renderGrid(articles) {
  const grid = document.getElementById("news-grid");
  if (!grid) return;
  if (articles.length === 0) {
    grid.innerHTML = '<p class="news-grid-loading">Жаңалықтар жоқ</p>';
    return;
  }
  grid.innerHTML = articles
    .map(
      (a) => `
    <article class="news-card">
      <a href="${articleUrl(a)}" class="card-link">
        <div class="card-image">
          ${imgTag(a.imageUrl, a.title, "lazy")}
          <span class="category-badge">${escapeHtml(a.category)}</span>
        </div>
        <div class="card-body">
          <h2 class="card-title">${escapeHtml(a.title)}</h2>
          <div class="card-meta">
            <time>${formatRelative(a.publishedAt)}</time>
            <span class="meta-dot">•</span>
            <span>${a.views.toLocaleString("kk-KZ")} көру</span>
          </div>
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
  facebook:  { label: "Facebook",  iconImg: "images/facebook.png", color: "#1877f2", gradient: "linear-gradient(135deg, #1877f2 0%, #0d5bb5 100%)", handle: "Qulan Media" },
  instagram: { label: "Instagram", iconImg: "images/instagram.png", color: "#833ab4", gradient: "linear-gradient(135deg, #405de6, #833ab4, #c13584)", handle: "@qulan_media" },
  youtube:   { label: "YouTube",   iconImg: "images/youtube.png", color: "#ff0000", gradient: "linear-gradient(135deg, #ff0000 0%, #b31217 100%)", handle: "@qulanmedia" },
  tiktok:    { label: "TikTok",    iconImg: "images/tiktok.png", color: "#010101", gradient: "linear-gradient(135deg, #010101 0%, #fe2c55 100%)", handle: "@qulan_media" },
};

function renderPlatformIcon(meta) {
  if (meta.iconImg) {
    return `<span class="sf-link-card__icon"><img src="${escapeHtml(meta.iconImg)}" alt="${escapeHtml(meta.label)}" /></span>`;
  }
  return `<span class="sf-link-card__icon sf-link-card__icon--emoji">${meta.icon}</span>`;
}

const SOCIAL_LINKS = [
  { platform: "facebook",  url: "https://www.facebook.com/share/18XHZ1v9sL/" },
  { platform: "instagram", url: "https://www.instagram.com/qulan_media?igsh=YXp4NzRxcTBibmRv" },
  { platform: "youtube",   url: "https://youtube.com/@qulanmedia?si=CnHn5ytlNbEPgJux" },
  { platform: "tiktok",    url: "https://www.tiktok.com/@qulan_media?_r=1&_t=ZS-96k2A5pnTL3" },
];

async function loadSocialPosts() {
  try {
    const text = await fetchCsvText(`${SOCIAL_CSV_URL}&_=${Date.now()}`);
    return parseArticlesCsv(text).filter((r) => r.platform && r.text);
  } catch (err) {
    console.warn("Әлеуметтік желі CSV:", err.message);
    return [];
  }
}

function parseVideosCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const first = lines[i].split(",")[0].replace(/^"|"$/g, "").trim().toLowerCase();
    if (first === "platform") {
      startIdx = i;
      break;
    }
  }
  return parseCSV(lines.slice(startIdx).join("\n"));
}

async function loadVideos() {
  try {
    const text = await fetchCsvText(`${VIDEOS_CSV_URL}&_=${Date.now()}`);
    return parseVideosCsv(text).filter((r) => r.url && r.title);
  } catch (err) {
    console.warn("Бейнероликтер CSV:", err.message);
    return [];
  }
}

function renderVideos(videos) {
  const wrap = document.getElementById("video-feed");
  if (!wrap) return;
  if (videos.length === 0) {
    wrap.innerHTML = '<p class="social-empty">Бейнероликтер жоқ</p>';
    return;
  }
  wrap.innerHTML = videos
    .slice(0, 6)
    .map((v) => {
      const key = String(v.platform).toLowerCase();
      const meta = PLATFORM_META[key] || { label: v.platform || "Видео", color: "#555" };
      return `<a class="sf-link-card sf-link-card--${key}" href="${escapeHtml(v.url)}" target="_blank" rel="noopener" style="--sf-accent:${meta.color}">
        ${renderPlatformIcon(meta)}
        <span class="sf-link-card__body">
          <span class="sf-link-card__name">${escapeHtml(v.title)}</span>
          <span class="sf-link-card__handle">${escapeHtml(meta.label)}</span>
        </span>
        <span class="sf-link-card__arrow" aria-hidden="true">↗</span>
      </a>`;
    })
    .join("");
}

function renderSocialFeed(posts) {
  const wrap = document.getElementById("social-feed");
  if (!wrap) return;
  if (posts.length === 0) {
    wrap.innerHTML = `<div class="sf-links">${SOCIAL_LINKS.map(({ platform, url }) => {
      const meta = PLATFORM_META[platform];
      return `<a class="sf-link-card sf-link-card--${platform}" href="${escapeHtml(url)}" target="_blank" rel="noopener" style="--sf-accent:${meta.color}">
        ${renderPlatformIcon(meta)}
        <span class="sf-link-card__body">
          <span class="sf-link-card__name">${meta.label}</span>
          <span class="sf-link-card__handle">${meta.handle}</span>
        </span>
        <span class="sf-link-card__arrow" aria-hidden="true">↗</span>
      </a>`;
    }).join("")}</div>`;
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
      const iconHtml = meta.iconImg
        ? `<img class="sf-icon-img" src="${escapeHtml(meta.iconImg)}" alt="" />`
        : `<span class="sf-icon">${meta.icon || "🔗"}</span>`;
      return `
      <div class="sf-card">
        <div class="sf-header" style="--sf-color:${meta.color}">
          ${iconHtml}
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

function highlightNav(activeCategory) {
  const links = document.querySelectorAll(".nav-main a");
  links.forEach((link) => {
    let linkCat = null;
    try {
      linkCat = new URL(link.href, window.location.origin).searchParams.get("category");
    } catch (e) {
      linkCat = null;
    }
    if ((linkCat || null) === (activeCategory || null)) {
      link.classList.add("nav-active");
    } else {
      link.classList.remove("nav-active");
    }
  });
}

async function initHome() {
  setTodayDate();
  try {
    const articles = await loadArticles();

    const params = new URLSearchParams(window.location.search);
    const activeCategory = params.get("category");
    highlightNav(activeCategory);

    let filtered = [...articles];
    if (activeCategory) {
      filtered = filtered.filter(
        (a) =>
          String(a.category).trim().toUpperCase() ===
          activeCategory.trim().toUpperCase()
      );
    }

    const gridArticles = filtered
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 12);

    renderTicker(articles);
    renderGrid(gridArticles);
    renderMostRead(articles);

    if (activeCategory && gridArticles.length === 0) {
      const grid = document.getElementById("news-grid");
      if (grid) {
        grid.innerHTML = `<p class="news-grid-loading">«${escapeHtml(activeCategory)}» санатында жаңалық жоқ.</p>`;
      }
    }
  } catch (err) {
    console.error(err);
    const grid = document.getElementById("news-grid");
    if (grid) {
      grid.innerHTML =
        '<p class="news-grid-loading">Жаңалықтар жүктелмеді. Google Sheets: Share → Anyone with the link (Viewer).</p>';
    }
  }

  loadSocialPosts().then(renderSocialFeed);
  loadVideos().then(renderVideos);
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
