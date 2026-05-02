import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  Cat,
  PlusCircle,
  BarChart3,
  Globe,
  Eye,
  EyeOff,
  Cookie,
  Droplet,
  Utensils,
} from "lucide-react";

const STORAGE_KEY = "nyan-note-lab-prototype-v1";
const ANONYMOUS_OWNER_ID_KEY = "nyan-note-lab-anonymous-owner-id-v1";
const PRIVACY_ACCEPTED_KEY = "nyan-note-lab-privacy-accepted-v1";
const SHOW_DEV_MENU_IN_PUBLIC = false;

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (_e) {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (_e) {
    return false;
  }
}
const PREFECTURES = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

const PROD_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5YPd4OFIZZzsASOD8Rvv-kNP9hw-2O7o",
  authDomain: "neko222-ym.firebaseapp.com",
  projectId: "neko222-ym",
  storageBucket: "neko222-ym.firebasestorage.app",
  messagingSenderId: "694032444792",
  appId: "1:694032444792:web:b367c565ad0d475978ec8d",
  measurementId: "G-KQGVBJPPDK",
};

const DEV_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDUYc5v-PUck-r6yj2xiWeW2HlwQaGrviE",
  authDomain: "nyan-note-dev.firebaseapp.com",
  projectId: "nyan-note-dev",
  storageBucket: "nyan-note-dev.firebasestorage.app",
  messagingSenderId: "938490750126",
  appId: "1:938490750126:web:4d53464418c3186ddb793f",
  measurementId: "G-Q6C1184LB5",
};

function isDevEnvironment() {
  const path = typeof window !== "undefined" && window.location ? window.location.pathname || "" : "";
  return path === "/nyan-note-lab/" || path.startsWith("/nyan-note-lab/") || path === "/nyan-note-dev/" || path.startsWith("/nyan-note-dev/");
}

function resolveFirebaseConfig() {
  return DEV_FIREBASE_CONFIG;
}

function createAnonymousOwnerId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `anon-${Date.now().toString(36)}-${rand}`;
}

function getOrCreateAnonymousOwnerId() {
  const existing = safeLocalStorageGet(ANONYMOUS_OWNER_ID_KEY);
  if (existing) return existing;
  const created = createAnonymousOwnerId();
  safeLocalStorageSet(ANONYMOUS_OWNER_ID_KEY, created);
  return created;
}

function hasFirebaseConfig(config) {
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.every((key) => typeof config[key] === "string" && config[key].trim() !== "");
}

function createFirestoreGateway() {
  const firebaseConfig = resolveFirebaseConfig();
  const devEnvironment = isDevEnvironment();
  if (!hasFirebaseConfig(firebaseConfig)) {
    return {
      enabled: false,
      db: null,
      auth: null,
      configStatus: "Firebase未設定",
      appInitStatus: "Firebase app 初期化失敗",
      firestoreInitStatus: "Firestore 初期化失敗",
      authInitStatus: "Firebase Auth 初期化失敗",
      initErrorMessage: "Firebase設定が未入力です",
      initErrorCode: "firebase/config-missing",
      environmentLabel: devEnvironment ? "開発環境" : "",
    };
  }

  try {
    const firebaseSdk = window.firebase;
    if (!firebaseSdk) {
      throw new Error("Firebase SDKが読み込まれていません");
    }
    const appName = firebaseConfig.projectId || "[DEFAULT]";
    const app =
      firebaseSdk.apps && firebaseSdk.apps.some((existingApp) => existingApp && existingApp.name === appName)
        ? firebaseSdk.app(appName)
        : firebaseSdk.initializeApp(firebaseConfig, appName);
    const db = app.firestore();
    const auth = typeof firebaseSdk.auth === "function" ? firebaseSdk.auth(app) : null;
    return {
      enabled: true,
      db,
      auth,
      configStatus: "Firebase設定済み",
      appInitStatus: "Firebase app 初期化成功",
      firestoreInitStatus: "Firestore 初期化成功",
      authInitStatus: auth ? "Firebase Auth 初期化成功" : "Firebase Auth 未読込",
      initErrorMessage: "",
      initErrorCode: "",
      environmentLabel: devEnvironment ? "開発環境" : "",
    };
  } catch (e) {
    const details = getFirebaseErrorDetails(e);
    console.error("Firebase初期化エラー:", details, e);
    if (e && e.stack) console.error("Firebase初期化スタック:", e.stack);
    return {
      enabled: false,
      db: null,
      auth: null,
      configStatus: "Firebase設定済み",
      appInitStatus: "Firebase app 初期化失敗",
      firestoreInitStatus: "Firestore 初期化失敗",
      authInitStatus: "Firebase Auth 初期化失敗",
      initErrorMessage: details.message,
      initErrorCode: details.code,
      environmentLabel: devEnvironment ? "開発環境" : "",
    };
  }
}

function omitUndefinedFields(payload) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

function inferPrefectureFromRegion(region) {
  if (typeof region !== "string") return "";
  const normalized = region.trim();
  if (!normalized) return "";
  return PREFECTURES.find((prefecture) => normalized.startsWith(prefecture)) || "";
}

function buildRegionText(prefecture, city, fallbackRegion = "") {
  const normalizedPrefecture = typeof prefecture === "string" ? prefecture.trim() : "";
  const normalizedCity = typeof city === "string" ? city.trim() : "";
  if (normalizedPrefecture) return `${normalizedPrefecture}${normalizedCity}`;
  return typeof fallbackRegion === "string" ? fallbackRegion.trim() : "";
}

function normalizePublicRegionLevel(level) {
  if (level === "none" || level === "prefecture" || level === "city") return level;
  return "none";
}

function inferCityFromRegion(region, prefecture) {
  if (typeof region !== "string" || typeof prefecture !== "string") return "";
  const normalizedRegion = region.trim();
  const normalizedPrefecture = prefecture.trim();
  if (!normalizedRegion || !normalizedPrefecture) return "";
  if (!normalizedRegion.startsWith(normalizedPrefecture)) return "";
  return normalizedRegion.slice(normalizedPrefecture.length).trim();
}

function getFirebaseErrorDetails(error) {
  const code = error && typeof error.code === "string" && error.code.trim() ? error.code : "unknown";
  const message =
    error instanceof Error
      ? error.message
      : error && typeof error.message === "string" && error.message.trim() !== ""
        ? error.message
        : "不明なFirebaseエラー";
  return { code, message };
}

function generatePublicId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pub-${crypto.randomUUID()}`;
  }
  return `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeNameVisibility(value) {
  if (value === "public" || value === "anonymous" || value === "private") return value;
  return "public";
}

function normalizeProfileVisibility(value) {
  if (value === "private") return "private";
  return "public";
}

function buildPublicRegionLabel(prefecture, city, publicRegionLevel) {
  const normalizedPrefecture = typeof prefecture === "string" ? prefecture.trim() : "";
  const normalizedCity = typeof city === "string" ? city.trim() : "";
  const level = normalizePublicRegionLevel(publicRegionLevel);
  if (level === "none") return "地域非公開";
  if (level === "prefecture") return normalizedPrefecture || "地域非公開";
  return `${normalizedPrefecture}${normalizedCity}` || normalizedPrefecture || "地域非公開";
}

function isPublicCatEnabled(cat) {
  const profileVisibility = normalizeProfileVisibility(cat?.profileVisibility || cat?.visibility);
  return profileVisibility !== "private";
}

function toPublicCatPayload(cat, ownerUid) {
  const now = new Date().toISOString();
  const rawPrefecture = typeof cat.prefecture === "string" ? cat.prefecture.trim() : "";
  const rawCity = typeof cat.city === "string" ? cat.city.trim() : "";
  const publicRegionLevel = normalizePublicRegionLevel(cat.publicRegionLevel);
  const prefecture = publicRegionLevel === "none" ? "" : rawPrefecture;
  const city = publicRegionLevel === "city" ? rawCity : "";
  const publicRegionLabel = buildPublicRegionLabel(prefecture, city, publicRegionLevel);
  const nameVisibility = normalizeNameVisibility(cat.nameVisibility);
  const displayName = nameVisibility === "public" ? cat.name : "匿名のねこちゃん";
  const payload = {
    publicId: cat.publicId,
    sourceCatId: String(cat.id),
    ownerUid,
    displayName,
    nameVisibility,
    age: Number(cat.age),
    sex: cat.gender ?? cat.sex,
    coatPattern: cat.coatPattern || "",
    prefecture,
    city,
    publicRegionLevel,
    publicRegionLabel,
    hasLocalImage: Boolean(cat.photoImage),
    createdAt: cat.publicCreatedAt || now,
    updatedAt: now,
  };
  return omitUndefinedFields(payload);
}

function toFirestoreCatPayload(cat, ownerUid) {
  const now = new Date().toISOString();
  const prefecture = typeof cat.prefecture === "string" ? cat.prefecture.trim() : "";
  const city = typeof cat.city === "string" ? cat.city.trim() : "";
  const payload = {
    ownerUid,
    name: cat.name,
    age: Number(cat.age),
    sex: cat.gender ?? cat.sex,
    prefecture,
    city,
    region: buildRegionText(prefecture, city, cat.region),
    publicRegionLevel: normalizePublicRegionLevel(cat.publicRegionLevel),
    publicId: cat.publicId || "",
    profileVisibility: normalizeProfileVisibility(cat.profileVisibility),
    nameVisibility: normalizeNameVisibility(cat.nameVisibility),
    coatPattern: cat.coatPattern || "",
    currentWeightKg: cat.currentWeightKg === "" ? null : Number(cat.currentWeightKg),
    visibility: cat.visibility || "private",
    hasLocalImage: Boolean(cat.photoImage),
    createdAt: cat.createdAt || now,
    updatedAt: now,
  };
  return omitUndefinedFields(payload);
}

function toFirestoreRecordPayload(record, catId, ownerUid) {
  const now = new Date().toISOString();
  const payload = {
    ownerUid,
    catId: String(catId),
    recordDate: record.date,
    date: record.date,
    foodAmount: Number(record.foodTotal),
    foodGram: Number(record.foodTotal),
    dryRatio: Number(record.kibblePct),
    wetRatio: Number(record.wetPct),
    waterMl: Number(record.waterTotal),
    treatLevel: record.snack,
    poopCount: Number(record.poop),
    peeCount: Number(record.pee),
    weightKg: record.weightKg === "" ? null : Number(record.weightKg),
    memo: typeof record.memo === "string" ? record.memo : "",
    visibility: record.isPrivate ? "private" : "public",
    createdAt: record.createdAt || now,
    updatedAt: now,
  };
  return omitUndefinedFields(payload);
}

function toPublicFoodRecordPayload(record, cat, ownerUid) {
  const now = new Date().toISOString();
  const nameVisibility = normalizeNameVisibility(cat?.nameVisibility);
  const displayName = nameVisibility === "public" ? cat?.name || "匿名のねこちゃん" : "匿名のねこちゃん";
  const payload = {
    ownerUid,
    sourceCatId: String(cat?.id),
    publicFoodRecordId: `public_food_${ownerUid}${String(cat?.id)}${record?.date}`,
    recordDate: record?.date,
    foodAmount: Number(record?.foodTotal),
    waterMl: Number(record?.waterTotal),
    treatLevel: typeof record?.snack === "string" ? record.snack : "",
    poopCount: Number(record?.poop),
    peeCount: Number(record?.pee),
    displayName,
    createdAt: record?.createdAt || now,
    updatedAt: now,
  };
  return omitUndefinedFields(payload);
}


const sampleCats = [
  {
    id: 1,
    name: "もなか",
    age: 3,
    gender: "♀",
    coatPattern: "茶白",
    photo: "🐱",
    color: "#E8B86D",
    prefecture: "千葉県",
    city: "浦安市",
    region: "千葉県浦安市",
    publicRegionLevel: "city",
    currentWeightKg: 4.2,
    source: "sample",
  },
  {
    id: 2,
    name: "あんこ",
    age: 7,
    gender: "♂",
    coatPattern: "黒猫",
    photo: "🐈‍⬛",
    color: "#5C5048",
    prefecture: "千葉県",
    city: "浦安市",
    region: "千葉県浦安市",
    publicRegionLevel: "city",
    currentWeightKg: 5.1,
    source: "sample",
  },
];

const sampleLogsByCat = {
  1: [
    {
      id: 1,
      date: todayKey(),
      foodTotal: 70,
      waterTotal: 190,
      kibblePct: 70,
      wetPct: 30,
      snack: "ふつう",
      poop: 1,
      pee: 3,
      weightKg: 4.2,
      isPrivate: false,
      source: "sample",
    },
    {
      id: 2,
      date: daysAgoKey(1),
      foodTotal: 66,
      waterTotal: 175,
      kibblePct: 65,
      wetPct: 35,
      snack: "少なめ",
      poop: 1,
      pee: 3,
      weightKg: 4.1,
      isPrivate: false,
      source: "sample",
    },
  ],
  2: [
    {
      id: 3,
      date: todayKey(),
      foodTotal: 82,
      waterTotal: 210,
      kibblePct: 75,
      wetPct: 25,
      snack: "少なめ",
      poop: 2,
      pee: 4,
      weightKg: 5.1,
      isPrivate: true,
      source: "sample",
    },
  ],
};

const palette = {
  paper: "#F5EFE0",
  paperDeep: "#EDE4CD",
  ink: "#3A2E27",
  inkSoft: "#6B5B4F",
  accent: "#C8553D",
  accentSoft: "#E8967A",
  leaf: "#7A8B5C",
  cream: "#FAF6EA",
  line: "#D9CCB0",
};

const fontDisplay = "'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', serif";
const fontBody = "'Zen Kaku Gothic New', 'Hiragino Sans', sans-serif";

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return toLocalDateKey(new Date());
}

function daysAgoKey(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toLocalDateKey(d);
}

function parseDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthLabel(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function monthCellDates(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    const cellDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
    cells.push(toLocalDateKey(cellDate));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function buildInitialData() {
  return {
    cats: sampleCats,
    logsByCat: sampleLogsByCat,
    nextIds: { cat: 100, log: 500 },
  };
}



function CalendarPawIcon({ color = palette.leaf }) {
  const toeStyle = {
    position: "absolute",
    width: 3,
    height: 3.8,
    borderRadius: "50%",
    background: color,
    opacity: 0.82,
  };

  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "inline-block",
        width: 12,
        height: 9,
      }}
    >
      <span style={{ ...toeStyle, left: 0.6, top: 0.4, transform: "rotate(-16deg)" }} />
      <span style={{ ...toeStyle, left: 3.6, top: -0.1 }} />
      <span style={{ ...toeStyle, right: 3.4, top: -0.1 }} />
      <span style={{ ...toeStyle, right: 0.4, top: 0.4, transform: "rotate(16deg)" }} />
      <span
        style={{
          position: "absolute",
          left: 2.1,
          bottom: 0,
          width: 7.6,
          height: 4.8,
          borderRadius: "56% 56% 62% 62%",
          background: color,
          opacity: 0.9,
        }}
      />
    </span>
  );
}
function newLogDraft(date = todayKey()) {
  return {
    date,
    foodTotal: 0,
    waterTotal: 0,
    kibblePct: 0,
    wetPct: 0,
    snack: "なし",
    poop: 0,
    pee: 0,
    weightKg: "",
    memo: "",
    isPrivate: false,
    shareFoodToPublic: false,
  };
}

function parseWeight(weight) {
  if (weight === "" || weight === null || weight === undefined) return null;
  const num = typeof weight === "number" ? weight : Number(weight);
  if (!Number.isFinite(num)) return Number.NaN;
  return Math.round(num * 10) / 10;
}

function formatWeight(weight) {
  const parsed = parseWeight(weight);
  if (parsed === null || Number.isNaN(parsed)) return null;
  return parsed.toFixed(1);
}

function hasAtMostOneDecimal(weight) {
  if (weight === "" || weight === null || weight === undefined) return true;
  if (typeof weight === "number") return Number.isInteger(weight * 10);
  return /^\d+(\.\d)?$/.test(weight.trim());
}

const CAT_AVATAR_COLORS = ["#D9A86A", "#E0B77D", "#CFA06D", "#C4A07A", "#D6B088"];

function getCatAvatarColor(cat) {
  const rawId = typeof cat?.id === "number" ? cat.id : Number(cat?.id) || 0;
  const index = Math.abs(rawId) % CAT_AVATAR_COLORS.length;
  return CAT_AVATAR_COLORS[index];
}

function validateCatForm(form) {
  const errors = [];
  if (!form.name.trim()) errors.push("名前は必須です。");
  const ageNum = Number(form.age);
  if (!Number.isInteger(ageNum) || ageNum < 0 || ageNum > 30) errors.push("年齢は0〜30の整数で入力してください。");
  if (!["♂", "♀"].includes(form.gender)) errors.push("性別は♂または♀を選択してください。");
  if (!form.prefecture.trim() && !(form.legacyRegion || "").trim()) {
    errors.push("都道府県は必須です。");
  }
  if (form.currentWeightKg !== "") {
    const weight = parseWeight(form.currentWeightKg);
    if (!hasAtMostOneDecimal(form.currentWeightKg) || Number.isNaN(weight) || weight <= 0 || weight >= 30) {
      errors.push("現在の体重は0より大きく30未満で入力してください（小数1桁）。");
    }
  }
  return errors;
}

function validateLogForm(form) {
  const errors = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) errors.push("日付は必須です。");
  if (form.foodTotal < 0 || form.foodTotal > 150) errors.push("ごはん量は0〜150gで入力してください。");
  if (form.waterTotal < 0 || form.waterTotal > 500) errors.push("飲水量は0〜500mlで入力してください。");
  if (form.kibblePct < 0 || form.kibblePct > 100) errors.push("カリカリ比率は0〜100で入力してください。");
  if (form.wetPct < 0 || form.wetPct > 100) errors.push("ウェット比率は0〜100で入力してください。");
  const ratioTotal = form.kibblePct + form.wetPct;
  if (form.foodTotal === 0) {
    if (ratioTotal !== 0) errors.push("ごはん量が0gの場合、カリカリとウェットの比率はどちらも0%にしてください。");
  } else if (ratioTotal !== 100) {
    errors.push("カリカリとウェットの比率合計は100にしてください。");
  }
  if (form.poop < 0 || form.poop > 20 || form.pee < 0 || form.pee > 20) errors.push("排泄回数は0〜20回で入力してください。");
  if (form.weightKg !== "") {
    const weight = parseWeight(form.weightKg);
    if (!hasAtMostOneDecimal(form.weightKg) || Number.isNaN(weight) || weight <= 0 || weight >= 30) {
      errors.push("今日の体重は0より大きく30未満で入力してください（小数1桁）。");
    }
  }
  return errors;
}

function normalizeLogsByCat(logsByCat) {
  if (!logsByCat || typeof logsByCat !== "object") return sampleLogsByCat;
  const normalized = {};
  for (const [catId, rows] of Object.entries(logsByCat)) {
    normalized[catId] = Array.isArray(rows)
      ? rows.map((row) => ({
          ...row,
          waterTotal: typeof row.waterTotal === "number" ? row.waterTotal : 0,
          weightKg: formatWeight(row.weightKg) ?? "",
          memo: typeof row.memo === "string" ? row.memo : "",
          shareFoodToPublic: Boolean(row.shareFoodToPublic),
        }))
      : [];
  }
  return normalized;
}

function normalizeCats(cats) {
  if (!Array.isArray(cats)) return sampleCats;
  return cats.map((cat) => {
    const prefecture = typeof cat.prefecture === "string" ? cat.prefecture : inferPrefectureFromRegion(cat.region);
    const city =
      typeof cat.city === "string" ? cat.city : inferCityFromRegion(typeof cat.region === "string" ? cat.region : "", prefecture);
    return {
      ...cat,
      prefecture,
      city,
      region: buildRegionText(prefecture, city, typeof cat.region === "string" ? cat.region : ""),
      publicRegionLevel: normalizePublicRegionLevel(cat.publicRegionLevel),
      publicId: typeof cat.publicId === "string" && cat.publicId ? cat.publicId : generatePublicId(),
      profileVisibility: normalizeProfileVisibility(cat.profileVisibility),
      nameVisibility: normalizeNameVisibility(cat.nameVisibility),
      coatPattern: typeof cat.coatPattern === "string" ? cat.coatPattern : "",
      photoImage: typeof cat.photoImage === "string" ? cat.photoImage : "",
      publicCreatedAt: typeof cat.publicCreatedAt === "string" ? cat.publicCreatedAt : "",
      currentWeightKg: formatWeight(cat.currentWeightKg) ?? "",
    };
  });
}

function hydrateLogDraft(log) {
  if (!log) return newLogDraft();
  return {
    ...newLogDraft(log.date),
    ...log,
    weightKg: formatWeight(log.weightKg) ?? "",
  };
}

function loadInitialDataSafely() {
  const fallback = buildInitialData();
  try {
    const raw = safeLocalStorageGet(STORAGE_KEY);
    if (!raw) {
      return { data: fallback, allowAutoSave: true, loadError: false };
    }
    const parsed = JSON.parse(raw);
    return {
      data: {
        cats: normalizeCats(parsed?.cats),
        logsByCat: normalizeLogsByCat(parsed?.logsByCat),
        nextIds: parsed?.nextIds || { cat: 100, log: 500 },
      },
      allowAutoSave: true,
      loadError: false,
    };
  } catch (_e) {
    return { data: fallback, allowAutoSave: false, loadError: true };
  }
}

