/* =========================================================
   Berojgar Club — client-side interactivity (v6 bullet-proof)
   Fixes: fast-skip cascade. We now track the "expected" video id
   and ignore any onError/onStateChange events that belong to a
   previous (already-unloaded) video. Also added load-cooldown so
   a broken track can't trigger more than one skip per load.
   ========================================================= */

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- Clock (IST) ---------- */
  const clockEl = $("#clock");
  const tickClock = () => {
    const t = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric", minute: "2-digit", hour12: true,
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
    const m = url.match(/(?:v=|youtu\.be\/|embed\/|v\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  const rawTracks = Array.isArray(window.BC_PLAYLIST)
    ? window.BC_PLAYLIST.filter(t => t && t.title)
    : [];

  const TRACKS = rawTracks.length
    ? rawTracks.map(t => ({
        title: t.title, artist: t.artist || "",
        ytId: ytIdFromUrl(t.yt || t.youtube || t.url || t.id)
      })).filter(t => t.ytId)
    : [];

  const MOODS = ["#c97b3c","#e8b66a","#4a6b8a","#7a5a8a","#2f4a3a","#d96b4a","#e8a86a","#5a3a24"];

  /* ---------- DOM refs ---------- */
  const npTitle  = $("#np-title");
  const npArtist = $("#np-artist");
  const npArt    = $(".np-art");
  const btnPlay  = $("#btn-play");
  const btnPrev  = $("#btn-prev");
  const btnNext  = $("#btn-next");
  const progress = $("#progress");
  const fill     = $("#progress-fill");
  const tCur     = $("#t-cur");
  const tDur     = $("#t-dur");

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

  // The id of the track we BELIEVE is currently loaded / intended.
  // Any YT events for a DIFFERENT id are from a previous load and get ignored.
  let expectedId = null;
  // Per-session list of ids we've already given up on.
  const badIds = new Set();
  // Guards against cascade-skip: minimum time between programmatic nexts.
  let lastAutoAdvanceAt = 0;
  const AUTO_ADVANCE_COOLDOWN_MS = 2500;
  // Did the user explicitly request play on this track?
  let userWantsPlaying = false;
  // Loading flag: ignore events until we see a matching PLAYING/PAUSED for expectedId.
  let loadingToken = 0;

  const fmt = (s) => {
    s = Math.max(0, Math.floor(isFinite(s) ? s : 0));
    const m = Math.floor(s / 60);
    const sec = String(s % 60).padStart(2, "0");
    return m + ":" + sec;
  };

  const setArt = (track) => {
    npArt.innerHTML = "";
    if (track && track.ytId) {
      const img = document.createElement("img");
      img.alt = track.title || "album art";
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
      const tryUrls = [
        "https://i.ytimg.com/vi/" + track.ytId + "/hqdefault.jpg",
        "https://i.ytimg.com/vi/" + track.ytId + "/mqdefault.jpg",
        "https://i.ytimg.com/vi/" + track.ytId + "/default.jpg"
      ];
      let tryIdx = 0;
      img.src = tryUrls[tryIdx];
      img.onload = () => {
        if (img.naturalWidth && img.naturalWidth < 200 && tryIdx < tryUrls.length - 1) {
          tryIdx++;
          img.src = tryUrls[tryIdx];
        }
      };
      img.onerror = () => {
        if (tryIdx < tryUrls.length - 1) { tryIdx++; img.src = tryUrls[tryIdx]; }
        else setFallbackArt(track);
      };
      const center = document.createElement("div");
      center.className = "np-center-dot";
      npArt.appendChild(img);
      npArt.appendChild(center);
      return;
    }
    setFallbackArt(track);
  };

  const setFallbackArt = (track) => {
    npArt.innerHTML = "";
    const color = MOODS[tIdx % MOODS.length];
    const inner = document.createElement("div");
    inner.className = "np-art-inner";
    inner.style.background =
      "radial-gradient(circle at 30% 30%, rgba(255,179,71,0.55), transparent 60%)," +
      "linear-gradient(135deg, #3a2416, #1a0f0a 60%, " + color + ")";
    const center = document.createElement("div");
    center.className = "np-center-dot";
    npArt.appendChild(inner);
    npArt.appendChild(center);
  };

  const tryPlay  = () => { try { player.playVideo(); } catch(e){} };
  const tryPause = () => { try { player.pauseVideo(); } catch(e){} };

  const showPlayingUI = () => {
    playing = true;
    btnPlay.textContent = "❚❚";
    npArt.classList.add("spinning");
    startProgressLoop();
  };
  const showPausedUI = () => {
    playing = false;
    btnPlay.textContent = "▶";
    npArt.classList.remove("spinning");
    stopProgressLoop();
  };

  const advanceToNext = (reason) => {
    const now = Date.now();
    if (now - lastAutoAdvanceAt < AUTO_ADVANCE_COOLDOWN_MS) return;
    lastAutoAdvanceAt = now;
    console.log("[BC] advancing to next, reason:", reason);
    loadTrack(tIdx + 1, true);
  };

  const markBadAndSkip = (badId, reason) => {
    if (!badId) return;
    if (badId !== expectedId) return; // stale
    badIds.add(badId);
    console.warn("[BC] skipping bad track:", badId, reason);
    try { player.stopVideo && player.stopVideo(); } catch(e) {}
    showPausedUI();
    tDur.textContent = "—:--";
    setTimeout(() => advanceToNext("bad-track"), 600);
  };

  const loadTrack = (i, autoplay = false) => {
    if (!TRACKS.length) return;
    tIdx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;

    if (badIds.size >= TRACKS.length) badIds.clear();

    let guard = 0;
    while (badIds.has(TRACKS[tIdx].ytId) && guard < TRACKS.length) {
      tIdx = (tIdx + 1) % TRACKS.length;
      guard++;
    }

    const t = TRACKS[tIdx];
    expectedId = t.ytId;
    loadingToken++;
    const myToken = loadingToken;

    npTitle.textContent = t.title;
    npArtist.textContent = t.artist || "";
    setArt(t);
    fill.style.width = "0%";
    tCur.textContent = "0:00";
    tDur.textContent = "…";
    duration = 0;

    if (!playerReady || !player) {
      scrobble = () => loadTrack(tIdx, autoplay);
      return;
    }

    try {
      player.cueVideoById(t.ytId, 0, "default");
    } catch(e) {
      console.warn("[BC] cueVideoById failed", e);
    }

    setTimeout(() => {
      if (myToken !== loadingToken || expectedId !== t.ytId) return;
      if (autoplay) {
        tryPlay();
      } else {
        tryPause();
      }
    }, 500);
  };

  const play = () => {
    if (!TRACKS.length) return;
    userWantsPlaying = true;
    if (playerReady && player) tryPlay();
    showPlayingUI();
  };
  const pause = () => {
    userWantsPlaying = false;
    if (playerReady && player) tryPause();
    showPausedUI();
  };
  const toggle = () => (playing ? pause() : play());
  const next = () => {
    lastAutoAdvanceAt = 0;
    loadTrack(tIdx + 1, userWantsPlaying || playing);
  };
  const prev = () => {
    if (playerReady && player) {
      try {
        if (player.getCurrentTime && player.getCurrentTime() > 3) {
          player.seekTo(0, true);
          fill.style.width = "0%";
          tCur.textContent = "0:00";
          return;
        }
      } catch(e) {}
    }
    loadTrack(tIdx - 1, playing);
  };

  /* Progress polling */
  const startProgressLoop = () => {
    stopProgressLoop();
    progTimer = setInterval(() => {
      if (!playerReady || !player) return;
      try {
        const cur = player.getCurrentTime() || 0;
        const dur = player.getDuration() || 0;
        const vidUrl = player.getVideoUrl ? player.getVideoUrl() : "";
        const curId = ytIdFromUrl(vidUrl);
        if (curId && curId !== expectedId) return;

        if (dur > 0) {
          duration = dur;
          fill.style.width = ((cur / dur) * 100) + "%";
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
      fill.style.width = (p * 100) + "%";
      tCur.textContent = fmt(p * duration);
    }
  });

  btnPlay.addEventListener("click", toggle);
  btnPrev.addEventListener("click", prev);
  btnNext.addEventListener("click", next);

  document.addEventListener("keydown", (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    else if (e.code === "ArrowRight") next();
    else if (e.code === "ArrowLeft") prev();
  });

  /* ---------- YouTube IFrame API ---------- */
  window.onYouTubeIframeAPIReady = () => {
    player = new YT.Player("yt-host", {
      height: "1", width: "1",
      playerVars: {
        autoplay: 0, controls: 0, disablekb: 1, fs: 0,
        iv_load_policy: 3, modestbranding: 1, playsinline: 1, rel: 0
      },
      events: {
        onReady: () => {
          playerReady = true;
          loadTrack(0, false);
          if (scrobble) { const fn = scrobble; scrobble = null; fn(); }
        },
        onStateChange: (ev) => {
          let eventId = null;
          try { eventId = ytIdFromUrl(player.getVideoUrl()); } catch(e) {}
          if (eventId && expectedId && eventId !== expectedId) return;
          if (loadingToken && ev.data === YT.PlayerState.UNSTARTED && !eventId) return;

          if (ev.data === YT.PlayerState.PLAYING) {
            if (eventId) expectedId = eventId;
            showPlayingUI();
            try {
              const d = player.getDuration();
              if (d > 0) { duration = d; tDur.textContent = fmt(d); }
            } catch(e) {}
            return;
          }
          if (ev.data === YT.PlayerState.PAUSED) {
            if (!userWantsPlaying) showPausedUI();
            return;
          }
          if (ev.data === YT.PlayerState.ENDED) {
            showPausedUI();
            advanceToNext("ended");
            return;
          }
        },
        onError: (ev) => {
          console.warn("[BC] YouTube error:", ev.data, "expectedId:", expectedId);
          let eventId = null;
          try { eventId = ytIdFromUrl(player.getVideoUrl()); } catch(e) {}
          if (eventId && expectedId && eventId !== expectedId) return;
          const badId = eventId || expectedId;
          markBadAndSkip(badId, "yt-error-" + ev.data);
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
      p.className = "piece p " + c;
      p.style.left = (cx + Math.cos(ang) * r) + "px";
      p.style.top  = (cy + Math.sin(ang) * r) + "px";
      border.appendChild(p);
    });
    const center = document.createElement("div");
    center.className = "piece p black got";
    center.style.left = cx + "px"; center.style.top  = cy + "px";
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
    $$(".piece.p", border).forEach((p) => {
      const dx = (Math.random() - 0.5) * 60;
      const dy = -40 - Math.random() * 80;
      p.style.transition = "transform 0.5s cubic-bezier(.2,.8,.2,1)";
      p.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
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
    } catch(e) {}
    return defaults.slice();
  };
  const saveMembers = (m) => { try { localStorage.setItem(storageKey, JSON.stringify(m)); } catch(e) {} };
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
    return "hsl(" + h + ", 55%, 58%)";
  };
  const renderMembers = () => {
    memberList.innerHTML = "";
    members.forEach(m => {
      const li = document.createElement("li");
      const initial = (m.name || "?").trim().charAt(0).toUpperCase();
      const s = statuses[m.status] || statuses.new;
      li.innerHTML = '<span class="avatar" style="background: linear-gradient(135deg, ' + avatarColor(m.name) + ', #c97b3c)">' + initial + '</span>' +
        '<span class="m-name"></span>' +
        '<span class="status ' + s.cls + '">' + s.label + '</span>';
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
    try { memberList.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch(e) {}
  });
})();
