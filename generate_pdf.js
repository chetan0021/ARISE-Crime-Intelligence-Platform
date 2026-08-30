const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

// Paths
const mdPath = path.resolve(__dirname, 'arise_software_report.md');
const tempHtmlPath = path.resolve(__dirname, 'client', 'temp_report.html');
const pdfPath = path.resolve(__dirname, 'arise_software_report.pdf');

console.log('Reading markdown report...');
const mdContent = fs.readFileSync(mdPath, 'utf8');

// Simple Markdown to HTML Parser
function parseMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    let trimmed = line.trim();

    // Horizontal Rule
    if (trimmed === '---') {
      if (inList) { html += '</ul>\n'; inList = false; }
      html += '<hr />\n';
      continue;
    }

    // List Items
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      let content = line.replace(/^\s*[\*\-]\s+/, '');
      html += `  <li>${formatInline(content)}</li>\n`;
      continue;
    } else if (trimmed.startsWith('    * ')) { // Nested sub-list
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      let content = line.replace(/^\s*[\*\-]\s+/, '');
      html += `  <li class="nested">${formatInline(content)}</li>\n`;
      continue;
    } else {
      if (inList && !trimmed.startsWith('*') && !trimmed.startsWith('-') && !line.startsWith(' ')) {
        html += '</ul>\n';
        inList = false;
      }
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      html += `<h1>${formatInline(trimmed.substring(2))}</h1>\n`;
    } else if (trimmed.startsWith('## ')) {
      html += `<h2>${formatInline(trimmed.substring(3))}</h2>\n`;
    } else if (trimmed.startsWith('### ')) {
      html += `<h3>${formatInline(trimmed.substring(4))}</h3>\n`;
    } 
    // Images
    else if (trimmed.startsWith('![')) {
      const match = trimmed.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        const alt = match[1];
        let imgPath = match[2];
        if (!imgPath.startsWith('file:///')) {
          imgPath = 'file:///' + imgPath.replace(/\\/g, '/');
        }
        html += `
        <div class="image-wrapper">
          <img src="${imgPath}" alt="${alt}" />
          <div class="image-caption">${alt}</div>
        </div>
        `;
      }
    } 
    // Empty line
    else if (trimmed === '') {
      // Add small spacing
    } 
    // Paragraph
    else {
      html += `<p>${formatInline(line)}</p>\n`;
    }
  }

  if (inList) {
    html += '</ul>\n';
  }

  return html;
}

function formatInline(text) {
  // Bold **text**
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Inline Code `code`
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  return text;
}

const bodyContent = parseMarkdown(mdContent);

const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>ARISE Software Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #374151;
      line-height: 1.6;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13.5px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      color: #1e3a8a;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 12px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 20px;
      color: #1e3a8a;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      page-break-after: avoid;
      break-after: avoid;
    }
    h3 {
      font-size: 16px;
      color: #2563eb;
      margin-top: 20px;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }
    p {
      margin-top: 0;
      margin-bottom: 12px;
    }
    strong {
      color: #111827;
      fontWeight: 600;
    }
    code {
      font-family: Consolas, Monaco, Lucida Console, monospace;
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: #2563eb;
    }
    ul {
      margin-top: 0;
      margin-bottom: 16px;
      padding-left: 20px;
    }
    li {
      margin-bottom: 6px;
    }
    li.nested {
      list-style-type: circle;
      margin-left: 20px;
    }
    hr {
      border: 0;
      height: 1px;
      background: #e5e7eb;
      margin: 30px 0;
    }
    .image-wrapper {
      margin: 24px 0;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    img {
      max-width: 100%;
      height: auto;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }
    .image-caption {
      font-size: 11.5px;
      color: #6b7280;
      margin-top: 8px;
      font-style: italic;
    }
    @media print {
      body {
        font-size: 12px;
      }
      .container {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyContent}
  </div>
</body>
</html>
`;

console.log('Writing temporary HTML file...');
fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

async function generatePdf() {
  console.log('Launching headless Chrome via Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });
  
  const page = await browser.newPage();
  
  const fileUrl = 'file:///' + tempHtmlPath.replace(/\\/g, '/');
  console.log('Navigating to ' + fileUrl);
  
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  
  console.log('Generating PDF...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '0.8in',
      bottom: '0.8in',
      left: '0.8in',
      right: '0.8in'
    },
    printBackground: true
  });
  
  console.log('Closing browser...');
  await browser.close();
  
  console.log('Cleaning up temporary files...');
  fs.unlinkSync(tempHtmlPath);
  
  console.log('PDF Report successfully created at ' + pdfPath);
}

generatePdf().catch(err => {
  console.error('PDF generation failed:', err);
  process.exit(1);
});
