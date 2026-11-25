// The results as a spreadsheet: Teams, every Clue of every team's case (with the answer and wrong tries), and
// Students. The Excel library loads only when someone downloads.
export async function downloadResults(report) {
  const XLSX = await import('xlsx')
  const book = XLSX.utils.book_new()
  const add = (name, rows, widths) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Note: 'Nothing to show.' }])
    sheet['!cols'] = widths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(book, sheet, name)
  }
  add('Teams', [...report.teams].sort((a, b) => b.points - a.points).map((t, i) => ({
    Place: i + 1, Team: t.name, Points: t.points, 'Clues solved': `${t.solved}/7`, 'Case closed': t.finish_rank ? `#${t.finish_rank}` : 'No',
    Hospital: t.story?.hospital ?? '', Stolen: t.story?.stolen ?? '', Thief: t.story?.thief ?? '',
  })), [6, 20, 8, 12, 11, 22, 16, 30])
  add('Clues', report.teams.flatMap((t) => t.steps.map((s) => ({
    Team: t.name, Act: s.act, Clue: s.title, Result: s.status, Points: s.points, 'Wrong tries': s.wrong, Answer: s.answer,
  }))), [16, 5, 34, 13, 7, 11, 70])
  add('Students', report.students, [22, 16, 24, 7, 7])
  const today = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(book, `Limiting-Suspect-results-${today}.xlsx`)
}
