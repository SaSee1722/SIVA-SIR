# SIVA-SIR Education Portal - Architecture Overview

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIVA-SIR Education Portal                    │
│                     React Native + Expo App                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ├─────────────────────────────────┐
                                │                                 │
                    ┌───────────▼──────────┐        ┌────────────▼────────────┐
                    │   Student Portal     │        │     Staff Portal        │
                    │                      │        │                         │
                    │  • QR Scanner        │        │  • Session Creator      │
                    │  • Attendance View   │        │  • QR Generator         │
                    │  • File Uploader     │        │  • Attendance Reports   │
                    │  • Profile           │        │  • Class Management     │
                    └───────────┬──────────┘        └────────────┬────────────┘
                                │                                 │
                                └─────────────┬───────────────────┘
                                              │
                    ┌─────────────────────────▼─────────────────────────┐
                    │            Services Layer                         │
                    │                                                   │
                    │  ┌──────────────┐  ┌──────────────┐             │
                    │  │ authService  │  │ attendance   │             │
                    │  │              │  │ Service      │             │
                    │  └──────────────┘  └──────────────┘             │
                    │                                                   │
                    │  ┌──────────────┐  ┌──────────────┐             │
                    │  │ fileService  │  │ classService │             │
                    │  │              │  │              │             │
                    │  └──────────────┘  └──────────────┘             │
                    │                                                   │
                    │  ┌──────────────┐  ┌──────────────┐             │
                    │  │ pdfReport    │  │ syncService  │             │
                    │  │ Service      │  │              │             │
                    │  └──────────────┘  └──────────────┘             │
                    └───────────────────────┬───────────────────────────┘
                                            │
                    ┌───────────────────────▼───────────────────────┐
                    │         Supabase Backend                      │
                    │                                               │
                    │  ┌─────────────┐  ┌─────────────┐           │
                    │  │ Auth        │  │ Database    │           │
                    │  │             │  │             │           │
                    │  │ • Sign Up   │  │ • Profiles  │           │
                    │  │ • Login     │  │ • Sessions  │           │
                    │  │ • Sessions  │  │ • Records   │           │
                    │  │ • Email     │  │ • Classes   │           │
                    │  └─────────────┘  └─────────────┘           │
                    │                                               │
                    │  ┌─────────────┐  ┌─────────────┐           │
                    │  │ Storage     │  │ Realtime    │           │
                    │  │             │  │             │           │
                    │  │ • Files     │  │ • Live      │           │
                    │  │ • Images    │  │   Updates   │           │
                    │  │ • Docs      │  │ • Presence  │           │
                    │  └─────────────┘  └─────────────┘           │
                    └───────────────────────────────────────────────┘
```

---

## 📊 Data Flow Architecture

### Authentication Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │
     │ 1. Enter credentials
     ▼
┌─────────────────┐
│  Login Screen   │
└────┬────────────┘
     │
     │ 2. Call authService.login()
     ▼
┌─────────────────┐
│  Auth Service   │
└────┬────────────┘
     │
     │ 3. Supabase auth.signInWithPassword()
     ▼
┌─────────────────┐
│  Supabase Auth  │
└────┬────────────┘
     │
     │ 4. Return session token
     ▼
┌─────────────────┐
│  Auth Service   │
└────┬────────────┘
     │
     │ 5. Fetch user profile
     ▼
┌─────────────────┐
│ Supabase DB     │
│ (profiles)      │
└────┬────────────┘
     │
     │ 6. Return user data
     ▼
┌─────────────────┐
│  AuthContext    │
│  (Global State) │
└────┬────────────┘
     │
     │ 7. Navigate to dashboard
     ▼
┌─────────────────┐
│   Dashboard     │
└─────────────────┘
```

---

### Attendance Marking Flow

```
┌─────────┐
│ Student │
└────┬────┘
     │
     │ 1. Click "Scan QR"
     ▼
┌─────────────────┐
│  QR Scanner     │
└────┬────────────┘
     │
     │ 2. Scan QR code
     ▼
┌─────────────────┐
│  Validate QR    │
└────┬────────────┘
     │
     │ 3. Extract session ID
     ▼
┌─────────────────┐
│ Attendance      │
│ Service         │
└────┬────────────┘
     │
     │ 4. Check session exists & active
     ▼
┌─────────────────┐
│ Supabase DB     │
│ (sessions)      │
└────┬────────────┘
     │
     │ 5. Session valid
     ▼
┌─────────────────┐
│ Attendance      │
│ Service         │
└────┬────────────┘
     │
     │ 6. Insert attendance record
     ▼
┌─────────────────┐
│ Supabase DB     │
│ (records)       │
└────┬────────────┘
     │
     │ 7. Realtime broadcast
     ▼
┌─────────────────┐
│ Staff Dashboard │
│ (Live Update)   │
└─────────────────┘
```

