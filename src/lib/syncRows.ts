import { Profile, Round } from '../types';
import { sharedView } from './privacy';

/**
 * Zeilen, die für ein Profil in die Datenbank geschrieben werden. Freigegebene Felder gehen in profiles/profile_details,
 * «Nur für mich» in profile_private (nur für den Besitzer lesbar). Das Geburtsdatum wird nie übertragen.
 */
export const profileRows = (id: string, p: Profile) => {
  const v = sharedView(p);
  return {
    profile: { id, username: p.username.toLowerCase(), name: v.publicName, handicap_index: v.publicHandicap, public_data: v.publicData },
    details: { id, data: v.details },
    privateRow: { id, data: v.privateData },
  };
};

export const roundRow = (userId: string, r: Round) => ({ id: r.id, user_id: userId, course_id: r.courseId, played_at: r.date, data: r });
