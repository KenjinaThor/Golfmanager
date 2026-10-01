import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getCourse } from '../data/courses';
import { courseHandicap, coursePar, emptyScores } from '../lib/scoring';
import { Profile, Round, TeeId } from '../types';
import { defaultProfile } from './defaultProfile';
import { deleteRemoteRound, pushProfile, pushRound, scheduleProfilePush, type SyncResult } from '../lib/sync';

export { defaultProfile };

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

interface State {
  profile: Profile;
  rounds: Round[]; // abgeschlossene Runden (Historie)
  active: Round | null; // laufende Runde
  /** Runden, die dieses Gerät schon in der Cloud gesehen hat (damit anderswo gelöschte Runden nicht wieder auftauchen) */
  syncedRoundIds: string[];
  /** lokal gelöschte Runden, deren Löschung in der Cloud noch aussteht */
  deletedRoundIds: string[];

  setProfile: (p: Partial<Profile>) => void;
  startRound: (courseId: string, teeId: TeeId) => void;
  setStrokes: (hole: number, strokes: number | null) => void;
  /** delta = +1 / -1; zieht automatisch vom Ballvorrat im Profil ab bzw. gibt zurück */
  addLostBall: (hole: number, delta: 1 | -1) => void;
  finishRound: () => void;
  discardRound: () => void;
  deleteRound: (id: string) => void;
  /** Ergebnis eines Cloud-Abgleichs übernehmen */
  applySync: (r: SyncResult) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      rounds: [],
      active: null,
      syncedRoundIds: [],
      deletedRoundIds: [],

      setProfile: (p) => {
        set((s) => ({ profile: { ...s.profile, ...p, updatedAt: Date.now() } }));
        void pushProfile(get().profile);
      },

      startRound: (courseId, teeId) => {
        const course = getCourse(courseId);
        const tee = course?.tees.find((t) => t.id === teeId);
        if (!course || !tee) return;
        const { profile } = get();
        set({
          active: {
            id: newId(),
            courseId,
            courseName: course.name,
            teeId,
            date: new Date().toISOString(),
            handicapIndex: profile.handicapIndex,
            courseHandicap: course.noHandicap
              ? 0
              : courseHandicap(profile.handicapIndex, tee, coursePar(course), profile.gender ?? 'men', course.holes.length),
            holes: emptyScores(course.holes),
            completed: false,
          },
        });
      },

      setStrokes: (hole, strokes) =>
        set((s) =>
          s.active
            ? { active: { ...s.active, holes: s.active.holes.map((h) => (h.number === hole ? { ...h, strokes } : h)) } }
            : s,
        ),

      addLostBall: (hole, delta) => {
        set((s) => {
          if (!s.active) return s;
          const cur = s.active.holes.find((h) => h.number === hole)!.lostBalls;
          if (delta === -1 && cur === 0) return s;
          if (delta === 1 && s.profile.ballCount === 0) return s; // kein Ball mehr im Bag
          return {
            profile: { ...s.profile, ballCount: s.profile.ballCount - delta, updatedAt: Date.now() },
            active: {
              ...s.active,
              holes: s.active.holes.map((h) => (h.number === hole ? { ...h, lostBalls: cur + delta } : h)),
            },
          };
        });
        scheduleProfilePush(() => get().profile);
      },

      finishRound: () => {
        const a = get().active;
        if (!a) return;
        const done = { ...a, completed: true };
        set((s) => ({ rounds: [done, ...s.rounds], active: null }));
        void pushProfile(get().profile);
        void pushRound(done).then((ok) => {
          if (ok) set((s) => ({ syncedRoundIds: [...new Set([...(s.syncedRoundIds ?? []), done.id])] }));
        });
      },

      discardRound: () => {
        set((s) => {
          // verlorene Bälle der verworfenen Runde zurückbuchen
          const lost = s.active?.holes.reduce((n, h) => n + h.lostBalls, 0) ?? 0;
          return { active: null, profile: { ...s.profile, ballCount: s.profile.ballCount + lost, updatedAt: Date.now() } };
        });
        scheduleProfilePush(() => get().profile);
      },

      deleteRound: (id) => {
        set((s) => ({
          rounds: s.rounds.filter((r) => r.id !== id),
          syncedRoundIds: (s.syncedRoundIds ?? []).filter((x) => x !== id),
          deletedRoundIds: [...new Set([...(s.deletedRoundIds ?? []), id])],
        }));
        // Löschung in der Cloud; schlägt sie fehl (offline), bleibt sie vorgemerkt und wird beim nächsten Abgleich erledigt
        void deleteRemoteRound(id).then((ok) => {
          if (ok) set((s) => ({ deletedRoundIds: (s.deletedRoundIds ?? []).filter((x) => x !== id) }));
        });
      },

      applySync: (r) =>
        set((s) => {
          const gone = new Set(r.removeRoundIds);
          const have = new Set(s.rounds.map((x) => x.id));
          const rounds = [...s.rounds.filter((x) => !gone.has(x.id)), ...r.addRounds.filter((x) => !have.has(x.id))].sort((a, b) =>
            b.date.localeCompare(a.date),
          );
          return {
            profile: r.profile,
            rounds,
            syncedRoundIds: r.syncedRoundIds,
            deletedRoundIds: (s.deletedRoundIds ?? []).filter((x) => !r.clearedDeletes.includes(x)),
          };
        }),
    }),
    { name: 'golfmanager-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
