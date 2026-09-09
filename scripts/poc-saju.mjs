// manseryeok-js 정확도 확인용 PoC. 알려진 만세력 결과와 대조한다.
import { calculateSaju } from '@fullstackfamily/manseryeok';

const cases = [
  { y: 1990, m: 5, d: 15, h: 14, min: 30, note: '기본 케이스 (서울, 시간보정 적용)' },
  { y: 2000, m: 1, d: 1, h: 0, min: 0, note: '밀레니엄 자정' },
  { y: 1984, m: 2, d: 2, h: 2, min: 0, note: '입춘 부근 경계값' },
];

for (const c of cases) {
  const r = calculateSaju(c.y, c.m, c.d, c.h, c.min);
  console.log(`\n[${c.note}] ${c.y}-${c.m}-${c.d} ${c.h}:${c.min}`);
  console.log(`  년주 ${r.yearPillar}(${r.yearPillarHanja}) 월주 ${r.monthPillar}(${r.monthPillarHanja}) 일주 ${r.dayPillar}(${r.dayPillarHanja}) 시주 ${r.hourPillar}(${r.hourPillarHanja})`);
  if (r.isTimeCorrected) {
    console.log(`  진태양시 보정: ${r.correctedTime.hour}시 ${r.correctedTime.minute}분`);
  }
}
