# 📚 SIVA-SIR Education Portal

> A comprehensive education management system for attendance tracking, file management, and class administration.

[![React Native](https://img.shields.io/badge/React%20Native-0.79.4-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-~53.0.12-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)

---

## 🎯 Overview

**SIVA-SIR** is a modern, mobile-first education portal that streamlines attendance management through QR code technology, enables seamless file sharing between students and staff, and provides comprehensive class management tools.

### ✨ Key Features

- 🎓 **Dual Role System** - Separate portals for Students and Staff
- 📱 **QR Code Attendance** - Fast, contactless attendance marking
- 📁 **File Management** - Upload and manage documents and images
- 🏫 **Class Management** - Create and organize classes
- 📊 **PDF Reports** - Professional attendance reports
- ⚡ **Real-time Updates** - Live synchronization across devices
- 🔐 **Secure Authentication** - Email-based user verification
- 🎨 **Modern UI/UX** - Clean, intuitive interface

---

## 📸 Screenshots

### Student Portal

- QR Scanner for attendance
- File upload with staff selection
- Attendance history view

### Staff Portal

- QR code generation for sessions
- Live attendance tracking
- Professional PDF reports
- Class management dashboard

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or pnpm
- Expo CLI
- iOS Simulator (Mac) or Android Emulator
- Supabase account

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd SIVASIR

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npx expo start
```

### Run on Devices

```bash
# iOS Simulator (Mac only)
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web

# Physical Device - Scan QR code in terminal
```

---

## 📋 Documentation

### Core Documentation

| Document | Description |
|----------|-------------|
| [**App Workflow**](.agent/workflows/app-workflow.md) | Complete user journeys and application flow |
| [**Functions Guide**](.agent/APP_FUNCTIONS_GUIDE.md) | Detailed documentation of all 32 major functions |
| [**Architecture Overview**](.agent/ARCHITECTURE_OVERVIEW.md) | System architecture and technical design |
| [**Quick Reference**](.agent/QUICK_REFERENCE.md) | Cheat sheets and common tasks |
| [**PDF Implementation**](.agent/PDF_REPORT_IMPLEMENTATION.md) | PDF report generation system |

### Quick Links

- 📖 [User Guide](#user-guide) - How to use the app
- 🔧 [Developer Guide](#developer-guide) - Technical implementation
- 🗄️ [Database Schema](#database-schema) - Data structure
- 🔐 [Security](#security) - Authentication and permissions
- 🐛 [Troubleshooting](#troubleshooting) - Common issues

---

## 👥 User Guide

### For Students

#### 1. **Sign Up**

1. Open app → Select "Student"
2. Enter email, password, name, roll number, class, and year
3. Confirm email via link sent to inbox
4. Login with credentials

#### 2. **Mark Attendance**

1. Navigate to Attendance tab
2. Tap "Scan QR Code"
3. Grant camera permission
4. Scan staff's QR code
5. Attendance marked ✓

#### 3. **Upload Files**

1. Navigate to Files tab
2. Select staff member from dropdown
3. Choose file type (Image/Document)
4. Select file from device
5. File uploads automatically

### For Staff

#### 1. **Create Attendance Session**

1. Navigate to Attendance tab
2. Tap "Create Session"
3. Enter session name, date, time
4. Optionally filter by class
5. QR code generated
6. Students scan to mark attendance

#### 2. **View Attendance Records**

1. Navigate to Attendance tab
2. Select "View Records"
3. Apply filters (class, date, session)
4. View attendance cards
5. Download PDF report

#### 3. **Manage Classes**

1. Navigate to Classes tab
2. Tap "Create Class"
3. Enter class name, description, year
4. Class appears in list
5. Edit or delete as needed

---

## 🔧 Developer Guide

### Tech Stack

```
Frontend:
├── React Native 0.79.4
├── Expo ~53.0.12
├── Expo Router ~5.1.0
├── TypeScript 5.8.3
└── React Native Paper

Backend:
├── Supabase (Auth, Database, Storage)
├── PostgreSQL (Database)
└── Realtime Subscriptions

Tools:
├── EAS Build
├── Codemagic CI/CD
└── GitHub Actions
```

### Project Structure

```
SIVASIR/
├── app/                    # Expo Router screens
├── components/             # Reusable components
├── services/              # Business logic
├── contexts/              # React Context
├── hooks/                 # Custom hooks
├── utils/                 # Utility functions
├── constants/             # App constants
├── types/                 # TypeScript types
├── assets/                # Static assets
└── .agent/                # Documentation
```

### Key Services

| Service | Purpose |
|---------|---------|
| `authService.ts` | User authentication and profile management |
| `attendanceService.ts` | Attendance session and record operations |
| `classService.ts` | Class CRUD operations |
| `fileService.ts` | File upload and management |
| `pdfReportService.ts` | PDF report generation |

### Environment Setup

Create `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Development Workflow

```bash
# Start development server
npx expo start

# Clear cache if needed
npx expo start -c

# Run tests (if configured)
npm test

# Build for production
eas build --platform all
```

---

## 🗄️ Database Schema

### Core Tables

#### **profiles**

```sql
- id (UUID, PK, FK to auth.users)
- email (TEXT, UNIQUE)
- name (TEXT)
- role (TEXT: 'student' | 'staff')
- class (TEXT, nullable)
- year (TEXT, nullable)
- roll_number (TEXT, nullable)
- department (TEXT, nullable)
```

#### **attendance_sessions**

```sql
- id (UUID, PK)
- session_name (TEXT)
- date (DATE)
- time (TEXT)
- qr_code (TEXT, UNIQUE)
- created_by (UUID, FK)
- is_active (BOOLEAN)
- class_filter (TEXT, optional)
```

#### **attendance_records**

```sql
- id (UUID, PK)
- session_id (UUID, FK)
- student_id (UUID, FK)
- student_name (TEXT)
- roll_number (TEXT)
- class (TEXT)
- marked_at (TIMESTAMPTZ)
- UNIQUE(session_id, student_id)
```

#### **classes**

```sql
- id (UUID, PK)
- class_name (TEXT, UNIQUE)
- description (TEXT)
- year (TEXT)
- created_by (UUID, FK)
- is_active (BOOLEAN)
```

#### **files**

```sql
- id (UUID, PK)
- student_id (UUID, FK)
- file_name (TEXT)
- file_type (TEXT)
- file_size (NUMERIC)
- uploaded_at (TIMESTAMPTZ)
```

### Relationships

```
auth.users (1) ←→ (1) profiles
profiles (1) ←→ (N) attendance_sessions
profiles (1) ←→ (N) attendance_records
profiles (1) ←→ (N) classes
profiles (1) ←→ (N) files
attendance_sessions (1) ←→ (N) attendance_records
```

---

## 🔐 Security

### Authentication

- JWT-based secure sessions
- Email confirmation required
- Password minimum 6 characters
- Session expires after 7 days

### Row Level Security (RLS)

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| profiles | ✅ All | ✅ Own | ✅ Own | ❌ |
| attendance_sessions | ✅ All | ✅ Staff | ✅ Own | ❌ |
| attendance_records | ✅ All | ✅ Students | ❌ | ❌ |
| classes | ✅ Active | ✅ Staff | ✅ Own | ✅ Own |
| files | ✅ All | ✅ Students | ❌ | ✅ Own |

### Data Protection

- All data encrypted at rest and in transit
- HTTPS only
- Secure storage for sensitive data
- Regular automated backups

---

## 🎨 UI/UX Design

### Design Principles

- **Clean & Modern** - Minimalist interface
- **Intuitive Navigation** - Easy to use
- **Consistent** - Uniform design language
- **Responsive** - Works on all screen sizes
- **Accessible** - WCAG compliant

### Color Scheme

```typescript
Primary: #2196F3 (Blue)
Secondary: #FF9800 (Orange)
Success: #4CAF50 (Green)
Error: #F44336 (Red)
Background: #F5F5F5 (Light Gray)
Surface: #FFFFFF (White)
```

### Typography

- **Headings**: System font, Bold
- **Body**: System font, Regular
- **Captions**: System font, Light

---

## 📊 Features in Detail

### 1. QR Code Attendance

**How it works:**

1. Staff creates session → Generates unique QR code
2. Students scan QR code with camera
3. System validates session (active, not duplicate)
4. Attendance marked instantly
5. Real-time update to staff dashboard

**Benefits:**

- ⚡ Fast (< 2 seconds)
- 🔒 Secure (unique codes)
- 📱 Contactless
- 📊 Automatic tracking

### 2. File Management

**Supported Types:**

- 📷 Images (JPG, PNG, GIF)
- 📄 Documents (PDF, DOC, DOCX)
- 📝 Text files (TXT)

**Features:**

- Upload to specific staff
- Thumbnail preview
- File size validation (max 10MB)
- Delete own files
- Real-time sync

### 3. PDF Reports

**Report Contents:**

- Summary statistics
- Attendance records table
- Filters applied
- Generated timestamp
- Staff signature

**Export Options:**

- Share via email
- Save to device
- Print directly

### 4. Real-time Updates

**Live Features:**

- Attendance marking
- Session creation
- File uploads
- Class changes

**Technology:**

- Supabase Realtime
- WebSocket connections
- Automatic reconnection

---

## 🚀 Deployment

### Build for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure build
eas build:configure

# Build Android
eas build --platform android --profile production

# Build iOS
eas build --platform ios --profile production
```

### Submit to Stores

```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

### CI/CD (Codemagic)

Automated builds on:

- Push to `main` branch
- Pull request creation
- Manual trigger

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **Email not confirmed**

**Problem**: Cannot login after signup  
**Solution**: Check email inbox/spam for confirmation link

#### 2. **QR code not scanning**

**Problem**: Camera not detecting QR code  
**Solution**:

- Ensure good lighting
- Grant camera permission
- Check QR code is active

#### 3. **File upload fails**

**Problem**: File not uploading  
**Solution**:

- Check file size (< 10MB)
- Verify file type is supported
- Check internet connection

#### 4. **Attendance not showing**

**Problem**: Marked attendance not visible  
**Solution**:

- Refresh the screen
- Check RLS policies
- Verify session is active

#### 5. **Android emulator not found**

**Problem**: `No Android connected device found`  
**Solution**:

- Install Android Studio
- Create AVD in Device Manager
- Start emulator before running app
- Or use iOS simulator (Mac)
- Or scan QR code with physical device

### Debug Mode

Enable detailed logging:

```typescript
// In lib/supabase.ts
const supabase = createClient(url, key, {
  auth: { debug: true }
});
```

---

## 📈 Performance

### Optimizations

- Lazy loading of components
- Image caching
- Pagination for large lists
- Debounced search
- Memoized calculations

### Metrics

- App size: ~50MB
- Initial load: < 3s
- QR scan: < 2s
- File upload: Depends on size
- PDF generation: < 5s

---

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Standards

- Use TypeScript
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation

---

## 📝 License

This project is proprietary software developed for educational institutions.

---

## 👨‍💻 Development Team

**SIVA-SIR Development Team**

- Architecture & Backend
- Frontend Development
- UI/UX Design
- Quality Assurance
- Documentation

---

## 📞 Support

### Documentation

- [Complete Workflow](.agent/workflows/app-workflow.md)
- [Functions Guide](.agent/APP_FUNCTIONS_GUIDE.md)
- [Architecture](.agent/ARCHITECTURE_OVERVIEW.md)
- [Quick Reference](.agent/QUICK_REFERENCE.md)

### External Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

### Contact

- GitHub Issues: For bug reports and feature requests
- Email: [Your contact email]
- Documentation: Check `.agent/` folder

---

## 🎯 Roadmap

### Version 1.1 (Planned)

- [ ] Push notifications
- [ ] Offline mode
- [ ] Analytics dashboard
- [ ] Export to Excel
- [ ] Bulk student import

### Version 2.0 (Future)

- [ ] Parent portal
- [ ] Assignment management
- [ ] Grade tracking
- [ ] Messaging system
- [ ] Calendar integration

---

## 📊 Statistics

- **Total Functions**: 32+
- **Database Tables**: 5
- **Screens**: 12
- **Services**: 6
- **Components**: 15+
- **Lines of Code**: 10,000+

---

## 🙏 Acknowledgments

- **Expo Team** - Amazing development platform
- **Supabase** - Powerful backend infrastructure
- **React Native Community** - Excellent libraries and support
- **TypeScript Team** - Type safety and developer experience

---

## 📅 Version History

### v1.0.0 (January 2026)

- ✅ Initial release
- ✅ QR code attendance
- ✅ File management
- ✅ Class management
- ✅ PDF reports
- ✅ Real-time updates
- ✅ Dual role system

---

<div align="center">

**Built with ❤️ for Education**

[Documentation](.agent/) • [Report Bug](issues) • [Request Feature](issues)

</div>
