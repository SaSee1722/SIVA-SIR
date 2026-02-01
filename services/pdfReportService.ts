import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { AttendanceRecord } from '@/types';

interface AbsentRecord {
  studentId: string;
  studentName: string;
  rollNumber: string;
  systemNumber?: string;
  class: string;
}

interface SessionGroup {
  sessionName: string;
  staffName: string;
  date: string;
  time: string;
  classFilter: string;
  present: AttendanceRecord[];
  absent: AbsentRecord[];
}

interface ReportData {
  records: AttendanceRecord[];
  absentRecords?: AbsentRecord[];
  reportType: string;
  sessionName?: string;
  dateRange?: { start: string; end: string };
  totalStudents?: number;
  sessionGroups?: SessionGroup[];
}

export const pdfReportService = {
  async generateAttendanceReport(data: ReportData): Promise<void> {
    const {
      records,
      absentRecords = [],
      reportType,
      sessionName,
      dateRange,
      totalStudents,
      sessionGroups = []
    } = data;

    if (records.length === 0 && absentRecords.length === 0) {
      throw new Error('No records to generate report');
    }

    // Calculate statistics based on session groups if present (Date Range), otherwise use flat lists
    let totalPresent = records.length;
    let totalAbsent = absentRecords.length;
    let sessionsCount = 1;

    if (sessionGroups.length > 0) {
      totalPresent = sessionGroups.reduce((acc, g) => acc + g.present.length, 0);
      totalAbsent = sessionGroups.reduce((acc, g) => acc + g.absent.length, 0);
      sessionsCount = sessionGroups.length;
    }

    const totalCount = totalPresent + totalAbsent;
    const attendanceRate = totalCount > 0 ? ((totalPresent / totalCount) * 100).toFixed(1) : '0.0';

    // Unique students across all records
    const uniqueStudents = new Set([
      ...records.map(r => r.studentId),
      ...sessionGroups.flatMap(g => g.present.map(p => p.studentId))
    ]).size;

    // Generate report title and subtitle
    let reportTitle = 'Attendance Report';
    let reportSubtitle = '';

    if (reportType === 'Session' && sessionName) {
      reportTitle = 'Session Attendance Report';
      reportSubtitle = sessionName;
    } else if (reportType === 'Date Range' && dateRange) {
      reportTitle = 'Date Range Attendance Report';
      reportSubtitle = `${dateRange.start} to ${dateRange.end}`;
    } else {
      reportTitle = 'Complete Attendance Report';
      reportSubtitle = 'All Sessions';
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Generate HTML content matching app's card layout
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${reportTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              padding: 30px;
              color: #1f2937;
              background: #ffffff;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #7C3AED;
            }
            
            .logo {
              font-size: 28px;
              font-weight: 800;
              color: #7C3AED;
              margin-bottom: 8px;
              letter-spacing: -0.5px;
            }
            
            .report-title {
              font-size: 24px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 6px;
            }
            
            .report-subtitle {
              font-size: 16px;
              color: #6b7280;
              font-weight: 500;
              margin-bottom: 12px;
            }
            
            .report-meta {
              display: flex;
              justify-content: center;
              gap: 20px;
              font-size: 13px;
              color: #6b7280;
              margin-top: 10px;
            }
            
            .meta-item {
              display: flex;
              align-items: center;
              gap: 5px;
            }
            
            .summary-section {
              background: #7c3aed;
              padding: 24px;
              border-radius: 16px;
              margin-bottom: 30px;
              color: white;
              box-shadow: 0 10px 15px -3px rgba(124, 58, 237, 0.2);
            }
            
            .summary-title {
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 20px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: rgba(255, 255, 255, 0.9);
            }
            
            .summary-stats {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
            }
            
            .stat-item {
              text-align: center;
              background: rgba(255, 255, 255, 0.15);
              padding: 15px 8px;
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .stat-value {
              font-size: 26px;
              font-weight: 800;
              margin-bottom: 2px;
              color: white;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .stat-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: rgba(255, 255, 255, 0.85);
            }

            .rate-message {
                text-align: center;
                margin-top: 20px;
                padding-top: 15px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                font-size: 13px;
                font-weight: 600;
                color: white;
            }
            
            .rate-highlight {
                color: #6ee7b7;
                font-size: 16px;
                font-weight: 800;
                margin-left: 5px;
            }
            
            .section-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e5e7eb;
            }
            
            .section-title {
              font-size: 18px;
              font-weight: 700;
              color: #111827;
            }
            
            .record-count {
              font-size: 14px;
              color: #6b7280;
              font-weight: 600;
            }
            
            .records-grid {
              display: grid;
              gap: 12px;
            }
            
            .check-icon {
              color: #10b981;
              font-weight: 700;
              font-size: 18px;
            }
            
            .absent-text {
              color: #ef4444 !important;
              font-weight: 700;
            }

            .present-text {
              color: #16a34a !important;
              font-weight: 700;
            }

            .session-card {
                background: #ffffff;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                margin-bottom: 30px;
                overflow: hidden;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }

            .session-card-header {
                background: #f9fafb;
                padding: 16px 20px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .session-card-title {
                font-size: 18px;
                font-weight: 700;
                color: #111827;
            }

            .session-card-meta {
                font-size: 13px;
                color: #6b7280;
                margin-top: 4px;
            }

            .student-table {
                width: 100%;
                border-collapse: collapse;
            }

            .student-table th {
                text-align: left;
                padding: 12px 20px;
                background: #f3f4f6;
                color: #4b5563;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .student-table td {
                padding: 12px 20px;
                border-bottom: 1px solid #f3f4f6;
                font-size: 14px;
            }

            .status-present {
                background-color: #dcfce7;
                color: #166534;
            }

            .status-absent {
                background-color: #fee2e2;
                color: #991b1b;
            }

            @media print {
              body {
                padding: 20px;
              }
              
              .record-card {
                break-inside: avoid;
              }
              
              .summary-section {
                break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Edu Portal</div>
            <h1 class="report-title">${reportTitle}</h1>
            ${reportSubtitle ? `<div class="report-subtitle">${reportSubtitle}</div>` : ''}
            <div class="report-meta">
              <div class="meta-item">
                <span>📅</span>
                <span>${currentDate}</span>
              </div>
              <div class="meta-item">
                <span>🕐</span>
                <span>${currentTime}</span>
              </div>
            </div>
          </div>
          
          <div class="summary-section">
            <div class="summary-title">Attendance Summary</div>
            <div class="summary-stats">
              <div class="stat-item">
                <div class="stat-value">${sessionsCount}</div>
                <div class="stat-label">Total Sessions</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${totalCount}</div>
                <div class="stat-label">Tracking Units</div>
              </div>
              <div class="stat-item">
               <div class="stat-value" style="color: #6ee7b7;">${totalPresent}</div>
                <div class="stat-label">Present</div>
              </div>
              <div class="stat-item">
               <div class="stat-value" style="color: #fca5a5;">${totalAbsent}</div>
                <div class="stat-label">Absent</div>
              </div>
            </div>
            <div class="rate-message">
               Overall attendance rate for the following sessions: <span class="rate-highlight">${attendanceRate}%</span>
            </div>
          </div>
          
          
          ${sessionGroups.length > 0 ? `
            ${sessionGroups.map((group) => `
                <div class="session-card">
                    <div class="session-card-header">
                        <div>
                            <div class="session-card-title">${group.sessionName}</div>
                            <div class="session-card-meta">
                                Staff: ${group.staffName} | Date: ${group.date} | Time: ${group.time}
                            </div>
                        </div>
                        <div class="record-count">
                            ${group.present.length} Present | ${group.absent.length} Absent
                        </div>
                    </div>
                    <table class="student-table">
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Roll Number</th>
                                <th>System No</th>
                                <th>Class</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${group.present.map(p => `
                                <tr>
                                    <td class="present-text">${p.studentName}</td>
                                    <td>${p.rollNumber}</td>
                                    <td>${p.systemNumber || '-'}</td>
                                    <td>${group.classFilter}</td>
                                    <td><span class="present-text">✓ Present</span></td>
                                </tr>
                            `).join('')}
                            ${group.absent.map(a => `
                                <tr>
                                    <td class="absent-text">${a.studentName}</td>
                                    <td>${a.rollNumber}</td>
                                    <td>${a.systemNumber || '-'}</td>
                                    <td>${group.classFilter}</td>
                                    <td><span class="absent-text">✕ Absent</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `).join('')}
          ` : `
          
          ${records.length > 0 ? `
            <div class="section-header">
              <h2 class="section-title">Present Students</h2>
              <span class="record-count">${records.length} ${records.length === 1 ? 'Student' : 'Students'}</span>
            </div>
            
            <div class="records-grid">
              ${records.map((record) => `
                  <div class="record-card">
                    <div class="record-info">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <div class="student-name">${record.studentName}</div>
                        ${record.status ? `
                          <span style="
                            background: ${record.status === 'on_duty' ? '#FEF3C7' : '#DEF7EC'};
                            color: ${record.status === 'on_duty' ? '#92400E' : '#03543F'};
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-size: 10px;
                            font-weight: 600;
                            text-transform: uppercase;
                          ">
                            ${record.status === 'on_duty' ? 'On Duty' : 'Present'}
                          </span>
                        ` : ''}
                      </div>
                      <div class="record-details">
                        Roll: ${record.rollNumber}${record.systemNumber ? `<span class="detail-separator">•</span>System: ${record.systemNumber}` : ''}<span class="detail-separator">•</span>Class: ${record.class}
                      </div>
                      <div class="record-details">
                        ${record.sessionName}<span class="detail-separator">•</span>${record.date}
                      </div>
                    </div>
                    <div class="check-icon">✓</div>
                  </div>
                `).join('')}
            </div>
          ` : ''}
          
          ${absentRecords.length > 0 ? `
            <div class="section-header" style="margin-top: ${records.length > 0 ? '30px' : '0'};">
              <h2 class="section-title">Absent Students</h2>
              <span class="record-count">${absentRecords.length} ${absentRecords.length === 1 ? 'Student' : 'Students'}</span>
            </div>
            
            <div class="records-grid">
              ${absentRecords.map((record) => `
                  <div class="record-card absent-card">
                    <div class="record-info">
                      <div class="student-name">${record.studentName}</div>
                      <div class="record-details">
                        Roll: ${record.rollNumber}${record.systemNumber ? `<span class="detail-separator">•</span>System: ${record.systemNumber}` : ''}<span class="detail-separator">•</span>Class: ${record.class}
                      </div>
                    </div>
                    <div class="absent-icon">✕</div>
                  </div>
                `).join('')}
            </div>
          ` : ''}
          `}
          
          ${records.length === 0 && absentRecords.length === 0 && sessionGroups.length === 0 ? `
            <div class="section-header">
              <h2 class="section-title">Attendance Records</h2>
              <span class="record-count">0 Records</span>
            </div>
            <div class="empty-state">
              <div class="empty-icon">📋</div>
              <div class="empty-text">No attendance records found</div>
            </div>
          ` : ''}
          
          <div class="footer">
            <div>Student Session Report generated by the Edu Portal</div>
            <div class="footer-note">This is a computer-generated report and does not require a signature.</div>
          </div>
        </body>
      </html>
    `;

    try {
      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Attendance Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF report');
    }
  },
};
