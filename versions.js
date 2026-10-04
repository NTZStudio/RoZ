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
    },
    {
      slug: 'pre-alpha2',
      major: 'Pre-Alpha',
      minor: '2',
      name: 'Pre-Alpha2',
      code: '8d3f7b',
      // Con của Pre-Alpha1.3 — kế thừa toàn bộ (uiV2, updateLog,
      // versionSwitch, gameCardV2). Bản này sẽ lớn và được cập nhật
      // dần qua nhiều đợt — mỗi đợt chỉ thêm dòng mới vào
      // `changelog.items` bên dưới (giữ nguyên slug/code này), KHÔNG
      // tạo version mới cho từng đợt cập nhật nhỏ.
      extends: 'pre-alpha1-3',
      changelog: {
        icon: 'rocket',
        releasedAt: '2026-09-10T10:00:00+07:00',
        devNote: 'Bản lớn tiếp theo của RoZ API — sẽ được cập nhật dần qua nhiều đợt, mỗi đợt bổ sung thêm vào danh sách bên dưới.',
        items: [
          'Viết lại phần mô tả web: RoZ API là gì, dùng để làm gì (lấy dữ liệu + tạo link tham gia thẳng vào game Roblox từ 1 đường link, hỗ trợ cả Server VIP riêng tư)',
          'Đổi nội dung khung thông báo: tiêu đề "EARLY ACCESS OPEN", thông báo mở tính năng trải nghiệm thử cho RoZ, mở khóa xem lại các phiên bản cũ và mã nguồn mở 100%',
          'Thêm thanh chuyển trang (page dock) ở cuối màn hình',
          'Thanh chuyển trang giờ có thể kéo sang trái/phải để đổi vị trí — kéo sát mép trái hoặc phải sẽ khoá cố định vào bên đó, thả ở giữa thì quay về chính giữa; vị trí đã chọn được ghi nhớ cho lần sau',
          'Thêm 2 khối gợi ý ngay dưới thanh search: "Đang được chơi nhiều nhất" và "Lựa chọn cho bạn hôm nay" — mỗi khối 1 hàng lướt ngang, chỉ tải 1 lần/ngày cho mỗi người (không tải lại khi F5 trong ngày), tự ẩn khi đang gõ tìm kiếm'
        ]
      },
      config: {
        features: {
          pageDock: true,
          discoveryRows: true
        },
        ntzDesc: {
          lines: [
            'RoZ API lấy dữ liệu trực tiếp từ Roblox để xem trước và tạo link tham gia (join) thẳng vào game chỉ từ 1 đường link',
            'Hỗ trợ cả link Server VIP (riêng tư) — tự nhận diện và tạo link vào đúng server',
            'Không cần cài đặt gì thêm, dán link là chạy'
          ]
        },
        ntzNotify: {
          title: 'EARLY ACCESS OPEN',
          label: 'Notification',
          lines: [
            'Mở tính năng trải nghiệm thử cho RoZ',
            'Mở khóa xem lại các phiên bản trước đó và mã nguồn mở 100%'
          ]
        }
      }
    },
    {
      slug: 'pre-alpha2-5',
      major: 'Pre-Alpha',
      minor: '2.5',
      name: 'Pre-Alpha2.5',
      code: 'c14f9a',
      // Con của Pre-Alpha2 — kế thừa toàn bộ (pageDock, discoveryRows,
      // gameCardV2, ntzDesc/ntzNotify...). Chủ đề chính của bản này là
      // redesign lại một số phần của giao diện — mỗi thay đổi cụ thể sẽ
      // được thêm dần vào `changelog.items` và `config` bên dưới khi
      // thực hiện (giữ nguyên slug/code này, không tạo version mới cho
      // từng đợt nhỏ trong chủ đề redesign này).
      extends: 'pre-alpha2',
      changelog: {
        icon: 'sparkles',
        releasedAt: '2026-09-12T00:00:00+07:00',
        devNote: 'Đợt redesign nhỏ cho Pre-Alpha2.5 — cập nhật dần, mỗi mục xong sẽ được thêm vào danh sách này.',
        items: [
          'Sửa tên nhà sáng tạo bị cắt cụt — tên dài giờ tự xuống dòng thay vì bị cắt "..."',
          'Sửa dấu tích verified bị ẩn sai dù nhà sáng tạo có tích thật, thêm icon verified tuỳ chỉnh kèm tooltip',
          'Tối ưu tốc độ lấy thông tin game — các lượt gọi chạy song song thay vì nối đuôi tuần tự',
          'Làm lại hiệu ứng loading: chữ và ảnh đang tải hiện dạng khung rỗng có ánh sáng lướt qua (shimmer) thay vì chữ "Đang tải...", các khung xuất hiện lần lượt như đang dựng bố cục rồi chuyển mượt về nội dung thật khi tải xong',
          'Bấm chọn 1 game bất kỳ (tìm kiếm, kết quả khác, hàng gợi ý cuộn ngang) sẽ tự cuộn trang lên đúng vị trí khung game hiện ra, không cần tự lướt lên nữa',
          'Tìm theo tên: nhấn Enter, vừa dán, hoặc rời khỏi ô nhập khi có chữ sẽ tải ngay (bỏ qua độ trễ debounce 450ms), thay vì phải đợi im lặng một lúc mới thấy có phản hồi',
          'Thiết kế tối giản hơn cho các ô game trong "Kết quả khác" và 2 hàng gợi ý — chỉ còn khung vuông + ảnh, bỏ tên game và nút Play chồng lên ảnh',
          'Hover 1 ô game tối giản sẽ hiện khung kính mờ phóng to, xem ảnh to hơn + bấm Play ngay từ đó'
        ]
      },
      config: {
        features: {
          // Dấu verified kiểu icon tùy chỉnh (thay cho ngôi sao khuyết
          // SVG cũ) + tooltip kính mờ khi hover — chỉ bật ở bản này,
          // các bản trước vẫn giữ nguyên icon ngôi sao khuyết cũ.
          verifiedIconV2: true,
          // Khung rỗng + hiệu ứng shimmer khi card đang tải (thay cho chữ
          // "Đang tải..." + hiệu ứng pulse cũ). Chỉ bật từ bản này trở
          // lên — các bản trước vẫn giữ nguyên hành vi cũ.
          skeletonLoading: true,
          // Bo góc 3px cho ảnh game/nút Play-Copy-nút phụ + nút Play đổi
          // sang gradient xanh có hover glow/shine — chỉ bật từ bản này
          // trở lên, các bản trước (kể cả Pre-Alpha1.3/Pre-Alpha2 tuy đã
          // có `.is-v2`) vẫn giữ bo góc + nút màu accent phẳng như cũ.
          polishedUI: true,
          // Bấm chọn 1 game (tìm kiếm, kết quả khác, hàng gợi ý cuộn
          // ngang...) sẽ tự cuộn trang lên đúng vị trí khung game chính
          // xuất hiện — đỡ phải tự lướt lên tay, nhất là khi bấm từ
          // hàng gợi ý nằm dưới xa. Chỉ bật từ bản này trở lên.
          autoScrollToGame: true,
          // Tìm theo tên vốn phải đợi 450ms debounce (im lặng, không có
          // gì hiện ra) trước khi mới bắt đầu tải — cảm giác bị khựng.
          // Bật cờ này thì nhấn Enter, vừa dán, hoặc rời khỏi ô nhập
          // (blur) trong khi có chữ sẽ bỏ qua debounce, hiện skeleton
          // loading NGAY và tải luôn. Gõ liên tục vẫn giữ debounce như
          // cũ (tránh gọi API dồn dập mỗi phím gõ) — chỉ mấy tín hiệu
          // "xong rồi" ở trên mới được tăng tốc. Link/Place ID hợp lệ
          // vốn đã tải ngay lập tức từ trước, không liên quan cờ này.
          instantSearchTrigger: true,
          // Ghi chú "chọn từ gợi ý / kết quả gần đúng" dời từ cuối cùng
          // của khối kết quả lên ngay dưới hàng nút Play/Copy, và đổi
          // thành 1 thanh note trải rộng hết chiều ngang thay vì chữ
          // chú thích nhỏ như cũ. Chỉ bật từ bản này trở lên.
          genNoteV2: true,
          // Thiết kế tối giản cho .related-card/.discovery-card (khung
          // "Kết quả khác" + 2 hàng gợi ý cuộn ngang): chỉ còn khung
          // vuông bo 2px + ảnh (98% khung, canh giữa) — bỏ hẳn tên game
          // và nút Play chồng lên ảnh. Chỉ bật từ bản này trở lên, các
          // bản trước vẫn giữ nguyên card có tên + nút Play như cũ.
          minimalDiscoveryCards: true,
          // Khung Settings ẩn (Shift+S để mở/đóng) — hiện có đúng 1 tuỳ
          // chọn: ẩn toàn bộ thanh cuộn trong trang (mặc định BẬT sẵn).
          // Đánh dấu "BETA" vì mới, chưa chắc giữ nguyên hình thức này.
          // Chỉ bật từ bản này trở lên — các bản trước không có phím
          // tắt này và luôn hiện thanh cuộn mặc định của trình duyệt
          // (xem thêm ghi chú tại rule ẩn scrollbar trong style.css).
          betaSettingsPanel: true,
          // Hover 1 ô game trong "Kết quả khác"/2 hàng gợi ý (.is-compact)
          // sẽ hiện 1 khung kính mờ nổi riêng, phóng to đúng từ vị trí ô
          // đó lên trên và xuống dưới: ảnh to hơn ở trên, tên + nút Play
          // to ở dưới. Ô gốc chỉ ẩn đi (chừa lại đúng khoảng trống của
          // nó) trong lúc hover, không đổi bố cục các ô xung quanh. Chỉ
          // bật từ bản này trở lên — các bản trước hover vẫn y hệt cũ
          // (nhấc nhẹ + đổi màu nền, không có khung nổi này).
          cardHoverPreview: true
        },
        // iconUrl: đường dẫn tới file icon verified tùy chỉnh — đặt file
        // thật vào assets/icons/ với đúng tên bên dưới.
        verifiedBadge: {
          iconUrl: 'assets/icons/verified.png',
          tooltip: 'Nhà phát triển đã được Roblox xác minh'
        }
      }
    }
  ];

  // Which version a visitor with no "#/..." in the URL lands on.
  var DEFAULT_SLUG = 'pre-alpha2-5';

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
