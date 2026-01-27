---
description: Complete workflow of the SIVA-SIR Education Portal application
---

# SIVA-SIR Education Portal - Complete Application Workflow

## 📱 Application Overview

**SIVA-SIR** (EduPortal) is a comprehensive education management system built with React Native and Expo that facilitates attendance tracking, file management, and class administration for educational institutions.

### Tech Stack

- **Frontend**: React Native 0.79.4 + Expo ~53.0.12
- **Navigation**: Expo Router ~5.1.0
- **Backend**: Supabase (Authentication, Database, Storage, Realtime)
- **Language**: TypeScript 5.8.3
- **State Management**: React Context API
- **UI Components**: React Native Paper, Expo Vector Icons, Lottie Animations

---

## 🎯 Core Features

1. **Dual Role System** (Student & Staff)
2. **QR Code-based Attendance**
3. **File Upload & Management**
4. **Class Management**
5. **PDF Report Generation**
6. **Real-time Updates**
7. **Professional UI/UX**

---

## 🔄 Application Workflow

### 1️⃣ **Initial Launch & Authentication**

#### A. First-Time User Flow

```
App Launch
    ↓
Splash Screen (ProfessionalSplashScreen.tsx)
    ↓
Role Selection Screen (role-select.tsx)
    ↓
User selects: [Student] or [Staff]
    ↓
    ├─→ Student Signup (student-signup.tsx)
    │       ↓
    │   Enter Details:
    │   - Email
    │   - Password
    │   - Name
    │   - Roll Number
    │   - Class (from dropdown)
    │   - Year
    │       ↓
    │   AuthService.signup() → Creates auth user + profile
    │       ↓
    │   Email Confirmation Required
    │       ↓
    │   Confirm Success Screen (confirm-success.tsx)
    │
    └─→ Staff Signup (staff-signup.tsx)
            ↓
        Enter Details:
        - Email
        - Password
        - Name
        - Department
            ↓
        AuthService.signup() → Creates auth user + profile
            ↓
        Email Confirmation Required
            ↓
        Confirm Success Screen
```

#### B. Returning User Flow

```
App Launch
    ↓
Splash Screen
    ↓
AuthContext checks session
    ↓
    ├─→ No Session → Role Selection Screen
    │
    └─→ Session Exists
            ↓
        Check Email Confirmed
            ↓
            ├─→ Not Confirmed → Clear session → Role Selection
            │
            └─→ Confirmed → Fetch User Profile
                    ↓
                Check Role
                    ↓
                    ├─→ Student → Student Dashboard
                    └─→ Staff → Staff Dashboard
```

#### C. Login Flow

```
Role Selection Screen
    ↓
User clicks "Already have an account?"
    ↓
    ├─→ Student Login (student-login.tsx)
    │       ↓
    │   Enter: Email + Password
    │       ↓
    │   AuthService.login()
    │       ↓
    │   Verify email confirmed
    │       ↓
    │   Fetch profile from Supabase
    │       ↓
    │   Student Dashboard
    │
    └─→ Staff Login (staff-login.tsx)
            ↓
        Enter: Email + Password
            ↓
        AuthService.login()
            ↓
        Verify email confirmed
            ↓
        Fetch profile from Supabase
            ↓
        Staff Dashboard
```

---

### 2️⃣ **Student Dashboard Workflow**

```
Student Dashboard (student-dashboard.tsx)
    ↓
Three Main Tabs:
    │
    ├─→ [Home Tab]
    │       ↓
    │   Display:
    │   - Welcome message with student name
    │   - Quick stats (attendance count, files uploaded)
    │   - Recent activity
    │
    ├─→ [Attendance Tab]
    │       ↓
    │   QR Scanner Button
    │       ↓
    │   Click → Navigate to QR Scanner (qr-scanner.tsx)
    │       ↓
    │   Camera Permission Check
    │       ↓
    │   Scan QR Code
    │       ↓
    │   Validate QR Code:
    │   - Check if session exists
    │   - Check if session is active
    │   - Check if already marked
    │       ↓
    │   Mark Attendance:
    │   - Insert record in attendance_records table
    │   - Record: session_id, student_id, student_name, 
    │             roll_number, class, timestamp
    │       ↓
    │   Success Feedback → Return to Dashboard
    │       ↓
    │   View Attendance History:
    │   - List of all marked sessions
    │   - Date, time, session name
    │   - Total attendance count
    │
    └─→ [Files Tab]
            ↓
        Select Staff Member (Dropdown)
            ↓
        Upload Button Enabled
            ↓
        Choose File Type:
            ├─→ Image (Camera/Gallery)
            ├─→ Document (PDF, DOC, etc.)
            └─→ Other files
            ↓
        File Upload Process:
        - Upload to Supabase Storage (files bucket)
        - Create metadata in files table
        - Link to student_id and staff
            ↓
        View Uploaded Files:
        - Thumbnail preview
        - File name, size, type
        - Upload timestamp
        - Delete option
```

