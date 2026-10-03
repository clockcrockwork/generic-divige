# 検証記録

Windows / Node.js 24.12.0 / Chromium。Vite・Vitest・Playwrightのバージョンはlockfileで固定。

- `npm ci`: 成功、監査時の既知脆弱性0。
- `npm run lint`: 成功。
- `npm run typecheck`: 成功。
- `npm run test:unit`: 33/33成功。
- `npm run test:e2e -- --trace off`: デスクトップ10件＋タッチ画面10件、20/20成功。
- `npm run build`: 成功。
- 独立コードレビュー: Critical/Importantの製品不具合なし。場外配置の不変性、capture喪失、キャンセル開始確認の検証を補強済み。

TDD: 最初の27件（モデル・時計）をRED→GREEN、ラウンド調整3件をRED→GREEN、入力判定・計測3件をRED→GREEN。ブラウザの初期テストは手札未実装で失敗してから実装。以後の境界条件は実入力で検証。

A/B/Cすべてで目標達成、終了、再試行を確認。実時間の開始・終了スモークテストを残し、複数手順と時間境界にはPlaywright時計を固定して明示的に時間を進める。遅いホストの操作所要時間で制限時間が尽きる初期テスト、および現在時刻取得とpauseAtの間で時刻が逆行するテスト準備を修正済み。

カウント間隔の途中変更は旧速度で経過を精算し、端数を維持。演出速度変更は同じコンボとカウント進行を保つ。容量超過、第二指、右ボタン、場外、pointercancel、lostpointercapture、ドラッグ中の期限・リセット・シナリオ切替を確認。

画像は自動操作後の実画面。人間による楽しさ・気持ちよさの評価は未実施。

| シナリオ | Desktop | Touch |
|---|---|---|
| A | [画像](scenario-A-desktop.jpg) | [画像](scenario-A-touch.jpg) |
| B | [画像](scenario-B-desktop.jpg) | [画像](scenario-B-touch.jpg) |
| C | [画像](scenario-C-desktop.jpg) | [画像](scenario-C-touch.jpg) |
