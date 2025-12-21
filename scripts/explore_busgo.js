const puppeteer = require('puppeteer');

/**
 * bus.go.kr 웹사이트 구조 탐색
 */
async function exploreBusGo() {
  console.log('🌐 Launching browser...');

  const browser = await puppeteer.launch({
    headless: false, // 브라우저 창 보기 위해
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    console.log('📱 Navigating to bus.go.kr...');
    await page.goto('https://bus.go.kr', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded!');

    // 페이지 구조 확인
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 검색창 찾기
    const searchBox = await page.$('input[type="text"]');
    if (searchBox) {
      console.log('✅ Found search box');

      // 421 노선 검색
      await searchBox.type('421');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 검색 버튼 클릭 또는 Enter
      await searchBox.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('🔍 Search completed');

      // 스크린샷 저장
      await page.screenshot({ path: '/Users/david/Desktop/기후동행/scripts/screenshot1.png' });
      console.log('📸 Screenshot saved: screenshot1.png');
    }

    // 10초 대기 (수동으로 확인)
    console.log('⏳ Waiting 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

exploreBusGo().catch(console.error);
