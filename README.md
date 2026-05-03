# にゃん・ノート lab

`yas0222/nyan-note` の現行アプリを開発用に複製したリポジトリです。

- GitHub Pages: `https://yas0222.github.io/nyan-note-lab/`
- Firebase: 開発用 `projectId: nyan-note-dev` を利用
- localStorage key: `nyan-note-lab-*` 系で本番と分離

## ローカル実行

```bash
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開いてください。

## 認証・データ保護・アプリ公開ロードマップ

本ロードマップは、Web/PWA版を安全に安定運用しながら、将来的なアプリストア公開へ段階的に進むための方針です。特に、今回判明した「Firebase Auth の匿名UID」と「Firestore上の ownerUid」の不一致による保存失敗（permission-denied）を重要な改善対象として扱います。

### Phase 1：Web/PWA版の安定化

- 本番環境と開発環境を分離する
- 開発環境 `nyan-note-lab` で検証してから、本番 `nyan-note` に反映する
- 保存成功時のユーザー向け文言から Firebase などの内部サービス名を出さない
- 本番では保存状況などのデバッグ情報を非表示にする
- ごはん量、飲水量、おやつ、うんち回数、おしっこ回数の共有ON/OFFを安定化する
- 共有ONの記録だけを「みんな」画面の公開プロフィールカード内に表示する
- 注意書き、プライバシーポリシー、利用規約を現在の共有仕様に合わせて更新する

### Phase 2：認証・データ保護の改善

- 匿名ログインUIDとFirestore上の ownerUid が不一致になる問題を検知できるようにする
- 保存失敗時に、内部的には `errorCode / errorMessage / authUid / activeOwnerUid` を確認できるようにする
- 一般ユーザーには専門用語を出さず、分かりやすい保存失敗メッセージを表示する
- ownerUid不一致が起きた場合の復旧手順を整理する
- 既存データの ownerUid を安全に扱う方針を決める

### Phase 3：ログイン方式の改善

- Googleログインの導入を検討する
- メールログインまたはメールリンクログインも候補にする
- 匿名ユーザーからログインユーザーへのデータ引き継ぎを実装する
- 端末変更、ブラウザデータ削除、PWA再インストール後も猫データを復元できるようにする
- 将来的なアカウント削除、データ削除導線を整備する

### Phase 4：限定公開テスト

- Web/PWA版を少人数に共有して使ってもらう
- 猫登録、今日の記録、共有ON/OFF、みんな画面の分かりやすさを確認する
- 何が公開されるか、何が公開されないかが伝わるか確認する
- スマホでの入力しやすさ、表示崩れ、保存失敗の有無を確認する

### Phase 5：Androidアプリ化

- Web/PWA版が安定したら、Capacitorなどを使ったAndroidアプリ化を検討する
- Android Studioで実機テストする
- Google Play Console登録、内部テスト、クローズドテスト、公開の順に進める

### Phase 6：iPhoneアプリ化

- Apple Developer Program、Xcode、TestFlightを使ったiOS版公開を検討する
- iPhone版はAndroid版より後でもよい
- App Store審査に向けて、プライバシー説明、データ削除、問い合わせ導線を整える

### Phase 7：将来的な機能拡張

- 週次レポート
- 体調変化の気づき通知
- 地域別、年齢別、猫種別の比較
- 共有範囲の細分化
- プロフィール画像公開は、Firebase Storageの料金・容量制限・安全対策を確認してから検討する


## Google連携で `auth/credential-already-in-use` が出る場合の本番対応方針（将来対応）
- 既存Googleアカウントに切り替える明示的な導線を用意する（ユーザー同意なしで自動切替しない）。
- 匿名ユーザーのローカルデータをGoogleユーザーへ引き継ぐ明示的な導線を用意する。
- ownerUid不一致を安全に検知して、移行の前に確認できる導線を用意する。
- 自動でデータ移行しない安全設計を維持する。
