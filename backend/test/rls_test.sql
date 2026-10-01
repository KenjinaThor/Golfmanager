-- RLS-Tests für backend/schema.sql. Ablauf siehe backend/test/run.sh
\set ON_ERROR_STOP on

create or replace function as_user(u uuid) returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', u::text, true);
  set local role authenticated;
end $$;

do $$
declare
  a uuid := '00000000-0000-0000-0000-00000000000a';  -- Alice
  b uuid := '00000000-0000-0000-0000-00000000000b';  -- Bob
  c uuid := '00000000-0000-0000-0000-00000000000c';  -- Carl (Fremder / Angreifer)
  s uuid := '00000000-0000-0000-0000-00000000000d';  -- Zweitkonto von Carl
  n int;
  ok boolean;
begin
  insert into auth.users values (a), (b), (c), (s);

  perform as_user(a);
  insert into profiles values (a, 'alice', 'Alice', 10.0);
  insert into profile_details values (a, '{"club":"X"}');
  insert into rounds values ('r-a', a, 'c', '2026-01-01', '{}');
  perform as_user(b);
  insert into profiles values (b, 'bob', 'Bob', 20.0);
  insert into rounds values ('r-b', b, 'c', '2026-01-02', '{}');
  perform as_user(c);
  insert into profiles values (c, 'carl', 'Carl', 30.0);
  perform as_user(s);
  insert into profiles values (s, 'carl2', 'Carl2', 30.0);

  -- 1. Suche: alle Eingeloggten sehen Username/Name/Handicap, aber keine Runden/Details von Fremden
  perform as_user(b);
  select count(*) into n from profiles where username in ('alice','bob','carl','carl2'); assert n = 4, 'Profilsuche';
  select count(*) into n from rounds where user_id = a; assert n = 0, 'Fremde Runden sichtbar';
  select count(*) into n from profile_details where id = a; assert n = 0, 'Fremde Details sichtbar';

  -- 2. Anfrage: ausstehend gibt keinen Zugriff, Absender kann sich nicht selbst bestätigen
  insert into friendships (requester, addressee) values (b, a);
  begin
    update friendships set status = 'accepted' where requester = b and addressee = a;
    get diagnostics n = row_count; assert n = 0, 'Selbstbestätigung möglich';
  exception when insufficient_privilege then null; end;
  select count(*) into n from rounds where user_id = a; assert n = 0, 'Zugriff trotz pending';

  -- 3. Bestätigung durch Empfänger -> beide sehen Runden und Details
  perform as_user(a);
  update friendships set status = 'accepted' where requester = b and addressee = a;
  get diagnostics n = row_count; assert n = 1, 'Annehmen fehlgeschlagen';
  select count(*) into n from rounds where user_id = b; assert n = 1, 'Alice sieht Bobs Runden nicht';
  perform as_user(b);
  select count(*) into n from rounds where user_id = a; assert n = 1, 'Bob sieht Alices Runden nicht';
  select count(*) into n from profile_details where id = a; assert n = 1, 'Bob sieht Alices Details nicht';

  -- 4. Fremder sieht weiterhin nichts
  perform as_user(c);
  select count(*) into n from rounds where user_id in (a, b); assert n = 0, 'Fremder sieht Runden';
  select count(*) into n from profile_details where id in (a, b); assert n = 0, 'Fremder sieht Details';

  -- 5. Fremder kann nichts in fremdem Namen schreiben
  ok := false;
  begin insert into rounds values ('r-fake', a, 'c', '2026-01-03', '{}'); exception when others then ok := true; end;
  assert ok, 'Runde für fremden Nutzer angelegt';
  ok := false;
  begin insert into friendships values (c, a, 'accepted'); exception when others then ok := true; end;
  assert ok, 'Freundschaft direkt als accepted angelegt';
  ok := false;
  begin insert into friendships values (a, c, 'pending'); exception when others then ok := true; end;
  assert ok, 'Anfrage im Namen eines anderen';

  -- 6. Angriff: Zweitkonto fragt Carl an, Carl biegt die Zeile auf das Opfer um
  perform as_user(s);
  insert into friendships (requester, addressee) values (s, c);
  perform as_user(c);
  ok := false;
  begin
    update friendships set requester = a, status = 'accepted' where requester = s and addressee = c;
    get diagnostics n = row_count;
    ok := (n = 0);
  exception when others then ok := true; end;
  assert ok, 'Friendship-Zeile umgebogen';
  select count(*) into n from rounds where user_id = a; assert n = 0, 'Angreifer liest fremde Runden';

  -- 7. are_friends() verrät keine fremden Freundschaften
  select are_friends(a, b) into ok; assert ok = false, 'are_friends gibt Fremdbeziehung preis';
  perform as_user(a);
  select are_friends(a, b) into ok; assert ok = true, 'are_friends für eigene Freunde';

  -- 9. Ablehnen: der Empfänger löscht die offene Anfrage, sie verschwindet für beide
  perform as_user(c);
  delete from friendships where requester = s and addressee = c and status = 'pending';
  get diagnostics n = row_count; assert n = 1, 'Ablehnen fehlgeschlagen';
  perform as_user(s);
  select count(*) into n from friendships where requester = s; assert n = 0, 'Abgelehnte Anfrage noch sichtbar';

  -- 10. Zurückziehen: der Absender löscht seine offene Anfrage
  insert into friendships (requester, addressee) values (s, b);
  delete from friendships where requester = s and addressee = b and status = 'pending';
  get diagnostics n = row_count; assert n = 1, 'Zurückziehen fehlgeschlagen';

  -- 11. Unbeteiligte können fremde Freundschaften nicht löschen
  perform as_user(c);
  delete from friendships where (requester = a and addressee = b) or (requester = b and addressee = a);
  get diagnostics n = row_count; assert n = 0, 'Fremder löscht fremde Freundschaft';

  -- 12. Entfernen: Bob löscht Alice als Freundin -> beide sehen sich nicht mehr
  perform as_user(b);
  delete from friendships where (requester = b and addressee = a) or (requester = a and addressee = b);
  get diagnostics n = row_count; assert n = 1, 'Entfernen fehlgeschlagen';
  select count(*) into n from rounds where user_id = a; assert n = 0, 'Bob sieht Alices Runden nach dem Entfernen';
  select count(*) into n from profile_details where id = a; assert n = 0, 'Bob sieht Alices Details nach dem Entfernen';
  perform as_user(a);
  select count(*) into n from rounds where user_id = b; assert n = 0, 'Alice sieht Bobs Runden nach dem Entfernen';
  select count(*) into n from profile_details where id = b; assert n = 0, 'Alice sieht Bobs Details nach dem Entfernen';
  select count(*) into n from friendships; assert n = 0, 'Freundschaftszeilen übrig';

  -- 8. Nicht angemeldet: nichts lesbar
  reset role; set local role anon;
  begin select count(*) into n from rounds; exception when insufficient_privilege then n := 0; end;
  assert n = 0, 'anon liest Runden';
  begin select count(*) into n from profiles; exception when insufficient_privilege then n := 0; end;
  assert n = 0, 'anon liest Profile';
  reset role;

  raise notice 'ALLE RLS-TESTS BESTANDEN';
end $$;
