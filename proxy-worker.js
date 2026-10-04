// ─────────────────────────────────────────────────────────────────
// Cloudflare Worker: Roblox game-info proxy
//
// Roblox's public game/thumbnail APIs don't send CORS headers for
// third-party origins, so calling them directly from a browser on
// your own site gets blocked. This worker runs server-side (no CORS
// restriction there), fetches the 3 Roblox endpoints, and returns
// one small JSON payload with the CORS headers your site needs.
//
// It also works around a separate Roblox quirk: games.roblox.com
// sometimes answers with a sanitized "[Title Unavailable]" /
// "[Unknown]" placeholder instead of the real name/creator — this can
// happen even for perfectly normal, non age-restricted games, and
// isn't tied to any particular visitor; it's Roblox being cautious
// about automated-looking traffic (which includes shared server IP
// ranges like this worker's). There's no reliable way to stop Roblox
// from occasionally doing this, so instead this worker retries once,
// and if it's still sanitized, serves the last known-good result it
// cached for that placeId (Cache API, no extra setup needed) instead
// of showing the placeholder to a real visitor.
//
// DEPLOY (free, ~2 minutes):
//   1. Go to https://dash.cloudflare.com → Workers & Pages → Create
//      → "Create Worker".
//   2. Paste this whole file into the editor, replacing the default
//      code.
//   3. In ALLOWED_ORIGIN below, put your site's real domain
//      (e.g. "https://yourdomain.com"). Using "*" works too but
//      allows any website to use your worker.
//   4. Click "Deploy". Copy the worker URL it gives you, e.g.
//      https://roz-proxy.yourname.workers.dev
//   5. In your site's config.js, add:
//        window.CONFIG.gameApiProxyBase = "https://roz-proxy.yourname.workers.dev";
//      script.js will automatically start using it — no other code
//      changes needed.
//
// Endpoints this worker exposes:
//   GET {workerUrl}/game-info?placeId=90500188348656
//   → { "name": "...", "description": "...", "creatorName": "...",
//       "creatorType": "Group", "creatorVerified": true, "playing": 1234,
//       "likePercent": 92, "universeId": ..., "iconUrl": "https://..." }
//   GET {workerUrl}/search-game?query=adopt+me
//   → { "placeId": "...", "universeId": ..., "name": "...",
//       "description": "...", "creatorName": "...", "creatorVerified": true,
//       "playing": 1234, "likePercent": 92, "iconUrl": "https://...",
//       "related": [ { same shape, minus "description"/"likePercent"/
//       "related" }, ... up to 20 ] }
//     (uses Roblox's own search — the same one roblox.com's search bar
//     calls — and returns the closest match plus up to 20 more)
//   GET {workerUrl}/resolve-share?code=abc123&type=Server
//   → { "placeId": "...", "linkCode": "...", "universeId": ... }
//     (resolves a private-server share link into a real placeId+linkCode;
//     404s if the code isn't a valid "Server" invite)
//   GET {workerUrl}/games-batch?placeIds=920587237,4924922222,...
//   → { "games": [ { "placeId": "...", "universeId": ..., "name": "...",
//       "creatorName": "...", "creatorVerified": true, "playing": 1234,
//       "visits": 123456789, "likePercent": 92, "iconUrl": "https://..." },
//       ... ] }
//     (batch lookup for a small curated placeId list — 3 Roblox API calls
//     total no matter how many ids are passed, up to 40. Used for the
//     homepage's "trending now" / "picks for you" rows; edge-cached 20
//     minutes so repeat visitors across the site don't re-trigger it)
// ─────────────────────────────────────────────────────────────────

var ALLOWED_ORIGIN = '*'; // e.g. 'https://yourdomain.com'

// How long a known-good result (real name/creator/icon, not the sanitized
// "[Title Unavailable]" placeholder) stays cached per placeId. Roblox's
// games.roblox.com API intermittently serves that sanitized placeholder to
// unauthenticated/automated-looking traffic (which includes shared
// datacenter IP ranges like Cloudflare Workers') even for perfectly normal,
// non-restricted games — the same placeId can get a clean response one
// minute and the placeholder the next. Caching the last good result means
// a later bad response never has to be shown to a real visitor.
var GOOD_RESULT_TTL_SECONDS = 6 * 60 * 60; // 6 hours

