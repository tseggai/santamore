import "server-only";

import { extractContacts, isPublicHost } from "@/lib/prospect-live";

/**
 * Reads what an organisation's own website publishes: its email addresses
 * and its Instagram account. The home page first, then one contact page if
 * the home page links one. Only public http(s) hosts are fetched, every
 * redirect is checked against the same rule, and a page is read up to
 * 400 kB, so a link someone typed cannot point the server at itself or at
 * a private network.
 */
const MAX_BYTES = 400_000;

async function fetchHtml(start: string, timeoutMs: number): Promise<{ html: string; url: string } | null> {
  let current = start;
  for (let hop = 0; hop < 4; hop++) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      return null;
    }
    if ((url.protocol !== "http:" && url.protocol !== "https:") || !isPublicHost(url.hostname)) return null;
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
        headers: { "User-Agent": "SantamoreProspects/1.0 (+https://santamore.me)", Accept: "text/html,application/xhtml+xml" },
      });
    } catch {
      return null;
    }
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) return null;
      current = new URL(next, url).toString();
      continue;
    }
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read().catch(() => ({ done: true, value: undefined }));
      if (done || !value) break;
      chunks.push(value);
      size += value.byteLength;
    }
    void reader.cancel().catch(() => undefined);
    return { html: new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks)), url: url.toString() };
  }
  return null;
}

const CONTACT_LINK = /href=["']([^"'#]+)["'][^>]*>[^<]{0,40}(kontakt|contact|impressum|about|o nama|o-nama)/i;

export interface SiteContacts {
  emails: string[];
  instagram: string | null;
  /** The pages the details were read from. */
  pages: string[];
}

/** The contacts a website publishes, or null when it could not be read. */
export async function readSiteContacts(website: string, timeoutMs = 6000): Promise<SiteContacts | null> {
  const home = await fetchHtml(website, timeoutMs);
  if (!home) return null;
  const first = extractContacts(home.html, home.url);
  const pages = [home.url];
  let emails = first.emails;
  let instagram = first.instagram;
  if (emails.length === 0 || !instagram) {
    const link = CONTACT_LINK.exec(home.html)?.[1];
    if (link) {
      const contact = await fetchHtml(new URL(link, home.url).toString(), timeoutMs);
      if (contact) {
        const more = extractContacts(contact.html, contact.url);
        if (more.emails.length > 0 || more.instagram) pages.push(contact.url);
        emails = [...new Set([...emails, ...more.emails])].slice(0, 3);
        instagram = instagram ?? more.instagram;
      }
    }
  }
  return { emails, instagram, pages };
}
