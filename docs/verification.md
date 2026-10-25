# 現在の操作仕様と検証

2026-10-04: 手札を掴んだ時点では必ず1枚。隣接同色も直接場へ運べば1枚だけ配置します。保持中に束の直近左右の同色カード中央60%へ入ると、その1枚だけ追加します。異色・非隣接・中央範囲外では追加しません。束は離すまで保持し、全runの自動選択や切替チェックは廃止しました。

回帰テストを先に実行し、旧コードで6/6失敗（掴んだ直後の2枚選択と、移動による追加の欠如）を確認して修正。Windows Chromiumでマウス、およびCDPのネイティブtouchStart/Move/Endによるタッチを検証します。1枚配置、1→2→3→4枚の段階追加、反対端追加、同色の飛び越し禁止、異色越し禁止、上端・左右端のかすめ防止、束を作った後のキャンセル・capture喪失・リセットをカバーします。

古い全run選択の単体テスト1件を撤去し、単体は32件。既存の容量超過の一括拒否、準備中並べ替え、即時補充、複数指、期限、capture解放の回帰テストを維持しました。以下は初期版および前回修正の履歴であり、現在の操作仕様ではありません。画像は現在のUIで更新します。

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

## 同一headのpush / PR実行差の調査

初版 `730d0305558c26a92388330f7647adb6593a5de9` は、push run [37143509519](https://github.com/clockcrockwork/generic-divige/actions/runs/37143509519) が19/20成功・1件失敗（build skipped）、PR run [37143539916](https://github.com/clockcrockwork/generic-divige/actions/runs/37143539916) は20/20成功でした。初版のすべてのイベントが成功したわけではありません。

失敗したのはtouchプロジェクトのcapture喪失テスト。解除後にもAAが配置され、手札ID A-0/A-1がA-5/A-6へ置換されていました。両runはUbuntu image 20260927.320.1、Node 24.21.0、npm 11.19.0、同じlockfile・検査手順です。pushはhead本体、PRはGitHub生成のmerge refをcheckoutしています。baseがheadの祖先なので製品ツリーは同一です。

原因はPointer Eventsのpending captureの境界です。setPointerCapture直後、captureが確定する前にreleasePointerCaptureされると、lostpointercapture通知を前提にした処理だけではドラッグが残ることがあります。pointerdownと同じイベント内で解除するテストを追加し、旧実装でdesktop/touch双方が同じ手札変化により失敗することを確認しました。通知の到着タイミングにより初版の既存テストは通る場合もあるため、PR成功だけではこの不具合を否定できません。元runのイベント列そのものはログに残っておらず、差の細部は推定です。

修正はpointermoveとpointerupでhasPointerCaptureを確認し、解除済みなら配置せずキャンセルすることです。待機時間やリトライ追加では失敗を隠していません。仕様参照: [W3C pending pointer capture](https://www.w3.org/TR/pointerevents3/#process-pending-pointer-capture)。

修正後のローカル検証: 問題の既存テストと追加回帰テストをdesktop/touchで各5回、計20回成功。その後の全E2Eは22/22成功、単体33/33、lint・型検査・buildも成功。最初の反復実行には、開発サーバーが編集中のsrc/ui/input.tsを再読み込みしたためのnavigationエラーが1件ありました（ドラッグ操作前のevaluateAll）。Viteのpage reloadログで確認し、編集を止めた状態で上記の反復と全件検証を行いました。これは元のCIで観測された手札消費とは別の失敗です。

修正差分の独立レビューでもCritical/Importantなし。up側ガード単独の専用テストは軽微な追加改善として未実施（今回の回帰テストはmove側でキャンセルされる）。元の失敗runを再実行して履歴を上書きせず、新headのpush/PR両イベントを確認します。

今回の最終結果: lint・型検査・単体32/32・E2E32/32・build成功。E2Eはdesktop/touch各16件（巻き込み専用5件ずつを含む）。左右境界と束のキャンセル追加後の独立レビューでもCritical/Importantなし、指摘された検証不足は解消。6枚の画像を現在のUIへ更新し目視確認済み。プレビュー http://127.0.0.1:4187/ のHTTP応答と実ブラウザ操作も確認しました。
