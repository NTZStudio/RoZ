window.CONFIG = {
  // Để trống là được — thẻ preview game giờ tự lấy dữ liệu thật qua
  // roproxy.com (không cần deploy gì cả), có fallback qua proxy CORS công
  // khai nếu roproxy sập. Chỉ điền vào đây khi bạn tự deploy proxy-worker.js
  // riêng để ổn định hơn cho production.
  "gameApiProxyBase": "https://proud-field-725e.javaandpedoiminecraftking.workers.dev",
  "version": {
    "name": "Pre-Alpha1",
    "code": "52eca7"
  },
  "background": {
    "images": [
      "assets/background.png",
      "assets/background2.png",
      "assets/background3.png",
      "assets/background4.png",
      "assets/background5.png",
      "assets/background6.png"
    ],
    "intervalMs": 10000,
    "fadeMs": 1200,
    "overlayColor": "6, 8, 13",
    "overlayOpacity": 0.35
  },
  "brand": {
    "logoImage": "assets/logo.svg",
    "logoText": "R",
    "name": "RoZ API"
  },
  "ntzDesc": {
    "lines": [
      "NTZ API là hệ thống dữ liệu trung tâm cho toàn bộ hệ sinh thái game do NTZ phát triển",
      "Đồng bộ real-time, quản lý inventory và tiến trình theo từng chapter",
      "Sẵn sàng mở rộng cho mọi dự án mới"
    ]
  },
  "ntzNotify": {
    "title": "Early Access Update",
    "label": "Notification",
    "lines": [
      "Cập nhật mới nhất từ NTZ API sẽ được đăng tại đây",
      "Theo dõi để không bỏ lỡ các bản phát hành và tính năng mới"
    ]
  },
  "topbar": {
    "ctaText": "Coming soon",
    "ctaLink": "#"
  },
  "input": {
    "placeholder": "Dán link game Roblox, vd: https://www.roblox.com/games/90500188348656/Couser-Game"
  },
  "icons": {
    "favicon": "assets/icons/favicon.svg"
  }
};