function CatHealthApp() {
  const [localOwnerUid] = useState(() => getOrCreateAnonymousOwnerId());
  const [authOwnerUid, setAuthOwnerUid] = useState("");
  const [firestoreGateway] = useState(() => createFirestoreGateway());
  const [firebaseStatus, setFirebaseStatus] = useState(
    firestoreGateway.firestoreInitStatus === "Firestore 初期化成功" ? "Firebase保存可能" : "Firebase保存エラー",
  );
  const [firebaseDebug, setFirebaseDebug] = useState(() => ({
    configStatus: firestoreGateway.configStatus,
    appInitStatus: firestoreGateway.appInitStatus,
    firestoreInitStatus: firestoreGateway.firestoreInitStatus,
    authInitStatus: firestoreGateway.authInitStatus,
    authStatus: "未認証",
    lastCatSaveResult: "未実行",
    lastPublicCatSaveResult: "未実行",
    lastPublicCatsLoadResult: "未実行",
    lastPublicCatsLoadCondition: "未実行",
    lastRecordSaveResult: "未実行",
    lastConnectionTestResult: "未実行",
    authUid: "",
    fallbackOwnerId: localOwnerUid,
    activeOwnerUid: localOwnerUid,
    ownerUidType: "localStorage fallback",
    lastCatSavedOwnerUid: "未実行",
    lastRecordSavedOwnerUid: "未実行",
    lastRecordCollection: "未実行",
    lastRecordId: "未実行",
    lastRecordAuthUid: "未実行",
    lastRecordPayloadOwnerUid: "未実行",
    lastRecordCatId: "未実行",
    lastRecordDate: "未実行",
    lastRecordWriteMode: "未実行",
    lastRecordDocExists: "未実行",
    lastRecordExistingOwnerUid: "未実行",
    lastRecordAuthTokenUid: "未実行",
    lastAuthAppName: firestoreGateway.auth?.app?.name || "未取得",
    lastDbAppName: firestoreGateway.db?.app?.name || "未取得",
    lastAuthProjectId: firestoreGateway.auth?.app?.options?.projectId || "未取得",
    lastDbProjectId: firestoreGateway.db?.app?.options?.projectId || "未取得",
    lastRecordPath: "未実行",
    lastErrorCode: firestoreGateway.initErrorCode || "",
    lastErrorMessage: firestoreGateway.initErrorMessage || "",
  }));
  const ownerResolution = useMemo(() => {
    const authUidFromCurrentUser = firestoreGateway.auth?.currentUser?.uid || "";
    const authUid = authUidFromCurrentUser || authOwnerUid || "";
    if (authUid) {
      return {
        authUid,
        fallbackOwnerId: localOwnerUid,
        activeOwnerUid: authUid,
        ownerUidType: "Firebase Auth",
      };
    }
    return {
      authUid: "",
      fallbackOwnerId: localOwnerUid,
      activeOwnerUid: localOwnerUid,
      ownerUidType: "localStorage fallback",
    };
  }, [authOwnerUid, firestoreGateway.auth, localOwnerUid]);
  const [tab, setTab] = useState("home");
  const initialLoadRef = useRef(null);
  if (!initialLoadRef.current) {
    initialLoadRef.current = loadInitialDataSafely();
  }
  const [data, setData] = useState(initialLoadRef.current.data);
  const [allowAutoSave] = useState(initialLoadRef.current.allowAutoSave);

  const [selectedCatId, setSelectedCatId] = useState(() => data.cats[0]?.id ?? null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (initialLoadRef.current?.loadError) {
      setMessage("端末データの読み込みに失敗したため、保存は停止しています。rescue.html でバックアップを書き出してください。");
    }
  }, []);

  useEffect(() => {
    setFirebaseDebug((prev) => ({
      ...prev,
      authUid: ownerResolution.authUid,
      fallbackOwnerId: ownerResolution.fallbackOwnerId,
      activeOwnerUid: ownerResolution.activeOwnerUid,
      ownerUidType: ownerResolution.ownerUidType,
    }));
  }, [ownerResolution]);

  const updateFirestoreSaveDebug = (target, ok, ownerUid, errorCode = "", errorMessage = "") => {
    const resultText = ok ? `${target}: 保存成功` : `${target}: 保存失敗`;
    const errorText = ok ? "" : errorMessage || "不明なFirestoreエラー";
    if (ok) {
      console.log(`[Firestore] ${resultText}`);
    } else {
      console.error(`[Firestore] ${resultText}`, { code: errorCode || "なし", message: errorText });
    }
    setFirebaseDebug((prev) => ({
      ...prev,
      lastCatSaveResult: target === "猫プロフィール" ? resultText : prev.lastCatSaveResult,
      lastPublicCatSaveResult: target === "公開プロフィール" ? resultText : prev.lastPublicCatSaveResult,
      lastRecordSaveResult: target === "日次記録" ? resultText : prev.lastRecordSaveResult,
      lastCatSavedOwnerUid: target === "猫プロフィール" ? ownerUid : prev.lastCatSavedOwnerUid,
      lastRecordSavedOwnerUid: target === "日次記録" ? ownerUid : prev.lastRecordSavedOwnerUid,
      lastErrorCode: ok ? "" : errorCode,
      lastErrorMessage: errorText,
    }));
  };

  const updatePublicCatsLoadDebug = useCallback((resultText, errorCode = "", errorMessage = "", conditionText = "") => {
    setFirebaseDebug((prev) => ({
      ...prev,
      lastPublicCatsLoadResult: resultText,
      lastPublicCatsLoadCondition: conditionText || prev.lastPublicCatsLoadCondition,
      lastErrorCode: errorCode,
      lastErrorMessage: errorMessage,
    }));
  }, []);

  const ensureAuthenticatedUid = useCallback(async () => {
    if (!firestoreGateway.enabled || !firestoreGateway.auth) {
      throw { code: "auth/not-available", message: "Firebase Authが初期化されていません" };
    }
    if (!firestoreGateway.auth.currentUser?.uid) {
      await firestoreGateway.auth.signInAnonymously();
    }
    const currentUser = firestoreGateway.auth.currentUser;
    const uid = currentUser?.uid || "";
    if (!uid) {
      throw { code: "auth/uid-missing", message: "匿名ログイン後にuidを取得できませんでした" };
    }
    await currentUser.getIdToken(true);
    setAuthOwnerUid(uid);
    return uid;
  }, [firestoreGateway]);

  const [publicCatsReloadToken, setPublicCatsReloadToken] = useState(0);

  const saveCatToCloud = async (cat) => {
    let resolvedOwnerUid = "";
    if (!firestoreGateway.enabled || !firestoreGateway.db) {
      updateFirestoreSaveDebug(
        "猫プロフィール",
        false,
        resolvedOwnerUid,
        "firestore/not-initialized",
        "Firestore未初期化のため保存をスキップしました",
      );
      updateFirestoreSaveDebug(
        "公開プロフィール",
        false,
        resolvedOwnerUid,
        "firestore/not-initialized",
        "Firestore未初期化のため公開プロフィール保存をスキップしました",
      );
      return { ok: false };
    }
    try {
      resolvedOwnerUid = await ensureAuthenticatedUid();
      const payload = toFirestoreCatPayload(cat, resolvedOwnerUid);
      await firestoreGateway.db.collection("cats").doc(String(cat.id)).set(payload, { merge: true });
      if (isPublicCatEnabled(cat)) {
        const publicPayload = toPublicCatPayload(cat, resolvedOwnerUid);
        await firestoreGateway.db.collection("publicCats").doc(String(cat.publicId)).set(publicPayload, { merge: true });
        updateFirestoreSaveDebug("公開プロフィール", true, resolvedOwnerUid);
      } else if (cat.publicId) {
        await firestoreGateway.db.collection("publicCats").doc(String(cat.publicId)).delete();
        updateFirestoreSaveDebug("公開プロフィール", true, resolvedOwnerUid);
        setFirebaseDebug((prev) => ({ ...prev, lastPublicCatSaveResult: "公開プロフィール: 削除済み" }));
      } else {
        setFirebaseDebug((prev) => ({ ...prev, lastPublicCatSaveResult: "公開プロフィール: 未実行" }));
      }
      setFirebaseStatus("Firebase保存可能");
      updateFirestoreSaveDebug("猫プロフィール", true, resolvedOwnerUid);
      setPublicCatsReloadToken((prev) => prev + 1);
      return { ok: true };
    } catch (e) {
      setFirebaseStatus("Firebase保存エラー");
      console.error("[Firestore] 猫プロフィール保存エラー詳細", e);
      if (e && e.stack) console.error("[Firestore] 猫プロフィール保存エラースタック", e.stack);
      const details = getFirebaseErrorDetails(e);
      updateFirestoreSaveDebug("公開プロフィール", false, resolvedOwnerUid, details.code, details.message);
      updateFirestoreSaveDebug("猫プロフィール", false, resolvedOwnerUid, details.code, details.message);
      return { ok: false };
    }
  };

  const deleteCatFromCloud = async (catId) => {
    const target = data.cats.find((cat) => cat.id === catId);
    if (!firestoreGateway.enabled || !firestoreGateway.db) return;
    try {
      await firestoreGateway.db.collection("cats").doc(String(catId)).delete();
      if (target?.publicId) {
        await firestoreGateway.db.collection("publicCats").doc(String(target.publicId)).delete();
        setFirebaseDebug((prev) => ({ ...prev, lastPublicCatSaveResult: "公開プロフィール: 削除済み" }));
      }
      setFirebaseStatus("Firebase保存可能");
    } catch (_e) {
      setFirebaseStatus("Firebase保存エラー");
    }
  };

  const saveRecordToCloud = async (record, catId) => {
    let resolvedOwnerUid = "";
    const collectionName = "records";
    const recordDate = record?.date || todayKey();
    const recordId = `record_v2_${resolvedOwnerUid || "pending"}_${String(catId)}_${recordDate}`;
    const operation = "setDoc(merge:true)";
    if (!firestoreGateway.enabled || !firestoreGateway.db) {
      updateFirestoreSaveDebug(
        "日次記録",
        false,
        resolvedOwnerUid,
        "firestore/not-initialized",
        "Firestore未初期化のため保存をスキップしました",
      );
      return { ok: false, collectionName, recordId, operation, recordDate, catId: String(catId), authUid: "", payloadOwnerUid: "" };
    }
    try {
      resolvedOwnerUid = await ensureAuthenticatedUid();
      const safeRecordId = `record_v2_${resolvedOwnerUid}_${String(catId)}_${recordDate}`;
      const recordRef = firestoreGateway.db.collection(collectionName).doc(safeRecordId);
      const payload = toFirestoreRecordPayload(record, catId, resolvedOwnerUid);
      await recordRef.set(payload, { merge: true });
      setFirebaseDebug((prev) => ({
        ...prev,
        lastRecordCollection: collectionName,
        lastRecordId: safeRecordId,
        lastRecordAuthUid: resolvedOwnerUid,
        lastRecordPayloadOwnerUid: payload.ownerUid || "",
        lastRecordCatId: String(catId),
        lastRecordDate: recordDate,
        lastRecordWriteMode: operation,
        lastRecordDocExists: "not-checked",
        lastRecordExistingOwnerUid: "not-checked",
        lastRecordAuthTokenUid: "not-checked",
        lastAuthAppName: firestoreGateway.auth?.app?.name || "",
        lastDbAppName: firestoreGateway.db?.app?.name || "",
        lastAuthProjectId: firestoreGateway.auth?.app?.options?.projectId || "",
        lastDbProjectId: firestoreGateway.db?.app?.options?.projectId || "",
        lastRecordPath: `${collectionName}/${safeRecordId}`,
      }));
      setFirebaseStatus("Firebase保存可能");
      updateFirestoreSaveDebug("日次記録", true, resolvedOwnerUid);
      return {
        ok: true,
        errorCode: "",
        errorMessage: "",
        collectionName,
        recordId: safeRecordId,
        operation,
        recordDate,
        catId: String(catId),
        authUid: resolvedOwnerUid,
        payloadOwnerUid: payload.ownerUid || "",
      };
    } catch (e) {
      setFirebaseStatus("Firebase保存エラー");
      console.error("[Firestore] 日次記録保存エラー詳細", e);
      if (e && e.stack) console.error("[Firestore] 日次記録保存エラースタック", e.stack);
      const details = getFirebaseErrorDetails(e);
      setFirebaseDebug((prev) => ({
        ...prev,
        lastRecordCollection: collectionName,
        lastRecordId: `record_v2_${resolvedOwnerUid || "missing"}_${String(catId)}_${recordDate}`,
        lastRecordAuthUid: resolvedOwnerUid || "",
        lastRecordPayloadOwnerUid: resolvedOwnerUid || "",
        lastRecordCatId: String(catId),
        lastRecordDate: recordDate,
        lastRecordWriteMode: operation,
        lastRecordDocExists: "not-checked",
        lastRecordExistingOwnerUid: "not-checked",
        lastRecordAuthTokenUid: "not-checked",
        lastAuthAppName: firestoreGateway.auth?.app?.name || "",
        lastDbAppName: firestoreGateway.db?.app?.name || "",
        lastAuthProjectId: firestoreGateway.auth?.app?.options?.projectId || "",
        lastDbProjectId: firestoreGateway.db?.app?.options?.projectId || "",
        lastRecordPath: `${collectionName}/record_v2_${resolvedOwnerUid || "missing"}_${String(catId)}_${recordDate}`,
      }));
      updateFirestoreSaveDebug("日次記録", false, resolvedOwnerUid, details.code, details.message);
      return {
        ok: false,
        errorCode: details.code,
        errorMessage: details.message,
        collectionName,
        recordId: `record_v2_${resolvedOwnerUid || "missing"}_${String(catId)}_${recordDate}`,
        operation,
        recordDate,
        catId: String(catId),
        authUid: resolvedOwnerUid || "",
        payloadOwnerUid: resolvedOwnerUid || "",
      };
    }
  };

  const savePublicFoodRecordToCloud = async (record, cat) => {
    if (!firestoreGateway.enabled || !firestoreGateway.db) return { ok: false };
    try {
      const resolvedOwnerUid = await ensureAuthenticatedUid();
      const recordDate = record?.date || todayKey();
      const docId = `public_food_${resolvedOwnerUid}${String(cat.id)}${recordDate}`;
      const payload = toPublicFoodRecordPayload(record, cat, resolvedOwnerUid);
      await firestoreGateway.db.collection("publicFoodRecords").doc(docId).set(payload, { merge: true });
      return { ok: true };
    } catch (_e) {
      return { ok: false };
    }
  };

  const deletePublicFoodRecordFromCloud = async (catId, recordDate) => {
    if (!firestoreGateway.enabled || !firestoreGateway.db) return;
    try {
      const resolvedOwnerUid = await ensureAuthenticatedUid();
      const docId = `public_food_${resolvedOwnerUid}${String(catId)}${recordDate}`;
      await firestoreGateway.db.collection("publicFoodRecords").doc(docId).delete();
    } catch (_e) {
      // noop
    }
  };

  const runFirestoreConnectionTest = async () => {
    if (!firestoreGateway.enabled || !firestoreGateway.db) {
      const code = "firestore/not-initialized";
      const message = "Firestore未初期化のため接続テストを実行できません";
      console.error("[Firestore] 接続テスト失敗", { code, message });
      setFirebaseDebug((prev) => ({
        ...prev,
        lastConnectionTestResult: "Firestore接続テスト失敗",
        lastErrorCode: code,
        lastErrorMessage: message,
      }));
      setFirebaseStatus("Firebase保存エラー");
      return;
    }
    try {
      const payload = omitUndefinedFields({
        ownerUid: await ensureAuthenticatedUid(),
        createdAt: new Date().toISOString(),
        message: "firestore test",
      });
      await firestoreGateway.db.collection("debug").doc(`test-${Date.now()}`).set(payload, { merge: true });
      console.log("[Firestore] 接続テスト成功", payload);
      setFirebaseDebug((prev) => ({
        ...prev,
        lastConnectionTestResult: "Firestore接続テスト成功",
        lastErrorCode: "",
        lastErrorMessage: "",
      }));
      setFirebaseStatus("Firebase保存可能");
    } catch (e) {
      const details = getFirebaseErrorDetails(e);
      console.error("[Firestore] 接続テスト失敗", details, e);
      if (e && e.stack) console.error("[Firestore] 接続テスト失敗スタック", e.stack);
      setFirebaseDebug((prev) => ({
        ...prev,
        lastConnectionTestResult: "Firestore接続テスト失敗",
        lastErrorCode: details.code,
        lastErrorMessage: details.message,
      }));
      setFirebaseStatus("Firebase保存エラー");
    }
  };

  const deleteRecordFromCloud = async (logId) => {
    if (!firestoreGateway.enabled || !firestoreGateway.db) return;
    try {
      await firestoreGateway.db.collection("records").doc(String(logId)).delete();
      setFirebaseStatus("Firebase保存可能");
    } catch (_e) {
      setFirebaseStatus("Firebase保存エラー");
    }
  };

  useEffect(() => {
    if (!allowAutoSave) return;
    try {
      safeLocalStorageSet(STORAGE_KEY, JSON.stringify(data));
    } catch (_e) {
      setMessage("端末保存に失敗しました。ブラウザ設定をご確認ください。");
    }
  }, [allowAutoSave, data]);

  useEffect(() => {
    const runAnonymousAuth = async () => {
      if (!firestoreGateway.enabled || !firestoreGateway.auth) {
        setFirebaseDebug((prev) => ({
          ...prev,
          authStatus: "未認証",
        }));
        return;
      }
      setFirebaseDebug((prev) => ({
        ...prev,
        authStatus: "匿名ログイン中",
      }));
      try {
        const uid = firestoreGateway.auth.currentUser?.uid || (await firestoreGateway.auth.signInAnonymously())?.user?.uid || "";
        if (!uid) {
          throw new Error("匿名ログインでuidを取得できませんでした");
        }
        setAuthOwnerUid(uid);
        setFirebaseDebug((prev) => ({
          ...prev,
          authStatus: "匿名ログイン済み",
          lastErrorCode: "",
          lastErrorMessage: "",
        }));
      } catch (e) {
        const details = getFirebaseErrorDetails(e);
        console.error("[Firebase Auth] 匿名ログイン失敗", details, e);
        if (e && e.stack) console.error("[Firebase Auth] 匿名ログイン失敗スタック", e.stack);
        setFirebaseDebug((prev) => ({
          ...prev,
          authStatus: "認証エラー",
          lastErrorCode: details.code,
          lastErrorMessage: details.message,
        }));
      }
    };
    runAnonymousAuth();
  }, [firestoreGateway]);

  useEffect(() => {
    if (!data.cats.length) {
      setSelectedCatId(null);
      return;
    }
    if (!data.cats.some((c) => c.id === selectedCatId)) {
      setSelectedCatId(data.cats[0].id);
    }
  }, [data.cats, selectedCatId]);

  const selectedCat = data.cats.find((c) => c.id === selectedCatId) || null;

  const todayLogByCat = useMemo(() => {
    const t = todayKey();
    const map = {};
    for (const cat of data.cats) {
      const list = data.logsByCat[cat.id] || [];
      const log = list.find((row) => row.date === t);
      map[cat.id] = log || null;
    }
    return map;
  }, [data]);

  const updateCats = (updater) => {
    setData((prev) => ({ ...prev, cats: updater(prev.cats) }));
  };

  const addCat = async (form) => {
    const errors = validateCatForm(form);
    if (errors.length) return { ok: false, errors };

    const region = buildRegionText(form.prefecture, form.city, form.legacyRegion);
    const publicRegionLevel = normalizePublicRegionLevel(form.publicRegionLevel);
    let createdCat = null;
    setData((prev) => {
      const id = prev.nextIds.cat + 1;
      createdCat = {
        id,
        name: form.name.trim(),
        age: Number(form.age),
        gender: form.gender,
        coatPattern: form.coatPattern.trim(),
        photo: "🐱",
        prefecture: form.prefecture.trim(),
        city: form.city.trim(),
        region,
        publicRegionLevel,
        currentWeightKg: formatWeight(form.currentWeightKg) ?? "",
        photoImage: form.photoImage || "",
        publicId: generatePublicId(),
        profileVisibility: "public",
        nameVisibility: "public",
        publicCreatedAt: new Date().toISOString(),
        source: "user",
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        cats: [...prev.cats, createdCat],
        nextIds: { ...prev.nextIds, cat: id },
      };
    });
    const cloudResult = createdCat ? await saveCatToCloud(createdCat) : { ok: false };
    if (cloudResult.ok) {
      setMessage("猫プロフィールを保存しました");
    } else {
      setMessage("猫プロフィールを保存しました ✓ 端末には保存しましたが、Firebase保存に失敗しました");
    }
    return { ok: true };
  };

  const updateCat = async (catId, form) => {
    const errors = validateCatForm(form);
    if (errors.length) return { ok: false, errors };

    const region = buildRegionText(form.prefecture, form.city, form.legacyRegion);
    const target = data.cats.find((cat) => cat.id === catId);
    const publicRegionLevel = normalizePublicRegionLevel(form.publicRegionLevel);
    const updated = {
      ...target,
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      coatPattern: form.coatPattern.trim(),
      photo: target?.photo || "🐱",
      photoImage: form.photoImage || "",
      prefecture: form.prefecture.trim(),
      city: form.city.trim(),
      region,
      publicRegionLevel,
      publicId: target?.publicId || generatePublicId(),
      profileVisibility: normalizeProfileVisibility(target?.profileVisibility),
      nameVisibility: normalizeNameVisibility(target?.nameVisibility),
      publicCreatedAt: target?.publicCreatedAt || new Date().toISOString(),
      currentWeightKg: formatWeight(form.currentWeightKg) ?? "",
      updatedAt: new Date().toISOString(),
    };
    updateCats((cats) => cats.map((cat) => (cat.id === catId ? updated : cat)));
    const cloudResult = await saveCatToCloud(updated);
    if (cloudResult.ok) {
      setMessage("猫プロフィールを保存しました");
    } else {
      setMessage("猫プロフィールを保存しました ✓ 端末には保存しましたが、Firebase保存に失敗しました");
    }
    return { ok: true };
  };

  const deleteCat = (catId) => {
    if (!window.confirm("この猫プロフィールを削除しますか？\n関連する記録も削除されます。")) return;
    const relatedLogs = data.logsByCat[catId] || [];
    setData((prev) => {
      const nextCats = prev.cats.filter((c) => c.id !== catId);
      const nextLogs = { ...prev.logsByCat };
      delete nextLogs[catId];
      return { ...prev, cats: nextCats, logsByCat: nextLogs };
    });
    relatedLogs.forEach((log) => deleteRecordFromCloud(log.id));
    deleteCatFromCloud(catId);
    setMessage("猫プロフィールを削除しました。");
  };

  const saveLog = async (catId, draft, editingId) => {
    const normalizedDraft = {
      ...draft,
      weightKg: formatWeight(draft.weightKg) ?? "",
      memo: typeof draft.memo === "string" ? draft.memo : "",
    };
    const errors = validateLogForm(normalizedDraft);
    if (errors.length) return { ok: false, errors };

    let recordForCloud = null;
    setData((prev) => {
      const rows = prev.logsByCat[catId] || [];
      const existingByDate = rows.find((r) => r.date === normalizedDraft.date);
      if (existingByDate && existingByDate.id !== editingId) {
        return prev;
      }
      let nextRows;
      if (editingId) {
        nextRows = rows.map((row) =>
          row.id === editingId
            ? { ...row, ...normalizedDraft, updatedAt: new Date().toISOString() }
            : row,
        );
        recordForCloud = nextRows.find((row) => row.id === editingId) || null;
      } else {
        const id = prev.nextIds.log + 1;
        recordForCloud = { id, ...normalizedDraft, source: "user", createdAt: new Date().toISOString() };
        nextRows = [...rows, recordForCloud];
        return {
          ...prev,
          logsByCat: {
            ...prev.logsByCat,
            [catId]: nextRows.sort((a, b) => b.date.localeCompare(a.date)),
          },
          nextIds: { ...prev.nextIds, log: id },
        };
      }

      return {
        ...prev,
        logsByCat: {
          ...prev.logsByCat,
          [catId]: nextRows.sort((a, b) => b.date.localeCompare(a.date)),
        },
      };
    });

    const rows = data.logsByCat[catId] || [];
    const duplicate = rows.find((r) => r.date === normalizedDraft.date && r.id !== editingId);
    if (duplicate) {
      return { ok: false, errors: ["同じ日付の記録が既にあります。編集から更新してください。"] };
    }

    const cloudResult = recordForCloud
      ? await saveRecordToCloud(recordForCloud, catId)
      : { ok: false, errorCode: "records/not-created", errorMessage: "日次記録データを作成できませんでした" };
    const targetCat = data.cats.find((c) => c.id === catId);
    if (recordForCloud && targetCat) {
      const canShare = isPublicCatEnabled(targetCat);
      if (recordForCloud.shareFoodToPublic && canShare) {
        await savePublicFoodRecordToCloud(recordForCloud, targetCat);
      } else {
        await deletePublicFoodRecordFromCloud(catId, recordForCloud.date);
        if (recordForCloud.shareFoodToPublic && !canShare) {
          setMessage("プロフィール非公開のため、みんなには共有されません");
        }
      }
    }
    if (cloudResult.ok) {
      setMessage("今日の記録を保存しました");
    } else {
      setMessage(
        `今日の記録を保存しました ✓ 端末には保存しましたが、records setDoc 失敗（collection=${cloudResult.collectionName || "records"}, recordId=${cloudResult.recordId || "unknown"}, authUid=${cloudResult.authUid || "none"}, payload.ownerUid=${cloudResult.payloadOwnerUid || "none"}, catId=${cloudResult.catId || "unknown"}, recordDate=${cloudResult.recordDate || "unknown"}, op=${cloudResult.operation || "setDoc"}, code=${cloudResult.errorCode || "unknown"}, message=${cloudResult.errorMessage || "不明なエラー"}）`,
      );
    }
    return { ok: true };
  };

  const deleteLog = (catId, logId) => {
    if (!window.confirm("この日次記録を削除しますか？")) return;
    const rows = data.logsByCat[catId] || [];
    const targetLog = rows.find((row) => row.id === logId);
    setData((prev) => {
      const rows = prev.logsByCat[catId] || [];
      return {
        ...prev,
        logsByCat: {
          ...prev.logsByCat,
          [catId]: rows.filter((row) => row.id !== logId),
        },
      };
    });
    deleteRecordFromCloud(logId);
    if (targetLog?.date) deletePublicFoodRecordFromCloud(catId, targetLog.date);
    setMessage("日次記録を削除しました。");
  };

  const deleteSampleOnly = () => {
    if (!window.confirm("サンプルデータのみ削除しますか？\n追加したデータは残ります。")) return;
    setData((prev) => {
      const cats = prev.cats.filter((c) => c.source !== "sample");
      const logsByCat = {};
      for (const cat of cats) {
        const rows = (prev.logsByCat[cat.id] || []).filter((r) => r.source !== "sample");
        logsByCat[cat.id] = rows;
      }
      return { ...prev, cats, logsByCat };
    });
    setMessage("サンプルデータのみ削除しました。");
  };

  const resetAllData = () => {
    if (!window.confirm("全データを初期状態にリセットしますか？")) return;
    const initial = buildInitialData();
    setData(initial);
    setSelectedCatId(initial.cats[0]?.id ?? null);
    setMessage("全データを初期化しました。");
  };

  const exportData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : data;
      const payload = {
        appName: "にゃん・ノート",
        backupFormatVersion: "v1",
        exportedAt: new Date().toISOString(),
        cats: normalizeCats(parsed?.cats),
        logsByCat: normalizeLogsByCat(parsed?.logsByCat),
        nextIds: parsed?.nextIds || { cat: 100, log: 500 },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nyan-note-backup-${toLocalDateKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage("データを書き出しました ✓");
    } catch (_e) {
      setMessage("データの書き出しに失敗しました");
    }
  };

  const importBackupFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const isValidBackup =
        parsed &&
        parsed.backupFormatVersion === "v1" &&
        Array.isArray(parsed.cats) &&
        parsed.logsByCat &&
        typeof parsed.logsByCat === "object" &&
        !Array.isArray(parsed.logsByCat) &&
        parsed.nextIds;
      if (!isValidBackup) {
        setMessage("バックアップの読み込みに失敗しました");
        return;
      }
      const confirmed = window.confirm("現在の端末内データをバックアップ内容で置き換えます。よろしいですか？");
      if (!confirmed) return;
      const restoredData = {
        cats: normalizeCats(parsed.cats),
        logsByCat: normalizeLogsByCat(parsed.logsByCat),
        nextIds: parsed.nextIds || { cat: 100, log: 500 },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredData));
      setData(restoredData);
      setSelectedCatId(restoredData.cats[0]?.id ?? null);
      setMessage("バックアップを読み込みました ✓");
    } catch (_e) {
      setMessage("バックアップの読み込みに失敗しました");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.paper,
        backgroundImage: `radial-gradient(circle at 20% 10%, ${palette.paperDeep} 0%, transparent 40%), radial-gradient(circle at 80% 80%, ${palette.paperDeep} 0%, transparent 40%)`,
        color: palette.ink,
        fontFamily: fontBody,
        paddingBottom: "100px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.4,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
          mixBlendMode: "multiply",
          zIndex: 1,
        }}
      />

      <Header environmentLabel={firestoreGateway.environmentLabel} />

      <main style={{ position: "relative", zIndex: 2, padding: "0 20px", maxWidth: 480, margin: "0 auto" }}>
        {message && (
          <div style={{ ...cardStyle, background: "#FFF7E8", fontSize: 12, padding: "10px 14px" }}>
            {message}
          </div>
        )}
        {tab === "home" && (
          <HomeView
            cats={data.cats}
            todayLogByCat={todayLogByCat}
            selectedCatId={selectedCatId}
            onPick={(c) => setSelectedCatId(c.id)}
            onOpenTodayLog={(catId) => {
              setSelectedCatId(catId);
              setTab("log");
              setMessage("記録フォームを表示しました。");
            }}
            onAddCat={addCat}
            onUpdateCat={updateCat}
            onDeleteCat={deleteCat}
            onShowMessage={setMessage}
            onDeleteSampleOnly={deleteSampleOnly}
            onResetAllData={resetAllData}
            onExportData={exportData}
            onImportBackupFile={importBackupFile}
            firebaseStatus={firebaseStatus}
            firebaseDebug={firebaseDebug}
            onRunFirestoreConnectionTest={runFirestoreConnectionTest}
          />
        )}
        {tab === "mycat" && <MyCatView cats={data.cats} logsByCat={data.logsByCat} />}
        {tab === "log" && selectedCat && (
          <LogView
            cat={selectedCat}
            logs={data.logsByCat[selectedCat.id] || []}
            saveLog={saveLog}
            deleteLog={deleteLog}
            cats={data.cats}
            setSelectedCat={(c) => setSelectedCatId(c.id)}
            onMoveHome={() => setTab("home")}
            onShowMessage={setMessage}
          />
        )}
        {tab === "log" && !selectedCat && <EmptyCatPrompt onMoveLog={() => setTab("home")} />}
        {tab === "community" && (
          <CommunityView
            firestoreGateway={firestoreGateway}
            authOwnerUid={authOwnerUid}
            authStatus={firebaseDebug.authStatus}
            onUpdatePublicCatsLoadDebug={updatePublicCatsLoadDebug}
          />
        )}
        {tab === "stats" && (
          <StatsView firestoreGateway={firestoreGateway} authOwnerUid={authOwnerUid} authStatus={firebaseDebug.authStatus} />
        )}
      </main>

      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

