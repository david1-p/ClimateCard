const puppeteer = require('puppeteer');

/**
 * bus.go.kr 네트워크 요청 가로채기
 */
async function interceptNetwork() {
  console.log('🌐 Launching browser...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // 네트워크 요청 감지
  const apiCalls = [];

  page.on('response', async (response) => {
    const url = response.url();

    // API 호출로 보이는 요청만 기록
    if (url.includes('bus.go.kr') && (
      url.includes('api') ||
      url.includes('Route') ||
      url.includes('Station') ||
      url.includes('Info') ||
      url.includes('.do')
    )) {
      const status = response.status();
      const method = response.request().method();

      let responseData = null;
      try {
        const contentType = response.headers()['content-type'] || '';
        if (contentType.includes('json') || contentType.includes('xml')) {
          responseData = await response.text();
        }
      } catch (e) {
        // Ignore errors reading response
      }

      apiCalls.push({
        method,
        url,
        status,
        contentType: response.headers()['content-type'],
        preview: responseData ? responseData.substring(0, 500) : null
      });

      console.log(`\n🌐 API Call: ${method} ${url}`);
      console.log(`   Status: ${status}`);
      if (responseData) {
        console.log(`   Response preview: ${responseData.substring(0, 200)}`);
      }
    }
  });

  try {
    console.log('📱 Navigating to bus.go.kr...');
    await page.goto('https://bus.go.kr', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded!');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 검색창 찾기
    const searchBox = await page.$('input[type="text"]');
    if (searchBox) {
      console.log('✅ Found search box');
      console.log('🔍 Searching for route 421...\n');

      await searchBox.type('421');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await searchBox.press('Enter');

      // 충분히 기다려서 모든 API 호출 캡처
      console.log('⏳ Waiting 10 seconds to capture all API calls...\n');
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log(`\n📊 Total API calls captured: ${apiCalls.length}`);

      // JSON으로 저장
      const fs = require('fs').promises;
      await fs.writeFile(
        '/Users/david/Desktop/기후동행/scripts/api_calls.json',
        JSON.stringify(apiCalls, null, 2)
      );
      console.log('💾 Saved to api_calls.json');
    }

    // 추가로 5초 대기
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

interceptNetwork().catch(console.error);
