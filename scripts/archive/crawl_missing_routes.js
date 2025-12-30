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
 * Puppeteer로 노선별 정류소 데이터 가져오기
 * bus.go.kr 내부 API 호출
 */
async function getStationsByRoute(page, routeId) {
    try {
        // bus.go.kr 내부 API 직접 호출
        const url = `https://bus.go.kr/sbus/bus/getStaionByRoute.do?routeId=${routeId}`;

        const response = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        if (!response.ok()) {
            return { stations: [], error: `HTTP ${response.status()}` };
        }

        // JSON 응답 파싱
        const bodyText = await page.evaluate(() => document.body.textContent);

        try {
            const data = JSON.parse(bodyText);

            if (data.ResponseVO && data.ResponseVO.code === 0) {
                const stationList = data.ResponseVO.data?.resultList || [];

                const stations = stationList.map(station => ({
                    stationId: station.stationId,
                    sequence: station.stationSeq || station.seq || 0
                }));

                return { stations, error: null };
            } else {
                return { stations: [], error: data.ResponseVO?.message || 'Unknown API error' };
            }
        } catch (parseError) {
            return { stations: [], error: 'JSON parse error' };
        }
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
    console.log('🚀 누락된 기후동행카드 노선 정류소 데이터 크롤링');
    console.log('================================================================================');
    console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}\n`);

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

    console.log('🌐 Launching browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
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

            process.stdout.write(`[${i + 1}/${routes.length}] (${progress}%) ${route_name} (ID: ${route_id}) `);

            // API 호출
            const { stations, error } = await getStationsByRoute(page, route_id);

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

            // 속도 제한 (0.3초 대기)
            await new Promise(resolve => setTimeout(resolve, 300));

            // 50개마다 중간 통계
            if ((i + 1) % 50 === 0) {
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
    console.log('🎉 크롤링 완료!');
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
