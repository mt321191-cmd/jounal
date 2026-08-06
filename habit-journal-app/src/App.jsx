import { useState, useEffect, useCallback } from "react";

// ---- 習慣化の3段階（30日サイクル） ----
const PHASES = [
  {
    key: "rebellion",
    name: "反抗期",
    range: [1, 5],
    color: "#B5511F",
    tagline: "今までのやり方に戻りたくなる時期",
    detail:
      "「なんで今更コレやるの」と心が反発しやすいタイミング。ここで多くの人がやめてしまう。ハードルを極限まで下げて、内容よりも「続けたという事実」だけを積み重ねるのがコツ。",
  },
  {
    key: "unstable",
    name: "不安定期",
    range: [6, 21],
    color: "#6B7A3F",
    tagline: "予定や体調で崩れやすい時期",
    detail:
      "忙しさや疲れで生活パターンが乱れ、三日坊主になりやすい期間。「もし〜なら、〜する」のようにやることをパターン化しておくと、崩れを最小限にできる。",
  },
  {
    key: "boredom",
    name: "倦怠期",
    range: [22, 30],
    color: "#3F5A6B",
    tagline: "慣れてマンネリを感じる時期",
    detail:
      "体は慣れてきたのに「これ意味あるのかな」と虚しさが出やすい時期。やり方に小さなアレンジを加えると、飽きを乗り越えやすい。",
  },
  {
    key: "settled",
    name: "安定期",
    range: [31, Infinity],
    color: "#2B3A2F",
    tagline: "意識せずにできるようになった時期",
    detail: "習慣として定着した状態。ここまで来れば、あとは無理なく続けられる。",
  },
];

const CATEGORIES = [
  { key: "action", label: "行動的", desc: "やった／やらなかった行動", color: "#B5511F" },
  { key: "thought", label: "思考的", desc: "考え方・とらえ方のクセ", color: "#6B7A3F" },
  { key: "body", label: "身体のリズム", desc: "睡眠・体調・自律神経など", color: "#3F5A6B" },
];

const ACHIEVE_RATE = 70; // 達成に必要な直近30日の達成率(%)
const FREEZE_ALLOWANCE = 1; // 30日サイクルあたりのフリーズ回数
const MILESTONES = [7, 14, 21, 30]; // 連続記録バッジの解禁日数

const ONBOARDING_SLIDES = [
  {
    emoji: "🎯",
    title: "目標をひとつ決める",
    body: "今回変えたい行動を、シンプルに1つだけ書きます。",
  },
  {
    emoji: "○ ×",
    title: "毎日ワンタップで記録",
    body: "「やった／できなかった」を毎日タップするだけ。気づいたことがあれば自由記述も残せます。",
  },
  {
    emoji: "🌱",
    title: "今の状態が自動でわかる",
    body: "反抗期・不安定期・倦怠期のどこにいるか表示されるので、崩れやすい時期を先読みできます。",
  },
];

function getPhase(cycleDay) {
  return PHASES.find((p) => cycleDay >= p.range[0] && cycleDay <= p.range[1]) || PHASES[PHASES.length - 1];
}

