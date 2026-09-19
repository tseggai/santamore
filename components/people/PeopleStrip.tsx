import { teamPhotoUrl } from "@/lib/storage";

export interface PublicPerson {
  id: string;
  kind: string;
  full_name: string;
  title: string | null;
  quote: string | null;
  photo_path: string | null;
  years: number[];
  sort_order: number;
}

/**
 * People attached to a section of a page: photo, name, title. `cards`
 * adds the person's own words; the compact form is a row of chips.
 */
export function PeopleStrip({ people, cards = false, dark = false, showYears = false }: { people: PublicPerson[]; cards?: boolean; dark?: boolean; showYears?: boolean }) {
  if (people.length === 0) return null;
  if (cards) {
    return (
      <ul className="grid gap-4 sm:grid-cols-2">
        {people.map((member) => {
          const photo = teamPhotoUrl(member.photo_path);
          return (
            <li key={member.id} className="flex gap-4 rounded-brand bg-mist px-5 py-4">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
                <img src={photo} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : null}
              <div className="min-w-0">
                <p className="type-display text-xl">{member.full_name}</p>
                {member.title ? <p className="mt-0.5 text-[14px] text-black/60">{member.title}</p> : null}
                {member.quote ? <p className="mt-2 text-[14.5px] leading-relaxed text-black/70">“{member.quote}”</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {people.map((member) => {
        const photo = teamPhotoUrl(member.photo_path);
        return (
          <li key={member.id} className={`inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-[14px] ${dark ? "bg-paper/12 text-paper" : "bg-mist"}`}>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- public bucket, arbitrary sizes
              <img src={photo} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : null}
            <span className="font-semibold">{member.full_name}</span>
            {member.title ? <span className={dark ? "text-paper/70" : "text-black/55"}>· {member.title}</span> : null}
            {showYears && member.years.length > 0 ? <span className={`font-mono text-[12.5px] tabular-nums ${dark ? "text-paper/60" : "text-black/50"}`}>{member.years.join(", ")}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}
