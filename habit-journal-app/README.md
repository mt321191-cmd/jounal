# 習慣化ジャーナル

30日サイクルで習慣化をサポートするジャーナルアプリ（React + Vite）。

## ローカルで確認する

```bash
npm install
npm run dev
```

表示されたURL（例: http://localhost:5173）をブラウザで開いて動作確認できます。

## Vercelにデプロイする

### 方法A: GitHub経由（おすすめ）

1. このフォルダの中身をGitHubの新しいリポジトリにpushする
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin <あなたのリポジトリURL>
   git push -u origin main
   ```
2. https://vercel.com にログインし、「Add New... → Project」から今pushしたリポジトリを選択
3. Framework Preset は自動で「Vite」と検出されるはずなので、そのまま「Deploy」を押す
4. 数十秒でURL（例: `habit-journal.vercel.app`）が発行される

### 方法B: Vercel CLIで直接デプロイ

```bash
npm install -g vercel
vercel
```

質問にいくつか答えるだけでデプロイされます。

## スマホのホーム画面に追加する

1. デプロイされたURLをスマホのブラウザ（iOSはSafari、AndroidはChrome）で開く
2. 共有メニュー（iOS）またはメニュー（Android）から「ホーム画面に追加」を選ぶ
3. アイコンをタップすると、ブラウザのUIなしで全画面のアプリのように開く

## データの保存について

このデプロイ版は `localStorage`（そのブラウザ専用の保存領域）にデータを保存します。
同じ端末・同じブラウザで開けば記録は残りますが、機種変更やブラウザを変えると引き継がれない点に注意してください。

## 含まれるファイル

- `src/App.jsx` — アプリ本体（目標設定・行動ログ・進捗・気づきログ）
- `public/manifest.json` — ホーム画面追加用の設定
- `public/icon-192.png` / `icon-512.png` — アプリアイコン
