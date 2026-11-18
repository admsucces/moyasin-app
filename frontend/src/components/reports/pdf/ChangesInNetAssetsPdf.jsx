import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { 
  pdfStyles, 
  PdfHeader, 
  PdfFooter, 
  PdfPageNumber,
  formatPdfISAKAmount,
  formatPdfPercentage 
} from './PdfCommon';

const localStyles = StyleSheet.create({
  sectionBox: {
    marginBottom: 20,
  },
  sectionHeader: {
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 3.5,
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    textTransform: 'uppercase',
    color: '#000000',
  },
  rowItem: {
    flexDirection: 'row',
    paddingVertical: 3,
    alignItems: 'center',
  },
  rowLabel: {
    width: '70%',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000000',
  },
  rowValue: {
    width: '30%',
    textAlign: 'right',
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#000000',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 3.5,
    paddingBottom: 2,
    alignItems: 'center',
  },
  totalLabel: {
    width: '70%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#000000',
  },
  totalValue: {
    width: '30%',
    textAlign: 'right',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#000000',
  },
  doubleUnderlineFirst: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    marginBottom: 1.5,
  },
  doubleUnderlineSecond: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
  },

  // Comparative styles
  compHeader: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderTopColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 3.5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#000000',
    marginBottom: 2,
  },
  compRow: {
    flexDirection: 'row',
    paddingVertical: 2.5,
    alignItems: 'center',
    fontSize: 8.5,
    color: '#000000',
  },
  compTotalRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 3,
    paddingBottom: 2,
    alignItems: 'center',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#000000',
  },
});

