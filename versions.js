// ─────────────────────────────────────────────────────────────────
// Version registry & router
//
// This is the system future updates plug into: each version of the site
// is one entry below, selected via `#/<slug>` in the URL (a hash, not a
// real path — it never reaches the server, so this works unmodified on
// any static host, no rewrite rules needed).
//
// HOW TO ADD A NEW VERSION:
//   1. Add an entry to VERSIONS below with a new `slug`.
//   2. Put ONLY what changes for that version in its `config` block —
//      title, icon, brand, description, notify text, buttons, colors...
//      anything present in window.CONFIG can be overridden here.
//   3. Set `extends` to the slug of the version it should inherit from
//      (deep-merged — this version's fields win on conflict), or leave
//      it null to define a version's config completely from scratch.
//   4. Bump DEFAULT_SLUG once the new version is ready to be what
//      visitors land on with no hash in the URL.
//   5. Optionally add a `changelog` block (icon, releasedAt, devNote,
//      items[]) — script.js reads it straight off the active version
//      to fill in the Update Log modal. `icon` must match a key in the
//      CHANGELOG_ICONS map in script.js, or it falls back to a generic
//      icon. Skip this block entirely if a version has no changelog.
//   6. UI features that didn't exist yet in an older version (like the
//      Update Log button/modal) are gated behind `config.features`
//      flags (see the `features` blocks below, and how script.js reads
//      `cfg.features` before showing/binding each one). A version that
//      doesn't set a flag simply doesn't have that feature, exactly as
//      it was at the time that version shipped. `versionSwitch` is on
//      for every version here on purpose — it's the way BACK to a
//      newer version, so it stays available even from the oldest one.
//
// `major` / `minor` are just labels for grouping versions later (e.g. a
// changelog or version switcher) — they don't affect routing, which is
// always the flat `slug`.
//
// DO NOT remove or rename the SVG element ids the NTZ snake animation
// depends on (#svg, #ns1–#ns4, #ts1–#ts3, #zs1, #tr_z/#tr_t/#tr_n,
// #sk_z/#sk_t/#sk_n) when customizing a version's markup — ntz-snake.js
// is shared by every version unchanged and expects those exact ids to
// exist in the page.
//
// Load order matters: this file must load AFTER config.js (so there's a
// base window.CONFIG to merge onto) and BEFORE script.js (so script.js
// sees the already-resolved, version-specific config).
// ─────────────────────────────────────────────────────────────────
(function () {
  var VERSIONS = [
    {
      slug: 'pre-alpha1',
      major: 'Pre-Alpha',
      minor: '1',
      name: 'Pre-Alpha1',
      code: '52eca7',
      extends: null,
      // Shown in the Update Log modal when this version is active.
      // `icon` picks one of the icons registered in script.js'
      // CHANGELOG_ICONS map (falls back to a generic icon if unknown).
      // `releasedAt` is an ISO datetime, formatted for display at
      // render time — keep it in this raw form here.
      changelog: {
        icon: 'rocket',
        releasedAt: '2026-08-20T09:00:00+07:00',
        devNote: 'Phiên bản khởi đầu của RoZ API — nền tảng xem trước game Roblox trực tiếp chỉ từ một đường link.',
        items: [
          'Ra mắt trang chủ RoZ API',
          'Tạo link tham gia trực tiếp (deep link) từ link game Roblox',
          'Xem trước thông tin game: tên, tác giả, số người chơi, tỉ lệ thích',
          'Hỗ trợ tìm kiếm game theo tên khi không dán link'
        ]
      },
      // Nút đổi phiên bản VẪN hiện ở đây (để có đường quay lại bản mới
      // hơn), nhưng chưa có Update Log — bản gốc lúc đó chưa có tính
      // năng này nên không bật `updateLog`.
      config: {
        features: {
          versionSwitch: true
        }
      }
    },
    {
      slug: 'pre-alpha1-1',
      major: 'Pre-Alpha',
      minor: '1.1',
      name: 'Pre-Alpha1.1',
      code: '8f21db',
      // Con của Pre-Alpha1 — kế thừa toàn bộ config của bản gốc
      // (gồm cả features.versionSwitch), chỉ thêm `updateLog: true`
      // vì đây là bản đầu tiên có tính năng Update Log.
      extends: 'pre-alpha1',
      changelog: {
        icon: 'sparkles',
        releasedAt: '2026-09-05T15:00:00+07:00',
        devNote: 'Bản cập nhật nhỏ dựa trên Pre-Alpha1 — bổ sung hệ thống Update Log và cho phép chuyển đổi qua lại giữa các phiên bản đã phát hành.',
        items: [
          'Thêm khung Update Log hiển thị tên phiên bản, ngày giờ phát hành và ghi chú từ nhà phát triển',
          'Thêm nút đổi phiên bản ngay trên thanh điều hướng, có thể chọn giữa các phiên bản đã lưu',
          'Thanh điều hướng dạng viên thuốc khi cuộn xuống có thêm 2 nút thao tác nhanh',
          'Khung Update Log làm mờ toàn bộ nền trang phía sau nhưng không làm mờ thanh điều hướng'
        ]
      },
      config: {
        features: {
          updateLog: true
        }
      }
    },
    {
      slug: 'pre-alpha1-1-2',
      major: 'Pre-Alpha',
      minor: '1.1.2',
      name: 'Pre-Alpha1.1.2',
      code: 'f86649',
      // Con của Pre-Alpha1.1 — kế thừa updateLog + versionSwitch, chỉ
      // bật thêm `uiV2` cho phần giao diện làm lại ở bản này. Các bản
      // cũ hơn không có cờ này nên giữ nguyên giao diện gốc của chúng.
      extends: 'pre-alpha1-1',
      changelog: {
        icon: 'wrench',
        releasedAt: '2026-09-05T21:00:00+07:00',
        devNote: 'Bản cập nhật tập trung vào giao diện: làm mới khung Update Log và cách hiển thị/đổi phiên bản cho gọn gàng, hiện đại hơn.',
        items: [
          'Thiết kế lại khung Update Log: bo góc 2px cho toàn khung, icon và phần thông tin chính của bản cập nhật',
          'Thêm khung cuộn riêng cho nội dung Update Log, tách khỏi phần tiêu đề cố định phía trên',
          'Nút đóng (X) phóng to hơn và chuyển hẳn vào góc trên bên phải khung Update Log',
          'Gộp khung hiển thị phiên bản vào chung với nút đổi phiên bản — vẫn giữ icon, chỉ hiện tên phiên bản hiện tại',
          'Khi thanh điều hướng thu gọn thành viên thuốc lúc cuộn trang, nút đổi phiên bản chỉ còn icon; di chuột vào sẽ hiện lại tên phiên bản kèm hiệu ứng chuyển động',
          'Làm mới khung chọn phiên bản (dropdown) theo phong cách hiện đại hơn, đồng bộ bo góc 2px và thêm hiệu ứng xuất hiện'
        ]
      },
      config: {
        features: {
          uiV2: true
        }
      }
    },
    {
      slug: 'pre-alpha1-3',
      major: 'Pre-Alpha',
      minor: '1.3',
      name: 'Pre-Alpha1.3',
      code: 'c37a19',
      // Con của Pre-Alpha1.1.2 — kế thừa uiV2 + updateLog + versionSwitch,
      // chỉ thêm `gameCardV2` cho khung hiển thị game chính làm lại.
      extends: 'pre-alpha1-1-2',
      changelog: {
        icon: 'sparkles',
        releasedAt: '2026-09-05T22:30:00+07:00',
        devNote: 'Làm lại toàn bộ khung hiển thị game chính (khi dán link hoặc tìm theo tên) — bố cục rõ ràng hơn, đầy đủ số liệu và cân đối ở mọi kích thước màn hình.',
        items: [
          'Icon game phóng to, nằm bên trái và cao hết khung thẻ',
          'Tên game và tên nhà phát triển chuyển sang bên phải icon',
          'Thêm chỉ số lượt truy cập (visits) bên cạnh % thích và số người đang chơi',
          'Nút Chơi ngay phóng to nằm ngang hàng với nút Copy và 1 nút để dành cho tính năng bản beta',
          'Toàn bộ khung co giãn theo màn hình nhưng vẫn giữ đúng tỉ lệ bố cục giữa icon, chữ và nút'
        ]
      },
      config: {
        features: {
          gameCardV2: true
        }
      }
    }
  ];

  // Which version a visitor with no "#/..." in the URL lands on.
  var DEFAULT_SLUG = 'pre-alpha1-3';

  // ── helpers ──
  var isPlainObject = function (v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  };

  // Objects merge key-by-key (recursively); arrays and primitives are
  // replaced outright by the override, never combined.
  var deepMerge = function (base, override) {
    if (!isPlainObject(base)) return override;
    if (!isPlainObject(override)) return override;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = base[k]; });
    Object.keys(override).forEach(function (k) {
      out[k] = (isPlainObject(base[k]) && isPlainObject(override[k]))
        ? deepMerge(base[k], override[k])
        : override[k];
    });
    return out;
  };

  var bySlug = {};
  VERSIONS.forEach(function (v) { bySlug[v.slug] = v; });

  // Resolves one version's full config by walking its `extends` chain
  // back to a version with no parent, then layering each version's own
  // `config` on top in order (oldest ancestor first, this version last).
  var resolvedCache = {};
  var resolveConfig = function (slug, seen) {
    if (resolvedCache[slug]) return resolvedCache[slug];
    seen = seen || {};
    var v = bySlug[slug];
    if (!v) return {};
    if (seen[slug]) return {}; // circular `extends` — bail to base config
    seen[slug] = true;
    var parentConfig = v.extends ? resolveConfig(v.extends, seen) : {};
    var result = deepMerge(parentConfig, v.config || {});
    resolvedCache[slug] = result;
    return result;
  };

  var getSlugFromHash = function () {
    var h = window.location.hash || '';
    var m = h.match(/^#\/?([a-z0-9-]+)/i);
    return m ? m[1].toLowerCase() : null;
  };

  var requestedSlug = getSlugFromHash();
  var activeSlug = (requestedSlug && bySlug[requestedSlug]) ? requestedSlug : DEFAULT_SLUG;
  var activeVersion = bySlug[activeSlug];

  // An unknown/mistyped slug falls back to the default above — quietly
  // correct the address bar to match instead of leaving a dead-looking
  // link sitting there.
  if (requestedSlug && requestedSlug !== activeSlug && window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/' + activeSlug);
  }

  window.CONFIG = deepMerge(window.CONFIG || {}, resolveConfig(activeSlug));
  // Whatever config.js said about `version` is a fallback only — the
  // resolved version registry entry is the source of truth once
  // versions.js has run.
  window.CONFIG.version = {
    name: activeVersion.name,
    code: activeVersion.code,
    slug: activeVersion.slug,
    major: activeVersion.major,
    minor: activeVersion.minor
  };

  window.ACTIVE_VERSION = activeVersion;
  window.VERSION_REGISTRY = VERSIONS;

  // A version can change almost anything about the page (title, icon,
  // layout, copy...) — rather than trying to re-render everything in
  // place, switching versions just points the hash at the new slug and
  // reloads, so the normal first-load config-resolution path handles it.
  window.switchVersion = function (slug) {
    if (!bySlug[slug] || slug === activeSlug) return;
    window.location.hash = '/' + slug;
    window.location.reload();
  };

  // Covers back/forward navigation or someone editing the hash by hand
  // while the page is already open — the DOM-writing in script.js only
  // runs once on load, so the new version needs a reload to actually
  // take effect.
  window.addEventListener('hashchange', function () {
    var newSlug = getSlugFromHash();
    if (newSlug && newSlug !== activeSlug) {
      window.location.reload();
    }
  });
})();
