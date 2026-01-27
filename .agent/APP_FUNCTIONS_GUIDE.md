# SIVA-SIR Education Portal - Functions Guide

## 📚 Complete Function Reference

This document provides detailed explanations of how each major function in the SIVA-SIR app works, including code flows, parameters, and return values.

---

## 🔐 Authentication Functions

### 1. **signup()**

**Location**: `services/authService.ts`

**Purpose**: Creates a new user account with role-specific profile data.

**Flow**:

```typescript
1. Validate input data (email, password, name, role)
2. Call Supabase auth.signUp() with email and password
3. If successful, create profile record in profiles table
4. Insert profile data:
   - Student: name, email, role, class, year, roll_number
   - Staff: name, email, role, department
5. Send confirmation email to user
6. Return user object
```

**Parameters**:

```typescript
{
  email: string,
  password: string,
  name: string,
  role: 'student' | 'staff',
  class?: string,        // Required for students
  year?: string,         // Required for students
  rollNumber?: string,   // Required for students
  department?: string    // Required for staff
}
```

**Returns**: `Promise<{ user: User, error: Error | null }>`

**Error Handling**:

- Invalid email format → "Invalid email address"
- Weak password → "Password must be at least 6 characters"
- Email already exists → "User already registered"
- Database error → "Failed to create profile"

---

### 2. **login()**

**Location**: `services/authService.ts`

**Purpose**: Authenticates user and retrieves their profile data.

**Flow**:

```typescript
1. Call Supabase auth.signInWithPassword()
2. Verify email is confirmed
3. If not confirmed → Throw error "Please confirm your email"
4. Fetch user profile from profiles table using user.id
5. Store session in AuthContext
6. Return user with profile data
```

**Parameters**:

```typescript
{
  email: string,
  password: string
}
```

**Returns**: `Promise<{ user: UserProfile, error: Error | null }>`

**Session Management**:

- Session stored in secure storage
- Auto-refresh on app restart
- Expires after 7 days of inactivity

---

### 3. **logout()**

**Location**: `services/authService.ts`

**Purpose**: Signs out the current user and clears session.

**Flow**:

```typescript
1. Call Supabase auth.signOut()
2. Clear AuthContext state
3. Clear secure storage
4. Navigate to role-select screen
```

**Returns**: `Promise<void>`

---

### 4. **getCurrentUser()**

**Location**: `services/authService.ts`

**Purpose**: Retrieves the currently authenticated user with profile.

**Flow**:

```typescript
1. Call Supabase auth.getUser()
2. If no user → Return null
3. Fetch profile from profiles table
4. Merge auth user with profile data
5. Return complete user object
```

**Returns**: `Promise<UserProfile | null>`

**Used By**:

- App initialization
- Protected route guards
- Profile updates

---

## 📊 Attendance Functions

### 5. **createSession()**

**Location**: `services/attendanceService.ts`

**Purpose**: Creates a new attendance session with a unique QR code.

**Flow**:

```typescript
1. Validate session data (name, date, time)
2. Generate unique QR code string:
   - Format: "ATTENDANCE_SESSION_{UUID}_{TIMESTAMP}"
3. Insert into attendance_sessions table:
   - session_name, date, time, qr_code
   - created_by (staff user ID)
   - is_active = true
   - class_filter (optional)
4. Return session object with QR code
```

**Parameters**:

```typescript
{
  sessionName: string,
  date: Date,
  time: string,
  classFilter?: string,  // Optional: Filter by specific class
  createdBy: string      // Staff user ID
}
```

**Returns**: `Promise<AttendanceSession>`

**QR Code Format**:

```
ATTENDANCE_SESSION_abc123-def456_1706188800000
```

**Validation**:

- Session name: 3-100 characters
- Date: Cannot be in the past
- Time: Valid time format (HH:MM)
- Created by: Must be staff role

---

### 6. **markAttendance()**

**Location**: `services/attendanceService.ts`

**Purpose**: Marks a student's attendance for a specific session.

**Flow**:

```typescript
1. Validate QR code format
2. Find session by qr_code in attendance_sessions table
3. Check if session exists → Error if not found
4. Check if session is active → Error if inactive
5. Check if student already marked → Error if duplicate
6. Insert attendance record:
   - session_id, student_id, student_name
   - roll_number, class, marked_at
   - session_name, date
7. Return success with attendance record
```

