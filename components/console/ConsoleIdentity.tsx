import { Link } from "@/i18n/navigation";

/**
 * Who is signed in, at the foot of the console rail: name, email, the
 * access level where it matters, and the way to the profile page.
 */
export function ConsoleIdentity({ name, email, role, href, label }: { name: string; email: string | null; role?: string | null; href: string; label: string }) {
  return (
    <Link href={href} className="block rounded-lg px-3.5 py-2.5 transition-colors hover:bg-paper/10" aria-label={label}>
      <span className="flex items-center gap-2">
        <span className="block truncate text-[14px] font-bold text-paper">{name}</span>
        {role ? <span className="shrink-0 rounded-full border border-paper/30 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-paper/80">{role}</span> : null}
      </span>
      {email ? <span className="mt-0.5 block truncate text-[12.5px] text-paper/60">{email}</span> : null}
      <span className="mt-1 block text-[12.5px] font-semibold text-paper/70">{label} →</span>
    </Link>
  );
}
