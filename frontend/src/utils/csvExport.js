/**
 * Utility for exporting data to CSV with UTF-8 BOM encoding.
 * Ensures proper display of Indonesian accents, special characters, and numbers in Microsoft Excel.
 */

export const exportToCsv = (filename, headers, rows) => {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes(';') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  downloadCsvBlob(filename, csvContent);
};

export const exportRawCsv = (filename, csvContent) => {
  const content = csvContent.startsWith('\uFEFF') ? csvContent : '\uFEFF' + csvContent;
  downloadCsvBlob(filename, content);
};

const downloadCsvBlob = (filename, content) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', safeFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export default {
  exportToCsv,
  exportRawCsv,
};