**Parameters**:

```typescript
{
  qrCode: string,
  studentId: string,
  studentName: string,
  rollNumber: string,
  class: string
}
```

**Returns**: `Promise<AttendanceRecord>`

**Validation Rules**:

- QR code must be valid and active
- Student cannot mark attendance twice for same session
- Session must be active (is_active = true)
- Student must have valid profile

**Database Constraint**:

```sql
UNIQUE(session_id, student_id)
-- Prevents duplicate attendance
```

---

### 7. **getAttendanceRecords()**

**Location**: `services/attendanceService.ts`

**Purpose**: Fetches attendance records with optional filters.

**Flow**:

```typescript
1. Build query with filters:
   - sessionId (specific session)
   - studentId (specific student)
   - classFilter (specific class)
   - dateRange (from-to dates)
2. Execute query with joins:
   - Join with attendance_sessions
   - Join with profiles (students)
3. Order by marked_at DESC
4. Return array of records
```

**Parameters**:

```typescript
{
  sessionId?: string,
  studentId?: string,
  classFilter?: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number,
  offset?: number
}
```

**Returns**: `Promise<AttendanceRecord[]>`

**Record Format**:

```typescript
{
  id: string,
  session_id: string,
  session_name: string,
  student_id: string,
  student_name: string,
  roll_number: string,
  class: string,
  marked_at: Date,
  date: Date
}
```

**Use Cases**:

- Staff viewing all attendance
- Student viewing their history
- Generating reports
- Filtering by class/date

---

### 8. **toggleSessionStatus()**

**Location**: `services/attendanceService.ts`

**Purpose**: Activates or deactivates an attendance session.

**Flow**:

```typescript
1. Find session by ID
2. Verify user is session creator
3. Toggle is_active field:
   - true → false (deactivate)
   - false → true (activate)
4. Update in database
5. Return updated session
```

**Parameters**:

```typescript
{
  sessionId: string,
  userId: string,  // Must be session creator
  isActive: boolean
}
```

**Returns**: `Promise<AttendanceSession>`

**Security**:

- Only session creator can toggle status
- RLS policy enforces ownership

---

## 📁 File Management Functions

### 9. **uploadFile()**

**Location**: `services/fileService.ts`

**Purpose**: Uploads a file to Supabase storage and creates metadata record.

**Flow**:

```typescript
1. Validate file (type, size)
2. Generate unique filename:
   - Format: "{studentId}_{timestamp}_{originalName}"
3. Upload to Supabase storage bucket 'files':
   - Use storage.upload()
   - Set content type
4. Get public URL for uploaded file
5. Generate thumbnail (if image)
6. Insert metadata into files table:
   - student_id, file_name, file_type
   - file_size, thumbnail_uri, uploaded_at
7. Return file metadata
```

**Parameters**:

```typescript
{
  file: File | Blob,
  studentId: string,
  studentName: string,
  staffId?: string  // Optional: Link to specific staff
}
```

**Returns**: `Promise<FileMetadata>`

**File Validation**:

- Max size: 10MB
- Allowed types:
  - Images: jpg, jpeg, png, gif, webp
  - Documents: pdf, doc, docx, txt
  - Other: zip, rar

**Storage Structure**:

```
files/
  ├── {studentId}_1706188800000_document.pdf
  ├── {studentId}_1706188900000_image.jpg
  └── thumbnails/
      └── {studentId}_1706188900000_image_thumb.jpg
```

---

### 10. **deleteFile()**

**Location**: `services/fileService.ts`

**Purpose**: Deletes a file from storage and removes metadata.

**Flow**:

```typescript
1. Verify user owns the file
2. Delete from Supabase storage:
   - Delete main file
   - Delete thumbnail (if exists)
3. Delete metadata from files table
4. Return success confirmation
```

**Parameters**:

```typescript
{
  fileId: string,
  userId: string  // Must be file owner
}
```

**Returns**: `Promise<{ success: boolean }>`

**Security**:

- RLS policy ensures only owner can delete
- Cascade delete for thumbnails

---

### 11. **getFiles()**

**Location**: `services/fileService.ts`

**Purpose**: Retrieves files with optional filters.

**Flow**:

```typescript
1. Build query with filters:
   - studentId (specific student)
   - staffId (files for specific staff)
   - fileType (images, documents, etc.)
   - dateRange
2. Execute query with joins
3. Get public URLs for files
4. Return array of file metadata
```

