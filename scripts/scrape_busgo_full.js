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
 * DB에서 모든 노선 조회
 */
async function getAllRoutes(client) {
  const result = await client.query('SELECT route_id, route_name FROM routes ORDER BY route_id LIMIT 10;');
  return result.rows;
}

/**
 * Puppeteer로 노선별 정류소 데이터 가져오기
 * bus.go.kr 웹사이트에서 직접 검색
 */
async function getStationsByRouteWeb(page, routeName) {
  try {
    // bus.go.kr 메인 페이지 접속
    await page.goto('https://bus.go.kr', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // 검색창 찾기
    const searchBox = await page.$('input[name="keyword"]') || await page.$('input[type="text"]');

    if (!searchBox) {
      console.log('  ⚠️  Search box not found');
      return [];
    }

    // 기존 내용 지우기
    await searchBox.click({ clickCount: 3 });
    await searchBox.press('Backspace');

    // 노선명 입력
    await searchBox.type(routeName);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Enter 키 또는 검색 버튼 클릭
    await searchBox.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 검색 결과에서 첫 번째 노선 클릭
    const firstResult = await page.$('.resultBox li') || await page.$('.busInfo');

    if (!firstResult) {
      console.log('  ⚠️  No search results found');
      return [];
    }

    await firstResult.click();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 정류소 목록 추출
    const stations = await page.evaluate(() => {
      const stationElements = document.querySelectorAll('.stationList li, .busstop_list li, table.tbl_list tbody tr');
      const result = [];

      stationElements.forEach((el, index) => {
        // 정류소 ID 추출 (data-station-id, data-stid 등)
        const stationId = el.getAttribute('data-station-id') ||
                          el.getAttribute('data-stid') ||
                          el.querySelector('[data-station-id]')?.getAttribute('data-station-id');

        // 정류소명 추출
        const stationName = el.querySelector('.station_name, .busstop_name, td')?.textContent.trim();

        if (stationId) {
          result.push({
            stationId: stationId,
            sequence: index + 1,
            direction: ''
          });
        }
      });

      return result;
    });

    return stations;

  } catch (error) {
    console.log(`  ⚠️  Scraping error: ${error.message}`);
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // User-Agent 설정
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    // 모든 노선 조회 (일단 처음 10개만 테스트)
    const routes = await getAllRoutes(client);
    console.log(`✅ Found ${routes.length} routes in DB (testing first 10)\n`);

    let totalStations = 0;
    let successCount = 0;

    for (let i = 0; i < routes.length; i++) {
      const { route_id, route_name } = routes[i];
      console.log(`[${i + 1}/${routes.length}] Processing ${route_name} (ID: ${route_id})...`);

      // 웹 스크래핑
      const stations = await getStationsByRouteWeb(page, route_name);

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

      // 속도 제한 (2초 대기)
      await new Promise(resolve => setTimeout(resolve, 2000));
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
