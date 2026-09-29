"use client";

import { useState } from "react";
import Link from "next/link";
import {
  SAJU_FOCUS_LABELS,
  SAJU_FOCUS_SHORT_DESCRIPTIONS,
  SAJU_FOCUS_VALUES,
  type SajuFocus,
} from "@/lib/saju-focus";
import styles from "@/app/page.module.css";

export function LandingFocusSelector() {
  const [focus, setFocus] = useState<SajuFocus>("overall");

  return (
    <div className={styles.focusPanel}>
      <p className={styles.focusEyebrow}>무료 사주풀이</p>
      <h1 className={styles.focusTitle}>무엇이 가장 궁금하세요?</h1>
      <p className={styles.focusDescription}>
        전체 사주는 모두 보고, 고른 주제는 먼저 보여드려요.
      </p>

      <div className={styles.focusGrid}>
        {SAJU_FOCUS_VALUES.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={focus === item}
            onClick={() => setFocus(item)}
            className={styles.focusChip + " " + (focus === item ? styles.focusChipActive : "")}
          >
            {SAJU_FOCUS_LABELS[item]}
          </button>
        ))}
      </div>

      <p className={styles.focusHint}>{SAJU_FOCUS_SHORT_DESCRIPTIONS[focus]}</p>

      <Link
        href={"/diagnosis?focus=" + focus}
        className={styles.focusCta}
        aria-label={SAJU_FOCUS_LABELS[focus] + " 무료로 보기"}
      >
        내 사주 무료로 보기
      </Link>
    </div>
  );
}