**Parameters**:

```typescript
{
  studentId?: string,
  staffId?: string,
  fileType?: string,
  startDate?: Date,
  endDate?: Date,
  limit?: number
}
```

**Returns**: `Promise<FileMetadata[]>`

---

## 🏫 Class Management Functions

### 12. **createClass()**

**Location**: `services/classService.ts`

**Purpose**: Creates a new class in the system.

**Flow**:

```typescript
1. Validate class data (name, year)
2. Check if class name already exists
3. Insert into classes table:
   - class_name, description, year
   - created_by (staff user ID)
   - is_active = true
4. Return class object
```

**Parameters**:

```typescript
{
  className: string,
  description: string,
  year: string,
  createdBy: string  // Staff user ID
}
```

**Returns**: `Promise<Class>`

**Validation**:

- Class name: Unique, 2-50 characters
- Year: Valid academic year format
- Only staff can create classes

---

### 13. **getClasses()**

**Location**: `services/classService.ts`

**Purpose**: Retrieves all active classes.

**Flow**:

```typescript
1. Query classes table where is_active = true
2. Join with profiles to get student count
3. Order by class_name ASC
4. Return array of classes with metadata
```

**Parameters**: None (or optional filters)

**Returns**: `Promise<Class[]>`

**Class Object**:

```typescript
{
  id: string,
  class_name: string,
  description: string,
  year: string,
  student_count: number,
  created_by: string,
  created_at: Date,
  updated_at: Date
}
```

---

### 14. **updateClass()**

**Location**: `services/classService.ts`

**Purpose**: Updates class information.

**Flow**:

```typescript
1. Verify user is class creator
2. Validate new data
3. Update classes table
4. Set updated_at = NOW()
5. Return updated class
```

**Parameters**:

```typescript
{
  classId: string,
  className?: string,
  description?: string,
  year?: string,
  userId: string  // Must be creator
}
```

**Returns**: `Promise<Class>`

---

### 15. **deleteClass()**

**Location**: `services/classService.ts`

**Purpose**: Soft deletes a class (sets is_active = false).

**Flow**:

```typescript
1. Verify user is class creator
2. Check if class has enrolled students
3. Set is_active = false (soft delete)
4. Update in database
5. Return success confirmation
```

**Parameters**:

```typescript
{
  classId: string,
  userId: string  // Must be creator
}
```

**Returns**: `Promise<{ success: boolean }>`

**Note**: Soft delete preserves historical data

---

## 📄 PDF Report Functions

### 16. **generateAttendanceReport()**

**Location**: `services/pdfReportService.ts`

**Purpose**: Generates a professional PDF report of attendance records.

**Flow**:

```typescript
1. Fetch attendance records with filters
2. Calculate statistics:
   - Total present students
   - Unique students
   - Number of sessions
   - Attendance percentage
3. Format data for PDF:
   - Group by session/date
   - Sort by timestamp
4. Create HTML template with:
   - Header with logo and title
   - Summary statistics cards
   - Attendance records table
   - Footer with timestamp
5. Convert HTML to PDF using react-native-html-to-pdf
6. Save to device storage
7. Return file path for sharing
```

**Parameters**:

```typescript
{
  filters: {
    sessionId?: string,
    classFilter?: string,
    startDate?: Date,
    endDate?: Date
  },
  title: string,
  generatedBy: string  // Staff name
}
```

**Returns**: `Promise<{ filePath: string, fileName: string }>`

**PDF Structure**:

```
┌─────────────────────────────────────┐
│ SIVA-SIR Education Portal           │
│ Attendance Report                   │
├─────────────────────────────────────┤
│ Summary Statistics                  │
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ 45  │ │ 38  │ │ 3   │            │
│ │Total│ │Uniq │ │Sess │            │
│ └─────┘ └─────┘ └─────┘            │
├─────────────────────────────────────┤
│ Attendance Records                  │
│ ┌───────────────────────────────┐  │
│ │ Name    Roll  Class  Session  │  │
│ │ John    101   10-A   Morning  │  │
│ │ Sarah   102   10-A   Morning  │  │
│ └───────────────────────────────┘  │
├─────────────────────────────────────┤
│ Generated: 2026-01-25 18:30        │
│ By: Staff Name                     │
└─────────────────────────────────────┘
```

**Styling**:

