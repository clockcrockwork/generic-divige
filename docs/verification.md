# 検証とレビュー

## 対象と操作仕様

掴む時点では1枚。保持中に直近左右の同色カードの中央60%へ入ると、その1枚だけ追加します。異色・非隣接・範囲外では追加せず、束は離すまで保持します。切替チェックや全列の自動選択はありません。

人レビュー準備の基準headは `bd7f439702e7a5b78788a6dbbf82724731d2734b` です。今回、製品コードと画像は変更せず、pointerupの回帰テストと説明を補強しました。最新headとCI結果は[PR #1](https://github.com/clockcrockwork/generic-divige/pull/1)本文に記載します。

## 観点と結果

| 観点 | 確認内容・結果 |
| --- | --- |
| 入力・束化 | 1枚開始、段階追加、左右端、異色・非隣接の除外を実装・既存テストと照合 |
| 捕捉・キャンセル | pointercancel、capture喪失、第二指、reset、シナリオ切替を照合。pointerup側ガード単独の回帰保護を追加 |
| 時間・状態 | 有効配置で開始、期限で確定、速度変更時の端数保持、演出速度の独立性、一括容量拒否、即時補充を照合 |
| 操作性・アクセシビリティ | 文字・形状・フォーカス表示・reduced-motionを確認。キーボード単独プレイ未対応を明記 |
| テスト・説明 | 同headの既存CIを再利用し、今回の差分は限定検証。過去の件数と現在の証拠を区別 |

新しい独立レビュアーによる全src・単体/E2E・README・CI構成の読み取りレビューでは、Critical/Importantの確定指摘なし。追加テストと制約説明も再レビュー済みです。これは人の承認や操作感評価を代替しません。

## 検証証拠

- 基準head `bd7f439` の[push CI](https://github.com/clockcrockwork/generic-divige/actions/runs/40196194288)・[PR CI](https://github.com/clockcrockwork/generic-divige/actions/runs/40196198415)は全工程成功。単体32件、E2E32件、lint・型検査・buildを含みます。
- 2026-10-25の限定検証環境: Windows、Node.js 24.22.1、npm 11.19.1、Playwright 1.63.0、付属Chromium。desktopはマウス、touchはCDPのtouchStart/Move/Endを使用。
- 追加ケース `capture released during pointerup cannot commit a gathered bundle` は2/2成功。最後のmove後、pointerupのcapture phaseで捕捉を解放し、同じイベントの通常ハンドラへ渡します。手札ID・場の不変、ghost消去、次の正常操作を確認します。
- 検出力確認としてpointerup側ガードだけを一時除去すると、両ケースが誤消費を検出して失敗しました。元の製品コードはバイト一致で復元しています。この意図的な失敗は公開コードの不具合ではありません。
- 同一成果のローカルフルsuiteは繰り返していません。最新headの通常CIでは追加ケースを含むE2E34件と既存チェックを実行します。

## 未検証・対象外

キーボードのみ／スクリーンリーダーのみのゲーム操作は未対応です。Tabで手札へフォーカスできてもEnter／Spaceでは配置できません。操作体系の追加は、マウス／タッチ操作感を試す今回のPoCから範囲を広げるため保留しています。

Safari／Firefox、実機の指による操作、支援技術との組合せ、入力から画面発光までの遅延は未検証です。タッチイベントの自動テストや時計を停止したシナリオ試験は、5カウント内の遊びやすさ・速い指運びの取りこぼし・楽しさを証明しません。

## 人に判断してほしい点・読む順番

1. [README](../README.md)でPoCの範囲を確認。
2. `src/ui/input.ts` → `e2e/gather.spec.ts`で1枚／束化／捕捉の境界を読む。
3. `src/domain/game.ts`・`countdown.ts`と対応する単体テストで時間・確定を読む。
4. 実際に遊び、中央60%の巻き込み範囲、5カウント、速度調整の感触を判断。キーボード対応を次段階の必須条件にするかも判断。

以下は基準headと同じ製品UIのシナリオ結果です。今回、新しい画像は公開していません。

| シナリオ | Desktop | Touch |
| --- | --- | --- |
| A | [画像](scenario-A-desktop.jpg) | [画像](scenario-A-touch.jpg) |
| B | [画像](scenario-B-desktop.jpg) | [画像](scenario-B-touch.jpg) |
| C | [画像](scenario-C-desktop.jpg) | [画像](scenario-C-touch.jpg) |

## 過去のcapture修正

初期head `730d030` は[push CI失敗](https://github.com/clockcrockwork/generic-divige/actions/runs/37143509519)、[PR CI成功](https://github.com/clockcrockwork/generic-divige/actions/runs/37143539916)でした。pending captureの解放通知だけに依存するとドラッグが残る問題を再現し、move/upで捕捉所有を確認する修正を加えました。元のCIイベント列は残っていないため、細かなタイミング差は推定です。修正head `1e1f716` では[push](https://github.com/clockcrockwork/generic-divige/actions/runs/37145378289)・[PR](https://github.com/clockcrockwork/generic-divige/actions/runs/37145381055)とも成功しています。