---

### 3️⃣ **Staff Dashboard Workflow**

```
Staff Dashboard (staff-dashboard.tsx)
    ↓
Four Main Tabs:
    │
    ├─→ [Home Tab]
    │       ↓
    │   Display:
    │   - Welcome message with staff name
    │   - Quick stats (total sessions, total attendance)
    │   - Recent sessions
    │   - Quick actions
    │
    ├─→ [Attendance Tab]
    │       ↓
    │   Two Sections:
    │       │
    │       ├─→ Create Session
    │       │       ↓
    │       │   Enter Details:
    │       │   - Session Name (e.g., "Morning Class")
    │       │   - Date (Calendar Picker)
    │       │   - Time
    │       │   - Class Filter (Optional)
    │       │       ↓
    │       │   Generate QR Code:
    │       │   - Create unique QR code string
    │       │   - Insert into attendance_sessions table
    │       │   - Set is_active = true
    │       │       ↓
    │       │   Display QR Code:
    │       │   - Large QR code for students to scan
    │       │   - Session details
    │       │   - Active/Inactive toggle
    │       │       ↓
    │       │   Real-time Attendance Updates:
    │       │   - Live count of students marked
    │       │   - List of students who marked attendance
    │       │
    │       └─→ View Attendance Records
    │               ↓
    │           Filter Options:
    │           - All Records
    │           - By Session
    │           - By Date Range
    │           - By Class
    │               ↓
    │           Display Records (Card Format):
    │           - Student Name
    │           - Roll Number • Class
    │           - Session Name • Date • Time
    │           - Check icon (✓)
    │               ↓
    │           Summary Statistics:
    │           - Total Present
    │           - Unique Students
    │           - Number of Sessions
    │               ↓
    │           Download PDF Report:
    │           - Generate professional PDF
    │           - Matches app UI design
    │           - Includes all filtered records
    │           - Summary statistics
    │           - Share/Save options
    │
    ├─→ [Files Tab]
    │       ↓
    │   View All Student Uploads:
    │   - Filter by student
    │   - Filter by date
    │   - Filter by file type
    │       ↓
    │   File Management:
    │   - Preview files
    │   - Download files
    │   - View metadata
    │   - Organized by student
    │
    └─→ [Classes Tab]
            ↓
        Class Management Screen (class-management.tsx)
            ↓
        Two Sections:
            │
            ├─→ Create New Class
            │       ↓
            │   Enter Details:
            │   - Class Name (e.g., "10-A", "11-Science")
            │   - Description
            │   - Year
            │       ↓
            │   ClassService.createClass()
            │       ↓
            │   Insert into classes table
            │       ↓
            │   Success → Refresh class list
            │
            └─→ View/Manage Classes
                    ↓
                Display All Classes (Card Format):
                - Class Name
                - Description
                - Year
                - Student Count
                - Created Date
                    ↓
                Actions per Class:
                - Edit (Update name, description, year)
                - Delete (Soft delete: is_active = false)
                - View Students (List of enrolled students)
```

---

## 🗄️ Database Schema

### Tables

#### 1. **profiles**

