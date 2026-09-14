import { gradientPng, type Rgb } from "@/lib/demo/png";

// Demo faces are illustrations, never photographs of real people: the
// site's no-fabrication rule applies to demo rows too, since visitors
// cannot tell a demo runner from a real one. DiceBear's "notionists"
// style is CC0; "shapes" carries the team pages.
const DICEBEAR = "https://api.dicebear.com/9.x";
const BACKGROUNDS = "e3ebed,f6f3ee,f1f5f6,d9e7ea";

async function fetchPng(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    // PNG signature — anything else is not an image we want to store.
    return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 ? bytes : null;
  } catch {
    return null;
  }
}

/** An illustrated portrait for a demo runner; a gradient disc if the service is unreachable. */
export async function demoPersonAvatar(seed: string, fallback: [Rgb, Rgb, Rgb]): Promise<Buffer> {
  const url = `${DICEBEAR}/notionists/png?seed=${encodeURIComponent(seed)}&size=320&backgroundColor=${BACKGROUNDS}&backgroundType=solid`;
  return (await fetchPng(url)) ?? gradientPng(320, fallback[0], fallback[1], fallback[2]);
}

/** An abstract mark for a demo team. */
export async function demoTeamAvatar(seed: string, fallback: [Rgb, Rgb, Rgb]): Promise<Buffer> {
  const url = `${DICEBEAR}/shapes/png?seed=${encodeURIComponent(seed)}&size=320&backgroundColor=${BACKGROUNDS}`;
  return (await fetchPng(url)) ?? gradientPng(320, fallback[1], fallback[0], fallback[2]);
}
