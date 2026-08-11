# बेरोजगार क्लब — Berojgar Club

> **नियम: नौकरी की बात मना है।**
> **रोजगार के अवसर? शायद कल।**

saloon.wtf ke dark/ambient single-page vibe par banayi hui Berojgar Club ki
website — aapki poster image use karke. Vercel par direct deploy ho jati hai.

---

## 🎯 Features

- Pahadi dhaba hero (aapki poster) with wooden signboards
- Live Indian clock (IST) + fake "members loitering" counter
- **Asli music player** — aapke apne MP3 chalta hai, koi Spotify/Apple/YouTube
  dependency nahi
- Vinyl-style spinning disc art jab gaana baj raha ho
- Play / Pause / Next / Previous / Seek bar / Time display
- Keyboard shortcuts: `Space` = play/pause, `←` / `→` = prev/next
- Club ke niyam (6 desi rules)
- Aaj ka mahaul: temp, chai rounds, carrom games, rozgaar news
- Interactive mini carrom board — tap/click karo, striker chalta hai
- Haazir board — naam daalo, member ban jao (browser mein save rehta hai)
- Grainy film + lantern glow + flicker animations
- Mobile responsive

---

## 🚀 Deploy to Vercel (30 seconds)

1. Is poore folder ko ek naya GitHub repo mein upload karo.
2. https://vercel.com/new par jaake woh repo import karo.
3. Framework preset `Other` rakho, build command khali chhoro, **Deploy** dabao.
4. Bas! Site chalu ho jayegi.

---

## 🎵 Apne gaane kaise daalein (important!)

Player aapke **apne MP3 files** chalaata hai. Bahar se kisi service pe
depend nahi karta. 4 easy steps:

### Step 1 — MP3 daalo
Sabhi `.mp3` files `songs/` folder mein copy kar do.
Example:
```
songs/ye-shaam-mastani.mp3
songs/dum-maro-dum.mp3
```

Filename chhota, bina spaces ke rakhna (accha rehta hai) — jaise
`phir-se-ud-chala.mp3`.

### Step 2 — (optional) Cover images daalo
Har gaane ke liye square (1:1) image `.jpg` ya `.png` `covers/` folder mein
daal do. Recommended: 500x500 ya 800x800.
Example:
```
covers/ye-shaam-mastani.jpg
```

Cover nahi hai toh chhod do — player automatic wooden-dhaba themed fallback
art dikhayega.

### Step 3 — Playlist edit karo
Root ki `playlist.js` file kholo. Pehli demo entry hata do aur apne gane
add karo:

```js
window.BC_PLAYLIST = [
  {
    title: "Ye Shaam Mastani",
    artist: "Kishore Kumar",
    file: "ye-shaam-mastani.mp3",     // songs/ ka filename
    cover: "ye-shaam-mastani.jpg",    // optional — covers/ ka filename
  },
  {
    title: "Dum Maro Dum",
    artist: "R. D. Burman",
    file: "dum-maro-dum.mp3",
    // cover nahi hai toh mat likho
  },
];
```

Jitne chaaho gane add karo, sab automatically play hote rahenge
(ek khatam hone ke baad agla chalu).

### Step 4 — Local test (zaroori nahi par accha hai)
Terminal / CMD mein is folder ke andar:
```bash
python3 -m http.server 8080
```
Phir browser mein `http://localhost:8080` kholo. Play dabao, gaana bajega.
⚠️  Index.html ko double-click mat karo (file:// protocol audio load nahi karta).

Jab theek lage, GitHub pe push kar do, Vercel auto update ho jayega.

---

## 📁 Project structure

```
berojgar-club/
├── index.html      # Pura page markup
├── styles.css      # Wood/lantern/dhaba styles
├── script.js       # Player + clock + carrom + members logic
├── playlist.js     # 👉 apne gaane yahaan list karo
├── hero.jpg        # Aapki poster (replaceable)
├── songs/          # MP3 files yahaan daalo
│   └── README.md
├── covers/         # Album covers yahaan daalo (optional)
│   └── README.md
├── vercel.json     # Vercel config (clean URLs)
└── README.md
```

---

## 🔗 Spotify / YT Music links

Top-right chips abhi generic hain. Apna public Spotify/YouTube Music playlist
link lagane ke liye `index.html` mein `.chip` wale `<a>` tags mein apna URL
paste kar do (Spotify/Apple Music/YT Music ke playlist page ka link).

---

## 🛠 Chhote customizations

- **Hero image change**: naya file `hero.jpg` naam se rakh do (ya `index.html`
  mein `<img src="hero.jpg">` edit karo).
- **Website title**: `<title>` aur `<h1>` mein jaake change kar lo.
- **Rules edit**: `index.html` ke `.rule-list` mein seedha Hindi/English likho.
- **Default members**: `script.js` ke `defaults` array mein edit karo.
- **Online count range**: `script.js` mein `Math.max(11, Math.min(58, online))`
  wali line mein numbers change karo.

---

## 💡 Tips

- MP3 ko 128kbps ya 192kbps mein rakho (fast load, small size).
- Total site size ~100 MB se neeche rakho (Vercel free tier comfortable).
- Agar shuffle chahiye, volume slider chahiye, ya "now playing" Telegram/
  Discord status integration chahiye — bol do, add kar deta hoon.

Made with 🫖, carrom powder aur ढेर सारा आराम।
