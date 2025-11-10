import ExcelJS from 'exceljs';
import type { FirestoreDocument } from '../services/firestore';
import standardsData from '../data/standards.json';

interface Standard {
  id: string;
  standard: string;
  evaluation_metrics: string[];
}

interface StandardsData {
  standards: Standard[];
}

/**
 * Load standards mapping from JSON
 */
function getStandardsMap(): Map<string, string> {
  const standardsMap = new Map<string, string>();
  const data = standardsData as StandardsData;
  
  if (data.standards) {
    data.standards.forEach((std: Standard) => {
      standardsMap.set(std.id, std.standard);
    });
  }
  
  return standardsMap;
}

/**
 * Load logo image as ArrayBuffer
 */
async function loadLogoAsBase64(): Promise<{ buffer: ArrayBuffer; extension: 'png' | 'jpeg' | 'gif' } | null> {
  try {
    // Fetch the logo from the public folder
    const response = await fetch('/logo.png');
    if (!response.ok) return null;
    
    const arrayBuffer = await response.arrayBuffer();
    
    return { buffer: arrayBuffer, extension: 'png' };
  } catch (error) {
    console.error('Failed to load logo:', error);
    return null;
  }
}

/**
 * Style header row with PrecepGo blue background
 */
function styleHeaderRow(headerRow: ExcelJS.Row) {
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF83A0CC' },
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
      size: 12,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF83A0CC' } },
      left: { style: 'thin', color: { argb: 'FF83A0CC' } },
      bottom: { style: 'thin', color: { argb: 'FF83A0CC' } },
      right: { style: 'thin', color: { argb: 'FF83A0CC' } },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
  });
}

/**
 * Add logo header to worksheet
 */
function addLogoHeader(workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet, logoData: { buffer: ArrayBuffer; extension: 'png' | 'jpeg' | 'gif' }, subtitle?: string) {
  // Insert logo at the top
  const logoId = workbook.addImage({
    buffer: logoData.buffer,
    extension: logoData.extension,
  });

  // Add logo to cell A1, resize to fit nicely
  worksheet.addImage(logoId, {
    tl: { col: 0, row: 0 },
    ext: { width: 200, height: 60 },
  });

  // Merge cells for logo area (A1:B2)
  worksheet.mergeCells('A1:B2');

  // Add title next to logo
  const titleCell = worksheet.getCell('C1');
  titleCell.value = 'PrecepGo';
  titleCell.font = { size: 24, bold: true, color: { argb: 'FF83A0CC' } };
  worksheet.mergeCells('C1:E1');

  const subtitleCell = worksheet.getCell('C2');
  subtitleCell.value = subtitle || 'COA Compliance Reports';
  subtitleCell.font = { size: 14, color: { argb: 'FF666666' } };
  worksheet.mergeCells('C2:E2');

  // Set row heights
  worksheet.getRow(1).height = 35;
  worksheet.getRow(2).height = 25;

  // Add spacing row
  worksheet.addRow([]);
}

/**
 * Export COA Reports to Excel format with logo header
 * Only exports the latest report
 */
