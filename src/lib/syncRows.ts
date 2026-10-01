import { Profile, Round } from '../types';
import { sharedView } from './privacy';

/**
 * Zeilen, die für ein Profil in die Datenbank geschrieben werden. Nur Felder, die der Nutzer freigegeben hat;
 * «Nur für mich» und das Geburtsdatum werden nie übertragen.
 */
export const profileRows = (id: string, p: Profile) => {
  const v = sharedView(p);
  return {
    profile: { id, username: p.username.toLowerCase(), name: v.publicName, handicap_index: v.publicHandicap, public_data: v.publicData },
    details: { id, data: v.details },
  };
};

export const roundRow = (userId: string, r: Round) => ({ id: r.id, user_id: userId, course_id: r.courseId, played_at: r.date, data: r });