addEventListener('fetch', function (event) {
  event.respondWith(handleRequest(event.request, event));
});

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function isRestricted(payload) {
  if (!payload) return true;
  // Compare uppercased so a casing change on Roblox's end (it has sent
  // both "[Title Unavailable]" and "[TITLE UNAVAILABLE]") can't silently
  // defeat this check and let the literal placeholder string through to
  // a visitor — or get cached below as if it were a real result.
  var name = (payload.name || '').toUpperCase();
  var creatorName = (payload.creatorName || '').toUpperCase();
  return name === '[TITLE UNAVAILABLE]' || creatorName === '[UNKNOWN]';
}

// Cache API keys are Request/Response pairs, not arbitrary strings — build
// a fixed synthetic URL per placeId so cache.match()/cache.put() have a
// stable key. This uses the Cache API (no dashboard setup needed, unlike
// Workers KV) so the file still just pastes-and-deploys as-is.
function goodResultCacheKey(placeId) {
  return new Request('https://roz-proxy-cache.internal/good/' + placeId);
}

// The homepage's "trending" / "picks for you" rows call /games-batch with
// the SAME small curated placeId list (from every visitor's browser), so
// this is cached briefly at the edge too — otherwise every visitor's
// once-a-day request still means N visitors × 3 Roblox API calls each,
// all fetching identical data. 20 minutes keeps player counts reasonably
// fresh while cutting that down to a handful of real Roblox calls per
// cache window regardless of visitor count.
var BATCH_CACHE_TTL_SECONDS = 20 * 60; // 20 minutes

function batchCacheKey(placeIds) {
  // Sorted so the same set of ids in a different order still hits the
  // same cache entry.
  return new Request('https://roz-proxy-cache.internal/batch/' + placeIds.slice().sort().join(','));
}

async function fetchGameInfo(placeId) {
  // 1. placeId → universeId
  var universeRes = await fetch('https://apis.roblox.com/universes/v1/places/' + placeId + '/universe');
  if (!universeRes.ok) throw new Error('universe lookup failed: ' + universeRes.status);
  var universeData = await universeRes.json();
  var universeId = universeData.universeId;
  if (!universeId) throw new Error('place not found');

  // 2. universeId → name / creator / description / playing count, and icon,
  // in parallel
  var gameRes = await fetch('https://games.roblox.com/v1/games?universeIds=' + universeId);
  var iconRes = await fetch('https://thumbnails.roblox.com/v1/games/icons?universeIds=' + universeId + '&size=512x512&format=Png&isCircular=false');

  var gameJson = await gameRes.json();
  var iconJson = await iconRes.json();

  var game = gameJson && gameJson.data && gameJson.data[0];
  var icon = iconJson && iconJson.data && iconJson.data[0];

  if (!game) throw new Error('no game data returned');

  // Like % (upVotes/downVotes) is fetched separately and never allowed to
  // fail the whole response — it's a nice-to-have, not core like the name.
  var likePercent = null;
  try {
    var votesRes = await fetch('https://games.roblox.com/v1/games/votes?universeIds=' + universeId);
    if (votesRes.ok) {
      var votesJson = await votesRes.json();
      var votes = votesJson && votesJson.data && votesJson.data[0];
      if (votes && typeof votes.upVotes === 'number' && typeof votes.downVotes === 'number') {
        var total = votes.upVotes + votes.downVotes;
        if (total > 0) likePercent = Math.round((votes.upVotes / total) * 100);
      }
    }
  } catch (e) { /* best-effort — leave likePercent null */ }

  return {
    name: game.name || null,
    description: game.description || null,
    creatorName: game.creator ? game.creator.name : null,
    creatorType: game.creator ? game.creator.type : null,
    creatorVerified: !!(game.creator && game.creator.hasVerifiedBadge),
    playing: (typeof game.playing === 'number') ? game.playing : null,
    visits: (typeof game.visits === 'number') ? game.visits : null,
    iconUrl: icon ? icon.imageUrl : null,
    likePercent: likePercent,
    universeId: universeId
  };
}

