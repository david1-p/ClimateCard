const puppeteer = require('puppeteer');

/**
 * bus.go.kr 사이트 구조 테스트
 * 실제 웹페이지에서 노선 검색 과정을 확인
 */
async function testBusGoStructure() {
    console.log('🌐 브라우저 시작...');

    const browser = await puppeteer.launch({
        headless: false, // 디버깅을 위해 브라우저 화면 표시
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    try {
        console.log('📡 bus.go.kr 접속 중...');
        await page.goto('https://bus.go.kr', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 현재 URL 확인
        const currentUrl = page.url();
        console.log(`✅ 현재 URL: ${currentUrl}`);

        // 페이지 HTML 구조 분석
        const pageStructure = await page.evaluate(() => {
            const result = {
                title: document.title,
                searchInputs: [],
                buttons: [],
                links: [],
                scripts: []
            };

            // 검색창 찾기
            const inputs = document.querySelectorAll('input[type="text"], input[type="search"], input.search');
            inputs.forEach(input => {
                result.searchInputs.push({
                    id: input.id,
                    name: input.name,
                    class: input.className,
                    placeholder: input.placeholder
                });
            });

            // 버튼 찾기
            const buttons = document.querySelectorAll('button, input[type="submit"]');
            buttons.forEach((btn, idx) => {
                if (idx < 10) { // 처음 10개만
                    result.buttons.push({
                        id: btn.id,
                        class: btn.className,
                        text: btn.textContent?.trim().substring(0, 50)
                    });
                }
            });

            // 링크 찾기 (노선 관련)
            const links = document.querySelectorAll('a[href*="route"], a[href*="bus"]');
            links.forEach((link, idx) => {
                if (idx < 10) {
                    result.links.push({
                        href: link.href,
                        text: link.textContent?.trim().substring(0, 50)
                    });
                }
            });

            // 스크립트 태그 확인
            const scripts = document.querySelectorAll('script[src]');
            scripts.forEach(script => {
                result.scripts.push(script.src);
            });

            return result;
        });

        console.log('\n📋 페이지 구조 분석 결과:');
        console.log(JSON.stringify(pageStructure, null, 2));

        // 네트워크 요청 모니터링
        console.log('\n🔍 노선 "421"번 검색 시도...');

        // 네트워크 요청 캡처
        const requests = [];
        page.on('request', request => {
            if (request.url().includes('api') || request.url().includes('ajax')) {
                requests.push({
                    url: request.url(),
                    method: request.method()
                });
            }
        });

        // 검색창 찾기 및 입력
        const searchInput = await page.$('#keyword') ||
            await page.$('input[name="keyword"]') ||
            await page.$('input[placeholder*="검색"]') ||
            await page.$('input.search-input');

        if (searchInput) {
            console.log('✅ 검색창 발견!');
            await searchInput.type('421', { delay: 100 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Enter 키 입력
            await searchInput.press('Enter');
            await new Promise(resolve => setTimeout(resolve, 3000));

            console.log('\n📡 캡처된 API 요청:');
            console.log(JSON.stringify(requests, null, 2));

            // 검색 결과 확인
            const searchResults = await page.evaluate(() => {
                const results = [];
                const selectors = [
                    '.route-list li',
                    '.bus-list li',
                    '.search-result li',
                    '[data-route-id]',
                    'a[href*="routeId"]'
                ];

                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        elements.forEach((el, idx) => {
                            if (idx < 5) {
                                results.push({
                                    selector: selector,
                                    html: el.outerHTML.substring(0, 200)
                                });
                            }
                        });
                        break;
                    }
                }

                return results;
            });

            console.log('\n🔍 검색 결과:');
            console.log(JSON.stringify(searchResults, null, 2));
        } else {
            console.log('❌ 검색창을 찾을 수 없습니다!');
        }

        console.log('\n⏸️  10초 대기 (수동으로 페이지 확인 가능)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

testBusGoStructure().catch(console.error);
