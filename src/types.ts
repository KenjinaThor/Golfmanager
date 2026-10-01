export type TeeId = 'white' | 'yellow' | 'blue' | 'red';

export interface Tee {
  id: TeeId;
  name: string;
  rating: number; // Course Rating
  slope: number; // Slope Rating
}

export interface Hole {
  number: number;
  par: number;
  hcpIndex: number; // Stroke Index 1..18 (1 = schwerstes Loch)
  distances: Partial<Record<TeeId, number>>; // Meter pro Abschlag
}

export interface Course {
  id: string;
  name: string;
  region: string;
  tees: Tee[];
  holes: Hole[];
  /** false = Daten sind Platzhalter und müssen geprüft werden */
  verified: boolean;
}

export interface Profile {
  name: string;
  username: string;
  handicapIndex: number;
  heightCm: number | null;
  handedness: 'right' | 'left';
  homeClub: string;
  clubBrand: string;
  ballBrand: string;
  ballCount: number;
  driverDistance: number | null; // Meter
  bio: string;
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
