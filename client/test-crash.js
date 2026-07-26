import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  const routes = [
    '/',
    '/#/dashboard',
    '/#/dashboard/analytics',
    '/#/dashboard/hotspots',
    '/#/dashboard/network',
    '/#/dashboard/offenders',
    '/#/dashboard/predictions',
    '/#/dashboard/socioeconomic',
    '/#/dashboard/financial',
    '/#/dashboard/reports',
  ];

  for (const route of routes) {
    console.log('Testing route:', route);
    try {
      await page.goto('http://localhost:5173' + route, { waitUntil: 'networkidle2' });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log('Exception visiting', route, e.message);
    }
  }
  
  await browser.close();
})();