export async function exportCOAReportsToExcel(documents: FirestoreDocument[]) {
  if (documents.length === 0) {
    alert('No COA reports to export');
    return;
  }

  // Sort documents by creation date (newest first) and take only the latest
  const sortedDocs = [...documents].sort((a, b) => {
    // Try createdAt first, then created_at from data, then 0
    const getDate = (doc: FirestoreDocument) => {
      if (doc.createdAt) return new Date(doc.createdAt).getTime();
      if (doc.data.created_at) {
        const date = doc.data.created_at?.toDate?.() || doc.data.created_at;
        return new Date(date).getTime();
      }
      return 0;
    };
    
    const dateA = getDate(a);
    const dateB = getDate(b);
    return dateB - dateA; // Descending order (newest first)
  });

  const latestDoc = sortedDocs[0];
  const data = latestDoc.data; // Define data first

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PrecepGo';
  workbook.created = new Date();

  // Load logo
  const logoData = await loadLogoAsBase64();

  // 1. Summary Sheet - Overall statistics
  const summarySheet = workbook.addWorksheet('Summary');
  
  // Add logo header if available
  if (logoData) {
    addLogoHeader(workbook, summarySheet, logoData);
  } else {
    // Add title without logo
    summarySheet.getCell('A1').value = 'PrecepGo - COA Compliance Report';
    summarySheet.getCell('A1').font = { size: 18, bold: true };
    summarySheet.addRow([]);
  }

  // Debug: Log the data structure
  console.log('[Export] ========== COA Report Export Debug ==========');
  console.log('[Export] Report ID:', latestDoc.id);
  console.log('[Export] Has student_reports:', !!data.student_reports);
  console.log('[Export] student_reports type:', typeof data.student_reports);
  console.log('[Export] student_reports is array:', Array.isArray(data.student_reports));
  if (Array.isArray(data.student_reports)) {
    console.log('[Export] student_reports length:', data.student_reports.length);
    if (data.student_reports.length > 0) {
      console.log('[Export] First student report keys:', Object.keys(data.student_reports[0]));
      console.log('[Export] First student report:', JSON.stringify(data.student_reports[0], null, 2));
    }
  }
  console.log('[Export] Has top-level standard_scores:', !!data.standard_scores);
  console.log('[Export] Top-level standard_scores is array:', Array.isArray(data.standard_scores));
  if (Array.isArray(data.standard_scores)) {
    console.log('[Export] Top-level standard_scores length:', data.standard_scores.length);
    if (data.standard_scores.length > 0) {
      console.log('[Export] First top-level standard:', JSON.stringify(data.standard_scores[0], null, 2));
    }
  }
  console.log('[Export] All data keys:', Object.keys(data));
  
  // Check if we should use a different document - look for one with actual standard_scores data
  let documentToUse = latestDoc;
  if (Array.isArray(data.student_reports) && data.student_reports.length > 0) {
    const hasStudentStandards = data.student_reports.some((sr: any) => 
      Array.isArray(sr.standard_scores) && sr.standard_scores.length > 0
    );
    
    if (!hasStudentStandards) {
      console.log('[Export] ⚠️ Latest report has empty standard_scores arrays. Searching for a report with data...');
      // Try to find a document with actual standard_scores data
      for (const doc of sortedDocs) {
        const docData = doc.data;
        if (Array.isArray(docData.student_reports)) {
          const hasData = docData.student_reports.some((sr: any) => 
            Array.isArray(sr.standard_scores) && sr.standard_scores.length > 0
          );
          if (hasData) {
            console.log(`[Export] ✓ Found report ${doc.id} with standard_scores data`);
            documentToUse = doc;
            break;
          }
        }
      }
    }
  }
  
  // Use the selected document
  const finalData = documentToUse.data;
  console.log('[Export] Using document:', documentToUse.id);
  console.log('[Export] ============================================');
  
  const summaryData = [{
    'Report ID': documentToUse.id.substring(0, 8),
    'Created Date': documentToUse.createdAt ? new Date(documentToUse.createdAt).toLocaleString() : 'N/A',
    'Students Processed': finalData.students_processed || 0,
    'Total Standards': finalData.total_standards || 0,
    'Student Reports Count': Array.isArray(finalData.student_reports) ? finalData.student_reports.length : 0,
    'Standard Scores Count': Array.isArray(finalData.standard_scores) ? finalData.standard_scores.length : 0,
    'Agent': finalData.agent || 'N/A',
  }];

  // Add headers
  const headerRow = summarySheet.addRow(Object.keys(summaryData[0]));
  styleHeaderRow(headerRow);

  // Add data rows
  summaryData.forEach((row) => {
    summarySheet.addRow(Object.values(row));
  });

  // Auto-fit columns
  summarySheet.columns.forEach((column) => {
    column.width = 20;
  });

  // 2. Create a tab for each student with their report and standards
  const standardsMap = getStandardsMap();
  const reportId = documentToUse.id.substring(0, 8);
  
  if (Array.isArray(finalData.student_reports)) {
    console.log(`[Export] Processing ${finalData.student_reports.length} student reports`);
    
    finalData.student_reports.forEach((studentReport: any, index: number) => {
      const studentName = studentReport.student_name || 'N/A';
      const studentId = studentReport.student_id || 'N/A';
      const classStanding = studentReport.class_standing || 'N/A';
      
      // Debug: Log student report structure
      console.log(`[Export] Student ${index + 1}: ${studentName}`);
      console.log(`[Export]   - Has standard_scores:`, !!studentReport.standard_scores);
      console.log(`[Export]   - standard_scores type:`, typeof studentReport.standard_scores);
      console.log(`[Export]   - standard_scores is array:`, Array.isArray(studentReport.standard_scores));
      if (Array.isArray(studentReport.standard_scores)) {
        console.log(`[Export]   - standard_scores length:`, studentReport.standard_scores.length);
        if (studentReport.standard_scores.length > 0) {
          console.log(`[Export]   - First standard:`, studentReport.standard_scores[0]);
        }
      }
      
      // Create a sheet name from student name (Excel sheet names are limited to 31 chars)
      const sheetName = studentName.length > 31 ? studentName.substring(0, 28) + '...' : studentName;
      
      // Create worksheet for this student
      const studentSheet = workbook.addWorksheet(sheetName);
      
      if (logoData) {
        addLogoHeader(workbook, studentSheet, logoData);
      }

      // Add student summary section
      const summaryHeaderRow = studentSheet.addRow(['Student Summary']);
      summaryHeaderRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF83A0CC' } };
      studentSheet.addRow([]);

      const studentSummaryData = [
        { 'Field': 'Report ID', 'Value': reportId },
        { 'Field': 'Student ID', 'Value': studentId },
        { 'Field': 'Student Name', 'Value': studentName },
        { 'Field': 'Class Standing', 'Value': classStanding },
        { 'Field': 'Evaluations Processed', 'Value': studentReport.evaluations_processed || 0 },
        { 'Field': 'Total Score', 'Value': studentReport.total_score || 0 },
        { 'Field': 'Total Standards', 'Value': studentReport.total_standards || 0 },
        { 'Field': 'Generated At', 'Value': studentReport.generated_at || 'N/A' },
      ];

      const summaryHeader = studentSheet.addRow(['Field', 'Value']);
      styleHeaderRow(summaryHeader);

      studentSummaryData.forEach((row) => {
        studentSheet.addRow([row.Field, row.Value]);
      });

      studentSheet.addRow([]);
      studentSheet.addRow([]);

      // Add student standards section
      const standardsHeaderRow = studentSheet.addRow(['Standard Scores']);
      standardsHeaderRow.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF83A0CC' } };
      studentSheet.addRow([]);

      const standardsHeaders = ['Standard Description', 'Preceptor Attestations'];
      const standardsHeader = studentSheet.addRow(standardsHeaders);
      styleHeaderRow(standardsHeader);

      // Check for standards - try multiple possible field names
      const standardScores = studentReport.standard_scores || studentReport.standards || [];
      
      console.log(`[Export]   - standardScores found:`, !!standardScores);
      console.log(`[Export]   - standardScores length:`, Array.isArray(standardScores) ? standardScores.length : 'not an array');
      
      if (Array.isArray(standardScores) && standardScores.length > 0) {
        console.log(`[Export]   ✓ Adding ${standardScores.length} standards for ${studentName}`);
        let addedCount = 0;
        standardScores.forEach((score: any, idx: number) => {
          const standardId = score.id || score.standard_id || score.standardId || 'N/A';
          const standardDescription = standardsMap.get(standardId) || standardId;
          
          // Handle score - check multiple possible field names
          let scoreValue = 0;
          if (score.score !== undefined && score.score !== null) {
            scoreValue = score.score;
          } else if (score.value !== undefined && score.value !== null) {
            scoreValue = score.value;
          } else if (score.scores !== undefined && score.scores !== null) {
            scoreValue = score.scores;
          }
          
          console.log(`[Export]     Standard ${idx + 1}: id=${standardId}, score=${scoreValue}, keys=${Object.keys(score).join(', ')}`);
          
          // Only add Standard Description and Preceptor Attestations (no Standard ID)
          studentSheet.addRow([standardDescription, scoreValue]);
          addedCount++;
        });
        console.log(`[Export]   ✓ Successfully added ${addedCount} standards to sheet`);
      } else {
        console.log(`[Export]   ✗ No standards found for ${studentName}`);
        console.log(`[Export]   - studentReport keys:`, Object.keys(studentReport));
        console.log(`[Export]   - studentReport.standard_scores:`, studentReport.standard_scores);
        // Add a row indicating no standards found
        studentSheet.addRow(['No standards found', '']);
      }
      
      // Enable text wrapping for Standard Description column (column A = 1 in 1-indexed)
      // Find the standards header row and apply wrapping from there
      let standardsHeaderRowNum = 0;
      studentSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const firstCell = row.getCell(1);
        if (firstCell.value === 'Standard Scores') {
          standardsHeaderRowNum = rowNumber;
        }
      });
      
      // Apply wrapping to Standard Description column (column A = 1 in 1-indexed) starting from standards header
      if (standardsHeaderRowNum > 0 && Array.isArray(studentReport.standard_scores) && studentReport.standard_scores.length > 0) {
        // Header row is 2 rows after "Standard Scores" text
        const headerRowNum = standardsHeaderRowNum + 2;
        const headerRow = studentSheet.getRow(headerRowNum);
        if (headerRow) {
          const descHeaderCell = headerRow.getCell(1); // Column A = Standard Description
          if (descHeaderCell) {
            descHeaderCell.alignment = { wrapText: true, vertical: 'top' };
          }
        }
        
        // Apply wrapping to all data rows in standards section
        for (let i = headerRowNum + 1; i <= studentSheet.rowCount; i++) {
          const row = studentSheet.getRow(i);
          if (row) {
            const descCell = row.getCell(1); // Column A = Standard Description
            if (descCell) {
              descCell.alignment = { wrapText: true, vertical: 'top' };
            }
          }
        }
      }

      // Set column widths for standards section (columns A, B)
      // Column A: Standard Description  
      // Column B: Preceptor Attestations
      studentSheet.columns[0].width = 60; // Standard Description
      studentSheet.columns[1].width = 20; // Preceptor Attestations
    });
  }

  // 4. Aggregate Standard Scores Sheet - Top-level standard scores if they exist
  const aggregateScoresData: any[] = [];
  
  if (Array.isArray(finalData.standard_scores)) {
    finalData.standard_scores.forEach((score: any) => {
      const standardId = score.id || 'N/A';
      const standardDescription = standardsMap.get(standardId) || standardId;
      
      aggregateScoresData.push({
        'Report ID': reportId,
        'Standard ID': standardId,
        'Standard Description': standardDescription,
        'Score': score.score || 0,
      });
    });
  }

  if (aggregateScoresData.length > 0) {
    const aggregateSheet = workbook.addWorksheet('Aggregate Standards');
    
    if (logoData) {
      addLogoHeader(workbook, aggregateSheet, logoData);
    }

    const headerRow = aggregateSheet.addRow(Object.keys(aggregateScoresData[0]));
    styleHeaderRow(headerRow);

    aggregateScoresData.forEach((row) => {
      aggregateSheet.addRow(Object.values(row));
    });

    aggregateSheet.columns[0].width = 12; // Report ID
    aggregateSheet.columns[1].width = 20; // Standard ID
    aggregateSheet.columns[2].width = 60; // Standard Description
    aggregateSheet.columns[3].width = 12; // Score
    
    // Enable text wrapping for standard description column (column 3 = Standard Description, 1-indexed)
    aggregateSheet.getColumn(3).alignment = { wrapText: true, vertical: 'top' };
    
    // Apply wrapping to all data rows in the description column
    for (let i = 2; i <= aggregateSheet.rowCount; i++) {
      const row = aggregateSheet.getRow(i);
      const descCell = row.getCell(3); // Standard Description column
      if (descCell) {
        descCell.alignment = { wrapText: true, vertical: 'top' };
      }
    }
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `COA_Reports_${timestamp}.xlsx`;

  // Write the file (compatible with Google Sheets)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Export site reports to Excel
 */
export async function exportSiteReportsToExcel(documents: FirestoreDocument[]) {
  if (documents.length === 0) {
    alert('No site reports available to export. Please generate some reports first.');
    return;
  }

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PrecepGo';
  workbook.created = new Date();

  // Load logo
  const logoData = await loadLogoAsBase64();

  // Sort documents by created_at (newest first) and use the latest one
  const sortedDocs = [...documents].sort((a, b) => {
    const dateA = (a.data.created_at?.toDate ? a.data.created_at.toDate() : null) || 
                   (a.createdAt ? new Date(a.createdAt) : new Date(0));
    const dateB = (b.data.created_at?.toDate ? b.data.created_at.toDate() : null) || 
                   (b.createdAt ? new Date(b.createdAt) : new Date(0));
    return dateB.getTime() - dateA.getTime();
  });

  const latestDoc = sortedDocs[0];
  const data = latestDoc.data;

  console.log('[Export] ========== Site Report Export Debug ==========');
  console.log('[Export] Report ID:', latestDoc.id);
  console.log('[Export] Report data:', data);
  
  // Access nested analysis_data if it exists, otherwise use root level
  const analysisData = data.analysis_data || data;
  const sites = analysisData.sites || data.sites || [];
  const preceptors = analysisData.preceptors || data.preceptors || [];
  
  console.log('[Export] Has sites array:', !!sites, 'Length:', sites?.length);
  console.log('[Export] Has preceptors array:', !!preceptors, 'Length:', preceptors?.length);
  console.log('[Export] Analysis data:', analysisData);

  // Create summary sheet
  const summarySheet = workbook.addWorksheet('Summary');
  const reportTitle = data.report_title || data.title || 'Site Report';
  if (logoData) {
    addLogoHeader(workbook, summarySheet, logoData, reportTitle);
  } else {
    summarySheet.getCell('A1').value = `PrecepGo - ${reportTitle}`;
    summarySheet.getCell('A1').font = { size: 18, bold: true };
    summarySheet.addRow([]);
  }

  // Helper function to format Firestore dates
  const formatFirestoreDate = (dateField: any): string => {
    if (!dateField) return 'N/A';
    try {
      if (dateField?.toDate) {
        return dateField.toDate().toLocaleString();
      }
      if (dateField instanceof Date) {
        return dateField.toLocaleString();
      }
      if (typeof dateField === 'string') {
        return new Date(dateField).toLocaleString();
      }
      return String(dateField);
    } catch (e) {
      return 'N/A';
    }
  };

  // Add summary data with all available fields
  const summaryData = [{
    'Report ID': latestDoc.id.substring(0, 8),
    'Created Date': formatFirestoreDate(latestDoc.data.created_at || latestDoc.createdAt),
    'Generated Date': formatFirestoreDate(data.generated_at || analysisData.generated_at),
    'Analyzed Date': formatFirestoreDate(analysisData.analyzed_at || data.analyzed_at),
    'Report Version': data.report_version || 'N/A',
    'Total Sites': analysisData.total_sites || data.total_sites || 0,
    'Total Preceptors': analysisData.total_preceptors || data.total_preceptors || 0,
    'Total Evaluations': analysisData.total_evaluations || data.total_evaluations || 0,
    'Total Evaluations Analyzed': data.total_evaluations_analyzed || analysisData.total_evaluations || 0,
    'Agent': data.agent || 'N/A',
  }];

  const headerRow = summarySheet.addRow(Object.keys(summaryData[0]));
  styleHeaderRow(headerRow);

  summaryData.forEach((row) => {
    summarySheet.addRow(Object.values(row));
  });

  summarySheet.columns.forEach((column) => {
    column.width = 25;
  });

  // Add Report Text section if it exists
  if (data.report_text) {
    summarySheet.addRow([]); // Spacer row
    const reportTextHeaderRow = summarySheet.addRow(['Report Text']);
    reportTextHeaderRow.getCell(1).font = { bold: true, size: 12 };
    reportTextHeaderRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
    
    const reportTextRow = summarySheet.addRow([data.report_text]);
    const reportTextCell = reportTextRow.getCell(1);
    reportTextCell.alignment = { wrapText: true, vertical: 'top', horizontal: 'left' };
    reportTextCell.font = { size: 10 };
    
    // Merge cells for report text to span all columns
    summarySheet.mergeCells(summarySheet.rowCount, 1, summarySheet.rowCount, summarySheet.columnCount);
    
    // Set row height based on text length (estimate)
    const estimatedHeight = Math.max(60, Math.ceil(data.report_text.length / 100) * 15);
    summarySheet.getRow(summarySheet.rowCount).height = estimatedHeight;
  }

  // Create sites sheet - ALWAYS create it
  const sitesSheet = workbook.addWorksheet('Sites');
  if (logoData) {
    addLogoHeader(workbook, sitesSheet, logoData, reportTitle);
  }

  // Add headers with all possible fields
  const sitesHeaders = ['Site Name', 'Total Evaluations', 'Unique Preceptors', 'Case Types', 'Preceptor Names'];
  const sitesHeaderRow = sitesSheet.addRow(sitesHeaders);
  styleHeaderRow(sitesHeaderRow);

  // Add site data
  if (sites && Array.isArray(sites) && sites.length > 0) {
    sites.forEach((site: any) => {
      const caseTypes = Array.isArray(site.case_types) ? site.case_types.join(', ') : (site.case_types || 'N/A');
      const preceptorNames = Array.isArray(site.preceptor_names) 
        ? site.preceptor_names.join(', ') 
        : (Array.isArray(site.preceptors) ? site.preceptors.join(', ') : (site.preceptors || 'N/A'));
      sitesSheet.addRow([
        site.name || site.site_name || 'N/A',
        site.total_evaluations || site.evaluations_count || 0,
        site.unique_preceptors || 0,
        caseTypes,
        preceptorNames
      ]);
    });
  } else {
    // Add a row indicating no sites
    sitesSheet.addRow(['No sites data available', '', '', '', '']);
  }

  sitesSheet.columns.forEach((column) => {
    column.width = 25;
  });

  // Create preceptors sheet - ALWAYS create it
  const preceptorsSheet = workbook.addWorksheet('Preceptors');
  if (logoData) {
    addLogoHeader(workbook, preceptorsSheet, logoData, reportTitle);
  }

  // Add headers with all possible fields
  const preceptorsHeaders = ['Preceptor Name', 'Site', 'Student Count', 'Total Evaluations', 'Case Types'];
  const preceptorsHeaderRow = preceptorsSheet.addRow(preceptorsHeaders);
  styleHeaderRow(preceptorsHeaderRow);

  // Add preceptor data
  if (preceptors && Array.isArray(preceptors) && preceptors.length > 0) {
    preceptors.forEach((preceptor: any) => {
      const caseTypes = Array.isArray(preceptor.case_types) ? preceptor.case_types.join(', ') : (preceptor.case_types || 'N/A');
      preceptorsSheet.addRow([
        preceptor.name || preceptor.preceptor_name || 'N/A',
        preceptor.site || preceptor.site_name || 'N/A',
        preceptor.student_count || 0,
        preceptor.total_evaluations || preceptor.evaluations_count || 0,
        caseTypes
      ]);
    });
  } else {
    // Add a row indicating no preceptors
    preceptorsSheet.addRow(['No preceptors data available', '', '', '', '']);
  }

  preceptorsSheet.columns.forEach((column) => {
    column.width = 25;
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `Site_Report_${timestamp}.xlsx`;

  // Write the file (compatible with Google Sheets)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Export any collection to Excel (generic function)
 */
export async function exportToExcel(documents: FirestoreDocument[], collectionName: string) {
  if (documents.length === 0) {
    alert(`No ${collectionName} documents to export`);
    return;
  }

  // Create a new workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PrecepGo';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(collectionName.replace('agent_', ''));

  // Load logo
  const logoData = await loadLogoAsBase64();
  if (logoData) {
    addLogoHeader(workbook, worksheet, logoData);
  } else {
    // Add title without logo
    worksheet.getCell('A1').value = `PrecepGo - ${collectionName.replace('agent_', '').replace(/_/g, ' ').toUpperCase()}`;
    worksheet.getCell('A1').font = { size: 18, bold: true };
    worksheet.addRow([]);
  }

  // Flatten the data for Excel export
  const exportData = documents.map((doc) => {
    const row: any = {
      'ID': doc.id,
      'Created Date': doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'N/A',
    };

    // Flatten nested objects
    Object.keys(doc.data).forEach((key) => {
      const value = doc.data[key];
      if (value === null || value === undefined) {
        row[key] = 'N/A';
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Convert nested objects to JSON strings
        row[key] = JSON.stringify(value);
      } else if (Array.isArray(value)) {
        // Convert arrays to comma-separated values or JSON
        row[key] = value.length > 0 ? JSON.stringify(value) : '[]';
      } else {
        row[key] = value;
      }
    });

    return row;
  });

  // Add headers
  const headerRow = worksheet.addRow(Object.keys(exportData[0]));
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF83A0CC' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows
  exportData.forEach((row) => {
    worksheet.addRow(Object.values(row));
  });

  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    column.width = 20;
  });

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filename = `${collectionName}_${timestamp}.xlsx`;

  // Write the file (compatible with Google Sheets)
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

