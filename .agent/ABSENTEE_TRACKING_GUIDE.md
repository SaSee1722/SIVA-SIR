# Absentee Tracking Feature

## Overview

The app now has **complete absentee tracking** functionality! You can check which students didn't attend a session or view attendance statistics for an entire class.

## How It Works

### The Logic

1. **All Students** are stored in the `profiles` table (with `role = 'student'`)
2. **Present Students** are recorded in `attendance_records` when they scan QR
3. **Absentees** = All Students - Present Students

## Available Functions

### 1. Get Absentees for a Specific Session

```typescript
await attendanceService.getAbsenteesBySession(sessionId, className?)
```

**Parameters:**

- `sessionId` (required): The session ID to check
- `className` (optional): Filter by specific class (e.g., "10-A")

**Returns:** Array of absentee students

```typescript
[
  {
    studentId: "uuid",
    studentName: "John Doe",
    rollNumber: "2024001",
    class: "10-A"
  },
  // ...
]
```

**Example Usage:**

```typescript
// Get all absentees for a session
const absentees = await attendanceService.getAbsenteesBySession(sessionId);

// Get absentees from Class 10-A only
const classAbsentees = await attendanceService.getAbsenteesBySession(
  sessionId,
  "10-A"
);
```

### 2. Get Attendance Statistics for a Class

```typescript
await attendanceService.getAbsenteesByClass(className, startDate?, endDate?)
```

**Parameters:**

- `className` (required): The class to analyze (e.g., "10-A")
- `startDate` (optional): Start date for analysis (YYYY-MM-DD)
- `endDate` (optional): End date for analysis (YYYY-MM-DD)

**Returns:** Detailed attendance statistics

```typescript
{
  className: "10-A",
  totalStudents: 30,
  totalSessions: 15,
  students: [
    {
      studentId: "uuid",
      studentName: "John Doe",
      rollNumber: "2024001",
      class: "10-A",
      totalSessions: 15,
      attendedSessions: 12,
      absentSessions: 3,
      attendanceRate: 80.0  // percentage
    },
    // ... sorted by roll number
  ]
}
```

**Example Usage:**

```typescript
// Get all-time stats for Class 10-A
const stats = await attendanceService.getAbsenteesByClass("10-A");

// Get stats for a specific date range
const monthStats = await attendanceService.getAbsenteesByClass(
  "10-A",
  "2026-01-01",
  "2026-01-31"
);
```

## Use Cases

### Use Case 1: Check Who's Absent Right Now

**Scenario:** Staff wants to know who missed today's session

```typescript
// In staff dashboard, after a session
const activeSession = sessions.find(s => s.isActive);
if (activeSession) {
  const absentees = await attendanceService.getAbsenteesBySession(
    activeSession.id
  );
  
  console.log(`${absentees.length} students are absent`);
  // Display absentees list
}
```

### Use Case 2: Class-wise Absentee Report

**Scenario:** Staff wants to see which students from Class 10-A are absent

```typescript
const classAbsentees = await attendanceService.getAbsenteesBySession(
  sessionId,
  "10-A"
);

console.log(`Class 10-A: ${classAbsentees.length} absent`);
```

### Use Case 3: Monthly Attendance Report

**Scenario:** Generate monthly attendance report for a class

```typescript
const report = await attendanceService.getAbsenteesByClass(
  "10-A",
  "2026-01-01",
  "2026-01-31"
);

console.log(`Class: ${report.className}`);
console.log(`Total Students: ${report.totalStudents}`);
console.log(`Total Sessions: ${report.totalSessions}`);

// Find students with low attendance
const lowAttendance = report.students.filter(s => s.attendanceRate < 75);
console.log(`${lowAttendance.length} students have < 75% attendance`);
```

### Use Case 4: Identify Chronic Absentees

**Scenario:** Find students who are frequently absent

```typescript
const stats = await attendanceService.getAbsenteesByClass("10-A");

const chronicAbsentees = stats.students
  .filter(s => s.absentSessions > 5)
  .sort((a, b) => b.absentSessions - a.absentSessions);

console.log("Students with >5 absences:");
chronicAbsentees.forEach(student => {
  console.log(`${student.studentName}: ${student.absentSessions} absences`);
});
```

## How to Display in UI

### Option 1: Add Absentees Tab in Staff Dashboard

```tsx
// In staff-dashboard.tsx
const [showAbsentees, setShowAbsentees] = useState(false);
const [absentees, setAbsentees] = useState([]);

const handleViewAbsentees = async () => {
  if (activeSession) {
    const absent = await attendanceService.getAbsenteesBySession(
      activeSession.id
    );
    setAbsentees(absent);
    setShowAbsentees(true);
  }
};

// In render:
{showAbsentees && (
  <View>
    <Text>Absentees ({absentees.length})</Text>
    {absentees.map(student => (
      <View key={student.studentId}>
        <Text>{student.studentName}</Text>
        <Text>Roll: {student.rollNumber} • Class: {student.class}</Text>
      </View>
    ))}
  </View>
)}
```

