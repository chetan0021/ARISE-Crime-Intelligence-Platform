import fs from 'fs';
let code = fs.readFileSync('client/src/pages/Reports.jsx', 'utf8');

const oldCode =     const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = \ARISE_Report_\_\.txt\
    a.click()
    URL.revokeObjectURL(url);

const newCode =     import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF();
      doc.setFont('helvetica');
      
      const lines = doc.splitTextToSize(content, 180);
      let y = 15;
      for (let i = 0; i < lines.length; i++) {
        if (y > 280) {
          doc.addPage();
          y = 15;
        }
        doc.text(lines[i], 15, y);
        y += 7;
      }
      doc.save(\ARISE_Report_\_\.pdf\);
    });;

if (code.includes(oldCode)) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('client/src/pages/Reports.jsx', code);
  console.log('Replaced txt export with pdf export');
} else {
  console.log('Could not find oldCode in Reports.jsx');
}