function EmptyCatPrompt({ onMoveLog }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700 }}>猫プロフィールがありません</div>
      <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 6 }}>ホームタブから猫を追加してください。</div>
      <button
        onClick={onMoveLog}
        style={{
          marginTop: 10,
          border: `1px solid ${palette.line}`,
          background: "transparent",
          color: palette.ink,
          borderRadius: 8,
          padding: "8px 12px",
          cursor: "pointer",
        }}
      >
        ホームへ
      </button>
    </div>
  );
}

function Header({ environmentLabel = "" }) {
  return (
    <header
      style={{
        padding: "28px 20px 16px",
        textAlign: "center",
        position: "relative",
        zIndex: 2,
      }}
    >
      <div
        style={{
          fontFamily: fontDisplay,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: palette.ink,
        }}
      >
        にゃん
        <span style={{ color: palette.accent, margin: "0 4px" }}>•</span>
        ノート
      </div>
      <div
        style={{
          fontSize: 11,
          color: palette.inkSoft,
          letterSpacing: "0.3em",
          marginTop: 4,
          textTransform: "uppercase",
        }}
      >
        cat health journal
      </div>
      {environmentLabel && (
        <div style={{ fontSize: 10, color: palette.accent, marginTop: 6, letterSpacing: "0.08em" }}>{environmentLabel}</div>
      )}
      <div
        style={{
          height: 1,
          background: `repeating-linear-gradient(90deg, ${palette.line} 0, ${palette.line} 6px, transparent 6px, transparent 12px)`,
          margin: "16px auto 0",
          maxWidth: 240,
        }}
      />
    </header>
  );
}