function daysSince(dateStr) {
  const start = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const startMid = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((nowMid - startMid) / 86400000) + 1;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// その目標が始まって以降、最長で何日連続（done/freeze）が続いたか
function computeBestStreak(logs, startDate, totalDays) {
  let best = 0;
  let run = 0;
  for (let cd = 1; cd <= totalDays; cd++) {
    const d = addDays(startDate, cd - 1);
    if (logs[d] === "done" || logs[d] === "freeze") {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

// ---- シェア画像（canvasで直接描画。外部ライブラリ不要） ----
function wrapCanvasText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildShareCanvas({ kind, goal, stats }) {
  const canvas = document.createElement("canvas");
  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const sans = "'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif";
  const mincho = "'Hiragino Mincho ProN','Yu Mincho',serif";
  const mono = "'SFMono-Regular',Menlo,monospace";

  const achieved = kind === "result" ? stats.graduation.achieved : null;
  const bg = kind === "result" ? (achieved ? "#EAF0E4" : "#F5EAE2") : "#EDE8DD";

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  let y = 120;

  // 見出し絵文字
  ctx.textAlign = "center";
  ctx.font = `110px ${sans}`;
  ctx.fillText(kind === "result" ? (achieved ? "🎉" : "🌱") : "🔥", W / 2, y);
  y += 90;

  ctx.fillStyle = "#3F5A2F";
  ctx.font = `bold 28px ${sans}`;
  ctx.fillText("30日間習慣ジャーナル", W / 2, y);
  y += 60;

  ctx.fillStyle = "#2A2A28";
  ctx.font = `bold 52px ${mincho}`;
  ctx.fillText(
    kind === "result" ? (achieved ? "30日、達成しました" : "30日、走りきりました") : `連続 ${stats.streak}日目`,
    W / 2,
    y
  );
  y += 90;

  // 目標
  ctx.textAlign = "left";
  ctx.fillStyle = "#6B675E";
  ctx.font = `26px ${sans}`;
  ctx.fillText("目標", 90, y);
  y += 48;
  ctx.fillStyle = "#2A2A28";
  ctx.font = `bold 42px ${sans}`;
  const titleLines = wrapCanvasText(ctx, goal.title, W - 180).slice(0, 2);
  titleLines.forEach((line) => {
    ctx.fillText(line, 90, y);
    y += 56;
  });
  y += 30;

  // 統計カード
  const cardTop = y;
  const cardH = 220;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.strokeStyle = "#2A2A28";
  ctx.lineWidth = 3;
  roundRect(ctx, 90, cardTop, W - 180, cardH, 24);
  ctx.fill();
  ctx.stroke();

  const statW = (W - 180) / 2;
  ctx.textAlign = "center";
  const rateVal = kind === "result" ? stats.graduation.rate30 : stats.rate30;
  ctx.fillStyle = "#2A2A28";
  ctx.font = `bold 64px ${mono}`;
  ctx.fillText(`${rateVal}%`, 90 + statW / 2, cardTop + 100);
  ctx.font = `24px ${sans}`;
  ctx.fillStyle = "#6B675E";
  ctx.fillText(kind === "result" ? "30日間の達成率" : "直近の達成率", 90 + statW / 2, cardTop + 140);

  ctx.strokeStyle = "#D8D2C4";
  ctx.beginPath();
  ctx.moveTo(90 + statW, cardTop + 30);
  ctx.lineTo(90 + statW, cardTop + cardH - 30);
  ctx.stroke();

  const rightVal = kind === "result" ? stats.streak : stats.streak;
  ctx.fillStyle = "#2A2A28";
  ctx.font = `bold 64px ${mono}`;
  ctx.fillText(`${rightVal}`, 90 + statW + statW / 2, cardTop + 100);
  ctx.font = `24px ${sans}`;
  ctx.fillStyle = "#6B675E";
  ctx.fillText("連続日数", 90 + statW + statW / 2, cardTop + 140);

  y = cardTop + cardH + 70;

  // フェーズ別バー
  ctx.textAlign = "left";
  ctx.fillStyle = "#6B675E";
  ctx.font = `24px ${sans}`;
  ctx.fillText("フェーズ別達成率", 90, y);
  y += 36;

  stats.phaseStats.forEach((p) => {
    const pct = p.total > 0 ? p.done / p.total : 0;
    ctx.fillStyle = "#4A473F";
    ctx.font = `24px ${sans}`;
    ctx.fillText(p.name, 90, y);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(pct * 100)}%`, W - 90, y);
    ctx.textAlign = "left";
    y += 14;
    ctx.fillStyle = "#E3DCC9";
    roundRect(ctx, 90, y, W - 180, 18, 9);
    ctx.fill();
    ctx.fillStyle = p.color;
    roundRect(ctx, 90, y, (W - 180) * pct, 18, 9);
    ctx.fill();
    y += 50;
  });

  // フッター
  ctx.textAlign = "center";
  ctx.fillStyle = "#A8A398";
  ctx.font = `22px ${sans}`;
  ctx.fillText("30日間、気づきを行動に。", W / 2, H - 60);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function shareOrDownloadCanvas(canvas, filename) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  try {
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "30日間習慣ジャーナル" });
        return true;
      }
    }
  } catch {
    // ユーザーがキャンセルした場合などはダウンロードにフォールバック
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

// このデプロイ版はブラウザの localStorage を使って保存する
// (window.storage は Claude のアーティファクト内でのみ使えるAPIのため)
const hasStorage = () => typeof window !== "undefined" && window.localStorage;

async function safeGet(key) {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : { value: raw };
  } catch (e) {
    console.error("storage get failed", key, e);
    return null;
  }
}

async function safeSet(key, value) {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error("storage set failed", key, e);
    return false;
  }
}

async function safeDelete(key) {
  if (!hasStorage()) return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error("storage delete failed", key, e);
    return false;
  }
}

// ---- 成長リング ----
function GrowthRing({ cycleDay }) {
  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { len: 5, color: "#B5511F" },
    { len: 16, color: "#6B7A3F" },
    { len: 9, color: "#3F5A6B" },
  ];

  let offsetAcc = 0;
  const arcs = segments.map((seg, i) => {
    const segLen = (seg.len / 30) * circumference;
    const gap = 2;
    const dasharray = `${Math.max(segLen - gap, 0)} ${circumference - (segLen - gap)}`;
    const dashoffset = circumference * 0.25 - offsetAcc;
    offsetAcc += segLen;
    return (
      <circle
        key={i}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth={stroke}
        strokeDasharray={dasharray}
        strokeDashoffset={dashoffset}
        strokeLinecap="butt"
        opacity={0.35}
      />
    );
  });

  const clamped = Math.min(cycleDay, 30);
  const progressLen = (clamped / 30) * circumference;
  const progressOffset = circumference * 0.25;
  const angle = (clamped / 30) * 2 * Math.PI - Math.PI / 2;
  const markerX = cx + r * Math.cos(angle);
  const markerY = cy + r * Math.sin(angle);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#2A2A28"
        strokeWidth={stroke}
        strokeDasharray={`${progressLen} ${circumference}`}
        strokeDashoffset={progressOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <circle cx={markerX} cy={markerY} r={5} fill="#EDE8DD" stroke="#2A2A28" strokeWidth={2} />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="24" fontFamily="'SFMono-Regular', Menlo, monospace" fill="#2A2A28">
        {cycleDay}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fontSize="9" fontFamily="'Hiragino Kaku Gothic ProN', sans-serif" fill="#6B675E">
        / 30日目
      </text>
    </svg>
  );
}

function Onboarding({ onFinish }) {
  const [i, setI] = useState(0);
  const slide = ONBOARDING_SLIDES[i];
  const last = i === ONBOARDING_SLIDES.length - 1;
  return (
    <div style={{ background: "#EDE8DD", minHeight: "100dvh", paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)", paddingLeft: "1.5rem", paddingRight: "1.5rem" }} className="flex flex-col justify-between">
      <div className="flex justify-end">
        <button onClick={onFinish} className="text-xs text-stone-400 underline">
          スキップ
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="text-5xl mb-6">{slide.emoji}</div>
        <h2
          style={{ fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}
          className="text-xl font-bold mb-3"
        >
          {slide.title}
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed max-w-xs">{slide.body}</p>
      </div>
      <div>
        <div className="flex justify-center gap-2 mb-6">
          {ONBOARDING_SLIDES.map((_, idx) => (
            <div
              key={idx}
              style={{ background: idx === i ? "#2A2A28" : "#D8D2C4" }}
              className="w-2 h-2 rounded-full"
            />
          ))}
        </div>
        <button
          onClick={() => (last ? onFinish() : setI(i + 1))}
          style={{ background: "#2A2A28" }}
          className="w-full text-white rounded-lg py-3 text-sm font-semibold"
        >
          {last ? "はじめる" : "次へ"}
        </button>
      </div>
    </div>
  );
}

function GraduationScreen({ goal, stats, onContinue, onNewGoal, onViewHistory }) {
  const g = stats.graduation;
  const bg = g.achieved ? "#EAF0E4" : "#F5EAE2";
  const accent = g.achieved ? "#3F5A2F" : "#8A4A20";
  return (
    <div
      style={{
        background: bg,
        minHeight: "100dvh",
        fontFamily: "'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
        color: "#2A2A28",
        paddingTop: "calc(env(safe-area-inset-top) + 2rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
      }}
      className="flex flex-col"
    >
      <div className="max-w-md mx-auto w-full px-6 flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">{g.achieved ? "🎉" : "🌱"}</div>
          <p className="text-xs font-bold tracking-wide" style={{ color: accent }}>
            30日間習慣ジャーナル・結果
          </p>
          <h1
            style={{ fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}
            className="text-2xl font-bold mt-1"
          >
            {g.achieved ? "30日、達成しました" : "今回は未達でした"}
          </h1>
        </div>

        <div style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 mb-4 bg-white/60">
          <p className="text-xs font-bold text-stone-500 mb-0.5">目標</p>
          <p className="text-lg font-bold mb-2 break-words">{goal.title}</p>
          {goal.vision && (
            <div style={{ background: "#EAF0E4", borderColor: "#3F5A2F" }} className="border-l-4 rounded-lg px-3 py-2">
              <p className="text-[11px] font-bold mb-0.5" style={{ color: "#3F5A2F" }}>
                🎯 目指していた未来
              </p>
              <p className="text-sm font-bold leading-snug">{goal.vision}</p>
            </div>
          )}
        </div>

        <div style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 mb-6 bg-white/60">
          <div className="flex gap-3 mb-4">
            <div className="flex-1 text-center rounded-lg py-2" style={{ background: "#F0EAD8" }}>
              <div style={{ fontFamily: "'SFMono-Regular', Menlo, monospace" }} className="text-xl font-bold">
                {g.rate30}%
              </div>
              <div className="text-[10px] text-stone-500">30日間の達成率</div>
            </div>
            <div className="flex-1 text-center rounded-lg py-2" style={{ background: "#F0EAD8" }}>
              <div style={{ fontFamily: "'SFMono-Regular', Menlo, monospace" }} className="text-xl font-bold">
                {g.hasConsecutiveSkip ? "あり" : "なし"}
              </div>
              <div className="text-[10px] text-stone-500">2日連続休み</div>
            </div>
          </div>
          <p className="text-xs text-stone-500 mb-2">フェーズ別達成率</p>
          <div className="space-y-2">
            {stats.phaseStats.map((p) => (
              <div key={p.key}>
                <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                  <span>{p.name}</span>
                  <span>{p.total > 0 ? Math.round((p.done / p.total) * 100) : 0}%（{p.done}/{p.total}日）</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "#E3DCC9" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${p.total > 0 ? (p.done / p.total) * 100 : 0}%`, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={() => {
              const canvas = buildShareCanvas({ kind: "result", goal, stats });
              shareOrDownloadCanvas(canvas, "habit-journal-result.png");
            }}
            style={{ borderColor: "#2A2A28" }}
            className="border rounded-lg py-3 text-sm font-semibold"
          >
            📤 結果をシェア画像で保存
          </button>
          <button onClick={onNewGoal} style={{ background: "#2A2A28" }} className="text-white rounded-lg py-3 text-sm font-semibold">
            新しい目標を始める
          </button>
          <button onClick={onContinue} style={{ borderColor: "#2A2A28" }} className="border rounded-lg py-3 text-sm">
            同じ目標を続ける
          </button>
          <button onClick={onViewHistory} className="text-xs text-stone-500 underline mt-2">
            達成履歴を見る
          </button>
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ history, onBack, currentGoal, currentStats }) {
  return (
    <div
      style={{
        background: "#EDE8DD",
        minHeight: "100dvh",
        fontFamily: "'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
        color: "#2A2A28",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
      }}
    >
      <div className="max-w-md mx-auto px-5 pt-8">
        <button onClick={onBack} className="text-xs text-stone-500 mb-4 underline">
          ← 戻る
        </button>
        <h1 style={{ fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }} className="text-xl font-bold mb-1">
          達成履歴
        </h1>
        <p className="text-xs text-stone-500 mb-6">これまでに完走した30日サイクルの記録</p>

        {currentGoal && currentStats && (
          <div style={{ borderColor: "#3F5A6B" }} className="border rounded-xl p-4 bg-white/60 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span style={{ background: "#3F5A6B", color: "#F5F2EA" }} className="text-xs font-bold px-2 py-0.5 rounded-full">
                🌱 進行中
              </span>
              <span style={{ fontFamily: "'SFMono-Regular', Menlo, monospace" }} className="text-[10px] text-stone-400">
                {currentGoal.createdDate} 〜（{currentStats.cycleDay}/30日目）
              </span>
            </div>
            <p className="text-base font-bold mb-1 break-words">{currentGoal.title}</p>
            {currentGoal.vision && <p className="text-xs text-stone-600 mb-1">🎯 {currentGoal.vision}</p>}
            <p className="text-xs text-stone-500">これまでの達成率 {currentStats.rate30}%</p>
          </div>
        )}

        {history.length === 0 && !currentGoal ? (
          <p className="text-sm text-stone-500">まだ記録がありません。30日サイクルを完走すると、ここに残ります。</p>
        ) : (
          <ul className="space-y-3">
            {history.map((h) => (
              <li key={h.id} style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 bg-white/40">
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{ background: h.achieved ? "#2B3A2F" : "#B5511F", color: "#F5F2EA" }}
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                  >
                    {h.achieved ? "🎉 達成" : "🌱 未達"}
                  </span>
                  <span style={{ fontFamily: "'SFMono-Regular', Menlo, monospace" }} className="text-[10px] text-stone-400">
                    {h.startDate} 〜 {h.endDate}
                  </span>
                </div>
                <p className="text-base font-bold mb-1 break-words">{h.title}</p>
                {h.vision && <p className="text-xs text-stone-600 mb-1">🎯 {h.vision}</p>}
                <p className="text-xs text-stone-500">達成率 {h.rate30}%</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BottomBar({ active, onHistory }) {
  return (
    <div
      style={{
        background: "#F5F2EA",
        borderTop: "1px solid #2A2A28",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      className="fixed left-0 right-0 bottom-0 z-30"
    >
      <div className="max-w-md mx-auto grid grid-cols-2">
        <button
          onClick={onHistory}
          style={{ color: active === "history" ? "#2A2A28" : "#8A8577" }}
          className="flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold"
        >
          <span className="text-lg leading-none">📖</span>
          達成履歴
        </button>
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#8A8577", borderLeft: "1px solid #D8D2C4" }}
          className="flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold"
        >
          <span className="text-lg leading-none">📰</span>
          やる気の記事
        </a>
      </div>
    </div>
  );
}

export default function HabitJournal() {
  const [loading, setLoading] = useState(true);
  const [persistent, setPersistent] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [goal, setGoal] = useState(null); // { title, createdDate }
  const [goalDraft, setGoalDraft] = useState("");
  const [visionDraft, setVisionDraft] = useState("");
  const [actionLogs, setActionLogs] = useState({}); // { date: "done" | "skip" | "freeze" }
  const [entries, setEntries] = useState([]);
  const [text, setText] = useState("");
  const [category, setCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [justSavedAction, setJustSavedAction] = useState(false);
  const [step, setStep] = useState(1);
  const [showDone, setShowDone] = useState(false);
  const [showInsightForm, setShowInsightForm] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [history, setHistory] = useState([]);
  const [view, setView] = useState("main"); // "main" | "history"
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [expandedPhaseKey, setExpandedPhaseKey] = useState(null);
  const [badgeToast, setBadgeToast] = useState(null);

  useEffect(() => {
    (async () => {
      if (!hasStorage()) setPersistent(false);
      const seen = await safeGet("onboarding-seen");
      setShowOnboarding(!(seen && JSON.parse(seen.value)));
      const g = await safeGet("goal");
      setGoal(g ? JSON.parse(g.value) : null);
      const logs = await safeGet("action-logs");
      setActionLogs(logs ? JSON.parse(logs.value) : {});
      const ent = await safeGet("entries");
      setEntries(ent ? JSON.parse(ent.value) : []);
      const hist = await safeGet("goal-history");
      setHistory(hist ? JSON.parse(hist.value) : []);
      setLoading(false);
    })();
  }, []);

  const finishOnboarding = () => {
    setShowOnboarding(false);
    safeSet("onboarding-seen", JSON.stringify(true));
  };

  const persistEntries = useCallback(async (list) => {
    const ok = await safeSet("entries", JSON.stringify(list));
    if (!ok) setPersistent(false);
  }, []);

  const persistLogs = useCallback(async (logs) => {
    const ok = await safeSet("action-logs", JSON.stringify(logs));
    if (!ok) setPersistent(false);
  }, []);

  const handleCreateGoal = () => {
    if (!goalDraft.trim()) return;
    const g = { title: goalDraft.trim(), vision: visionDraft.trim(), createdDate: todayStr() };
    setGoal(g);
    setGoalDraft("");
    setVisionDraft("");
    setActionLogs({});
    safeSet("goal", JSON.stringify(g)).then((ok) => {
      if (!ok) setPersistent(false);
    });
    safeSet("action-logs", JSON.stringify({}));
  };

  const handleDeleteGoal = () => {
    setGoal(null);
    setActionLogs({});
    safeDelete("goal");
    safeDelete("action-logs");
  };

  const handleContinueGoal = () => {
    const updated = { ...goal, graduationSeen: true };
    setGoal(updated);
    safeSet("goal", JSON.stringify(updated));
  };

  const handleGraduationNewGoal = (graduation) => {
    const record = {
      id: `${Date.now()}`,
      title: goal.title,
      vision: goal.vision,
      startDate: goal.createdDate,
      endDate: todayStr(),
      achieved: graduation.achieved,
      rate30: graduation.rate30,
    };
    const nextHistory = [record, ...history];
    setHistory(nextHistory);
    safeSet("goal-history", JSON.stringify(nextHistory));
    handleDeleteGoal();
  };

  const handleCheckIn = async (status) => {
    const next = { ...actionLogs, [todayStr()]: status };
    if (goal) {
      const totalDays = daysSince(goal.createdDate);
      const prevBest = computeBestStreak(actionLogs, goal.createdDate, totalDays);
      const newBest = computeBestStreak(next, goal.createdDate, totalDays);
      const crossed = MILESTONES.find((m) => newBest >= m && prevBest < m);
      if (crossed) setBadgeToast(crossed);
    }
    setActionLogs(next);
    await persistLogs(next);
  };

  const handleSaveInsight = async () => {
    if (!text.trim() || !category) return;
    setSaving(true);
    setError("");
    try {
      const day = goal ? daysSince(goal.createdDate) : 1;
      const cycleDay = ((day - 1) % 30) + 1;
      const phase = getPhase(cycleDay);
      const entry = {
        id: `${Date.now()}`,
        text: text.trim(),
        category,
        date: todayStr(),
        day,
        phaseName: phase.name,
      };
      const next = [entry, ...entries];
      setEntries(next);
      await persistEntries(next);
      setJustSavedAction(category === "action");
      setShowDone(true);
      setStep(3);
    } catch (e) {
      setError("保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const handleStartNewInsight = () => {
    setText("");
    setCategory(null);
    setShowDone(false);
    setStep(1);
    setShowInsightForm(false);
  };

  if (loading) {
    return (
      <div style={{ background: "#EDE8DD", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif", color: "#6B675E" }}>読み込み中…</p>
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onFinish={finishOnboarding} />;
  }

  // ---- 進捗・達成判定 ----
  let stats = null;
  if (goal) {
    const totalDays = daysSince(goal.createdDate);
    const cycleDay = ((totalDays - 1) % 30) + 1;
    const phase = getPhase(cycleDay);

    // ストリーク（done / freeze は継続とみなす。skip で途切れる）
    let streak = 0;
    let cursor = actionLogs[todayStr()] ? todayStr() : addDays(todayStr(), -1);
    while (actionLogs[cursor] === "done" || actionLogs[cursor] === "freeze") {
      streak += 1;
      cursor = addDays(cursor, -1);
    }

    // 直近30日の達成率（doneのみカウント。freezeは達成扱いしない）
    const trackedDays = Math.min(totalDays, 30);
    let doneCount = 0;
    let freezeCount = 0;
    for (let i = 0; i < trackedDays; i++) {
      const d = addDays(todayStr(), -i);
      if (actionLogs[d] === "done") doneCount += 1;
      if (actionLogs[d] === "freeze") freezeCount += 1;
    }
    const rate30 = trackedDays > 0 ? Math.round((doneCount / trackedDays) * 100) : 0;

    // 今サイクルで使ったフリーズ回数
    let freezeUsedThisCycle = 0;
    for (let cd = 1; cd <= Math.min(cycleDay, 30); cd++) {
      const d = addDays(goal.createdDate, cd - 1);
      if (actionLogs[d] === "freeze") freezeUsedThisCycle += 1;
    }
    const freezeRemaining = Math.max(FREEZE_ALLOWANCE - freezeUsedThisCycle, 0);

    // フェーズ別達成率
    const phaseStats = PHASES.slice(0, 3).map((p) => {
      let done = 0;
      let total = 0;
      for (let cd = p.range[0]; cd <= p.range[1] && cd <= totalDays; cd++) {
        const d = addDays(goal.createdDate, cd - 1);
        if (d > todayStr()) break;
        total += 1;
        if (actionLogs[d] === "done") done += 1;
      }
      return { ...p, done, total };
    });

    // 30日到達時の達成判定：直近30日70%以上 かつ 2日連続の「できなかった」が一度もない
    let graduation = null;
    if (totalDays >= 30) {
      let hasConsecutiveSkip = false;
      for (let cd = 1; cd < Math.min(cycleDay, 30); cd++) {
        const d1 = addDays(goal.createdDate, cd - 1);
        const d2 = addDays(goal.createdDate, cd);
        if (actionLogs[d1] === "skip" && actionLogs[d2] === "skip") {
          hasConsecutiveSkip = true;
          break;
        }
      }
      const achieved = rate30 >= ACHIEVE_RATE && !hasConsecutiveSkip;
      graduation = { achieved, rate30, hasConsecutiveSkip };
    }

    const bestStreak = computeBestStreak(actionLogs, goal.createdDate, totalDays);

    stats = { totalDays, cycleDay, phase, streak, bestStreak, rate30, doneCount, freezeCount, freezeRemaining, trackedDays, phaseStats, graduation };
  }

  if (view === "history") {
    return (
      <>
        <HistoryScreen history={history} onBack={() => setView("main")} currentGoal={goal} currentStats={stats} />
        <BottomBar active="history" onHistory={() => setView("history")} />
      </>
    );
  }

  if (goal && stats && stats.graduation && !goal.graduationSeen) {
    return (
      <GraduationScreen
        goal={goal}
        stats={stats}
        onContinue={handleContinueGoal}
        onNewGoal={() => handleGraduationNewGoal(stats.graduation)}
        onViewHistory={() => setView("history")}
      />
    );
  }

  const todayStatus = actionLogs[todayStr()];
  const actionEntries = entries.filter((e) => e.category === "action");

  return (
    <div
      style={{
        background: "#EDE8DD",
        minHeight: "100dvh",
        fontFamily: "'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
        color: "#2A2A28",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 7rem)",
      }}
    >
      <div className="max-w-md mx-auto px-5 pt-8 relative">
        <div className="mb-6">
          <p style={{ fontFamily: "'SFMono-Regular', Menlo, monospace", letterSpacing: "0.15em" }} className="text-xs text-stone-500 uppercase mb-1">
            Habit Journal
          </p>
          <h1 style={{ fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }} className="text-2xl font-bold">
            30日間習慣ジャーナル
          </h1>
        </div>

        {badgeToast && (
          <div
            style={{ borderColor: "#2A2A28", background: "#F0EAD8" }}
            className="border rounded-xl p-4 mb-4 flex items-center gap-3"
          >
            <span className="text-2xl">🏅</span>
            <div className="flex-1">
              <p className="text-sm font-bold">{badgeToast}日連続、達成しました！</p>
              <p className="text-xs text-stone-500">新しいバッジが解禁されました</p>
            </div>
            <button onClick={() => setBadgeToast(null)} className="text-xs text-stone-500 underline shrink-0">
              閉じる
            </button>
          </div>
        )}

        {error && <p className="text-xs text-red-700 mb-3">{error}</p>}
        {!persistent && (
          <p className="text-xs text-stone-500 mb-3 rounded-lg p-2" style={{ background: "#F0EAD8" }}>
            この環境では保存機能が使えないため、記録は画面を閉じると消えます。
          </p>
        )}

        {/* 目標が未設定 */}
        {!goal && (
          <div style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 mb-6 bg-white/40">
            <label className="text-xs text-stone-500 mb-1 block">
              取り組みたい目標をひとつ決めてください（無料プランは1個まで）
            </label>
            <input
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              placeholder="例）夜11時に寝る"
              style={{ borderColor: "#2A2A28" }}
              className="w-full border rounded-lg p-2 text-sm bg-white mb-3 focus:outline-none focus:ring-2"
            />
            <label className="text-xs text-stone-500 mb-1 block">
              達成できたら、どうなっていたい？（任意）
            </label>
            <textarea
              value={visionDraft}
              onChange={(e) => setVisionDraft(e.target.value)}
              placeholder="例）朝スッキリ起きて、仕事に集中できている"
              rows={2}
              style={{ borderColor: "#2A2A28" }}
              className="w-full border rounded-lg p-2 text-sm bg-white mb-3 focus:outline-none focus:ring-2"
            />
            <button
              onClick={handleCreateGoal}
              disabled={!goalDraft.trim()}
              style={{ background: "#2A2A28" }}
              className="w-full text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
            >
              目標をはじめる
            </button>
          </div>
        )}

        {/* 目標がある場合 */}
        {goal && stats && (
          <>
            <div className="mb-3">
              <p className="text-xs font-bold text-stone-500 mb-0.5">目標</p>
              <h2
                style={{ fontFamily: "'Hiragino Mincho ProN', 'Yu Mincho', serif" }}
                className="text-xl font-bold leading-snug break-words"
              >
                {goal.title}
              </h2>
              {goal.vision && (
                <div
                  style={{ background: "#EAF0E4", borderColor: "#3F5A2F" }}
                  className="border-l-4 rounded-lg px-3 py-2.5 mt-2"
                >
                  <p className="text-[11px] font-bold mb-0.5" style={{ color: "#3F5A2F" }}>
                    🎉 達成できたら
                  </p>
                  <p className="text-base font-bold leading-snug" style={{ color: "#2A2A28" }}>
                    {goal.vision}
                  </p>
                </div>
              )}
            </div>
            <div style={{ borderColor: "#2A2A28", background: "#F5F2EA" }} className="border rounded-xl mb-4 overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <GrowthRing cycleDay={stats.cycleDay} />
                <div className="flex-1 min-w-0">
                  <span style={{ background: stats.phase.color, color: "#F5F2EA" }} className="inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1">
                    {stats.phase.name}
                  </span>
                  <p className="text-sm font-semibold mb-1">{stats.phase.tagline}</p>
                  <p className="text-xs text-stone-600 leading-relaxed">{stats.phase.detail}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setTimelineOpen((v) => !v);
                  if (!timelineOpen) setExpandedPhaseKey(stats.phase.key);
                }}
                style={{ borderTop: "1px solid #2A2A28", background: "#EAE4D4" }}
                className="w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-1"
              >
                全体の流れを見る（これまで・今・これから）
                <span
                  className="text-xs inline-block transition-transform duration-300"
                  style={{ transform: timelineOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                >
                  ▸
                </span>
              </button>

              {/* カード自体が伸びるアコーディオン */}
              <div
                className="grid transition-all duration-300 ease-out"
                style={{ gridTemplateRows: timelineOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div style={{ borderTop: "1px solid #D8D2C4" }} className="p-4 space-y-2">
                    {PHASES.map((p) => {
                      const status =
                        stats.cycleDay > p.range[1]
                          ? "past"
                          : stats.cycleDay >= p.range[0] && stats.cycleDay <= p.range[1]
                          ? "current"
                          : "future";
                      const expanded = expandedPhaseKey === p.key;
                      const statusLabel = status === "past" ? "これまで" : status === "current" ? "今ここ" : "これから";
                      return (
                        <div
                          key={p.key}
                          style={{ borderColor: status === "current" ? p.color : "#D8D2C4" }}
                          className="border rounded-lg overflow-hidden bg-white/60"
                        >
                          <button
                            onClick={() => setExpandedPhaseKey(expanded ? null : p.key)}
                            style={{ background: status === "current" ? `${p.color}22` : "transparent" }}
                            className="w-full flex items-center justify-between px-3 py-2 text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span style={{ background: p.color, color: "#F5F2EA" }} className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                                {statusLabel}
                              </span>
                              <span className="text-sm font-bold shrink-0">{p.name}</span>
                              <span className="text-[10px] text-stone-400 truncate">
                                {p.range[1] === Infinity ? `${p.range[0]}日目〜` : `${p.range[0]}〜${p.range[1]}日目`}
                              </span>
                            </div>
                            <span className="text-xs text-stone-400 shrink-0">{expanded ? "−" : "+"}</span>
                          </button>
                          {expanded && (
                            <div className="px-3 pb-3">
                              <p className="text-xs font-semibold mb-1">{p.tagline}</p>
                              <p className="text-xs text-stone-600 leading-relaxed">{p.detail}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 今日のチェックイン */}
            <div style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 mb-4 bg-white/40">
              <p className="text-xs font-bold text-stone-600 mb-2">今日はやった？</p>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => handleCheckIn("done")}
                  style={{
                    borderColor: "#2B3A2F",
                    background: todayStatus === "done" ? "#2B3A2F" : "transparent",
                    color: todayStatus === "done" ? "#F5F2EA" : "#2A2A28",
                  }}
                  className="flex-1 border rounded-lg py-2 text-sm font-semibold"
                >
                  ○ やった
                </button>
                <button
                  onClick={() => handleCheckIn("skip")}
                  style={{
                    borderColor: "#B5511F",
                    background: todayStatus === "skip" ? "#B5511F" : "transparent",
                    color: todayStatus === "skip" ? "#F5F2EA" : "#2A2A28",
                  }}
                  className="flex-1 border rounded-lg py-2 text-sm font-semibold"
                >
                  × できなかった
                </button>
              </div>
              <button
                onClick={() => handleCheckIn("freeze")}
                disabled={stats.freezeRemaining <= 0 || todayStatus === "freeze"}
                style={{
                  borderColor: "#3F5A6B",
                  background: todayStatus === "freeze" ? "#3F5A6B" : "transparent",
                  color: todayStatus === "freeze" ? "#F5F2EA" : "#2A2A28",
                }}
                className="w-full border rounded-lg py-1.5 text-xs disabled:opacity-40"
              >
                🧊 フリーズを使う（連続日数を守って休む・残り{stats.freezeRemaining}回/サイクル）
              </button>
              {todayStatus === "skip" && actionLogs[addDays(todayStr(), -1)] === "skip" && (
                <p className="text-xs mt-2 font-semibold" style={{ color: "#B5511F" }}>
                  ⚠ 2日連続の「できなかった」です。今回の30日達成の条件から外れます。
                </p>
              )}
              {todayStatus === "skip" && actionLogs[addDays(todayStr(), -1)] !== "skip" && (
                <p className="text-xs text-stone-500 mt-2">また今日から積み重ねればOKです。</p>
              )}
              {todayStatus === "freeze" && (
                <p className="text-xs text-stone-500 mt-2">今日は休み扱い。連続日数は維持されます（達成率には加算されません）。</p>
              )}
            </div>

            {/* 進捗確認 */}
            <div style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 mb-6 bg-white/40">
              <h2 className="text-sm font-semibold mb-3">進捗</h2>
              <div className="flex gap-3 mb-4">
                <div className="flex-1 text-center rounded-lg py-2" style={{ background: "#F0EAD8" }}>
                  <div style={{ fontFamily: "'SFMono-Regular', Menlo, monospace" }} className="text-xl font-bold">
                    {stats.streak}
                  </div>
                  <div className="text-[10px] text-stone-500">連続日数</div>
                </div>
                <div className="flex-1 text-center rounded-lg py-2" style={{ background: "#F0EAD8" }}>
                  <div style={{ fontFamily: "'SFMono-Regular', Menlo, monospace" }} className="text-xl font-bold">
                    {stats.rate30}%
                  </div>
                  <div className="text-[10px] text-stone-500">直近{stats.trackedDays}日達成率</div>
                </div>
              </div>
              <p className="text-xs text-stone-500 mb-2">フェーズ別達成率</p>
              <div className="space-y-2">
                {stats.phaseStats.map((p) => (
                  <div key={p.key}>
                    <div className="flex justify-between text-[11px] text-stone-600 mb-0.5">
                      <span>{p.name}</span>
                      <span>{p.total > 0 ? Math.round((p.done / p.total) * 100) : 0}%（{p.done}/{p.total}日）</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: "#E3DCC9" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${p.total > 0 ? (p.done / p.total) * 100 : 0}%`, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* 連続記録バッジ */}
              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #E3DCC9" }}>
                <p className="text-xs text-stone-500 mb-2">連続記録バッジ（ベスト{stats.bestStreak}日）</p>
                <div className="flex gap-2">
                  {MILESTONES.map((m) => {
                    const unlocked = stats.bestStreak >= m;
                    return (
                      <div
                        key={m}
                        style={{
                          background: unlocked ? "#2B3A2F" : "#E3DCC9",
                          color: unlocked ? "#F5F2EA" : "#A8A398",
                        }}
                        className="flex-1 rounded-lg py-2 text-center"
                      >
                        <div className="text-base leading-none mb-1">{unlocked ? "🏅" : "🔒"}</div>
                        <div className="text-[10px] font-bold">{m}日</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => {
                  const canvas = buildShareCanvas({ kind: "progress", goal, stats });
                  shareOrDownloadCanvas(canvas, "habit-journal-progress.png");
                }}
                style={{ borderColor: "#2A2A28" }}
                className="w-full border rounded-lg py-2 text-xs font-semibold mt-4"
              >
                📤 今の進捗をシェア画像で保存
              </button>
            </div>
          </>
        )}

        {goal && !showInsightForm && step !== 3 && (
          <button onClick={() => setShowInsightForm(true)} style={{ borderColor: "#2A2A28" }} className="w-full border rounded-lg py-2 text-sm mb-6">
            ＋ 気づきを記録する
          </button>
        )}

        {goal && (showInsightForm || step === 3) && (
          <div style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 mb-6 bg-white/40">
            <div className="flex items-center gap-2 mb-4">
              {["書く", "分ける", "完了"].map((label, i) => {
                const n = i + 1;
                const active = step === n;
                const done = step > n;
                return (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div
                      style={{
                        background: active || done ? "#2A2A28" : "transparent",
                        borderColor: "#2A2A28",
                        color: active || done ? "#F5F2EA" : "#2A2A28",
                      }}
                      className="border rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-semibold shrink-0"
                    >
                      {n}
                    </div>
                    <span style={{ color: active ? "#2A2A28" : "#A8A398" }} className="text-xs font-medium">
                      {label}
                    </span>
                    {n < 3 && <div style={{ background: step > n ? "#2A2A28" : "#D8D2C4" }} className="h-px flex-1" />}
                  </div>
                );
              })}
            </div>

            {step === 1 && (
              <div>
                <label className="text-xs text-stone-500 mb-1 block">① ダメだな、と気づいたことを書く</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="例）夜ダラダラSNSを見て寝るのが遅くなった"
                  rows={3}
                  autoFocus
                  style={{ borderColor: "#2A2A28" }}
                  className="w-full border rounded-lg p-2 text-sm bg-white mb-3 focus:outline-none focus:ring-2"
                />
                <button
                  onClick={() => text.trim() && setStep(2)}
                  disabled={!text.trim()}
                  style={{ background: "#2A2A28" }}
                  className="w-full text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
                >
                  次へ：カテゴリーを選ぶ
                </button>
              </div>
            )}

            {step === 2 && (
              <div>
                <div style={{ background: "#F0EAD8" }} className="rounded-lg p-2 text-xs text-stone-600 mb-3">
                  「{text}」
                </div>
                <label className="text-xs text-stone-500 mb-2 block">② これは何のクセ？ひとつ選ぶ</label>
                <div className="flex flex-col gap-2 mb-4">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      style={{
                        borderColor: c.color,
                        background: category === c.key ? c.color : "transparent",
                        color: category === c.key ? "#F5F2EA" : "#2A2A28",
                      }}
                      className="border rounded-lg py-2 px-3 text-left transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-semibold">{c.label}</div>
                        <div className="opacity-80 text-[11px] mt-0.5">{c.desc}</div>
                      </div>
                      {category === c.key && <span className="text-lg">✓</span>}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStep(1)} style={{ borderColor: "#2A2A28" }} className="border rounded-lg py-2 px-4 text-sm">
                    戻る
                  </button>
                  <button
                    onClick={handleSaveInsight}
                    disabled={!category || saving}
                    style={{ background: "#2A2A28" }}
                    className="flex-1 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
                  >
                    {saving ? "保存中…" : "③ 完了"}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && showDone && (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✓</div>
                <p className="text-sm font-semibold mb-1">記録しました</p>
                {justSavedAction && (
                  <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                    行動的な項目として記録しました。毎日決まった時間に振り返ると定着しやすくなります。
                  </p>
                )}
                <button onClick={handleStartNewInsight} style={{ background: "#2A2A28" }} className="text-white rounded-lg py-2 px-5 text-sm font-semibold">
                  閉じる
                </button>
              </div>
            )}
          </div>
        )}

        {actionEntries.length > 0 && (
          <div style={{ borderColor: "#2A2A28" }} className="border rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold mb-2">行動リマインダー候補</h2>
            <ul className="space-y-1">
              {actionEntries.slice(0, 5).map((e) => (
                <li key={e.id} className="text-xs text-stone-600 flex gap-2">
                  <span style={{ color: "#B5511F" }}>●</span>
                  {e.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {entries.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3">気づきの記録</h2>
            <ul className="space-y-2">
              {entries.map((e) => {
                const cat = CATEGORIES.find((c) => c.key === e.category);
                return (
                  <li key={e.id} style={{ borderColor: "#2A2A28" }} className="border rounded-lg p-3 bg-white/40">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: cat.color }} className="text-[10px] font-semibold uppercase tracking-wide">
                        {cat.label}
                      </span>
                      <span style={{ fontFamily: "'SFMono-Regular', Menlo, monospace" }} className="text-[10px] text-stone-400">
                        {e.date} · {e.phaseName} · {e.day}日目
                      </span>
                    </div>
                    <p className="text-sm">{e.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {goal && !confirmingReset && (
          <button onClick={() => setConfirmingReset(true)} className="w-full text-xs text-stone-400 mt-4 underline">
            目標をリセットする
          </button>
        )}

        {goal && confirmingReset && (
          <div style={{ borderColor: "#B5511F", background: "#F5EAE2" }} className="border rounded-xl p-4 mt-4 text-center">
            <p className="text-sm font-semibold mb-1">本当にやめますか？</p>
            <p className="text-xs text-stone-600 mb-3">目標と記録がすべて削除されます。この操作は取り消せません。</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingReset(false)}
                style={{ borderColor: "#2A2A28" }}
                className="flex-1 border rounded-lg py-2 text-sm"
              >
                いいえ
              </button>
              <button
                onClick={() => {
                  handleDeleteGoal();
                  setConfirmingReset(false);
                }}
                style={{ background: "#B5511F" }}
                className="flex-1 text-white rounded-lg py-2 text-sm font-semibold"
              >
                はい、やめる
              </button>
            </div>
          </div>
        )}
      </div>
      <BottomBar active="main" onHistory={() => setView("history")} />
    </div>
  );
}
