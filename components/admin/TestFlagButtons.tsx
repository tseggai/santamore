"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { setRecordsTest } from "@/app/[locale]/admin/(protected)/test-flag-actions";
import { bulkButton } from "@/components/console/DataTable";
import { useDialog } from "@/components/console/useDialog";
import type { RecordKind } from "@/lib/test-flag";

/**
 * The two ends of the test flag for a selection: "Mark as test data" for
 * the live records in it, "Mark as live" for the test ones. Each shows only
 * when the selection holds something for it to do. The database flips the
 * record and everything attached to it (migration 0059).
 */
export function TestFlagButtons({
  kind,
  ids,
  isTest,
  clear,
  disabled = false,
  className = bulkButton,
}: {
  kind: RecordKind;
  ids: string[];
  isTest: (id: string) => boolean;
  clear?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("admin");
  const router = useRouter();
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const liveIds = ids.filter((id) => !isTest(id));
  const testIds = ids.filter((id) => isTest(id));

  const flip = async (targets: string[], test: boolean) => {
    const message = test ? t("markTestConfirm", { count: targets.length }) : t("markLiveConfirm", { count: targets.length });
    const label = test ? t("markTest") : t("markLive");
    if (!(await dialog.confirm(message, { danger: false, confirmLabel: label }))) return;
    setBusy(true);
    const result = await setRecordsTest({ kind, ids: targets, test }).catch(() => null);
    setBusy(false);
    if (!result?.ok) {
      await dialog.alert(t("actionError"), result?.detail);
      return;
    }
    clear?.();
    router.refresh();
  };

  return (
    <>
      {dialog.element}
      {liveIds.length > 0 ? (
        <button type="button" disabled={disabled || busy} onClick={() => void flip(liveIds, true)} className={className}>
          {t("markTest")}
        </button>
      ) : null}
      {testIds.length > 0 ? (
        <button type="button" disabled={disabled || busy} onClick={() => void flip(testIds, false)} className={className}>
          {t("markLive")}
        </button>
      ) : null}
    </>
  );
}