// Roblox's own search (the one roblox.com's search bar itself calls) —
// takes a free-text query and returns whichever game result Roblox
// considers the best match (primary) plus up to 20 more matches
// (related), all icons fetched in a single batched call.
async function fetchGameBySearchQuery(query) {
  var sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Date.now() + '-' + Math.random().toString(16).slice(2));
  var searchRes = await fetch('https://apis.roblox.com/search-api/omni-search?searchQuery=' + encodeURIComponent(query) + '&sessionId=' + sessionId);
  if (!searchRes.ok) throw new Error('search failed: ' + searchRes.status);
  var searchJson = await searchRes.json();

  var groups = (searchJson && searchJson.searchResults) || [];
  var matches = [];
  for (var i = 0; i < groups.length && matches.length < 21; i++) {
    var g = groups[i];
    if (g && g.contentGroupType === 'Game' && g.contents && g.contents.length) {
      var m = g.contents[0];
      if (m && m.rootPlaceId) matches.push(m);
    }
  }
  if (!matches.length) throw new Error('no game found for query');

  var universeIds = matches.map(function (m) { return m.universeId; });
  var iconRes = await fetch('https://thumbnails.roblox.com/v1/games/icons?universeIds=' + universeIds.join(',') + '&size=512x512&format=Png&isCircular=false');
  var iconJson = await iconRes.json().catch(function () { return null; });
  var iconByUniverse = {};
  ((iconJson && iconJson.data) || []).forEach(function (icon) {
    iconByUniverse[icon.targetId] = icon.imageUrl;
  });

  var toPayload = function (m) {
    return {
      placeId: String(m.rootPlaceId),
      universeId: m.universeId,
      name: m.name || null,
      creatorName: m.creatorName || null,
      creatorVerified: !!m.creatorHasVerifiedBadge,
      playing: (typeof m.playerCount === 'number') ? m.playerCount : null,
      iconUrl: iconByUniverse[m.universeId] || null
    };
  };

  var primary = toPayload(matches[0]);
  primary.related = matches.slice(1, 21).map(toPayload);

  // Enrich just the primary match with full description + like % — one
  // extra universeId's worth of calls, versus doing this for all 20
  // related matches too which would be slow and mostly wasted.
  try {
    var primaryGameRes = await fetch('https://games.roblox.com/v1/games?universeIds=' + primary.universeId);
    if (primaryGameRes.ok) {
      var primaryGameJson = await primaryGameRes.json();
      var primaryGame = primaryGameJson && primaryGameJson.data && primaryGameJson.data[0];
      if (primaryGame && primaryGame.description) primary.description = primaryGame.description;
      if (primaryGame && typeof primaryGame.visits === 'number') primary.visits = primaryGame.visits;
    }
  } catch (e) { /* best-effort */ }
  try {
    var primaryVotesRes = await fetch('https://games.roblox.com/v1/games/votes?universeIds=' + primary.universeId);
    if (primaryVotesRes.ok) {
      var primaryVotesJson = await primaryVotesRes.json();
      var primaryVotes = primaryVotesJson && primaryVotesJson.data && primaryVotesJson.data[0];
      if (primaryVotes && typeof primaryVotes.upVotes === 'number' && typeof primaryVotes.downVotes === 'number') {
        var primaryTotal = primaryVotes.upVotes + primaryVotes.downVotes;
        if (primaryTotal > 0) primary.likePercent = Math.round((primaryVotes.upVotes / primaryTotal) * 100);
      }
    }
  } catch (e) { /* best-effort */ }

  return primary;
}

