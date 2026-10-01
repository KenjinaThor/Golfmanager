-- Supabase (Postgres) Schema für Vernetzung & Daten-Sharing.
-- Im Supabase SQL-Editor ausführen. Auth: E-Mail/Passwort (Standard).
-- Das Skript ist wiederholbar: es kann auf einem leeren, teilweise eingespielten oder fertigen Projekt laufen,
-- ohne Daten zu löschen (Tabellen werden nur angelegt, wenn sie fehlen; Regeln werden neu gesetzt).

-- Schutz: eine fremde, gleichnamige Tabelle «profiles» (z. B. aus einer Supabase-Vorlage) nicht überschreiben.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'profiles')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'profiles' and column_name = 'handicap_index') then
    raise exception 'Die Tabelle profiles existiert schon, stammt aber nicht aus diesem Schema. Nichts geändert, bitte melden.';
  end if;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  name text not null default '',
  handicap_index numeric(3,1),
  -- weitere öffentlich freigegebene Angaben (vom Nutzer pro Feld gewählt), für alle angemeldeten Nutzer lesbar
  public_data jsonb not null default '{}'
);
-- für Projekte, die schon eine ältere Fassung der Tabelle haben
alter table profiles add column if not exists public_data jsonb not null default '{}';

-- Details (Grösse, Schläger, Bälle …) sind nur für Freunde sichtbar.
create table if not exists profile_details (
  id uuid primary key references profiles on delete cascade,
  data jsonb not null default '{}'
);

-- «Nur für mich»: gehört dem Besitzer, kein anderer Nutzer kann es lesen (auch keine Freunde). Dient dem Abgleich eigener Geräte.
create table if not exists profile_private (
  id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'
);

create table if not exists rounds (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  course_id text not null,
  played_at timestamptz not null,
  data jsonb not null
);
create index if not exists rounds_user_id_played_at_idx on rounds (user_id, played_at desc);

create table if not exists friendships (
  requester uuid not null references auth.users on delete cascade,
  addressee uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- Nur für die eigenen Beziehungen (a muss der angemeldete Nutzer sein), damit fremde Freundschaften nicht abfragbar sind.
create or replace function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a = auth.uid() and exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a)));
$$;

alter table profiles enable row level security;
alter table profile_details enable row level security;
alter table profile_private enable row level security;
alter table rounds enable row level security;
alter table friendships enable row level security;

-- Öffentlich (für Eingeloggte): nur Username/Name/Handicap, damit man Freunde suchen kann.
drop policy if exists "profiles lesen" on profiles;
create policy "profiles lesen" on profiles for select to authenticated using (true);
drop policy if exists "eigenes profil schreiben" on profiles;
create policy "eigenes profil schreiben" on profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "eigenes profil ändern" on profiles;
create policy "eigenes profil ändern" on profiles for update to authenticated using (id = auth.uid());

drop policy if exists "details lesen" on profile_details;
create policy "details lesen" on profile_details for select to authenticated
  using (id = auth.uid() or are_friends(auth.uid(), id));
drop policy if exists "eigene details schreiben" on profile_details;
create policy "eigene details schreiben" on profile_details for insert to authenticated with check (id = auth.uid());
drop policy if exists "eigene details ändern" on profile_details;
create policy "eigene details ändern" on profile_details for update to authenticated using (id = auth.uid());

drop policy if exists "privat lesen" on profile_private;
create policy "privat lesen" on profile_private for select to authenticated using (id = auth.uid());
drop policy if exists "privat schreiben" on profile_private;
create policy "privat schreiben" on profile_private for insert to authenticated with check (id = auth.uid());
drop policy if exists "privat ändern" on profile_private;
create policy "privat ändern" on profile_private for update to authenticated using (id = auth.uid());

-- Runden: nur eigene und die von bestätigten Freunden.
drop policy if exists "runden lesen" on rounds;
create policy "runden lesen" on rounds for select to authenticated
  using (user_id = auth.uid() or are_friends(auth.uid(), user_id));
drop policy if exists "eigene runden schreiben" on rounds;
create policy "eigene runden schreiben" on rounds for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "eigene runden ändern" on rounds;
create policy "eigene runden ändern" on rounds for update to authenticated using (user_id = auth.uid());
drop policy if exists "eigene runden löschen" on rounds;
create policy "eigene runden löschen" on rounds for delete to authenticated using (user_id = auth.uid());

-- Freundschaften: Anfrage senden, als Empfänger annehmen, beide dürfen beenden.
drop policy if exists "freundschaften lesen" on friendships;
create policy "freundschaften lesen" on friendships for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
drop policy if exists "anfrage senden" on friendships;
create policy "anfrage senden" on friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending');
-- Annehmen: nur der Empfänger und nur die Spalte status (sonst könnte er requester auf ein Opfer umbiegen).
revoke update on friendships from anon, authenticated;
grant update (status) on friendships to authenticated;
drop policy if exists "anfrage annehmen" on friendships;
create policy "anfrage annehmen" on friendships for update to authenticated
  using (addressee = auth.uid() and status = 'pending')
  with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "freundschaft beenden" on friendships;
create policy "freundschaft beenden" on friendships for delete to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
