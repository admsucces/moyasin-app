import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { 
  pdfStyles, 
  PdfHeader, 
  PdfFooter, 
  PdfPageNumber,
  formatPdfCurrency 
} from './PdfCommon';

export const ManagementReportPdf = ({ data, startDate, endDate }) => {
  const periodLabel = `${startDate} s/d ${endDate}`;
  const fund = data.fund_restriction_breakdown || { without_restriction: 0, with_restriction: 0, total: 0 };
  const expProg = data.expense_by_program || { items: [], total: 0 };
  const incDonor = data.income_by_donor || { items: [], total: 0 };

  const formatPct = (amount, total) => {
    if (!total || total === 0) return '0.0%';
    return ((amount / total) * 100).toFixed(1) + '%';
  };

  return (
    <Document title={`Laporan Manajerial - ${periodLabel}`}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader 
          title="LAPORAN MANAJERIAL & OPERASIONAL" 
          subtitle="Analisis Realisasi Beban Program, Kontribusi Donatur, dan Pembatasan Dana"
          periodLabel={periodLabel}
        />

        {/* 1. REKAPITULASI PEMBATASAN DANA */}
        <View style={{ marginBottom: 12 }}>
          <View style={pdfStyles.sectionHeaderRow}>
            <Text style={{ width: '100%' }}>1. REKAPITULASI PEMBATASAN DANA DONOR</Text>
          </View>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '60%' }}>Klasifikasi Sumber Dana</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>Jumlah Penerimaan</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>Porsi (%)</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '60%', color: '#334155' }}>Dana Tanpa Pembatasan (Unrestricted)</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>{formatPdfCurrency(fund.without_restriction)}</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>{formatPct(fund.without_restriction, fund.total)}</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '60%', color: '#334155' }}>Dana Dengan Pembatasan (Restricted)</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>{formatPdfCurrency(fund.with_restriction)}</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>{formatPct(fund.with_restriction, fund.total)}</Text>
            </View>
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '60%' }}>TOTAL PENERIMAAN DANA</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>{formatPdfCurrency(fund.total)}</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>100.0%</Text>
            </View>
          </View>
        </View>

        {/* 2. REALISASI BEBAN PER PROGRAM */}
        <View style={{ marginBottom: 12 }}>
          <View style={pdfStyles.sectionHeaderRow}>
            <Text style={{ width: '100%' }}>2. REALISASI BEBAN PENGELUARAN PER PROGRAM</Text>
          </View>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '8%', textAlign: 'center' }}>No</Text>
              <Text style={{ width: '52%' }}>Program Kerja</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>Realisasi (Rp)</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>Porsi (%)</Text>
            </View>
            {expProg.items.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                  Belum ada transaksi beban program pada periode ini
                </Text>
              </View>
            ) : (
              expProg.items.map((item, idx) => (
                <View key={idx} style={pdfStyles.tableRow}>
                  <Text style={{ width: '8%', textAlign: 'center', color: '#64748b' }}>{idx + 1}</Text>
                  <Text style={{ width: '52%', color: '#334155' }}>{item.name}</Text>
                  <Text style={{ width: '25%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.amount)}
                  </Text>
                  <Text style={{ width: '15%', textAlign: 'right', color: '#64748b' }}>
                    {formatPct(item.amount, expProg.total)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '60%' }}>TOTAL BEBAN PROGRAM</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>{formatPdfCurrency(expProg.total)}</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>100.0%</Text>
            </View>
          </View>
        </View>

        {/* 3. KONTRIBUSI PENERIMAAN PER DONATUR */}
        <View style={{ marginBottom: 12 }}>
          <View style={pdfStyles.sectionHeaderRow}>
            <Text style={{ width: '100%' }}>3. KONTRIBUSI PENERIMAAN PER DONATUR / SUMBER</Text>
          </View>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '8%', textAlign: 'center' }}>No</Text>
              <Text style={{ width: '52%' }}>Nama Donatur / Sumber</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>Kontribusi (Rp)</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>Porsi (%)</Text>
            </View>
            {incDonor.items.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                  Belum ada transaksi penerimaan donatur pada periode ini
                </Text>
              </View>
            ) : (
              incDonor.items.map((item, idx) => (
                <View key={idx} style={pdfStyles.tableRow}>
                  <Text style={{ width: '8%', textAlign: 'center', color: '#64748b' }}>{idx + 1}</Text>
                  <Text style={{ width: '52%', color: '#334155' }}>{item.name} [{item.category}]</Text>
                  <Text style={{ width: '25%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.amount)}
                  </Text>
                  <Text style={{ width: '15%', textAlign: 'right', color: '#64748b' }}>
                    {formatPct(item.amount, incDonor.total)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '60%' }}>TOTAL KONTRIBUSI DONATUR</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>{formatPdfCurrency(incDonor.total)}</Text>
              <Text style={{ width: '15%', textAlign: 'right' }}>100.0%</Text>
            </View>
          </View>
        </View>

        <PdfFooter />

        <PdfPageNumber reportName="Laporan Manajerial & Operasional" />
      </Page>
    </Document>
  );
};

export default ManagementReportPdf;

