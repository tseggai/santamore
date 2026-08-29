"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/**
 * Renders an EPC069-12 payload as a QR image. Error-correction level M per
 * the EPC guidance. Regenerates whenever the payload (amount) changes.
 */
export function EpcQrCode({ payload, alt }: { payload: string; alt: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 296,
      color: { dark: "#0b0b0c", light: "#ffffff" },
    })
      .then((url) => {
        if (alive) setDataUrl(url);
      })
      .catch(() => {
        if (alive) setDataUrl(null);
      });
    return () => {
      alive = false;
    };
  }, [payload]);

  if (!dataUrl) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimize
    <img
      src={dataUrl}
      width={148}
      height={148}
      alt={alt}
      className="h-[148px] w-[148px] rounded-lg border-[1.5px] border-line bg-paper"
    />
  );
}
