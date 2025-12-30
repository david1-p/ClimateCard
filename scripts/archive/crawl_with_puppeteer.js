const puppeteer = require('puppeteer');
const fs = require('fs').promises;
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
 * DB에서 모든 노선 조회
 */
async function getAllRoutes(client) {
  const result = await client.query('SELECT route_id, route_name FROM routes ORDER BY route_id LIMIT 50;');
  return result.rows;
}

/**
 * Puppeteer로 노선별 정류소 데이터 가져오기
 */
async function getStationsByRoute(page, routeId) {
  try {
    // bus.go.kr API 직접 호출
    const url = `https://bus.go.kr/sbus/bus/getStaionByRoute.do?routeId=${routeId}`;

    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (!response.ok()) {
      console.log(`  ⚠️  HTTP ${response.status()}`);
      return [];
    }

    // 페이지 내용 가져오기
    const content = await page.content();

    // JSON 추출 시도
    const bodyText = await page.evaluate(() => document.body.textContent);

    try {
      const data = JSON.parse(bodyText);

      // ResponseVO 구조 확인
      if (data.ResponseVO && data.ResponseVO.code === 0) {
        const stationList = data.ResponseVO.data?.resultList || [];

        return stationList.map(station => ({
          stationId: station.stationId,
          sequence: station.stationSeq || station.seq || 0,
          direction: station.direction || ''
        }));
      } else {
        console.log(`  ⚠️  API Error: ${data.ResponseVO?.message || 'Unknown'}`);
        return [];
      }
    } catch (parseError) {
      console.log(`  ⚠️  JSON parse error`);
      return [];
    }
  } catch (error) {
    console.log(`  ⚠️  Request error: ${error.message}`);
    return [];
  }
}

/**
 * route_stations 테이블에 데이터 삽입
 */
async function insertRouteStation(client, routeId, stationId, sequence, direction) {
  try {
    await client.query(`
      INSERT INTO route_stations (route_id, station_id, sequence, direction)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (route_id, station_id, sequence) DO NOTHING;
    `, [routeId, stationId, sequence, direction]);
    return true;
  } catch (error) {
    console.log(`    ⚠️  Insert error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('📡 Connecting to database...');

  const client = new Client(dbConfig);
  await client.connect();

  console.log('🌐 Launching browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // User-Agent 설정
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    // 모든 노선 조회 (일단 처음 50개만 테스트)
    const routes = await getAllRoutes(client);
    console.log(`✅ Found ${routes.length} routes in DB (testing first 50)\n`);

    let totalStations = 0;
    let successCount = 0;

    for (let i = 0; i < routes.length; i++) {
      const { route_id, route_name } = routes[i];
      console.log(`[${i + 1}/${routes.length}] Processing ${route_name} (ID: ${route_id})...`);

      // API 호출
      const stations = await getStationsByRoute(page, route_id);

      if (stations.length > 0) {
        let inserted = 0;
        for (const station of stations) {
          if (await insertRouteStation(client, route_id, station.stationId, station.sequence, station.direction)) {
            inserted++;
          }
        }

        console.log(`  ✅ Inserted ${inserted} stations`);
        totalStations += inserted;
        successCount++;
      } else {
        console.log(`  ⚠️  No stations found`);
      }

      // 속도 제한 (0.2초 대기)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`\n🎉 완료!`);
    console.log(`   - 처리된 노선: ${successCount}/${routes.length}`);
    console.log(`   - 총 정류소 관계: ${totalStations}개`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
    await client.end();
  }
}

main().catch(console.error);
