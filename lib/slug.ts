// URL slugs from user-entered titles. Montenegrin Latin diacritics get
// their conventional ASCII transliterations (đ → dj); everything else is
// stripped via NFD. Callers append a random suffix on uniqueness
// collisions, and use the fallback when nothing survives (e.g. an
// all-Cyrillic title).

export function slugify(input: string, fallback = "stranica"): string {
  const slug = input
    .toLowerCase()
    .replace(/đ/g, "dj")
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}
