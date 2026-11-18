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

export const BalanceSheetPdf = ({ data, compareMode }) => {
  const isComp = Boolean(
    (data?.is_comparative || (compareMode && compareMode !== 'NONE') || (data?.filter?.compare_mode && data?.filter?.compare_mode !== 'NONE')) &&
    data?.comparative_data
  );
  const periodLabel = isComp 
    ? `Komparatif: ${data.current_period?.label || ''} vs ${data.comparison_period?.label || ''}`
    : `Per ${data.current_period?.label || (data.filter?.as_of_date || '')}`;

  const currentLabel = data.current_period?.label || 'Periode Berjalan';
  const comparisonLabel = data.comparison_period?.label || 'Periode Pembanding';

  const assets = data.assets || { current_assets: [], non_current_assets: [], total_current_assets: 0, total_non_current_assets: 0, total_assets: 0 };
  const liabilities = data.liabilities || { short_term_liabilities: [], total_liabilities: 0 };
  const netAssets = data.net_assets || { unrestricted_net_assets: 0, restricted_net_assets: 0, total_net_assets: 0 };

  const compData = data.comparative_data;

  return (
    <Document title={`Laporan Posisi Keuangan - ${periodLabel}`}>
      <Page size="A4" style={pdfStyles.page}>
        <PdfHeader 
          title={isComp ? "LAPORAN POSISI KEUANGAN (KOMPARATIF)" : "LAPORAN POSISI KEUANGAN (NERACA)"} 
          subtitle="Format Standar ISAK 35 (Entitas Nirlaba)"
          periodLabel={periodLabel}
        />

        {isComp ? (
          /* ========================================================
             VIEW KOMPARATIF (5 KOLOM)
             ======================================================== */
          <View style={pdfStyles.table}>
            {/* Table Header */}
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '36%' }}>Komponen Posisi Keuangan</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{currentLabel}</Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{comparisonLabel}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>Selisih (Rp)</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>Pertumbuhan</Text>
            </View>

            {/* 1. ASET */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. ASET</Text>
            </View>

            {/* A. Aset Lancar */}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>A. Aset Lancar</Text>
            </View>
            {(compData?.assets?.current_assets || []).length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                  Tidak ada aset lancar
                </Text>
              </View>
            ) : (
              compData.assets.current_assets.map((item) => (
                <View key={item.account_id} style={pdfStyles.tableRow}>
                  <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                  <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.current_balance)}
                  </Text>
                  <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                    {formatPdfCurrency(item.comparison_balance)}
                  </Text>
                  <Text style={{ width: '16%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                    {formatPdfCurrency(item.variance)}
                  </Text>
                  <Text style={{ width: '14%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                    {formatPdfPercentage(item.percentage)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '36%', paddingLeft: 8 }}>Total Aset Lancar</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.assets?.total_current_assets?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                {formatPdfCurrency(compData?.assets?.total_current_assets?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.assets?.total_current_assets?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.assets?.total_current_assets?.percentage)}
              </Text>
            </View>

            {/* B. Aset Tidak Lancar */}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>B. Aset Tidak Lancar / Tetap</Text>
            </View>
            {(compData?.assets?.non_current_assets || []).length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                  Tidak ada aset tidak lancar
                </Text>
              </View>
            ) : (
              compData.assets.non_current_assets.map((item) => (
                <View key={item.account_id} style={pdfStyles.tableRow}>
                  <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                  <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.current_balance)}
                  </Text>
                  <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                    {formatPdfCurrency(item.comparison_balance)}
                  </Text>
                  <Text style={{ width: '16%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                    {formatPdfCurrency(item.variance)}
                  </Text>
                  <Text style={{ width: '14%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                    {formatPdfPercentage(item.percentage)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '36%', paddingLeft: 8 }}>Total Aset Tidak Lancar</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.assets?.total_non_current_assets?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                {formatPdfCurrency(compData?.assets?.total_non_current_assets?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.assets?.total_non_current_assets?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.assets?.total_non_current_assets?.percentage)}
              </Text>
            </View>

            {/* TOTAL ASET */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '36%' }}>TOTAL ASET</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.assets?.total_assets?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.assets?.total_assets?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.assets?.total_assets?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.assets?.total_assets?.percentage)}
              </Text>
            </View>

            {/* 2. LIABILITAS */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>2. LIABILITAS</Text>
            </View>

            {/* A. Liabilitas Jangka Pendek */}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>A. Liabilitas Jangka Pendek</Text>
            </View>
            {(compData?.liabilities?.short_term_liabilities || []).length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                  Tidak ada liabilitas jangka pendek
                </Text>
              </View>
            ) : (
              compData.liabilities.short_term_liabilities.map((item) => (
                <View key={item.account_id} style={pdfStyles.tableRow}>
                  <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                  <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.current_balance)}
                  </Text>
                  <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                    {formatPdfCurrency(item.comparison_balance)}
                  </Text>
                  <Text style={{ width: '16%', textAlign: 'right', color: item.variance <= 0 ? '#047857' : '#b91c1c' }}>
                    {formatPdfCurrency(item.variance)}
                  </Text>
                  <Text style={{ width: '14%', textAlign: 'right', color: item.variance <= 0 ? '#047857' : '#b91c1c' }}>
                    {formatPdfPercentage(item.percentage)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '36%', paddingLeft: 8 }}>Total Liabilitas Jangka Pendek</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.liabilities?.total_short_term_liabilities?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                {formatPdfCurrency(compData?.liabilities?.total_short_term_liabilities?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.liabilities?.total_short_term_liabilities?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.liabilities?.total_short_term_liabilities?.percentage)}
              </Text>
            </View>

            {/* B. Liabilitas Jangka Panjang */}
            {(compData?.liabilities?.long_term_liabilities || []).length > 0 && (
              <>
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '100%', color: '#334155' }}>B. Liabilitas Jangka Panjang</Text>
                </View>
                {compData.liabilities.long_term_liabilities.map((item) => (
                  <View key={item.account_id} style={pdfStyles.tableRow}>
                    <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                    <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                      {formatPdfCurrency(item.current_balance)}
                    </Text>
                    <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                      {formatPdfCurrency(item.comparison_balance)}
                    </Text>
                    <Text style={{ width: '16%', textAlign: 'right', color: item.variance <= 0 ? '#047857' : '#b91c1c' }}>
                      {formatPdfCurrency(item.variance)}
                    </Text>
                    <Text style={{ width: '14%', textAlign: 'right', color: item.variance <= 0 ? '#047857' : '#b91c1c' }}>
                      {formatPdfPercentage(item.percentage)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '36%', paddingLeft: 8 }}>Total Liabilitas</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.liabilities?.total_liabilities?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                {formatPdfCurrency(compData?.liabilities?.total_liabilities?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.liabilities?.total_liabilities?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.liabilities?.total_liabilities?.percentage)}
              </Text>
            </View>

            {/* 3. ASET NETO */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>3. ASET NETO (ISAK 35)</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '36%', paddingLeft: 10 }}>Tanpa Pembatasan (Unrestricted)</Text>
              <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(compData?.net_assets?.unrestricted_net_assets?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                {formatPdfCurrency(compData?.net_assets?.unrestricted_net_assets?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.net_assets?.unrestricted_net_assets?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.net_assets?.unrestricted_net_assets?.percentage)}
              </Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '36%', paddingLeft: 10 }}>Dengan Pembatasan (Restricted)</Text>
              <Text style={{ width: '17%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(compData?.net_assets?.restricted_net_assets?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                {formatPdfCurrency(compData?.net_assets?.restricted_net_assets?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.net_assets?.restricted_net_assets?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.net_assets?.restricted_net_assets?.percentage)}
              </Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '36%', paddingLeft: 8 }}>Total Aset Neto</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.net_assets?.total_net_assets?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>
                {formatPdfCurrency(compData?.net_assets?.total_net_assets?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.net_assets?.total_net_assets?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.net_assets?.total_net_assets?.percentage)}
              </Text>
            </View>

            {/* TOTAL LIABILITAS & ASET NETO */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '36%' }}>TOTAL LIABILITAS & ASET NETO</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.total_liabilities_and_net_assets?.current)}
              </Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.total_liabilities_and_net_assets?.comparison)}
              </Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>
                {formatPdfCurrency(compData?.total_liabilities_and_net_assets?.variance)}
              </Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>
                {formatPdfPercentage(compData?.total_liabilities_and_net_assets?.percentage)}
              </Text>
            </View>
          </View>
        ) : (
          /* ========================================================
             VIEW STANDAR PERIODE TUNGGAL (3 KOLOM)
             ======================================================== */
          <View style={pdfStyles.table}>
            {/* Table Header */}
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '70%' }}>Posisi Keuangan / Nama Akun</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>Jumlah (Rp)</Text>
            </View>

            {/* 1. ASET */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. ASET</Text>
            </View>

            {/* A. Aset Lancar */}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>A. Aset Lancar</Text>
            </View>
            {assets.current_assets.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                  Tidak ada aset lancar
                </Text>
              </View>
            ) : (
              assets.current_assets.map((item) => (
                <View key={item.account_id} style={pdfStyles.tableRow}>
                  <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                  <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.balance)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Aset Lancar</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(assets.total_current_assets)}</Text>
            </View>

            {/* B. Aset Tidak Lancar */}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>B. Aset Tidak Lancar / Aset Tetap</Text>
            </View>
            {assets.non_current_assets.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                  Tidak ada aset tidak lancar
                </Text>
              </View>
            ) : (
              assets.non_current_assets.map((item) => (
                <View key={item.account_id} style={pdfStyles.tableRow}>
                  <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                  <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.balance)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Aset Tidak Lancar</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(assets.total_non_current_assets)}</Text>
            </View>

            {/* TOTAL ASET */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '70%' }}>TOTAL ASET</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(assets.total_assets)}</Text>
            </View>

            {/* 2. LIABILITAS */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>2. LIABILITAS</Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>A. Liabilitas Jangka Pendek & Operasional</Text>
            </View>
            {liabilities.short_term_liabilities.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                  Tidak ada liabilitas
                </Text>
              </View>
            ) : (
              liabilities.short_term_liabilities.map((item) => (
                <View key={item.account_id} style={pdfStyles.tableRow}>
                  <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                  <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {formatPdfCurrency(item.balance)}
                  </Text>
                </View>
              ))
            )}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Liabilitas</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(liabilities.total_liabilities)}</Text>
            </View>

            {/* 3. ASET NETO */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>3. ASET NETO (ISAK 35)</Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '70%', paddingLeft: 10 }}>Tanpa Pembatasan Dari Donor (Unrestricted)</Text>
              <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(netAssets.unrestricted_net_assets)}
              </Text>
            </View>
            <View style={pdfStyles.tableRow}>
              <Text style={{ width: '70%', paddingLeft: 10 }}>Dengan Pembatasan Dari Donor (Restricted)</Text>
              <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(netAssets.restricted_net_assets)}
              </Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Aset Neto</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(netAssets.total_net_assets)}</Text>
            </View>

            {/* TOTAL LIABILITAS & ASET NETO */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '70%' }}>TOTAL LIABILITAS DAN ASET NETO</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(data.total_liabilities_and_net_assets)}</Text>
            </View>
          </View>
        )}

        <PdfFooter />

        <PdfPageNumber reportName="Laporan Posisi Keuangan" />
      </Page>
    </Document>
  );
};

export default BalanceSheetPdf;
