"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** A QR code for any text — award redemption links, share links. */
export function QrImage({ value, alt, size = 200 }: { value: string; alt: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: size * 2,
      color: { dark: "#36434b", light: "#ffffff" },
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
  }, [value, size]);

  if (!dataUrl) return <div style={{ width: size, height: size }} aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimize
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt={alt}
      style={{ width: size, height: size }}
      className="rounded-lg border-[1.5px] border-line bg-paper"
    />
  );
}
