const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * 서울 열린데이터광장에서 '서울시 버스운행노선 정보' 엑셀 파일 자동 다운로드
 * https://data.seoul.go.kr/dataList/OA-15066/F/1/datasetView.do
 */
async function downloadSeoulBusData() {
    const downloadDir = path.resolve(__dirname, '../data');

    // data 디렉토리 생성
    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    console.log('🌐 브라우저 시작...');

    const browser = await puppeteer.launch({
        headless: false, // 디버깅을 위해 브라우저 표시
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const page = await browser.newPage();

    // 다운로드 경로 설정
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadDir
    });

    console.log(`📁 다운로드 디렉토리: ${downloadDir}`);

    try {
        console.log('\n📡 서울 열린데이터광장 접속 중...');
        await page.goto('https://data.seoul.go.kr/dataList/OA-15066/F/1/datasetView.do', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('✅ 페이지 로드 완료');

        // 페이지 구조 분석
        const downloadButtons = await page.evaluate(() => {
            const buttons = [];
            const allButtons = document.querySelectorAll('button, a, .download, .btn');

            allButtons.forEach((btn, idx) => {
                const text = btn.textContent?.trim() || '';
                const href = btn.href || '';
                const onclick = btn.getAttribute('onclick') || '';

                if (text.includes('다운로드') || text.includes('download') ||
                    href.includes('download') || onclick.includes('download')) {
                    buttons.push({
                        index: idx,
                        text: text.substring(0, 50),
                        href: href,
                        onclick: onclick.substring(0, 100),
                        className: btn.className,
                        id: btn.id
                    });
                }
            });

            return buttons;
        });

        console.log('\n🔍 발견된 다운로드 버튼:');
        downloadButtons.forEach((btn, idx) => {
            console.log(`\n[${idx + 1}]`);
            console.log(`  텍스트: ${btn.text}`);
            console.log(`  Class: ${btn.className}`);
            console.log(`  ID: ${btn.id}`);
        });

        // 파일 목록 테이블 확인
        const fileList = await page.evaluate(() => {
            const files = [];
            const rows = document.querySelectorAll('table tr, .file-list tr, .data-list tr');

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length > 0) {
                    const text = Array.from(cells).map(cell => cell.textContent?.trim()).join(' | ');
                    if (text.includes('.xlsx') || text.includes('서울시버스')) {
                        files.push(text);
                    }
                }
            });

            return files;
        });

        if (fileList.length > 0) {
            console.log('\n📋 파일 목록:');
            fileList.forEach((file, idx) => {
                console.log(`[${idx + 1}] ${file}`);
            });
        }

        // 다운로드 시도 (여러 방법)
        console.log('\n⬇️  다운로드 시도 중...');

        // 방법 1: 첫 번째 다운로드 버튼 클릭
        const firstDownloadBtn = await page.$('button:has-text("다운로드")') ||
            await page.$('a:has-text("다운로드")') ||
            await page.$('.btn-download') ||
            await page.$('[onclick*="download"]');

        if (firstDownloadBtn) {
            console.log('✅ 다운로드 버튼 발견! 클릭 중...');
            await firstDownloadBtn.click();

            console.log('⏸️  10초 대기 (다운로드 진행)...');
            await new Promise(resolve => setTimeout(resolve, 10000));

            // 다운로드된 파일 확인
            const files = fs.readdirSync(downloadDir);
            const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

            if (excelFiles.length > 0) {
                console.log('\n✅ 다운로드 성공!');
                excelFiles.forEach(file => {
                    const fullPath = path.join(downloadDir, file);
                    const stats = fs.statSync(fullPath);
                    console.log(`   파일: ${file}`);
                    console.log(`   경로: ${fullPath}`);
                    console.log(`   크기: ${(stats.size / 1024).toFixed(2)} KB`);
                });

                console.log('\n📝 다음 명령어로 DB에 import하세요:');
                console.log(`   python3 scripts/import_seoul_bus_routes_excel.py data/${excelFiles[0]}`);
            } else {
                console.log('\n⚠️  다운로드된 파일을 찾을 수 없습니다.');
                console.log('   수동으로 다운로드해주세요:');
                console.log('   https://data.seoul.go.kr/dataList/OA-15066/F/1/datasetView.do');
            }
        } else {
            console.log('\n⚠️  다운로드 버튼을 자동으로 찾지 못했습니다.');
            console.log('   브라우저 창에서 수동으로 다운로드해주세요 (30초 대기)...');
            await new Promise(resolve => setTimeout(resolve, 30000));

            // 다운로드된 파일 재확인
            const files = fs.readdirSync(downloadDir);
            const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

            if (excelFiles.length > 0) {
                console.log('\n✅ 수동 다운로드 확인!');
                excelFiles.forEach(file => {
                    const fullPath = path.join(downloadDir, file);
                    console.log(`   파일: ${file}`);
                    console.log(`   경로: ${fullPath}`);
                });

                console.log('\n📝 다음 명령어로 DB에 import하세요:');
                console.log(`   python3 scripts/import_seoul_bus_routes_excel.py data/${excelFiles[0]}`);
            }
        }

    } catch (error) {
        console.error('\n❌ Error:', error);
        console.log('\n📝 수동 다운로드 안내:');
        console.log('1. https://data.seoul.go.kr/dataList/OA-15066/F/1/datasetView.do 접속');
        console.log('2. 최신 "서울시버스노선기본정보" Excel 파일 다운로드');
        console.log('3. 다운로드한 파일을 data/ 디렉토리로 이동');
        console.log('4. python3 scripts/import_seoul_bus_routes_excel.py data/<파일명>.xlsx 실행');
    } finally {
        console.log('\n⏸️  브라우저 유지 (10초)...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
    }
}

downloadSeoulBusData().catch(console.error);
