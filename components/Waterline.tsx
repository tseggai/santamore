"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { formatCents, type Cents } from "@/lib/money";
import type { Locale } from "@/i18n/routing";
import styles from "./Waterline.module.css";

// Wave geometry from the prototype: layer A crests up (y=3), layer B is the
// inverted, slower counter-wave (y=26), each drawn twice for the loop.
const WAVE_A = "M0 14 Q25 3 50 14 T100 14 T150 14 T200 14 V26 H0Z";
const WAVE_B = "M0 17 Q25 26 50 17 T100 17 T150 17 T200 17 V26 H0Z";

function Wave({ d, fill }: { d: string; fill: string }) {
  return (
    <svg viewBox="0 0 200 26" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill={fill} />
    </svg>
  );
}

/**
 * The fundraiser progress visual (brief §3): water rises to the funded
 * percentage, two drifting wave layers ride the surface, and the frosted
 * plate keeps the raised amount readable at any fill level. Mounts at 0%
 * and fills after 260ms so the 1.1s transition animates on first view.
 */
export function Waterline({
  raisedCents,
  goalCents,
  donorCount,
  locale,
}: {
  raisedCents: Cents;
  goalCents: Cents;
  donorCount: number;
  locale: Locale;
}) {
  const t = useTranslations("runner");
  const pct =
    goalCents > 0 ? Math.min(100, Math.round((raisedCents / goalCents) * 100)) : 0;
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setFill(pct), 260);
    return () => clearTimeout(timer);
  }, [pct]);

  const money = (cents: Cents) => formatCents(cents, locale, { trimWholeCents: true });

  return (
    <div className={`${styles.waterline}${fill > 55 ? ` ${styles.deep}` : ""}`}>
      <div className={styles.fill} style={{ height: `${fill}%` }} />
      <div className={styles.waveA} style={{ bottom: `calc(${fill}% - 13px)` }}>
        <Wave d={WAVE_A} fill="#15505F" />
        <Wave d={WAVE_A} fill="#15505F" />
      </div>
      <div className={styles.waveB} style={{ bottom: `calc(${fill}% - 15px)` }}>
        <Wave d={WAVE_B} fill="#0E3A46" />
        <Wave d={WAVE_B} fill="#0E3A46" />
      </div>
      <div className={styles.copy}>
        <div className={styles.plate}>
          <div className={styles.raised}>{money(raisedCents)}</div>
          <div className={styles.of}>
            {t("of")}{" "}
            <span className="font-mono tabular-nums">{money(goalCents)}</span> ·{" "}
            <span className="font-mono tabular-nums">{donorCount}</span> {t("donors")}
          </div>
        </div>
        <div className={styles.pct}>{pct}%</div>
      </div>
    </div>
  );
}
