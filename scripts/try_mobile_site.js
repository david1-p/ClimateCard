const puppeteer = require('puppeteer');

/**
 * 모바일 버전 bus.go.kr 시도
 */
async function tryMobileSite() {
  console.log('🌐 Launching browser...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 모바일 기기로 설정
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
  await page.setViewport({ width: 375, height: 667 });

  const sitesToTry = [
    'https://m.bus.go.kr',
    'https://bus.go.kr/m',
    'https://bus.go.kr:9595/mBus',  // 모바일 포트 (HTML에서 발견)
    'http://m.bus.go.kr',
  ];

  for (const url of sitesToTry) {
    try {
      console.log(`\n📱 Trying: ${url}`);
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 10000
      });

      console.log(`   Status: ${response.status()}`);
      console.log(`   Final URL: ${page.url()}`);

      // 스크린샷 저장
      const filename = url.replace(/[^a-zA-Z0-9]/g, '_') + '.png';
      await page.screenshot({ path: `/Users/david/Desktop/기후동행/scripts/${filename}` });
      console.log(`   📸 Saved: ${filename}`);

      // 페이지 제목
      const title = await page.title();
      console.log(`   Title: ${title}`);

      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n⏳ Keeping browser open for 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  await browser.close();
}

tryMobileSite().catch(console.error);
