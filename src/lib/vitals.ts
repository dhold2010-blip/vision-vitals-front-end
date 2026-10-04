export type Metric = {
  key: string;
  label: string;
  value: string;
  unit?: string;
  detail: string;
  confidence: number;
};

export type ScanRecord = {
  id: string;
  date: string;
  time: string;
  score: number;
  age: number;
  bmi: number;
  weight: number;
  posture: number;
  symmetry: number;
  heartRate: number;
  tag: "Full body" | "Face only" | "Posture";
};

export const profile = {
  name: "Aarav Mehta",
  handle: "@aarav",
  age: 28,
  gender: "Male",
  height: 178,
  weight: 72.4,
  goal: "Lean strength · 68 kg",
  plan: "VisionVitals Pro",
  streak: 14,
};

export const latestScan = {
  score: 86,
  delta: 4,
  confidence: 94,
  capturedAt: "Today · 08:12",
  estimatedAge: 26,
  height: 178,
  weight: 72.4,
  bmi: 22.9,
  bodyType: "Mesomorph",
  symmetry: 91,
  posture: 78,
  heartRate: 68,
  skinTone: "Warm neutral · Type IV",
  hydration: 74,
  stress: 32,
};

export const metrics: Metric[] = [
  {
    key: "age",
    label: "Estimated age",
    value: "26",
    unit: "yrs",
    detail: "Facial collagen density and periorbital texture read 2 years below your actual age.",
    confidence: 92,
  },
  {
    key: "height",
    label: "Estimated height",
    value: "178",
    unit: "cm",
    detail: "Derived from skeletal landmark ratios against the calibrated floor plane.",
    confidence: 88,
  },
  {
    key: "weight",
    label: "Estimated weight",
    value: "72.4",
    unit: "kg",
    detail: "Volumetric silhouette modelling, cross-checked with shoulder-to-waist taper.",
    confidence: 85,
  },
  {
    key: "bmi",
    label: "Body mass index",
    value: "22.9",
    detail: "Within the healthy range. Trending down 0.4 points over the last 30 days.",
    confidence: 90,
  },
  {
    key: "symmetry",
    label: "Face symmetry",
    value: "91",
    unit: "%",
    detail: "68 landmark pairs compared across the vertical midline. Slight left-jaw dominance.",
    confidence: 96,
  },
  {
    key: "posture",
    label: "Posture score",
    value: "78",
    unit: "%",
    detail: "Mild forward head carriage of 12°. Thoracic alignment is otherwise neutral.",
    confidence: 87,
  },
  {
    key: "hr",
    label: "Heart rate estimate",
    value: "68",
    unit: "bpm",
    detail: "Remote photoplethysmography on facial micro-colour shifts across 14 seconds.",
    confidence: 81,
  },
  {
    key: "skin",
    label: "Skin tone analysis",
    value: "Type IV",
    detail: "Warm neutral undertone. Even melanin distribution, low redness in the cheek zone.",
    confidence: 93,
  },
];

export const recommendations = [
  {
    title: "Unlock your thoracic spine",
    body: "Two sets of wall angels each morning to reduce the 12° forward head carriage detected in your posture scan.",
    tone: "primary" as const,
  },
  {
    title: "Add 400 ml of water before noon",
    body: "Hydration markers in your skin analysis sit at 74%. Front-loading fluids lifts afternoon readings.",
    tone: "secondary" as const,
  },
  {
    title: "Protect your sleep window",
    body: "Resting heart rate rose 3 bpm on nights following late screen use. Aim for lights out before 23:15.",
    tone: "accent" as const,
  },
];

export const aiTips = [
  "Scan in soft, even daylight for the highest confidence score.",
  "Stand 1.5 m from the lens with your full body in frame.",
  "Repeat scans at the same time of day to keep trends comparable.",
];

export const history: ScanRecord[] = [
  {
    id: "s-1042",
    date: "Today",
    time: "08:12",
    score: 86,
    age: 26,
    bmi: 22.9,
    weight: 72.4,
    posture: 78,
    symmetry: 91,
    heartRate: 68,
    tag: "Full body",
  },
  {
    id: "s-1039",
    date: "Yesterday",
    time: "07:58",
    score: 84,
    age: 26,
    bmi: 23.0,
    weight: 72.7,
    posture: 76,
    symmetry: 90,
    heartRate: 70,
    tag: "Full body",
  },
  {
    id: "s-1031",
    date: "12 Mar",
    time: "21:04",
    score: 81,
    age: 27,
    bmi: 23.1,
    weight: 73.1,
    posture: 71,
    symmetry: 90,
    heartRate: 74,
    tag: "Posture",
  },
  {
    id: "s-1024",
    date: "09 Mar",
    time: "08:30",
    score: 83,
    age: 27,
    bmi: 23.2,
    weight: 73.4,
    posture: 74,
    symmetry: 89,
    heartRate: 72,
    tag: "Face only",
  },
  {
    id: "s-1018",
    date: "05 Mar",
    time: "09:11",
    score: 79,
    age: 27,
    bmi: 23.4,
    weight: 73.9,
    posture: 69,
    symmetry: 88,
    heartRate: 75,
    tag: "Full body",
  },
  {
    id: "s-1009",
    date: "01 Mar",
    time: "08:02",
    score: 77,
    age: 28,
    bmi: 23.6,
    weight: 74.3,
    posture: 66,
    symmetry: 88,
    heartRate: 76,
    tag: "Full body",
  },
];

export const weeklyTrend = [
  { label: "Mon", score: 78, posture: 68, hr: 75 },
  { label: "Tue", score: 79, posture: 70, hr: 74 },
  { label: "Wed", score: 81, posture: 71, hr: 73 },
  { label: "Thu", score: 80, posture: 73, hr: 72 },
  { label: "Fri", score: 83, posture: 75, hr: 70 },
  { label: "Sat", score: 84, posture: 76, hr: 69 },
  { label: "Sun", score: 86, posture: 78, hr: 68 },
];

export const monthlyTrend = [
  { label: "Nov", score: 68, weight: 76.8 },
  { label: "Dec", score: 71, weight: 76.1 },
  { label: "Jan", score: 74, weight: 75.0 },
  { label: "Feb", score: 79, weight: 73.9 },
  { label: "Mar", score: 86, weight: 72.4 },
];

export const compositionSplit = [
  { label: "Lean mass", value: 62, color: "var(--color-chart-1)" },
  { label: "Body fat", value: 17, color: "var(--color-chart-3)" },
  { label: "Water", value: 21, color: "var(--color-chart-2)" },
];

export const scanStages = [
  "Calibrating depth field",
  "Detecting face landmarks",
  "Mapping body skeleton",
  "Reading micro-colour pulse",
  "Modelling composition",
  "Compiling your report",
];