function HomeView({
  cats,
  todayLogByCat,
  selectedCatId,
  onPick,
  onOpenTodayLog,
  onAddCat,
  onUpdateCat,
  onDeleteCat,
  onShowMessage,
  onDeleteSampleOnly,
  onResetAllData,
  onExportData,
  onImportBackupFile,
  firebaseStatus,
  firebaseDebug,
  onRunFirestoreConnectionTest,
}) {
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const [showAdd, setShowAdd] = useState(false);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [editingCatId, setEditingCatId] = useState(null);
  const [errors, setErrors] = useState([]);
  const importFileInputRef = useRef(null);
  const editFormRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    age: "",
    gender: "♀",
    coatPattern: "",
    photoImage: "",
    prefecture: "",
    city: "",
    publicRegionLevel: "prefecture",
    legacyRegion: "",
    currentWeightKg: "",
  });
  const selectedCat = cats.find((cat) => cat.id === selectedCatId) || cats[0] || null;
  const selectedCatTodayLog = selectedCat ? todayLogByCat[selectedCat.id] : null;

  const resetForm = () => {
    setForm({
      name: "",
      age: "",
      gender: "♀",
      coatPattern: "",
      photoImage: "",
      prefecture: "",
      city: "",
      publicRegionLevel: "prefecture",
      legacyRegion: "",
      currentWeightKg: "",
    });
    setErrors([]);
  };

  const beginEdit = (cat) => {
    setEditingCatId(cat.id);
    setShowAdd(false);
    setErrors([]);
    onShowMessage("編集フォームを表示しました。");
    const inferredPrefecture = typeof cat.prefecture === "string" && cat.prefecture ? cat.prefecture : inferPrefectureFromRegion(cat.region);
    const inferredCity =
      typeof cat.city === "string"
        ? cat.city
        : inferCityFromRegion(typeof cat.region === "string" ? cat.region : "", inferredPrefecture);
    setForm({
      name: cat.name,
      age: String(cat.age),
      gender: cat.gender,
      coatPattern: cat.coatPattern ?? "",
      photoImage: cat.photoImage || "",
      prefecture: inferredPrefecture,
      city: inferredCity,
      publicRegionLevel: normalizePublicRegionLevel(cat.publicRegionLevel),
      legacyRegion: typeof cat.region === "string" ? cat.region : "",
      currentWeightKg: cat.currentWeightKg ?? "",
    });
  };

  useEffect(() => {
    if (!editingCatId || !editFormRef.current) return;
    const topPadding = 28;
    const targetTop = editFormRef.current.getBoundingClientRect().top + window.scrollY - topPadding;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  }, [editingCatId]);

  const handlePhotoImageUpload = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const compressed = await compressImageFile(file);
      setForm((prev) => ({ ...prev, photoImage: compressed }));
    } catch (_error) {
      setErrors((prev) => [...prev, "画像の読み込みに失敗しました。別の画像をお試しください。"]);
    }
  };

  const submit = async () => {
    const result = editingCatId ? await onUpdateCat(editingCatId, form) : await onAddCat(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setEditingCatId(null);
    setShowAdd(false);
    resetForm();
  };

  return (
    <div>
      <SectionLabel left="今日の記録" right={dateStr} />
      {selectedCat && (
        <div style={{ ...cardStyle, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, color: palette.inkSoft, letterSpacing: "0.05em" }}>選択中の猫ちゃん</div>
              <div style={{ fontFamily: fontDisplay, fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                {selectedCat.name} <span style={{ fontSize: 13, color: palette.accent }}>{selectedCat.gender}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: selectedCatTodayLog ? palette.leaf : palette.accent, fontWeight: 700 }}>
                {selectedCatTodayLog ? "今日の記録済み ✓" : "今日の記録はまだです"}
              </div>
            </div>
            <MiniButton onClick={() => onOpenTodayLog(selectedCat.id)}>
              {selectedCatTodayLog ? "今日の記録を編集" : "今日の記録をつける"}
            </MiniButton>
          </div>
        </div>
      )}
      {cats.map((cat, i) => {
        const hasToday = Boolean(todayLogByCat[cat.id]);
        const isSelected = selectedCat?.id === cat.id;
        return (
          <div key={cat.id}>
            <button
              onClick={() => onPick(cat)}
              style={{
                ...cardStyle,
                display: "flex",
                alignItems: "center",
                gap: 16,
                width: "100%",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transform: i % 2 === 0 ? "rotate(-0.4deg)" : "rotate(0.4deg)",
                marginBottom: 6,
                border: isSelected ? `2px solid ${palette.accentSoft}` : `1px solid ${palette.line}`,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: getCatAvatarColor(cat),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                  flexShrink: 0,
                  boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.1)",
                }}
              >
                <CatAvatar cat={cat} size={64} fontSize={36} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700 }}>
                  {cat.name} <span style={{ fontSize: 14, color: palette.accent }}>{cat.gender}</span>
                </div>
                <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 2 }}>
                  {cat.age}歳 · {cat.region}
                </div>
                {cat.coatPattern && (
                  <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 2 }}>毛色・柄 {cat.coatPattern}</div>
                )}
                {cat.currentWeightKg && (
                  <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 2 }}>体重 {cat.currentWeightKg}kg</div>
                )}
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: hasToday ? palette.leaf : palette.accent,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                  }}
                >
                  {hasToday ? "✓ 今日の記録あり" : "◯ 今日の記録なし"}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                {isSelected && <div style={{ fontSize: 10, color: palette.accent, fontWeight: 700 }}>選択中</div>}
                <div style={{ fontSize: 24, color: palette.inkSoft }}>›</div>
              </div>
            </button>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12, marginTop: -2, flexWrap: "wrap" }}>
              <MiniButton onClick={() => onOpenTodayLog(cat.id)}>{hasToday ? "今日の記録を編集" : "今日の記録をつける"}</MiniButton>
              <MiniButton onClick={() => beginEdit(cat)}>編集</MiniButton>
              <MiniButton onClick={() => onDeleteCat(cat.id)}>削除</MiniButton>
            </div>
          </div>
        );
      })}

      {(showAdd || editingCatId) && (
        <div ref={editFormRef} style={cardStyle}>
          <Label>{editingCatId ? "猫プロフィールを編集" : "猫プロフィールを追加"}</Label>
          <FormErrorList errors={errors} />
          <InputRow label="名前">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          </InputRow>
          <InputRow label="年齢">
            <input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} style={inputStyle} />
          </InputRow>
          <InputRow label="性別">
            <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} style={inputStyle}>
              <option value="♀">♀</option>
              <option value="♂">♂</option>
            </select>
          </InputRow>
          <InputRow label="プロフィール画像">
            <div style={{ fontSize: 12, color: palette.ink, marginBottom: 6 }}>
              {form.photoImage ? "画像を変更する" : "新しい画像を選択"}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handlePhotoImageUpload(file);
                e.target.value = "";
              }}
              style={inputStyle}
            />
            {form.photoImage ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, color: palette.inkSoft }}>画像を設定済み</div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <img
                    src={form.photoImage}
                    alt="現在のプロフィール画像プレビュー"
                    style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${palette.line}` }}
                  />
                  <MiniButton onClick={() => setForm((prev) => ({ ...prev, photoImage: "" }))}>画像を削除</MiniButton>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 6 }}>画像未設定</div>
            )}
          </InputRow>
          <InputRow label="毛色・柄（任意）">
            <input
              value={form.coatPattern}
              onChange={(e) => setForm({ ...form, coatPattern: e.target.value })}
              style={inputStyle}
              placeholder="例: 茶白、キジトラ、三毛"
            />
          </InputRow>
          <InputRow label="都道府県">
            <select value={form.prefecture} onChange={(e) => setForm({ ...form, prefecture: e.target.value })} style={inputStyle}>
              <option value="">選択してください</option>
              {PREFECTURES.map((prefecture) => (
                <option key={prefecture} value={prefecture}>
                  {prefecture}
                </option>
              ))}
            </select>
          </InputRow>
          <InputRow label="市区町村（任意）">
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              style={inputStyle}
              placeholder="例: 浦安市"
            />
            {!form.prefecture && form.legacyRegion ? (
              <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 6 }}>
                既存データの地域: {form.legacyRegion}
              </div>
            ) : null}
          </InputRow>
          <InputRow label="地域の公開範囲">
            <select
              value={form.publicRegionLevel}
              onChange={(e) => setForm({ ...form, publicRegionLevel: e.target.value })}
              style={inputStyle}
            >
              <option value="none">非公開</option>
              <option value="prefecture">都道府県まで</option>
              <option value="city">市区町村まで</option>
            </select>
            <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 6 }}>みんな機能・統計で使います</div>
            <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 4, lineHeight: 1.5 }}>
              公開プロフィールは「みんな」画面に表示されます。日次記録・メモ・写真データは公開されません。
              <br />
              地域を非公開にすると都道府県・市区町村は表示されず、名前を非公開にすると「匿名のねこちゃん」と表示されます。
            </div>
          </InputRow>
          <InputRow label="現在の体重(kg)">
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="29.9"
              value={form.currentWeightKg}
              onChange={(e) => setForm({ ...form, currentWeightKg: e.target.value })}
              style={inputStyle}
            />
          </InputRow>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <MiniButton onClick={submit}>{editingCatId ? "更新" : "追加"}</MiniButton>
            <MiniButton
              onClick={() => {
                setEditingCatId(null);
                setShowAdd(false);
                resetForm();
              }}
            >
              キャンセル
            </MiniButton>
          </div>
        </div>
      )}

      {!showAdd && !editingCatId && (
        <button
          onClick={() => {
            setShowAdd(true);
            setEditingCatId(null);
            resetForm();
          }}
          style={{
            ...cardStyle,
            width: "100%",
            border: `2px dashed ${palette.line}`,
            background: "transparent",
            cursor: "pointer",
            color: palette.inkSoft,
            fontFamily: fontBody,
            fontSize: 14,
            padding: 24,
          }}
        >
          + 新しい猫ちゃんを登録
        </button>
      )}

      <div style={{ ...cardStyle, padding: "14px 14px 16px" }}>
        <div style={{ fontSize: 11, color: palette.inkSoft, letterSpacing: "0.05em", marginBottom: 4 }}>
          プライバシー・利用上の注意
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
          <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
            日次記録、メモ、写真データは「みんな」画面には公開されません。
          </li>
          <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
            「みんな」画面に表示されるのは公開プロフィールのみです。
          </li>
          <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
            地域非公開を選ぶと、都道府県・市区町村は公開されません。
          </li>
          <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
            本名、住所、電話番号などの個人情報は入力しないでください。
          </li>
        </ul>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href="./privacy.html"
              style={{
                display: "inline-block",
                fontSize: 11,
                color: palette.inkSoft,
                textDecoration: "none",
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              プライバシーポリシーを見る
            </a>
            <a
              href="./terms.html"
              style={{
                display: "inline-block",
                fontSize: 11,
                color: palette.inkSoft,
                textDecoration: "none",
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              利用規約を見る
            </a>
          </div>
          <a
            href="https://forms.gle/xH5jHSFsTLmWsDLw9"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              fontSize: 11,
              color: palette.inkSoft,
              textDecoration: "none",
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            ご意見・不具合報告はこちら
          </a>
        </div>
        <div style={{ marginTop: 10, fontSize: 10.5, color: "#8C7F72", lineHeight: 1.45 }}>
          ※現在β版です。表示や機能は予告なく変更される場合があります。
        </div>
      </div>

      {SHOW_DEV_MENU_IN_PUBLIC && <div style={devMenuCardStyle}>
        <button type="button" onClick={() => setShowDevMenu((prev) => !prev)} style={devMenuToggleStyle}>
          開発用メニュー {showDevMenu ? "▲" : "▼"}
        </button>
        {showDevMenu && (
          <>
            <div style={{ ...cardStyle, borderStyle: "dashed", marginTop: 10 }}>
              <Label>データ管理</Label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <MiniButton onClick={onDeleteSampleOnly}>サンプルだけ削除</MiniButton>
                <MiniButton onClick={onResetAllData}>全データをリセット</MiniButton>
                <MiniButton onClick={onExportData}>データを書き出す</MiniButton>
                <MiniButton onClick={() => importFileInputRef.current?.click()}>バックアップを読み込む</MiniButton>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    onImportBackupFile(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div style={{ ...cardStyle, padding: "12px 14px", marginTop: -4 }}>
              <div style={{ fontSize: 11, color: palette.inkSoft, letterSpacing: "0.05em", marginBottom: 4 }}>プライバシーについて</div>
              <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
                <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
                  猫プロフィール・日次記録・メモは、健康記録のために保存されます。
                </li>
                <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
                  日次記録・メモ・写真データは「みんな」画面に公開されません。
                </li>
                <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
                  「みんな」画面に表示されるのは公開プロフィールのみです。
                </li>
                <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
                  地域非公開を選ぶと、都道府県・市区町村は公開されません。
                </li>
                <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
                  本名・住所・電話番号などの個人情報は入力しないでください。
                </li>
                <li style={{ fontSize: 12, color: palette.ink, lineHeight: 1.5 }}>
                  大切な記録は、バックアップを書き出して保存できます。
                </li>
              </ul>
              <a
                href="./privacy.html"
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 12,
                  color: palette.accent,
                  textDecoration: "underline",
                  fontWeight: 700,
                }}
              >
                プライバシーポリシーを見る
              </a>
            </div>

            <div style={{ ...cardStyle, padding: "12px 14px", marginTop: -4 }}>
              <div style={{ fontSize: 11, color: palette.inkSoft, letterSpacing: "0.05em", marginBottom: 4 }}>Firebase診断</div>
              <div style={{ fontSize: 12, color: palette.ink }}>
                Firebase接続状態:{" "}
                <span style={{ color: firebaseStatus === "Firebase保存エラー" ? palette.accent : palette.inkSoft }}>{firebaseStatus}</span>
              </div>
              <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 6 }}>Firebase: {firebaseDebug.configStatus}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>Firebase app: {firebaseDebug.appInitStatus}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>Firestore: {firebaseDebug.firestoreInitStatus}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>Firebase Auth: {firebaseDebug.authInitStatus}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>認証状態: {firebaseDebug.authStatus}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>Firebase Auth uid: {firebaseDebug.authUid || "なし"}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>
                localStorage fallback ownerId: {firebaseDebug.fallbackOwnerId || "なし"}
              </div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>現在保存に使っている ownerUid: {firebaseDebug.activeOwnerUid || "なし"}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>ownerUidの種類: {firebaseDebug.ownerUidType}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>最後の猫プロフィール保存結果: {firebaseDebug.lastCatSaveResult}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>最後の公開プロフィール保存結果: {firebaseDebug.lastPublicCatSaveResult}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>最後の publicCats 読み込み結果: {firebaseDebug.lastPublicCatsLoadResult}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>
                最後の公開プロフィール読み込み条件: {firebaseDebug.lastPublicCatsLoadCondition}
              </div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>最後に猫プロフィール保存で使った ownerUid: {firebaseDebug.lastCatSavedOwnerUid}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>最後の日次記録保存結果: {firebaseDebug.lastRecordSaveResult}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>最後に日次記録保存で使った ownerUid: {firebaseDebug.lastRecordSavedOwnerUid}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録の保存先コレクション: {firebaseDebug.lastRecordCollection}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録の recordId: {firebaseDebug.lastRecordId}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録保存時 auth.currentUser.uid: {firebaseDebug.lastRecordAuthUid}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録 payload.ownerUid: {firebaseDebug.lastRecordPayloadOwnerUid}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>auth.app.name / db.app.name: {firebaseDebug.lastAuthAppName} / {firebaseDebug.lastDbAppName}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>auth.projectId / db.projectId: {firebaseDebug.lastAuthProjectId} / {firebaseDebug.lastDbProjectId}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録保存 path: {firebaseDebug.lastRecordPath}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>recordDocExists: {firebaseDebug.lastRecordDocExists}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>existingOwnerUid: {firebaseDebug.lastRecordExistingOwnerUid}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>ID Token uid相当: {firebaseDebug.lastRecordAuthTokenUid}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録 catId: {firebaseDebug.lastRecordCatId}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録 recordDate: {firebaseDebug.lastRecordDate}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>日次記録の保存方式: {firebaseDebug.lastRecordWriteMode}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>Firestore接続テスト: {firebaseDebug.lastConnectionTestResult}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>最後のFirebaseエラーコード: {firebaseDebug.lastErrorCode || "なし"}</div>
              <div style={{ fontSize: 11, color: palette.inkSoft }}>
                最後のFirebaseエラーメッセージ: {firebaseDebug.lastErrorMessage || "なし"}
              </div>
              <div style={{ marginTop: 8 }}>
                <MiniButton onClick={onRunFirestoreConnectionTest}>Firestore接続テスト</MiniButton>
              </div>
            </div>
          </>
        )}
      </div>}
    </div>
  );
}

function MyCatView({ cats, logsByCat }) {
  if (!cats.length) {
    return (
      <div>
        <SectionLabel left="わが家の猫たち" />
        <div style={cardStyle}>猫を登録してください</div>
      </div>
    );
  }

  const getLatestLog = (catId) => {
    const rows = logsByCat[catId] || [];
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.date.localeCompare(a.date))[0];
  };

  return (
    <div>
      <SectionLabel left="わが家の猫たち" right={`${cats.length}匹`} />
      {cats.map((cat, i) => {
        const latestLog = getLatestLog(cat.id);
        return (
          <div
            key={cat.id}
            style={{
              ...cardStyle,
              transform: i % 2 === 0 ? "rotate(-0.3deg)" : "rotate(0.3deg)",
            }}
          >
            <div style={{ display: "flex", gap: 14 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: getCatAvatarColor(cat),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  flexShrink: 0,
                  boxShadow: "inset 0 -4px 8px rgba(0,0,0,0.1)",
                }}
              >
                <CatAvatar cat={cat} size={64} fontSize={34} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 700 }}>
                  {cat.name} <span style={{ fontSize: 14, color: palette.accent }}>{cat.gender}</span>
                </div>
                <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 2 }}>
                  {cat.age}歳 · {cat.region}
                </div>
                <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 2 }}>毛色・柄 {cat.coatPattern?.trim() || "未設定"}</div>
                <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 2 }}>現在の体重 {cat.currentWeightKg || "未入力"}{cat.currentWeightKg ? "kg" : ""}</div>
              </div>
            </div>
            <div style={{ borderTop: `1px dashed ${palette.line}`, marginTop: 10, paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: palette.inkSoft, marginBottom: 4 }}>最新の日次記録</div>
              {latestLog ? (
                <div style={{ fontSize: 12, color: palette.ink, lineHeight: 1.7 }}>
                  {latestLog.date} / ごはん量 {latestLog.foodTotal}g / 飲水量 {latestLog.waterTotal}ml / おやつ量 {latestLog.snack}
                  <br />
                  うんち回数 {latestLog.poop}回 / おしっこ回数 {latestLog.pee}回
                  {latestLog.weightKg !== "" && latestLog.weightKg != null ? ` / 体重 ${Number(latestLog.weightKg).toFixed(1)}kg` : ""}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: palette.accent, fontWeight: 700 }}>まだ記録がありません</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LogView({ cat, logs, saveLog, deleteLog, cats, setSelectedCat, onMoveHome, onShowMessage }) {
  const [draft, setDraft] = useState(newLogDraft());
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey());
  const logFormRef = useRef(null);

  const scrollToLogForm = () => {
    if (!logFormRef.current) return;
    const topPadding = 24;
    const targetTop = logFormRef.current.getBoundingClientRect().top + window.scrollY - topPadding;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const today = logs.find((l) => l.date === todayKey());
    setDraft(hydrateLogDraft(today));
    setEditingId(today?.id || null);
    setErrors([]);
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateKey(todayKey());
  }, [cat.id, logs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      scrollToLogForm();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cat.id]);

  const setKibble = (v) => {
    const next = Math.max(0, Math.min(100, Number.isFinite(v) ? Math.round(v) : 0));
    setDraft({ ...draft, kibblePct: next, wetPct: 100 - next });
  };
  const setFoodTotal = (v) => {
    const next = Math.max(0, Math.min(150, Number.isFinite(v) ? Math.round(v) : 0));
    setDraft({ ...draft, foodTotal: next });
  };
  const setWaterTotal = (v) => {
    const next = Math.max(0, Math.min(500, Number.isFinite(v) ? Math.round(v) : 0));
    setDraft({ ...draft, waterTotal: next });
  };

  const onSubmit = async () => {
    const result = await saveLog(cat.id, draft, editingId);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setLastSaved({ ...draft, catName: cat.name, catPhoto: cat.photo });
  };

  const startEdit = (log) => {
    setDraft(hydrateLogDraft(log));
    setEditingId(log.id);
    setErrors([]);
    if (onShowMessage) onShowMessage("記録フォームを表示しました。");
    window.setTimeout(() => {
      scrollToLogForm();
    }, 0);
  };

  const sortedLogs = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  const logMapByDate = Object.fromEntries(logs.map((row) => [row.date, row]));
  const calendarCells = monthCellDates(calendarMonth);
  const selectedLog = logMapByDate[selectedDateKey] || null;
  const selectedDateObj = parseDateKey(selectedDateKey);
  const selectedDateLabel = selectedDateObj
    ? `${selectedDateObj.getFullYear()}年${selectedDateObj.getMonth() + 1}月${selectedDateObj.getDate()}日`
    : selectedDateKey;

  return (
    <div>
      <SectionLabel left="きょうの記録" right="🖋" />

      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        {cats.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCat(c)}
            style={{
              flexShrink: 0,
              padding: "8px 14px",
              borderRadius: 999,
              border: cat.id === c.id ? `2px solid ${palette.accent}` : `1px solid ${palette.line}`,
              background: cat.id === c.id ? palette.cream : "transparent",
              fontFamily: fontBody,
              fontSize: 13,
              cursor: "pointer",
              color: palette.ink,
            }}
          >
            <span style={{ marginRight: 6, display: "inline-flex", verticalAlign: "middle" }}>
              <CatAvatar cat={c} size={18} fontSize={12} />
            </span>
            {c.name}
          </button>
        ))}
      </div>

      <div ref={logFormRef} style={cardStyle}>
        <Label>📅 記録日</Label>
        <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} />
      </div>

      <div style={cardStyle}>
        <Label>🍚 一日のごはんの量</Label>
        <StepNumberInput
          value={draft.foodTotal}
          unit="g"
          min={0}
          max={150}
          step={5}
          color={palette.accent}
          onChange={setFoodTotal}
        />

        <div style={{ marginTop: 20 }}>
          <Label>カリカリ / ウェット の比率</Label>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: palette.inkSoft, marginBottom: 6 }}>
            <span>カリカリ {draft.kibblePct}%</span>
            <span>ウェット {draft.wetPct}%</span>
          </div>
          <RatioBar kibble={draft.kibblePct} wet={draft.wetPct} />
          <RatioSelector kibble={draft.kibblePct} wet={draft.wetPct} onChange={setKibble} />
        </div>
      </div>

      <div style={cardStyle}>
        <Label>💧 一日の飲水量</Label>
        <StepNumberInput
          value={draft.waterTotal}
          unit="ml"
          min={0}
          max={500}
          step={5}
          color={palette.leaf}
          onChange={setWaterTotal}
        />
      </div>

      <div style={cardStyle}>
        <Label>⚖️ 今日の体重（任意）</Label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          max="29.9"
          value={draft.weightKg}
          onChange={(e) => setDraft({ ...draft, weightKg: e.target.value })}
          style={inputStyle}
          placeholder="例: 4.2"
        />
      </div>

      <div style={cardStyle}>
        <Label>🍪 おやつの量</Label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["なし", "少なめ", "ふつう", "多め"].map((opt) => (
            <Pill key={opt} active={draft.snack === opt} onClick={() => setDraft({ ...draft, snack: opt })}>
              {opt}
            </Pill>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <Label>💩 うんち回数 / 💧 おしっこ回数</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          <Counter label="うんち回数" value={draft.poop} unit="回" setValue={(v) => setDraft({ ...draft, poop: v })} />
          <Counter label="おしっこ回数" value={draft.pee} unit="回" setValue={(v) => setDraft({ ...draft, pee: v })} />
        </div>
      </div>

      <div style={cardStyle}>
        <Label>📝 メモ</Label>
        <textarea
          value={draft.memo}
          onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
          style={{ ...inputStyle, minHeight: 96, resize: "vertical", lineHeight: 1.5 }}
          placeholder="食いつき・体調・気になったこと"
        />
      </div>

      <div style={cardStyle}>
        <button
          onClick={() => setDraft({ ...draft, isPrivate: !draft.isPrivate })}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: palette.ink }}>
            {draft.isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
            {draft.isPrivate ? "名前を伏せて共有" : "名前ありで共有"}
          </span>
          <span
            style={{
              width: 44,
              height: 26,
              borderRadius: 999,
              background: draft.isPrivate ? palette.inkSoft : palette.leaf,
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: draft.isPrivate ? 21 : 3,
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: palette.cream,
                transition: "left 0.2s",
              }}
            />
          </span>
        </button>
        <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 8 }}>
          {draft.isPrivate ? "他のユーザーには地域と健康データだけが見えます" : "他の飼い主さんに名前と一緒にシェアされます"}
        </div>
      </div>

      <div style={cardStyle}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: palette.ink, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={Boolean(draft.shareFoodToPublic)}
            onChange={(e) => setDraft({ ...draft, shareFoodToPublic: e.target.checked })}
          />
          今日の記録をみんなに共有する
        </label>
      </div>

      <FormErrorList errors={errors} />
      <div style={{ ...cardStyle, marginTop: 8 }}>
        <Label>入力内容の確認</Label>
        <div style={{ fontSize: 12, color: palette.inkSoft, lineHeight: 1.8 }}>
          📅 {draft.date}
          <br />
          ごはん量 {draft.foodTotal}g（カリカリ{draft.kibblePct}% / ウェット{draft.wetPct}%）
          <br />
          飲水量 {draft.waterTotal}ml
          <br />
          体重 {draft.weightKg === "" ? "未入力" : `${Number(draft.weightKg).toFixed(1)}kg`}
          <br />
          おやつ量 {draft.snack}
          <br />
          うんち回数 {draft.poop}回 / おしっこ回数 {draft.pee}回
          {draft.memo.trim() ? (
            <>
              <br />
              メモ {draft.memo}
            </>
          ) : null}
          <br />
          👀 {draft.isPrivate ? "名前を伏せて共有" : "名前ありで共有"}
          <br />
          みんな共有 {draft.shareFoodToPublic ? "ON" : "OFF"}
        </div>
      </div>
      <button
        onClick={onSubmit}
        style={{
          width: "100%",
          padding: "16px",
          background: palette.ink,
          color: palette.cream,
          border: "none",
          borderRadius: 14,
          fontFamily: fontDisplay,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.1em",
          cursor: "pointer",
          marginTop: 8,
          boxShadow: "0 4px 0 rgba(58,46,39,0.3)",
        }}
      >
        {editingId ? "✓ 日次記録を更新" : "✓ 日次記録を保存"}
      </button>

      {lastSaved && (
        <div style={{ ...cardStyle, background: palette.cream, marginTop: 10 }}>
          <div style={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 16 }}>
            {lastSaved.catPhoto} {lastSaved.catName} の記録を保存しました
          </div>
          <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 6 }}>
            {lastSaved.date} / ごはん量 {lastSaved.foodTotal}g / 飲水量 {lastSaved.waterTotal}ml / おやつ量 {lastSaved.snack} / うんち回数 {lastSaved.poop}回 / おしっこ回数 {lastSaved.pee}回
            {lastSaved.weightKg !== "" ? ` / 体重 ${Number(lastSaved.weightKg).toFixed(1)}kg` : ""}
          </div>
          <button
            onClick={onMoveHome}
            style={{
              marginTop: 10,
              width: "100%",
              borderRadius: 10,
              border: `1px solid ${palette.line}`,
              background: "transparent",
              color: palette.ink,
              padding: "10px 12px",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            ホーム画面へ戻る
          </button>
        </div>
      )}

      {editingId && (
        <button
          onClick={() => {
            setEditingId(null);
            setDraft(newLogDraft());
            setErrors([]);
            if (onShowMessage) onShowMessage("記録フォームを表示しました。");
            window.setTimeout(() => {
              scrollToLogForm();
            }, 0);
          }}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: 8,
            background: "transparent",
            color: palette.inkSoft,
            border: `1px solid ${palette.line}`,
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          新規記録モードに戻す
        </button>
      )}

      <div style={{ ...cardStyle, marginTop: 12, paddingBottom: 14 }}>
        <Label>記録カレンダー（月間）</Label>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <MiniButton onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}>前月</MiniButton>
          <div style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 700 }}>{monthLabel(calendarMonth)}</div>
          <MiniButton onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}>翌月</MiniButton>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 6,
            fontSize: 11,
            color: palette.inkSoft,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          {["日", "月", "火", "水", "木", "金", "土"].map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {calendarCells.map((dateKey, index) => {
            if (!dateKey) return <div key={`empty-${index}`} style={{ minHeight: 42 }} />;
            const hasLog = Boolean(logMapByDate[dateKey]);
            const isToday = dateKey === todayKey();
            const isSelected = dateKey === selectedDateKey;
            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                style={{
                  border: isSelected ? `1px solid ${palette.accentSoft}` : `1px solid ${palette.line}`,
                  borderRadius: 10,
                  background: isSelected ? "#FFF4E8" : palette.cream,
                  color: palette.ink,
                  minHeight: 44,
                  padding: "5px 2px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  fontFamily: fontBody,
                  cursor: "pointer",
                  boxShadow: isToday ? `inset 0 0 0 1px ${palette.inkSoft}` : "none",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500 }}>{Number(dateKey.slice(-2))}</span>
                <span style={{ minHeight: 10, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                  {hasLog ? <CalendarPawIcon color={palette.leaf} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, borderTop: `1px dashed ${palette.line}`, paddingTop: 10 }}>
          {selectedLog ? (
            <div>
              <div style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 700 }}>{selectedDateLabel}</div>
              <div style={{ display: "grid", gap: 4, marginTop: 6, fontSize: 12, color: palette.inkSoft, lineHeight: 1.45 }}>
                <div>ごはん量 {selectedLog.foodTotal}g</div>
                <div>
                  カリカリ {selectedLog.kibblePct}% / ウェット {selectedLog.wetPct}%
                </div>
                <div>飲水量 {selectedLog.waterTotal}ml</div>
                <div>おやつ {selectedLog.snack}</div>
                <div>うんち回数 {selectedLog.poop}回</div>
                <div>おしっこ回数 {selectedLog.pee}回</div>
                {selectedLog.weightKg !== "" && selectedLog.weightKg != null && <div>体重 {Number(selectedLog.weightKg).toFixed(1)}kg</div>}
                {typeof selectedLog.memo === "string" && selectedLog.memo.trim() !== "" && (
                  <div style={{ marginTop: 4, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{selectedLog.memo}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <MiniButton onClick={() => startEdit(selectedLog)}>この日を編集</MiniButton>
                <MiniButton onClick={() => deleteLog(cat.id, selectedLog.id)}>削除</MiniButton>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: palette.inkSoft }}>
              <div style={{ fontFamily: fontDisplay, fontSize: 14, color: palette.ink, marginBottom: 4 }}>{selectedDateLabel}</div>
              この日の記録はありません
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function CommunityView({ firestoreGateway, authOwnerUid, authStatus, onUpdatePublicCatsLoadDebug, reloadToken }) {
  const [publicCats, setPublicCats] = useState([]);
  const [latestFoodByCatKey, setLatestFoodByCatKey] = useState({});
  const [loadState, setLoadState] = useState("idle");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrefecture, setSelectedPrefecture] = useState("すべて");
  const filteredPublicCats = useMemo(() => {
    if (selectedPrefecture === "すべて") return publicCats;
    return publicCats.filter(
      (cat) =>
        cat.publicRegionLevel !== "none" &&
        cat.publicRegionLabel !== "地域非公開" &&
        cat.prefecture === selectedPrefecture,
    );
  }, [publicCats, selectedPrefecture]);

  useEffect(() => {
    let cancelled = false;

    const loadPublicCats = async () => {
      const conditionText = selectedPrefecture === "すべて" ? "すべて" : selectedPrefecture;
      const currentAuthUid = firestoreGateway?.auth?.currentUser?.uid || authOwnerUid || "";
      const isAuthChecking = Boolean(firestoreGateway?.enabled && firestoreGateway?.auth) && !currentAuthUid && authStatus !== "認証エラー";
      if (isAuthChecking) {
        if (cancelled) return;
        setLoadState("auth-checking");
        setIsLoading(false);
        onUpdatePublicCatsLoadDebug("認証確認中", "", "", conditionText);
        return;
      }
      try {
        if (!currentAuthUid) {
          throw { code: "auth/not-ready", message: "匿名認証が完了していません" };
        }
        if (!firestoreGateway?.enabled || !firestoreGateway?.db) {
          throw { code: "firestore/not-initialized", message: "Firestoreが初期化されていません" };
        }
        if (cancelled) return;
        setLoadState("loading");
        setIsLoading(true);
        const query = firestoreGateway.db
          .collection("publicCats")
          .orderBy("updatedAt", "desc")
          .limit(100);
        const snap = await query.get();
        if (cancelled) return;
        const items = snap.docs.map((doc) => {
          const data = doc.data() || {};
          const publicRegionLevel = normalizePublicRegionLevel(data.publicRegionLevel);
          return {
            publicId: typeof data.publicId === "string" ? data.publicId : doc.id,
            ownerUid: typeof data.ownerUid === "string" ? data.ownerUid : "",
            sourceCatId: typeof data.sourceCatId === "string" ? data.sourceCatId : "",
            displayName: typeof data.displayName === "string" && data.displayName.trim() ? data.displayName.trim() : "名前未設定",
            age: Number.isFinite(Number(data.age)) ? Number(data.age) : null,
            sex: typeof data.sex === "string" ? data.sex : "",
            coatPattern: typeof data.coatPattern === "string" ? data.coatPattern : "",
            prefecture: typeof data.prefecture === "string" ? data.prefecture.trim() : "",
            publicRegionLevel,
            publicRegionLabel: typeof data.publicRegionLabel === "string" ? data.publicRegionLabel : "地域非公開",
          };
        });
        if (cancelled) return;
        setPublicCats(items);
        const foodSnap = await firestoreGateway.db
          .collection("publicFoodRecords")
          .orderBy("recordDate", "desc")
          .limit(20)
          .get();
        const foodItems = foodSnap.docs
          .map((doc) => ({ ...(doc.data() || {}) }))
          .map((row) => ({
            ownerUid: typeof row.ownerUid === "string" ? row.ownerUid : "",
            sourceCatId: typeof row.sourceCatId === "string" ? row.sourceCatId : "",
            recordDate: typeof row.recordDate === "string" ? row.recordDate : "",
            foodAmount: Number(row.foodAmount),
            waterMl: Number(row.waterMl),
            treatLevel: typeof row.treatLevel === "string" ? row.treatLevel.trim() : "",
            poopCount: Number(row.poopCount),
            peeCount: Number(row.peeCount),
          }))
          .filter((row) => {
            const hasFood = Number.isFinite(row.foodAmount) && row.foodAmount > 0;
            const hasWater = Number.isFinite(row.waterMl) && row.waterMl > 0;
            const hasTreat = Boolean(row.treatLevel);
            const hasPoop = Number.isFinite(row.poopCount) && row.poopCount >= 0;
            const hasPee = Number.isFinite(row.peeCount) && row.peeCount >= 0;
            return Boolean(row.ownerUid && row.sourceCatId && row.recordDate && (hasFood || hasWater || hasTreat || hasPoop || hasPee));
          });
        const groupedLatest = foodItems.reduce((acc, row) => {
          if (!row.ownerUid || !row.sourceCatId || !row.recordDate) return acc;
          const key = `${row.ownerUid}__${row.sourceCatId}`;
          const prev = acc[key];
          if (!prev || row.recordDate > prev.recordDate) {
            acc[key] = row;
          }
          return acc;
        }, {});
        setLatestFoodByCatKey(groupedLatest);
        const filteredItems =
          selectedPrefecture === "すべて"
            ? items
            : items.filter(
                (cat) =>
                  cat.publicRegionLevel !== "none" &&
                  cat.publicRegionLabel !== "地域非公開" &&
                  cat.prefecture === selectedPrefecture,
              );
        setLoadState(filteredItems.length === 0 ? "empty" : "loaded");
        onUpdatePublicCatsLoadDebug(items.length === 0 ? "0件" : "読み込み成功", "", "", conditionText);
      } catch (e) {
        if (cancelled) return;
        console.error("[Firestore] publicCats 読み込み失敗", e);
        const details = getFirebaseErrorDetails(e);
        setPublicCats([]);
        setLatestFoodByCatKey({});
        setLoadState("error");
        onUpdatePublicCatsLoadDebug("読み込み失敗", details.code, details.message, conditionText);
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };

    loadPublicCats();
    return () => {
      cancelled = true;
    };
  }, [authOwnerUid, authStatus, firestoreGateway, onUpdatePublicCatsLoadDebug, selectedPrefecture, reloadToken]);

  return (
    <div>
      <SectionLabel left="みんなの猫ちゃん" right={loadState === "loaded" || loadState === "empty" ? `${filteredPublicCats.length}匹` : "🌏"} />

      <div style={{ ...cardStyle, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: palette.ink, marginBottom: 6 }}>都道府県で絞り込み</div>
        <select value={selectedPrefecture} onChange={(e) => setSelectedPrefecture(e.target.value)} style={inputStyle}>
          <option value="すべて">すべて</option>
          {PREFECTURES.map((prefecture) => (
            <option key={prefecture} value={prefecture}>
              {prefecture}
            </option>
          ))}
        </select>
      </div>

      {loadState === "auth-checking" && (
        <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>認証確認中…</div>
      )}

      {loadState === "loading" && isLoading && (
        <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>読み込み中…</div>
      )}

      {loadState === "error" && (
        <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>公開プロフィールの読み込みに失敗しました</div>
      )}

      {loadState === "empty" && (
        <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>
          {selectedPrefecture === "すべて"
            ? "公開されている猫ちゃんはまだいません"
            : "この地域で公開されている猫ちゃんはまだいません"}
        </div>
      )}

      {loadState === "loaded" &&
        filteredPublicCats.map((cat, i) => (
          <div
            key={`${cat.displayName}-${i}`}
            style={{
              ...cardStyle,
              display: "flex",
              gap: 14,
              transform: i % 3 === 0 ? "rotate(-0.3deg)" : i % 3 === 1 ? "rotate(0.3deg)" : "none",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: palette.cream,
                border: `1px solid ${palette.line}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                flexShrink: 0,
              }}
            >
              🐱
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700 }}>{cat.displayName}</span>
              </div>
              <div style={{ fontSize: 11, color: palette.inkSoft, marginBottom: 8 }}>
                {cat.publicRegionLabel} · {cat.age == null ? "年齢不明" : `${cat.age}歳`}
              </div>
              <div style={{ display: "flex", gap: 10, fontSize: 11, color: palette.ink, flexWrap: "wrap" }}>
                <Tag>性別 {cat.sex || "未設定"}</Tag>
                <Tag>毛色・柄 {cat.coatPattern || "未設定"}</Tag>
              </div>
              {(() => {
                const key = cat.ownerUid && cat.sourceCatId ? `${cat.ownerUid}__${cat.sourceCatId}` : "";
                const latestFood = key ? latestFoodByCatKey[key] : null;
                if (!latestFood) return null;
                const formattedDate = latestFood.recordDate.replace(/-/g, "/");
                const isToday = latestFood.recordDate === todayKey();
                const prefix = isToday ? "今日の" : `${formattedDate} の`;
                const lines = [];
                if (Number.isFinite(latestFood.foodAmount) && latestFood.foodAmount > 0) lines.push(`🍚 ${prefix}ごはん ${latestFood.foodAmount}g`);
                if (Number.isFinite(latestFood.waterMl) && latestFood.waterMl > 0) lines.push(`💧 ${prefix}飲水 ${latestFood.waterMl}ml`);
                if (latestFood.treatLevel) lines.push(`🍪 ${prefix}おやつ ${latestFood.treatLevel}`);
                if (Number.isFinite(latestFood.poopCount) && latestFood.poopCount >= 0) lines.push(`💩 ${prefix}うんち ${latestFood.poopCount}回`);
                if (Number.isFinite(latestFood.peeCount) && latestFood.peeCount >= 0) lines.push(`🚽 ${prefix}おしっこ ${latestFood.peeCount}回`);
                if (lines.length === 0) return null;
                return (
                  <div style={{ fontSize: 12, color: palette.inkSoft, marginTop: 8, display: "grid", gap: 2 }}>
                    {lines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        ))}
    </div>
  );
}