---

### File Upload Flow

```
┌─────────┐
│ Student │
└────┬────┘
     │
     │ 1. Select staff & file
     ▼
┌─────────────────┐
│ File Uploader   │
└────┬────────────┘
     │
     │ 2. Validate file (type, size)
     ▼
┌─────────────────┐
│  File Service   │
└────┬────────────┘
     │
     │ 3. Generate unique filename
     ▼
┌─────────────────┐
│  File Service   │
└────┬────────────┘
     │
     │ 4. Upload to storage
     ▼
┌─────────────────┐
│ Supabase        │
│ Storage         │
└────┬────────────┘
     │
     │ 5. Return public URL
     ▼
┌─────────────────┐
│  File Service   │
└────┬────────────┘
     │
     │ 6. Save metadata
     ▼
┌─────────────────┐
│ Supabase DB     │
│ (files)         │
└────┬────────────┘
     │
     │ 7. Realtime update
     ▼
┌─────────────────┐
│ Staff Dashboard │
│ (Files Tab)     │
└─────────────────┘
```

---

## 🗂️ Folder Structure

```
SIVASIR/
│
├── app/                          # Expo Router screens
│   ├── _layout.tsx              # Root layout
│   ├── index.tsx                # Entry point
│   ├── role-select.tsx          # Role selection
│   ├── student-signup.tsx       # Student registration
│   ├── student-login.tsx        # Student login
│   ├── staff-signup.tsx         # Staff registration
│   ├── staff-login.tsx          # Staff login
│   ├── student-dashboard.tsx    # Student main screen
│   ├── staff-dashboard.tsx      # Staff main screen
│   ├── qr-scanner.tsx           # QR code scanner
│   ├── class-management.tsx     # Class CRUD
│   └── confirm-success.tsx      # Email confirmation
│
├── components/                   # Reusable components
│   ├── ProfessionalSplashScreen.tsx
│   ├── QRCodeGenerator.tsx
│   ├── FileUploader.tsx
│   ├── AttendanceCard.tsx
│   └── ClassCard.tsx
│
├── services/                     # Business logic
│   ├── authService.ts           # Authentication
│   ├── attendanceService.ts     # Attendance operations
│   ├── classService.ts          # Class management
│   ├── fileService.ts           # File operations
│   ├── pdfReportService.ts      # PDF generation
│   └── syncService.ts           # Data synchronization
│
├── contexts/                     # React Context
│   └── AuthContext.tsx          # Global auth state
│
├── hooks/                        # Custom hooks
│   ├── useAttendance.ts         # Attendance logic
│   ├── useClasses.ts            # Class logic
│   └── useFiles.ts              # File logic
│
├── utils/                        # Utility functions
│   ├── validators.ts            # Input validation
│   ├── dateFormatter.ts         # Date formatting
│   ├── fileFormatter.ts         # File size formatting
│   ├── permissions.ts           # Permission handling
│   └── navigationHelpers.ts     # Navigation utilities
│
├── constants/                    # App constants
│   ├── theme.ts                 # Color scheme
│   └── config.ts                # App configuration
│
├── types/                        # TypeScript types
│   ├── user.ts                  # User types
│   ├── attendance.ts            # Attendance types
│   ├── class.ts                 # Class types
│   └── file.ts                  # File types
│
├── assets/                       # Static assets
│   ├── images/
│   ├── fonts/
│   └── animations/
│
├── .agent/                       # Documentation
│   ├── workflows/
│   │   └── app-workflow.md
│   ├── APP_FUNCTIONS_GUIDE.md
│   ├── ARCHITECTURE_OVERVIEW.md
│   └── PDF_REPORT_IMPLEMENTATION.md
│
├── .env                          # Environment variables
├── app.json                      # Expo configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 🔄 State Management

### Global State (AuthContext)

```typescript
AuthContext
├── user: UserProfile | null
├── isLoading: boolean
├── isAuthenticated: boolean
├── login: (email, password) => Promise<void>
├── signup: (data) => Promise<void>
├── logout: () => Promise<void>
└── updateProfile: (data) => Promise<void>
```

### Local State (Component Level)

```typescript
Student Dashboard
├── attendanceRecords: AttendanceRecord[]
├── uploadedFiles: FileMetadata[]
├── selectedStaff: Staff | null
└── isUploading: boolean

