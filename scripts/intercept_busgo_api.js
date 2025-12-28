const puppeteer = require('puppeteer');

/**
 * bus.go.kr의 실제 API 엔드포인트 캡처
 * 모든 네트워크 요청을 상세히 모니터링
 */
async function interceptBusGoAPI() {
    console.log('🌐 브라우저 시작...');

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // 모든 네트워크 요청 캡처
    const allRequests = [];
    const allResponses = [];

    page.on('request', request => {
        const url = request.url();
        // 지도 타일 제외
        if (!url.includes('tile') && !url.includes('.png') && !url.includes('.jpg')) {
            allRequests.push({
                url: url,
                method: request.method(),
                headers: request.headers(),
                postData: request.postData()
            });
        }
    });

    page.on('response', async response => {
        const url = response.url();
        // 지도 타일 및 리소스 제외
        if (!url.includes('tile') && !url.includes('.png') && !url.includes('.jpg') &&
            !url.includes('.css') && !url.includes('.js') && !url.includes('gtag')) {

            try {
                const contentType = response.headers()['content-type'] || '';
                if (contentType.includes('json') || contentType.includes('xml')) {
                    const text = await response.text();
                    allResponses.push({
                        url: url,
                        status: response.status(),
                        contentType: contentType,
                        body: text.substring(0, 500) // 처음 500자만
                    });
                }
            } catch (error) {
                // 무시
            }
        }
    });

    try {
        console.log('📡 bus.go.kr 접속 중...');
        await page.goto('https://bus.go.kr', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('\n🔍 노선 "421"번 검색...');

        // 검색창 찾기
        const searchInput = await page.$('#ext-element-104') ||
            await page.$('input[name="mysearchfield2"]');

        if (searchInput) {
            await searchInput.click();
            await new Promise(resolve => setTimeout(resolve, 500));

            await searchInput.type('421', { delay: 100 });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Enter 키로 검색
            await searchInput.press('Enter');

            console.log('⏸️  5초 대기 (API 응답 대기)...');
            await new Promise(resolve => setTimeout(resolve, 5000));

            // 검색 결과 클릭 시도
            console.log('\n🖱️  검색 결과 클릭 시도...');

            // 다양한 셀렉터로 검색 결과 찾기
            const resultSelectors = [
                'div[data-routeid]',
                'div.route-item',
                'div.search-result',
                'div[onclick*="route"]',
                '.x-list-item'
            ];

            for (const selector of resultSelectors) {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    console.log(`✅ 검색 결과 발견: ${selector} (${elements.length}개)`);

                    // 첫 번째 결과 클릭
                    await elements[0].click();
                    console.log('⏸️  5초 대기 (정류소 데이터 로딩)...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    break;
                }
            }
        }

        console.log('\n⏸️  추가 10초 대기 (모든 API 호출 완료)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // 결과 출력
        console.log('\n================================================================================');
        console.log('📡 캡처된 API 요청:');
        console.log('================================================================================');
        allRequests.forEach((req, idx) => {
            console.log(`\n[${idx + 1}] ${req.method} ${req.url}`);
            if (req.postData) {
                console.log(`    POST Data: ${req.postData}`);
            }
        });

        console.log('\n================================================================================');
        console.log('📥 캡처된 API 응답:');
        console.log('================================================================================');
        allResponses.forEach((res, idx) => {
            console.log(`\n[${idx + 1}] ${res.status} ${res.url}`);
            console.log(`    Content-Type: ${res.contentType}`);
            console.log(`    Body: ${res.body}`);
        });

        console.log('\n⏸️  브라우저 유지 (30초, 수동 확인 가능)...');
        await new Promise(resolve => setTimeout(resolve, 30000));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

interceptBusGoAPI().catch(console.error);
