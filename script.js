/* =========================================================
   Berojgar Club — client-side interactivity
   - Live Indian clock (IST)
   - Fake "members loitering" counter
   - YouTube-powered MUSIC PLAYER (poore gaane, no MP3 upload)
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

  /* ---------- Helpers ---------- */
  const ytIdFromUrl = (url) => {
    if (!url) return null;
    if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
    const m = url.match(/(?:v=|youtu\.be\/|embed\/|v\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  const rawTracks = Array.isArray(window.BC_PLAYLIST)
    ? window.BC_PLAYLIST.filter(t => t && t.title)
    : [];

  const TRACKS = rawTracks.length
    ? rawTracks.map(t => ({
        title: t.title,
        artist: t.artist || "",
        ytId: ytIdFromUrl(t.yt || t.youtube || t.url || t.id)
      })).filter(t => t.ytId)
    : [];

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

  /* ---------- Hidden YouTube player ---------- */
  const ytHost = document.createElement("div");
  ytHost.id = "yt-host";
  ytHost.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
  document.body.appendChild(ytHost);

  /* ---------- Player state ---------- */
  let tIdx = 0;
  let playing = false;
  let player = null;
  let playerReady = false;
  let duration = 0;
  let progTimer = null;
  let scrobble = null;

  const fmt = (s) => {
    s = Math.max(0, Math.floor(isFinite(s) ? s : 0));
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, "0");
    return `${m}:${sec}`;
  };

  const setArt = (track) => {
    npArt.innerHTML = "";
    const img = document.createElement("img");
    img.src = `https://i.ytimg.com/vi/${track.ytId}/hqdefault.jpg`;
    img.alt = track.title;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    img.onerror = () => setFallbackArt(track);
    const center = document.createElement("div");
    center.className = "np-center-dot";
    npArt.appendChild(img);
    npArt.appendChild(center);
  };

  const setFallbackArt = (track) => {
    npArt.innerHTML = "";
    const inner = document.createElement("div");
    const color = MOODS[tIdx % MOODS.length];
    inner.className = "np-art-inner";
    inner.style.background =
      `radial-gradient(circle at 30% 30%, rgba(255,179,71,0.55), transparent 60%),
       linear-gradient(135deg, #3a2416, #1a0f0a 60%, ${color})`;
    const center = document.createElement("div");
    center.className = "np-center-dot";
    npArt.appendChild(inner);
    npArt.appendChild(center);
  };

  const loadTrack = (i, autoplay = false) => {
    tIdx = (i + TRACKS.length) % TRACKS.length;
    const t = TRACKS[tIdx];
    if (!t) return;
    npTitle.textContent = t.title;
    npArtist.textContent = t.artist || "";
    setArt(t);
    fill.style.width = "0%";
    tCur.textContent = "0:00";
    tDur.textContent = "—:--";

    if (!playerReady || !player) {
      scrobble = () => loadTrack(i, autoplay);
      return;
    }

    player.loadVideoById(t.ytId);
    if (!autoplay) {
      setTimeout(() => tryPause(), 300);
    } else {
      setTimeout(() => tryPlay(), 300);
    }
  };

  const tryPlay = () => { try { player.playVideo(); } catch(e) {} };
  const tryPause = () => { try { player.pauseVideo(); } catch(e) {} };

  const play = () => {
    if (!TRACKS.length) return;
    if (playerReady && player) tryPlay();
    playing = true;
    btnPlay.textContent = "❚❚";
    updateSpin();
    startProgressLoop();
  };
  const pause = () => {
    if (playerReady && player) tryPause();
    playing = false;
    btnPlay.textContent = "▶";
    updateSpin();
    stopProgressLoop();
  };
  const toggle = () => (playing ? pause() : play());
  const next = (auto = false) => {
    const newIdx = (tIdx + 1) % TRACKS.length;
    loadTrack(newIdx, playing || auto);
  };
  const prev = () => {
    if (playerReady && player && player.getCurrentTime && player.getCurrentTime() > 3) {
      player.seekTo(0, true);
      fill.style.width = "0%";
      tCur.textContent = "0:00";
      return;
    }
    loadTrack(tIdx - 1, playing);
  };

  const updateSpin = () => {
    if (playing) npArt.classList.add("spinning");
    else npArt.classList.remove("spinning");
  };

  const startProgressLoop = () => {
    stopProgressLoop();
    progTimer = setInterval(() => {
      if (!playerReady || !player || !player.getCurrentTime) return;
      try {
        const cur = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        if (dur > 0) {
          duration = dur;
          fill.style.width = `${(cur / dur) * 100}%`;
          tCur.textContent = fmt(cur);
          tDur.textContent = fmt(dur);
        }
      } catch(e) {}
    }, 500);
  };
  const stopProgressLoop = () => {
    if (progTimer) { clearInterval(progTimer); progTimer = null; }
  };

  progress.addEventListener("click", (e) => {
    const rect = progress.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (playerReady && player && player.seekTo && duration > 0) {
      player.seekTo(p * duration, true);
      fill.style.width = `${p * 100}%`;
      tCur.textContent = fmt(p * duration);
    }
  });

  btnPlay.addEventListener("click", toggle);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", () => next(false));

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    else if (e.code === "ArrowRight") next(false);
    else if (e.code === "ArrowLeft") prev();
  });

  /* ---------- YouTube IFrame API ---------- */
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player("yt-host", {
      height: "1",
      width: "1",
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0
      },
      events: {
        onReady: () => {
          playerReady = true;
          loadTrack(0, false);
          if (scrobble) { const fn = scrobble; scrobble = null; fn(); }
        },
        onStateChange: (ev) => {
          if (ev.data === YT.PlayerState.PLAYING) {
            playing = true;
            btnPlay.textContent = "❚❚";
            updateSpin();
            startProgressLoop();
            duration = player.getDuration() || duration;
            tDur.textContent = fmt(duration);
          } else if (ev.data === YT.PlayerState.PAUSED) {
            playing = false;
            btnPlay.textContent = "▶";
            updateSpin();
            stopProgressLoop();
          } else if (ev.data === YT.PlayerState.ENDED) {
            stopProgressLoop();
            next(true);
          }
        },
        onError: () => {
          setTimeout(() => next(true), 800);
        }
      }
    });
  };

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScript = document.getElementsByTagName("script")[0];
  firstScript.parentNode.insertBefore(tag, firstScript);

  if (!TRACKS.length) {
    npTitle.textContent = "Playlist में कोई गाना नहीं है";
    npArtist.textContent = "playlist.js में YouTube links add karo →";
    btnPlay.disabled = true;
    btnPlay.style.opacity = "0.5";
  }

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
    { name: "Bhaiya from closed coaching centre", status: "philosophy" }
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
    new:        { label: "नए आये",         cls: "idle" }
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
