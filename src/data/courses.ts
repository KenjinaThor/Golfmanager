import raw from './courses.json';
import { Course } from '../types';

export const courses = raw as Course[];
export const getCourse = (id: string) => courses.find((c) => c.id === id);
