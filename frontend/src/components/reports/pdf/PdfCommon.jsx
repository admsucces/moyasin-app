import React from 'react';
import { StyleSheet, View, Text, pdf } from '@react-pdf/renderer';
import { getStoredSettings, setMemorySettings } from '../../../context/SettingContext';
import settingService from '../../../services/settingService';

export const formatPdfCurrency = (val) => {
  const num = Number(val) || 0;
  const absVal = Math.abs(num);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);
  if (num < 0) {
    return `(${formatted})`;
  }
  return formatted;
};

export const formatPdfISAKAmount = (val) => {
  if (val === null || val === undefined || Math.abs(Number(val)) < 0.005) {
    return ' - ';
  }
  const num = Number(val);
  const absVal = Math.abs(num);
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(absVal);

  if (num < 0) {
    return `(${formatted})`;
  }
  return formatted;
};

export const formatPdfPercentage = (val) => {
  if (val === null || val === undefined) return '0.00%';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
};

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
  },
  kopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  institutionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#0f172a',
  },
  institutionSubtitle: {
    fontSize: 8,
    color: '#475569',
    marginTop: 2,
  },
  badgeDoc: {
    borderWidth: 1,
    borderColor: '#0f172a',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  printDate: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 2,
  },
  reportTitleBlock: {
    textAlign: 'center',
    paddingTop: 4,
  },
  reportTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  reportSubtitle: {
    fontSize: 8,
    color: '#334155',
    textAlign: 'center',
    marginTop: 2,
  },
  reportPeriod: {
    fontSize: 8,
    fontFamily: 'Helvetica-Oblique',
    color: '#475569',
    textAlign: 'center',
    marginTop: 2,
  },
  currencyNotice: {
    fontSize: 7,
    fontFamily: 'Helvetica-Oblique',
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#94a3b8',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#0f172a',
  },
  subtotalRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1.5,
    borderTopColor: '#0f172a',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
  },
  footerSignatures: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: '#cbd5e1',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  signatureCol: {
    width: '35%',
    textAlign: 'center',
    alignItems: 'center',
  },
  signatureTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#334155',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 44,
  },
  signatureName: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    borderBottomWidth: 0.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 2,
    textAlign: 'center',
  },
  signatureRole: {
    fontSize: 7,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 2,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 7,
    color: '#94a3b8',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export const getPdfBrandTitle = () => {
  const s = getStoredSettings();
  const appName = (s.app_name || 'Curadoc').trim();
  const appBadge = (s.app_badge ?? '').trim();
  return [appName, appBadge].filter(Boolean).join(' ');
};

export const PdfPageNumber = ({ reportName }) => {
  const brandTitle = getPdfBrandTitle();
  return (
    <View style={pdfStyles.pageNumber} fixed>
      <Text render={() => `${getPdfBrandTitle() || brandTitle} • ${reportName}`} />
      <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
    </View>
  );
};

export const PdfHeader = ({ title, periodLabel }) => {
  const s = getStoredSettings();
  const orgFullName = s.organization_full_name || s.organization_name || 'YAYASAN ISAK 35 INDONESIA';

  return (
    <View style={pdfStyles.headerContainer} fixed>
      <View style={pdfStyles.reportTitleBlock}>
        <Text style={[pdfStyles.institutionTitle, { textAlign: 'center', marginBottom: 3 }]}>
          {orgFullName}
        </Text>
        <Text style={pdfStyles.reportTitle}>{title}</Text>
        {periodLabel && <Text style={pdfStyles.reportPeriod}>{periodLabel}</Text>}
      </View>
    </View>
  );
};

export const PdfFooter = () => {
  const s = getStoredSettings();
  return (
    <View style={pdfStyles.footerSignatures} wrap={false}>
      <View style={pdfStyles.signatureRow}>
        <View style={pdfStyles.signatureCol}>
          <Text style={pdfStyles.signatureTitle}>Dibuat Oleh (Penyusun)</Text>
          <Text style={pdfStyles.signatureName}>{s.report_preparer_name || 'Staf Akuntansi & Keuangan'}</Text>
          <Text style={pdfStyles.signatureRole}>{s.report_preparer_role || 'Bagian Keuangan Yayasan'}</Text>
        </View>

        <View style={pdfStyles.signatureCol}>
          <Text style={pdfStyles.signatureTitle}>Disetujui Oleh</Text>
          <Text style={pdfStyles.signatureName}>{s.report_approver_name || 'Ketua Pengurus Yayasan'}</Text>
          <Text style={pdfStyles.signatureRole}>{s.report_approver_role || 'Pimpinan Lembaga'}</Text>
        </View>
      </View>
    </View>
  );
};

export const downloadPdf = async (documentComponent, filename) => {
  try {
    const res = await settingService.getSettings();
    if (res?.success && res.data) {
      setMemorySettings(res.data);
    }
  } catch (e) {
    // Fallback to stored settings if offline
  }

  const blob = await pdf(documentComponent).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);
};