- Matches app UI design
- Card-based layout
- Professional typography
- Color scheme: Blue/White

---

## 🔄 Real-time Subscription Functions

### 17. **subscribeToAttendance()**

**Location**: `hooks/useAttendance.ts`

**Purpose**: Sets up real-time subscription for attendance updates.

**Flow**:

```typescript
1. Create Supabase channel for attendance_records table
2. Listen for INSERT events
3. When new record inserted:
   - Fetch complete record data
   - Update local state
   - Trigger UI refresh
4. Return unsubscribe function
```

**Usage**:

```typescript
useEffect(() => {
  const unsubscribe = subscribeToAttendance((newRecord) => {
    setAttendanceRecords(prev => [newRecord, ...prev]);
  });
  
  return () => unsubscribe();
}, []);
```

**Events Handled**:

- INSERT: New attendance marked
- UPDATE: Attendance modified
- DELETE: Attendance removed

---

### 18. **subscribeToSessions()**

**Location**: `hooks/useAttendance.ts`

**Purpose**: Real-time updates for attendance sessions.

**Flow**:

```typescript
1. Create channel for attendance_sessions table
2. Listen for INSERT, UPDATE events
3. Update session list in real-time
4. Notify when session status changes
```

**Use Cases**:

- Live session creation
- Session activation/deactivation
- Session updates

---

## 📸 QR Code Functions

### 19. **generateQRCode()**

**Location**: `components/QRCodeGenerator.tsx`

**Purpose**: Generates a QR code image from session data.

**Flow**:

```typescript
1. Create QR code string with session ID
2. Use react-native-qrcode-svg to generate QR
3. Set size, color, logo (optional)
4. Return QR code component
```

**Parameters**:

```typescript
{
  sessionId: string,
  size?: number,      // Default: 200
  color?: string,     // Default: '#000'
  backgroundColor?: string  // Default: '#FFF'
}
```

**Returns**: `JSX.Element`

---

### 20. **scanQRCode()**

**Location**: `app/qr-scanner.tsx`

**Purpose**: Scans and validates QR codes for attendance.

**Flow**:

```typescript
1. Request camera permission
2. Initialize camera with QR detection
3. When QR detected:
   - Extract QR code string
   - Validate format
   - Check if attendance session
4. Call markAttendance() with QR data
5. Show success/error feedback
6. Navigate back to dashboard
```

**Validation**:

```typescript
// Valid QR format
ATTENDANCE_SESSION_{UUID}_{TIMESTAMP}

// Invalid formats rejected
- Random strings
- Expired sessions
- Non-attendance QR codes
```

**Error Handling**:

- Invalid QR → "Invalid QR code"
- Session inactive → "Session is not active"
- Already marked → "Attendance already marked"
- Network error → "Failed to mark attendance"

---

## 🎨 UI Helper Functions

### 21. **formatDate()**

**Location**: `utils/dateFormatter.ts`

**Purpose**: Formats dates for display in the UI.

**Flow**:

```typescript
1. Parse date string/object
2. Format based on context:
   - Full: "January 25, 2026"
   - Short: "Jan 25, 2026"
   - Time: "6:30 PM"
   - Relative: "2 hours ago"
3. Return formatted string
```

**Parameters**:

```typescript
{
  date: Date | string,
  format: 'full' | 'short' | 'time' | 'relative'
}
```

**Returns**: `string`

---

### 22. **formatFileSize()**

**Location**: `utils/fileFormatter.ts`

**Purpose**: Converts bytes to human-readable file size.

**Flow**:

```typescript
1. Convert bytes to appropriate unit:
   - < 1024 → Bytes
   - < 1024² → KB
   - < 1024³ → MB
   - >= 1024³ → GB
2. Round to 2 decimal places
3. Return formatted string
```

**Example**:

```typescript
formatFileSize(1536) → "1.50 KB"
formatFileSize(2097152) → "2.00 MB"
```

---

## 🔒 Permission Functions

### 23. **requestCameraPermission()**

**Location**: `utils/permissions.ts`

**Purpose**: Requests camera permission for QR scanning.

**Flow**:

```typescript
1. Check current permission status
2. If granted → Return true
3. If not determined → Request permission
4. If denied → Show settings prompt
5. Return permission status
```

**Returns**: `Promise<boolean>`

---

### 24. **requestStoragePermission()**

