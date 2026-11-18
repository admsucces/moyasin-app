import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import {
  pdfStyles,
  PdfHeader,
  PdfFooter,
  PdfPageNumber,
  formatPdfCurrency,
  formatPdfPercentage,
  formatPdfISAKAmount
} from './PdfCommon';

export const IncomeStatementPdf = ({ data, compareMode, selectedYear }) => {
  const compMode = compareMode || data?.filter?.compare_mode || data?.compare_mode || 'NONE';
  const isAnnualMonthly = compMode === 'MONTHLY_ANNUAL' && Boolean(data?.annual_statement);
  const isRestrictionComp = compMode === 'RESTRICTION' || Boolean(data?.restriction_comparison);
  const isCompMultiPeriod = Boolean(
    (data?.is_comparative || compMode === 'PRIOR_MONTH' || compMode === 'PRIOR_YEAR' || compMode === 'CUSTOM') &&
    data?.comparative_data &&
    !isRestrictionComp &&
    !isAnnualMonthly
  );

  const currentLabel = data.current_period?.label || 'Periode Berjalan';
  const comparisonLabel = data.comparison_period?.label || 'Periode Pembanding';

  const periodLabel = isAnnualMonthly
    ? `Tahun Buku: ${data.annual_statement?.year || selectedYear}`
    : isRestrictionComp
      ? `Komparasi Batasan: ${data.current_period?.label || ''}`
      : compMode === 'WITHOUT_RESTRICTION'
        ? `Tanpa Pembatasan: ${data.current_period?.label || ''}`
        : compMode === 'WITH_RESTRICTION'
          ? `Dengan Pembatasan: ${data.current_period?.label || ''}`
          : isCompMultiPeriod
            ? `${currentLabel} vs ${comparisonLabel}`
            : (data.current_period ? data.current_period.label : `${data.filter?.start_date} s/d ${data.filter?.end_date}`);

  const reportTitle = isAnnualMonthly
    ? "LAPORAN AKTIVITAS 12 BULAN (TAHUNAN)"
    : isRestrictionComp
      ? "LAPORAN AKTIVITAS - PERBANDINGAN PEMBATASAN DONOR"
      : compMode === 'WITHOUT_RESTRICTION'
        ? "LAPORAN AKTIVITAS - TANPA PEMBATASAN"
        : compMode === 'WITH_RESTRICTION'
          ? "LAPORAN AKTIVITAS - DENGAN PEMBATASAN"
          : isCompMultiPeriod
            ? "LAPORAN AKTIVITAS KOMPARATIF"
            : "LAPORAN PENGHASILAN KOMPREHENSIF";

  const rev = data.revenues || { unrestricted: [], restricted: [], total_unrestricted: 0, total_restricted: 0, total_revenue: 0 };
  const exp = data.expenses || { program: [], management: [], total_program: 0, total_management: 0, total_expense: 0 };
  const sur = data.surplus_deficit || { unrestricted: 0, restricted: 0, total_surplus: 0 };

  const compData = data.comparative_data;

  // Helper for Restriction Mode
  const getRestrictionRevenues = () => {
    if (data?.restriction_comparison?.revenues) {
      return data.restriction_comparison.revenues;
    }
    const map = {};
    (data?.revenues?.unrestricted || []).forEach((u) => {
      map[u.account_id] = { ...u, unrestricted: Number(u.amount) || 0, restricted: 0, total: Number(u.amount) || 0 };
    });
    (data?.revenues?.restricted || []).forEach((r) => {
      if (map[r.account_id]) {
        map[r.account_id].restricted = Number(r.amount) || 0;
        map[r.account_id].total += Number(r.amount) || 0;
      } else {
        map[r.account_id] = { ...r, unrestricted: 0, restricted: Number(r.amount) || 0, total: Number(r.amount) || 0 };
      }
    });
    const totRev = Number(data?.revenues?.total_revenue) || 0;
    return Object.values(map)
      .map((item) => ({
        ...item,
        percentage: totRev > 0 ? ((item.total / totRev) * 100).toFixed(1) + '%' : '0.0%',
      }))
      .sort((a, b) => (a.code || '').localeCompare(b.code || ''));
  };

  const getRestrictionExpenses = (type) => {
    let list = [];
    if (type === 'program') list = data?.expenses?.program || [];
    else if (type === 'fundraising') list = data?.expenses?.fundraising || [];
    else list = data?.expenses?.management || [];
    const totExp = Number(data?.expenses?.total_expense) || 0;
    return list.map((item) => ({
      ...item,
      unrestricted: Number(item.amount) || 0,
      restricted: 0,
      total: Number(item.amount) || 0,
      percentage: totExp > 0 ? ((item.amount / totExp) * 100).toFixed(1) + '%' : '0.0%',
    }));
  };

  const months = [
    { id: 1, label: 'Jan' }, { id: 2, label: 'Feb' }, { id: 3, label: 'Mar' },
    { id: 4, label: 'Apr' }, { id: 5, label: 'Mei' }, { id: 6, label: 'Jun' },
    { id: 7, label: 'Jul' }, { id: 8, label: 'Agu' }, { id: 9, label: 'Sep' },
    { id: 10, label: 'Okt' }, { id: 11, label: 'Nov' }, { id: 12, label: 'Des' },
  ];

  return (
    <Document title={`${reportTitle} - ${periodLabel}`}>
      {isAnnualMonthly ? (
        /* ========================================================
           KASUS 1: LAPORAN AKTIVITAS 12 BULAN TAHUNAN (LANDSCAPE)
           ======================================================== */
        <Page size="A4" orientation="landscape" style={{ ...pdfStyles.page, paddingHorizontal: 24, fontSize: 7 }}>
          <PdfHeader
            title={reportTitle}
            subtitle="Rekapitulasi Penerimaan & Beban Januari s/d Desember (ISAK 35)"
            periodLabel={periodLabel}
          />

          <View style={pdfStyles.table}>
            {/* Header Bulan */}
            <View style={{ ...pdfStyles.tableHeader, fontSize: 6.5 }}>
              <Text style={{ width: '24%' }}>Nama Akun / Uraian</Text>
              {months.map(m => (
                <Text key={m.id} style={{ width: '5.5%', textAlign: 'right' }}>{m.label}</Text>
              ))}
              <Text style={{ width: '10%', textAlign: 'right' }}>Total {data.annual_statement.year}</Text>
            </View>

            {/* 1. PENERIMAAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. PENERIMAAN</Text>
            </View>
            {(data.annual_statement.revenues?.accounts || []).map(acc => {
              const isHdr = !acc.is_postable;
              return (
                <View key={acc.code} style={{ ...pdfStyles.tableRow, backgroundColor: isHdr ? '#f8fafc' : '#ffffff' }}>
                  <Text style={{ width: '24%', fontFamily: isHdr ? 'Helvetica-Bold' : 'Helvetica', paddingLeft: isHdr ? 0 : 6 }}>
                    {acc.name}
                  </Text>
                  {months.map(m => (
                    <Text key={m.id} style={{ width: '5.5%', textAlign: 'right' }}>
                      {isHdr ? ' - ' : formatPdfCurrency(acc.months?.[m.id] || 0)}
                    </Text>
                  ))}
                  <Text style={{ width: '10%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {isHdr ? ' - ' : formatPdfCurrency(acc.total_year || 0)}
                  </Text>
                </View>
              );
            })}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '24%' }}>TOTAL PENERIMAAN</Text>
              {months.map(m => (
                <Text key={m.id} style={{ width: '5.5%', textAlign: 'right' }}>
                  {formatPdfCurrency(data.annual_statement.revenues?.monthly_totals?.[m.id] || 0)}
                </Text>
              ))}
              <Text style={{ width: '10%', textAlign: 'right' }}>
                {formatPdfCurrency(data.annual_statement.revenues?.total_year || 0)}
              </Text>
            </View>

            {/* 2. BEBAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>2. BEBAN OPERASIONAL & PROGRAM</Text>
            </View>
            {(data.annual_statement.expenses?.accounts || []).map(acc => {
              const isHdr = !acc.is_postable;
              return (
                <View key={acc.code} style={{ ...pdfStyles.tableRow, backgroundColor: isHdr ? '#f8fafc' : '#ffffff' }}>
                  <Text style={{ width: '24%', fontFamily: isHdr ? 'Helvetica-Bold' : 'Helvetica', paddingLeft: isHdr ? 0 : 6 }}>
                    {acc.name}
                  </Text>
                  {months.map(m => (
                    <Text key={m.id} style={{ width: '5.5%', textAlign: 'right' }}>
                      {isHdr ? ' - ' : formatPdfCurrency(acc.months?.[m.id] || 0)}
                    </Text>
                  ))}
                  <Text style={{ width: '10%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                    {isHdr ? ' - ' : formatPdfCurrency(acc.total_year || 0)}
                  </Text>
                </View>
              );
            })}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '24%' }}>TOTAL BEBAN</Text>
              {months.map(m => (
                <Text key={m.id} style={{ width: '5.5%', textAlign: 'right' }}>
                  {formatPdfCurrency(data.annual_statement.expenses?.monthly_totals?.[m.id] || 0)}
                </Text>
              ))}
              <Text style={{ width: '10%', textAlign: 'right' }}>
                {formatPdfCurrency(data.annual_statement.expenses?.total_year || 0)}
              </Text>
            </View>

            {/* SURPLUS / DEFISIT BERSIH */}
            <View style={{ ...pdfStyles.totalRow, backgroundColor: '#e2e8f0', borderTopWidth: 2 }}>
              <Text style={{ width: '24%' }}>SURPLUS / (DEFISIT) BERSIH</Text>
              {months.map(m => (
                <Text key={m.id} style={{ width: '5.5%', textAlign: 'right' }}>
                  {formatPdfCurrency(data.annual_statement.surplus_deficit?.monthly?.[m.id] || 0)}
                </Text>
              ))}
              <Text style={{ width: '10%', textAlign: 'right' }}>
                {formatPdfCurrency(data.annual_statement.surplus_deficit?.total_year || 0)}
              </Text>
            </View>
          </View>

          <PdfFooter />
          <PdfPageNumber reportName="Laporan Aktivitas 12 Bulan (Tahunan)" />
        </Page>
      ) : isRestrictionComp ? (
        /* ========================================================
           KASUS 2: KOMPARASI PEMBATASAN DONOR (ISAK 35)
           ======================================================== */
        <Page size="A4" style={pdfStyles.page}>
          <PdfHeader
            title={reportTitle}
            subtitle="Rekonsiliasi Batasan: Tanpa Batasan vs Dengan Batasan (ISAK 35)"
            periodLabel={periodLabel}
          />

          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '38%' }}>Komponen Aktivitas (ISAK 35)</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>Tanpa Batasan</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>Dg Batasan</Text>
              <Text style={{ width: '18%', textAlign: 'right' }}>Total (Rp)</Text>
              <Text style={{ width: '12%', textAlign: 'right' }}>Porsi (%)</Text>
            </View>

            {/* 1. PENERIMAAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. PENERIMAAN / PENDAPATAN</Text>
            </View>
            {getRestrictionRevenues().map(item => (
              <View key={item.account_id} style={pdfStyles.tableRow}>
                <Text style={{ width: '38%', paddingLeft: 8, color: '#334155' }}>{item.name}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.unrestricted)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.restricted)}</Text>
                <Text style={{ width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                  {formatPdfCurrency(item.total)}
                </Text>
                <Text style={{ width: '12%', textAlign: 'right', color: '#64748b' }}>{item.percentage}</Text>
              </View>
            ))}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '38%', paddingLeft: 6 }}>Total Penerimaan</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(rev.total_unrestricted)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(rev.total_restricted)}</Text>
              <Text style={{ width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(rev.total_revenue)}
              </Text>
              <Text style={{ width: '12%', textAlign: 'right' }}>100.0%</Text>
            </View>

            {/* 2. BEBAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>2. BEBAN / PENGELUARAN</Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>A. Beban Program</Text>
            </View>
            {getRestrictionExpenses('program').map(item => (
              <View key={item.account_id} style={pdfStyles.tableRow}>
                <Text style={{ width: '38%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.unrestricted)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>-</Text>
                <Text style={{ width: '18%', textAlign: 'right' }}>{formatPdfCurrency(item.total)}</Text>
                <Text style={{ width: '12%', textAlign: 'right', color: '#64748b' }}>{item.percentage}</Text>
              </View>
            ))}

            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>B. Beban Manajemen &amp; Umum</Text>
            </View>
            {getRestrictionExpenses('management').map(item => (
              <View key={item.account_id} style={pdfStyles.tableRow}>
                <Text style={{ width: '38%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.unrestricted)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>-</Text>
                <Text style={{ width: '18%', textAlign: 'right' }}>{formatPdfCurrency(item.total)}</Text>
                <Text style={{ width: '12%', textAlign: 'right', color: '#64748b' }}>{item.percentage}</Text>
              </View>
            ))}

            {getRestrictionExpenses('fundraising').length > 0 && (
              <>
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '100%', color: '#334155' }}>C. Beban Penggalangan Dana (Fundraising)</Text>
                </View>
                {getRestrictionExpenses('fundraising').map(item => (
                  <View key={item.account_id} style={pdfStyles.tableRow}>
                    <Text style={{ width: '38%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                    <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.unrestricted)}</Text>
                    <Text style={{ width: '16%', textAlign: 'right' }}>-</Text>
                    <Text style={{ width: '18%', textAlign: 'right' }}>{formatPdfCurrency(item.total)}</Text>
                    <Text style={{ width: '12%', textAlign: 'right', color: '#64748b' }}>{item.percentage}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '38%', paddingLeft: 6 }}>Total Beban</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(exp.total_expense)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>-</Text>
              <Text style={{ width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(exp.total_expense)}
              </Text>
              <Text style={{ width: '12%', textAlign: 'right' }}>100.0%</Text>
            </View>

            {/* SURPLUS / DEFISIT BERSIH */}
            <View style={{ ...pdfStyles.totalRow, backgroundColor: '#e2e8f0', borderTopWidth: 2 }}>
              <Text style={{ width: '38%' }}>SURPLUS / (DEFISIT) BERSIH</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(sur.unrestricted)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(sur.restricted)}</Text>
              <Text style={{ width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(sur.total_surplus)}
              </Text>
              <Text style={{ width: '12%', textAlign: 'right' }}>-</Text>
            </View>
          </View>

          <PdfFooter />
          <PdfPageNumber reportName="Laporan Aktivitas Perbandingan Pembatasan" />
        </Page>
      ) : isCompMultiPeriod ? (
        /* ========================================================
           KASUS 3: KOMPARATIF PERIODE BERJALAN VS PEMBANDING (5 KOLOM)
           ======================================================== */
        <Page size="A4" style={pdfStyles.page}>
          <PdfHeader
            title={reportTitle}
            subtitle="Perbandingan Aktivitas Multi-Periode (ISAK 35)"
            periodLabel={periodLabel}
          />

          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '36%' }}>Komponen Aktivitas</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{currentLabel}</Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{comparisonLabel}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>Perubahan (Rp)</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>Pertumbuhan</Text>
            </View>

            {/* 1. PENERIMAAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. PENERIMAAN / PENDAPATAN</Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>A. Tanpa Pembatasan Dari Donor (Unrestricted)</Text>
            </View>
            {(compData?.revenues?.unrestricted || []).map(item => (
              <View key={item.account_id} style={pdfStyles.tableRow}>
                <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(item.current_amount)}</Text>
                <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{formatPdfCurrency(item.comparison_amount)}</Text>
                <Text style={{ width: '16%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                  {formatPdfCurrency(item.variance)}
                </Text>
                <Text style={{ width: '14%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                  {formatPdfPercentage(item.percentage)}
                </Text>
              </View>
            ))}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '36%', paddingLeft: 8 }}>Subtotal Tanpa Pembatasan</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.revenues?.total_unrestricted?.current)}</Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{formatPdfCurrency(compData?.revenues?.total_unrestricted?.comparison)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(compData?.revenues?.total_unrestricted?.variance)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(compData?.revenues?.total_unrestricted?.percentage)}</Text>
            </View>

            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>B. Dengan Pembatasan Dari Donor (Restricted)</Text>
            </View>
            {(compData?.revenues?.restricted || []).map(item => (
              <View key={item.account_id} style={pdfStyles.tableRow}>
                <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(item.current_amount)}</Text>
                <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{formatPdfCurrency(item.comparison_amount)}</Text>
                <Text style={{ width: '16%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                  {formatPdfCurrency(item.variance)}
                </Text>
                <Text style={{ width: '14%', textAlign: 'right', color: item.variance >= 0 ? '#047857' : '#b91c1c' }}>
                  {formatPdfPercentage(item.percentage)}
                </Text>
              </View>
            ))}
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '36%', paddingLeft: 8 }}>Subtotal Dengan Pembatasan</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.revenues?.total_restricted?.current)}</Text>
              <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{formatPdfCurrency(compData?.revenues?.total_restricted?.comparison)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(compData?.revenues?.total_restricted?.variance)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(compData?.revenues?.total_restricted?.percentage)}</Text>
            </View>

            {/* TOTAL PENERIMAAN */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '36%' }}>JUMLAH PENERIMAAN</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.revenues?.total_revenue?.current)}</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.revenues?.total_revenue?.comparison)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(compData?.revenues?.total_revenue?.variance)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(compData?.revenues?.total_revenue?.percentage)}</Text>
            </View>

            {/* 2. BEBAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>2. BEBAN OPERASIONAL</Text>
            </View>
            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>A. Beban Program</Text>
            </View>
            {(compData?.expenses?.program || []).map(item => (
              <View key={item.account_id} style={pdfStyles.tableRow}>
                <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(item.current_amount)}</Text>
                <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{formatPdfCurrency(item.comparison_amount)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.variance)}</Text>
                <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(item.percentage)}</Text>
              </View>
            ))}

            <View style={pdfStyles.subtotalRow}>
              <Text style={{ width: '100%', color: '#334155' }}>B. Beban Manajemen &amp; Umum</Text>
            </View>
            {(compData?.expenses?.management || []).map(item => (
              <View key={item.account_id} style={pdfStyles.tableRow}>
                <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(item.current_amount)}</Text>
                <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{formatPdfCurrency(item.comparison_amount)}</Text>
                <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.variance)}</Text>
                <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(item.percentage)}</Text>
              </View>
            ))}

            {(compData?.expenses?.fundraising && compData.expenses.fundraising.length > 0) && (
              <>
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '100%', color: '#334155' }}>C. Beban Penggalangan Dana (Fundraising)</Text>
                </View>
                {compData.expenses.fundraising.map(item => (
                  <View key={item.account_id} style={pdfStyles.tableRow}>
                    <Text style={{ width: '36%', paddingLeft: 10, color: '#334155' }}>{item.name}</Text>
                    <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(item.current_amount)}</Text>
                    <Text style={{ width: '17%', textAlign: 'right', color: '#64748b' }}>{formatPdfCurrency(item.comparison_amount)}</Text>
                    <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(item.variance)}</Text>
                    <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(item.percentage)}</Text>
                  </View>
                ))}
              </>
            )}

            {/* TOTAL BEBAN */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '36%' }}>JUMLAH BEBAN</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.expenses?.total_expense?.current)}</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.expenses?.total_expense?.comparison)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(compData?.expenses?.total_expense?.variance)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(compData?.expenses?.total_expense?.percentage)}</Text>
            </View>

            {/* SURPLUS / DEFISIT BERSIH */}
            <View style={{ ...pdfStyles.totalRow, backgroundColor: '#e2e8f0', borderTopWidth: 2 }}>
              <Text style={{ width: '36%' }}>SURPLUS / (DEFISIT) BERSIH</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.surplus_deficit?.total_surplus?.current)}</Text>
              <Text style={{ width: '17%', textAlign: 'right' }}>{formatPdfCurrency(compData?.surplus_deficit?.total_surplus?.comparison)}</Text>
              <Text style={{ width: '16%', textAlign: 'right' }}>{formatPdfCurrency(compData?.surplus_deficit?.total_surplus?.variance)}</Text>
              <Text style={{ width: '14%', textAlign: 'right' }}>{formatPdfPercentage(compData?.surplus_deficit?.total_surplus?.percentage)}</Text>
            </View>
          </View>

          <PdfFooter />
          <PdfPageNumber reportName="Laporan Aktivitas Komparatif" />
        </Page>
      ) : (
        /* ========================================================
           KASUS 4: STANDAR TUNGGAL (3 KOLOM)
           ======================================================== */
        <Page size="A4" style={pdfStyles.page}>
          <PdfHeader
            title={reportTitle}
            subtitle="Laporan Aktivitas Penerimaan & Beban Entitas Nirlaba (ISAK 35)"
            periodLabel={periodLabel}
          />

          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableHeader}>
              <Text style={{ width: '70%' }}>Uraian / Nama Akun</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>Jumlah (Rp)</Text>
            </View>

            {/* 1. PENERIMAAN / PENDAPATAN */}
            <View style={pdfStyles.sectionHeaderRow}>
              <Text style={{ width: '100%' }}>1. PENERIMAAN / PENDAPATAN</Text>
            </View>

            {/* A. Tanpa Pembatasan */}
            {compMode !== 'WITH_RESTRICTION' && (
              <>
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '100%', color: '#334155' }}>A. Tanpa Pembatasan Dari Donor (Unrestricted)</Text>
                </View>
                {rev.unrestricted.length === 0 ? (
                  <View style={pdfStyles.tableRow}>
                    <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                      Tidak ada penerimaan tanpa pembatasan
                    </Text>
                  </View>
                ) : (
                  rev.unrestricted.map((item) => (
                    <View key={item.account_id} style={pdfStyles.tableRow}>
                      <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                      <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                        {formatPdfCurrency(item.amount)}
                      </Text>
                    </View>
                  ))
                )}
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Tanpa Pembatasan</Text>
                  <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(rev.total_unrestricted)}</Text>
                </View>
              </>
            )}

            {/* B. Dengan Pembatasan */}
            {compMode !== 'WITHOUT_RESTRICTION' && (
              <>
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '100%', color: '#334155' }}>B. Dengan Pembatasan Dari Donor (Restricted)</Text>
                </View>
                {rev.restricted.length === 0 ? (
                  <View style={pdfStyles.tableRow}>
                    <Text style={{ width: '100%', fontStyle: 'italic', color: '#94a3b8', paddingLeft: 10 }}>
                      Tidak ada penerimaan dengan pembatasan
                    </Text>
                  </View>
                ) : (
                  rev.restricted.map((item) => (
                    <View key={item.account_id} style={pdfStyles.tableRow}>
                      <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                      <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                        {formatPdfCurrency(item.amount)}
                      </Text>
                    </View>
                  ))
                )}
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Dengan Pembatasan</Text>
                  <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(rev.total_restricted)}</Text>
                </View>
              </>
            )}

            {/* JUMLAH PENERIMAAN */}
            <View style={pdfStyles.totalRow}>
              <Text style={{ width: '70%' }}>JUMLAH PENERIMAAN</Text>
              <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(rev.total_revenue)}</Text>
            </View>

            {/* 2. BEBAN / PENGELUARAN */}
            {compMode !== 'WITH_RESTRICTION' && (
              <>
                <View style={pdfStyles.sectionHeaderRow}>
                  <Text style={{ width: '100%' }}>2. BEBAN / PENGELUARAN</Text>
                </View>

                {/* A. Beban Program */}
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '100%', color: '#334155' }}>A. Beban Program</Text>
                </View>
                {exp.program.map((item) => (
                  <View key={item.account_id} style={pdfStyles.tableRow}>
                    <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                    <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(item.amount)}</Text>
                  </View>
                ))}
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Beban Program</Text>
                  <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(exp.total_program)}</Text>
                </View>

                {/* B. Beban Manajemen & Umum */}
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '100%', color: '#334155' }}>B. Beban Manajemen & Operasional Umum</Text>
                </View>
                {exp.management.map((item) => (
                  <View key={item.account_id} style={pdfStyles.tableRow}>
                    <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                    <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(item.amount)}</Text>
                  </View>
                ))}
                <View style={pdfStyles.subtotalRow}>
                  <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Beban Manajemen &amp; Umum</Text>
                  <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(exp.total_management)}</Text>
                </View>

                {/* C. Beban Penggalangan Dana */}
                {(exp.fundraising && exp.fundraising.length > 0) && (
                  <>
                    <View style={pdfStyles.subtotalRow}>
                      <Text style={{ width: '100%', color: '#334155' }}>C. Beban Penggalangan Dana (Fundraising)</Text>
                    </View>
                    {exp.fundraising.map((item) => (
                      <View key={item.account_id} style={pdfStyles.tableRow}>
                        <Text style={{ width: '70%', paddingLeft: 12, color: '#334155' }}>{item.name}</Text>
                        <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(item.amount)}</Text>
                      </View>
                    ))}
                    <View style={pdfStyles.subtotalRow}>
                      <Text style={{ width: '70%', paddingLeft: 10 }}>Subtotal Beban Penggalangan Dana</Text>
                      <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(exp.total_fundraising)}</Text>
                    </View>
                  </>
                )}

                {/* JUMLAH BEBAN */}
                <View style={pdfStyles.totalRow}>
                  <Text style={{ width: '70%' }}>JUMLAH BEBAN OPERASIONAL</Text>
                  <Text style={{ width: '30%', textAlign: 'right' }}>{formatPdfCurrency(exp.total_expense)}</Text>
                </View>
              </>
            )}

            {/* SURPLUS / DEFISIT BERSIH */}
            <View style={{
              ...pdfStyles.totalRow,
              backgroundColor: '#e2e8f0',
              borderTopWidth: 2,
              borderBottomWidth: 2.5,
            }}>
              <Text style={{ width: '70%', fontFamily: 'Helvetica-Bold' }}>
                {compMode === 'WITH_RESTRICTION'
                  ? 'KENAIKAN ASET NETO DENGAN PEMBATASAN'
                  : 'SURPLUS / (DEFISIT) BERSIH PERIODE BERJALAN'}
              </Text>
              <Text style={{ width: '30%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }}>
                {formatPdfCurrency(compMode === 'WITH_RESTRICTION' ? sur.restricted : sur.total_surplus)}
              </Text>
            </View>
          </View>

          <PdfFooter />
          <PdfPageNumber reportName="Laporan Penghasilan Komprehensif" />
        </Page>
      )}
    </Document>
  );
};

export default IncomeStatementPdf;
