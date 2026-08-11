/* =========================================================
   Berojgar Club — client-side interactivity
   - Live Indian clock
   - Fake "members loitering" counter
   - REAL music player (aapke apne MP3, playlist.js se)
   - Visual animation mode (jab koi real file nahi hai)
   - Mini carrom striker on click/tap
   - Join form (localStorage)
   - Chai / carrom auto counters
   ========================================================= */

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Clock (IST) ---------- */
  const clockEl = $("#clock");
  const tickClock = () => {
    const t = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
    if (clockEl) clockEl.textContent = t.toLowerCase();
  };
  tickClock();
  setInterval(tickClock, 30 * 1000);
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Online counter ---------- */
  const onlineEl = $("#online-count");
  let online = 23 + Math.floor(Math.random() * 18);
  const updateOnline = () => {
    online += Math.random() < 0.5 ? -1 : 1;
    online = Math.max(11, Math.min(58, online));
    onlineEl.textContent = online;
  };
  updateOnline();
  setInterval(updateOnline, 7000);

  /* ---------- Playlist load ---------- */
  const USER_TRACKS = Array.isArray(window.BC_PLAYLIST)
    ? window.BC_PLAYLIST.filter(t => t && t.title)
    : [];

  const HAS_REAL_TRACKS = USER_TRACKS.some(t => t.file);

  const VISUAL_TRACKS = [
    { title: "Apna pehla gaana daalo — (placeholder)", artist: "Berojgar Club Radio", file: null, cover: null, mood: "#c97b3c" },
    { title: "Dum Maro Dum (yaad aa rahi)",            artist: "R. D. Burman (placeholder)",     file: null, mood: "#c97b3c" },
    { title: "Ye Shaam Mastani (yaad aa rahi)",        artist: "Kishore Kumar (placeholder)",    file: null, mood: "#e8b66a" },
    { title: "Phir Se Ud Chala (yaad aa rahi)",        artist: "Mohit Chauhan (placeholder)",    file: null, mood: "#4a6b8a" },
    { title: "Tum Hi Ho Bandhu (yaad aa rahi)",        artist: "Pritam (placeholder)",           file: null, mood: "#d96b4a" },
    { title: "Chaiyya Chaiyya (yaad aa rahi)",         artist: "Sukhwinder Singh (placeholder)", file: null, mood: "#5a3a24" },
  ];

  const TRACKS = HAS_REAL_TRACKS ? USER_TRACKS : VISUAL_TRACKS;

  const MOODS = ["#c97b3c","#e8b66a","#4a6b8a","#7a5a8a","#2f4a3a","#d96b4a","#e8a86a","#5a3a24"];

  /* ---------- DOM refs ---------- */
  const npTitle   = $("#np-title");
  const npArtist  = $("#np-artist");
  const npArt     = $(".np-art");
  const btnPlay   = $("#btn-play");
  const btnPrev   = $("#btn-prev");
  const btnNext   = $("#btn-next");
  const progress  = $("#progress");
  const fill      = $("#progress-fill");
  const tCur      = $("#t-cur");
  const tDur      = $("#t-dur");
  const radio     = $("#radio");

  /* ---------- Player state ---------- */
  let tIdx = 0;
  let playing = false;
  let visualProgress = 0;
  let visualDuration = 240;
  let lastTick = performance.now();

  const fmt = (s) => {
    s = Math.max(0, Math.floor(isFinite(s) ? s : 0));
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  const setArt = (track) => {
    npArt.innerHTML = "";
    const cover = track && track.cover;
    if (cover) {
      const isExternal = /^https?:\/\//i.test(cover);
      const img = document.createElement("img");
      img.src = isExternal ? cover : `covers/${cover}`;
      img.alt = track.title || "album art";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
      img.onerror = () => setFallbackArt(track);
      const center = document.createElement("div");
      center.className = "np-center-dot";
      npArt.appendChild(img);
      npArt.appendChild(center);
    } else {
      setFallbackArt(track);
    }
  };

  const setFallbackArt = (track) => {
    npArt.innerHTML = "";
    const inner = document.createElement("div");
    const color = (track && track.mood) || MOODS[tIdx % MOODS.length];
    inner.className = "np-art-inner";
    inner.style.background =
      `radial-gradient(circle at 30% 30%, rgba(255,179,71,0.55), transparent 60%),
       linear-gradient(135deg, #3a2416, #1a0f0a 60%, ${color})`;
    const center = document.createElement("div");
    center.className = "np-center-dot";
    npArt.appendChild(inner);
    npArt.appendChild(center);
  };

  const loadTrack = (i, autoplayHint = false) => {
    tIdx = (i + TRACKS.length) % TRACKS.length;
    const t = TRACKS[tIdx];
    npTitle.textContent = t.title;
    npArtist.textContent = t.artist || "";
    setArt(t);
    fill.style.width = "0%";

    const src = t.file || null;
    const isExternal = typeof src === "string" && /^https?:\/\//i.test(src);

    if (src) {
      radio.src = isExternal ? src : `songs/${src}`;
      try { radio.load(); } catch(e) { console.warn(e); }
      radio.onloadedmetadata = () => {
        tDur.textContent = fmt(radio.duration);
      };
      radio.onended = () => { next(true); };
      radio.ontimeupdate = () => {
        if (!radio.duration) return;
        const p = radio.currentTime / radio.duration;
        fill.style.width = `${p * 100}%`;
        tCur.textContent = fmt(radio.currentTime);
        tDur.textContent = fmt(radio.duration);
      };
      radio.onerror = () => {
        console.warn("[Berojgar Club] Could not load:", radio.src);
        tCur.textContent = "0:00";
        tDur.textContent = "—:--";
      };
      tDur.textContent = "…";
    } else {
      radio.removeAttribute("src");
      try { radio.load(); } catch(e) {}
      visualDuration = 220 + Math.floor(Math.random() * 120);
      visualProgress = 0;
      tDur.textContent = fmt(visualDuration);
    }

    if (autoplayHint) play();
    updateSpin();
  };

  const play = () => {
    const t = TRACKS[tIdx];
    if (t.file) {
      const p = radio.play();
      if (p && p.catch) {
        p.catch(err => {
          console.warn("[Berojgar Club] Autoplay blocked:", err && err.message);
          playing = false;
          btnPlay.textContent = "▶";
          updateSpin();
        });
      }
    }
    playing = true;
    btnPlay.textContent = "❚❚";
    lastTick = performance.now();
    updateSpin();
  };

  const pause = () => {
    radio.pause();
    playing = false;
    btnPlay.textContent = "▶";
    updateSpin();
  };

  const toggle = () => (playing ? pause() : play());

  const next = (autoplay = false) => {
    loadTrack(tIdx + 1, autoplay);
  };
  const prev = () => {
    if (TRACKS[tIdx].file && radio.currentTime > 3) {
      radio.currentTime = 0;
      fill.style.width = "0%";
      return;
    }
    loadTrack(tIdx - 1, playing);
  };

  const updateSpin = () => {
    if (playing) npArt.classList.add("spinning");
    else npArt.classList.remove("spinning");
  };

  btnPlay.addEventListener("click", toggle);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", () => next(playing));

  progress.addEventListener("click", (e) => {
    const rect = progress.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = TRACKS[tIdx];
    if (t.file && radio.duration) {
      radio.currentTime = p * radio.duration;
    } else {
      visualProgress = p;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    else if (e.code === "ArrowRight") next(playing);
    else if (e.code === "ArrowLeft") prev();
  });

  /* ---------- Animation loop ---------- */
  const tick = (now) => {
    if (playing) {
      const dt = (now - lastTick) / 1000;
      lastTick = now;

      const t = TRACKS[tIdx];
      if (!t.file) {
        visualProgress += dt / visualDuration;
        if (visualProgress >= 1) {
          visualProgress = 0;
          tIdx = (tIdx + 1) % TRACKS.length;
          loadTrack(tIdx, true);
        }
        fill.style.width = `${visualProgress * 100}%`;
        tCur.textContent = fmt(visualProgress * visualDuration);
      }
    } else {
      lastTick = now;
    }
    requestAnimationFrame(tick);
  };

  if (!HAS_REAL_TRACKS) {
    const hint = document.createElement("p");
    hint.className = "np-hint";
    hint.innerHTML = '👉 <code>playlist.js</code> edit karke apne MP3 daalo — <code>songs/</code> folder mein';
    const npRight = btnPlay.parentElement;
    npRight.appendChild(hint);
  }

  loadTrack(0, false);
  requestAnimationFrame(tick);

  /* ---------- Chai + Carrom counters ---------- */
  const chaiEl = $("#chai-count");
  const carromEl = $("#carrom-count");
  setInterval(() => { if (Math.random() < 0.25) chaiEl.textContent = +chaiEl.textContent + 1; }, 12000);
  setInterval(() => { if (Math.random() < 0.18) carromEl.textContent = +carromEl.textContent + 1; }, 22000);

  /* ---------- Mini carrom board ---------- */
  const carrom = $("#carrom");
  const border = $(".carrom-border");
  const striker = $("#striker");

  const pieceColors = ["black","white","black","white","queen","white","black","white","black"];
  const placePieces = () => {
    $$(".piece.p", border).forEach(p => p.remove());
    const rect = border.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2, r = 22;
    pieceColors.forEach((c, i) => {
      const ang = (i / pieceColors.length) * Math.PI * 2;
      const p = document.createElement("div");
      p.className = `piece p ${c}`;
      p.style.left = `${cx + Math.cos(ang) * r}px`;
      p.style.top  = `${cy + Math.sin(ang) * r}px`;
      border.appendChild(p);
    });
    const center = document.createElement("div");
    center.className = "piece p black got";
    center.style.left = `${cx}px`; center.style.top  = `${cy}px`;
    border.appendChild(center);
  };
  requestAnimationFrame(placePieces);
  window.addEventListener("resize", placePieces);

  let strikerX = 50;
  striker.style.left = strikerX + "%";
  carrom.addEventListener("click", (e) => {
    const rect = carrom.getBoundingClientRect();
    strikerX = Math.max(8, Math.min(92, ((e.clientX - rect.left) / rect.width) * 100));
    striker.style.left = strikerX + "%";
    const pieces = $$(".piece.p", border);
    pieces.forEach((p) => {
      const dx = (Math.random() - 0.5) * 60;
      const dy = -40 - Math.random() * 80;
      p.style.transition = "transform 0.5s cubic-bezier(.2,.8,.2,1)";
      p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      setTimeout(() => {
        p.style.transition = "transform 0.6s cubic-bezier(.2,.8,.2,1)";
        p.style.transform = "translate(-50%,-50%)";
      }, 520);
    });
    if (Math.random() < 0.5) carromEl.textContent = +carromEl.textContent + 1;
  });

  /* ---------- Members / Join ---------- */
  const memberList = $("#member-list");
  const storageKey = "berojgar_members_v1";
  const defaults = [
    { name: "Bunty (B.A. fail)",                  status: "carrom" },
    { name: "Pappu bhai",                         status: "chai" },
    { name: "Anita didi (M.A.)",                  status: "newspaper" },
    { name: "Raju guide",                         status: "asleep" },
    { name: "Sharmaji ka beta",                   status: "pretending" },
    { name: "Bhaiya from closed coaching centre", status: "philosophy" },
  ];
  const loadMembers = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch {}
    return defaults.slice();
  };
  const saveMembers = (m) => { try { localStorage.setItem(storageKey, JSON.stringify(m)); } catch {} };
  let members = loadMembers();

  const statuses = {
    carrom:     { label: "कैरम में व्यस्त", cls: "busy" },
    chai:       { label: "चाय का इंतज़ार",  cls: "idle" },
    newspaper:  { label: "अख़बार पढ़ रहे",   cls: "idle" },
    asleep:     { label: "झपकी ले रहे",    cls: "idle" },
    pretending: { label: "पढ़ने का नाटक",   cls: "busy" },
    philosophy: { label: "जीवन-चर्चा",     cls: "busy" },
    new:        { label: "नए आये",         cls: "idle" },
  };
  const avatarColor = (name) => {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h}, 55%, 58%)`;
  };
  const renderMembers = () => {
    memberList.innerHTML = "";
    members.forEach(m => {
      const li = document.createElement("li");
      const initial = (m.name || "?").trim().charAt(0).toUpperCase();
      const s = statuses[m.status] || statuses.new;
      li.innerHTML = `
        <span class="avatar" style="background: linear-gradient(135deg, ${avatarColor(m.name)}, #c97b3c)">${initial}</span>
        <span class="m-name"></span>
        <span class="status ${s.cls}">${s.label}</span>
      `;
      li.querySelector(".m-name").textContent = m.name;
      memberList.appendChild(li);
    });
  };
  renderMembers();
  setInterval(() => {
    const keys = Object.keys(statuses).filter(k => k !== "new");
    members = members.map((m, i) => {
      if (i < defaults.length && Math.random() < 0.6) return m;
      return { ...m, status: keys[Math.floor(Math.random() * keys.length)] };
    });
    saveMembers(members);
    renderMembers();
  }, 20000);

  $("#join-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#name-input");
    const name = (input.value || "").trim();
    if (!name) return;
    members = [{ name, status: "new" }, ...members].slice(0, 60);
    saveMembers(members);
    renderMembers();
    input.value = "";
    memberList.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
})();
