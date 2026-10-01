-- Supabase (Postgres) Schema für Vernetzung & Daten-Sharing.
-- Im Supabase SQL-Editor ausführen. Auth: E-Mail/Passwort (Standard).

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  name text not null default '',
  handicap_index numeric(3,1)
);

-- Details (Grösse, Schläger, Bälle …) sind nur für Freunde sichtbar.
create table profile_details (
  id uuid primary key references profiles on delete cascade,
  data jsonb not null default '{}'
);

create table rounds (
  id text primary key,
  user_id uuid not null references auth.users on delete cascade,
  course_id text not null,
  played_at timestamptz not null,
  data jsonb not null
);
create index on rounds (user_id, played_at desc);

create table friendships (
  requester uuid not null references auth.users on delete cascade,
  addressee uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- Nur für die eigenen Beziehungen (a muss der angemeldete Nutzer sein), damit fremde Freundschaften nicht abfragbar sind.
create function are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a = auth.uid() and exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a)));
$$;

alter table profiles enable row level security;
alter table profile_details enable row level security;
alter table rounds enable row level security;
alter table friendships enable row level security;

-- Öffentlich (für Eingeloggte): nur Username/Name/Handicap, damit man Freunde suchen kann.
create policy "profiles lesen" on profiles for select to authenticated using (true);
create policy "eigenes profil schreiben" on profiles for insert to authenticated with check (id = auth.uid());
create policy "eigenes profil ändern" on profiles for update to authenticated using (id = auth.uid());

create policy "details lesen" on profile_details for select to authenticated
  using (id = auth.uid() or are_friends(auth.uid(), id));
create policy "eigene details schreiben" on profile_details for insert to authenticated with check (id = auth.uid());
create policy "eigene details ändern" on profile_details for update to authenticated using (id = auth.uid());

-- Runden: nur eigene und die von bestätigten Freunden.
create policy "runden lesen" on rounds for select to authenticated
  using (user_id = auth.uid() or are_friends(auth.uid(), user_id));
create policy "eigene runden schreiben" on rounds for insert to authenticated with check (user_id = auth.uid());
create policy "eigene runden ändern" on rounds for update to authenticated using (user_id = auth.uid());
create policy "eigene runden löschen" on rounds for delete to authenticated using (user_id = auth.uid());

-- Freundschaften: Anfrage senden, als Empfänger annehmen, beide dürfen beenden.
create policy "freundschaften lesen" on friendships for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
create policy "anfrage senden" on friendships for insert to authenticated
  with check (requester = auth.uid() and status = 'pending');
-- Annehmen: nur der Empfänger und nur die Spalte status (sonst könnte er requester auf ein Opfer umbiegen).
revoke update on friendships from anon, authenticated;
grant update (status) on friendships to authenticated;
create policy "anfrage annehmen" on friendships for update to authenticated
  using (addressee = auth.uid() and status = 'pending')
  with check (addressee = auth.uid() and status = 'accepted');
create policy "freundschaft beenden" on friendships for delete to authenticated
  using (requester = auth.uid() or addressee = auth.uid());
