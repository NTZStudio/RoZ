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
  },
  "pageDock": {
    // Đường dẫn ảnh icon MẶC ĐỊNH dùng cho MỌI nút của page-dock (áp
    // dụng cho nút nào không có icon riêng trong "icons" bên dưới). Để
    // trống (null) là dùng icon SVG mặc định có sẵn trong index.html.
    "icon": null,
    // true: tự động lọc ảnh thành màu trắng tuyền (phù hợp icon 1 màu,
    // nền trong suốt) để khớp tông trắng của các icon khác trên site.
    // Đặt false nếu ảnh đã có màu sẵn và muốn giữ nguyên màu gốc. Đây là
    // giá trị mặc định, có thể ghi đè riêng cho từng nút bên dưới.
    "forceWhite": true,
    // Icon RIÊNG cho từng nút — key phải khớp đúng data-page của nút đó
    // trong index.html ("games" hoặc "couser"). Điền "src" là đường dẫn
    // file ảnh (png/svg đều được, ví dụ "assets/icons/couser.png").
    "icons": {
      "games": {
        "src": "assets/icons/games.png",
        // Icon tay cầm hiện đang màu đen trên nền trong suốt — lọc
        // thành trắng tuyền để khớp tông trắng của icon Games gốc.
        "forceWhite": true
      },
      "couser": {
        "src": "assets/icons/couser.png",
        // Ảnh này đã có sẵn màu đỏ/đen riêng — để false để giữ nguyên màu
        // gốc, không lọc thành trắng tuyền.
        "forceWhite": false
      }
    }
  }
};
