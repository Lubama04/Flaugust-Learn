import type { Tables } from './database'

export type Profile = Tables<'profiles'>
export type Organization = Tables<'organizations'>
export type Course = Tables<'courses'>
export type Module = Tables<'modules'>
export type CourseSession = Tables<'sessions'>
export type Exercise = Tables<'exercises'>
export type Enrollment = Tables<'enrollments'>
export type SessionProgress = Tables<'session_progress'>
export type ExerciseResult = Tables<'exercise_results'>
export type Certificate = Tables<'certificates'>
export type Payment = Tables<'payments'>
export type LearnerNote = Tables<'learner_notes'>
export type CourseRating = Tables<'course_ratings'>

export type UserRole = Profile['role']
export type EnrollmentStatus = Enrollment['status']
export type CourseStatus = Course['status']
