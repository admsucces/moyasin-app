import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { 
  pdfStyles, 
  PdfHeader, 
  PdfFooter, 
  PdfPageNumber,
  formatPdfISAKAmount 
} from './PdfCommon';

const tbStyles = StyleSheet.create({
  pageLandscape: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingHorizontal: 36,
    fontSize: 8,
    fontFamily: 'Helvetica',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  thTop: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#1e293b',
    paddingVertical: 3,
  },
  thSub: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#475569',
    paddingVertical: 2,
  },
  cellText: {
    fontSize: 7.5,
    color: '#334155',
  },
  cellNum: {
    fontSize: 7.5,
    fontFamily: 'Helvetica',
    textAlign: 'right',
    color: '#0f172a',
  },
  cellNumBold: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#0f172a',
  },
});

export const TrialBalancePdf = ({ tbData, periodLabel }) => {
  const accounts = tbData?.accounts || [];
  const summary = tbData?.summary || {};

  const displayPeriod = periodLabel || (tbData?.period ? tbData.period.name : 'Semua Periode');

  return (
    <Document title={`Neraca Saldo - ${displayPeriod}`}>
      <Page size="A4" orientation="landscape" style={tbStyles.pageLandscape}>
        <PdfHeader 
          title="NERACA SALDO (TRIAL BALANCE)" 
          periodLabel={displayPeriod}
        />

        <View style={pdfStyles.table}>
          {/* Main Table Header Row 1 */}
          <View style={[pdfStyles.tableHeader, { backgroundColor: '#f1f5f9', borderBottomWidth: 0.5, borderBottomColor: '#cbd5e1' }]}>
            <Text style={[{ width: '10%' }, tbStyles.thTop]}>Kode Akun</Text>
            <Text style={[{ width: '24%' }, tbStyles.thTop]}>Nama Akun Ledger</Text>
            <Text style={[{ width: '8%', textAlign: 'center' }, tbStyles.thTop]}>Tipe</Text>
            <Text style={[{ width: '19%', textAlign: 'center', borderLeftWidth: 0.5, borderLeftColor: '#cbd5e1' }, tbStyles.thTop]}>Saldo Awal</Text>
            <Text style={[{ width: '19%', textAlign: 'center', borderLeftWidth: 0.5, borderLeftColor: '#cbd5e1' }, tbStyles.thTop]}>Mutasi Periode</Text>
            <Text style={[{ width: '20%', textAlign: 'center', borderLeftWidth: 0.5, borderLeftColor: '#cbd5e1' }, tbStyles.thTop]}>Saldo Akhir</Text>
          </View>

          {/* Table Header Row 2 (Debet / Kredit columns) */}
          <View style={[pdfStyles.tableHeader, { backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#94a3b8' }]}>
            <Text style={{ width: '10%' }}></Text>
            <Text style={{ width: '24%' }}></Text>
            <Text style={{ width: '8%' }}></Text>
            
            {/* Saldo Awal */}
            <Text style={[{ width: '9.5%', textAlign: 'right', borderLeftWidth: 0.5, borderLeftColor: '#cbd5e1' }, tbStyles.thSub]}>Debet</Text>
            <Text style={[{ width: '9.5%', textAlign: 'right' }, tbStyles.thSub]}>Kredit</Text>

            {/* Mutasi Periode */}
            <Text style={[{ width: '9.5%', textAlign: 'right', borderLeftWidth: 0.5, borderLeftColor: '#cbd5e1' }, tbStyles.thSub]}>Debet</Text>
            <Text style={[{ width: '9.5%', textAlign: 'right' }, tbStyles.thSub]}>Kredit</Text>

            {/* Saldo Akhir */}
            <Text style={[{ width: '10%', textAlign: 'right', borderLeftWidth: 0.5, borderLeftColor: '#cbd5e1' }, tbStyles.thSub]}>Debet</Text>
            <Text style={[{ width: '10%', textAlign: 'right' }, tbStyles.thSub]}>Kredit</Text>
          </View>

          {/* Account Rows */}
          {accounts.map((row, idx) => (
            <View 
              key={row.account_id || idx} 
              style={[
                pdfStyles.tableRow, 
                { backgroundColor: idx % 2 === 1 ? '#fcfcfd' : '#ffffff' }
              ]} 
              wrap={false}
            >
              <Text style={[{ width: '10%', fontFamily: 'Helvetica-Bold' }, tbStyles.cellText]}>
                {row.account_code}
              </Text>
              <Text style={[{ width: '24%' }, tbStyles.cellText]}>
                {row.account_name}
              </Text>
              <Text style={[{ width: '8%', textAlign: 'center', fontSize: 6.5, color: '#64748b' }]}>
                {row.account_type}
              </Text>

              {/* Saldo Awal */}
              <Text style={[{ width: '9.5%', borderLeftWidth: 0.5, borderLeftColor: '#f1f5f9' }, tbStyles.cellNum]}>
                {formatPdfISAKAmount(row.opening_debit)}
              </Text>
              <Text style={[{ width: '9.5%' }, tbStyles.cellNum]}>
                {formatPdfISAKAmount(row.opening_credit)}
              </Text>

              {/* Mutasi Periode */}
              <Text style={[{ width: '9.5%', borderLeftWidth: 0.5, borderLeftColor: '#f1f5f9' }, tbStyles.cellNum]}>
                {formatPdfISAKAmount(row.period_debit)}
              </Text>
              <Text style={[{ width: '9.5%' }, tbStyles.cellNum]}>
                {formatPdfISAKAmount(row.period_credit)}
              </Text>

              {/* Saldo Akhir */}
              <Text style={[{ width: '10%', borderLeftWidth: 0.5, borderLeftColor: '#f1f5f9' }, tbStyles.cellNumBold]}>
                {formatPdfISAKAmount(row.ending_debit)}
              </Text>
              <Text style={[{ width: '10%' }, tbStyles.cellNumBold]}>
                {formatPdfISAKAmount(row.ending_credit)}
              </Text>
            </View>
          ))}

          {/* Grand Total Row */}
          <View style={pdfStyles.totalRow} wrap={false}>
            <Text style={[{ width: '42%' }, tbStyles.cellNumBold, { textAlign: 'left' }]}>
              GRAND TOTAL BALANCE
            </Text>
            <Text style={[{ width: '9.5%' }, tbStyles.cellNumBold]}>
              {formatPdfISAKAmount(summary.total_opening_debit)}
            </Text>
            <Text style={[{ width: '9.5%' }, tbStyles.cellNumBold]}>
              {formatPdfISAKAmount(summary.total_opening_credit)}
            </Text>
            <Text style={[{ width: '9.5%' }, tbStyles.cellNumBold]}>
              {formatPdfISAKAmount(summary.total_period_debit)}
            </Text>
            <Text style={[{ width: '9.5%' }, tbStyles.cellNumBold]}>
              {formatPdfISAKAmount(summary.total_period_credit)}
            </Text>
            <Text style={[{ width: '10%' }, tbStyles.cellNumBold]}>
              {formatPdfISAKAmount(summary.total_ending_debit)}
            </Text>
            <Text style={[{ width: '10%' }, tbStyles.cellNumBold]}>
              {formatPdfISAKAmount(summary.total_ending_credit)}
            </Text>
          </View>
        </View>

        {/* Footer Signatures */}
        <PdfFooter />

        {/* Page Numbering */}
        <PdfPageNumber reportName="Neraca Saldo (Trial Balance)" />
      </Page>
    </Document>
  );
};

export default TrialBalancePdf;

