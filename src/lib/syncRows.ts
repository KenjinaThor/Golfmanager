import { Profile, Round } from '../types';

/** Zeilen, die für ein Profil in die Datenbank geschrieben werden (öffentlicher Teil und Details für Freunde). */
export const profileRows = (id: string, p: Profile) => ({
  profile: { id, username: p.username.toLowerCase(), name: p.name, handicap_index: p.handicapIndex },
  details: { id, data: p },
});

export const roundRow = (userId: string, r: Round) => ({ id: r.id, user_id: userId, course_id: r.courseId, played_at: r.date, data: r });
