# Large Institution (2,000 Students) - Free Plan Viability Analysis

## 🎯 Scenario: 2,000 Students + 100 Staff with 6-Month Data Retention

### Configuration:
- **Students:** 2,000
- **Staff:** 100
- **Classes:** 150
- **Working Days:** 200 days/year (2 semesters)
- **Sessions per Day:** 15
- **Data Retention:** 6 months (rolling deletion)

---

## 📊 Storage Calculation with 6-Month Retention

### 6-Month Period (100 working days):

#### 1. **Profiles (Permanent)**
- Students: 2,000 × 0.5 KB = 1,000 KB (1 MB)
- Staff: 100 × 0.5 KB = 50 KB
- **Total:** 1.05 MB ✅

#### 2. **Classes (Permanent)**
- 150 classes × 0.3 KB = 45 KB ✅

#### 3. **Class Students (Permanent)**
- 2,000 students × 5 classes avg = 10,000 relationships
- 10,000 × 0.25 KB = 2,500 KB (2.5 MB) ✅

#### 4. **Attendance Sessions (6 months only)**
- 100 days × 15 sessions/day = 1,500 sessions
- 1,500 × 0.4 KB = 600 KB ✅

#### 5. **Attendance Records (6 months only) - THE KEY**
- 2,000 students × 1,500 sessions = 3,000,000 records
- 3,000,000 × 0.2 KB = 600,000 KB (600 MB) ⚠️

#### 6. **Notifications (30 days retention)**
- 2,000 users × 50 notifications = 100,000 notifications
- 100,000 × 0.35 KB = 35,000 KB (35 MB) ✅

#### 7. **Files Metadata (Permanent)**
- 5,000 files × 0.3 KB = 1,500 KB (1.5 MB) ✅

---

## 📈 Total Database Usage with 6-Month Retention

### Breakdown:
- Profiles: 1.05 MB
- Classes: 0.045 MB
- Class Students: 2.5 MB
- Attendance Sessions: 0.6 MB
- **Attendance Records: 600 MB** ⚠️
- Notifications: 35 MB
- Files Metadata: 1.5 MB

### **Total: ~640 MB / 500 MB = 128% STILL EXCEEDS!** ❌

---

## 🔍 The Problem: Attendance Records

Even with 6-month retention, attendance records alone consume:
- **600 MB** (for 2,000 students × 1,500 sessions)

This exceeds the 500 MB limit by itself!

---

## ✅ SOLUTION: Aggressive Data Management Strategy

### Strategy 1: 3-Month Rolling Retention

#### Calculation:
- 50 days × 15 sessions/day = 750 sessions
- 2,000 students × 750 sessions = 1,500,000 records
- 1,500,000 × 0.2 KB = 300,000 KB (300 MB)

**Total Database:** ~340 MB / 500 MB = **68% used** ✅

### Strategy 2: Keep Only Current Semester (90 days)

#### Calculation:
- 90 days × 15 sessions/day = 1,350 sessions
- 2,000 students × 1,350 sessions = 2,700,000 records
- 2,700,000 × 0.2 KB = 540,000 KB (540 MB)

**Total Database:** ~580 MB / 500 MB = **116% EXCEEDS** ❌

### Strategy 3: Selective Archival (RECOMMENDED)

Keep detailed records for:
- **Current month:** Full attendance records (detailed)
- **Previous 2 months:** Summary only (attendance percentage per student)
- **Older:** Archived to external storage (CSV/JSON)

#### Calculation:
- Current month: 20 days × 15 sessions × 2,000 students = 600,000 records (120 MB)
- Previous 2 months: 2,000 students × 1 summary record = 2,000 records (0.4 MB)
- **Total Attendance Data:** 120.4 MB

**Total Database:** ~160 MB / 500 MB = **32% used** ✅✅✅

---

## 🎯 Recommended Implementation

### **3-Tier Data Retention Policy:**

