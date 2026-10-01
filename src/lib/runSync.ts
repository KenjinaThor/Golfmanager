import { syncAll } from './sync';
import { useStore } from '../store/useStore';

/** Abgleich mit der Cloud anstossen und das Ergebnis in den lokalen Speicher übernehmen. */
export async function runSync(): Promise<boolean> {
  const st = useStore.getState();
  const result = await syncAll({
    profile: st.profile,
    rounds: st.rounds,
    syncedRoundIds: st.syncedRoundIds ?? [],
    deletedRoundIds: st.deletedRoundIds ?? [],
  });
  if (!result) return false;
  useStore.getState().applySync(result);
  return true;
}
