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
    `);
    return result.rows;
}

/**
 * bus.go.kr 앱에서 노선의 정류소 정보 추출
 */
async function extractStationsFromBusGoApp(page, routeName, isFirstSearch) {
    try {
        // 첫 검색이 아니면 홈 버튼 클릭으로 초기화
        if (!isFirstSearch) {
            console.log(`      → 홈으로 돌아가기...`);
            try {
                // 홈 버튼 클릭 시도
                const homeButton = await page.$('button[title*="Home"]') ||
                                  await page.$('.home-button') ||
                                  await page.$('#ext-element-19');

                if (homeButton) {
                    await homeButton.click();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // 홈 버튼을 찾지 못하면 페이지 새로고침
                    await page.reload({ waitUntil: 'networkidle2' });
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            } catch (err) {
                // 실패하면 페이지 재로드
                await page.goto('https://bus.go.kr/app/#viewpage/1000001/main.nearbusinfo/1/title=Home%20버스정보', {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } else {
            console.log(`      → bus.go.kr 앱 페이지로 이동...`);
            // 첫 검색일 때만 페이지 이동
            await page.goto('https://bus.go.kr/app/#viewpage/1000001/main.nearbusinfo/1/title=Home%20버스정보', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // 검색창 찾기 (이전 테스트에서 확인한 셀렉터)
        console.log(`      → 검색창에 "${routeName}" 입력...`);

        const searchInput = await page.$('#ext-element-104') ||
                           await page.$('input[name="mysearchfield2"]');

        if (!searchInput) {
            return { stations: [], error: '검색창을 찾을 수 없음' };
        }

        // 기존 텍스트 지우고 노선명 입력
        await searchInput.click({ clickCount: 3 });
        await new Promise(resolve => setTimeout(resolve, 300));
        await searchInput.type(routeName, { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Enter로 검색
        await searchInput.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log(`      → 검색 결과 대기 중...`);

        // 검색 결과 리스트가 나타날 때까지 대기
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 검색 결과에서 노선 항목 찾기 (다양한 셀렉터 시도)
        const routeItems = await page.evaluate((searchRoute) => {
            const items = [];

            // ExtJS 구조에서 검색 결과 찾기
            const possibleSelectors = [
                '.x-list-item',
                '.x-dataview-item',
                '[data-routeid]',
                '.route-item',
                '.search-result-item'
            ];

            for (const selector of possibleSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach((el, idx) => {
                        const text = el.textContent || '';
                        if (text.includes(searchRoute)) {
                            items.push({
                                index: idx,
                                selector: selector,
                                text: text.substring(0, 50)
                            });
                        }
                    });
                    if (items.length > 0) break;
                }
            }

            return items;
        }, routeName);

        if (routeItems.length === 0) {
            return { stations: [], error: '검색 결과 없음' };
        }

        console.log(`      → 검색 결과 ${routeItems.length}개 발견, 첫 번째 클릭...`);

        // 첫 번째 검색 결과 클릭
        const firstItemSelector = routeItems[0].selector;
        await page.click(firstItemSelector);
        await new Promise(resolve => setTimeout(resolve, 4000));

        console.log(`      → 정류소 목록 추출 중...`);

        // 정류소 목록 추출
        const stations = await page.evaluate(() => {
            const result = [];

            // ExtJS 리스트 구조에서 정류소 찾기
            const selectors = [
                '.x-list-item',
                '.station-item',
                '[data-stationid]',
                '.busstop-item',
                'div[class*="station"]',
                'div[class*="stop"]'
            ];

            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);

                if (elements.length > 5) { // 최소 5개 이상이어야 정류소 목록일 가능성
                    elements.forEach((el, idx) => {
                        // 정류소 ID 추출 시도
                        const stationId =
                            el.getAttribute('data-stationid') ||
                            el.getAttribute('data-station-id') ||
                            el.getAttribute('data-id');

                        // DOM에서 숫자 패턴 찾기 (정류소 ID는 보통 숫자)
                        const text = el.textContent || '';
                        const numberMatch = text.match(/\d{8,}/); // 8자리 이상 숫자

                        if (stationId) {
                            result.push({
                                stationId: stationId,
                                sequence: idx + 1,
                                name: text.substring(0, 30)
                            });
                        } else if (numberMatch) {
                            result.push({
                                stationId: numberMatch[0],
                                sequence: idx + 1,
                                name: text.substring(0, 30)
                            });
                        }
                    });

                    if (result.length > 0) break;
                }
            }

            return result;
        });

        console.log(`      → ${stations.length}개 정류소 발견`);

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
            // 정류소가 stations 테이블에 없으면 무시
        }
    }

    return inserted;
}

async function main() {
    console.log('================================================================================');
    console.log('🚀 bus.go.kr 웹 앱에서 정류소 데이터 추출');
    console.log('================================================================================');
    console.log(`⏰ 시작 시간: ${new Date().toLocaleString('ko-KR')}\n`);

    // DB 연결
    const client = new Client(dbConfig);
    await client.connect();
    console.log('✅ DB 연결 성공\n');

    // 누락된 노선 조회
    console.log('📋 정류소 연결이 없는 기후동행카드 노선 조회...');
    const routes = await getMissingRoutes(client);
    console.log(`✅ 총 ${routes.length}개 노선 발견\n`);

    if (routes.length === 0) {
        console.log('🎉 모든 노선에 정류소 연결이 있습니다!');
        await client.end();
        return;
    }

    // 테스트: 처음 5개만 시도
    const testRoutes = routes.slice(0, 5);
    console.log(`📝 테스트: 처음 ${testRoutes.length}개 노선만 시도\n`);

    // 브라우저 시작
    console.log('🌐 브라우저 시작...');
    const browser = await puppeteer.launch({
        headless: false, // 디버깅을 위해 브라우저 표시
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1920,1080'
        ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    console.log('✅ 브라우저 준비 완료\n');
    console.log('================================================================================');

    let successCount = 0;
    let failCount = 0;
    let totalStations = 0;

    try {
        for (let i = 0; i < testRoutes.length; i++) {
            const { route_id, route_name, route_type } = testRoutes[i];
            const progress = ((i + 1) / testRoutes.length * 100).toFixed(1);

            console.log(`\n[${i + 1}/${testRoutes.length}] (${progress}%) ${route_name} (ID: ${route_id})`);

            // 정류소 데이터 추출 (첫 검색 여부 전달)
            const { stations, error } = await extractStationsFromBusGoApp(page, route_name, i === 0);

            if (error) {
                console.log(`   ❌ 오류: ${error}`);
                failCount++;
            } else if (stations.length === 0) {
                console.log(`   ⚠️  정류소 없음`);
                failCount++;
            } else {
                // 샘플 출력
                console.log(`   정류소 샘플 (처음 3개):`);
                stations.slice(0, 3).forEach(s => {
                    console.log(`     - ${s.sequence}. ${s.name} (ID: ${s.stationId})`);
                });

                // DB 저장
                const inserted = await insertRouteStations(client, route_id, stations);

                if (inserted > 0) {
                    console.log(`   ✅ ${inserted}개 정류소 저장 완료`);
                    successCount++;
                    totalStations += inserted;
                } else {
                    console.log(`   ⚠️  저장 실패 (정류소가 stations 테이블에 없음)`);
                    failCount++;
                }
            }

            // 속도 제한 (페이지 로드 시간 고려)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 성공했다면 나머지도 진행할지 물어보기
        if (successCount > 0) {
            console.log('\n================================================================================');
            console.log(`✅ 테스트 성공! ${successCount}개 노선 처리 완료`);
            console.log('================================================================================');
            console.log(`\n📝 전체 ${routes.length}개 노선을 처리하려면 다음 명령어를 실행하세요:`);
            console.log(`   PROCESS_ALL=true node scripts/extract_from_busgo_app.js`);
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
    } finally {
        await browser.close();
        await client.end();
    }

    // 최종 통계
    console.log('\n================================================================================');
    console.log('📊 테스트 결과:');
    console.log('================================================================================');
    console.log(`  - 시도한 노선: ${testRoutes.length}개`);
    console.log(`  - 성공: ${successCount}개`);
    console.log(`  - 실패: ${failCount}개`);
    console.log(`  - 총 정류소 저장: ${totalStations}개`);
    console.log('================================================================================');
}

main().catch(console.error);
