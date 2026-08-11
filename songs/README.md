# Apne gaane kaise daalein — step by step

Berojgar Club ka player ab aapke **apne MP3 files** chala sakta hai. Koi external
service (Spotify/Apple/YouTube) ki zaroorat nahi.

## Step 1 — MP3 files daalo
1. Is `songs/` folder ke andar apne sabhi `.mp3` files copy karo.
   - Example: `songs/ye-shaam-mastani.mp3`
   - Files ka naam chhota, simple, bina spaces ke rakhna accha rehta hai
     (e.g. `phir-se-ud-chala.mp3` na ki `Phir Se Ud Chala (Final Mix 2024).mp3`)

## Step 2 — (optional) Cover images daalo
Har gaane ke liye ek square (1:1) album art chahiye toh `covers/` folder mein
daalo — `.jpg` ya `.png` chalega.
   - Example: `covers/ye-shaam-mastani.jpg` (500x500 ya 800x800 best)

Agar kisi gaane ka cover nahi hai toh chhod do — player automatically
wooden-dhaba themed fallback art dikha dega.

## Step 3 — Playlist edit karo
Root folder ki `playlist.js` file kholo aur `window.BC_PLAYLIST` array ke andar
har gaane ke liye ek object add karo:

```js
window.BC_PLAYLIST = [
  {
    title: "Ye Shaam Mastani",
    artist: "Kishore Kumar",
    file: "ye-shaam-mastani.mp3",       // songs/ ka filename
    cover: "ye-shaam-mastani.jpg",      // optional
  },
  {
    title: "Dum Maro Dum",
    artist: "R. D. Burman",
    file: "dum-maro-dum.mp3",
    // cover nahi hai to mat likho
  },
];
```

Upar pehla `Apna pehla gaana daalo` wali demo entry hata dena mat bhoolna.

## Step 4 — Test locally (optional, recommend)
Terminal mein is folder ke andar jaake:
```bash
python3 -m http.server 8080
```
Phir browser mein `http://localhost:8080` kholo. Play button dabao, gaana
chalu ho jayega. **Double-click na karo index.html ko** (file:// protocol
audio fetch nahi karta).

## Step 5 — Deploy to Vercel
Puri folder (songs/ covers/ aur naya playlist.js sab saath) GitHub pe push
karo, Vercel automatically naya version deploy kar dega. Bada album (e.g. 20
gane) bhi deploy ho jata hai — bas total size ~100MB se neeche rakho.

## Tips
- MP3 128kbps / 192kbps chalega (fast load, small size).
- Gaana shuffle chahiye? bol do, laga deta hoon.
- Volume slider? bol do.
- Spotify embed button apne public playlist link se connect karna ho toh
  `index.html` mein `.chip` wale links mein apna URL paste kar do.
