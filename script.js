(function () {
  var cfg = window.CONFIG || {};
  var root = document.documentElement;

  if (cfg.background) {
    var images = (cfg.background.images && cfg.background.images.length)
      ? cfg.background.images
      : (cfg.background.image ? [cfg.background.image] : []);

    root.style.setProperty('--overlay-color', cfg.background.overlayColor || '6, 8, 13');
    root.style.setProperty('--overlay-opacity', cfg.background.overlayOpacity != null ? cfg.background.overlayOpacity : 0.35);

    if (images.length) {
      var current = Math.floor(Math.random() * images.length);
      root.style.setProperty('--bg-image', 'url("' + images[current] + '")');

      if (images.length > 1) {
        var fadeMs = cfg.background.fadeMs != null ? cfg.background.fadeMs : 1200;
        var intervalMs = cfg.background.intervalMs != null ? cfg.background.intervalMs : 10000;
        var fadeEl = document.getElementById('bgFade');
        fadeEl.style.transitionDuration = fadeMs + 'ms';

        var pickNext = function () {
          if (images.length < 2) return current;
          var next;
          do {
            next = Math.floor(Math.random() * images.length);
          } while (next === current);
          return next;
        };

        var cycle = function () {
          fadeEl.style.opacity = '1';
          setTimeout(function () {
            current = pickNext();
            root.style.setProperty('--bg-image', 'url("' + images[current] + '")');
            setTimeout(function () {
              fadeEl.style.opacity = '0';
            }, 50);
          }, fadeMs);
        };

        setInterval(cycle, intervalMs);
      }
    }
  }

  // Beta Settings panel (Shift+S) — Pre-Alpha2.5+ only. Everything in
  // this block, including the keyboard shortcut itself, only runs when
  // the flag is on; older versions get none of it (not even a
  // do-nothing listener) and never gain the `.hide-scrollbars` class,
  // so their scrollbars stay exactly as they always were.
  if (cfg.features && cfg.features.betaSettingsPanel) {
    var betaSettingsEl = document.getElementById('betaSettings');
    var betaSettingsCloseEl = document.getElementById('betaSettingsClose');
    var betaHideScrollbarToggleEl = document.getElementById('betaHideScrollbarToggle');

    // Defaults to ON as soon as the flag is active — hiding scrollbars
    // is the intended default look for these versions; the panel just
    // lets someone opt back out (e.g. for debugging) without needing to
    // touch the code.
    root.classList.add('hide-scrollbars');
    if (betaHideScrollbarToggleEl) betaHideScrollbarToggleEl.checked = true;

    if (betaHideScrollbarToggleEl) {
      betaHideScrollbarToggleEl.addEventListener('change', function () {
        root.classList.toggle('hide-scrollbars', betaHideScrollbarToggleEl.checked);
      });
    }

    // Lets someone swap in their own Cloudflare Worker (their own
    // deployment of proxy-worker.js) without touching config.js —
    // useful if the default one is down/rate-limited, or they're
    // running their own fork. Every other place in this file reads
    // `(window.CONFIG || {}).gameApiProxyBase` fresh at the moment it's
    // needed rather than caching it once, so mutating it here on `cfg`
    // (the same object window.CONFIG points to) is all that's needed —
    // no other code path needs to know this override exists.
    var PROXY_STORAGE_KEY = 'roz_custom_proxy';
    var defaultProxyBase = cfg.gameApiProxyBase || '';
    var betaProxyNameEl = document.getElementById('betaProxyName');
    var betaProxyUsernameEl = document.getElementById('betaProxyUsername');
    var betaProxyApplyEl = document.getElementById('betaProxyApply');
    var betaProxyResetEl = document.getElementById('betaProxyReset');
    var betaProxyCurrentEl = document.getElementById('betaProxyCurrent');

    var updateProxyStatus = function () {
      if (!betaProxyCurrentEl) return;
      var active = cfg.gameApiProxyBase || '';
      var isCustom = active !== defaultProxyBase;
      betaProxyCurrentEl.textContent = active ? ('Đang dùng: ' + active) : 'Chưa cấu hình proxy nào.';
      betaProxyCurrentEl.classList.toggle('is-custom', isCustom);
    };

    var applyProxyOverride = function (name, username, persist) {
      name = (name || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      username = (username || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!name || !username) return false;
      cfg.gameApiProxyBase = 'https://' + name + '.' + username + '.workers.dev';
      if (persist) {
        try {
          localStorage.setItem(PROXY_STORAGE_KEY, JSON.stringify({ name: name, username: username }));
        } catch (err) { /* localStorage unavailable — override still works for this session */ }
      }
      updateProxyStatus();
      return true;
    };

    // Restore a previously-saved override on load, if any.
    try {
      var savedProxyRaw = localStorage.getItem(PROXY_STORAGE_KEY);
      if (savedProxyRaw) {
        var savedProxy = JSON.parse(savedProxyRaw);
        if (savedProxy && savedProxy.name && savedProxy.username) {
          if (betaProxyNameEl) betaProxyNameEl.value = savedProxy.name;
          if (betaProxyUsernameEl) betaProxyUsernameEl.value = savedProxy.username;
          applyProxyOverride(savedProxy.name, savedProxy.username, false);
        }
      }
    } catch (err) { /* corrupt/unavailable storage — just fall back to the default */ }
    updateProxyStatus();

    if (betaProxyApplyEl) {
      betaProxyApplyEl.addEventListener('click', function () {
        var ok = applyProxyOverride(
          betaProxyNameEl ? betaProxyNameEl.value : '',
          betaProxyUsernameEl ? betaProxyUsernameEl.value : '',
          true
        );
        if (!ok && betaProxyCurrentEl) {
          betaProxyCurrentEl.textContent = 'Cần nhập đủ cả tên worker và username.';
          betaProxyCurrentEl.classList.remove('is-custom');
        }
      });
    }

    if (betaProxyResetEl) {
      betaProxyResetEl.addEventListener('click', function () {
        cfg.gameApiProxyBase = defaultProxyBase;
        try { localStorage.removeItem(PROXY_STORAGE_KEY); } catch (err) { /* ignore */ }
        if (betaProxyNameEl) betaProxyNameEl.value = '';
        if (betaProxyUsernameEl) betaProxyUsernameEl.value = '';
        updateProxyStatus();
      });
    }

    if (betaSettingsEl) {
      var closeBetaSettings = function () {
        betaSettingsEl.hidden = true;
      };
      var openBetaSettings = function () {
        betaSettingsEl.hidden = false;
      };

      if (betaSettingsCloseEl) {
        betaSettingsCloseEl.addEventListener('click', closeBetaSettings);
      }

      document.addEventListener('keydown', function (e) {
        if (e.key !== 'S' && e.key !== 's') return;
        if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
        // Don't hijack a capital S the person is actually typing —
        // Shift+S is completely ordinary input while a text field has
        // focus (e.g. typing "Simulator" in the search box).
        var active = document.activeElement;
        if (active) {
          var tag = active.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable) return;
        }
        e.preventDefault();
        if (betaSettingsEl.hidden) {
          openBetaSettings();
        } else {
          closeBetaSettings();
        }
      });
    }
  }

  if (cfg.brand) {
    var brandMark = document.getElementById('brandMark');
    if (cfg.brand.logoImage) {
      brandMark.innerHTML = '<img src="' + cfg.brand.logoImage + '" alt="" onerror="this.parentElement.textContent=\'' + (cfg.brand.logoText || '') + '\'">';
    } else {
      brandMark.textContent = cfg.brand.logoText || '';
    }
    document.getElementById('brandName').textContent = cfg.brand.name || '';
    document.title = cfg.brand.name || document.title;
  }

  if (cfg.topbar) {
    var cta = document.getElementById('ctaButton');
    var ctaLabel = document.getElementById('ctaLabel');
    if (ctaLabel) {
      ctaLabel.textContent = cfg.topbar.ctaText || '';
    }
    if (cfg.topbar.ctaLink) {
      cta.setAttribute('href', cfg.topbar.ctaLink);
    }
  }

  if (cfg.version) {
    var versionNameEl = document.getElementById('versionBadgeName');
    var versionCodeEl = document.getElementById('versionBadgeCode');
    if (versionNameEl && cfg.version.name) {
      versionNameEl.textContent = cfg.version.name;
    }
    if (versionCodeEl) {
      if (cfg.version.code) {
        versionCodeEl.textContent = cfg.version.code;
        versionCodeEl.hidden = false;
      } else {
        versionCodeEl.hidden = true;
      }
    }
  }

  if (cfg.ntzDesc) {
    var ntzDesc = document.getElementById('ntzDesc');
    if (ntzDesc) {
      if (cfg.ntzDesc.lines && cfg.ntzDesc.lines.length) {
        ntzDesc.innerHTML = cfg.ntzDesc.lines.map(function (line) {
          var span = document.createElement('span');
          span.textContent = line;
          return span.outerHTML;
        }).join('<br>');
      } else {
        ntzDesc.textContent = cfg.ntzDesc.text || '';
      }
    }
  }

  if (cfg.ntzNotify) {
    var notifyTitle = document.getElementById('ntzNotifyTitle');
    var notifyLabel = document.getElementById('ntzNotifyLabel');
    var notifyBody = document.getElementById('ntzNotifyBody');
    if (notifyTitle) notifyTitle.textContent = cfg.ntzNotify.title || notifyTitle.textContent;
    if (notifyLabel) notifyLabel.textContent = cfg.ntzNotify.label || notifyLabel.textContent;
    if (notifyBody) {
      if (cfg.ntzNotify.lines && cfg.ntzNotify.lines.length) {
        notifyBody.innerHTML = cfg.ntzNotify.lines.map(function (line) {
          var span = document.createElement('span');
          span.textContent = line;
          return span.outerHTML;
        }).join('<br>');
      } else {
        notifyBody.textContent = cfg.ntzNotify.text || '';
      }
    }
  }

  if (cfg.input) {
    var field = document.getElementById('gameLinkInput');
    if (field && cfg.input.placeholder) {
      field.setAttribute('placeholder', cfg.input.placeholder);
    }
  }

  if (cfg.icons && cfg.icons.favicon) {
    var favicon = document.getElementById('favicon');
    if (favicon) {
      favicon.setAttribute('href', cfg.icons.favicon);
    }
  }

  var topbarEl = document.querySelector('.topbar');
  if (topbarEl) {
    var TOPBAR_SCROLL_THRESHOLD = 40;
    var updateTopbarState = function () {
      if (window.scrollY > TOPBAR_SCROLL_THRESHOLD) {
        topbarEl.classList.add('is-floating');
      } else {
        topbarEl.classList.remove('is-floating');
      }
    };
    window.addEventListener('scroll', updateTopbarState, { passive: true });
    updateTopbarState();
  }

  var ntzPanel = document.getElementById('ntzPanel');
  if (ntzPanel) {
    var ntzDesc = document.getElementById('ntzDesc');
    var ntzNotify = document.getElementById('ntzNotify');
    var stateTimer = null;
    var OPEN_BLINK_MS = 400;
    // Time for the notify frame/body/divider to fully fade+slide out (their
    // closing-specific CSS transitions have no delay, longest is ~0.24s)
    // before we're allowed to collapse the reserved 46% layout column.
    var CLOSE_FADE_MS = 260;
    // Time for the panel width to finish animating back to its normal size
    // (matches the 0.26s closing width transition) before revealing the
    // text again.
    var CLOSE_WIDTH_MS = 280;

    // .ntz-panel is position:absolute, so it doesn't push .paper down on
    // its own — .ntz-hover-zone's padding-bottom is what reserves room for
    // it. That reserve used to be a fixed guess, which broke on narrow
    // screens where the description text wraps to more lines (or the
    // notify frame stacks vertically) and ends up taller than the guess,
    // overlapping the content below. Measure the panel's real height
    // instead, and keep the reserve in sync whenever it changes — on
    // resize, on open/close, on font-size changes from clamp(), etc.
    var hoverZone = document.getElementById('hoverZone');
    if (hoverZone && window.ResizeObserver) {
      var ro = new ResizeObserver(function (entries) {
        var h = entries[0].target.offsetHeight;
        hoverZone.style.setProperty('--ntz-panel-reserve', h + 'px');
      });
      ro.observe(ntzPanel);
    }

    ntzPanel.addEventListener('click', function (e) {
      e.stopPropagation();
      if (stateTimer) {
        clearTimeout(stateTimer);
        stateTimer = null;
      }
      var isOpen = ntzPanel.classList.contains('is-notify');

      if (!isOpen) {
        // Defensive cleanup: if a previous close was interrupted mid-way,
        // is-closing may still be stuck on the panel — clear it so the
        // notify frame is able to show again.
        ntzPanel.classList.remove('is-closing');
        if (ntzDesc) {
          ntzDesc.classList.add('is-blinking');
        }
        stateTimer = setTimeout(function () {
          ntzPanel.classList.add('is-notify');
          ntzPanel.classList.add('is-desc-narrow');
          if (ntzDesc) {
            ntzDesc.classList.remove('is-blinking');
          }
          stateTimer = null;
        }, OPEN_BLINK_MS);
      } else {
        ntzPanel.classList.add('is-closing');
        if (ntzDesc) {
          ntzDesc.classList.add('is-blinking');
        }
        // Text stays hidden (is-blinking) the whole time below, so these
        // layout snaps (flex-basis / text-align, which aren't transitioned)
        // never happen while anything is visible.
        stateTimer = setTimeout(function () {
          // Notify frame/body/divider have already faded out by now — safe
          // to reclaim their layout space.
          ntzPanel.classList.remove('is-notify');
          ntzPanel.classList.remove('is-desc-narrow');
          stateTimer = setTimeout(function () {
            // Panel width has finished shrinking back — now reveal the
            // centered text.
            if (ntzDesc) {
              ntzDesc.classList.remove('is-blinking');
            }
            ntzPanel.classList.remove('is-closing');
            stateTimer = null;
          }, CLOSE_WIDTH_MS);
        }, CLOSE_FADE_MS);
      }
    });
  }

  // ── Roblox game link → direct-join deep link generator ──
  var linkInput   = document.getElementById('gameLinkInput');
  var errorEl     = document.getElementById('genError');
  var resultEl    = document.getElementById('genResult');
  var outputEl    = document.getElementById('genOutput');
  var noteEl      = document.getElementById('genNote');
  var noteTextEl  = document.getElementById('genNoteText');
  var noteBlinkTimer = null;
  var pendingNoteText = '';

  // Splits the note into one <span> per character, each with its own
  // staggered animation-delay (see .gen-note-char in style.css) — reads
  // as the whole line flying/fading into place in reading order rather
  // than just appearing. Capped at 40 characters of stagger so a long
  // note doesn't take forever to finish settling; anything past that
  // just shares the same (already fast) delay as character 40. Once
  // every character has settled, the TEXT (not the icon next to it)
  // starts a slow, continuous fade-out/fade-in pulse (.is-attention,
  // see style.css) to keep drawing the eye — it doesn't stop on its own.
  //
  // All of that is Pre-Alpha2.5+ (genNoteV2) only — older versions just
  // get the plain string dropped in with textContent, no animation, no
  // pulse. (genNoteV2Enabled itself isn't assigned until a bit further
  // down this file, but this function only ever RUNS later, in response
  // to something the person does — by then it's already set.)
  var setNoteText = function (text) {
    if (!noteTextEl) return;
    noteTextEl.innerHTML = '';
    if (noteBlinkTimer) { clearTimeout(noteBlinkTimer); noteBlinkTimer = null; }
    noteTextEl.classList.remove('is-attention');
    if (!text) return;
    if (!genNoteV2Enabled) {
      noteTextEl.textContent = text;
      return;
    }
    var frag = document.createDocumentFragment();
    var chars = String(text).split('');
    chars.forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'gen-note-char';
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.animationDelay = (Math.min(i, 40) * 14) + 'ms';
      frag.appendChild(span);
    });
    noteTextEl.appendChild(frag);
    var CHAR_STEP_MS = 14;
    var CHAR_ANIM_DURATION_MS = 350;
    var lastCharDelay = Math.min(chars.length - 1, 40) * CHAR_STEP_MS;
    noteBlinkTimer = setTimeout(function () {
      noteTextEl.classList.add('is-attention');
    }, lastCharDelay + CHAR_ANIM_DURATION_MS);
  };
  var copyBtn     = document.getElementById('copyBtn');
  var joinBtn     = document.getElementById('joinBtn');
  var thumbWrapEl = document.getElementById('gameThumbWrap');
  var thumbEl     = document.getElementById('gameThumb');
  var gameCardEl  = document.getElementById('gameCard');
  var nameEl      = document.getElementById('gameName');
  var creatorEl   = document.getElementById('gameCreator');
  var verifiedEl  = document.getElementById('gameVerifiedBadge');
  var verifiedV2El = document.getElementById('gameVerifiedBadgeV2');
  var verifiedV2IconEl = document.getElementById('gameVerifiedIconV2');
  var floatTipEl = document.getElementById('verifiedFloatTip');
  var playingStatEl = document.getElementById('gamePlayingStat');
  var playingTextEl = document.getElementById('gamePlayingText');
  var likeStatEl  = document.getElementById('gameLikeStat');
  var likeTextEl  = document.getElementById('gameLikeText');
  var visitsStatEl = document.getElementById('gameVisitsStat');
  var visitsTextEl = document.getElementById('gameVisitsText');
  var descriptionEl = document.getElementById('gameDescription');
  var relatedGamesEl     = document.getElementById('relatedGames');
  var relatedGamesGridEl = document.getElementById('relatedGamesGrid');
  var relatedGamesLabelEl = document.getElementById('relatedGamesLabel');
  var betaBtn     = document.getElementById('betaBtn');
  var discoveryRowsEl = document.getElementById('discoveryRows');
  var discoveryTrendingRowEl = document.getElementById('discoveryTrendingRow');
  var discoveryPicksRowEl = document.getElementById('discoveryPicksRow');

  // Pre-Alpha1.3+: reworked main game-card layout (bigger icon on the
  // left spanning the card's full height, name/creator/stats on the
  // right, big Play button + Copy + the reserved beta-feature slot in
  // one row). Purely additive — a version without this flag never gets
  // the `.is-v2` class, so it keeps rendering exactly as it always did.
  var isCardV2 = !!(cfg.features && cfg.features.gameCardV2);
  if (isCardV2 && gameCardEl) gameCardEl.classList.add('is-v2');
  if (betaBtn) betaBtn.hidden = !isCardV2;

  // Pre-Alpha2.5+: while the card is loading, its pieces render as empty
  // shimmering frames (skeleton) instead of literal "Đang tải..." text —
  // purely additive via the .is-skel class below, so a version without
  // this flag renders exactly as it always did.
  var skelEnabled = !!(cfg.features && cfg.features.skeletonLoading);
  if (skelEnabled && gameCardEl) gameCardEl.classList.add('is-skel');

  // Pre-Alpha2.5+: sharp 3px corners on the thumbnail/buttons + the
  // redesigned Play button (gradient, hover glow + shine sweep) —
  // scoped behind .is-polished so versions before this flag existed
  // keep the original rounded corners and plain accent-color button.
  var polishedEnabled = !!(cfg.features && cfg.features.polishedUI);
  if (polishedEnabled && gameCardEl) gameCardEl.classList.add('is-polished');

  // Pre-Alpha2.5+: the "you picked this from search / this is a fuzzy
  // match" note moves from way down at the bottom of the whole result
  // block to right under the Play/Copy row, and reads as a proper full-
  // width note bar there instead of a plain caption line. Done by
  // relocating the actual element (not duplicating markup) so there's
  // exactly one #genNote either way — versions without this flag never
  // move it, so it stays in its original spot at the end of #genResult.
  var genNoteV2Enabled = !!(cfg.features && cfg.features.genNoteV2);
  if (genNoteV2Enabled && noteEl && gameCardEl) {
    var actionsRowEl = gameCardEl.querySelector('.game-card-actions');
    // Appended as the actions row's own last child (not just a sibling
    // after it) — see the CSS comment on .game-card-actions > .gen-note
    // for why that matters in the .is-v2 grid layout.
    if (actionsRowEl) actionsRowEl.appendChild(noteEl);
  }

  // Pre-Alpha2.5+: cursor-tracking border/glow on the Play button — the
  // border reads brightest at whatever point the pointer is currently
  // over and fades out toward the opposite side, and a soft glow spills
  // out past the button's own edges.
  //
  // This has to live in its own element appended to <body> rather than
  // as part of the button. `.game-card.is-v2` uses
  // `container-type: inline-size` for its cqi-based proportional
  // scaling, and per spec any element with that set gets an implicit,
  // non-overridable clip on its own box (browsers ignore an authored
  // `overflow: visible` there — it exists to guarantee the containment
  // the container-query system needs). That clip catches every
  // descendant no matter how deep, so anything painted past
  // `.game-card`'s own edges — like this glow — could never actually
  // show up while living inside it. #playRingPortal sits outside that
  // whole subtree instead, and is just kept glued to the button's
  // current on-screen position/size.
  if (polishedEnabled && joinBtn) {
    var playRingPortal = document.createElement('div');
    playRingPortal.id = 'playRingPortal';
    playRingPortal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(playRingPortal);

    var playRingResetTimer = null;
    var syncPlayRingPortal = function () {
      var rect = joinBtn.getBoundingClientRect();
      playRingPortal.style.left = rect.left + 'px';
      playRingPortal.style.top = rect.top + 'px';
      playRingPortal.style.width = rect.width + 'px';
      playRingPortal.style.height = rect.height + 'px';
    };
    // Coordinates left over from the last hover would otherwise sit in
    // this position:fixed element forever (only opacity toggles, not
    // display) — some browsers still factor a fixed element's far
    // off-screen position into the document's scrollable area, which
    // is exactly how a stale coordinate from an earlier (e.g. wider)
    // layout can leave the whole page horizontally scrollable on
    // mobile with nothing actually there to see. Zeroing it out once
    // it's fully faded (not instantly, so the fade itself still looks
    // like a fade) keeps that from ever lingering.
    var resetPlayRingPortal = function () {
      playRingPortal.style.left = '0px';
      playRingPortal.style.top = '0px';
      playRingPortal.style.width = '0px';
      playRingPortal.style.height = '0px';
    };
    var hidePlayRingPortal = function () {
      playRingPortal.classList.remove('is-visible');
      clearTimeout(playRingResetTimer);
      playRingResetTimer = setTimeout(resetPlayRingPortal, 350); // matches its opacity transition duration
    };

    joinBtn.addEventListener('pointerenter', function () {
      clearTimeout(playRingResetTimer);
      syncPlayRingPortal();
      playRingPortal.classList.add('is-visible');
    });

    joinBtn.addEventListener('pointermove', function (e) {
      var rect = joinBtn.getBoundingClientRect();
      playRingPortal.style.setProperty('--play-mx', (e.clientX - rect.left) + 'px');
      playRingPortal.style.setProperty('--play-my', (e.clientY - rect.top) + 'px');
      // Cheap enough to just re-sync every move too, so a scroll or
      // layout shift mid-hover never leaves it stranded.
      syncPlayRingPortal();
    });

    joinBtn.addEventListener('pointerleave', hidePlayRingPortal);

    window.addEventListener('scroll', function () {
      if (playRingPortal.classList.contains('is-visible')) syncPlayRingPortal();
    }, { passive: true });

    // A resize (rotating a phone, or resizing the window/devtools
    // viewport mid-session) can't be trusted to arrive with a fresh
    // hover first — hide and reset immediately rather than waiting on
    // the next pointer event that may never come at the new size.
    window.addEventListener('resize', function () {
      clearTimeout(playRingResetTimer);
      playRingPortal.classList.remove('is-visible');
      resetPlayRingPortal();
    });
  }

  // Pre-Alpha2.5+: a small label revealing each button's function,
  // appearing right underneath it as it lifts on hover (Play → "Join
  // <game name>", Copy → "Copy Game", the reserved beta slot →
  // "Save Game" — text comes from each button's own `data-tooltip`
  // attribute; joinBtn's gets kept in sync with the loaded game's name
  // over in renderGameCard()).
  //
  // Same #playRingPortal situation as above: a tooltip positioned right
  // under one of these buttons would sit past `.game-card`'s bottom
  // edge, and `.game-card.is-v2`'s `container-type` clips that no
  // matter what — so this one shared portal lives outside the card too,
  // reused for whichever of the three buttons is currently hovered.
  if (polishedEnabled) {
    var btnTooltipPortal = document.createElement('div');
    btnTooltipPortal.id = 'btnTooltipPortal';
    btnTooltipPortal.setAttribute('aria-hidden', 'true');
    document.body.appendChild(btnTooltipPortal);

    var btnTooltipResetTimer = null;
    var syncBtnTooltipPortal = function (btn) {
      var rect = btn.getBoundingClientRect();
      btnTooltipPortal.style.left = (rect.left + rect.width / 2) + 'px';
      btnTooltipPortal.style.top = rect.bottom + 'px';
    };
    // Same reasoning as #playRingPortal above: zero out the stale
    // coordinate once the fade-out has actually finished, so nothing
    // lingers to affect the page's scrollable area after a viewport
    // change.
    var resetBtnTooltipPortal = function () {
      btnTooltipPortal.style.left = '0px';
      btnTooltipPortal.style.top = '0px';
    };
    var hideBtnTooltipPortal = function () {
      btnTooltipPortal.classList.remove('is-visible');
      clearTimeout(btnTooltipResetTimer);
      btnTooltipResetTimer = setTimeout(resetBtnTooltipPortal, 250); // matches its opacity transition duration
    };

    [joinBtn, copyBtn, betaBtn].forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener('pointerenter', function () {
        var text = btn.getAttribute('data-tooltip');
        if (!text) return;
        clearTimeout(btnTooltipResetTimer);
        btnTooltipPortal.textContent = text;
        syncBtnTooltipPortal(btn);
        btnTooltipPortal.classList.add('is-visible');
      });
      btn.addEventListener('pointermove', function () {
        if (btnTooltipPortal.classList.contains('is-visible')) syncBtnTooltipPortal(btn);
      });
      btn.addEventListener('pointerleave', hideBtnTooltipPortal);
    });

    // Same rationale as the resize handler above #playRingPortal — a
    // viewport change might not be followed by a fresh hover at all.
    window.addEventListener('resize', function () {
      clearTimeout(btnTooltipResetTimer);
      btnTooltipPortal.classList.remove('is-visible');
      resetBtnTooltipPortal();
    });
  }

  if (linkInput && resultEl && outputEl && copyBtn && joinBtn) {

    // Recognizes the common Roblox link formats and pulls out whatever
    // join parameters they carry. Returns null when nothing usable is
    // found. See create.roblox.com/docs (Deep links / Share links) for
    // the parameter set.
    //
    // Roblox web URLs can carry an optional locale prefix right after the
    // domain — /vi/games/..., /pt-br/games/..., /zh-cn/share?..., etc. (2-3
    // lowercase letters, optionally "-" + 2-3 more letters/digits) — every
    // roblox.com/... pattern below needs to tolerate that prefix or it
    // silently fails to match on any non-English locale link.
    var LOCALE_PREFIX = '(?:[a-z]{2,3}(?:-[a-z0-9]{2,3})?\\/)?';

    // Share-link "type" values are meant to be exact-case enum strings
    // ("Server", "ExperienceDetails", ...) but links seen in the wild use
    // whatever casing the source pasted it with (type=server, TYPE=SERVER,
    // etc.) — normalize the ones we actually act on so resolving/relaying
    // them doesn't silently fail over casing alone.
    var KNOWN_SHARE_LINK_TYPES = {
      server: 'Server',
      experiencedetails: 'ExperienceDetails',
      experienceinvite: 'ExperienceInvite',
      friendinvite: 'FriendInvite'
    };
    var normalizeShareLinkType = function (type) {
      var key = (type || '').toLowerCase();
      return KNOWN_SHARE_LINK_TYPES[key] || type || 'ExperienceDetails';
    };

    // Real pasted links show up with all sorts of casing on query param
    // names (privateServerLinkCode, privateserverlinkcode, PrivateServerLinkCode...) —
    // URLSearchParams.get() is exact-case only, so a plain qp.get() misses
    // anything that isn't spelled exactly as expected. Try the exact
    // spellings first (cheap, common case), then fall back to a
    // case-insensitive scan across whatever's actually in the URL.
    var getParamCI = function (qp, names) {
      if (!qp) return null;
      for (var i = 0; i < names.length; i++) {
        var exact = qp.get(names[i]);
        if (exact) return exact;
      }
      var lowerNames = names.map(function (n) { return n.toLowerCase(); });
      var found = null;
      qp.forEach(function (value, key) {
        if (found === null && value && lowerNames.indexOf(key.toLowerCase()) !== -1) {
          found = value;
        }
      });
      return found;
    };

    var parseRobloxLink = function (raw) {
      var s = (raw || '').trim();
      if (!s) return null;

      // Shortened share domain (ro.blox.com/xxxx). This is a server-side
      // redirect with no public endpoint we can resolve from the browser.
      if (/ro\.blox\.com\//i.test(s)) {
        return { type: 'shortlink' };
      }

      var queryStr = s.indexOf('?') !== -1 ? s.slice(s.indexOf('?') + 1) : '';
      var qp = queryStr ? new URLSearchParams(queryStr) : null;

      // Share link: roblox.com/share?code=...&type=ExperienceDetails
      // or the app's own roblox://navigation/share_links?code=...&type=...
      // scheme (also still matches the old roblox://share-links form, in
      // case that's pasted back in).
      if (new RegExp('(roblox\\.com\\/' + LOCALE_PREFIX + 'share|roblox:\\/\\/(navigation\\/)?share_?links)\\b', 'i').test(s) && qp && qp.get('code')) {
        return {
          type: 'share',
          code: qp.get('code'),
          linkType: normalizeShareLinkType(qp.get('type'))
        };
      }

      // Already a roblox:// deep link (experiences/start or the older
      // roblox://placeId=... form) — pass its params straight through.
      if (/^roblox:\/\//i.test(s)) {
        var dp = qp || new URLSearchParams(s.split('placeId=')[1] ? 'placeId=' + s.split('placeId=')[1] : '');
        if (dp.get('placeId') || dp.get('userId')) {
          return {
            type: 'direct',
            placeId: dp.get('placeId'),
            userId: dp.get('userId'),
            accessCode: dp.get('accessCode'),
            linkCode: dp.get('linkCode'),
            gameInstanceId: dp.get('gameInstanceId') || dp.get('jobId'),
            launchData: dp.get('launchData')
          };
        }
      }

      // Standard web link: roblox.com/games/{id}[/Name][?query]
      var gamesMatch = s.match(new RegExp('roblox\\.com\\/' + LOCALE_PREFIX + 'games\\/(\\d+)', 'i'));
      // Older "web list to app" format: roblox.com/games/start?placeId=...
      var isStartUrl = new RegExp('roblox\\.com\\/' + LOCALE_PREFIX + 'games\\/start\\?', 'i').test(s);
      if (gamesMatch || (isStartUrl && qp && qp.get('placeId'))) {
        return {
          type: 'web',
          placeId: gamesMatch ? gamesMatch[1] : getParamCI(qp, ['placeId']),
          userId: getParamCI(qp, ['userId']),
          accessCode: getParamCI(qp, ['accessCode']),
          linkCode: getParamCI(qp, ['linkCode', 'privateServerLinkCode']),
          gameInstanceId: getParamCI(qp, ['gameInstanceId', 'jobId']),
          launchData: getParamCI(qp, ['launchData'])
        };
      }

      // Bare "?placeId=..." fragment with no roblox.com/games path.
      if (qp && getParamCI(qp, ['placeId'])) {
        return {
          type: 'web',
          placeId: getParamCI(qp, ['placeId']),
          userId: getParamCI(qp, ['userId']),
          accessCode: getParamCI(qp, ['accessCode']),
          linkCode: getParamCI(qp, ['linkCode', 'privateServerLinkCode']),
          gameInstanceId: getParamCI(qp, ['gameInstanceId', 'jobId']),
          launchData: getParamCI(qp, ['launchData'])
        };
      }

      // Bare place ID pasted directly (e.g. "90500188348656").
      if (/^\d+$/.test(s)) {
        return { type: 'bare', placeId: s };
      }

      return null;
    };

    // Turns a parsed result into the roblox:// link that actually
    // launches the app.
    var buildDeepLink = function (info) {
      if (info.type === 'share') {
        var sp = new URLSearchParams();
        sp.set('type', info.linkType);
        sp.set('code', info.code);
        return 'roblox://navigation/share_links?' + sp.toString();
      }

      var p = new URLSearchParams();
      if (info.placeId) p.set('placeId', info.placeId);
      if (info.userId) p.set('userId', info.userId);
      if (info.accessCode) p.set('accessCode', info.accessCode);
      if (info.linkCode) p.set('linkCode', info.linkCode);
      if (info.gameInstanceId) p.set('gameInstanceId', info.gameInstanceId);
      if (info.launchData) p.set('launchData', info.launchData);
      return 'roblox://experiences/start?' + p.toString();
    };

    // ── Game preview lookup ──
    // Pulls together name / developer / player count / icon for a
    // placeId so the result can show a real preview card instead of a
    // bare link. Roblox's public game/thumbnail APIs don't send CORS
    // headers for third-party origins, so a direct browser fetch will
    // normally fail — that's expected, not a bug. Configure
    // window.CONFIG.gameApiProxyBase (in config.js) to point at a small
    // proxy that fetches this server-side and the real data will show up.
    var gameInfoCache = {};
    var fetchWithTimeout = function (url, ms) {
      var controller = ('AbortController' in window) ? new AbortController() : null;
      var timer = controller ? setTimeout(function () { controller.abort(); }, ms) : null;
      return fetch(url, controller ? { signal: controller.signal } : {}).finally(function () {
        if (timer) clearTimeout(timer);
      });
    };

    // Resolves a share-link code into a real placeId + private-server
    // linkCode via the worker's /resolve-share endpoint — this needs a
    // server (same CORS reason as everything else here), so it silently
    // does nothing when no proxy is configured, leaving the plain
    // passthrough share-links behavior as the fallback.
    var resolveShareLink = function (code, linkType) {
      var cfg = window.CONFIG || {};
      if (!cfg.gameApiProxyBase) return Promise.resolve(null);
      var url = cfg.gameApiProxyBase.replace(/\/$/, '') + '/resolve-share?code=' + encodeURIComponent(code) + '&type=' + encodeURIComponent(linkType || 'Server');
      return fetchWithTimeout(url, 8000).then(function (res) {
        if (!res.ok) return null;
        return res.json();
      }).then(function (data) {
        // A private-server ("Server") invite carries a linkCode; a plain
        // game share (ExperienceDetails) doesn't and never will — that's
        // not a failed resolve, just a different link shape. Either way,
        // a placeId alone is already enough to show a real game card, so
        // don't discard it just because linkCode is missing.
        if (data && data.placeId) {
          return { placeId: String(data.placeId), linkCode: data.linkCode ? String(data.linkCode) : null };
        }
        return null;
      }).catch(function () { return null; });
    };

    var fetchViaProxy = function (base, placeId) {
      var url = base.replace(/\/$/, '') + '/game-info?placeId=' + encodeURIComponent(placeId);
      return fetchWithTimeout(url, 8000).then(function (res) {
        if (!res.ok) throw new Error('proxy http ' + res.status);
        return res.json();
      }).then(function (data) {
        var name = data.name || null;
        var creatorName = data.creatorName || null;
        // Same Roblox-side sanitization as parseGameDetails below — happens
        // regardless of which server calls Roblox, since it's tied to the
        // experience's age rating and the lack of a logged-in session, not
        // to which proxy/IP is asking.
        // Roblox has sent this sanitized placeholder in both
        // "[Title Unavailable]" and "[TITLE UNAVAILABLE]" casing (and
        // presumably anything in between) — compare uppercased so a casing
        // change on Roblox's end can't silently defeat this check again
        // and let the literal placeholder string through as if it were a
        // real name.
        var restricted = (
          (name || '').toUpperCase() === '[TITLE UNAVAILABLE]' ||
          (creatorName || '').toUpperCase() === '[UNKNOWN]'
        );
        return {
          name: restricted ? null : name,
          description: restricted ? null : (data.description || null),
          creatorName: restricted ? null : creatorName,
          creatorType: data.creatorType || null,
          creatorVerified: !!data.creatorVerified,
          playing: (typeof data.playing === 'number') ? data.playing : null,
          visits: (typeof data.visits === 'number') ? data.visits : null,
          iconUrl: data.iconUrl || null,
          likePercent: (typeof data.likePercent === 'number') ? data.likePercent : null,
          universeId: data.universeId || null,
          restricted: restricted
        };
      });
    };

    // Best-effort direct calls straight to Roblox. Left in place in case
    // this ever runs somewhere CORS isn't enforced (e.g. a wrapped
    // webview) — on a normal browser this will typically reject and
    // fetchGameInfo() falls back gracefully.
    //
    // Name/creator/playing and the icon are fetched as TWO SEPARATE
    // chains (each with their own roproxy → public-proxy → direct
    // fallback), sharing only the universeId lookup. They used to be
    // bundled into a single Promise.all — but games.roblox.com's
    // `/v1/games` (name/creator) endpoint gets blocked/rate-limited by
    // itself far more often than the thumbnails endpoint, and bundling
    // meant that one failure threw away an icon that had *already*
    // loaded successfully. Splitting them means each piece shows up
    // independently — if only the icon loads, you still see the icon.
    var getUniverseId = function (base, placeId, ms) {
      return fetchWithTimeout(base + '/universes/v1/places/' + placeId + '/universe', ms)
        .then(function (r) { if (!r.ok) throw new Error('universe http ' + r.status); return r.json(); })
        .then(function (u) {
          if (!u.universeId) throw new Error('no universeId');
          return u.universeId;
        });
    };

    var parseGameDetails = function (data) {
      var game = data && data.data && data.data[0];
      if (!game) throw new Error('no game data');
      var name = game.name || null;
      var creatorName = game.creator ? game.creator.name : null;
      // Roblox serves this sanitized placeholder to request sources it has
      // flagged (shared public proxies get hit especially hard) instead of
      // a real error — treat it as a failure so the caller falls through
      // to the next fallback tier rather than displaying garbage.
      // Compare uppercased — see the matching comment in fetchViaProxy
      // above for why this can't be a plain === on the Title-case string.
      if ((name || '').toUpperCase() === '[TITLE UNAVAILABLE]' || (creatorName || '').toUpperCase() === '[UNKNOWN]') {
        var restrictedErr = new Error('sanitized placeholder response');
        restrictedErr.restricted = true;
        throw restrictedErr;
      }
      return {
        name: name,
        description: game.description || null,
        creatorName: creatorName,
        creatorType: game.creator ? game.creator.type : null,
        creatorVerified: !!(game.creator && game.creator.hasVerifiedBadge),
        playing: (typeof game.playing === 'number') ? game.playing : null,
        visits: (typeof game.visits === 'number') ? game.visits : null
      };
    };

    var parseIcon = function (data) {
      var icon = data && data.data && data.data[0];
      if (!icon || !icon.imageUrl) throw new Error('no icon data');
      return icon.imageUrl;
    };

    var parseVotes = function (data) {
      var v = data && data.data && data.data[0];
      if (!v || typeof v.upVotes !== 'number' || typeof v.downVotes !== 'number') throw new Error('no votes data');
      var total = v.upVotes + v.downVotes;
      if (total <= 0) throw new Error('no votes yet');
      return Math.round((v.upVotes / total) * 100);
    };

    var wrapAllorigins = function (url) {
      return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
    };

    // Resolve universeId once, trying roproxy → public CORS proxy →
    // direct. Shared by both the name and icon chains below.
    var resolveUniverseId = function (placeId) {
      return getUniverseId('https://apis.roproxy.com', placeId, 7000)
        .catch(function () {
          return fetchWithTimeout(wrapAllorigins('https://apis.roblox.com/universes/v1/places/' + placeId + '/universe'), 9000)
            .then(function (r) { if (!r.ok) throw new Error('allorigins universe http ' + r.status); return r.json(); })
            .then(function (u) { if (!u.universeId) throw new Error('no universeId'); return u.universeId; });
        })
        .catch(function () { return getUniverseId('https://apis.roblox.com', placeId, 6000); });
    };

    var fetchGameDetails = function (universeId) {
      return fetchWithTimeout('https://games.roproxy.com/v1/games?universeIds=' + universeId, 7000)
        .then(function (r) { if (!r.ok) throw new Error('roproxy games http ' + r.status); return r.json(); })
        .then(parseGameDetails)
        .catch(function () {
          return fetchWithTimeout(wrapAllorigins('https://games.roblox.com/v1/games?universeIds=' + universeId), 9000)
            .then(function (r) { if (!r.ok) throw new Error('allorigins games http ' + r.status); return r.json(); })
            .then(parseGameDetails);
        })
        .catch(function () {
          return fetchWithTimeout('https://games.roblox.com/v1/games?universeIds=' + universeId, 6000)
            .then(function (r) { return r.json(); })
            .then(parseGameDetails);
        });
    };

    var fetchGameIcon = function (universeId, placeId) {
      return fetchWithTimeout('https://thumbnails.roproxy.com/v1/games/icons?universeIds=' + universeId + '&size=512x512&format=Png', 7000)
        .then(function (r) { if (!r.ok) throw new Error('roproxy icon http ' + r.status); return r.json(); })
        .then(parseIcon)
        .catch(function () {
          return fetchWithTimeout(wrapAllorigins('https://thumbnails.roblox.com/v1/games/icons?universeIds=' + universeId + '&size=512x512&format=Png'), 9000)
            .then(function (r) { if (!r.ok) throw new Error('allorigins icon http ' + r.status); return r.json(); })
            .then(parseIcon);
        })
        // Last resort: the placeId-based gameicons endpoint. Doesn't need
        // universeId at all, so it's also useful if resolveUniverseId
        // itself is the thing that's flaky.
        .catch(function () {
          return fetchWithTimeout('https://thumbnails.roproxy.com/v1/places/gameicons?placeIds=' + placeId + '&size=512x512&format=Png&isCircular=false', 7000)
            .then(function (r) { return r.json(); })
            .then(parseIcon);
        });
    };

    // Like/dislike ratio (games.roblox.com/v1/games/votes) — same 3-tier
    // fallback, independent of the name/icon chains so a miss here never
    // blocks the rest of the card.
    var fetchGameVotes = function (universeId) {
      return fetchWithTimeout('https://games.roproxy.com/v1/games/votes?universeIds=' + universeId, 7000)
        .then(function (r) { if (!r.ok) throw new Error('roproxy votes http ' + r.status); return r.json(); })
        .then(parseVotes)
        .catch(function () {
          return fetchWithTimeout(wrapAllorigins('https://games.roblox.com/v1/games/votes?universeIds=' + universeId), 9000)
            .then(function (r) { if (!r.ok) throw new Error('allorigins votes http ' + r.status); return r.json(); })
            .then(parseVotes);
        })
        .catch(function () {
          return fetchWithTimeout('https://games.roblox.com/v1/games/votes?universeIds=' + universeId, 6000)
            .then(function (r) { return r.json(); })
            .then(parseVotes);
        });
    };

    var voteCache = {};

    // Roblox's own "games recommendations based on a given universe"
    // endpoint (officially documented, no auth needed) — used to surface
    // one random related suggestion when a direct link is pasted (search
    // by name already has its own "other results" from the search API).
    //
    // The exact response shape isn't publicly documented in detail, so
    // this parses defensively: tries the flat field names the search API
    // uses (rootPlaceId, creatorName, playerCount, creatorHasVerifiedBadge)
    // AND the nested-creator shape /v1/games?universeIds= uses (creator:
    // {name, hasVerifiedBadge}, playing) — whichever set of fields is
    // actually present just gets picked up, nothing throws if some are
    // missing.
    var parseRecommendations = function (data) {
      var games = (data && (data.games || data.data)) || [];
      var parsed = games.map(function (g) {
        var creator = g.creator || {};
        return {
          universeId: g.universeId || g.id || null,
          placeId: (g.placeId != null) ? String(g.placeId) : (g.rootPlaceId != null ? String(g.rootPlaceId) : null),
          name: g.name || null,
          creatorName: g.creatorName || creator.name || null,
          creatorVerified: !!(g.creatorHasVerifiedBadge || creator.hasVerifiedBadge),
          playing: (typeof g.playerCount === 'number') ? g.playerCount
            : (typeof g.playing === 'number') ? g.playing : null
        };
      }).filter(function (g) { return g.universeId && g.placeId; });
      // The request itself succeeded, but not one entry had both a
      // universeId and a placeId under any of the field names this
      // checks — almost always means Roblox's actual response shape for
      // this endpoint doesn't match what's guessed here. Logging the raw
      // response makes that a 10-second fix instead of a guessing game.
      if (games.length && !parsed.length) {
        console.warn('[RoZ API] recommendations response had ' + games.length + ' item(s) but none parsed — first item fields: ' + JSON.stringify(games[0], null, 2));
      }
      return parsed;
    };

    var fetchGameRecommendations = function (universeId) {
      var qs = 'maxRows=12';
      return fetchWithTimeout('https://games.roproxy.com/v1/games/recommendations/game/' + universeId + '?' + qs, 7000)
        .then(function (r) { if (!r.ok) throw new Error('roproxy recs http ' + r.status); return r.json(); })
        .then(parseRecommendations)
        .catch(function (e1) {
          return fetchWithTimeout(wrapAllorigins('https://games.roblox.com/v1/games/recommendations/game/' + universeId + '?' + qs), 9000)
            .then(function (r) { if (!r.ok) throw new Error('allorigins recs http ' + r.status); return r.json(); })
            .then(parseRecommendations)
            .catch(function (e2) {
              return fetchWithTimeout('https://games.roblox.com/v1/games/recommendations/game/' + universeId + '?' + qs, 6000)
                .then(function (r) { if (!r.ok) throw new Error('direct recs http ' + r.status); return r.json(); })
                .then(parseRecommendations)
                .catch(function (e3) {
                  // All 3 tiers failed — log so it shows up in DevTools
                  // console instead of just silently hiding the section
                  // with no trace of why.
                  console.warn('[RoZ API] fetchGameRecommendations failed on all 3 tiers for universeId ' + universeId + ':', e1, e2, e3);
                  return [];
                });
            });
        });
    };

    // Picks ONE random pick from the recommendations list (never the game
    // itself), fetches just that one game's icon, and returns it already
    // shaped like a search-result item so it can go straight into
    // renderRelatedGames()/promoteRelatedCard() unchanged.
    // Fisher–Yates shuffle — used so the N picks below are a genuine
    // random subset each time, not just "the first N in whatever order
    // Roblox returned them" (which barely varies call to call).
    var shuffleArray = function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      }
      return a;
    };

    var fetchRandomRelatedGames = function (universeId, excludePlaceId, count) {
      return fetchGameRecommendations(universeId).then(function (list) {
        var pool = list.filter(function (g) { return g.placeId !== excludePlaceId; });
        if (!pool.length) return [];
        var picks = shuffleArray(pool).slice(0, count);
        return Promise.all(picks.map(function (pick) {
          return fetchGameIcon(pick.universeId, pick.placeId).catch(function () { return null; }).then(function (iconUrl) {
            pick.iconUrl = iconUrl || null;
            return pick;
          });
        }));
      });
    };

    var fetchGameCore = function (placeId) {
      if (gameInfoCache[placeId]) return gameInfoCache[placeId];
      var cfg = window.CONFIG || {};

      var promise;
      if (cfg.gameApiProxyBase) {
        // Your own worker already returns everything in one call.
        promise = fetchViaProxy(cfg.gameApiProxyBase, placeId).catch(function () { return null; });
      } else {
        promise = resolveUniverseId(placeId).then(function (universeId) {
          return Promise.all([
            fetchGameDetails(universeId).then(
              function (d) { return d; },
              function (err) { return { restricted: !!(err && err.restricted) }; }
            ),
            fetchGameIcon(universeId, placeId).catch(function () { return null; })
          ]).then(function (results) {
            var details = results[0];
            var iconUrl = results[1];
            var hasDetails = details && !details.restricted && details.name !== undefined;
            if (!hasDetails && !iconUrl) {
              return details && details.restricted ? { restricted: true, iconUrl: iconUrl || null, universeId: universeId } : null;
            }
            return {
              name: hasDetails ? details.name : null,
              description: hasDetails ? details.description : null,
              creatorName: hasDetails ? details.creatorName : null,
              creatorType: hasDetails ? details.creatorType : null,
              creatorVerified: hasDetails ? details.creatorVerified : false,
              playing: hasDetails ? details.playing : null,
              visits: hasDetails ? details.visits : null,
              iconUrl: iconUrl || null,
              universeId: universeId,
              restricted: !!(details && details.restricted)
            };
          });
        }).catch(function () { return null; });
      }

      gameInfoCache[placeId] = promise;
      return promise;
    };

    // Like % is fetched and rendered separately from the block above — its
    // fallback chain (roproxy → allorigins → direct) can take a long time
    // to exhaust when it's blocked/rate-limited, and bundling it into the
    // same Promise.all used to hold up the name/creator/icon from showing
    // at all until the vote chain finally gave up.
    var fetchLikePercent = function (universeId) {
      if (voteCache[universeId]) return voteCache[universeId];
      var p = fetchGameVotes(universeId).catch(function () { return null; });
      voteCache[universeId] = p;
      return p;
    };

    // ── Search-by-name lookup ──
    // Used when whatever's in the box isn't a recognizable Roblox
    // link/Place ID — instead of erroring out, treat it as a game name
    // and ask Roblox's own search (the same one roblox.com's search bar
    // uses) for the closest match, then run that match's Place ID
    // through the exact same card-rendering path as a pasted link. Also
    // collects up to 20 more matches to show as browsable alternatives.
    var wrapSearchResults = function (data) {
      var groups = (data && data.searchResults) || [];
      var matches = [];
      for (var i = 0; i < groups.length && matches.length < 21; i++) {
        var g = groups[i];
        if (g && g.contentGroupType === 'Game' && g.contents && g.contents.length) {
          var m = g.contents[0];
          if (m && m.rootPlaceId) matches.push(m);
        }
      }
      if (!matches.length) throw new Error('no game found in search results');
      return matches;
    };

    var toSearchPayload = function (m, iconUrl) {
      return {
        placeId: String(m.rootPlaceId),
        universeId: m.universeId,
        name: m.name || null,
        creatorName: m.creatorName || null,
        creatorType: null,
        creatorVerified: !!m.creatorHasVerifiedBadge,
        playing: (typeof m.playerCount === 'number') ? m.playerCount : null,
        iconUrl: iconUrl || null
      };
    };

    var newSessionId = function () {
      return (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : (Date.now() + '-' + Math.random().toString(16).slice(2));
    };

    // Best-effort direct chain (roproxy mirror → allorigins-wrapped direct
    // → raw direct), same layered fallback shape as resolveUniverseId
    // above — used when no gameApiProxyBase is configured.
    var searchOmniDirect = function (query) {
      var qs = 'searchQuery=' + encodeURIComponent(query) + '&sessionId=' + newSessionId();
      return fetchWithTimeout('https://apis.roproxy.com/search-api/omni-search?' + qs, 7000)
        .then(function (r) { if (!r.ok) throw new Error('roproxy search http ' + r.status); return r.json(); })
        .then(wrapSearchResults)
        .catch(function () {
          return fetchWithTimeout(wrapAllorigins('https://apis.roblox.com/search-api/omni-search?' + qs), 9000)
            .then(function (r) { if (!r.ok) throw new Error('allorigins search http ' + r.status); return r.json(); })
            .then(wrapSearchResults);
        })
        .catch(function () {
          return fetchWithTimeout('https://apis.roblox.com/search-api/omni-search?' + qs, 6000)
            .then(function (r) { return r.json(); })
            .then(wrapSearchResults);
        });
    };

    // Batched icon lookup (roproxy → allorigins → direct), same 3-tier
    // shape as fetchGameIcon but for many universeIds in one call —
    // matched back by targetId since Roblox doesn't guarantee the
    // response order matches the request order.
    var parseIconBatch = function (data) {
      var map = {};
      ((data && data.data) || []).forEach(function (icon) {
        if (icon && icon.targetId) map[icon.targetId] = icon.imageUrl;
      });
      return map;
    };

    var fetchIconsBatch = function (universeIds) {
      var ids = universeIds.join(',');
      return fetchWithTimeout('https://thumbnails.roproxy.com/v1/games/icons?universeIds=' + ids + '&size=256x256&format=Png&isCircular=false', 8000)
        .then(function (r) { if (!r.ok) throw new Error('roproxy icons http ' + r.status); return r.json(); })
        .then(parseIconBatch)
        .catch(function () {
          return fetchWithTimeout(wrapAllorigins('https://thumbnails.roblox.com/v1/games/icons?universeIds=' + ids + '&size=256x256&format=Png&isCircular=false'), 9000)
            .then(function (r) { if (!r.ok) throw new Error('allorigins icons http ' + r.status); return r.json(); })
            .then(parseIconBatch);
        })
        .catch(function () { return {}; }); // icons are nice-to-have — never block the search on this
    };

    var searchGameDirect = function (query) {
      return searchOmniDirect(query).then(function (matches) {
        return fetchIconsBatch(matches.map(function (m) { return m.universeId; })).then(function (iconMap) {
          var primary = toSearchPayload(matches[0], iconMap[matches[0].universeId]);
          primary.related = matches.slice(1).map(function (m) { return toSearchPayload(m, iconMap[m.universeId]); });
          // Enrich just the primary match with full description + like % —
          // the search API's own result objects don't carry either, and
          // fetching this for all 20 related items would be wasteful.
          return Promise.all([
            fetchGameDetails(primary.universeId).catch(function () { return null; }),
            fetchGameVotes(primary.universeId).catch(function () { return null; })
          ]).then(function (extra) {
            var details = extra[0];
            var likePercent = extra[1];
            if (details && details.description) primary.description = details.description;
            if (details && typeof details.visits === 'number') primary.visits = details.visits;
            if (typeof likePercent === 'number') primary.likePercent = likePercent;
            return primary;
          });
        });
      });
    };

    // Your own worker already returns everything (incl. icons for both
    // the primary match and up to 20 related ones) in one call.
    var searchViaProxy = function (base, query) {
      var url = base.replace(/\/$/, '') + '/search-game?query=' + encodeURIComponent(query);
      return fetchWithTimeout(url, 8000).then(function (res) {
        if (!res.ok) throw new Error('proxy search http ' + res.status);
        return res.json();
      }).then(function (data) {
        if (!data || !data.placeId) throw new Error('no match');
        var restricted = (
          (data.name || '').toUpperCase() === '[TITLE UNAVAILABLE]' ||
          (data.creatorName || '').toUpperCase() === '[UNKNOWN]'
        );
        return {
          placeId: String(data.placeId),
          universeId: data.universeId,
          name: restricted ? null : (data.name || null),
          description: restricted ? null : (data.description || null),
          creatorName: restricted ? null : (data.creatorName || null),
          creatorType: data.creatorType || null,
          creatorVerified: !!data.creatorVerified,
          playing: (typeof data.playing === 'number') ? data.playing : null,
          visits: (typeof data.visits === 'number') ? data.visits : null,
          iconUrl: data.iconUrl || null,
          likePercent: (typeof data.likePercent === 'number') ? data.likePercent : null,
          restricted: restricted,
          related: Array.isArray(data.related) ? data.related.map(function (r) {
            return {
              placeId: String(r.placeId),
              universeId: r.universeId,
              name: r.name || null,
              creatorName: r.creatorName || null,
              creatorVerified: !!r.creatorVerified,
              playing: (typeof r.playing === 'number') ? r.playing : null,
              iconUrl: r.iconUrl || null
            };
          }) : []
        };
      });
    };

    var gameSearchCache = {};
    var fetchGameBySearch = function (query) {
      var key = query.trim().toLowerCase();
      if (gameSearchCache[key]) return gameSearchCache[key];
      var cfg = window.CONFIG || {};
      var promise = cfg.gameApiProxyBase
        ? searchViaProxy(cfg.gameApiProxyBase, query)
        : searchGameDirect(query);
      gameSearchCache[key] = promise;
      return promise;
    };

    var formatPlayerCount = function (n) {
      return n.toLocaleString('vi-VN');
    };

    // Which verified badge style to show is decided per-version: the
    // custom icon + hover tooltip only exists from Pre-Alpha 2.5 onward
    // (via the verifiedIconV2 feature flag + verifiedBadge config) —
    // earlier versions keep the original scalloped-star SVG untouched.
    var setVerifiedBadge = function (shown) {
      var cfg = window.CONFIG || {};
      var vb = cfg.verifiedBadge || {};
      var useV2 = !!(cfg.features && cfg.features.verifiedIconV2 && vb.iconUrl);
      if (useV2) {
        if (verifiedEl) verifiedEl.hidden = true;
        if (verifiedV2El) {
          verifiedV2El.hidden = !shown;
          if (shown) {
            if (verifiedV2IconEl) {
              verifiedV2IconEl.onerror = function () {
                // Custom icon file missing/failed to load — fall back to
                // the original scalloped-star icon instead of leaving a
                // broken-image glyph on screen.
                verifiedV2IconEl.onerror = null;
                if (verifiedV2El) verifiedV2El.hidden = true;
                if (verifiedEl) verifiedEl.hidden = false;
              };
              verifiedV2IconEl.src = vb.iconUrl;
            }
            verifiedV2El.dataset.tip = vb.tooltip || 'Đã xác minh';
          }
        }
      } else {
        if (verifiedV2El) verifiedV2El.hidden = true;
        if (verifiedEl) verifiedEl.hidden = !shown;
      }
    };

    // The tooltip itself lives once, globally, appended straight to
    // <body> (see .float-tip in style.css) — deliberately outside every
    // card/panel so no ancestor's overflow can ever clip it, and it can
    // float above anything. It follows the cursor while hovering the
    // badge, and its font-size is copied live from whatever creator-name
    // text sits next to the badge that triggered it, since that size
    // differs by card mode (fixed vs clamp()) and this element sits
    // outside that container-query context entirely.
    if (floatTipEl && verifiedV2El) {
      var floatTipOffsetX = 14;
      var floatTipOffsetY = 14;
      var moveFloatTip = function (e) {
        floatTipEl.style.transform = 'translate(' + (e.clientX + floatTipOffsetX) + 'px, ' + (e.clientY + floatTipOffsetY) + 'px)';
      };
      verifiedV2El.addEventListener('mouseenter', function (e) {
        var text = verifiedV2El.dataset.tip;
        if (!text) return;
        floatTipEl.textContent = text;
        if (creatorEl) {
          floatTipEl.style.fontSize = window.getComputedStyle(creatorEl).fontSize;
        }
        floatTipEl.classList.add('is-visible');
        moveFloatTip(e);
      });
      verifiedV2El.addEventListener('mousemove', moveFloatTip);
      verifiedV2El.addEventListener('mouseleave', function () {
        floatTipEl.classList.remove('is-visible');
      });
      // Keyboard focus has no cursor position to anchor to — fall back to
      // just above the badge itself.
      verifiedV2El.addEventListener('focus', function () {
        var text = verifiedV2El.dataset.tip;
        if (!text) return;
        floatTipEl.textContent = text;
        if (creatorEl) {
          floatTipEl.style.fontSize = window.getComputedStyle(creatorEl).fontSize;
        }
        var rect = verifiedV2El.getBoundingClientRect();
        floatTipEl.style.transform = 'translate(' + (rect.left) + 'px, ' + (rect.bottom + 8) + 'px)';
        floatTipEl.classList.add('is-visible');
      });
      verifiedV2El.addEventListener('blur', function () {
        floatTipEl.classList.remove('is-visible');
      });
    }

    // "100.0K", "42.3M", "1.2B" — used by the v2 card, where every stat
    // pill is just an icon + a bare compact number (no unit words), so
    // large visit/player counts stay short instead of wrapping the pill.
    var formatCompactCount = function (n) {
      var abs = Math.abs(n);
      if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
      if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
      if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
      return String(n);
    };

    // Which hover-glow color the visits pill gets: bigger numbers read
    // as a bigger deal, so the tint escalates from plain/neutral up to
    // a gold "legendary" glow rather than using one fixed color for
    // every game regardless of scale.
    var getVisitsTier = function (n) {
      if (n >= 1e10) return 'legend'; // 10B+
      if (n >= 1e8) return 'high';    // 100M–9.9B
      if (n >= 1e6) return 'mid';     // 1M–99M
      return 'low';
    };

    var renderGameCard = function (info) {
      if (!thumbEl || !nameEl || !creatorEl) return;
      // Loading phase is over the moment we have anything to actually
      // render — the skeleton frames (if this version uses them) settle
      // into the real content from here on.
      if (gameCardEl) gameCardEl.classList.remove('is-card-loading');
      setNoteText(pendingNoteText);
      // No usable real name (either the fetch failed outright, or Roblox
      // sent the sanitized restricted-content placeholder) — drop the
      // name/creator/stats block entirely and show a bigger icon plus just
      // the Play/Copy buttons, rather than a half-empty text placeholder.
      var hasRealName = !!(info && !info.restricted && info.name);
      if (gameCardEl) {
        gameCardEl.classList.toggle('is-minimal', !hasRealName);
        gameCardEl.classList.remove('is-unresolved');
      }
      if (thumbWrapEl) {
        thumbWrapEl.classList.remove('is-unresolved');
        thumbWrapEl.removeAttribute('data-link-kind');
      }

      if (!info || (!info.name && !info.iconUrl && !info.restricted)) {
        setVerifiedBadge(false);
        if (playingStatEl) playingStatEl.hidden = true;
        if (likeStatEl) likeStatEl.hidden = true;
        if (visitsStatEl) visitsStatEl.hidden = true;
        if (descriptionEl) {
          descriptionEl.textContent = '';
          descriptionEl.hidden = true;
        }
        thumbEl.removeAttribute('src');
        if (thumbWrapEl) {
          thumbWrapEl.classList.remove('is-loading');
          thumbWrapEl.classList.add('is-fallback');
        }
        if (joinBtn) joinBtn.setAttribute('data-tooltip', 'Join Game');
        return;
      }
      nameEl.textContent = info.restricted
        ? 'Game bị giới hạn độ tuổi trên Roblox'
        : (info.name || 'Chưa lấy được tên game');
      creatorEl.textContent = info.restricted
        ? 'Roblox ẩn tên/tác giả với truy cập chưa đăng nhập'
        : (info.creatorName || '\u00A0');
      setVerifiedBadge(!!info.creatorVerified);
      if (joinBtn) joinBtn.setAttribute('data-tooltip', 'Join ' + (info.restricted ? 'Game' : (info.name || 'Game')));
      if (playingStatEl && playingTextEl) {
        if (typeof info.playing === 'number') {
          playingTextEl.textContent = isCardV2
            ? formatCompactCount(info.playing)
            : (formatPlayerCount(info.playing) + ' đang chơi');
          playingStatEl.hidden = false;
        } else {
          playingStatEl.hidden = true;
        }
      }
      if (likeStatEl && likeTextEl) {
        if (typeof info.likePercent === 'number') {
          likeTextEl.textContent = info.likePercent + '%';
          likeStatEl.hidden = false;
        } else {
          likeStatEl.hidden = true;
        }
      }
      if (visitsStatEl && visitsTextEl) {
        // Visits is only shown on the v2 card — older versions never had
        // this pill in their design, so keep it hidden there even if the
        // data happens to be available.
        if (isCardV2 && typeof info.visits === 'number') {
          visitsTextEl.textContent = formatCompactCount(info.visits);
          visitsStatEl.dataset.tier = getVisitsTier(info.visits);
          visitsStatEl.hidden = false;
        } else {
          visitsStatEl.hidden = true;
        }
      }
      if (descriptionEl) {
        var desc = (!info.restricted && info.description) ? info.description : '';
        descriptionEl.textContent = desc;
        descriptionEl.hidden = !desc;
      }
      if (info.iconUrl) {
        thumbEl.onerror = function () {
          // The URL came back but the image itself failed to load (dead
          // asset, transient CDN hiccup, blocked request, etc.) — fall
          // back to a plain placeholder instead of the browser's broken
          // image glyph.
          thumbEl.onerror = null;
          thumbEl.removeAttribute('src');
          if (thumbWrapEl) thumbWrapEl.classList.add('is-fallback');
        };
        if (thumbWrapEl) thumbWrapEl.classList.remove('is-fallback');
        thumbEl.src = info.iconUrl;
      } else {
        thumbEl.removeAttribute('src');
        if (thumbWrapEl) thumbWrapEl.classList.add('is-fallback');
      }
      if (thumbWrapEl) thumbWrapEl.classList.remove('is-loading');
    };

    var showCardLoading = function () {
      if (!nameEl || !creatorEl) return;
      if (noteBlinkTimer) { clearTimeout(noteBlinkTimer); noteBlinkTimer = null; }
      if (noteTextEl) noteTextEl.classList.remove('is-attention');
      if (gameCardEl) {
        gameCardEl.classList.remove('is-minimal');
        gameCardEl.classList.remove('is-unresolved');
        // Re-adding the class (even if already present) restarts the
        // shimmer/stagger animations below each time a new link loads.
        gameCardEl.classList.remove('is-card-loading');
        void gameCardEl.offsetWidth;
        gameCardEl.classList.add('is-card-loading');
      }
      nameEl.textContent = 'Đang tải thông tin game…';
      creatorEl.textContent = '\u00A0';
      setVerifiedBadge(false);
      // In skeleton mode the stat pills and description stay visible as
      // empty shimmering frames instead of disappearing outright — they
      // get hidden again afterwards if the real data turns out not to
      // have them (see renderGameCard).
      if (playingStatEl) playingStatEl.hidden = !skelEnabled;
      if (likeStatEl) likeStatEl.hidden = !skelEnabled;
      if (visitsStatEl) visitsStatEl.hidden = true;
      if (descriptionEl) {
        descriptionEl.textContent = '';
        descriptionEl.hidden = !skelEnabled;
      }
      if (thumbEl) {
        thumbEl.onerror = null;
        thumbEl.removeAttribute('src');
      }
      if (thumbWrapEl) {
        thumbWrapEl.classList.add('is-loading');
        thumbWrapEl.classList.remove('is-fallback', 'is-unresolved');
        thumbWrapEl.removeAttribute('data-link-kind');
      }
    };

    // Share / VIP-server links that haven't (or can't be) resolved into a
    // real placeId yet. Rather than leaving the card blank or letting a
    // thumbnail fetch fail into a broken-image state, show a clear,
    // good-looking badge that tells the person exactly what kind of link
    // this is. getGameCore()/resolveShareLink() may still upgrade this
    // into a full real game card afterwards — this is just the honest
    // "here's what we know so far" state in the meantime.
    var renderUnresolvedShareCard = function (linkType) {
      if (!nameEl || !creatorEl) return;
      if (gameCardEl) gameCardEl.classList.remove('is-card-loading');
      setNoteText(pendingNoteText);
      var isServer = linkType === 'Server';
      if (gameCardEl) {
        gameCardEl.classList.remove('is-minimal');
        gameCardEl.classList.add('is-unresolved');
      }
      nameEl.textContent = isServer ? 'Link Server VIP (riêng tư)' : 'Link chia sẻ game';
      creatorEl.textContent = isServer
        ? 'Chưa xem trước được server này — nhấn Chơi ngay để Roblox tự mở đúng server.'
        : 'Chưa xem trước được game này — nhấn Chơi ngay để Roblox tự nhận diện và mở.';
      setVerifiedBadge(false);
      if (playingStatEl) playingStatEl.hidden = true;
      if (likeStatEl) likeStatEl.hidden = true;
      if (descriptionEl) {
        descriptionEl.textContent = '';
        descriptionEl.hidden = true;
      }
      if (thumbEl) {
        thumbEl.onerror = null;
        thumbEl.removeAttribute('src');
      }
      if (thumbWrapEl) {
        thumbWrapEl.classList.remove('is-loading', 'is-fallback');
        thumbWrapEl.classList.add('is-unresolved');
        thumbWrapEl.setAttribute('data-link-kind', isServer ? 'server' : 'share');
      }
    };

    var showError = function (msg) {
      errorEl.textContent = msg;
      errorEl.classList.toggle('is-visible', !!msg);
      resultEl.classList.remove('is-visible');
      if (noteEl) {
        if (noteTextEl) setNoteText('');
        noteEl.classList.remove('is-visible');
      }
      if (relatedGamesEl) relatedGamesEl.hidden = true;
    };

    // Plays a quick fade + slide-in on the main card — called right
    // before its content is replaced so each swap (paste a link, pick a
    // search result, promote a related card, tap a discovery card)
    // visibly "refreshes" instead of silently snapping to the new
    // content.
    var NAV_TO_PAPER_GAP = 14; // small breathing room, not flush against the nav
    var scrollToGameCard = function () {
      if (!gameCardEl || !(cfg.features && cfg.features.autoScrollToGame)) return;
      // Anchor on the whole .paper section's top edge, not the game card
      // itself — the card sits well inside .paper (below the input row
      // and page-dock), so anchoring on the card alone left that stuff
      // sitting above the fold, unused, instead of tucking the nav right
      // up against the top of the page and showing everything below it.
      var paperEl = gameCardEl.closest('.paper') || gameCardEl;
      // Match the topbar's actual current bottom edge (it changes size —
      // and in its "floating pill" scrolled state, position — between
      // states) so .paper's top edge lands a small, fixed gap below it:
      // not hidden behind it (fixed + higher z-index) and not a big
      // empty gap either. .bottom (not just .height) accounts for the
      // floating state's own top offset too. Fixed elements don't move
      // on scroll, so this reading stays valid through the scroll we're
      // about to do.
      var topbarEl = document.querySelector('.topbar');
      var HEADER_CLEARANCE = (topbarEl ? topbarEl.getBoundingClientRect().bottom : 90) + NAV_TO_PAPER_GAP;
      // How close to HEADER_CLEARANCE counts as "already there, don't
      // bother re-scrolling" — a small FIXED tolerance, deliberately not
      // tied to HEADER_CLEARANCE itself. Comparing against
      // HEADER_CLEARANCE directly meant that shrinking it (to scroll
      // higher) also widened the "good enough, skip it" range, so later
      // clicks kept getting silently skipped and any small drift between
      // games (different card/page heights) never got corrected —
      // looking like it crept down a little more each time.
      var SNAP_TOLERANCE = 16;
      var rect = paperEl.getBoundingClientRect();
      if (Math.abs(rect.top - HEADER_CLEARANCE) <= SNAP_TOLERANCE && rect.top <= window.innerHeight * 0.4) return;
      var targetY = window.scrollY + rect.top - HEADER_CLEARANCE;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    };

    var animateCardSwap = function () {
      if (!gameCardEl) return;
      gameCardEl.classList.remove('is-swapping');
      void gameCardEl.offsetWidth; // restart the transition if one is already mid-flight
      gameCardEl.classList.add('is-swapping');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          gameCardEl.classList.remove('is-swapping');
        });
      });
    };

    // Ensures showCardLoading()'s shimmer is visible for at least `ms`
    // even when the data's already sitting in cache and would otherwise
    // resolve on the same tick — an instant swap with zero transition
    // reads as an abrupt, empty "pop" rather than something loading in.
    // Doesn't add anything on top of a real (slower) fetch: total wait
    // is whichever of the two takes longer, never fetch time + delay.
    var minDelay = function (ms) {
      return new Promise(function (resolve) { setTimeout(resolve, ms); });
    };

    var showResult = function (link, note, placeId, keepRelated) {
      outputEl.value = link;
      resultEl.classList.add('is-visible');
      errorEl.classList.remove('is-visible');
      copyBtn.classList.remove('is-copied');
      pendingNoteText = note || '';
      if (noteEl) {
        // Only reserve the box's visibility here — the character
        // fly-in animation itself is deferred to renderGameCard /
        // renderUnresolvedShareCard (right when loading actually
        // finishes and .is-card-loading's shimmer stops forcing it
        // visible). Populating it now would play the whole animation
        // out while it's still hidden behind the loading skeleton,
        // which is exactly why it used to look instant/invisible.
        noteEl.classList.toggle('is-visible', !!note);
        if (!placeId) setNoteText(pendingNoteText);
      }
      if (!keepRelated && relatedGamesEl) relatedGamesEl.hidden = true;

      if (placeId) {
        showCardLoading();
        // Scroll right away, the instant loading starts — not after the
        // fetch resolves — so the card (now showing its shimmer
        // skeleton) is already in view for however long the request
        // takes, instead of the page appearing to do nothing until data
        // arrives and then suddenly jumping.
        scrollToGameCard();
        var requestId = ++showResult._reqId;
        Promise.all([fetchGameCore(placeId), minDelay(400)]).then(function (results) {
          var info = results[0];
          if (requestId !== showResult._reqId) return; // input changed since — drop stale response
          animateCardSwap();
          renderGameCard(info);
          if (info && info.universeId && typeof info.likePercent !== 'number') {
            fetchLikePercent(info.universeId).then(function (likePercent) {
              if (requestId !== showResult._reqId) return;
              if (likeStatEl && likeTextEl && typeof likePercent === 'number') {
                likeTextEl.textContent = likePercent + '%';
                likeStatEl.hidden = false;
              }
            });
          }
          // A direct link only ever resolves to the one game itself, so
          // there's nothing to naturally offer as "other results" the way
          // a name search does — pull one random related suggestion from
          // Roblox's own recommendations for this universe instead, so
          // the person still has somewhere to go if this wasn't quite the
          // game they meant. Re-rolled fresh (new random pick) on every
          // paste, even of the same link.
          //
          // Gated on `!keepRelated`: search results call showResult(...,
          // true) specifically to preserve their own "other results" grid
          // (up to 20 real search matches) — without this check, this
          // block would fire for those too and stomp that grid with just
          // one recommendation a moment later.
          if (!keepRelated && info && info.universeId && !info.restricted) {
            currentMainItem = { placeId: placeId, name: info.name, iconUrl: info.iconUrl, universeId: info.universeId };
            fetchRandomRelatedGames(info.universeId, placeId, 3).then(function (picks) {
              if (requestId !== showResult._reqId) return;
              currentRelatedList = picks;
              if (!picks.length) { renderRelatedGames([]); return; }
              if (relatedGamesLabelEl) relatedGamesLabelEl.textContent = 'Có thể bạn cũng thích';
              renderRelatedGames(picks);
            });
          }
        });
      } else {
        // Share links don't carry a placeId we can look up directly.
        scrollToGameCard();
        animateCardSwap();
        renderGameCard(null);
      }
    };
    showResult._reqId = 0;

    // Builds the same visual card used in "related games" (icon + play
    // button + name) but for the horizontal-scrolling discovery rows —
    // clicking one just selects it the same way a search result does.
    var renderDiscoveryRow = function (container, list) {
      if (!container) return;
      container.innerHTML = '';
      (list || []).forEach(function (item) {
        if (!item || !item.placeId) return;

        var card = document.createElement('div');
        card.className = 'related-card discovery-card' + (cfg.features && cfg.features.minimalDiscoveryCards ? ' is-compact' : '');
        card.dataset.placeId = item.placeId;

        var thumb = document.createElement('div');
        thumb.className = 'related-card-thumb';

        var img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function () {
          // Dead/blocked icon URL — hide the broken-image glyph rather
          // than let the browser draw its default icon in its place.
          img.onerror = null;
          img.style.visibility = 'hidden';
        };
        if (item.iconUrl) img.src = item.iconUrl;
        thumb.appendChild(img);

        var playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'related-play-btn';
        playBtn.setAttribute('aria-label', 'Chơi ' + (item.name || 'game này'));
        playBtn.innerHTML = PLAY_ICON_SVG;
        playBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          window.location.href = buildDeepLink({ type: 'web', placeId: item.placeId });
        });
        thumb.appendChild(playBtn);

        var name = document.createElement('div');
        name.className = 'related-card-name';
        name.textContent = item.name || 'Chưa rõ tên';

        card.appendChild(thumb);
        card.appendChild(name);

        card.addEventListener('click', function () {
          currentMainItem = item;
          currentRelatedList = [];
          if (relatedGamesLabelEl) relatedGamesLabelEl.textContent = 'Kết quả khác';
          selectSearchResult(item, genNoteV2Enabled
            ? 'Kết quả được chọn từ danh sách gợi ý bên dưới ô tìm kiếm.'
            : 'Được chọn từ mục gợi ý bên dưới thanh tìm kiếm.');
        });

        container.appendChild(card);
      });
    };

    // "Trending now" / "picks for you" rows, fed by the curated pool in
    // config.js's discoveryPool.placeIds via the worker's /games-batch
    // endpoint (needs cfg.gameApiProxyBase — there's no roproxy/allorigins
    // fallback for a multi-id batch call, so this feature just quietly
    // stays hidden without a worker configured). Cached in localStorage
    // per calendar day so it only actually fetches once per visitor per
    // day — reopening or refreshing the page the same day reuses the
    // cached list instantly instead of hitting the proxy again.
    var DISCOVERY_CACHE_KEY = 'roz.discoveryRows.v1';

    var todayDateStr = function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    var showDiscoveryRows = function (trending, picks) {
      renderDiscoveryRow(discoveryTrendingRowEl, trending);
      renderDiscoveryRow(discoveryPicksRowEl, picks);
      if (discoveryRowsEl) {
        discoveryRowsEl.dataset.ready = '1';
        // Don't pop the rows open mid-search — only show them now if the
        // search bar happens to still be empty.
        if (!linkInput.value.trim()) discoveryRowsEl.hidden = false;
      }
    };

    var loadDiscoveryRows = function () {
      if (!discoveryRowsEl || !(cfg.features && cfg.features.discoveryRows)) return;
      var pool = (cfg.discoveryPool && cfg.discoveryPool.placeIds) || [];
      if (!pool.length) return;

      var today = todayDateStr();
      try {
        var cachedRaw = window.localStorage.getItem(DISCOVERY_CACHE_KEY);
        if (cachedRaw) {
          var cached = JSON.parse(cachedRaw);
          if (cached && cached.date === today && cached.trending && cached.picks) {
            showDiscoveryRows(cached.trending, cached.picks);
            return;
          }
        }
      } catch (e) { /* corrupt/unavailable localStorage — just refetch below */ }

      if (!cfg.gameApiProxyBase) return; // no worker configured — nothing to fetch from

      var base = cfg.gameApiProxyBase.replace(/\/$/, '');
      fetchWithTimeout(base + '/games-batch?placeIds=' + pool.join(','), 12000)
        .then(function (r) { if (!r.ok) throw new Error('games-batch http ' + r.status); return r.json(); })
        .then(function (data) {
          var games = (data && data.games) || [];
          if (!games.length) {
            // The worker attaches `debug` (per-placeId universe lookup
            // results + the games/icons/votes call statuses) specifically
            // for this case — surface it instead of throwing it away, or
            // there's no way to tell WHY it came back empty without
            // separately hitting the worker URL by hand.
            var err = new Error('games-batch returned no games');
            err.debug = data && data.debug;
            throw err;
          }

          var trending = games.slice().sort(function (a, b) {
            return (typeof b.playing === 'number' ? b.playing : -1) - (typeof a.playing === 'number' ? a.playing : -1);
          }).slice(0, 8);

          // A fresh shuffle of the WHOLE pool, not just whatever's left
          // after trending — a game can show up in both rows, same as
          // "most played" and "picks for you" overlapping on Roblox
          // itself. Re-shuffled once per day (see the cache above), not
          // once per page view.
          var picks = shuffleArray(games).slice(0, 8);

          try {
            window.localStorage.setItem(DISCOVERY_CACHE_KEY, JSON.stringify({ date: today, trending: trending, picks: picks }));
          } catch (e) { /* storage full/unavailable — still show it this once */ }

          showDiscoveryRows(trending, picks);
        })
        .catch(function (err) {
          console.warn('[RoZ API] loadDiscoveryRows failed:', err, err && err.debug ? err.debug : '');
        });
    };

    var PLAY_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

    // Promotes any result (the primary search match, or one of the
    // related cards below it) into the main card — the exact same path
    // a pasted link would take, just seeded with data we already have.
    //
    // Roblox's search API doesn't ALWAYS return a reliable creatorName —
    // when it's missing, trusting the shallow search/related payload as
    // final info renders a blank creator. So: only when creatorName is
    // actually missing do we pay for one real fetchGameDetails call
    // (using the universeId we already have, skipping the
    // placeId→universeId lookup) to fill it in. When the search payload
    // already has a creatorName (the common case), it's used as-is —
    // no second network round-trip, no visible "loads twice".
    var selectSearchResult = function (result, note) {
      var cfg = window.CONFIG || {};
      if (result.creatorName) {
        gameInfoCache[result.placeId] = Promise.resolve(result);
      } else if (cfg.gameApiProxyBase) {
        gameInfoCache[result.placeId] = fetchViaProxy(cfg.gameApiProxyBase, result.placeId).then(function (info) {
          return {
            name: info.name || result.name || null,
            creatorName: info.creatorName || result.creatorName || null,
            creatorType: info.creatorType || result.creatorType || null,
            creatorVerified: (info.creatorType != null) ? !!info.creatorVerified : !!result.creatorVerified,
            playing: (typeof info.playing === 'number') ? info.playing : (result.playing != null ? result.playing : null),
            visits: (typeof info.visits === 'number') ? info.visits : (typeof result.visits === 'number' ? result.visits : null),
            likePercent: (typeof info.likePercent === 'number') ? info.likePercent : (typeof result.likePercent === 'number' ? result.likePercent : null),
            description: info.description || result.description || null,
            iconUrl: info.iconUrl || result.iconUrl || null,
            universeId: info.universeId || result.universeId || null,
            restricted: !!info.restricted
          };
        }).catch(function () { return result; });
      } else if (result.universeId) {
        gameInfoCache[result.placeId] = Promise.all([
          fetchGameDetails(result.universeId).catch(function () { return null; }),
          fetchGameIcon(result.universeId, result.placeId).catch(function () { return null; }),
          fetchGameVotes(result.universeId).catch(function () { return null; })
        ]).then(function (r) {
          var details = r[0];
          var iconUrl = r[1];
          var likePercent = r[2];
          return {
            name: (details && details.name) || result.name || null,
            creatorName: (details && details.creatorName) || result.creatorName || null,
            creatorType: (details && details.creatorType) || result.creatorType || null,
            creatorVerified: details ? details.creatorVerified : !!result.creatorVerified,
            playing: (details && typeof details.playing === 'number') ? details.playing : (result.playing != null ? result.playing : null),
            visits: (details && typeof details.visits === 'number') ? details.visits : (typeof result.visits === 'number' ? result.visits : null),
            likePercent: (typeof likePercent === 'number') ? likePercent : (typeof result.likePercent === 'number' ? result.likePercent : null),
            description: (details && details.description) || result.description || null,
            iconUrl: iconUrl || result.iconUrl || null,
            universeId: result.universeId,
            restricted: !!(details && details.restricted)
          };
        });
      } else {
        gameInfoCache[result.placeId] = Promise.resolve(result);
      }
      showResult(
        buildDeepLink({ type: 'web', placeId: result.placeId }),
        note,
        result.placeId,
        true // keep whatever related grid is already showing
      );
    };

    var currentMainItem = null;
    var currentRelatedList = [];

    var renderRelatedGames = function (list) {
      if (!relatedGamesEl || !relatedGamesGridEl) return;
      relatedGamesGridEl.innerHTML = '';
      if (!list || !list.length) {
        relatedGamesEl.hidden = true;
        return;
      }
      list.forEach(function (item) {
        if (!item || !item.placeId) return;

        var card = document.createElement('div');
        card.className = 'related-card' + (cfg.features && cfg.features.minimalDiscoveryCards ? ' is-compact' : '');
        card.dataset.placeId = item.placeId;

        var thumb = document.createElement('div');
        thumb.className = 'related-card-thumb';

        var img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
        img.onerror = function () {
          // Dead/blocked icon URL — hide the broken-image glyph rather
          // than let the browser draw its default icon in its place.
          img.onerror = null;
          img.style.visibility = 'hidden';
        };
        if (item.iconUrl) img.src = item.iconUrl;
        thumb.appendChild(img);

        var playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'related-play-btn';
        playBtn.setAttribute('aria-label', 'Chơi ' + (item.name || 'game này'));
        playBtn.innerHTML = PLAY_ICON_SVG;
        // Play button: joins straight away, doesn't touch the main card.
        playBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          window.location.href = buildDeepLink({ type: 'web', placeId: item.placeId });
        });
        thumb.appendChild(playBtn);

        var name = document.createElement('div');
        name.className = 'related-card-name';
        name.textContent = item.name || 'Chưa rõ tên';

        card.appendChild(thumb);
        card.appendChild(name);

        // Clicking anywhere else on the card promotes it to the main card.
        card.addEventListener('click', function () {
          promoteRelatedCard(item);
        });

        relatedGamesGridEl.appendChild(card);
      });
      relatedGamesEl.hidden = false;
    };

    // Re-renders the related grid with a "reload" transition: the cards
    // currently shown fall away + fade out (staggered slightly per card),
    // then the new set of cards zooms in from small to full size at their
    // final positions (also staggered), instead of just snapping to the
    // new list instantly.
    var animateRelatedGamesReload = function (list) {
      if (!relatedGamesGridEl) { renderRelatedGames(list); return; }
      var existingCards = Array.prototype.slice.call(relatedGamesGridEl.querySelectorAll('.related-card'));
      if (!existingCards.length) { renderRelatedGames(list); return; }

      existingCards.forEach(function (card, i) {
        card.style.transitionDelay = (i * 30) + 'ms';
        card.classList.add('is-leaving');
      });

      setTimeout(function () {
        renderRelatedGames(list);
        var newCards = Array.prototype.slice.call(relatedGamesGridEl.querySelectorAll('.related-card'));
        newCards.forEach(function (card, i) {
          card.classList.add('is-entering');
          card.style.transitionDelay = (i * 45) + 'ms';
        });
        void relatedGamesGridEl.offsetWidth; // force reflow before releasing the entering state
        requestAnimationFrame(function () {
          newCards.forEach(function (card) {
            card.classList.add('is-entered');
          });
        });
        setTimeout(function () {
          newCards.forEach(function (card) {
            card.style.transitionDelay = '';
            card.classList.remove('is-entering', 'is-entered');
          });
        }, 550);
      }, 320);
    };

    // Clicking a related card: it becomes the new main card, the game
    // that *was* the main card gets tucked back in at the front of
    // "related games", and the clicked card is removed from that list
    // (it's the main card now, showing it twice would be redundant).
    var promoteRelatedCard = function (item) {
      var newRelated = currentRelatedList.filter(function (r) {
        return r && r.placeId !== item.placeId;
      });
      if (currentMainItem) newRelated.unshift(currentMainItem);
      currentMainItem = item;
      currentRelatedList = newRelated;

      if (relatedGamesLabelEl) relatedGamesLabelEl.textContent = 'Kết quả khác';
      selectSearchResult(item, genNoteV2Enabled
        ? 'Kết quả được chọn từ danh sách bên dưới. Vui lòng xác nhận đúng game trước khi chia sẻ liên kết.'
        : 'Đây là kết quả bạn chọn từ danh sách bên dưới — kiểm tra lại đúng game trước khi chia sẻ.');
      animateRelatedGamesReload(newRelated);
    };

    var searchGen = 0;
    var searchDebounceTimer = null;
    var lastSearchedRaw = null;

    // Normalizes away spacing-only differences — leading/trailing (also
    // already gone via .trim() upstream) and repeated/internal
    // whitespace — so a change that's whitespace-only never counts as
    // "different text" anywhere below.
    var normalizeSearchText = function (raw) {
      return raw.replace(/\s+/g, ' ').trim();
    };

    var performNameSearch = function (raw, myGen) {
      showCardLoading();
      fetchGameBySearch(raw).then(function (result) {
        if (myGen !== searchGen) return; // input changed since — drop stale result
        if (!result || !result.placeId) {
          showError('Không tìm thấy game nào khớp với “' + raw + '” — thử dán link/Place ID Roblox, hoặc gõ tên chính xác hơn.');
          return;
        }
        currentMainItem = result;
        currentRelatedList = (result.related || []).slice();
        if (relatedGamesLabelEl) relatedGamesLabelEl.textContent = 'Kết quả khác';
        selectSearchResult(result, genNoteV2Enabled
          ? 'Đây là kết quả phù hợp nhất với từ khóa bạn nhập. Vui lòng kiểm tra kỹ trước khi chia sẻ liên kết.'
          : 'Đây là kết quả gần đúng nhất theo tên bạn gõ — kiểm tra lại đúng game trước khi chia sẻ.');
        renderRelatedGames(currentRelatedList);
      }).catch(function () {
        if (myGen !== searchGen) return;
        showError('Không tìm kiếm được lúc này — thử lại hoặc dán link/Place ID trực tiếp.');
      });
    };

    var handleNameSearch = function (raw) {
      var myGen = ++searchGen;
      clearTimeout(searchDebounceTimer);
      var cfg = window.CONFIG || {};
      if (cfg.features && cfg.features.instantSearchTrigger) {
        // Pre-Alpha2.5+: plain typing never fires a request on its own
        // anymore — only an explicit "I'm done" signal does (Enter, or
        // leaving the field — see triggerSearchNow below). A mere pause
        // while still typing used to auto-fire here too, which is what
        // was sending one request per keystroke on anything slower than
        // 450ms between letters; removed so nothing goes out until you
        // actually signal you're finished.
        return;
      }
      // Older versions (no instantSearchTrigger) keep the original
      // pause-triggers-a-search behavior, since they have no other way
      // to fire a name search at all.
      searchDebounceTimer = setTimeout(function () {
        var normalized = normalizeSearchText(raw);
        if (normalized === lastSearchedRaw) return; // whitespace-only (or exact) repeat of the last search — skip
        lastSearchedRaw = normalized;
        performNameSearch(raw, myGen);
      }, 450);
    };

    // An explicit "I'm done" signal (Enter, just pasted, or leaving the
    // field) is what actually fires a name search on Pre-Alpha2.5+ —
    // see the early-return in handleNameSearch above for why plain
    // typing alone no longer does.
    var triggerSearchNow = function () {
      var cfg = window.CONFIG || {};
      if (!(cfg.features && cfg.features.instantSearchTrigger)) return;
      var raw = linkInput.value.trim();
      if (!raw) return;
      var info = parseRobloxLink(raw);
      if (info) return; // a recognized link/Place ID already loads instantly on its own via handleInput
      var looksLikeLink = /roblox\.com|roblox:\/\/|^https?:\/\//i.test(raw);
      if (looksLikeLink) return; // invalid-looking link — handleInput already showed the specific error for this
      // Checked before showCardLoading() below — a whitespace-only (or
      // exact) repeat of the last search is a total no-op, so it
      // shouldn't even flash the loading skeleton.
      var normalized = normalizeSearchText(raw);
      if (normalized === lastSearchedRaw) return;
      lastSearchedRaw = normalized;
      clearTimeout(searchDebounceTimer);
      var myGen = ++searchGen;
      performNameSearch(raw, myGen);
    };

    var handleInput = function () {
      var raw = linkInput.value.trim();
      clearTimeout(searchDebounceTimer);
      searchGen++; // cancel any debounced search still in flight from before
      if (!raw) {
        showError('');
        lastSearchedRaw = null;
        // Empty search bar — bring the discovery rows back (only if they
        // actually have data; loadDiscoveryRows() flips this on once
        // it's done, so before that finishes this is just a no-op).
        if (discoveryRowsEl && discoveryRowsEl.dataset.ready === '1') {
          discoveryRowsEl.hidden = false;
        }
        return;
      }
      // Actively searching/pasting — get the discovery rows out of the
      // way so they don't compete with the actual result for space.
      if (discoveryRowsEl) discoveryRowsEl.hidden = true;

      var info = parseRobloxLink(raw);

      if (!info) {
        // Doesn't look like a link/Place ID at all — try it as a game
        // name instead of erroring out immediately.
        var looksLikeLink = /roblox\.com|roblox:\/\/|^https?:\/\//i.test(raw);
        if (looksLikeLink) {
          showError('Link không hợp lệ — hãy dán link game Roblox (roblox.com/games/..., link share, hoặc Place ID)');
        } else {
          handleNameSearch(raw);
        }
        return;
      }

      if (info.type === 'shortlink') {
        showError('Đây là link rút gọn (ro.blox.com) — hãy mở link đó trước rồi dán lại link đầy đủ sau khi được chuyển hướng.');
        return;
      }

      if (info.type === 'share') {
        showResult(
          buildDeepLink(info),
          'Đây là link share — ứng dụng Roblox sẽ tự nhận diện khi mở, có thể không hoạt động trên mọi thiết bị.',
          null
        );
        // showResult(..., null) just rendered a blank card (no placeId to
        // look up yet) — replace that with a proper badge saying exactly
        // what kind of link this is, instead of leaving it empty while
        // resolveShareLink() below is still in flight (or forever, if it
        // never manages to resolve).
        renderUnresolvedShareCard(info.linkType);
        // Try to resolve it into a real placeId + linkCode (private-server
        // invites only) for a more reliable direct-join link + a proper
        // game card. myGen guards against the input changing again before
        // this comes back — same pattern as the name-search debounce above.
        var myGen = searchGen;
        resolveShareLink(info.code, info.linkType).then(function (resolved) {
          if (myGen !== searchGen) return; // input changed since — drop stale result
          if (!resolved) return;
          if (resolved.linkCode) {
            // VIP/private-server invite — the resolved placeId + linkCode
            // make a more reliable direct-join link than the raw share
            // passthrough, so use that as the primary output.
            showResult(
              buildDeepLink({ type: 'web', placeId: resolved.placeId, linkCode: resolved.linkCode }),
              'Đây là link vào Server riêng (VIP) — đã tự nhận diện và tạo link join trực tiếp, đáng tin cậy hơn link share gốc.',
              resolved.placeId
            );
          } else if (resolved.placeId) {
            // Plain game share (ExperienceDetails, etc.) — there's no
            // private-server code to encode, so the original share link
            // stays the output, but now that we know the placeId we can
            // still fill in a real game card instead of leaving it blank.
            showCardLoading();
            var requestId = ++showResult._reqId;
            fetchGameCore(resolved.placeId).then(function (cardInfo) {
              if (requestId !== showResult._reqId || myGen !== searchGen) return;
              renderGameCard(cardInfo);
              if (cardInfo && cardInfo.universeId && typeof cardInfo.likePercent !== 'number') {
                fetchLikePercent(cardInfo.universeId).then(function (likePercent) {
                  if (requestId !== showResult._reqId) return;
                  if (likeStatEl && likeTextEl && typeof likePercent === 'number') {
                    likeTextEl.textContent = likePercent + '%';
                    likeStatEl.hidden = false;
                  }
                });
              }
            });
          }
        });
        return;
      }

      if (!info.placeId && !info.userId) {
        showError('Không tìm thấy Place ID trong link — kiểm tra lại link đã dán.');
        return;
      }

      showResult(buildDeepLink(info), null, info.placeId);
    };

    // outputEl is type="hidden" (only holds the value internally), so it
    // can't be .select()ed for the old execCommand('copy') fallback —
    // copy via a throwaway textarea instead.
    var legacyCopy = function (text) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch (e) { /* no-op */ }
      document.body.removeChild(ta);
    };

    linkInput.addEventListener('input', handleInput);
    linkInput.addEventListener('paste', function () {
      setTimeout(function () {
        handleInput();
        triggerSearchNow();
      }, 0);
    });
    linkInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var cfg = window.CONFIG || {};
        if (!(cfg.features && cfg.features.instantSearchTrigger)) return;
        e.preventDefault();
        triggerSearchNow();
        linkInput.blur(); // "thoát khỏi chế độ nhập" — this also fires the blur listener below, which the dedup check in triggerSearchNow makes a safe no-op for the same text
      }
    });
    linkInput.addEventListener('blur', triggerSearchNow);

    loadDiscoveryRows();

    copyBtn.addEventListener('click', function () {
      if (!outputEl.value) return;
      var done = function () {
        copyBtn.classList.add('is-copied');
        setTimeout(function () {
          copyBtn.classList.remove('is-copied');
        }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(outputEl.value).then(done, function () {
          legacyCopy(outputEl.value);
          done();
        });
      } else {
        legacyCopy(outputEl.value);
        done();
      }
    });

    joinBtn.addEventListener('click', function () {
      if (!outputEl.value) return;
      window.location.href = outputEl.value;
    });
  }

  // ── Update Log modal + version-switch dropdown ──
  // Reads active-version data straight off window.ACTIVE_VERSION /
  // window.VERSION_REGISTRY (populated by versions.js, which always
  // runs before this file) — no config here, so a new version just
  // shows up automatically once it's added to versions.js.
  (function () {
    var registry = window.VERSION_REGISTRY || [];
    var active = window.ACTIVE_VERSION || {};
    // cfg here is the already version-resolved window.CONFIG (same
    // `cfg` var this whole script.js closure uses everywhere else) —
    // an older version that never set `features.*` simply doesn't get
    // that block after the deep-merge, so these all read as falsy and
    // the corresponding UI stays hidden, exactly as it should for a
    // version that predates the feature.
    var features = cfg.features || {};

    var CHANGELOG_ICONS = {
      rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
      sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
      wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 1 1-5.66 5.66l-6.2 6.2a1.5 1.5 0 0 0 2.12 2.12l6.2-6.2a4 4 0 0 1 5.66-5.66l-3.06 3.06 1.88 1.88 3.06-3.06z"/></svg>',
      'default': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6l1 3H8l1-3z"/><rect x="5" y="5" width="14" height="17" rx="2"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="15" y2="15"/></svg>'
    };

    // ── Version-switch dropdown ──
    var switchWrap = document.querySelector('.version-switch-wrap');
    var switchBtn = document.getElementById('versionSwitchButton');
    var switchMenu = document.getElementById('versionSwitchMenu');
    var switchMenuInner = document.getElementById('versionSwitchMenuInner');

    var closeSwitchMenu = function () {
      if (!switchMenu || switchMenu.hidden) return;
      switchMenu.hidden = true;
      if (switchBtn) switchBtn.setAttribute('aria-expanded', 'false');
    };

    var renderSwitchMenu = function () {
      if (!switchMenuInner) return;
      switchMenuInner.innerHTML = '';
      registry.forEach(function (v) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'version-switch-item';
        item.setAttribute('role', 'menuitemradio');
        var isActive = v.slug === active.slug;
        item.classList.toggle('is-active', isActive);
        item.setAttribute('aria-checked', isActive ? 'true' : 'false');

        var name = document.createElement('span');
        name.className = 'version-switch-item-name';
        name.textContent = v.name || v.slug;
        item.appendChild(name);

        if (v.code) {
          var code = document.createElement('span');
          code.className = 'version-switch-item-code';
          code.textContent = v.code;
          item.appendChild(code);
        }

        item.addEventListener('click', function () {
          closeSwitchMenu();
          if (!isActive && window.switchVersion) window.switchVersion(v.slug);
        });
        switchMenuInner.appendChild(item);
      });
    };

    // Hidden outright (not just disabled) when this version predates the
    // feature, or when it's on but there's nothing yet to switch to.
    if (!switchWrap) {
      // no-op — markup not present
    } else if (!features.versionSwitch || registry.length < 2) {
      switchWrap.style.display = 'none';
    } else if (switchBtn && switchMenu) {
      renderSwitchMenu();
      switchBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = switchMenu.hidden;
        closeSwitchMenu();
        if (willOpen) {
          switchMenu.hidden = false;
          switchBtn.setAttribute('aria-expanded', 'true');
        }
      });
      document.addEventListener('click', function (e) {
        if (!switchMenu.hidden && !switchMenu.contains(e.target) && e.target !== switchBtn) {
          closeSwitchMenu();
        }
      });
    }

    // ── Update Log modal ──
    var clogBtn   = document.getElementById('changelogButton');
    var clogOverlay = document.getElementById('changelogOverlay');
    var clogModal = document.getElementById('changelogModal');
    var clogClose = document.getElementById('changelogClose');
    var clogIcon  = document.getElementById('changelogModalIcon');
    var clogTitle = document.getElementById('changelogModalTitle');
    var clogDate  = document.getElementById('changelogModalDate');
    var clogNote  = document.getElementById('changelogModalNote');
    var clogList  = document.getElementById('changelogModalList');
    var CLOG_CLOSE_MS = 240; // matches the CSS opacity/transform transition duration

    if (!features.updateLog) {
      if (clogBtn) clogBtn.style.display = 'none';
    }

    // ── Page dock (Pre-Alpha2+): bottom page-switch nav. Hidden by
    // default in the markup — a version without this flag never shows it. ──
    var pageDockEl = document.getElementById('pageDock');
    if (pageDockEl) pageDockEl.hidden = !features.pageDock;

    // Custom page-dock icon assets (config.js → pageDock). Per-button via
    // pageDock.icons.<data-page value> (e.g. "couser"), or pageDock.icon
    // as a fallback default applied to any button without its own entry.
    // Left as the default inline SVG until a real file is set for that
    // button; once set, swaps to an <img> and optionally force-whitens it
    // so a plain black/dark icon PNG still matches the site's white icon
    // tone (each button can set its own forceWhite too).
    if (pageDockEl && cfg.pageDock) {
      var dockIconCfg = cfg.pageDock;
      var dockButtonEls = pageDockEl.querySelectorAll('.page-dock-btn[data-page]');
      dockButtonEls.forEach(function (btnEl) {
        var pageKey = btnEl.getAttribute('data-page');
        var perPageIcon = dockIconCfg.icons && dockIconCfg.icons[pageKey];
        var src = (perPageIcon && perPageIcon.src) || dockIconCfg.icon;
        if (!src) return; // no override for this button — keep the default inline SVG
        var forceWhite = (perPageIcon && typeof perPageIcon.forceWhite === 'boolean')
          ? perPageIcon.forceWhite
          : (dockIconCfg.forceWhite !== false);
        var slot = btnEl.querySelector('.page-dock-icon');
        if (!slot) return;
        slot.innerHTML = '';
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.draggable = false; // native image drag was fighting the dock's own pointer-based drag
        if (forceWhite) img.classList.add('is-force-white');
        slot.appendChild(img);
      });
    }

    // Scrolling down (past a small threshold, so it doesn't flicker
    // right at the top) tucks the dock away; scrolling back up brings
    // it right back. Direction is all that matters, not absolute
    // position, so this works no matter how far down the page it is.
    if (pageDockEl && features.pageDock) {
      var DOCK_SCROLL_THRESHOLD = 80;
      var DOCK_SCROLL_DEADZONE = 60;
      var lastDockScrollY = window.scrollY;
      // Accumulates distance travelled in the CURRENT direction, not
      // just the gap between two consecutive scroll events — a slow
      // scroll fires many events with only 1-2px of movement each,
      // which never cleared a per-event deadzone, so the dock could
      // get stuck tucked no matter how far you'd actually scrolled up.
      // Summing distance per direction (and resetting on reversal)
      // fixes that while still ignoring pure jitter.
      var dockScrollAccum = 0;
      var dockScrollDir = 0; // -1 up, 1 down, 0 unknown
      var updateDockVisibility = function () {
        var y = window.scrollY;
        var delta = y - lastDockScrollY;
        lastDockScrollY = y;

        if (y < DOCK_SCROLL_THRESHOLD) {
          pageDockEl.classList.remove('is-tucked');
          dockScrollAccum = 0;
          dockScrollDir = 0;
          return;
        }

        var dir = delta > 0 ? 1 : (delta < 0 ? -1 : dockScrollDir);
        if (dir !== dockScrollDir) {
          dockScrollDir = dir;
          dockScrollAccum = 0;
        }
        dockScrollAccum += Math.abs(delta);

        if (dockScrollAccum <= DOCK_SCROLL_DEADZONE) return;
        if (dockScrollDir > 0) {
          pageDockEl.classList.add('is-tucked');
        } else if (dockScrollDir < 0) {
          pageDockEl.classList.remove('is-tucked');
        }
      };
      window.addEventListener('scroll', updateDockVisibility, { passive: true });
    }

    // Drag the dock left/right by grabbing it — horizontal-only (Y never
    // moves), 1:1 with the pointer while dragging, then eases into its
    // final spot on release. Dragging close to the paper's left/right
    // edge locks it into a fixed left- or right-aligned layout instead
    // of wherever it was let go; anywhere else it settles back to the
    // centered default. The chosen side is remembered for next visit.
    if (pageDockEl && features.pageDock && window.PointerEvent) {
      var DOCK_ALIGN_KEY = 'roz.pageDock.align';
      var DOCK_EDGE_MARGIN = 24;    // px gap kept from the paper's edge when pinned left/right
      var DOCK_EDGE_ZONE = 72;      // px from the paper's edge that counts as "near it"
      var DOCK_DRAG_THRESHOLD = 6;  // px of movement before a press counts as a drag, not a click
      // NOT cached as a single element — there's a separate .paper per
      // page (Games/Couser/...) and only one is ever visible (the rest
      // sit `hidden`). A hidden element's getBoundingClientRect() is
      // all zeros, so caching whichever .paper happened to be first in
      // the DOM broke every clamp/position calc below the moment a
      // different page was the one actually showing. Called fresh
      // every time instead, so it always matches whatever's on screen.
      var getDockPaperEl = function () {
        return document.querySelector('.paper:not([hidden])') || document.querySelector('.paper');
      };
      var dockDidJustDrag = false;

      // `left`/`right`/`margin: 0 auto` (the CSS default, for centering)
      // can't be smoothly interpolated — `auto` isn't an animatable
      // value, so switching to/from it makes the dock jump instead of
      // ease. Once the dock is ever explicitly positioned (a drag, or
      // restoring a saved side), positioning switches over fully to an
      // explicit pixel `left` — the one property that always tweens
      // cleanly — for every state including "center".
      var computeTargetLeft = function (align, dockWidth) {
        var paperRect = getDockPaperEl().getBoundingClientRect();
        if (align === 'left') return DOCK_EDGE_MARGIN;
        if (align === 'right') return paperRect.width - dockWidth - DOCK_EDGE_MARGIN;
        return (paperRect.width - dockWidth) / 2; // center
      };

      var applyDockAlign = function (align, animate) {
        pageDockEl.classList.toggle('is-align-left', align === 'left');
        pageDockEl.classList.toggle('is-align-right', align === 'right');

        var dockRectNow = pageDockEl.getBoundingClientRect();
        var targetLeft = computeTargetLeft(align, dockRectNow.width);

        // From here on this element is fully JS-positioned — pin right
        // and margin so they never re-enter the equation and fight the
        // left value.
        pageDockEl.style.right = 'auto';
        pageDockEl.style.margin = '0';

        if (!animate) {
          pageDockEl.style.transform = 'none';
          pageDockEl.style.left = targetLeft + 'px';
          return;
        }

        // Bake wherever it actually is right now — including mid-drag,
        // where the visible position is base-left + a translateX — into
        // one concrete `left` value, with transitions still off, so
        // there's a real "before" frame to ease from. Then force a
        // layout flush and only THEN turn the transition on and move to
        // the target: doing the value change and enabling the
        // transition in the same tick lets browsers skip straight to
        // the end state instead of easing into it.
        var paperRect = getDockPaperEl().getBoundingClientRect();
        var currentLeft = dockRectNow.left - paperRect.left;
        pageDockEl.style.transition = 'none';
        pageDockEl.style.transform = 'none';
        pageDockEl.style.left = currentLeft + 'px';
        void pageDockEl.offsetWidth; // force the browser to commit the above before continuing
        pageDockEl.style.transition = '';
        pageDockEl.classList.add('is-snapping');
        requestAnimationFrame(function () {
          pageDockEl.style.left = targetLeft + 'px';
        });
        setTimeout(function () { pageDockEl.classList.remove('is-snapping'); }, 400);
      };

      // Restore whatever was saved last time before the rise-in
      // animation plays, so it doesn't visibly jump from center over
      // to the saved side right after load.
      var dockSavedAlign = null;
      try { dockSavedAlign = window.localStorage.getItem(DOCK_ALIGN_KEY); } catch (e) { /* storage blocked — default to center */ }
      if (dockSavedAlign === 'left' || dockSavedAlign === 'right' || dockSavedAlign === 'center') {
        applyDockAlign(dockSavedAlign, false);
      }

      var dockDrag = null;

      var onDockPointerMove = function (e) {
        if (!dockDrag) return;
        var dx = e.clientX - dockDrag.startX;

        if (!dockDrag.isDragging) {
          if (Math.abs(dx) <= DOCK_DRAG_THRESHOLD) return;
          dockDrag.isDragging = true;
          pageDockEl.classList.add('is-dragging');
        }

        e.preventDefault();

        // Horizontal-only, clamped so the dock can't be thrown past the
        // paper's own edges while dragging.
        var paperRect = getDockPaperEl().getBoundingClientRect();
        var minX = paperRect.left - dockDrag.dockRect.left;
        var maxX = paperRect.right - dockDrag.dockRect.right;
        var clampedDx = Math.max(minX, Math.min(maxX, dx));
        pageDockEl.style.transform = 'translateX(' + clampedDx + 'px)';
        dockDrag.lastClientX = e.clientX;
      };

      var onDockPointerUp = function (e) {
        if (!dockDrag) return;
        pageDockEl.classList.remove('is-pressed');
        var wasDragging = dockDrag.isDragging;
        var pressedBtn = dockDrag.targetBtn;
        try { pageDockEl.releasePointerCapture(dockDrag.pointerId); } catch (e2) { /* no-op */ }
        pageDockEl.removeEventListener('pointermove', onDockPointerMove);
        pageDockEl.removeEventListener('pointerup', onDockPointerUp);
        pageDockEl.removeEventListener('pointercancel', onDockPointerUp);

        if (wasDragging) {
          var paperRect = getDockPaperEl().getBoundingClientRect();
          var distFromLeft = dockDrag.lastClientX - paperRect.left;
          var distFromRight = paperRect.right - dockDrag.lastClientX;
          var align = 'center';
          if (distFromLeft <= DOCK_EDGE_ZONE) align = 'left';
          else if (distFromRight <= DOCK_EDGE_ZONE) align = 'right';

          pageDockEl.classList.remove('is-dragging');
          applyDockAlign(align, true);

          try { window.localStorage.setItem(DOCK_ALIGN_KEY, align); } catch (e3) { /* ignore */ }

          // The click that normally follows pointerup would otherwise
          // also fire the page-switch link right under the cursor.
          dockDidJustDrag = true;
          setTimeout(function () { dockDidJustDrag = false; }, 0);
        } else if (pressedBtn && typeof switchToPage === 'function') {
          // Not a drag — a plain tap/click. This is the ONLY place a page
          // switch actually gets triggered from: pageDockEl called
          // setPointerCapture(...) on pointerdown above, which retargets
          // every subsequent pointer AND the resulting click event to
          // pageDockEl itself instead of the <a> the user actually
          // pressed — so a click listener sitting on the <a> directly
          // never fires. Acting here, where we still have the real
          // pressed element from pointerdown, sidesteps that entirely.
          switchToPage(pressedBtn.getAttribute('data-page'));
        }

        dockDrag = null;
      };

      pageDockEl.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return;
        e.preventDefault(); // extra guard against the link's native drag-start firing before our own drag logic below kicks in
        // Freezes every hover-expand effect below for the whole gesture
        // (see the .page-dock:not(.is-pressed) guards on them) — the
        // cursor stays over whichever button was pressed the entire
        // time, so without this its hover-triggered width growth (and
        // the sibling push that comes with it) would keep firing mid-
        // drag, changing pageDockEl's actual size out from under the
        // dockRect captured just below (measured once, here, before
        // any of that growth happens) and throwing off the clamped
        // position math — felt as jerky/glitchy dragging.
        pageDockEl.classList.add('is-pressed');
        dockDrag = {
          startX: e.clientX,
          lastClientX: e.clientX,
          isDragging: false,
          pointerId: e.pointerId,
          dockRect: pageDockEl.getBoundingClientRect(),
          targetBtn: e.target && e.target.closest ? e.target.closest('.page-dock-btn') : null
        };
        try { pageDockEl.setPointerCapture(e.pointerId); } catch (e2) { /* no-op */ }
        pageDockEl.addEventListener('pointermove', onDockPointerMove);
        pageDockEl.addEventListener('pointerup', onDockPointerUp);
        pageDockEl.addEventListener('pointercancel', onDockPointerUp);
      });

      // Pointer capture above means the browser's own click event for
      // these <a href="#"> links ends up targeted at pageDockEl too —
      // always swallow it so the "#" never gets pushed onto the URL
      // (switchToPage() itself already ran, from onDockPointerUp).
      pageDockEl.addEventListener('click', function (e) {
        e.preventDefault();
      }, true);
    }

    // Switches between "pages" (Games / Couser / ...): each page-dock
    // button's data-page value matches a paper section's id (paperGames,
    // paperCouser, ...) — clicking one shows that section, hides the
    // rest, and updates is-active/aria-current on the buttons so the
    // dock's own hover styling reflects which page is current.
    if (pageDockEl) {
      var dockButtons = Array.prototype.slice.call(pageDockEl.querySelectorAll('.page-dock-btn'));
      var pageSections = {
        games: document.getElementById('paperGames'),
        couser: document.getElementById('paperCouser')
      };

      var switchToPage = function (pageName) {
        var nextSection = pageSections[pageName];
        if (!nextSection) return;

        Object.keys(pageSections).forEach(function (name) {
          var section = pageSections[name];
          if (section) section.hidden = (name !== pageName);
        });

        dockButtons.forEach(function (btn) {
          var isThisPage = btn.getAttribute('data-page') === pageName;
          btn.classList.toggle('is-active', isThisPage);
          if (isThisPage) {
            btn.setAttribute('aria-current', 'page');
          } else {
            btn.removeAttribute('aria-current');
          }
        });

        // Frame swaps instantly with the hidden toggle above — only the
        // content inside it animates in.
        var content = nextSection.querySelector('.paper-page-content');
        if (content) {
          content.classList.add('is-page-entering');
          void content.offsetWidth; // force layout so the offset state above actually paints first
          requestAnimationFrame(function () {
            content.classList.remove('is-page-entering');
          });
        }

        // Same "tuck the new page's top edge just under the nav" scroll
        // as picking a different game does (scrollToGameCard, further up
        // this file) — reusing its cfg.features.autoScrollToGame flag
        // means this is likewise Pre-Alpha2.5+ only, not a separate flag.
        if (cfg.features && cfg.features.autoScrollToGame) {
          var topbarEl = document.querySelector('.topbar');
          var navGap = (topbarEl ? topbarEl.getBoundingClientRect().bottom : 90) + 14;
          var sectionRect = nextSection.getBoundingClientRect();
          if (Math.abs(sectionRect.top - navGap) > 16) {
            window.scrollTo({ top: Math.max(0, window.scrollY + sectionRect.top - navGap), behavior: 'smooth' });
          }
        }
      };

      // Fallback for any environment where pointer events above didn't
      // fire (e.g. window.PointerEvent unsupported, so that whole block
      // was skipped) — a plain click listener still works in that case
      // since nothing there ever called setPointerCapture to retarget it.
      dockButtons.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          if (typeof dockDidJustDrag !== 'undefined' && dockDidJustDrag) return;
          switchToPage(btn.getAttribute('data-page'));
        });
      });
    }

    // ── uiV2 (Pre-Alpha1.1.2+): reworked Update Log frame + merged
    // version badge/switch button. Purely additive classes/text, so a
    // version without this flag renders exactly as it always did. ──
    var versionBadgeEl = document.getElementById('versionBadge');
    var switchLabelEl = switchBtn ? switchBtn.querySelector('.icon-action-label') : null;

    if (features.uiV2) {
      if (clogModal) clogModal.classList.add('is-v2');
      if (clogClose) clogClose.classList.add('is-v2');
      if (switchMenu) switchMenu.classList.add('is-v2');
      if (switchWrap) switchWrap.classList.add('is-v2');
      if (versionBadgeEl) versionBadgeEl.style.display = 'none';
      if (switchLabelEl) switchLabelEl.textContent = active.name || active.slug || '';
    }

    var formatReleaseDate = function (iso) {
      if (!iso) return '';
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
        ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    };

    var renderChangelog = function () {
      var cl = active.changelog || {};
      if (clogIcon) clogIcon.innerHTML = CHANGELOG_ICONS[cl.icon] || CHANGELOG_ICONS['default'];
      if (clogTitle) clogTitle.textContent = active.name || active.slug || '';
      if (clogDate) {
        var dateText = formatReleaseDate(cl.releasedAt);
        clogDate.textContent = dateText;
        clogDate.hidden = !dateText;
      }
      if (clogNote) {
        clogNote.textContent = cl.devNote || '';
        clogNote.hidden = !cl.devNote;
      }
      if (clogList) {
        clogList.innerHTML = '';
        (cl.items || []).forEach(function (line) {
          var li = document.createElement('li');
          li.textContent = line;
          clogList.appendChild(li);
        });
      }
    };

    var openChangelog = function () {
      if (!clogOverlay) return;
      closeSwitchMenu();
      renderChangelog();
      clogOverlay.hidden = false;
      // Force a layout flush before adding the visible class so the
      // opacity/transform transition actually plays instead of
      // snapping straight to its end state.
      void clogOverlay.offsetWidth;
      clogOverlay.classList.add('is-visible');
      if (clogBtn) clogBtn.setAttribute('aria-expanded', 'true');
      document.body.classList.add('is-modal-open');
    };

    var closeChangelog = function () {
      if (!clogOverlay || clogOverlay.hidden) return;
      clogOverlay.classList.remove('is-visible');
      if (clogBtn) clogBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('is-modal-open');
      setTimeout(function () {
        clogOverlay.hidden = true;
      }, CLOG_CLOSE_MS);
    };

    if (features.updateLog && clogBtn && clogOverlay) {
      clogBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (clogOverlay.classList.contains('is-visible')) {
          closeChangelog();
        } else {
          openChangelog();
        }
      });
      if (clogClose) clogClose.addEventListener('click', closeChangelog);
      // Click on the dimmed backdrop (not the modal itself) closes it.
      clogOverlay.addEventListener('click', function (e) {
        if (e.target === clogOverlay) closeChangelog();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeSwitchMenu();
      closeChangelog();
    });
  })();

  // ── Pre-Alpha2.5+ (cardHoverPreview): floating glass hover-preview ──
  // for .is-compact game cards (discovery rows + "Kết quả khác"). A
  // version without this flag never runs any of this, so those cards
  // keep their plain lift+highlight hover exactly as before.
  (function () {
    if (!(cfg.features && cfg.features.cardHoverPreview)) return;

    // Every hover now creates its OWN fresh preview instance rather than
    // one shared element getting repositioned/reused — hovering a new
    // card no longer "snaps" the existing panel over to it. Instead the
    // previous instance plays its normal close animation right where it
    // is and removes itself from the DOM once that finishes, while a
    // brand new instance bursts open at the new card independently. The
    // two can be visible at the same time for the short overlap while
    // one is closing and the other opening.
    var activeCard = null;   // card the CURRENT (latest) instance belongs to
    var activeInstance = null;
    var hideTimer = null;    // debounce before the active instance starts closing

    // Same sizing model as before — panel scales off the hovered card's
    // own rendered width (WIDTH_EXTRA px wider), height keeping the
    // original 200×270 ratio so growing it is a uniform "square, but
    // taller" scale-up rather than one dimension stretching alone.
    var WIDTH_EXTRA = 15;
    var PREVIEW_RATIO = 270 / 200;
    var HIDE_DELAY_MS = 120;
    // How long an instance's close animation takes before it's safe to
    // actually remove its elements — matches the shrink transition
    // (0.34s, see .card-hover-preview in style.css) plus the opacity
    // fade that follows it (0.15s) once is-visible comes off.
    var CLOSE_SHRINK_MS = 340;
    var CLOSE_FADE_MS = 150;

    var createInstance = function (card) {
      var el = document.createElement('div');
      el.className = 'card-hover-preview';

      var thumb = document.createElement('div');
      thumb.className = 'card-hover-preview-thumb';
      var imgEl = document.createElement('img');
      imgEl.alt = '';
      thumb.appendChild(imgEl);

      var body = document.createElement('div');
      body.className = 'card-hover-preview-body';

      var playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'card-hover-preview-play';
      playBtn.innerHTML = PLAY_ICON_SVG;
      playBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (playBtn._placeId) {
          window.location.href = buildDeepLink({ type: 'web', placeId: playBtn._placeId });
        }
      });

      body.appendChild(playBtn);
      el.appendChild(thumb);
      el.appendChild(body);

      // Same one element handles the whole journey — no separate "real"
      // name element to cross-fade into. See the matching comment this
      // was copied from further up in git history for the full "why".
      var captionEl = document.createElement('div');
      captionEl.className = 'card-hover-preview-caption';
      el.appendChild(captionEl);

      var inst = {
        el: el,
        glowEl: null,
        imgEl: imgEl,
        captionEl: captionEl,
        playBtn: playBtn,
        card: card,
        closing: false,
        expandRaf1: null,
        expandRaf2: null,
        closeTimer1: null,
        closeTimer2: null
      };

      el.addEventListener('click', function () {
        if (inst.card) inst.card.click();
      });
      el.addEventListener('mouseenter', function () {
        if (activeInstance === inst) cancelHide();
      });
      el.addEventListener('mouseleave', function () {
        if (activeInstance === inst) scheduleHide();
      });

      // Ambient glow — separate element (not a child; .card-hover-preview
      // needs overflow:hidden to clip the image/caption to its own
      // rounded box, which would clip this too) mirroring the panel's
      // position/size/visibility, sitting just behind it.
      var glowEl = document.createElement('div');
      glowEl.className = 'card-hover-preview-glow';
      inst.glowEl = glowEl;

      document.body.appendChild(glowEl);
      document.body.appendChild(el);

      return inst;
    };

    var destroyInstance = function (inst) {
      if (!inst) return;
      cancelAnimationFrame(inst.expandRaf1);
      cancelAnimationFrame(inst.expandRaf2);
      clearTimeout(inst.closeTimer1);
      clearTimeout(inst.closeTimer2);
      if (inst.el && inst.el.parentNode) inst.el.parentNode.removeChild(inst.el);
      if (inst.glowEl && inst.glowEl.parentNode) inst.glowEl.parentNode.removeChild(inst.glowEl);
    };

    // Plays the close animation for one specific instance, then removes
    // it from the DOM once that finishes — independent of whatever
    // other instance (if any) is opening elsewhere at the same time.
    var closeInstance = function (inst) {
      if (!inst || inst.closing) return;
      inst.closing = true;
      cancelAnimationFrame(inst.expandRaf1);
      cancelAnimationFrame(inst.expandRaf2);

      var rect = inst.card ? inst.card.getBoundingClientRect() : null;
      inst.el.classList.remove('is-expanding');
      inst.glowEl.classList.remove('is-expanding');
      // Glow fades out right now, on its own snappier timing — not tied
      // to the panel's own longer shrink-then-fade sequence below, which
      // is what made it feel stuck/rigid mid-shrink.
      inst.glowEl.classList.add('is-hiding');
      inst.glowEl.classList.remove('is-visible');

      if (rect) {
        inst.el.style.left = rect.left + 'px';
        inst.el.style.width = rect.width + 'px';
        inst.el.style.top = rect.top + 'px';
        inst.el.style.height = rect.height + 'px';
        inst.glowEl.style.left = rect.left + 'px';
        inst.glowEl.style.width = rect.width + 'px';
        inst.glowEl.style.top = rect.top + 'px';
        inst.glowEl.style.height = rect.height + 'px';
      }

      inst.closeTimer1 = setTimeout(function () {
        inst.el.classList.remove('is-visible');
      }, CLOSE_SHRINK_MS);
      inst.closeTimer2 = setTimeout(function () {
        destroyInstance(inst);
      }, CLOSE_SHRINK_MS + CLOSE_FADE_MS);
    };

    var showFor = function (card) {
      if (activeCard === card) return;

      // The previously-active instance (if any) starts closing right
      // where it is and cleans itself up — it does NOT get reused for
      // the new card.
      if (activeInstance) closeInstance(activeInstance);
      if (activeCard) activeCard.classList.remove('is-preview-source');

      var img = card.querySelector('.related-card-thumb img');
      var nameEl = card.querySelector('.related-card-name');
      if (!img) { activeCard = null; activeInstance = null; return; }

      activeCard = card;
      card.classList.add('is-preview-source');

      var inst = createInstance(card);
      activeInstance = inst;

      inst.imgEl.src = img.currentSrc || img.src || '';
      inst.glowEl.style.backgroundImage = 'url(' + (img.currentSrc || img.src || '') + ')';
      inst.captionEl.textContent = (nameEl && nameEl.textContent) || '';
      inst.playBtn._placeId = card.dataset.placeId || null;
      // Same thumbnail as the panel's own ambient glow — the Play
      // button's hover glow (see .card-hover-preview-play::before in
      // style.css) reads it via this CSS custom property.
      inst.playBtn.style.setProperty('--play-glow-image', 'url(' + (img.currentSrc || img.src || '') + ')');

      var rect = card.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var previewWidth = rect.width + WIDTH_EXTRA;
      var previewHeight = previewWidth * PREVIEW_RATIO;

      // Snap to the hovered card's exact box AND make it fully visible
      // at that exact size/position, transitions off for this one step —
      // for an instant it's indistinguishable from the real card. Then,
      // still synchronously, flip to the expanded box with transitions
      // back on: that's the one thing that animates, starting exactly
      // where the card was.
      inst.el.style.transition = 'none';
      inst.el.classList.add('is-visible');
      inst.el.style.left = rect.left + 'px';
      inst.el.style.width = rect.width + 'px';
      inst.el.style.top = rect.top + 'px';
      inst.el.style.height = rect.height + 'px';
      inst.glowEl.style.transition = 'none';
      inst.glowEl.classList.add('is-visible');
      inst.glowEl.style.left = rect.left + 'px';
      inst.glowEl.style.width = rect.width + 'px';
      inst.glowEl.style.top = rect.top + 'px';
      inst.glowEl.style.height = rect.height + 'px';
      // …force layout so that starting box is actually committed as a
      // real, painted style before transitions come back on.
      void inst.el.offsetHeight;
      inst.el.style.transition = '';
      inst.glowEl.style.transition = '';

      // Double-nested rAF — a single rAF can still run before the
      // browser has actually painted the snap state above, letting it
      // get coalesced with the expand change below into one jump with
      // nothing to animate from. Waiting two frames guarantees a real
      // paint happened in between.
      inst.expandRaf1 = requestAnimationFrame(function () {
        inst.expandRaf2 = requestAnimationFrame(function () {
          if (inst.closing) return; // dismissed/superseded meanwhile

          inst.el.classList.add('is-expanding');
          inst.el.style.left = (centerX - previewWidth / 2) + 'px';
          inst.el.style.width = previewWidth + 'px';
          inst.el.style.top = (centerY - previewHeight / 2) + 'px';
          inst.el.style.height = previewHeight + 'px';
          inst.glowEl.classList.add('is-expanding');
          inst.glowEl.style.left = (centerX - previewWidth / 2) + 'px';
          inst.glowEl.style.width = previewWidth + 'px';
          inst.glowEl.style.top = (centerY - previewHeight / 2) + 'px';
          inst.glowEl.style.height = previewHeight + 'px';
        });
      });
    };

    var hide = function () {
      if (activeCard) {
        activeCard.classList.remove('is-preview-source');
        activeCard = null;
      }
      if (activeInstance) {
        closeInstance(activeInstance);
        activeInstance = null;
      }
    };

    var cancelHide = function () {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    };

    var scheduleHide = function () {
      cancelHide();
      hideTimer = setTimeout(hide, HIDE_DELAY_MS);
    };

    // Delegated on document (rather than per-card) since discovery/
    // related cards get torn down and rebuilt on every new search or
    // reload — this way nothing needs re-wiring when that happens.
    document.addEventListener('mouseover', function (e) {
      var card = e.target.closest ? e.target.closest('.is-compact') : null;
      if (!card) return;
      cancelHide();
      if (activeCard !== card) showFor(card);
    });

    document.addEventListener('mouseout', function (e) {
      var card = e.target.closest ? e.target.closest('.is-compact') : null;
      if (!card) return;
      // Moving onto the active instance's own panel (which lives outside
      // the card in the DOM) shouldn't count as leaving.
      var to = e.relatedTarget;
      if (activeInstance && to && activeInstance.el.contains(to)) return;
      scheduleHide();
    });

    // A hovered card scrolling out from under a stale preview (the
    // discovery rows scroll horizontally) is jarring — just close it
    // immediately rather than trying to keep it glued in place.
    document.addEventListener('scroll', function (e) {
      if (activeCard && e.target && e.target.contains && e.target.contains(activeCard)) {
        hide();
      }
    }, true);
  })();
})();
