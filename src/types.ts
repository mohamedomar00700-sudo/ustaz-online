export type UserRole = 'admin' | 'supervisor' | 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatar?: string;
  country?: string;
  timezone?: string;
  specialties?: string[];
  grades?: string[];
  rating?: number;
  reviewsCount?: number;
  reviews?: { studentName: string; rating: number; comment: string; date: string }[];
  xp?: number;
  level?: number;
  streak?: number;
  badges?: string[];
  lastLoginDate?: string;
}

export interface Session {
  id: string;
  date: string;
  time: string;
  duration: number; // in minutes
  subject: string;
  grade?: string;
  status: 'pending' | 'reminded' | 'confirmed' | 'completed' | 'cancelled';
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  zoomUrl?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  text: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  isBlocked?: boolean;
}

export interface ActivityLog {
  id: string;
  type: 'contact_block' | 'session_reminder' | 'session_booking' | 'role_change' | 'general';
  timestamp: string;
  user: string;
  detail: string;
}

export interface RescheduleRequest {
  id: string;
  sessionId: string;
  sessionDetails: string;
  proposedDate: string;
  proposedTime: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  conflict?: string;
}

export interface Complaint {
  id: string;
  sessionId: string;
  user: string;
  detail: string;
  date: string;
  status: 'pending' | 'resolved';
}

export interface PlatformSettings {
  sessionDuration: number;
  maxSessionsPerDay: number;
  subjects: string[];
  grades: string[];
}

export interface Assessment {
  id: string;
  sessionId: string;
  sessionSubject: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  title: string;
  questions: { question: string; options: string[]; answer: number }[];
  studentAnswers?: number[];
  score?: number;
  maxScore: number;
  status: 'pending' | 'solved';
}
