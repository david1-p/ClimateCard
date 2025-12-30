const puppeteer = require('puppeteer');
const { Client } = require('pg');

// DB 설정
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'climate_transport',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1q2w'
};

/**
 * 누락된 노선 조회
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
        LIMIT 10
    `);
    return result.rows;
}

/**
 * 모바일 버전 bus.go.kr에서 노선 정류소 정보 추출
 */
async function scrapeMobileBusGo(page, routeName) {
    try {
        // 모바일 사이트 접속
        console.log(`      → 모바일 사이트 접속 중...`);
        await page.goto('http://bus.go.kr:9595/mBus', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 검색창 찾기
        const searchInput = await page.$('input[name="searchWord"]') ||
            await page.$('#searchWord') ||
            await page.$('input.search');

        if (!searchInput) {
            return { stations: [], error: '검색창 없음' };
        }

        // 노선 검색
        console.log(`      → 노선 "${routeName}" 검색 중...`);
        await searchInput.click();
        await searchInput.type(routeName, { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 1000));
        await searchInput.press('Enter');

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 검색 결과에서 첫 번째 노선 클릭
        const firstRoute = await page.$('a.route') ||
            await page.$('.route-item a') ||
            await page.$('li.route a');

        if (firstRoute) {
            console.log(`      → 노선 상세 페이지 로드 중...`);
            await firstRoute.click();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // 정류소 목록 추출
        console.log(`      → 정류소 데이터 추출 중...`);
        const stations = await page.evaluate(() => {
            const result = [];
            const selectors = [
                '.station-list li',
                '.stop-list li',
                'ul.busstop li',
                'table tr',
                '[data-station]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach((el, idx) => {
                        // 정류소 ID 추출 (다양한 속성 시도)
                        const stationId =
                            el.getAttribute('data-station-id') ||
                            el.getAttribute('data-stid') ||
                            el.querySelector('[data-station-id]')?.getAttribute('data-station-id') ||
                            el.querySelector('a')?.getAttribute('data-station-id');

                        // 링크에서 추출 시도
                        const link = el.querySelector('a');
                        if (link && link.href) {
                            const match = link.href.match(/stationId=(\d+)/);
                            if (match) {
                                result.push({
                                    stationId: match[1],
                                    sequence: idx + 1
                                });
                                return;
                            }
                        }

                        if (stationId) {
                            result.push({
                                stationId: stationId,
                                sequence: idx + 1
                            });
                        }
                    });

                    if (result.length > 0) break;
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
 * DB에 저장
 */
async function insertRouteStations(client, routeId, stations) {
    if (!stations || stations.length === 0) return 0;

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
            // 정류소가 없으면 무시
        }
    }

    return inserted;
}

async function main() {
    console.log('=' * 80);
    console.log('🚀 모바일 bus.go.kr 웹 스크래핑 (테스트: 10개 노선만)');
    console.log('=' * 80);

    // DB 연결
    const client = new Client(dbConfig);
    await client.connect();
    console.log('✅ DB 연결 성공\n');

    // 누락된 노선 조회 (테스트: 10개만)
    const routes = await getMissingRoutes(client);
    console.log(`✅ ${routes.length}개 노선 테스트\n`);

    // 브라우저 시작
    console.log('🌐 브라우저 시작...');
    const browser = await puppeteer.launch({
        headless: false, // 디버깅용
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 375, height: 667 }); // 모바일 화면 크기
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');

    console.log('✅ 브라우저 준비 완료\n');
    console.log('=' * 80);

    let successCount = 0;
    let failCount = 0;
    let totalStations = 0;

    try {
        for (let i = 0; i < routes.length; i++) {
            const { route_id, route_name } = routes[i];

            console.log(`\n[${i + 1}/${routes.length}] ${route_name} (ID: ${route_id})`);

            // 웹 스크래핑
            const { stations, error } = await scrapeMobileBusGo(page, route_name);

            if (error) {
                console.log(`   ❌ 오류: ${error}`);
                failCount++;
            } else if (stations.length === 0) {
                console.log(`   ⚠️  정류소 없음`);
                failCount++;
            } else {
                // DB 저장
                const inserted = await insertRouteStations(client, route_id, stations);
                console.log(`   ✅ ${inserted}개 정류소 저장`);
                successCount++;
                totalStations += inserted;
            }

            // 대기
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    } catch (error) {
        console.error('\n❌ Error:', error);
    } finally {
        await browser.close();
        await client.end();
    }

    console.log('\n' + '=' * 80);
    console.log('📊 테스트 결과:');
    console.log(`   - 성공: ${successCount}개`);
    console.log(`   - 실패: ${failCount}개`);
    console.log(`   - 총 정류소: ${totalStations}개`);
    console.log('=' * 80);
}

main().catch(console.error);
