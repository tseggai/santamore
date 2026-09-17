-- 0032 · Santamore 25 on the record.
-- The sponsors named on the 2025 site (satoc.in/donors, owner-supplied
-- 2026-09-17) become supporters with a 2025 sponsorship each, hung on a
-- private "Santamore 25" cause dated December 2025 so the year views
-- attribute them. The 2025 year report is started as a draft: legacy,
-- not public, with the event, the two beneficiaries and the story the
-- owner completes and publishes. Amounts are the published ones; what
-- the site did not state stays null. Re-runnable: nothing is inserted
-- twice.

do $$
declare
  v_chapter  uuid;
  v_campaign uuid;
  v_id       uuid;
  r record;
begin
  select id into v_chapter from public.chapters where slug = 'boka';
  if v_chapter is null then
    select id into v_chapter from public.chapters order by name limit 1;
  end if;
  if v_chapter is null then
    raise exception 'seed_santamore_25: no chapter to hang the 2025 cause on';
  end if;

  -- 1 ─ the 2025 cause (private: it is a record, not something to give to)
  select id into v_campaign from public.campaigns where slug = 'santamore-25';
  if v_campaign is null then
    insert into public.campaigns
      (chapter_id, title, slug, description, goal_cents, starts_at, ends_at, beneficiary_summary, is_public, payment_reference, suggested_amounts)
    values
      (v_chapter, 'Santamore 25', 'santamore-25',
       'The first Santamore: a run and a walk through Tivat in red suits, December 2025. Every cent raised went to Dnevni Centar Tivat and Dječji dom „Mladost“ Bijela.',
       null, '2025-12-01T00:00:00+01:00', '2025-12-31T23:59:59+01:00',
       'Dnevni Centar Tivat · Dječji dom „Mladost“ Bijela',
       false, 'SM-1225-0001',
       '{"oneoff":[{"amount_cents":1000},{"amount_cents":2500,"default":true},{"amount_cents":5000}],"monthly":[{"amount_cents":500},{"amount_cents":1000,"default":true},{"amount_cents":2000}]}'::jsonb)
    returning id into v_campaign;
  end if;

  -- 2 ─ supporters and their 2025 sponsorships
  for r in
    select * from (values
      ('Lotta',                      'lotta',                      'founding', null::bigint, true,  'Founding sponsor: every operating cost of Santamore 25, the payment and banking infrastructure, and up to 20 Santa suits, gowns, hats and tiaras.'),
      ('Stari Mlini',                'stari-mlini',                'silver',   100000,       false, 'Silver Bells sponsor.'),
      ('Salon Privé',                'salon-prive',                'bronze',   null::bigint, true,  'After-party host; 20% off drinks for crawlers; 100% of the event''s proceeds to the beneficiaries.'),
      ('Humano & Entourage',         'humano-entourage',           'bronze',   50000,        false, 'Jingle Bell sponsor.'),
      ('Sofi',                       'sofi',                       'bronze',   50000,        false, 'Jingle Bell sponsor; 20% off drinks for crawlers; 100% of the event''s proceeds to the beneficiaries.'),
      ('Siro',                       'siro',                       'bronze',   50000,        false, 'Jingle Bell sponsor; post-marathon party with Entourage; a share of its proceeds to the beneficiaries.'),
      ('Al Posto Giusto',            'al-posto-giusto',            'bronze',   50000,        false, 'Jingle Bell sponsor; 10% off everything for crawlers.'),
      ('BCM Group',                  'bcm-group',                  'bronze',   50000,        false, 'Jingle Bell sponsor.'),
      ('Porto Montenegro Marketing', 'porto-montenegro-marketing', 'bronze',   50000,        false, 'Jingle Bell sponsor.')
    ) as t(name, slug, tier, amount_cents, is_in_kind, notes)
  loop
    -- Match a supporter staff may already have entered, by slug or by name.
    select id into v_id from public.supporters
     where slug = r.slug or lower(name) = lower(r.name)
     order by (slug = r.slug) desc limit 1;
    if v_id is null then
      insert into public.supporters (name, slug, notes, is_active)
      values (r.name, r.slug, r.notes, true)
      returning id into v_id;
    end if;
    if not exists (select 1 from public.sponsors s where s.supporter_id = v_id and s.campaign_id = v_campaign) then
      insert into public.sponsors (name, tier, chapter_id, campaign_id, amount_cents, is_in_kind, status, supporter_id)
      values (r.name, r.tier, v_chapter, v_campaign, r.amount_cents, r.is_in_kind, 'signed', v_id);
    end if;
  end loop;

  -- An anonymous Porto Montenegro staff member gave €500 and a day of
  -- activities; a sponsorship without a supporter entity keeps them anonymous.
  if not exists (select 1 from public.sponsors s where s.campaign_id = v_campaign and s.name = 'Anonymous (Porto Montenegro staff member)') then
    insert into public.sponsors (name, tier, chapter_id, campaign_id, amount_cents, is_in_kind, status)
    values ('Anonymous (Porto Montenegro staff member)', 'bronze', v_chapter, v_campaign, 50000, false, 'signed');
  end if;

  -- 3 ─ the 2025 report, as a draft for the owner to finish
  if not exists (select 1 from public.year_reports where year = 2025) then
    insert into public.year_reports
      (year, headline, summary_md, plan_md, volunteers, beneficiaries, venues, is_public, is_legacy, figures, events, supporters, beneficiaries_list, donors_list)
    values
      (2025,
       'Our first year: one run, one crawl, every cent given away.',
       E'**Dnevni Centar Tivat** provides a comprehensive service for children and young people with disabilities and their families. The Municipality of Tivat invested €660,000 in a new multi-functional building for the centre, equipped to every prescribed standard, with a professional team of psychologists, pedagogues and therapists offering half-day and full-day care for up to 20 users.\n\n**Dječji dom „Mladost“ Bijela** is the only institution of its kind in Montenegro, caring for children without parental care and those who need developmental support. Its operations are subject to official financial audits, and it has been supported by international donor groups such as the Wales football fans'' charity Gôl Cymru.\n\nOne hundred percent of the funds raised at Santamore 25 were split between the two. Operating costs were covered by the founding sponsor.',
       null, null, null, '{}',
       false, true,
       '{}'::jsonb,
       '[{"name":"Santamore 25","date":null,"venue":"Tivat"}]'::jsonb,
       '{}',
       '[{"label":"Dnevni Centar Tivat","amount_cents":null},{"label":"Dječji dom „Mladost“ Bijela","amount_cents":null}]'::jsonb,
       '[]'::jsonb);
  end if;
end $$;
