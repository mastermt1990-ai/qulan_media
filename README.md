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
3. 1-жолға бағандарды қойыңыз (төмендегі кесте)
4. 2-жолдан мақалаларды жазыңыз
5. Сайтты жаңартыңыз (F5) — өзгеріс көрінеді

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
├── css/styles.css
├── js/csv.js           # CSV парсер
├── js/app.js           # Жүктеу және көрсету
├── data/articles.csv   # Мақалалар (сіз өңдейсіз)
└── README.md
```

## Интернетке жариялау

1. [Netlify](https://netlify.com) — қалтаны drag & drop
2. [GitHub Pages](https://pages.github.com) — репоға push, Pages қосу
3. [Vercel](https://vercel.com) — импорт

Әр жаңа мақала: CSV өзгерту → қайта deploy.

## Тексеру

- [ ] Hero мақала көрінеді
- [ ] Торда 4 мақала
- [ ] Тікер жұмыс істейді
- [ ] Мақалаға басқанда `article.html?slug=...` ашылады
