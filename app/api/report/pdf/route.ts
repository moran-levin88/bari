import path from 'node:path'
import React from 'react'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer'
import type { Style } from '@react-pdf/types'
import { getCurrentUser } from '@/lib/auth'
import { buildReportData, resolveReportDays, type ReportDay } from '@/lib/report'
import { createT, type Locale } from '@/lib/i18n/dictionaries'

const e = React.createElement

// react-pdf's default fonts (Helvetica etc.) have no Hebrew glyphs, and its
// hyphenation engine assumes English words — register a Hebrew-capable font
// and disable hyphenation so Hebrew text renders instead of showing blanks.
Font.registerHyphenationCallback((word) => [word])
Font.register({
  family: 'Heebo',
  fonts: [
    { src: path.join(process.cwd(), 'public/fonts/Heebo-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(process.cwd(), 'public/fonts/Heebo-Bold.ttf'), fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: 'Heebo', fontSize: 10, direction: 'rtl', color: '#1e293b' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#1d4ed8', marginBottom: 2, textAlign: 'right' },
  subtitle: { fontSize: 10, color: '#64748b', marginBottom: 16, textAlign: 'right' },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8, textAlign: 'right' },
  statsRow: { flexDirection: 'row-reverse', gap: 10, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#eff6ff', borderRadius: 8, padding: 8, alignItems: 'center' },
  statLabel: { fontSize: 8, color: '#64748b', marginBottom: 2, textAlign: 'center' },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#1d4ed8' },
  statTarget: { fontSize: 7, color: '#94a3b8' },
  summaryLine: { fontSize: 10, marginBottom: 3, textAlign: 'right' },
  daySection: { marginBottom: 14, borderWidth: 1, borderColor: '#dbeafe', borderRadius: 8, padding: 10 },
  dayHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dayTitle: { fontSize: 12, fontWeight: 'bold', textAlign: 'right' },
  dayTotalsRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  dayTotalsText: { fontSize: 9, color: '#475569' },
  dayTotalsSep: { fontSize: 9, color: '#475569', marginHorizontal: 3 },
  mealRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 4 },
  mealName: { fontSize: 10, fontWeight: 'bold', textAlign: 'right' },
  mealDesc: { fontSize: 8, color: '#94a3b8', textAlign: 'right', marginTop: 1 },
  mealMeta: { fontSize: 7, color: '#94a3b8', textAlign: 'right', marginTop: 1 },
  mealMacrosRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', minWidth: 60 },
  mealMacrosText: { fontSize: 9, color: '#475569' },
  mealMacrosSep: { fontSize: 9, color: '#475569', marginHorizontal: 3 },
  noData: { fontSize: 10, color: '#94a3b8', textAlign: 'right' },
})

// Heebo (and react-pdf's font shaping) has no emoji glyphs, and embedding an
// unsupported glyph corrupts the glyph indices of the Hebrew text that
// follows it in the same run — strip emoji from any translated label before
// it reaches a PDF Text node.
function stripEmoji(s: string): string {
  return s.replace(/[\p{Extended_Pictographic}‍︎️]/gu, '').trim()
}

function mealTypeLabel(t: ReturnType<typeof createT>, mealType: string) {
  if (mealType === 'breakfast') return stripEmoji(t('mealsList.breakfast'))
  if (mealType === 'lunch') return stripEmoji(t('mealsList.lunch'))
  if (mealType === 'dinner') return stripEmoji(t('mealsList.dinner'))
  if (mealType === 'between' || mealType === 'snack') return stripEmoji(t('mealsList.snack'))
  return ''
}

function formatDate(d: Date, locale: Locale) {
  return d.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric', year: 'numeric' })
}
function formatDayHeader(d: Date, locale: Locale) {
  return d.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' })
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// A single Text node mixing several separate number/unit fragments (e.g.
// "417 kcal · 51/49/5g · 750ml") gets visually reordered by react-pdf's bidi
// engine inside an RTL paragraph — each fragment must be its own Text node
// in an explicit row so the visual order is controlled by layout, not bidi.
function macrosRow(rowStyle: Style, textStyle: Style, sepStyle: Style, calories: number, protein: number, carbs: number, fat: number, kcalLabel: string, water?: number) {
  const parts = [
    e(Text, { key: 'cal', style: textStyle }, `${Math.round(calories)} ${kcalLabel}`),
    e(Text, { key: 'sep1', style: sepStyle }, '·'),
    e(Text, { key: 'macros', style: textStyle }, `${Math.round(protein)}/${Math.round(carbs)}/${Math.round(fat)}g`),
  ]
  if (water && water > 0) {
    parts.push(e(Text, { key: 'sep2', style: sepStyle }, '·'), e(Text, { key: 'water', style: textStyle }, `${Math.round(water)}ml`))
  }
  return e(View, { style: rowStyle }, ...parts)
}

function renderDaySection(day: ReportDay, locale: Locale, t: ReturnType<typeof createT>) {
  return e(
    View,
    { key: day.key, style: styles.daySection, wrap: false },
    e(
      View,
      { style: styles.dayHeaderRow },
      e(Text, { style: styles.dayTitle }, formatDayHeader(day.date, locale)),
      macrosRow(styles.dayTotalsRow, styles.dayTotalsText, styles.dayTotalsSep, day.totals.calories, day.totals.protein, day.totals.carbs, day.totals.fat, t('report.kcal'), day.water)
    ),
    ...day.meals.map((m, i) =>
      e(
        View,
        { key: i, style: styles.mealRow },
        e(
          View,
          { style: { flex: 1 } },
          e(Text, { style: styles.mealName }, m.name),
          m.description ? e(Text, { style: styles.mealDesc }, m.description) : null,
          e(Text, { style: styles.mealMeta }, `${mealTypeLabel(t, m.mealType)} · ${formatTime(m.loggedAt)}`)
        ),
        macrosRow(styles.mealMacrosRow, styles.mealMacrosText, styles.mealMacrosSep, m.calories, m.protein, m.carbs, m.fat, t('report.kcal'))
      )
    )
  )
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const days = resolveReportDays(request.nextUrl.searchParams.get('days') ?? undefined)
  const cookieStore = await cookies()
  const locale: Locale = cookieStore.get('locale')?.value === 'en' ? 'en' : 'he'
  const t = createT(locale)
  const numberLocale = locale === 'he' ? 'he-IL' : 'en-US'

  const report = await buildReportData(user, days)
  const { since, until, targets, loggedDaysCount, totalWater, totalExerciseMin, averages, weightChange, sortedDays } = report
  const denom = Math.max(1, loggedDaysCount)

  const statBoxes = [
    { label: t('report.avgCalories'), value: averages.calories, target: targets.calories, unit: '' },
    { label: t('report.avgProtein'), value: averages.protein, target: targets.protein, unit: 'g' },
    { label: t('report.avgCarbs'), value: averages.carbs, target: targets.carbs, unit: 'g' },
    { label: t('report.avgFat'), value: averages.fat, target: targets.fat, unit: 'g' },
  ].map(({ label, value, target, unit }) =>
    e(
      View,
      { key: label, style: styles.statBox },
      e(Text, { style: styles.statLabel }, label),
      e(Text, { style: styles.statValue }, `${value.toLocaleString(numberLocale)}${unit}`),
      e(Text, { style: styles.statTarget }, `${t('report.target')} ${Math.round(target).toLocaleString(numberLocale)}${unit}`)
    )
  )

  const summaryBody =
    loggedDaysCount === 0
      ? e(Text, { style: styles.noData }, t('report.noData'))
      : e(
          React.Fragment,
          null,
          e(View, { style: styles.statsRow }, ...statBoxes),
          e(
            Text,
            { style: styles.summaryLine },
            t('report.waterSummary', { total: (totalWater / 1000).toFixed(1), avg: Math.round(totalWater / denom).toLocaleString(numberLocale) })
          ),
          totalExerciseMin > 0 ? e(Text, { style: styles.summaryLine }, t('report.exerciseSummary', { min: totalExerciseMin })) : null,
          weightChange !== null
            ? e(Text, { style: styles.summaryLine }, `${weightChange > 0 ? '+' : ''}${weightChange}${t('report.weightUnit')} ${t('report.weightSummary')}`)
            : null
        )

  const doc = e(
    Document,
    null,
    e(
      Page,
      { size: 'A4', style: styles.page },
      e(Text, { style: styles.title }, `${stripEmoji(t('report.title'))} — ${user.name}`),
      e(
        Text,
        { style: styles.subtitle },
        `${formatDate(since, locale)} – ${formatDate(until, locale)} · ${t('report.daysLogged', { logged: loggedDaysCount, total: days })}`
      ),
      e(Text, { style: styles.sectionTitle }, t('report.summary')),
      summaryBody,
      loggedDaysCount > 0
        ? e(
            View,
            { style: { marginTop: 16 } },
            ...sortedDays.map((day) => renderDaySection(day, locale, t))
          )
        : null
    )
  )

  const buffer = await renderToBuffer(doc)
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="bari-report-${days}d.pdf"`,
    },
  })
}
