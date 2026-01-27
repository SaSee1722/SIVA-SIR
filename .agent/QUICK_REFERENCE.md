# SIVA-SIR Education Portal - Quick Reference Guide

## 🚀 Quick Start

### Setup (First Time)

```bash
# Clone repository
git clone <repository-url>
cd SIVASIR

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npx expo start
```

### Run on Devices

```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web

# Scan QR code for physical device
npx expo start
```

---

## 📋 Common Tasks

### 1. Add a New User (Student)

```typescript
// In student-signup.tsx or via authService
await authService.signup({
  email: 'student@example.com',
  password: 'password123',
  name: 'John Doe',
  role: 'student',
  class: '10-A',
  year: '2026',
  rollNumber: '101'
});
```

### 2. Create Attendance Session

```typescript
// In staff-dashboard.tsx
const session = await attendanceService.createSession({
  sessionName: 'Morning Class',
  date: new Date(),
  time: '09:00 AM',
  classFilter: '10-A',  // Optional
  createdBy: staffUserId
});
```

### 3. Mark Attendance

```typescript
// In qr-scanner.tsx
await attendanceService.markAttendance({
  qrCode: scannedQRCode,
  studentId: currentUser.id,
  studentName: currentUser.name,
  rollNumber: currentUser.rollNumber,
  class: currentUser.class
});
```

### 4. Upload File

```typescript
// In student-dashboard.tsx
const fileMetadata = await fileService.uploadFile({
  file: selectedFile,
  studentId: currentUser.id,
  studentName: currentUser.name,
  staffId: selectedStaff.id
});
```

### 5. Generate PDF Report

```typescript
// In staff-dashboard.tsx
const { filePath } = await pdfReportService.generateAttendanceReport({
  filters: {
    classFilter: '10-A',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-31')
  },
  title: 'January Attendance Report',
  generatedBy: staffName
});
```

### 6. Create New Class

```typescript
// In class-management.tsx
const newClass = await classService.createClass({
  className: '11-Science',
  description: 'Science stream for 11th grade',
  year: '2026',
  createdBy: staffUserId
});
```

---

## 🗄️ Database Quick Reference

### Tables Overview

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User data | id, email, name, role, class, roll_number |
| `attendance_sessions` | QR sessions | id, session_name, qr_code, is_active |
| `attendance_records` | Attendance marks | id, session_id, student_id, marked_at |
| `classes` | Class list | id, class_name, year, is_active |
| `files` | File metadata | id, student_id, file_name, file_type |

### Common Queries

#### Get All Students in a Class

```sql
SELECT * FROM profiles 
WHERE role = 'student' 
AND class = '10-A' 
ORDER BY roll_number;
```

#### Get Attendance for a Session

```sql
SELECT * FROM attendance_records 
WHERE session_id = 'session-uuid' 
ORDER BY marked_at DESC;
```

#### Get Student's Attendance History

```sql
SELECT ar.*, ats.session_name, ats.date 
FROM attendance_records ar
JOIN attendance_sessions ats ON ar.session_id = ats.id
WHERE ar.student_id = 'student-uuid'
ORDER BY ar.marked_at DESC;
```

#### Get Files Uploaded by Student

```sql
SELECT * FROM files 
WHERE student_id = 'student-uuid' 
ORDER BY uploaded_at DESC;
```

---

## 🔐 Authentication Cheat Sheet

### Check if User is Logged In

```typescript
const { user, isAuthenticated } = useAuth();

if (!isAuthenticated) {
  router.push('/role-select');
}
```

### Get Current User Profile

```typescript
const { user } = useAuth();

console.log(user.name);      // User's name
console.log(user.role);      // 'student' or 'staff'
console.log(user.email);     // Email address
```

### Logout User

```typescript
const { logout } = useAuth();

await logout();
router.push('/role-select');
```

### Check User Role

```typescript
const { user } = useAuth();

if (user?.role === 'staff') {
  // Staff-only features
} else {
  // Student features
}
```

---

## 🎨 UI Components Reference

### Colors (Theme)

```typescript
const colors = {
  primary: '#2196F3',      // Blue
  secondary: '#FF9800',    // Orange
  success: '#4CAF50',      // Green
  error: '#F44336',        // Red
  background: '#F5F5F5',   // Light gray
  surface: '#FFFFFF',      // White
  text: '#212121',         // Dark gray
  textSecondary: '#757575' // Medium gray
};
```