function StatsView({ firestoreGateway, authOwnerUid, authStatus, reloadToken }) {
  const HIDDEN_PREFECTURE_LABEL = "非公開";
  const [publicCats, setPublicCats] = useState([]);
  const [publicFoodRecords, setPublicFoodRecords] = useState([]);
  const [loadState, setLoadState] = useState("idle");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadPublicCats = async () => {
      const currentAuthUid = firestoreGateway?.auth?.currentUser?.uid || authOwnerUid || "";
      const isAuthChecking = Boolean(firestoreGateway?.enabled && firestoreGateway?.auth) && !currentAuthUid && authStatus !== "認証エラー";
      if (isAuthChecking) {
        if (cancelled) return;
        setLoadState("auth-checking");
        setIsLoading(false);
        return;
      }
      try {
        if (!currentAuthUid) {
          throw { code: "auth/not-ready", message: "匿名認証が完了していません" };
        }
        if (!firestoreGateway?.enabled || !firestoreGateway?.db) {
          throw { code: "firestore/not-initialized", message: "Firestoreが初期化されていません" };
        }
        if (cancelled) return;
        setLoadState("loading");
        setIsLoading(true);
        const snap = await firestoreGateway.db.collection("publicCats").orderBy("updatedAt", "desc").limit(300).get();
        if (cancelled) return;
        const items = snap.docs.map((doc) => {
          const data = doc.data() || {};
          return {
            age: Number.isFinite(Number(data.age)) ? Number(data.age) : null,
            sex: typeof data.sex === "string" ? data.sex.trim() : "",
            coatPattern: typeof data.coatPattern === "string" ? data.coatPattern.trim() : "",
            prefecture: typeof data.prefecture === "string" ? data.prefecture.trim() : "",
            publicRegionLevel: normalizePublicRegionLevel(data.publicRegionLevel),
          };
        });
        if (cancelled) return;
        setPublicCats(items);
        const foodSnap = await firestoreGateway.db
          .collection("publicFoodRecords")
          .orderBy("recordDate", "desc")
          .limit(20)
          .get();
        const foodItems = foodSnap.docs
          .map((doc) => ({ ...(doc.data() || {}) }))
          .filter((row) => Number.isFinite(Number(row.foodAmount)) && Number(row.foodAmount) >= 0)
          .map((row) => ({
            recordDate: typeof row.recordDate === "string" ? row.recordDate : "",
            displayName: typeof row.displayName === "string" && row.displayName.trim() ? row.displayName.trim() : "匿名のねこちゃん",
            foodAmount: Number(row.foodAmount),
          }));
        setPublicFoodRecords(foodItems);
        setLoadState(items.length === 0 ? "empty" : "loaded");
      } catch (e) {
        if (cancelled) return;
        console.error("[Firestore] publicCats 統計読み込み失敗", e);
        setPublicCats([]);
        setLoadState("error");
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    };

    loadPublicCats();
    return () => {
      cancelled = true;
    };
  }, [authOwnerUid, authStatus, firestoreGateway, reloadToken]);

  const stats = useMemo(() => {
    const totalCount = publicCats.length;
    const prefectureCount = {};
    const ageCount = { "0-2歳": 0, "3-6歳": 0, "7-10歳": 0, "11歳以上": 0, "不明": 0 };
    const sexCount = {};
    const coatPatternCount = {};

    publicCats.forEach((cat) => {
      const normalizedPrefecture = typeof cat.prefecture === "string" ? cat.prefecture.trim() : "";
      const prefectureLabel =
        cat.publicRegionLevel === "none" || !normalizedPrefecture ? HIDDEN_PREFECTURE_LABEL : normalizedPrefecture;
      prefectureCount[prefectureLabel] = (prefectureCount[prefectureLabel] || 0) + 1;

      if (!Number.isFinite(cat.age) || cat.age < 0) {
        ageCount["不明"] += 1;
      } else if (cat.age <= 2) {
        ageCount["0-2歳"] += 1;
      } else if (cat.age <= 6) {
        ageCount["3-6歳"] += 1;
      } else if (cat.age <= 10) {
        ageCount["7-10歳"] += 1;
      } else {
        ageCount["11歳以上"] += 1;
      }

      const sexLabel = cat.sex || "不明";
      sexCount[sexLabel] = (sexCount[sexLabel] || 0) + 1;

      const patternLabel = cat.coatPattern || "不明";
      coatPatternCount[patternLabel] = (coatPatternCount[patternLabel] || 0) + 1;
    });

    const toSortedRows = (counts) =>
      Object.entries(counts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);

    return {
      totalCount,
      prefectureRows: toSortedRows(prefectureCount),
      ageRows: toSortedRows(ageCount),
      sexRows: toSortedRows(sexCount),
      coatPatternRows: toSortedRows(coatPatternCount),
    };
  }, [publicCats]);

  const hasStats = stats.totalCount > 0;

  return (
    <div>
      <SectionLabel left="統計" right={hasStats ? `${stats.totalCount}匹` : "🌏"} />

      {loadState === "auth-checking" && <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>認証確認中…</div>}
      {loadState === "loading" && isLoading && <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>読み込み中…</div>}
      {loadState === "error" && <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>統計の読み込みに失敗しました</div>}

      {(loadState === "empty" || (loadState === "loaded" && !hasStats)) && (
        <div style={{ ...cardStyle, fontSize: 12, color: palette.inkSoft }}>公開されている猫ちゃんが増えると統計が表示されます</div>
      )}

      {loadState === "loaded" && hasStats && (
        <>
          <div style={{ ...cardStyle, padding: "20px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: palette.inkSoft, letterSpacing: "0.2em" }}>公開猫ちゃん数</div>
            <div style={{ fontFamily: fontDisplay, fontSize: 44, fontWeight: 700, color: palette.accent, lineHeight: 1.1 }}>
              {stats.totalCount.toLocaleString()}
              <span style={{ fontSize: 18, color: palette.ink, marginLeft: 4 }}>匹</span>
            </div>
          </div>

          <StatsBarCard
            title="都道府県別の公開猫ちゃん数"
            rows={stats.prefectureRows}
            emptyText="都道府県データがまだありません"
            note="都道府県を公開していない猫ちゃんは『非公開』として集計しています"
          />
          <StatsBarCard title="年齢分布" rows={stats.ageRows} emptyText="年齢データがまだありません" />
          <StatsBarCard title="性別分布" rows={stats.sexRows} emptyText="性別データがまだありません" />
          <StatsBarCard title="毛柄分布" rows={stats.coatPatternRows} emptyText="毛柄データがまだありません" />
        </>
      )}
    </div>
  );
}

function StatsBarCard({ title, rows, emptyText, note = "" }) {
  const max = rows.reduce((acc, [, count]) => (count > acc ? count : acc), 0);
  return (
    <div style={cardStyle}>
      <Label>{title}</Label>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: palette.inkSoft }}>{emptyText}</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map(([label, count]) => {
            const width = max > 0 ? Math.max((count / max) * 100, 8) : 0;
            return (
              <div key={`${title}-${label}`} style={{ display: "grid", gridTemplateColumns: "88px 1fr auto", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 12, color: palette.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
                <div style={{ height: 10, borderRadius: 999, background: "#EFE7DF", overflow: "hidden" }}>
                  <div style={{ width: `${width}%`, height: "100%", borderRadius: 999, background: palette.accent }} />
                </div>
                <div style={{ fontSize: 12, color: palette.inkSoft, minWidth: 26, textAlign: "right" }}>{count}</div>
              </div>
            );
          })}
        </div>
      )}
      {note ? <div style={{ marginTop: 8, fontSize: 11, color: palette.inkSoft }}>{note}</div> : null}
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { key: "home", icon: Home, label: "ホーム" },
    { key: "mycat", icon: Cat, label: "わが家" },
    { key: "log", icon: PlusCircle, label: "記録", primary: true },
    { key: "community", icon: Globe, label: "みんな" },
    { key: "stats", icon: BarChart3, label: "統計" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        background: palette.ink,
        borderRadius: 999,
        padding: "8px 12px",
        display: "flex",
        gap: 4,
        boxShadow: "0 8px 24px rgba(58,46,39,0.35)",
        zIndex: 10,
      }}
    >
      {items.map((it) => {
        const Icon = it.icon;
        const active = tab === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setTab(it.key)}
            style={{
              border: "none",
              background: active ? palette.accent : "transparent",
              color: active ? palette.cream : "#B0A091",
              padding: "10px 12px",
              borderRadius: 999,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              transition: "all 0.2s",
              minWidth: 52,
            }}
          >
            <Icon size={it.primary ? 22 : 18} />
            <span style={{ fontSize: 9, fontWeight: 600 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

const cardStyle = {
  background: palette.cream,
  border: `1px solid ${palette.line}`,
  borderRadius: 14,
  padding: 18,
  marginBottom: 12,
  boxShadow: "0 2px 0 rgba(58,46,39,0.06), 0 8px 16px -8px rgba(58,46,39,0.15)",
};

const inputStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  display: "block",
  boxSizing: "border-box",
  border: `1px solid ${palette.line}`,
  borderRadius: 8,
  background: "#fff",
  padding: "8px 10px",
  fontFamily: fontBody,
  fontSize: 13,
  color: palette.ink,
};

const devMenuCardStyle = {
  ...cardStyle,
  padding: 10,
};

const devMenuToggleStyle = {
  width: "100%",
  border: `1px solid ${palette.line}`,
  background: palette.cream,
  color: palette.inkSoft,
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12,
  fontFamily: fontBody,
  fontWeight: 600,
  letterSpacing: "0.03em",
  textAlign: "left",
  cursor: "pointer",
};

function SectionLabel({ left, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        margin: "8px 4px 12px",
      }}
    >
      <span style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}>— {left}</span>
      {right && <span style={{ fontSize: 11, color: palette.inkSoft }}>{right}</span>}
    </div>
  );
}

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        color: palette.inkSoft,
        marginBottom: 10,
        letterSpacing: "0.05em",
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function InputRow({ label, children }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11, color: palette.inkSoft, marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function FormErrorList({ errors }) {
  if (!errors?.length) return null;
  return (
    <div style={{ background: "#FFF2F0", border: "1px solid #F2C4BC", color: "#A53C27", borderRadius: 8, fontSize: 12, padding: 8, marginBottom: 8 }}>
      {errors.map((e) => (
        <div key={e}>・{e}</div>
      ))}
    </div>
  );
}

function MiniButton({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: `1px solid ${palette.line}`,
        background: palette.cream,
        color: palette.ink,
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 11,
        fontFamily: fontBody,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${active ? palette.accent : palette.line}`,
        background: active ? palette.accent : "transparent",
        color: active ? palette.cream : palette.ink,
        fontFamily: fontBody,
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function Tag({ children }) {
  return (
    <span
      style={{
        background: palette.cream,
        border: `1px solid ${palette.line}`,
        borderRadius: 6,
        padding: "3px 8px",
        fontSize: 11,
      }}
    >
      {children}
    </span>
  );
}

function StepNumberInput({ value, unit, min, max, step, color, onChange }) {
  const safeValue = Number.isFinite(value) ? value : min;
  const changeByStep = (delta) => onChange(Math.max(min, Math.min(max, safeValue + delta)));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
        <span style={{ fontFamily: fontDisplay, fontSize: 36, fontWeight: 700, color }}>{safeValue}</span>
        <span style={{ fontSize: 14, color: palette.inkSoft }}>{unit}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => changeByStep(-step)} style={counterBtn} aria-label={`${unit}を減らす`}>
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(e) => {
            const parsed = Number(e.target.value);
            if (Number.isNaN(parsed)) return;
            onChange(Math.max(min, Math.min(max, parsed)));
          }}
          style={{ ...inputStyle, textAlign: "center", fontWeight: 700, fontSize: 16, maxWidth: 120 }}
        />
        <button onClick={() => changeByStep(step)} style={counterBtn} aria-label={`${unit}を増やす`}>
          +
        </button>
      </div>
      <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 6 }}>
        {`±${step}${unit}ずつ調整できます`}
      </div>
    </div>
  );
}

function Counter({ label, value, setValue, unit }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: palette.inkSoft, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => setValue(Math.max(0, value - 1))} style={counterBtn}>
          −
        </button>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4, minWidth: 54, justifyContent: "center" }}>
          <div style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, textAlign: "center" }}>{value}</div>
          {unit && <div style={{ fontSize: 12, color: palette.inkSoft }}>{unit}</div>}
        </div>
        <button onClick={() => setValue(Math.min(20, value + 1))} style={counterBtn}>
          +
        </button>
      </div>
    </div>
  );
}

function RatioSelector({ kibble, wet, onChange }) {
  const options = [
    { label: "カリカリだけ", kibble: 100, wet: 0 },
    { label: "カリカリ多め", kibble: 75, wet: 25 },
    { label: "半々", kibble: 50, wet: 50 },
    { label: "ウェット多め", kibble: 25, wet: 75 },
    { label: "ウェットだけ", kibble: 0, wet: 100 },
  ];
  const safeKibble = Number.isFinite(kibble) ? kibble : 0;
  const safeWet = Number.isFinite(wet) ? wet : 0;

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <Pill key={opt.label} active={safeKibble === opt.kibble && safeWet === opt.wet} onClick={() => onChange(opt.kibble)}>
            {opt.label}
          </Pill>
        ))}
      </div>
      {!options.some((opt) => opt.kibble === safeKibble && opt.wet === safeWet) && (
        <div style={{ fontSize: 11, color: palette.inkSoft, marginTop: 8 }}>
          既存データの比率: カリカリ {safeKibble}% / ウェット {safeWet}%
        </div>
      )}
    </div>
  );
}

async function compressImageFile(file) {
  const readAsDataUrl = () =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("画像読み込みに失敗しました。"));
      reader.readAsDataURL(file);
    });

  const dataUrl = await readAsDataUrl();
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("画像の解析に失敗しました。"));
    el.src = dataUrl;
  });

  const maxSide = 320;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.75);
}

function CatAvatar({ cat, size = 64, fontSize = 34 }) {
  if (cat?.photoImage) {
    return (
      <img
        src={cat.photoImage}
        alt={`${cat.name}のプロフィール画像`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }
  return <Cat size={Math.round(size * 0.65)} color={palette.ink} strokeWidth={1.8} />;
}

const counterBtn = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: `1px solid ${palette.line}`,
  background: palette.cream,
  fontSize: 18,
  cursor: "pointer",
  color: palette.ink,
};

function BigStat({ label, value, icon, small }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: palette.inkSoft, marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontFamily: fontDisplay, fontSize: small ? 20 : 28, fontWeight: 700, color: palette.ink }}>{value}</div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 11, color: palette.inkSoft, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 700, color: palette.accent }}>{value}</div>
      <div style={{ fontSize: 10, color: palette.inkSoft, marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function RatioBar({ kibble, wet }) {
  return (
    <div
      style={{
        display: "flex",
        height: 14,
        borderRadius: 999,
        overflow: "hidden",
        border: `1px solid ${palette.line}`,
        background: palette.cream,
      }}
    >
      <div
        style={{
          width: `${kibble}%`,
          background: `repeating-linear-gradient(45deg, ${palette.accent}, ${palette.accent} 4px, ${palette.accentSoft} 4px, ${palette.accentSoft} 8px)`,
          transition: "width 0.3s",
        }}
      />
      <div
        style={{
          width: `${wet}%`,
          background: palette.leaf,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("React描画エラー:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px", fontFamily: fontBody, color: palette.ink }}>
          アプリの読み込み中にエラーが発生しました。再読み込みしてください。
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <AppErrorBoundary>
      <CatHealthApp />
    </AppErrorBoundary>,
  );
} else {
  document.body.innerHTML = `<div style="padding:24px;font-family:sans-serif">アプリの読み込み中にエラーが発生しました。再読み込みしてください。</div>`;
}
