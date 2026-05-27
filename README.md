# QULAN MEDIA — жаңалықтар порталы

Статикалық сайт. Мақалалар **Google Sheets** кестесінен жүктеледі (жарияланбаған болса — `data/articles.csv` резерві).

**Кесте:** [Google Sheets](https://docs.google.com/spreadsheets/d/1IRJWxPyANfO0h0RVSc7sW7RgVcxehJdw4rUiYTUBFuA/edit?gid=0#gid=0)

## Жылдам бастау

```bash
cd c:\Users\Master\Desktop\media
npx --yes serve .
```

Браузерде ашыңыз: `http://localhost:3000` (порт өзгеруі мүмкін).

> `file://` арқылы ашқанда CSV жүктелмейді — міндетті түрде жергілікті сервер қолданыңыз.

## Google Sheets қосу (міндетті)

1. [Кестені ашыңыз](https://docs.google.com/spreadsheets/d/1IRJWxPyANfO0h0RVSc7sW7RgVcxehJdw4rUiYTUBFuA/edit?gid=0#gid=0)
2. **Share** → **General access** → **Anyone with the link** → рөл: **Viewer**
3. **1-жолды** баған атауларымен толтырыңыз (төмендегі кесте)
4. **2-жолдан** мақалаларды жазыңыз
5. Сайтты жаңартыңыз (F5) — өзгеріс көрінеді

> **Маңызды:** Егер 1-жолда «Столбец 1, Столбец 2...» болса — ол қатарды өшіріңіз. Бірінші жол `id,category,title,...` болуы керек.

## Railway deploy (негізгі хостинг)

Сайт Railway-де Node.js сервер арқылы жұмыс істейді.

### Алғашқы deploy (5 минут)

1. [railway.com](https://railway.com) → тіркелу / кіру
2. **New Project** → **Deploy from GitHub repo**
3. `mastermt1990-ai/qulan_media` репосын таңдаңыз
4. Railway автоматты build істейді (`npm install` → `npm start`)
5. **Settings** → **Networking** → **Generate Domain** — тегін `.up.railway.app` домен аласыз

### Автоматты жаңарту

`main` тармағына әр push → Railway автоматты redeploy.

### Локальді тест (Railway сияқты)

```bash
npm install
npm start
```

Браузер: `http://localhost:3000`

### Railway параметрлері (автоматты)

| Файл | Мақсаты |
|------|---------|
| `package.json` | Node.js тәуелділіктері |
| `server.js` | Статикалық файл сервері (`PORT` орта айнымалысы) |
| `railway.toml` | Healthcheck, restart policy |
| `nixpacks.toml` | Node.js 20, build командалары |
| `Procfile` | `web: npm start` |

> **Ескерту:** Google Sheets клиент жағында жүктеледі — Railway-де қосымша env айнымалылар қажет емес.

## GitHub Pages (қосымша)

Сайт: **https://mastermt1990-ai.github.io/qulan_media/**

GitHub → репо → **Settings** → **Pages** → **Source:** GitHub Actions.

## Мақала қосу / өзгерту

Кестеде өңдеңіз. Бірінші жолдағы баған атауларын өзгертпеңіз:

| Баған | Сипаттама |
|--------|-----------|
| `id` | Бірегей нөмір |
| `category` | Санат (мысалы: ҚОҒАМ, СПОРТ) |
| `title` | Тақырып |
| `summary` | Қысқаша мәтін |
| `content` | Толық мәтін |
| `imageUrl` | Сурет сілтемесі (https://...) |
| `publishedAt` | Күн (YYYY-MM-DD) |
| `views` | Көру саны |
| `isFeatured` | `TRUE` — басты беттегі үлкен мақала (бір ғана) |
| `isBreaking` | `TRUE` — «Соңғы жаңалық» тікері |
| `slug` | URL (мысалы: `makala-1`) |

**Ережелер:**

- Мәтінде үтір болса — өрісті `"..."` ішіне алыңыз.
- Файлды **UTF-8** сақтаңыз.
- `isFeatured` және `isBreaking` үшін `TRUE` / `FALSE` (жоғары әріп).

**Резерв:** кесте жарияланбаса, сайт `data/articles.csv` файлын қолданады.

## Файл құрылымы

```
media/
├── index.html          # Басты бет
├── article.html        # Бір мақала (?slug=...)
├── server.js           # Railway / локаль сервер
├── package.json        # Node.js конфиг
├── railway.toml        # Railway deploy
├── css/styles.css
├── js/csv.js           # CSV парсер
├── js/app.js           # Жүктеу және көрсету
├── data/articles.csv   # Мақалалар (резерв)
└── README.md
```

## Интернетке жариялау

1. **[Railway](https://railway.com)** — GitHub репосын қосу (негізгі, ұсынылады)
2. [GitHub Pages](https://pages.github.com) — репоға push, Pages қосу
3. [Netlify](https://netlify.com) — drag & drop
4. [Vercel](https://vercel.com) — импорт

Google Sheets-ке мақала қосу → сайтты F5 — redeploy қажет емес.

## Тексеру

- [ ] Hero мақала көрінеді
- [ ] Торда 4 мақала
- [ ] Тікер жұмыс істейді
- [ ] Мақалаға басқанда `article.html?slug=...` ашылады
