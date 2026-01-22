export type UserRole = 'student' | 'staff';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: string;
}

export interface StudentProfile extends User {
  role: 'student';
  class: string;
  year: string;
  rollNumber: string;
}

export interface StaffProfile extends User {
  role: 'staff';
  department?: string;
}

export interface UploadedFile {
  id: string;
  studentId: string;
  studentName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  base64Data?: string;
  thumbnailUri?: string;
}

export interface AttendanceSession {
  id: string;
  sessionName: string;
  date: string;
  time: string;
  qrCode: string;
  createdBy: string;
  isActive: boolean;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionName: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  markedAt: string;
  date: string;
}
