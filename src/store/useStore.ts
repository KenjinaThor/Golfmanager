import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getCourse } from '../data/courses';
import { courseHandicap, coursePar, emptyScores } from '../lib/scoring';
import { Profile, Round, TeeId } from '../types';
import { defaultProfile } from './defaultProfile';
import { deleteRemoteRound, pushProfile, pushRound, scheduleProfilePush } from '../lib/sync';

export { defaultProfile };

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

interface State {
  profile: Profile;
  rounds: Round[]; // abgeschlossene Runden (Historie)
  active: Round | null; // laufende Runde

  setProfile: (p: Partial<Profile>) => void;
  startRound: (courseId: string, teeId: TeeId) => void;
  setStrokes: (hole: number, strokes: number | null) => void;
  /** delta = +1 / -1; zieht automatisch vom Ballvorrat im Profil ab bzw. gibt zurück */
  addLostBall: (hole: number, delta: 1 | -1) => void;
  finishRound: () => void;
  discardRound: () => void;
  deleteRound: (id: string) => void;
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      rounds: [],
      active: null,

      setProfile: (p) => {
        set((s) => ({ profile: { ...s.profile, ...p } }));
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
            profile: { ...s.profile, ballCount: s.profile.ballCount - delta },
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
        void pushRound(done);
        void pushProfile(get().profile);
      },

      discardRound: () => {
        set((s) => {
          // verlorene Bälle der verworfenen Runde zurückbuchen
          const lost = s.active?.holes.reduce((n, h) => n + h.lostBalls, 0) ?? 0;
          return { active: null, profile: { ...s.profile, ballCount: s.profile.ballCount + lost } };
        });
        scheduleProfilePush(() => get().profile);
      },

      deleteRound: (id) => {
        set((s) => ({ rounds: s.rounds.filter((r) => r.id !== id) }));
        void deleteRemoteRound(id);
      },
    }),
    { name: 'golfmanager-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
