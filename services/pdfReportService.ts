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

interface ReportData {
  records: AttendanceRecord[];
  absentRecords?: AbsentRecord[];
  reportType: string;
  sessionName?: string;
  dateRange?: { start: string; end: string };
  totalStudents?: number;
}

export const pdfReportService = {
  async generateAttendanceReport(data: ReportData): Promise<void> {
    const { records, absentRecords = [], reportType, sessionName, dateRange, totalStudents } = data;

    if (records.length === 0 && absentRecords.length === 0) {
      throw new Error('No records to generate report');
    }

    // Calculate statistics
    const totalPresent = records.length;
    const totalAbsent = absentRecords.length;
    const totalCount = totalStudents || (totalPresent + totalAbsent);
    const attendanceRate = totalCount > 0 ? ((totalPresent / totalCount) * 100).toFixed(1) : '0.0';
    const uniqueStudents = new Set(records.map(r => r.studentId)).size;
    const uniqueSessions = new Set(records.map(r => r.sessionId)).size;

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
              background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%);
              padding: 20px;
              border-radius: 12px;
              margin-bottom: 25px;
              color: white;
            }
            
            .summary-title {
              font-size: 16px;
              font-weight: 600;
              margin-bottom: 15px;
              opacity: 0.95;
            }
            
            .summary-stats {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
            }
            
            .stat-item {
              text-align: center;
              background: rgba(255, 255, 255, 0.15);
              padding: 15px;
              border-radius: 8px;
              backdrop-filter: blur(10px);
            }
            
            .stat-value {
              font-size: 32px;
              font-weight: 800;
              line-height: 1;
              margin-bottom: 5px;
            }
            
            .stat-label {
              font-size: 12px;
              opacity: 0.9;
              font-weight: 500;
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
            
            .record-card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 10px;
              padding: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: all 0.2s;
            }
            
            .record-card:hover {
              background: #f9fafb;
              border-color: #7C3AED;
              box-shadow: 0 2px 8px rgba(124, 58, 237, 0.1);
            }
            
            .record-info {
              flex: 1;
            }
            
            .student-name {
              font-size: 16px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 6px;
            }
            
            .record-details {
              font-size: 13px;
              color: #6b7280;
              margin-bottom: 4px;
            }
            
            .record-details:last-child {
              margin-bottom: 0;
            }
            
            .detail-separator {
              margin: 0 6px;
              color: #d1d5db;
            }
            
            .check-icon {
              width: 28px;
              height: 28px;
              background: #10b981;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 18px;
              font-weight: bold;
              flex-shrink: 0;
            }
            
            .absent-card {
              border-color: #ef4444 !important;
              background: #fef2f2 !important;
            }
            
            .absent-icon {
              width: 28px;
              height: 28px;
              background: #ef4444;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 18px;
              font-weight: bold;
              flex-shrink: 0;
            }
            
            .empty-state {
              text-align: center;
              padding: 60px 20px;
              color: #9ca3af;
            }
            
            .empty-icon {
              font-size: 48px;
              margin-bottom: 15px;
            }
            
            .empty-text {
              font-size: 16px;
              color: #6b7280;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              color: #6b7280;
              font-size: 11px;
            }
            
            .footer-note {
              margin-top: 8px;
              font-style: italic;
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
                <div class="stat-value">${totalCount}</div>
                <div class="stat-label">Total Students</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${totalPresent}</div>
                <div class="stat-label">Present</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${totalAbsent}</div>
                <div class="stat-label">Absent</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">${attendanceRate}%</div>
                <div class="stat-label">Attendance Rate</div>
              </div>
            </div>
          </div>
          
          
          ${records.length > 0 ? `
            <div class="section-header">
              <h2 class="section-title">Present Students</h2>
              <span class="record-count">${records.length} ${records.length === 1 ? 'Student' : 'Students'}</span>
            </div>
            
            <div class="records-grid">
              ${records.map((record) => {
      const markedTime = new Date(record.markedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return `
                  <div class="record-card">
                    <div class="record-info">
                      <div class="student-name">${record.studentName}</div>
                      <div class="record-details">
                        Roll: ${record.rollNumber}${record.systemNumber ? `<span class="detail-separator">•</span>System: ${record.systemNumber}` : ''}<span class="detail-separator">•</span>Class: ${record.class}
                      </div>
                      <div class="record-details">
                        ${record.sessionName}<span class="detail-separator">•</span>${record.date}<span class="detail-separator">•</span>${markedTime}
                      </div>
                    </div>
                    <div class="check-icon">✓</div>
                  </div>
                `;
    }).join('')}
            </div>
          ` : ''}
          
          ${absentRecords.length > 0 ? `
            <div class="section-header" style="margin-top: ${records.length > 0 ? '30px' : '0'};">
              <h2 class="section-title">Absent Students</h2>
              <span class="record-count">${absentRecords.length} ${absentRecords.length === 1 ? 'Student' : 'Students'}</span>
            </div>
            
            <div class="records-grid">
              ${absentRecords.map((record) => {
      return `
                  <div class="record-card absent-card">
                    <div class="record-info">
                      <div class="student-name">${record.studentName}</div>
                      <div class="record-details">
                        Roll: ${record.rollNumber}${record.systemNumber ? `<span class="detail-separator">•</span>System: ${record.systemNumber}` : ''}<span class="detail-separator">•</span>Class: ${record.class}
                      </div>
                    </div>
                    <div class="absent-icon">✕</div>
                  </div>
                `;
    }).join('')}
            </div>
          ` : ''}
          
          ${records.length === 0 && absentRecords.length === 0 ? `
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
