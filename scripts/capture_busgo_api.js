const puppeteer = require('puppeteer');

/**
 * bus.go.kr에서 노선 검색 시 호출되는 실제 API 엔드포인트 캡처
 * 목표: 정류소 목록을 가져오는 API URL과 파라미터 찾기
 */
async function captureBusGoAPI() {
    console.log('🌐 브라우저 시작...');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 모든 네트워크 요청 캡처
    const apiRequests = [];

    page.on('request', request => {
        const url = request.url();
        const method = request.method();

        // API 요청으로 보이는 것만 캡처
        if (url.includes('/api/') || url.includes('/sbus/') ||
            url.includes('.do') || url.includes('/rest/') ||
            (method === 'POST' && !url.includes('.js') && !url.includes('.css'))) {

            apiRequests.push({
                method: method,
                url: url,
                postData: request.postData(),
                headers: request.headers()
            });
        }
    });

    try {
        console.log('\n📡 bus.go.kr 앱 접속...');
        await page.goto('https://bus.go.kr/app/#viewpage/1000001/main.nearbusinfo/1/title=Home%20버스정보', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('\n🔍 테스트 노선 "421"번 검색 중...');
        console.log('   (수동으로 검색창에 "421"를 입력하고 Enter를 누르세요)');
        console.log('   (검색 결과에서 노선을 클릭하세요)');
        console.log('   (정류소 목록이 표시되면 확인하세요)');
        console.log('\n⏸️  60초 대기 중... (이 시간 동안 수동 조작하세요)');

        await new Promise(resolve => setTimeout(resolve, 60000));

        console.log('\n================================================================================');
        console.log('📡 캡처된 API 요청:');
        console.log('================================================================================');

        if (apiRequests.length === 0) {
            console.log('⚠️  캡처된 API 요청이 없습니다.');
        } else {
            apiRequests.forEach((req, idx) => {
                console.log(`\n[${idx + 1}] ${req.method} ${req.url}`);

                if (req.postData) {
                    console.log(`    POST Data: ${req.postData.substring(0, 200)}`);
                }

                // 중요한 헤더만 출력
                if (req.headers['content-type']) {
                    console.log(`    Content-Type: ${req.headers['content-type']}`);
                }
            });

            // 정류소 관련 API 찾기
            console.log('\n================================================================================');
            console.log('🎯 정류소 관련 API (추정):');
            console.log('================================================================================');

            const stationAPIs = apiRequests.filter(req =>
                req.url.toLowerCase().includes('station') ||
                req.url.toLowerCase().includes('stop') ||
                req.url.toLowerCase().includes('staion') || // 오타도 체크
                req.url.toLowerCase().includes('route')
            );

            if (stationAPIs.length > 0) {
                stationAPIs.forEach((req, idx) => {
                    console.log(`\n[${idx + 1}] ${req.method} ${req.url}`);
                    if (req.postData) {
                        console.log(`    Data: ${req.postData}`);
                    }
                });

                console.log('\n💡 위 API 중 하나를 직접 호출하면 정류소 데이터를 가져올 수 있습니다!');
            } else {
                console.log('\n⚠️  정류소 관련 API를 찾지 못했습니다.');
                console.log('   모든 캡처된 API를 위에서 확인하세요.');
            }
        }

        console.log('\n⏸️  브라우저 유지 (추가 10초)...');
        await new Promise(resolve => setTimeout(resolve, 10000));

    } catch (error) {
        console.error('\n❌ Error:', error);
    } finally {
        await browser.close();
    }
}

captureBusGoAPI().catch(console.error);
