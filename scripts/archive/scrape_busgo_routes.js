const puppeteer = require('puppeteer');
const { Client } = require('pg');

// DB 연결 설정
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'climate_transport',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1q2w'
};

/**
 * DB에서 정류소 연결이 없는 기후동행카드 적용 노선만 조회
 */
async function getMissingRoutes(client) {
    const result = await client.query(`
    SELECT r.route_id, r.route_name, r.route_type
    FROM routes r
    WHERE r.climate_card_eligible = true
    AND NOT EXISTS (
      SELECT 1 FROM route_stations rs WHERE rs.route_id = r.route_id
    )
    ORDER BY r.route_type, r.route_name
  `);
    return result.rows;
}

/**
 * bus.go.kr 웹사이트에서 노선 검색 후 정류소 목록 추출
 */
async function scrapeStationsFromWeb(page, routeName, routeId) {
    try {
        // bus.go.kr 메인 페이지로 이동
        await page.goto('https://bus.go.kr', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 1500));

        // 검색창 찾기 및 입력
        const searchInput = await page.$('#txtSearch') ||
            await page.$('input[name="searchWord"]') ||
            await page.$('input.search_input');

        if (!searchInput) {
            return { stations: [], error: '검색창을 찾을 수 없습니다' };
        }

        // 기존 텍스트 지우고 노선명 입력
        await searchInput.click({ clickCount: 3 });
        await searchInput.press('Backspace');
        await searchInput.type(routeName, { delay: 50 });
        await new Promise(resolve => setTimeout(resolve, 500));

        // 검색 실행 (Enter 키)
        await searchInput.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 검색 결과에서 노선 찾기
        // bus.go.kr의 검색 결과는 다양한 형태일 수 있음
        const routeLinks = await page.$$('a[href*="busRouteId"], .bus_route_list a, .search_result a, a.route_link');

        if (routeLinks.length === 0) {
            // 노선 탭 클릭 시도
            const routeTab = await page.$('a[data-type="bus"], .tab_bus, #tabBus');
            if (routeTab) {
                await routeTab.click();
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // 첫 번째 노선 결과 클릭
        const firstRoute = await page.$('.bus_list li a, .route_item a, .search_result li a');
        if (firstRoute) {
            await firstRoute.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 정류소 목록 추출
        const stations = await page.evaluate(() => {
            const result = [];

            // 다양한 셀렉터 시도
            const selectors = [
                '.station_list li',
                '.busstop_list li',
                'table.tbl_station tbody tr',
                '.route_station_list li',
                '[data-station-id]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach((el, idx) => {
                        const stationId = el.getAttribute('data-station-id') ||
                            el.getAttribute('data-stid') ||
                            el.querySelector('[data-station-id]')?.getAttribute('data-station-id') ||
                            el.querySelector('a')?.href?.match(/stationId=(\d+)/)?.[1];

                        if (stationId) {
                            result.push({
                                stationId: stationId,
                                sequence: idx + 1
                            });
                        }
                    });
                    break;
                }
            }

            return result;
        });

        return { stations, error: null };

    } catch (error) {
        return { stations: [], error: error.message };
    }
}

/**
 * route_stations 테이블에 데이터 삽입
 */
async function insertRouteStations(client, routeId, stations) {
    let inserted = 0;

    for (const station of stations) {
        try {
            await client.query(`
        INSERT INTO route_stations (route_id, station_id, sequence)
        VALUES ($1, $2, $3)
        ON CONFLICT (route_id, station_id) DO UPDATE SET sequence = $3
      `, [routeId, station.stationId, station.sequence]);
            inserted++;
        } catch (error) {
            // 정류소가 stations 테이블에 없는 경우 무시
        }
    }

    return inserted;
}

async function main() {
    console.log('================================================================================');
    console.log('🚀 bus.go.kr 웹 스크래핑으로 정류소 데이터 수집');
    console.log('================================================================================');
    console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}\n`);

    // DB 연결
    console.log('📡 Connecting to database...');
    const client = new Client(dbConfig);
    await client.connect();
    console.log('✅ DB 연결 성공\n');

    // 누락된 노선 조회
    console.log('📋 정류소 연결이 없는 기후동행카드 노선 조회 중...');
    const routes = await getMissingRoutes(client);
    console.log(`✅ 총 ${routes.length}개 노선 발견\n`);

    if (routes.length === 0) {
        console.log('🎉 모든 노선에 정류소 연결이 있습니다!');
        await client.end();
        return;
    }

    // 브라우저 시작 (headless: false로 디버깅 가능)
    console.log('🌐 Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('✅ 브라우저 시작\n');
    console.log('================================================================================');

    let totalStations = 0;
    let successCount = 0;
    let failCount = 0;

    try {
        for (let i = 0; i < routes.length; i++) {
            const { route_id, route_name, route_type } = routes[i];
            const progress = ((i + 1) / routes.length * 100).toFixed(1);

            process.stdout.write(`[${i + 1}/${routes.length}] (${progress}%) ${route_name} `);

            // 웹 스크래핑
            const { stations, error } = await scrapeStationsFromWeb(page, route_name, route_id);

            if (error) {
                console.log(`⚠️  ${error}`);
                failCount++;
            } else if (stations.length === 0) {
                console.log('ℹ️  정류소 없음');
                failCount++;
            } else {
                // DB 저장
                const inserted = await insertRouteStations(client, route_id, stations);

                if (inserted > 0) {
                    console.log(`✅ ${inserted}개 정류소`);
                    totalStations += inserted;
                    successCount++;
                } else {
                    console.log('⚠️  저장 실패');
                    failCount++;
                }
            }

            // 속도 제한 (2초 대기 - 웹 스크래핑이므로 더 길게)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 20개마다 중간 통계
            if ((i + 1) % 20 === 0) {
                console.log('\n────────────────────────────────────────────────────────────────────────────────');
                console.log(`📊 중간 통계 (처리: ${i + 1}/${routes.length})`);
                console.log(`   성공: ${successCount}, 실패: ${failCount}, 정류소: ${totalStations}개`);
                console.log('────────────────────────────────────────────────────────────────────────────────\n');
            }
        }
    } catch (error) {
        console.error('\n❌ Error:', error);
    } finally {
        await browser.close();
        await client.end();
    }

    // 최종 통계
    console.log('\n================================================================================');
    console.log('🎉 스크래핑 완료!');
    console.log('================================================================================');
    console.log(`⏰ 종료 시간: ${new Date().toLocaleString('ko-KR')}\n`);
    console.log('📊 최종 통계:');
    console.log(`   - 처리 대상: ${routes.length}개 노선`);
    console.log(`   - 성공: ${successCount}개`);
    console.log(`   - 실패: ${failCount}개`);
    console.log(`   - 총 정류소 연결: ${totalStations}개`);
    console.log('================================================================================');
}

main().catch(console.error);