### Common Components

#### Button

```tsx
<TouchableOpacity 
  style={styles.button}
  onPress={handlePress}
>
  <Text style={styles.buttonText}>Click Me</Text>
</TouchableOpacity>
```

#### Card

```tsx
<View style={styles.card}>
  <Text style={styles.cardTitle}>Title</Text>
  <Text style={styles.cardContent}>Content</Text>
</View>
```

#### Input Field

```tsx
<TextInput
  style={styles.input}
  placeholder="Enter text"
  value={value}
  onChangeText={setValue}
  autoCapitalize="none"
/>
```

---

## 🔄 Real-time Subscriptions

### Subscribe to Attendance Updates

```typescript
useEffect(() => {
  const channel = supabase
    .channel('attendance-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'attendance_records'
      },
      (payload) => {
        console.log('New attendance:', payload.new);
        // Update local state
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### Subscribe to Session Changes

```typescript
useEffect(() => {
  const channel = supabase
    .channel('session-changes')
    .on(
      'postgres_changes',
      {
        event: '*',  // All events
        schema: 'public',
        table: 'attendance_sessions'
      },
      (payload) => {
        console.log('Session change:', payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 🐛 Debugging Tips

### Enable Supabase Logging

```typescript
// In lib/supabase.ts
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      debug: true  // Enable auth debugging
    }
  }
);
```

### Check Network Requests

```typescript
// Add to any service call
try {
  const result = await someService.someMethod();
  console.log('Success:', result);
} catch (error) {
  console.error('Error:', error);
  console.error('Error details:', JSON.stringify(error, null, 2));
}
```

### View Realtime Connection Status

```typescript
supabase.channel('test').subscribe((status) => {
  console.log('Realtime status:', status);
  // SUBSCRIBED, CLOSED, CHANNEL_ERROR, TIMED_OUT
});
```

### Check Auth State

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);
});
```

---

## 📱 Navigation Cheat Sheet

### Navigate to Screen

```typescript
import { router } from 'expo-router';

// Push to new screen
router.push('/student-dashboard');

// Replace current screen
router.replace('/staff-dashboard');

// Go back
router.back();

// Navigate with parameters
router.push({
  pathname: '/qr-scanner',
  params: { sessionId: '123' }
});
```

### Get Route Parameters

```typescript
import { useLocalSearchParams } from 'expo-router';

const { sessionId } = useLocalSearchParams();
```

---

## 🔧 Environment Variables

### Required Variables (.env)

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Cloudinary (if using)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset

# Optional: Staff Access Key
EXPO_PUBLIC_STAFF_ACCESS_KEY=your-secret-key
```

### Access Environment Variables

```typescript
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
```

---

## 📊 Common Filters & Queries

### Filter Attendance by Date Range

```typescript
const records = await attendanceService.getAttendanceRecords({
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31')
});
```

### Filter by Class

```typescript
const records = await attendanceService.getAttendanceRecords({
  classFilter: '10-A'
});
```

### Filter by Session

```typescript
const records = await attendanceService.getAttendanceRecords({
  sessionId: 'session-uuid'
});
```

### Get Student's Files

```typescript
const files = await fileService.getFiles({
  studentId: 'student-uuid'
});
```

---

## 🎯 Validation Rules

### Email

- Format: `user@domain.com`
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### Password

- Minimum: 6 characters
- Recommended: 8+ characters with mix of letters and numbers

### Roll Number

- Format: Alphanumeric with optional hyphen
- Length: 3-20 characters
- Example: `101`, `CS-2026-001`

### Class Name

- Length: 2-50 characters
- Example: `10-A`, `11-Science`, `12-Commerce`

### Session Name

- Length: 3-100 characters
- Example: `Morning Class`, `Lab Session 1`

### File Upload

- Max size: 10MB
- Allowed types: jpg, jpeg, png, gif, pdf, doc, docx, txt

---

## 🚨 Error Handling

### Common Errors

#### "Email not confirmed"

```typescript
// User needs to confirm email
// Redirect to confirm-success screen
router.push('/confirm-success');
```

#### "Session not active"

```typescript
// QR code session is inactive
// Staff needs to activate session
Alert.alert('Error', 'This session is not active');
```

#### "Attendance already marked"

```typescript
// Student already marked attendance
// Show appropriate message
Alert.alert('Info', 'You have already marked attendance for this session');
```

#### "No staff selected"

```typescript
// Student must select staff before uploading
// Disable upload button until staff selected
if (!selectedStaff) {
  Alert.alert('Error', 'Please select a staff member first');
}
```

---

## 📦 Build & Deploy

### Development Build

```bash
# Start development server
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

### Production Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Build for both
eas build --platform all --profile production
```

### Submit to Stores

```bash
# Submit to Google Play
eas submit --platform android

# Submit to App Store
eas submit --platform ios
```

---

## 🔍 Testing Checklist

### Authentication

- [ ] Student signup works
- [ ] Staff signup works
- [ ] Email confirmation required
- [ ] Login works with correct credentials
- [ ] Login fails with wrong credentials
- [ ] Logout clears session
- [ ] Session persists on app restart

### Attendance

- [ ] Staff can create session
- [ ] QR code generates correctly
- [ ] Student can scan QR code
- [ ] Attendance marks successfully
- [ ] Duplicate attendance prevented
- [ ] Inactive session rejected
- [ ] Real-time updates work

### File Upload

- [ ] Staff selection required
- [ ] File upload works
- [ ] File size validation
- [ ] File type validation
- [ ] Thumbnail generation (images)
- [ ] File deletion works
- [ ] Files visible to staff

### Class Management

- [ ] Staff can create class
- [ ] Class name uniqueness enforced
- [ ] Students can select class
- [ ] Class editing works
- [ ] Class deletion works (soft delete)
- [ ] Student count accurate

### Reports

- [ ] PDF generates correctly
- [ ] Filters work properly
- [ ] Statistics accurate
- [ ] PDF matches app design
- [ ] PDF can be shared

---

## 📚 Useful Commands

### Clear Cache

```bash
# Clear Expo cache
npx expo start -c

# Clear npm cache
npm cache clean --force

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Reset Database

```bash
# In Supabase SQL Editor
TRUNCATE attendance_records CASCADE;
TRUNCATE attendance_sessions CASCADE;
TRUNCATE files CASCADE;
TRUNCATE classes CASCADE;
```

### View Logs

```bash
# iOS logs
npx react-native log-ios

# Android logs
npx react-native log-android

# Expo logs (already visible in terminal)
```

---

## 🔗 Quick Links

### Documentation

- [Complete Workflow](.agent/workflows/app-workflow.md)
- [Functions Guide](.agent/APP_FUNCTIONS_GUIDE.md)
- [Architecture Overview](.agent/ARCHITECTURE_OVERVIEW.md)
- [PDF Implementation](.agent/PDF_REPORT_IMPLEMENTATION.md)

### External Resources

- [Expo Docs](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Docs](https://www.typescriptlang.org/docs)

### Supabase Dashboard

- Project URL: Check `.env` file
- Database: SQL Editor
- Storage: File browser
- Auth: User management
- Realtime: Channel inspector

---

## 💡 Pro Tips

### 1. Use TypeScript

Always define types for better code quality:

```typescript
interface AttendanceRecord {
  id: string;
  student_name: string;
  marked_at: Date;
  // ... other fields
}
```

### 2. Handle Loading States

```typescript
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async () => {
  setIsLoading(true);
  try {
    await someAsyncOperation();
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Use Custom Hooks

Extract reusable logic:

```typescript
const useAttendance = () => {
  const [records, setRecords] = useState([]);
  
  useEffect(() => {
    fetchRecords();
  }, []);
  
  return { records, refetch: fetchRecords };
};
```

### 4. Optimize Re-renders

Use `useMemo` and `useCallback`:

```typescript
const filteredRecords = useMemo(() => {
  return records.filter(r => r.class === selectedClass);
}, [records, selectedClass]);
```

### 5. Error Boundaries

Wrap components to catch errors:

```typescript
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

---

## 🎓 Learning Resources

### Beginner

1. React Native basics
2. TypeScript fundamentals
3. Expo Router navigation
4. Supabase authentication

### Intermediate

1. State management patterns
2. Real-time subscriptions
3. File upload handling
4. PDF generation

### Advanced

1. Performance optimization
2. Security best practices
3. CI/CD pipelines
4. App store deployment

---

**Last Updated**: January 25, 2026  
**Version**: 1.0.0  
**For Support**: Check GitHub Issues or Documentation