```sql
- id (UUID, PK, FK to auth.users)
- email (TEXT, UNIQUE)
- name (TEXT)
- role (TEXT: 'student' | 'staff')
- class (TEXT, nullable for staff)
- year (TEXT, nullable for staff)
- roll_number (TEXT, nullable for staff)
- department (TEXT, nullable for students)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 2. **attendance_sessions**

```sql
- id (UUID, PK)
- session_name (TEXT)
- date (DATE)
- time (TEXT)
- qr_code (TEXT, UNIQUE)
- created_by (UUID, FK to profiles)
- is_active (BOOLEAN)
- class_filter (TEXT, optional)
- created_at (TIMESTAMPTZ)
```

#### 3. **attendance_records**

```sql
- id (UUID, PK)
- session_id (UUID, FK to attendance_sessions)
- session_name (TEXT)
- student_id (UUID, FK to profiles)
- student_name (TEXT)
- roll_number (TEXT)
- class (TEXT)
- marked_at (TIMESTAMPTZ)
- date (DATE)
- UNIQUE(session_id, student_id)
```

#### 4. **classes**

```sql
- id (UUID, PK)
- class_name (TEXT, UNIQUE)
- description (TEXT)
- year (TEXT)
- created_by (UUID, FK to profiles)
- is_active (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

#### 5. **files**

```sql
- id (UUID, PK)
- student_id (UUID, FK to profiles)
- student_name (TEXT)
- file_name (TEXT)
- file_type (TEXT)
- file_size (NUMERIC)
- thumbnail_uri (TEXT)
- uploaded_at (TIMESTAMPTZ)
```

---

## 🔐 Security & Permissions

### Row Level Security (RLS) Policies

#### Profiles

- ✅ Anyone can view all profiles
- ✅ Users can insert their own profile
- ✅ Users can update their own profile

#### Attendance Sessions

- ✅ Anyone can view sessions
- ✅ Only staff can create sessions
- ✅ Staff can update their own sessions

#### Attendance Records

- ✅ Anyone can view attendance records
- ✅ Students can mark their own attendance
- ✅ Unique constraint: One attendance per session per student

#### Classes

- ✅ Anyone can view active classes
- ✅ Only staff can create classes
- ✅ Staff can update/delete their own classes

#### Files

- ✅ Anyone can view files
- ✅ Students can upload their own files
- ✅ Students can delete their own files

### Storage Policies

- ✅ Public read access to files bucket
- ✅ Authenticated users can upload
- ✅ Users can delete their own files

---

## 🔄 Real-time Features

### Supabase Realtime Subscriptions

1. **Attendance Records** - Live updates when students mark attendance
2. **Attendance Sessions** - Live updates when sessions are created/modified
3. **Files** - Live updates when files are uploaded/deleted
4. **Classes** - Live updates when classes are created/modified
5. **Profiles** - Live updates to user profiles

---

## 📊 Services Architecture

### 1. **authService.ts**

- `signup()` - Create new user with role-specific data
- `login()` - Authenticate user and fetch profile
- `logout()` - Sign out user
- `getCurrentUser()` - Get current authenticated user
- `getUserProfile()` - Fetch user profile from database
- `updateProfile()` - Update user profile
- `onAuthStateChange()` - Subscribe to auth state changes

### 2. **attendanceService.ts**

- `createSession()` - Create new attendance session with QR code
- `getActiveSessions()` - Fetch active sessions
- `markAttendance()` - Mark student attendance for a session
- `getAttendanceRecords()` - Fetch attendance records with filters
- `toggleSessionStatus()` - Activate/deactivate session
- `getSessionStats()` - Get attendance statistics

### 3. **classService.ts**

- `createClass()` - Create new class
- `getClasses()` - Fetch all active classes
- `updateClass()` - Update class details
- `deleteClass()` - Soft delete class (set is_active = false)
- `getClassStudents()` - Get students enrolled in a class

### 4. **fileService.ts**

- `uploadFile()` - Upload file to Supabase storage
- `getFiles()` - Fetch files with filters
- `deleteFile()` - Delete file from storage and database
- `getFileUrl()` - Get public URL for file

### 5. **pdfReportService.ts**

- `generateAttendanceReport()` - Generate PDF report
- `formatReportData()` - Format data for PDF
- `createPDFHTML()` - Create HTML template for PDF
- `downloadPDF()` - Trigger PDF download/share

---

## 🎨 UI/UX Components

### Key Components

1. **ProfessionalSplashScreen.tsx**
   - Animated logo
   - Loading indicator
   - Brand colors

2. **QR Scanner (qr-scanner.tsx)**
   - Camera permission handling
   - QR code detection
   - Validation feedback
   - Success/error animations

3. **Attendance Cards**
   - Student info display
   - Session details
   - Check icon indicator
   - Hover effects

4. **File Uploader**
   - Multi-type support (images, documents)
   - Progress indicator
   - Thumbnail preview
   - Disabled state when no staff selected

5. **Class Management Cards**
   - Class information
   - Student count
   - Edit/Delete actions
   - Active/Inactive status

---

## 📱 Navigation Structure

```
App (_layout.tsx)
    ├─→ index.tsx (Redirect to role-select)
    ├─→ role-select.tsx
    ├─→ student-signup.tsx
    ├─→ student-login.tsx
    ├─→ staff-signup.tsx
    ├─→ staff-login.tsx
    ├─→ confirm-success.tsx
    ├─→ qr-scanner.tsx
    ├─→ class-management.tsx
    ├─→ student-dashboard.tsx (Tabs)
    │       ├─→ Home
    │       ├─→ Attendance
    │       └─→ Files
    ├─→ staff-dashboard.tsx (Tabs)
    │       ├─→ Home
    │       ├─→ Attendance
    │       ├─→ Files
    │       └─→ Classes
    └─→ +not-found.tsx
```

---

## 🚀 Deployment & Build

### Development

```bash
npx expo start          # Start development server
npm run android         # Run on Android
npm run ios             # Run on iOS
npm run web             # Run on web
```

### Production Build

```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### CI/CD

- **Platform**: Codemagic
- **Config**: `codemagic.yaml`
- **Triggers**: Push to main branch
- **Outputs**: APK/AAB for Android, IPA for iOS

---

## 📋 Key User Journeys

### Journey 1: Student Marks Attendance

1. Student logs in
2. Navigates to Attendance tab
3. Clicks "Scan QR Code"
4. Grants camera permission
5. Scans staff's QR code
6. System validates session
7. Attendance marked successfully
8. Confirmation shown
9. Record appears in attendance history

### Journey 2: Staff Creates Session & Views Report

1. Staff logs in
2. Navigates to Attendance tab
3. Clicks "Create Session"
4. Enters session details
5. Generates QR code
6. Students scan and mark attendance
7. Staff sees live updates
8. Filters attendance records
9. Downloads PDF report
10. Shares report via email/messaging

### Journey 3: Student Uploads File

1. Student logs in
2. Navigates to Files tab
3. Selects staff member from dropdown
4. Upload button becomes enabled
5. Chooses file type (image/document)
6. Selects file from device
7. File uploads to Supabase
8. Thumbnail/preview appears
9. File metadata saved
10. Staff can view uploaded file

### Journey 4: Staff Manages Classes

1. Staff logs in
2. Navigates to Classes tab
3. Clicks "Create Class"
4. Enters class details
5. Class created and appears in list
6. Students can select class during signup
7. Staff can edit/delete classes
8. View enrolled students per class

---

## 🔧 Environment Setup

### Required Environment Variables (.env)

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

1. Create Supabase project
2. Run `supabase_setup.sql` in SQL Editor
3. Run `supabase_class_management.sql` in SQL Editor
4. Enable Realtime for all tables
5. Configure storage buckets
6. Set up RLS policies

---

## 📈 Future Enhancements

- [ ] Push notifications for new sessions
- [ ] Analytics dashboard for staff
- [ ] Export attendance to Excel
- [ ] Bulk student import
- [ ] Parent portal
- [ ] Assignment management
- [ ] Grade tracking
- [ ] Messaging system
- [ ] Calendar integration
- [ ] Offline mode support

---

## 🐛 Troubleshooting

### Common Issues

1. **Email not confirmed**
   - Check Supabase email templates
   - Verify SMTP settings
   - Check spam folder

2. **QR code not scanning**
   - Grant camera permissions
   - Ensure good lighting
   - Check QR code is active

3. **File upload fails**
   - Check storage bucket policies
   - Verify file size limits
   - Check network connection

4. **Attendance not showing**
   - Verify RLS policies
   - Check Realtime subscriptions
   - Refresh the page

---

## 📞 Support & Documentation

- **GitHub**: Repository for code and issues
- **Supabase Docs**: <https://supabase.com/docs>
- **Expo Docs**: <https://docs.expo.dev>
- **React Native Docs**: <https://reactnative.dev>

---

**Last Updated**: January 25, 2026
**Version**: 1.0.0
**Maintained by**: SIVA-SIR Development Team
