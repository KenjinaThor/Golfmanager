#!/usr/bin/env bash
# Spielt schema.sql in eine leere lokale Postgres-Datenbank ein und führt die RLS-Tests aus.
# Voraussetzung: laufender Postgres und psql; Verbindung über PG*-Umgebungsvariablen (PGHOST, PGPORT, PGUSER).
set -euo pipefail
cd "$(dirname "$0")"
DB=golf_rls_test
dropdb --if-exists "$DB" && createdb "$DB"
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f emulate_supabase.sql -f ../schema.sql -f rls_test.sql 2>&1 | grep -E "NOTICE|ERROR|ASSERT|CONTEXT" || true
dropdb "$DB" || true