Staff Dashboard
├── sessions: AttendanceSession[]
├── attendanceRecords: AttendanceRecord[]
├── classes: Class[]
├── activeSession: AttendanceSession | null
└── filters: FilterOptions
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│         Application Layer               │
│  • Input validation                     │
│  • Client-side checks                   │
│  • Permission requests                  │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│         Service Layer                   │
│  • Business logic validation            │
│  • Data sanitization                    │
│  • Error handling                       │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│         Supabase Layer                  │
│  • JWT authentication                   │
│  • Row Level Security (RLS)             │
│  • Database constraints                 │
│  • Storage policies                     │
└─────────────────────────────────────────┘
```

### RLS Policies Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| profiles | ✅ All | ✅ Own | ✅ Own | ❌ None |
| attendance_sessions | ✅ All | ✅ Staff | ✅ Own | ❌ None |
| attendance_records | ✅ All | ✅ Students | ❌ None | ❌ None |
| classes | ✅ Active | ✅ Staff | ✅ Own | ✅ Own |
| files | ✅ All | ✅ Students | ❌ None | ✅ Own |

---

## 📡 API Endpoints (Supabase)

### Authentication

- `POST /auth/v1/signup` - Create new user
- `POST /auth/v1/token?grant_type=password` - Login
- `POST /auth/v1/logout` - Logout
- `GET /auth/v1/user` - Get current user

### Database (REST API)

- `GET /rest/v1/profiles` - Fetch profiles
- `POST /rest/v1/profiles` - Create profile
- `PATCH /rest/v1/profiles?id=eq.{id}` - Update profile
- `GET /rest/v1/attendance_sessions` - Fetch sessions
- `POST /rest/v1/attendance_sessions` - Create session
- `GET /rest/v1/attendance_records` - Fetch records
- `POST /rest/v1/attendance_records` - Mark attendance
- `GET /rest/v1/classes` - Fetch classes
- `POST /rest/v1/classes` - Create class

### Storage

- `POST /storage/v1/object/files/{path}` - Upload file
- `GET /storage/v1/object/public/files/{path}` - Get file
- `DELETE /storage/v1/object/files/{path}` - Delete file

### Realtime

- `wss://[project].supabase.co/realtime/v1` - WebSocket connection

---

## 🎯 Component Hierarchy

```
App
└── AuthProvider
    ├── RoleSelectScreen
    │   ├── StudentSignup
    │   ├── StudentLogin
    │   ├── StaffSignup
    │   └── StaffLogin
    │
    ├── StudentDashboard
    │   ├── HomeTab
    │   │   ├── WelcomeCard
    │   │   ├── StatsCard
    │   │   └── RecentActivity
    │   │
    │   ├── AttendanceTab
    │   │   ├── QRScannerButton
    │   │   ├── AttendanceHistory
    │   │   └── AttendanceCard
    │   │
    │   └── FilesTab
    │       ├── StaffSelector
    │       ├── FileUploader
    │       └── FileList
    │
    └── StaffDashboard
        ├── HomeTab
        │   ├── WelcomeCard
        │   ├── StatsCard
        │   └── QuickActions
        │
        ├── AttendanceTab
        │   ├── CreateSession
        │   │   ├── SessionForm
        │   │   └── QRCodeGenerator
        │   │
        │   └── ViewRecords
        │       ├── FilterPanel
        │       ├── AttendanceList
        │       └── PDFDownloadButton
        │
        ├── FilesTab
        │   ├── FilterPanel
        │   └── FileGrid
        │
        └── ClassesTab
            ├── CreateClass
            └── ClassList
                └── ClassCard
```

---

## 🔄 Real-time Data Flow