**Location**: `utils/permissions.ts`

**Purpose**: Requests storage permission for file uploads.

**Flow**:

```typescript
1. Check platform (iOS/Android)
2. Request appropriate permission:
   - iOS: Photo library access
   - Android: Read/write external storage
3. Handle permission result
4. Return status
```

**Returns**: `Promise<boolean>`

---

## 📊 Statistics Functions

### 25. **calculateAttendanceStats()**

**Location**: `utils/statsCalculator.ts`

**Purpose**: Calculates attendance statistics for reports.

**Flow**:

```typescript
1. Group records by student
2. Count unique sessions
3. Calculate:
   - Total attendance count
   - Unique students
   - Average attendance per session
   - Attendance percentage
4. Return statistics object
```

**Parameters**:

```typescript
{
  records: AttendanceRecord[],
  totalSessions: number
}
```

**Returns**:

```typescript
{
  totalPresent: number,
  uniqueStudents: number,
  averagePerSession: number,
  attendancePercentage: number,
  sessionCount: number
}
```

---

## 🔍 Search & Filter Functions

### 26. **filterAttendanceRecords()**

**Location**: `utils/filterHelpers.ts`

**Purpose**: Filters attendance records based on multiple criteria.

**Flow**:

```typescript
1. Apply filters sequentially:
   - Session filter
   - Class filter
   - Date range filter
   - Student name search
2. Return filtered array
```

**Parameters**:

```typescript
{
  records: AttendanceRecord[],
  filters: {
    sessionId?: string,
    classFilter?: string,
    startDate?: Date,
    endDate?: Date,
    searchQuery?: string
  }
}
```

**Returns**: `AttendanceRecord[]`

---

## 🎯 Validation Functions

### 27. **validateEmail()**

**Location**: `utils/validators.ts`

**Purpose**: Validates email format.

**Regex**:

```typescript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

**Returns**: `boolean`

---

### 28. **validatePassword()**

**Location**: `utils/validators.ts`

**Purpose**: Validates password strength.

**Rules**:

- Minimum 6 characters
- At least one letter
- At least one number (optional)

**Returns**: `{ valid: boolean, message?: string }`

---

### 29. **validateRollNumber()**

**Location**: `utils/validators.ts`

**Purpose**: Validates student roll number format.

**Rules**:

- Alphanumeric
- 3-20 characters
- No special characters except hyphen

**Returns**: `boolean`

---

## 🔄 Data Sync Functions

### 30. **syncUserProfile()**

**Location**: `services/syncService.ts`

**Purpose**: Syncs user profile between auth and database.

**Flow**:

```typescript
1. Fetch auth user
2. Fetch profile from database
3. Compare data
4. If mismatch:
   - Update profile table
   - Update auth metadata
5. Return synced profile
```

**Returns**: `Promise<UserProfile>`

---

## 📱 Navigation Functions

### 31. **navigateToRole()**

**Location**: `utils/navigationHelpers.ts`

**Purpose**: Navigates to appropriate dashboard based on user role.

**Flow**:

```typescript
1. Check user role
2. Navigate to:
   - Student → /student-dashboard
   - Staff → /staff-dashboard
   - No role → /role-select
```

**Parameters**:

```typescript
{
  user: UserProfile | null,
  router: Router
}
```

---

## 🎨 Theme Functions

### 32. **getThemeColors()**

**Location**: `constants/theme.ts`

**Purpose**: Provides consistent color scheme across app.

**Returns**:

```typescript
{
  primary: '#2196F3',
  secondary: '#FF9800',
  success: '#4CAF50',
  error: '#F44336',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575'
}
```

---

## 📊 Summary

This guide covers **32 major functions** across the SIVA-SIR Education Portal:

- **Authentication**: 4 functions
- **Attendance**: 4 functions
- **File Management**: 3 functions
- **Class Management**: 4 functions
- **PDF Reports**: 1 function
- **Real-time**: 2 functions
- **QR Code**: 2 functions
- **UI Helpers**: 2 functions
- **Permissions**: 2 functions
- **Statistics**: 1 function
- **Search/Filter**: 1 function
- **Validation**: 3 functions
- **Data Sync**: 1 function
- **Navigation**: 1 function
- **Theme**: 1 function

---

**For complete workflow and user journeys, see**: `.agent/workflows/app-workflow.md`

**Last Updated**: January 25, 2026
