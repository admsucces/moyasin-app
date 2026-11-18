import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { 
  pdfStyles, 
  PdfHeader, 
  PdfFooter, 
  PdfPageNumber,
  formatPdfCurrency,
  formatPdfPercentage 
} from './PdfCommon';

export const CashFlowPdf = ({ data, compareMode }) => {
  const isComp = Boolean(
    (data?.is_comparative || (compareMode && compareMode !== 'NONE') || (data?.filter?.compare_mode && data?.filter?.compare_mode !== 'NONE')) &&
    data?.comparative_data
  );
  const periodLabel = isComp 
    ? `${data.current_period?.label || ''} vs ${data.comparison_period?.label || ''}`
    : (data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`);

  const currentLabel = data.current_period?.label || 'Periode Berjalan';
  const comparisonLabel = data.comparison_period?.label || 'Periode Pembanding';

  const op = data.operating_activities || { cash_receipts: 0, cash_disbursements: 0, net_cash: 0 };
  const inv = data.investing_activities || { cash_receipts: 0, cash_disbursements: 0, net_cash: 0 };
  const fin = data.financing_activities || { cash_receipts: 0, cash_disbursements: 0, net_cash: 0 };

  const compData = data.comparative_data;

  const renderCompRow = (title, itemObj, isSubtotal = false, isDisbursement = false) => {
    const varianceVal = itemObj?.variance ?? itemObj?.diff ?? 0;
    return (
      <View style={{
        ...pdfStyles.tableRow,
        backgroundColor: isSubtotal ? '#f8fafc' : '#ffffff',
        borderTopWidth: isSubtotal ? 1 : 0,
        borderBottomWidth: isSubtotal ? 1 : 0.5,
        borderColor: isSubtotal ? '#cbd5e1' : '#e2e8f0',
      }}>
        <Text style={{ 
          width: '36%', 
          fontFamily: isSubtotal ? 'Helvetica-Bold' : 'Helvetica', 
          paddingLeft: isSubtotal ? 8 : 12, 
          color: '#0f172a' 
        }}>
          {title}
        </Text>
        <Text style={{ width: '17%', textAlign: 'right', fontFamily: isSubtotal ? 'Helvetica-Bold' : 'Helvetica' }}>
          {isDisbursement && Number(itemObj?.current) > 0 ? `(${formatPdfCurrency(itemObj?.current)})` : formatPdfCurrency(itemObj?.current)}
        </Text>
        <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
          {isDisbursement && Number(itemObj?.comparison) > 0 ? `(${formatPdfCurrency(itemObj?.comparison)})` : formatPdfCurrency(itemObj?.comparison)}
        </Text>
        <Text style={{ width: '16%', textAlign: 'right', fontFamily: isSubtotal ? 'Helvetica-Bold' : 'Helvetica' }}>
          {formatPdfCurrency(varianceVal)}
        </Text>
        <Text style={{ width: '14%', textAlign: 'right', color: varianceVal >= 0 ? '#047857' : '#b91c1c' }}>
          {formatPdfPercentage(itemObj?.percentage)}
        </Text>
      </View>
    );
  };

  return (
    <Document title={`Laporan Arus Kas - ${periodLabel}`}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader 
          title={isComp ? "LAPORAN ARUS KAS KOMPARATIF" : "LAPORAN ARUS KAS"} 
          subtitle="Arus Kas Aktivitas Operasi, Investasi, dan Pendanaan (ISAK 35)"
          periodLabel={periodLabel}
        />

        {isComp ? (
          /* ========================================================
             VIEW KOMPARATIF ARUS KAS
             ======================================================== */
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '36%' }}>KOMPONEN ARUS KAS</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{currentLabel}</Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{comparisonLabel}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>SELISIH (RP)</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>PERTUMBUHAN</Text>
            </View>

            {/* Saldo Awal */}
            {renderCompRow('SALDO KAS & BANK AWAL PERIODE', compData?.beginning_cash, true)}

            {/* 1. AKTIVITAS OPERASI */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. ARUS KAS DARI AKTIVITAS OPERASI</Text>
            </View>
            {renderCompRow('Penerimaan Kas Operasional & Donasi', compData?.operating_activities?.cash_receipts)}
            {renderCompRow('Pengeluaran Kas Beban Program & Operasional', compData?.operating_activities?.cash_disbursements, false, true)}
            {renderCompRow('Kas Bersih Dari Aktivitas Operasi', compData?.operating_activities?.net_cash, true)}

            {/* 2. AKTIVITAS INVESTASI */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>2. ARUS KAS DARI AKTIVITAS INVESTASI</Text>
            </View>
            {renderCompRow('Penerimaan Hasil Penjualan Aset Tetap', compData?.investing_activities?.cash_receipts)}
            {renderCompRow('Pengeluaran Kas Pembelian Aset Tetap', compData?.investing_activities?.cash_disbursements, false, true)}
            {renderCompRow('Kas Bersih Dari Aktivitas Investasi', compData?.investing_activities?.net_cash, true)}

            {/* 3. AKTIVITAS PENDANAAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>3. ARUS KAS DARI AKTIVITAS PENDANAAN</Text>
            </View>
            {renderCompRow('Penerimaan Pinjaman / Dana Terikat Persisten', compData?.financing_activities?.cash_receipts)}
            {renderCompRow('Pembayaran Pinjaman / Kewajiban Pendanaan', compData?.financing_activities?.cash_disbursements, false, true)}
            {renderCompRow('Kas Bersih Dari Aktivitas Pendanaan', compData?.financing_activities?.net_cash, true)}

            {/* KENAIKAN BERSIH */}
            {renderCompRow('KENAIKAN / (PENURUNAN) BERSIH KAS & BANK', compData?.net_cash_increase_decrease, true)}

            {/* SALDO AKHIR */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '36%' }}>SALDO KAS & BANK AKHIR PERIODE</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.ending_cash?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.ending_cash?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.ending_cash?.variance ?? compData?.ending_cash?.diff)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.ending_cash?.percentage)}
              </Text>
            </View>
          </View>
        ) : (
          /* ========================================================
             VIEW STANDAR ARUS KAS TUNGGAL
             ======================================================== */
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '75%' }}>Komponen Arus Kas</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>Jumlah (Rp)</Text>
            </View>

            {/* Saldo Awal */}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '75%', textTransform: 'uppercase' }}>SALDO KAS & BANK AWAL PERIODE</Text>
              <Text style={{ width: '25%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(data.beginning_cash)}
              </Text>
            </View>

            {/* 1. AKTIVITAS OPERASI */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. ARUS KAS DARI AKTIVITAS OPERASI</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '75%', paddingLeft: 10, color: '#334155' }}>
                Penerimaan Kas Operasional & Donasi
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(op.cash_receipts)}
              </Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '75%', paddingLeft: 10, color: '#334155' }}>
                Pengeluaran Kas Beban Program & Operasional
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {Number(op.cash_disbursements) > 0 ? `(${formatPdfCurrency(op.cash_disbursements)})` : formatPdfCurrency(op.cash_disbursements)}
              </Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '75%', paddingLeft: 10 }}>
                Kas Bersih Diperoleh Dari (Digunakan Untuk) Aktivitas Operasi
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(op.net_cash)}
              </Text>
            </View>

            {/* 2. AKTIVITAS INVESTASI */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>2. ARUS KAS DARI AKTIVITAS INVESTASI</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '75%', paddingLeft: 10, color: '#334155' }}>
                Penerimaan Hasil Penjualan Aset Tetap
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(inv.cash_receipts)}
              </Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '75%', paddingLeft: 10, color: '#334155' }}>
                Pengeluaran Kas Pembelian Aset Tetap
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {Number(inv.cash_disbursements) > 0 ? `(${formatPdfCurrency(inv.cash_disbursements)})` : formatPdfCurrency(inv.cash_disbursements)}
              </Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '75%', paddingLeft: 10 }}>
                Kas Bersih Diperoleh Dari (Digunakan Untuk) Aktivitas Investasi
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(inv.net_cash)}
              </Text>
            </View>

            {/* 3. AKTIVITAS PENDANAAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>3. ARUS KAS DARI AKTIVITAS PENDANAAN</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '75%', paddingLeft: 10, color: '#334155' }}>
                Penerimaan Pinjaman / Dana Terikat Persisten
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(fin.cash_receipts)}
              </Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '75%', paddingLeft: 10, color: '#334155' }}>
                Pembayaran Pinjaman / Kewajiban Pendanaan
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {Number(fin.cash_disbursements) > 0 ? `(${formatPdfCurrency(fin.cash_disbursements)})` : formatPdfCurrency(fin.cash_disbursements)}
              </Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '75%', paddingLeft: 10 }}>
                Kas Bersih Diperoleh Dari (Digunakan Untuk) Aktivitas Pendanaan
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(fin.net_cash)}
              </Text>
            </View>

            {/* KENAIKAN / PENURUNAN BERSIH */}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '75%', textTransform: 'uppercase' }}>
                KENAIKAN / (PENURUNAN) BERSIH KAS & BANK
              </Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(data.net_cash_increase_decrease)}
              </Text>
            </View>

            {/* SALDO AKHIR KAS */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '75%' }}>SALDO KAS & BANK AKHIR PERIODE</Text>
              <Text style={{ width: '25%', textAlign: 'right' }}>
                {formatPdfCurrency(data.ending_cash)}
              </Text>
            </View>
          </View>
        )}

        <PdfFooter />

        <PdfPageNumber reportName="Laporan Arus Kas" />
      </Page>
    </Document>
  );
};

export default CashFlowPdf;