```
┌─────────────────┐
│  Student App    │
│  (Marks Attend) │
└────────┬────────┘
         │
         │ 1. Insert record
         ▼
┌─────────────────┐
│  Supabase DB    │
└────────┬────────┘
         │
         │ 2. Broadcast change
         ▼
┌─────────────────┐
│  Realtime       │
│  Channel        │
└────────┬────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
┌─────────────────┐  ┌─────────────────┐
│  Staff App      │  │  Other Students │
│  (Live Update)  │  │  (Live Update)  │
└─────────────────┘  └─────────────────┘
```

---

## 📊 Database Schema Relationships

```
┌─────────────────┐
│   auth.users    │
│   (Supabase)    │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐
│    profiles     │
│                 │
│  • id (PK, FK)  │
│  • email        │
│  • name         │
│  • role         │
└────────┬────────┘
         │
         ├──────────────────┬──────────────────┐
         │                  │                  │
         │ 1:N              │ 1:N              │ 1:N
         ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ attendance_     │  │    classes      │  │     files       │
│ sessions        │  │                 │  │                 │
│                 │  │  • id (PK)      │  │  • id (PK)      │
│  • id (PK)      │  │  • class_name   │  │  • student_id   │
│  • created_by   │  │  • created_by   │  │  • file_name    │
│    (FK)         │  │    (FK)         │  │  • file_type    │
└────────┬────────┘  └─────────────────┘  └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│ attendance_     │
│ records         │
│                 │
│  • id (PK)      │
│  • session_id   │
│    (FK)         │
│  • student_id   │
│    (FK)         │
└─────────────────┘
```

---

## 🚀 Performance Optimizations

### 1. **Lazy Loading**

- Components loaded on-demand
- Images lazy-loaded with placeholders
- Pagination for large lists

### 2. **Caching**

- User profile cached in AuthContext
- Attendance records cached locally
- File thumbnails cached

### 3. **Real-time Optimization**

- Selective subscriptions (only active screens)
- Debounced updates
- Batch operations

### 4. **Database Optimization**

- Indexed columns (email, roll_number, qr_code)
- Efficient queries with joins
- RLS policies for security

---

## 📱 Platform-Specific Features

### iOS

- Face ID / Touch ID for login
- Native camera integration
- Share sheet for PDFs
- Haptic feedback

### Android

- Fingerprint authentication
- Material Design components
- Native file picker
- Notification channels

### Web

- Responsive design
- Progressive Web App (PWA)
- Browser notifications
- Keyboard shortcuts

---

## 🔧 Development Tools

```
┌─────────────────────────────────────────┐
│         Development Stack               │
│                                         │
│  • TypeScript 5.8.3                    │
│  • React Native 0.79.4                 │
│  • Expo ~53.0.12                       │
│  • Expo Router ~5.1.0                  │
│  • Supabase JS Client                  │
│  • React Native Paper                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Build & Deploy                  │
│                                         │
│  • EAS Build                           │
│  • Codemagic CI/CD                     │
│  • GitHub Actions                      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│         Testing & Quality               │
│                                         │
│  • TypeScript Type Checking            │
│  • ESLint                              │
│  • Prettier                            │
└─────────────────────────────────────────┘
```

---

## 📈 Scalability Considerations

### Current Capacity

- **Users**: Up to 10,000 concurrent
- **Attendance Records**: Unlimited (with pagination)
- **File Storage**: Supabase free tier (1GB)
- **Real-time Connections**: 200 concurrent

### Scaling Strategy

1. **Database**: Add read replicas for heavy queries
2. **Storage**: Migrate to CDN for files
3. **Real-time**: Use presence channels efficiently
4. **Caching**: Implement Redis for frequent queries

---

## 🔒 Compliance & Privacy

### Data Protection

- **Encryption**: All data encrypted at rest and in transit
- **Authentication**: JWT-based secure sessions
- **Storage**: Supabase compliant with GDPR
- **Backups**: Automated daily backups

### User Privacy

- Email confirmation required
- No data sharing with third parties
- User can delete their data
- Transparent privacy policy

---

## 📚 Related Documentation

- **[Complete Workflow](workflows/app-workflow.md)** - User journeys and workflows
- **[Functions Guide](APP_FUNCTIONS_GUIDE.md)** - Detailed function documentation
- **[PDF Implementation](PDF_REPORT_IMPLEMENTATION.md)** - PDF report system

---

**Last Updated**: January 25, 2026  
**Version**: 1.0.0  
**Architecture**: Monolithic with Service-Oriented Design