#### Tier 1: Hot Data (Current Month)
- **Retention:** 30 days
- **Storage:** Full detailed records
- **Size:** ~120 MB
- **Purpose:** Active attendance tracking, real-time reports

#### Tier 2: Warm Data (2-3 Months Old)
- **Retention:** 60-90 days
- **Storage:** Aggregated summaries
- **Size:** ~1 MB
- **Purpose:** Recent history, trend analysis

#### Tier 3: Cold Data (Older than 3 Months)
- **Retention:** Archived externally
- **Storage:** CSV/JSON files (Google Drive, AWS S3, etc.)
- **Size:** 0 MB in Supabase
- **Purpose:** Long-term records, compliance

---

## 🔧 Implementation: Automated Cleanup Script

### SQL Script for Automated Cleanup:

```sql
-- Create a function to archive and delete old records
CREATE OR REPLACE FUNCTION cleanup_old_attendance_records()
RETURNS void AS $$
BEGIN
  -- Step 1: Archive records older than 30 days to summary table
  INSERT INTO attendance_summary (student_id, month, year, total_sessions, attended_sessions, attendance_rate)
  SELECT 
    ar.student_id,
    EXTRACT(MONTH FROM s.created_at) as month,
    EXTRACT(YEAR FROM s.created_at) as year,
    COUNT(*) as total_sessions,
    COUNT(*) FILTER (WHERE ar.status = 'present') as attended_sessions,
    (COUNT(*) FILTER (WHERE ar.status = 'present')::float / COUNT(*) * 100) as attendance_rate
  FROM attendance_records ar
  JOIN attendance_sessions s ON ar.session_id = s.id
  WHERE s.created_at < NOW() - INTERVAL '30 days'
    AND s.created_at >= NOW() - INTERVAL '90 days'
  GROUP BY ar.student_id, EXTRACT(MONTH FROM s.created_at), EXTRACT(YEAR FROM s.created_at)
  ON CONFLICT (student_id, month, year) DO UPDATE
  SET 
    total_sessions = EXCLUDED.total_sessions,
    attended_sessions = EXCLUDED.attended_sessions,
    attendance_rate = EXCLUDED.attendance_rate;

  -- Step 2: Delete records older than 30 days
  DELETE FROM attendance_records
  WHERE session_id IN (
    SELECT id FROM attendance_sessions
    WHERE created_at < NOW() - INTERVAL '30 days'
  );

  -- Step 3: Delete sessions older than 30 days
  DELETE FROM attendance_sessions
  WHERE created_at < NOW() - INTERVAL '30 days';

  -- Step 4: Delete old read notifications (older than 30 days)
  DELETE FROM notifications
  WHERE is_read = true
    AND created_at < NOW() - INTERVAL '30 days';

  -- Step 5: Delete old unread notifications (older than 90 days)
  DELETE FROM notifications
  WHERE is_read = false
    AND created_at < NOW() - INTERVAL '90 days';

END;
$$ LANGUAGE plpgsql;

-- Create attendance summary table
CREATE TABLE IF NOT EXISTS attendance_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_sessions INTEGER NOT NULL,
  attended_sessions INTEGER NOT NULL,
  attendance_rate DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, month, year)
);

-- Schedule cleanup to run daily (using pg_cron extension)
-- Note: pg_cron is available on Supabase Pro plan
-- For free plan, you'll need to trigger this manually or via Edge Function

-- Alternative: Create an Edge Function to run this weekly
```

### Edge Function for Automated Cleanup (Free Plan Compatible):

```typescript
// supabase/functions/cleanup-attendance/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // Call the cleanup function
    const { error } = await supabase.rpc('cleanup_old_attendance_records')
    
    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, message: 'Cleanup completed' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Trigger via GitHub Actions (Weekly):

```yaml
# .github/workflows/cleanup-database.yml
name: Database Cleanup

on:
  schedule:
    # Run every Sunday at 2 AM
    - cron: '0 2 * * 0'
  workflow_dispatch: # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cleanup Edge Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            https://your-project.supabase.co/functions/v1/cleanup-attendance