// Given a small list of placeIds (the curated pool the site's config.js
// keeps for the homepage's "trending now" / "picks for you" rows),
// resolves all of them to universeIds and then fetches name/creator/
// playing/visits, icons, and like% for the whole batch in 3 calls total
// — regardless of how many placeIds are in the list — instead of 3 calls
// PER game. The site only calls this once per visitor per day (it caches
// the result itself), and this worker caches it too (see
// BATCH_CACHE_TTL_SECONDS below), so in practice Roblox's real APIs see
// a small fraction of the traffic actual page views would otherwise cost.
async function fetchGamesBatch(placeIds) {
  var universeResults = await Promise.all(placeIds.map(async function (placeId) {
    try {
      var r = await fetch('https://apis.roblox.com/universes/v1/places/' + placeId + '/universe');
      if (!r.ok) return { placeId: placeId, ok: false, status: r.status };
      var j = await r.json();
      return (j && j.universeId)
        ? { placeId: placeId, ok: true, universeId: j.universeId }
        : { placeId: placeId, ok: false, status: r.status, note: 'response had no universeId' };
    } catch (e) {
      return { placeId: placeId, ok: false, error: String(e && e.message || e) };
    }
  }));
  var universePairs = universeResults.filter(function (u) { return u.ok; });
  var debug = { universeLookups: universeResults };

  if (!universePairs.length) return { games: [], debug: debug };

  var universeIds = universePairs.map(function (p) { return p.universeId; });
  var idsParam = universeIds.join(',');
  debug.universeIdsQueried = idsParam;

  // The batched games endpoint (?universeIds=a,b,c,...) turns out to get
  // Roblox's "[Title Unavailable]" sanitized-placeholder treatment far
  // more readily than a single-universeId call — querying several IDs
  // at once is a much stronger automation signal to Roblox's side. So
  // each universeId's /v1/games lookup is fired separately (still in
  // parallel via Promise.all — same wall-clock cost, not N times
  // slower), and one sanitized/failed lookup only drops that one game
  // instead of the entire batch coming back empty.
  var gamesCallInfo = { perUniverse: [] };
  var gameByUniverse = {};
  await Promise.all(universePairs.map(async function (p) {
    async function attempt() {
      var r = await fetch('https://games.roblox.com/v1/games?universeIds=' + p.universeId);
      var entry = { universeId: p.universeId, status: r.status, ok: r.ok };
      if (r.ok) {
        var j = await r.json();
        var g = j && j.data && j.data[0];
        if (g) {
          entry.sanitized = ((g.name || '').toUpperCase() === '[TITLE UNAVAILABLE]');
          if (!entry.sanitized) entry.game = g;
        } else {
          entry.note = 'no game data in response';
        }
      }
      return entry;
    }
    try {
      var entry = await attempt();
      // Same "one immediate retry" tolerance /game-info already relies
      // on — a sanitized response here has turned out to be as likely
      // to just be transient noise for a single universeId as it is for
      // a full batch, so it's worth one more try before giving up on it.
      if (entry.sanitized) {
        var retryEntry = await attempt().catch(function () { return entry; });
        retryEntry.retried = true;
        entry = retryEntry;
      }
      if (entry.game) gameByUniverse[p.universeId] = entry.game;
      delete entry.game; // keep the debug payload small — only need pass/fail here
      gamesCallInfo.perUniverse.push(entry);
    } catch (e) {
      gamesCallInfo.perUniverse.push({ universeId: p.universeId, error: String(e && e.message || e) });
    }
  }));
  debug.gamesCall = gamesCallInfo;
  debug.gamesReturned = gamesCallInfo.perUniverse.filter(function (e) { return e.ok; }).length;
  debug.matchedGames = Object.keys(gameByUniverse).length;

  var iconsCallInfo = {}, votesCallInfo = {};
  var results = await Promise.all([
    fetch('https://thumbnails.roblox.com/v1/games/icons?universeIds=' + idsParam + '&size=512x512&format=Png&isCircular=false')
      .then(function (r) { iconsCallInfo.status = r.status; iconsCallInfo.ok = r.ok; return r.ok ? r.json() : null; })
      .catch(function (e) { iconsCallInfo.error = String(e && e.message || e); return null; }),
    fetch('https://games.roblox.com/v1/games/votes?universeIds=' + idsParam)
      .then(function (r) { votesCallInfo.status = r.status; votesCallInfo.ok = r.ok; return r.ok ? r.json() : null; })
      .catch(function (e) { votesCallInfo.error = String(e && e.message || e); return null; })
  ]);
  var iconsJson = results[0], votesJson = results[1];
  debug.iconsCall = iconsCallInfo;
  debug.votesCall = votesCallInfo;

  var iconByUniverse = {};
  ((iconsJson && iconsJson.data) || []).forEach(function (icon) { iconByUniverse[icon.targetId] = icon.imageUrl; });

  var likeByUniverse = {};
  ((votesJson && votesJson.data) || []).forEach(function (v) {
    if (typeof v.upVotes === 'number' && typeof v.downVotes === 'number') {
      var total = v.upVotes + v.downVotes;
      if (total > 0) likeByUniverse[v.id != null ? v.id : v.universeId] = Math.round((v.upVotes / total) * 100);
    }
  });

  var games = universePairs.map(function (p) {
    var g = gameByUniverse[p.universeId];
    if (!g) return null; // this one game failing to resolve just drops it from the batch
    return {
      placeId: p.placeId,
      universeId: p.universeId,
      name: g.name || null,
      creatorName: g.creator ? g.creator.name : null,
      creatorVerified: !!(g.creator && g.creator.hasVerifiedBadge),
      playing: (typeof g.playing === 'number') ? g.playing : null,
      visits: (typeof g.visits === 'number') ? g.visits : null,
      likePercent: (typeof likeByUniverse[p.universeId] === 'number') ? likeByUniverse[p.universeId] : null,
      iconUrl: iconByUniverse[p.universeId] || null
    };
  }).filter(Boolean);

  return { games: games, debug: debug };
}

