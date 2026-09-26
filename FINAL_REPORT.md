# FINAL REPORT — Cosmic Farm Defenders

## 1. Đã hoàn thành

Game chơi được trọn vẹn, từ đầu đến cuối, trên trình duyệt mobile và desktop:

```
MAIN MENU → PLAY → SELECT SECTOR → WAVES → ENEMIES → ITEMS → COMBO → BOSS (WARNING, phases)
→ BOSS DEFEATED → VICTORY (stats + reward) → UPGRADE → NEXT LEVEL … → Sector 5 → "GALAXY SAVED!"
Chết:  GAME OVER → RETRY → chơi lại
```

- **5 sector hoàn chỉnh:** 26 wave và 5 boss original. Độ khó tăng theo HP, tốc độ, tần suất bắn, số đạn mỗi loạt, tần suất dive, loại enemy, độ phức tạp formation và cơ chế boss.
- **Boss:**
  - Boss 1: 1 phase.
  - Boss 2: 4 pattern, có charge.
  - Boss 3: 2 phase, triệu hồi quái.
  - Boss 4: 2 phase; bắn toả, di chuyển hình số 8, laser, triệu hồi.
  - Boss 5: 4 phase ở mốc 100/75/50/25%; nova, laser, spiral, wall, rain, triệu hồi.
  - Mọi đòn nguy hiểm đều có telegraph.
- **Thành phần game:**
  - 6 loại enemy.
  - 8 kiểu formation, 5 kiểu entry, 6 đường bay kiểu `pass`, cơ chế dive.
  - 9 power-up, coin + magnet, combo x2 → x5.
  - Score kèm bonus (crit, perfect wave, no damage, clear sector).
  - 6 upgrade vĩnh viễn, NOVA skill, pause menu, settings, how to play, debug mode.
- **Game feel:** hit spark, số damage, CRIT, nháy trắng, nổ nhiều lớp, screen shake nhẹ (có thể tắt), flash, slow-motion khi boss chết, rung trên Android, SFX và nhạc procedural (nhạc riêng cho menu, battle, boss).
- **Save:** lưu bằng localStorage, có schema version, migration, và fallback khi storage lỗi hoặc dữ liệu hỏng.

## 2. Tech stack

HTML5 Canvas 2D, JavaScript thuần (ES modules), DOM/CSS cho UI, WebAudio, localStorage. **Không có runtime dependency.**

Dev tools: esbuild (build file đơn), Playwright (E2E), `node --test` (unit test).

## 3. Các hệ thống đã implement

| Hệ thống | File |
|---|---|
| Game loop, state, điều phối | `src/game/Game.js`, `GameLoop.js`, `GameState.js` |
| Viewport, safe area, scale | `src/core/Viewport.js`, `styles.css` |
| Touch / keyboard input | `src/core/Input.js` |
| Object pooling | `src/core/Pool.js` |
| Player, stats | `src/player/*` |
| Weapon, bullets | `src/weapons/*` |
| Enemy, AI, paths | `src/enemy/*` |
| Wave, formation | `src/levels/*` |
| Boss, patterns | `src/boss/*` |
| Items, coins | `src/items/ItemManager.js` |
| Collision, score, combo, save, debug | `src/systems/*` |
| Particles, effects, text, shake, background | `src/effects/*` |
| Audio | `src/audio/AudioManager.js` |
| UI screens, HUD | `src/ui/*` |
| Procedural art | `src/art/*` |
| Game data | `src/data/*` |

## 4. Cách chạy

- **Nhanh nhất:** mở `dist/index.html` bằng trình duyệt. File chạy được qua `file://` và không cần mạng.
- **Chạy từ source:** `npm start`, rồi mở `http://localhost:8080`. Server in thêm địa chỉ LAN để mở trên điện thoại.
- **Build lại bản 1 file:** `npm install && npm run build`.

## 5. Test và kết quả

