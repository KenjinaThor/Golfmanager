-- Minimales Abbild der Supabase-Umgebung für lokale Tests (Rollen, auth.users, auth.uid()).
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated;
-- Supabase vergibt standardmässig alle Rechte an anon/authenticated; RLS und Spaltenrechte begrenzen sie.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