// Resolves a share-link code (from roblox.com/share?code=...&type=... or
// roblox://share-links?type=...&code=...) into an actual placeId +
// private-server linkCode, when it's a private-server ("Server") invite.
// This is the same internal endpoint Roblox's own client/website uses to
// open share links — it has no CORS headers either, hence going through
// this worker like everything else here.
//
// Only privateServerInviteData is handled — other invite kinds (friend
// invites, plain experience invites, etc.) have a different, unconfirmed
// response shape, so those are left alone rather than guessed at.
async function resolveShareLink(code, linkType) {
  var res = await fetch('https://apis.roblox.com/sharelinks/v1/resolve-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ linkId: code, linkType: linkType || 'Server' })
  });
  if (!res.ok) throw new Error('resolve-link http ' + res.status);
  var data = await res.json();

  var psi = data && data.privateServerInviteData;
  if (psi && psi.status === 'Valid' && psi.placeId && psi.linkCode) {
    return {
      placeId: String(psi.placeId),
      linkCode: String(psi.linkCode),
      universeId: psi.universeId || null
    };
  }

  // Plain game shares (type=ExperienceDetails) carry no private-server
  // invite — just a placeId/universeId, presumably under a differently
  // named block. Roblox doesn't publicly document this response shape,
  // so this is a best-effort, defensive read across the field names most
  // consistent with how the Server one is shaped. If none match, this
  // simply falls through to "not a valid share link" below (same
  // behavior as before this was added — no regression either way).
  var candidates = [
    data && data.experienceDetailsData,
    data && data.experienceInviteData,
    data && data.placeDetailsData
  ];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    if (c && (c.placeId || c.rootPlaceId)) {
      return {
        placeId: String(c.placeId || c.rootPlaceId),
        linkCode: null,
        universeId: c.universeId || null
      };
    }
  }

  throw new Error('not a valid/recognized share link');
}