- `npm test`: **24/24 unit test pass.** Bao gồm save round-trip, migration v1→v2, save bị hỏng, storage bị chặn, combo tiers, score, stats, giá upgrade, và validate toàn bộ data (tham chiếu enemy/boss/formation/path/attack, độ khó tăng dần, telegraph, wall có khe hở).
- `npm run test:e2e`: **33/33 check pass** trong Chromium (mobile emulation, touch event thật qua CDP):
  - Mục 1–28 của checklist QA.
  - Chạy trọn campaign 5 sector liên tiếp.
  - Chơi real-time 6 giây với touch.
  - Responsive ở 320×568, 360×740, 375×667, 390×844, 414×896, 430×932, 768×1024 và 1280×720: stage nằm trong viewport, không tràn ngang, canvas không méo, touch target ≥ 44px, card pause/victory không bị cắt.
  - Không có page error hay console error.
- **Hiệu năng:** headless đạt 60 FPS, update + render khoảng 0.4 ms/frame.
- **Cân bằng:** kiểm bằng bot mô phỏng (có/không né đạn, phản xạ "kiểu người"):
  - Mọi sector đều qua được. Sector 1 qua được khi chưa upgrade.
  - Người chơi đứng yên sẽ chết ở sector 5.
  - Thời lượng mỗi sector khoảng 60–160 giây.

**Lỗi đã tìm và sửa trong quá trình QA:**

- Đường nối (seam) của background nebula khi cuộn.
- Tàu ở menu bị nút che.
- Tốc độ bắn quá thưa.
- Boss đè lên HP bar.
- Số damage của boss chồng lên nhau khó đọc.
- Toast che danh sách upgrade.
- Đạn bị đóng băng phía sau màn Victory.
- Boss còn gây sát thương va chạm khi đang chết.
- Có thể chuyển từ victory sang game over nếu chết cùng lúc boss chết.
- Đường bay `loop` kết thúc ngay trong màn hình.
- Đã bỏ các hàm rỗng và code thừa.

## 6. Cách test trên mobile

1. `npm start`, rồi mở địa chỉ LAN trên điện thoại (cùng Wi-Fi). Hoặc gửi `dist/index.html` sang điện thoại và mở. Hoặc host lên GitHub Pages.
2. Cầm dọc. Kéo ngón tay ở bất kỳ đâu thì tàu đi theo (điều khiển tương đối). Trang không cuộn, không zoom.
3. Chọn "Add to Home Screen" để chơi fullscreen. Game đã tính safe area cho notch và Dynamic Island.
4. Bật Settings → Debug mode để xem FPS và hitbox, và dùng các nút cheat khi cần test nhanh.

## 7. File quan trọng

- `index.html`, `styles.css`, `src/main.js`, `src/game/Game.js`
- `src/data/*.js`: toàn bộ nội dung và cân bằng game
- `dist/index.html`: bản phát hành 1 file
- `tests/e2e/run.mjs`, `tests/unit/*.test.mjs`
- `README.md`: hướng dẫn thêm enemy, level, boss, item và chỉnh balance

## 8. Limitation còn lại

- Chưa được thử trên **thiết bị thật**. QA đã chạy bằng Chromium mô phỏng mobile với touch event thật. Safari/iOS chỉ được đảm bảo qua việc dùng API chuẩn (Pointer Events, WebAudio có unlock bằng gesture, `env(safe-area-inset-*)`), nên cần thử một lượt trên iPhone thật.
- Art và âm thanh là placeholder procedural, dù đã được làm đồng bộ phong cách. Có thể thay bằng asset thật (xem README).
- iOS Safari không hỗ trợ `navigator.vibrate`, nên tính năng rung chỉ hoạt động trên Android.
- iOS không cho khoá xoay màn hình từ trang web thường. Khi xoay ngang, game tự letterbox thành khung dọc và vẫn chơi được.
- Chạy source trực tiếp cần static server (vì dùng ES modules). Bản `dist/index.html` không cần server.

## 9. Đề xuất nâng cấp

- Thay art bằng sprite sheet hoặc animation vẽ tay, và thêm nhạc thu âm thật.
- Chế độ Endless / Boss Rush, bảng xếp hạng local, achievement và daily challenge.
- Thêm vũ khí (laser, homing, spread) có thể đổi, và thêm tàu/skin mở khoá bằng coin.
- Bổ sung upgrade cho Crit Damage và NOVA cooldown; thêm hệ thống sao (1–3 sao) cho mỗi sector.
- Hỗ trợ PWA offline (service worker) để cài như app.
- Tối ưu bằng OffscreenCanvas / WebGL khi cần nhiều particle hơn.
- Hỗ trợ đa ngôn ngữ (tiếng Việt / English) cho UI.
