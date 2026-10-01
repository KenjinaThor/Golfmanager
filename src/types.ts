/** Abschlag-ID, z. B. 'back', 'backStandard', 'standard', 'frontStandard' (Waldkirch) oder 'white' … (Platzhalterplätze) */
export type TeeId = string;
export type Gender = 'men' | 'ladies';

export interface TeeRating {
  rating: number; // Course Rating
  slope: number; // Slope Rating
}

export interface Tee {
  id: TeeId;
  name: string;
  /** Rating/Slope je Geschlecht; fehlt der Eintrag, ist das Rating unbekannt */
  ratings: Partial<Record<Gender, TeeRating>>;
  /** Abschlagmarker laut Scorekarte, z. B. 'B28-G30' */
  markers?: string;
}

export interface Hole {
  number: number;
  par: number;
  hcpIndex: number; // Stroke Index 1..18 (1 = schwerstes Loch)
  distances: Record<TeeId, number>; // Meter pro Abschlag
  /** Schlüssel des Lochbilds in src/data/holeImages.ts (fehlt, wenn kein Bild vorhanden) */
  image?: string;
}

export interface Course {
  id: string;
  name: string;
  region: string;
  tees: Tee[];
  holes: Hole[];
  /** false = Daten sind Platzhalter und müssen geprüft werden */
  verified: boolean;
  /** true = Übungsplatz ohne Rating: keine Platzvorgabe, nur Brutto */
  noHandicap?: boolean;
  /** Schlüssel der Platzübersicht in src/data/holeImages.ts */
  overview?: string;
}

export interface Profile {
  name: string;
  username: string;
  handicapIndex: number;
  heightCm: number | null;
  gender: Gender; // bestimmt, welches Rating gilt
  handedness: 'right' | 'left';
  homeClub: string;
  clubBrand: string;
  ballBrand: string;
  ballCount: number;
  driverDistance: number | null; // Meter
  bio: string;
  /** Zeitpunkt der letzten Änderung (ms); der neuere Stand gewinnt beim Abgleich zwischen Geräten */
  updatedAt?: number;
}

export interface HoleScore {
  number: number;
  strokes: number | null;
  lostBalls: number;
}

export interface Round {
  id: string;
  courseId: string;
  courseName: string;
  teeId: TeeId;
  date: string; // ISO
  handicapIndex: number;
  courseHandicap: number;
  holes: HoleScore[];
  completed: boolean;
}