async function handleRequest(request, event) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  var url = new URL(request.url);

  if (url.pathname === '/search-game') {
    var query = url.searchParams.get('query');
    if (!query || !query.trim()) {
      return new Response(JSON.stringify({ error: 'missing query' }), { status: 400, headers: corsHeaders() });
    }
    try {
      var searchPayload = await fetchGameBySearchQuery(query.trim());
      return new Response(JSON.stringify(searchPayload), { status: 200, headers: corsHeaders() });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 404, headers: corsHeaders() });
    }
  }

  if (url.pathname === '/resolve-share') {
    var shareCode = url.searchParams.get('code');
    var shareType = url.searchParams.get('type') || 'Server';
    if (!shareCode) {
      return new Response(JSON.stringify({ error: 'missing code' }), { status: 400, headers: corsHeaders() });
    }
    try {
      var resolved = await resolveShareLink(shareCode, shareType);
      return new Response(JSON.stringify(resolved), { status: 200, headers: corsHeaders() });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 404, headers: corsHeaders() });
    }
  }

  if (url.pathname === '/games-batch') {
    var placeIdsParam = url.searchParams.get('placeIds') || '';
    var placeIdList = placeIdsParam.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return /^\d+$/.test(s); });
    if (!placeIdList.length) {
      return new Response(JSON.stringify({ error: 'missing or invalid placeIds' }), { status: 400, headers: corsHeaders() });
    }
    // Cap it — this is meant for a small curated homepage pool, not a
    // general-purpose bulk lookup endpoint.
    placeIdList = placeIdList.slice(0, 40);

    var batchCache = caches.default;
    var batchKey = batchCacheKey(placeIdList);
    var cachedBatch = await batchCache.match(batchKey);
    if (cachedBatch) {
      return new Response(await cachedBatch.text(), { status: 200, headers: corsHeaders() });
    }

    try {
      var batchResult = await fetchGamesBatch(placeIdList);
      var responseBody = { games: batchResult.games };
      // Only cache genuinely successful, non-empty results. Caching an
      // empty batch used to mean a single transient Roblox hiccup got
      // served back to every visitor for the full 20-minute TTL, even
      // after Roblox had already recovered — worth a live retry every
      // time until it actually has something to show instead.
      if (batchResult.games.length) {
        var batchResponse = new Response(JSON.stringify(responseBody), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + BATCH_CACHE_TTL_SECONDS }
        });
        var batchPutPromise = batchCache.put(batchKey, batchResponse);
        if (event) event.waitUntil(batchPutPromise); else await batchPutPromise;
      } else {
        // Empty — attach what actually happened at each step so this is
        // debuggable from the client response instead of a flat "no
        // games", without needing Worker log access.
        responseBody.debug = batchResult.debug;
      }
      return new Response(JSON.stringify(responseBody), { status: 200, headers: corsHeaders() });
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 502, headers: corsHeaders() });
    }
  }

  if (url.pathname !== '/game-info') {
    return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: corsHeaders() });
  }

  var placeId = url.searchParams.get('placeId');
  if (!placeId || !/^\d+$/.test(placeId)) {
    return new Response(JSON.stringify({ error: 'missing or invalid placeId' }), { status: 400, headers: corsHeaders() });
  }

  var cache = caches.default;
  var cacheKey = goodResultCacheKey(placeId);

  try {
    var payload = await fetchGameInfo(placeId);

    // First attempt got the sanitized placeholder — Roblox's response for
    // this can flip from request to request, so a single immediate retry
    // often just works.
    if (isRestricted(payload)) {
      payload = await fetchGameInfo(placeId).catch(function () { return payload; });
    }

    if (!isRestricted(payload)) {
      // Good data — remember it so a future placeholder response can be
      // swapped out for this instead of shown to a visitor.
      var cacheResponse = new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=' + GOOD_RESULT_TTL_SECONDS }
      });
      var putPromise = cache.put(cacheKey, cacheResponse);
      if (event) event.waitUntil(putPromise); else await putPromise;
      return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders() });
    }

    // Still restricted after the retry — fall back to the last known-good
    // cached result for this placeId, if we have one, keeping the fresh
    // player count when it's available.
    var cached = await cache.match(cacheKey);
    if (cached) {
      var cachedPayload = await cached.json();
      if (typeof payload.playing === 'number') {
        cachedPayload.playing = payload.playing;
      }
      return new Response(JSON.stringify(cachedPayload), { status: 200, headers: corsHeaders() });
    }

    // No cache to fall back on yet — return what Roblox actually gave us.
    return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders() });
  } catch (err) {
    // A hard failure (network error, missing place, etc.) — still worth
    // trying the cache before giving up entirely.
    var cachedOnError = await cache.match(cacheKey);
    if (cachedOnError) {
      return new Response(await cachedOnError.text(), { status: 200, headers: corsHeaders() });
    }
    return new Response(JSON.stringify({ error: String(err && err.message || err) }), { status: 502, headers: corsHeaders() });
  }
}