### Option 2: Show Absentee Count Next to Present Count

```tsx
// In QR view
<View>
  <Text>{presentCount} students marked present</Text>
  <Text>{absenteeCount} students absent</Text>
</View>
```

### Option 3: Class Attendance Dashboard

```tsx
const [classStats, setClassStats] = useState(null);

const loadClassStats = async (className) => {
  const stats = await attendanceService.getAbsenteesByClass(className);
  setClassStats(stats);
};

// Display:
{classStats && (
  <View>
    <Text>Class: {classStats.className}</Text>
    <Text>Total Students: {classStats.totalStudents}</Text>
    <Text>Total Sessions: {classStats.totalSessions}</Text>
    
    {classStats.students.map(student => (
      <View key={student.studentId}>
        <Text>{student.studentName}</Text>
        <Text>Attendance: {student.attendanceRate}%</Text>
        <Text>
          Present: {student.attendedSessions} | 
          Absent: {student.absentSessions}
        </Text>
      </View>
    ))}
  </View>
)}
```

## PDF Report Integration

You can enhance the PDF report to include absentees:

```typescript
// In pdfReportService.ts
interface ReportData {
  records: AttendanceRecord[];
  absentees?: any[];  // Add this
  reportType: string;
  sessionName?: string;
  dateRange?: { start: string; end: string };
}

// In staff-dashboard.tsx
const handleDownloadReport = async (reportType: string) => {
  // ... existing code ...
  
  // Get absentees if it's a session report
  let absentees = [];
  if (reportType === 'Session' && selectedSessionId) {
    absentees = await attendanceService.getAbsenteesBySession(
      selectedSessionId
    );
  }
  
  const reportData = {
    records: displayRecords,
    absentees,  // Add this
    reportType,
    sessionName,
    dateRange,
  };
  
  await pdfReportService.generateAttendanceReport(reportData);
};
```

## Quick Implementation Guide

### Step 1: Add Absentee Button to Staff Dashboard

```tsx
// After the present count display
<Button
  title="View Absentees"
  onPress={handleViewAbsentees}
  role="staff"
/>
```

### Step 2: Create Absentee Handler

```tsx
const handleViewAbsentees = async () => {
  try {
    if (!activeSession) {
      showAlert('Error', 'No active session');
      return;
    }
    
    const absent = await attendanceService.getAbsenteesBySession(
      activeSession.id
    );
    
    // Show in alert or modal
    showAlert(
      'Absentees',
      `${absent.length} students are absent:\n\n` +
      absent.map(s => `${s.studentName} (${s.rollNumber})`).join('\n')
    );
  } catch (error) {
    showAlert('Error', 'Failed to fetch absentees');
  }
};
```

### Step 3: (Optional) Add to PDF Report

Update the PDF HTML to include an absentees section after the present students.

## Benefits

✅ **Complete Picture** - See both present AND absent students  
✅ **Class Filtering** - Check absentees by specific class  
✅ **Statistics** - Get attendance rates and trends  
✅ **Early Intervention** - Identify students with low attendance  
✅ **Flexible** - Works for single sessions or date ranges  
✅ **Sorted** - Absentees sorted by roll number  

## Important Notes

### Prerequisites

1. All students must be registered in the `profiles` table
2. Students must have their `class` field filled in
3. The `class` field must match exactly (e.g., "10-A" not "10A")

### Performance

- `getAbsenteesBySession` is fast (2 queries)
- `getAbsenteesByClass` can be slower for large classes (queries per student)
- Consider caching results for frequently accessed data

### Data Accuracy

- Absentees are calculated in real-time
- If a student joins late and scans QR, they're removed from absentees
- Only students with `role = 'student'` are considered

## Example Scenarios

### Scenario 1: Morning Assembly

```typescript
// Staff creates "Morning Assembly" session
// 45 students scan QR code
// Staff clicks "View Absentees"
// System shows: "5 students absent"
// List: John (101), Sarah (105), Mike (112), Emma (118), David (125)
```

### Scenario 2: Class-wise Check

```typescript
// Staff selects "Class 10-A"
// Gets absentees for active session filtered by class
// Shows only 10-A students who are absent
```

### Scenario 3: Monthly Report

```typescript
// Staff generates January report for Class 10-A
// System shows:
// - Total: 30 students
// - Sessions: 20
// - Each student's attendance rate
// - Identifies 3 students with <75% attendance
```

This feature gives you **complete visibility** into attendance, not just who's present! 🎯
