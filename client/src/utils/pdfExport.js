import jsPDF from 'jspdf'

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth)
  lines.forEach((line, i) => doc.text(line, x, y + i * lineHeight))
  return y + lines.length * lineHeight
}

export function downloadConversationPdf({ title, subtitle, messages, filename, lang = 'en' }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - margin * 2
  let y = margin

  doc.setFillColor(4, 18, 38)
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F')
  doc.setTextColor(0, 229, 255)
  doc.setFontSize(16)
  doc.text(title || 'ARISE Intelligence Assistant', margin, y)
  y += 8

  doc.setTextColor(148, 163, 184)
  doc.setFontSize(9)
  doc.text(subtitle || `Generated ${new Date().toLocaleString('en-IN')}`, margin, y)
  y += 6
  doc.text(`Language: ${lang === 'kn' ? 'Kannada' : 'English'}`, margin, y)
  y += 10

  doc.setDrawColor(0, 119, 255)
  doc.line(margin, y, pageW - margin, y)
  y += 8

  messages.forEach(msg => {
    if (msg.loading) return
    const role = msg.role === 'user' ? 'Officer' : 'ARISE'
    const ts = msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-IN') : ''
    const header = `[${ts}] ${role}`

    if (y > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage()
      doc.setFillColor(4, 18, 38)
      doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F')
      y = margin
    }

    doc.setTextColor(msg.role === 'user' ? 250, 250, 250 : 0, 229, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text(header, margin, y)
    y += 5

    doc.setFont(undefined, 'normal')
    doc.setTextColor(226, 232, 240)
    doc.setFontSize(9)
    y = wrapText(doc, msg.content || '', margin, y, maxW, 4.5)
    y += 6
  })

  doc.save(filename || `ARISE_chat_${Date.now()}.pdf`)
}

export function downloadReportPdf({ firUid, reportType, generatedReport, explanationFactors = [], filename }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - margin * 2
  let y = margin

  doc.setFillColor(4, 18, 38)
  doc.rect(0, 0, pageW, doc.internal.pageSize.getHeight(), 'F')

  doc.setTextColor(0, 229, 255)
  doc.setFontSize(15)
  doc.text('ARISE Investigation Report', margin, y)
  y += 7
  doc.setTextColor(148, 163, 184)
  doc.setFontSize(9)
  doc.text(`FIR: ${firUid} · ${reportType || 'CASE_SUMMARY'} · ${new Date().toLocaleString('en-IN')}`, margin, y)
  y += 10

  doc.setTextColor(226, 232, 240)
  doc.setFontSize(10)
  y = wrapText(doc, generatedReport || 'No report content.', margin, y, maxW, 5)
  y += 8

  if (explanationFactors.length) {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage()
      y = margin
    }
    doc.setTextColor(0, 229, 255)
    doc.setFontSize(11)
    doc.text('Explainability Factors', margin, y)
    y += 6
    doc.setFontSize(9)
    doc.setTextColor(200, 210, 220)
    explanationFactors.slice(0, 8).forEach(f => {
      y = wrapText(doc, `• ${f.factor} (${f.impact}): ${f.description}`, margin, y, maxW, 4.5)
      y += 2
    })
  }

  doc.save(filename || `ARISE_Report_${firUid}_${Date.now()}.pdf`)
}
