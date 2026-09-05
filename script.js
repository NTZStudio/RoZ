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
    var openHeightTimer = null;
    var OPEN_BLINK_MS = 400;
    // Matches the base (opening) height transition duration in CSS —
    // after this, we hand the notify column back to 'auto' height.
    var OPEN_HEIGHT_MS = 500;
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
          if (ntzNotify) {
            // height:auto can't be transitioned, and animating
            // grid-template-rows with fr values isn't reliably supported
            // across browsers (notably older Safari) — so measure the
            // real content height and tween that concrete pixel value
            // instead. scrollHeight still reports the full content size
            // even while the element itself is clipped to 0.
            var targetH = ntzNotify.scrollHeight;
            ntzNotify.style.height = targetH + 'px';
            clearTimeout(openHeightTimer);
            openHeightTimer = setTimeout(function () {
              // Hand back to auto so future reflows (resize, orientation
              // change, clamp() font changes) keep sizing correctly.
              ntzNotify.style.height = 'auto';
              openHeightTimer = null;
            }, OPEN_HEIGHT_MS);
          }
          stateTimer = null;
        }, OPEN_BLINK_MS);
      } else {
        ntzPanel.classList.add('is-closing');
        if (ntzDesc) {
          ntzDesc.classList.add('is-blinking');
        }
        if (ntzNotify) {
          clearTimeout(openHeightTimer);
          openHeightTimer = null;
          // Pin a concrete starting pixel height (it may currently be
          // 'auto') so there's something to transition down from.
          ntzNotify.style.height = ntzNotify.scrollHeight + 'px';
        }
        // Text stays hidden (is-blinking) the whole time below, so these
        // layout snaps (flex-basis / text-align, which aren't transitioned)
        // never happen while anything is visible.
        stateTimer = setTimeout(function () {
          // Notify frame/body/divider have already faded out by now — safe
          // to reclaim their layout space.
          ntzPanel.classList.remove('is-notify');
          ntzPanel.classList.remove('is-desc-narrow');
          if (ntzNotify) {
            ntzNotify.style.height = '0px';
          }
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
  var copyBtn     = document.getElementById('copyBtn');
  var joinBtn     = document.getElementById('joinBtn');
  var thumbWrapEl = document.getElementById('gameThumbWrap');
  var thumbEl     = document.getElementById('gameThumb');
  var gameCardEl  = document.getElementById('gameCard');
  var nameEl      = document.getElementById('gameName');
  var creatorEl   = document.getElementById('gameCreator');
  var verifiedEl  = document.getElementById('gameVerifiedBadge');
  var playingStatEl = document.getElementById('gamePlayingStat');
  var playingTextEl = document.getElementById('gamePlayingText');
  var likeStatEl  = document.getElementById('gameLikeStat');
  var likeTextEl  = document.getElementById('gameLikeText');
  var visitsStatEl = document.getElementById('gameVisitsStat');
  var visitsTextEl = document.getElementById('gameVisitsText');
  var descriptionEl = document.getElementById('gameDescription');
  var relatedGamesEl     = document.getElementById('relatedGames');
  var relatedGamesGridEl = document.getElementById('relatedGamesGrid');
  var betaBtn     = document.getElementById('betaBtn');

  // Pre-Alpha1.3+: reworked main game-card layout (bigger icon on the
  // left spanning the card's full height, name/creator/stats on the
  // right, big Play button + Copy + the reserved beta-feature slot in
  // one row). Purely additive — a version without this flag never gets
  // the `.is-v2` class, so it keeps rendering exactly as it always did.
  var isCardV2 = !!(cfg.features && cfg.features.gameCardV2);
  if (isCardV2 && gameCardEl) gameCardEl.classList.add('is-v2');
  if (betaBtn) betaBtn.hidden = !isCardV2;

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

    var renderGameCard = function (info) {
      if (!thumbEl || !nameEl || !creatorEl) return;
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
        if (verifiedEl) verifiedEl.hidden = true;
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
        return;
      }
      nameEl.textContent = info.restricted
        ? 'Game bị giới hạn độ tuổi trên Roblox'
        : (info.name || 'Chưa lấy được tên game');
      creatorEl.textContent = info.restricted
        ? 'Roblox ẩn tên/tác giả với truy cập chưa đăng nhập'
        : (info.creatorName || '\u00A0');
      if (verifiedEl) verifiedEl.hidden = !info.creatorVerified;
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
      if (gameCardEl) {
        gameCardEl.classList.remove('is-minimal');
        gameCardEl.classList.remove('is-unresolved');
      }
      nameEl.textContent = 'Đang tải thông tin game…';
      creatorEl.textContent = '\u00A0';
      if (verifiedEl) verifiedEl.hidden = true;
      if (playingStatEl) playingStatEl.hidden = true;
      if (likeStatEl) likeStatEl.hidden = true;
      if (visitsStatEl) visitsStatEl.hidden = true;
      if (descriptionEl) {
        descriptionEl.textContent = '';
        descriptionEl.hidden = true;
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
      var isServer = linkType === 'Server';
      if (gameCardEl) {
        gameCardEl.classList.remove('is-minimal');
        gameCardEl.classList.add('is-unresolved');
      }
      nameEl.textContent = isServer ? 'Link Server VIP (riêng tư)' : 'Link chia sẻ game';
      creatorEl.textContent = isServer
        ? 'Chưa xem trước được server này — nhấn Chơi ngay để Roblox tự mở đúng server.'
        : 'Chưa xem trước được game này — nhấn Chơi ngay để Roblox tự nhận diện và mở.';
      if (verifiedEl) verifiedEl.hidden = true;
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
        noteEl.textContent = '';
        noteEl.classList.remove('is-visible');
      }
      if (relatedGamesEl) relatedGamesEl.hidden = true;
    };

    var showResult = function (link, note, placeId, keepRelated) {
      outputEl.value = link;
      resultEl.classList.add('is-visible');
      errorEl.classList.remove('is-visible');
      copyBtn.classList.remove('is-copied');
      if (noteEl) {
        noteEl.textContent = note || '';
        noteEl.classList.toggle('is-visible', !!note);
      }
      if (!keepRelated && relatedGamesEl) relatedGamesEl.hidden = true;

      if (placeId) {
        showCardLoading();
        var requestId = ++showResult._reqId;
        fetchGameCore(placeId).then(function (info) {
          if (requestId !== showResult._reqId) return; // input changed since — drop stale response
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
        });
      } else {
        // Share links don't carry a placeId we can look up directly.
        renderGameCard(null);
      }
    };
    showResult._reqId = 0;

    var PLAY_ICON_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

    // Promotes any result (the primary search match, or one of the
    // related cards below it) into the main card — the exact same path
    // a pasted link would take, just seeded with data we already have.
    var selectSearchResult = function (result, note) {
      gameInfoCache[result.placeId] = Promise.resolve(result);
      showResult(
        buildDeepLink({ type: 'web', placeId: result.placeId }),
        note,
        result.placeId,
        true // keep whatever related grid is already showing
      );
    };

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
        card.className = 'related-card';

        var thumb = document.createElement('div');
        thumb.className = 'related-card-thumb';

        var img = document.createElement('img');
        img.alt = '';
        img.loading = 'lazy';
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
          selectSearchResult(item, 'Đây là kết quả bạn chọn từ danh sách bên dưới — kiểm tra lại đúng game trước khi chia sẻ.');
        });

        relatedGamesGridEl.appendChild(card);
      });
      relatedGamesEl.hidden = false;
    };

    var searchGen = 0;
    var searchDebounceTimer = null;

    var handleNameSearch = function (raw) {
      var myGen = ++searchGen;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        fetchGameBySearch(raw).then(function (result) {
          if (myGen !== searchGen) return; // input changed since — drop stale result
          if (!result || !result.placeId) {
            showError('Không tìm thấy game nào khớp với “' + raw + '” — thử dán link/Place ID Roblox, hoặc gõ tên chính xác hơn.');
            return;
          }
          selectSearchResult(result, 'Đây là kết quả gần đúng nhất theo tên bạn gõ — kiểm tra lại đúng game trước khi chia sẻ.');
          renderRelatedGames(result.related);
        }).catch(function () {
          if (myGen !== searchGen) return;
          showError('Không tìm kiếm được lúc này — thử lại hoặc dán link/Place ID trực tiếp.');
        });
      }, 450);
    };

    var handleInput = function () {
      var raw = linkInput.value.trim();
      clearTimeout(searchDebounceTimer);
      searchGen++; // cancel any debounced search still in flight from before
      if (!raw) {
        showError('');
        return;
      }

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
      setTimeout(handleInput, 0);
    });

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
})();
