export type UserRole = 'student' | 'staff';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  class?: string;
  year?: string;
  rollNumber?: string;
  systemNumber?: string;
  department?: string;
  createdAt: string;
}

export interface StudentProfile extends User {
  role: 'student';
  class: string;
  year: string;
  rollNumber: string;
  systemNumber: string;
}

export interface StaffProfile extends User {
  role: 'staff';
  department?: string;
}

export interface UploadedFile {
  id: string;
  studentId: string;
  studentName: string;
  recipientId?: string;
  recipientName?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  base64Data?: string;
  thumbnailUri?: string;
}

export interface Class {
  id: string;
  className: string;
  description?: string;
  year?: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
}

export interface AttendanceSession {
  id: string;
  sessionName: string;
  date: string;
  time: string;
  qrCode: string;
  createdBy: string;
  isActive: boolean;
  classFilter?: string; // Optional: filter session by specific class
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  systemNumber?: string;
  class: string;
  markedAt: string;
  date: string;
}

export type NotificationType = 'session_created' | 'absent' | 'general';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  metadata?: any;
}