```

---

## 📊 Final Storage Calculation with 30-Day Retention

### Database Usage:
- Profiles: 1.05 MB
- Classes: 0.045 MB
- Class Students: 2.5 MB
- Attendance Sessions (30 days): 0.3 MB
- **Attendance Records (30 days): 120 MB**
- Attendance Summary (12 months): 0.5 MB
- Notifications (30 days): 15 MB
- Files Metadata: 1.5 MB

### **Total: ~141 MB / 500 MB = 28% used** ✅✅✅

---

## ✅ Can You Use Free Plan Endlessly?

### **YES! With These Conditions:**

1. ✅ **30-day rolling retention** for detailed attendance records
2. ✅ **Monthly summaries** for historical data (2-3 months)
3. ✅ **External archival** for long-term storage
4. ✅ **Automated cleanup** (weekly via Edge Function or GitHub Actions)
5. ✅ **30-day notification cleanup**
6. ⚠️ **Manual activity** every 7 days to prevent auto-pause (or upgrade to Pro)

### **Storage Headroom:**
- Used: 141 MB
- Available: 500 MB
- **Remaining: 359 MB (72% free)** ✅

---

## 🎯 Implementation Checklist

### Phase 1: Setup (Week 1)
- [ ] Create `attendance_summary` table
- [ ] Create `cleanup_old_attendance_records()` function
- [ ] Test cleanup function manually
- [ ] Export existing old data to CSV

### Phase 2: Automation (Week 2)
- [ ] Create Edge Function for cleanup
- [ ] Set up GitHub Actions workflow
- [ ] Test automated cleanup
- [ ] Monitor database size

### Phase 3: Monitoring (Ongoing)
- [ ] Check database size weekly
- [ ] Verify cleanup runs successfully
- [ ] Archive summaries to external storage quarterly
- [ ] Keep database under 200 MB (40% capacity)

---

## 💡 Additional Optimizations

### 1. **Compress Notifications**
```sql
-- Keep only important notification types
DELETE FROM notifications
WHERE type NOT IN ('class_approved', 'attendance_marked')
  AND created_at < NOW() - INTERVAL '7 days';
```

### 2. **Optimize File Storage**
- Use external CDN (Cloudinary, AWS S3)
- Store only URLs in Supabase
- Saves 1 GB file storage limit

### 3. **Index Optimization**
```sql
-- Add index for faster cleanup queries
CREATE INDEX idx_sessions_created_at ON attendance_sessions(created_at);
CREATE INDEX idx_records_session_id ON attendance_records(session_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at, is_read);
```

---

## ⚠️ Important Considerations

### 1. **Auto-Pause Issue**
- Free projects pause after 7 days of inactivity
- **Solutions:**
  - Set up daily health check ping
  - Or upgrade to Pro ($25/month)

### 2. **Data Loss Risk**
- Always export data before deletion
- Keep backups in Google Drive/AWS S3
- Test restore process

### 3. **Compliance**
- Check if your institution requires longer data retention
- Some regulations require 1-3 years of records
- Archive to external storage for compliance

---

## 🎉 Conclusion

### **YES, you CAN use the free plan endlessly with 2,000 students!**

**Requirements:**
- ✅ 30-day detailed record retention
- ✅ Monthly summary aggregation
- ✅ Automated weekly cleanup
- ✅ External archival for old data
- ✅ Database stays at ~28% capacity (141 MB)

**Limitations:**
- ⚠️ Need to prevent auto-pause (ping every 7 days or upgrade)
- ⚠️ Manual exports for long-term compliance
- ⚠️ File storage still limited to 1 GB (use external CDN)

**Best Practice:**
- Start with 30-day retention
- Monitor database size monthly
- Adjust retention period if needed (can go up to 45-60 days)
- Always maintain 50%+ free space for safety

**Your 2,000-student institution can run indefinitely on the free plan!** ��
