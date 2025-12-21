const puppeteer = require('puppeteer');
const fs = require('fs').promises;

/**
 * bus.go.kr 검색 후 DOM 구조 상세 분석
 */
async function exploreDOMStructure() {
  console.log('🌐 Launching browser...');

  const browser = await puppeteer.launch({
    headless: false,
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
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 검색창 찾기
    const searchBox = await page.$('input[type="text"]');
    if (searchBox) {
      console.log('✅ Found search box');

      // 421 노선 검색
      await searchBox.type('421');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await searchBox.press('Enter');
      console.log('🔍 Search submitted, waiting 5 seconds...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      // DOM 구조 분석
      console.log('\n📊 Analyzing DOM structure...\n');

      const domInfo = await page.evaluate(() => {
        const info = {};

        // 다양한 셀렉터 시도
        const selectors = [
          '.resultBox',
          '.resultBox li',
          '.busInfo',
          '.bus_list',
          '.search_result',
          'ul[class*="result"]',
          'div[class*="result"]',
          '.route_info',
          '.bus_route',
          'a[href*="route"]',
          'div[id*="result"]',
          'ul[id*="result"]'
        ];

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            info[selector] = {
              count: elements.length,
              samples: Array.from(elements).slice(0, 2).map(el => ({
                tag: el.tagName,
                classes: el.className,
                id: el.id,
                text: el.textContent.trim().substring(0, 100),
                html: el.outerHTML.substring(0, 200)
              }))
            };
          }
        });

        // body의 모든 직계 자식 div들 확인
        const bodyDivs = document.querySelectorAll('body > div');
        info['body_children'] = {
          count: bodyDivs.length,
          samples: Array.from(bodyDivs).map(el => ({
            tag: el.tagName,
            classes: el.className,
            id: el.id
          }))
        };

        return info;
      });

      console.log('Found elements:');
      console.log(JSON.stringify(domInfo, null, 2));

      // HTML 저장
      const html = await page.content();
      await fs.writeFile('/Users/david/Desktop/기후동행/scripts/page_source.html', html);
      console.log('\n📄 Saved full HTML to page_source.html');

      // 스크린샷
      await page.screenshot({ path: '/Users/david/Desktop/기후동행/scripts/screenshot_detailed.png', fullPage: true });
      console.log('📸 Screenshot saved: screenshot_detailed.png');
    }

    // 10초 대기
    console.log('\n⏳ Waiting 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

exploreDOMStructure().catch(console.error);