export const ChangesInNetAssetsPdf = ({ data, compareMode }) => {
  const isComp = Boolean(
    (data?.is_comparative || (compareMode && compareMode !== 'NONE') || (data?.filter?.compare_mode && data?.filter?.compare_mode !== 'NONE')) &&
    data?.comparative_data
  );
  const periodLabel = isComp 
    ? `${data.current_period?.label || ''} vs ${data.comparison_period?.label || ''}`
    : (data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`);

  const currentLabel = data.current_period?.label || 'Periode Berjalan';
  const comparisonLabel = data.comparison_period?.label || 'Periode Pembanding';

  const unrestricted = data.unrestricted || {
    beginning: data.beginning_net_assets?.unrestricted || 0,
    prior_period: 0,
    current_period: data.current_period_changes?.unrestricted_surplus || 0,
    released: 0,
    ending: data.ending_net_assets?.unrestricted || 0,
  };

  const restricted = data.restricted || {
    beginning: data.beginning_net_assets?.restricted || 0,
    prior_period: 0,
    current_period: data.current_period_changes?.restricted_surplus || 0,
    released: 0,
    ending: data.ending_net_assets?.restricted || 0,
  };

  const compData = data.comparative_data;

  const renderCompRow = (title, itemObj) => {
    const varianceVal = itemObj?.variance ?? itemObj?.diff ?? 0;
    return (
      <View style={localStyles.compRow}>
        <Text style={{ width: '36%', fontFamily: 'Helvetica' }}>
          {title}
        </Text>
        <Text style={{ width: '17%', textAlign: 'right' }}>
          {formatPdfISAKAmount(itemObj?.current)}
        </Text>
        <Text style={{ width: '17%', textAlign: 'right', color: '#475569' }}>
          {formatPdfISAKAmount(itemObj?.comparison)}
        </Text>
        <Text style={{ width: '16%', textAlign: 'right' }}>
          {formatPdfISAKAmount(varianceVal)}
        </Text>
        <Text style={{ width: '14%', textAlign: 'right', color: varianceVal >= 0 ? '#047857' : '#b91c1c' }}>
          {formatPdfPercentage(itemObj?.percentage)}
        </Text>
      </View>
    );
  };

  const renderCompTotal = (title, itemObj) => {
    const varianceVal = itemObj?.variance ?? itemObj?.diff ?? 0;
    return (
      <View>
        <View style={localStyles.compTotalRow}>
          <Text style={{ width: '36%', fontFamily: 'Helvetica-Bold' }}>
            {title}
          </Text>
          <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
            {formatPdfISAKAmount(itemObj?.current)}
          </Text>
          <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold', color: '#334155' }}>
            {formatPdfISAKAmount(itemObj?.comparison)}
          </Text>
          <Text style={{ width: '16%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
            {formatPdfISAKAmount(varianceVal)}
          </Text>
          <Text style={{ width: '14%', textAlign: 'right', fontFamily: 'Helvetica-Bold', color: varianceVal >= 0 ? '#047857' : '#b91c1c' }}>
            {formatPdfPercentage(itemObj?.percentage)}
          </Text>
        </View>
        <View style={localStyles.doubleUnderlineFirst} />
        <View style={localStyles.doubleUnderlineSecond} />
      </View>
    );
  };

  return (
    <Document title={`Laporan Perubahan Aset Neto - ${periodLabel}`}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader 
          title="LAPORAN PERUBAHAN ASET NETO" 
          subtitle="Rekonsiliasi Aset Neto Tanpa & Dengan Pembatasan (ISAK 35)"
          periodLabel={periodLabel}
        />

        {isComp ? (
          /* ========================================================
             VIEW KOMPARATIF PERUBAHAN ASET NETO
             ======================================================== */
          <View style={{ marginVertical: 10 }}>
            {/* 1. TANPA PEMBATASAN KOMPARATIF */}
            <View style={localStyles.sectionBox}>
              <View style={localStyles.compHeader}>
                <Text style={{ width: '36%', textTransform: 'uppercase' }}>ASET NETO TANPA PEMBATASAN</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{currentLabel}</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{comparisonLabel}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>Selisih</Text>
                <Text style={{ width: '14%', textAlign: 'right' }}>Pertumbuhan</Text>
              </View>
              {renderCompRow('Saldo Awal', compData?.unrestricted?.beginning)}
              {renderCompRow('Kenaikan (Penurunan) Periode Lalu', compData?.unrestricted?.prior_period)}
              {renderCompRow('Kenaikan (Penurunan) Periode Berjalan', compData?.unrestricted?.current_period)}
              {renderCompRow('Aset Neto yang Dibebaskan dari Pembatasan', compData?.unrestricted?.released)}
              {renderCompTotal('Saldo Akhir', compData?.unrestricted?.ending)}
            </View>

            {/* 2. DENGAN PEMBATASAN KOMPARATIF */}
            <View style={localStyles.sectionBox}>
              <View style={localStyles.compHeader}>
                <Text style={{ width: '36%', textTransform: 'uppercase' }}>ASET NETO DENGAN PEMBATASAN</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{currentLabel}</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{comparisonLabel}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>Selisih</Text>
                <Text style={{ width: '14%', textAlign: 'right' }}>Pertumbuhan</Text>
              </View>
              {renderCompRow('Saldo Awal', compData?.restricted?.beginning)}
              {renderCompRow('Kenaikan (Penurunan) Periode Lalu', compData?.restricted?.prior_period)}
              {renderCompRow('Kenaikan (Penurunan) Periode Berjalan', compData?.restricted?.current_period)}
              {renderCompRow('Aset Neto yang Dibebaskan dari Pembatasan', compData?.restricted?.released)}
              {renderCompTotal('Saldo Akhir', compData?.restricted?.ending)}
            </View>
          </View>
        ) : (
          /* ========================================================
             VIEW STANDAR PERUBAHAN ASET NETO (PERSIS CONTOH GAMBAR)
             ======================================================== */
          <View style={{ marginVertical: 10 }}>
            {/* 1. ASET NETO TANPA PEMBATASAN */}
            <View style={localStyles.sectionBox}>
              <View style={localStyles.sectionHeader}>
                <Text style={localStyles.sectionTitle}>
                  ASET NETO TANPA PEMBATASAN
                </Text>
              </View>

              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Saldo Awal</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(unrestricted.beginning)}
                </Text>
              </View>
              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Kenaikan (Penurunan) Periode Lalu</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(unrestricted.prior_period)}
                </Text>
              </View>
              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Kenaikan (Penurunan) Periode Berjalan</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(unrestricted.current_period)}
                </Text>
              </View>
              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Aset Neto yang Dibebaskan dari Pembatasan</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(unrestricted.released)}
                </Text>
              </View>
              
              <View style={localStyles.totalRow}>
                <Text style={localStyles.totalLabel}>Saldo Akhir</Text>
                <Text style={localStyles.totalValue}>
                  {formatPdfISAKAmount(unrestricted.ending)}
                </Text>
              </View>
              <View style={localStyles.doubleUnderlineFirst} />
              <View style={localStyles.doubleUnderlineSecond} />
            </View>

            {/* 2. ASET NETO DENGAN PEMBATASAN */}
            <View style={localStyles.sectionBox}>
              <View style={localStyles.sectionHeader}>
                <Text style={localStyles.sectionTitle}>
                  ASET NETO DENGAN PEMBATASAN
                </Text>
              </View>

              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Saldo Awal</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(restricted.beginning)}
                </Text>
              </View>
              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Kenaikan (Penurunan) Periode Lalu</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(restricted.prior_period)}
                </Text>
              </View>
              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Kenaikan (Penurunan) Periode Berjalan</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(restricted.current_period)}
                </Text>
              </View>
              <View style={localStyles.rowItem}>
                <Text style={localStyles.rowLabel}>Aset Neto yang Dibebaskan dari Pembatasan</Text>
                <Text style={localStyles.rowValue}>
                  {formatPdfISAKAmount(restricted.released)}
                </Text>
              </View>
              
              <View style={localStyles.totalRow}>
                <Text style={localStyles.totalLabel}>Saldo Akhir</Text>
                <Text style={localStyles.totalValue}>
                  {formatPdfISAKAmount(restricted.ending)}
                </Text>
              </View>
              <View style={localStyles.doubleUnderlineFirst} />
              <View style={localStyles.doubleUnderlineSecond} />
            </View>
          </View>
        )}

        <PdfFooter />

        <PdfPageNumber reportName="Laporan Perubahan Aset Neto" />
      </Page>
    </Document>
  );
};

export default ChangesInNetAssetsPdf;
