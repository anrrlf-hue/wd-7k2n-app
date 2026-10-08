export const SIJIN_OPTIONS = [
  { id: "unknown", label: "모름", range: "출생시간 모름", hour: null },
  { id: "ja", label: "자시", range: "23:00~00:59", hour: 0 },
  { id: "chuk", label: "축시", range: "01:00~02:59", hour: 1 },
  { id: "in", label: "인시", range: "03:00~04:59", hour: 3 },
  { id: "myo", label: "묘시", range: "05:00~06:59", hour: 5 },
  { id: "jin", label: "진시", range: "07:00~08:59", hour: 7 },
  { id: "sa", label: "사시", range: "09:00~10:59", hour: 9 },
  { id: "o", label: "오시", range: "11:00~12:59", hour: 11 },
  { id: "mi", label: "미시", range: "13:00~14:59", hour: 13 },
  { id: "sin", label: "신시", range: "15:00~16:59", hour: 15 },
  { id: "yu", label: "유시", range: "17:00~18:59", hour: 17 },
  { id: "sul", label: "술시", range: "19:00~20:59", hour: 19 },
  { id: "hae", label: "해시", range: "21:00~22:59", hour: 21 },
] as const;

export type SijinId = (typeof SIJIN_OPTIONS)[number]["id"];

export function sijinOption(id: SijinId) {
  return SIJIN_OPTIONS.find((item) => item.id === id) ?? SIJIN_OPTIONS[0];
}

export function sijinFromHour(hour: number | null): SijinId {
  if (hour === null) return "unknown";
  if (hour === 23 || hour === 0) return "ja";
  if (hour >= 1 && hour <= 2) return "chuk";
  if (hour >= 3 && hour <= 4) return "in";
  if (hour >= 5 && hour <= 6) return "myo";
  if (hour >= 7 && hour <= 8) return "jin";
  if (hour >= 9 && hour <= 10) return "sa";
  if (hour >= 11 && hour <= 12) return "o";
  if (hour >= 13 && hour <= 14) return "mi";
  if (hour >= 15 && hour <= 16) return "sin";
  if (hour >= 17 && hour <= 18) return "yu";
  if (hour >= 19 && hour <= 20) return "sul";
  return "hae";
}

export function sijinLabelFromHour(hour: number | null): string {
  const option = sijinOption(sijinFromHour(hour));
  return option.id === "unknown" ? "출생시간 모름" : `${option.label} · ${option.range}`;
}
