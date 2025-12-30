const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

/**
 * 서울 열린데이터광장에서 엑셀 파일 다운로드 (직접 링크 클릭 방식)
 */
async function downloadDirect() {
    const downloadDir = path.resolve(__dirname, '../data');

    if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
    }

    console.log('🌐 브라우저 시작...');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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
        console.log('\n📡 페이지 접속 중...');
        await page.goto('https://data.seoul.go.kr/dataList/OA-15066/F/1/datasetView.do', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        // 다운로드 링크 추출
        const downloadLinks = await page.evaluate(() => {
            const links = [];
            const allLinks = document.querySelectorAll('a');

            allLinks.forEach(link => {
                const text = link.textContent?.trim() || '';
                const href = link.href || '';
                const onclick = link.getAttribute('onclick') || '';

                if (text.includes('다운로드') && text.includes('.xlsx')) {
                    links.push({
                        text: text,
                        href: href,
                        onclick: onclick
                    });
                }
            });

            return links;
        });

        if (downloadLinks.length > 0) {
            console.log('\n✅ 다운로드 링크 발견!');
            console.log(`첫 번째 파일: ${downloadLinks[0].text}`);

            // 첫 번째 파일 다운로드 (최신 파일)
            await page.evaluate(() => {
                const firstLink = document.querySelector('a');
                const allLinks = Array.from(document.querySelectorAll('a'));
                const downloadLink = allLinks.find(link => {
                    const text = link.textContent?.trim() || '';
                    return text.includes('다운로드') && text.includes('.xlsx');
                });

                if (downloadLink) {
                    downloadLink.click();
                }
            });

            console.log('⬇️  다운로드 시작...');
            console.log('⏸️  15초 대기...');
            await new Promise(resolve => setTimeout(resolve, 15000));

            // 다운로드된 파일 확인
            const files = fs.readdirSync(downloadDir);
            const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

            if (excelFiles.length > 0) {
                console.log('\n✅ 다운로드 성공!');
                const latestFile = excelFiles[excelFiles.length - 1]; // 가장 최근 파일
                const fullPath = path.join(downloadDir, latestFile);
                const stats = fs.statSync(fullPath);

                console.log(`   파일: ${latestFile}`);
                console.log(`   경로: ${fullPath}`);
                console.log(`   크기: ${(stats.size / 1024).toFixed(2)} KB`);

                console.log('\n📝 다음 단계: DB에 import');
                console.log(`   python3 scripts/import_seoul_bus_routes_excel.py data/${latestFile}`);

                return latestFile;
            } else {
                console.log('\n⚠️  자동 다운로드 실패');
                throw new Error('파일 다운로드 실패');
            }
        } else {
            throw new Error('다운로드 링크를 찾을 수 없습니다');
        }

    } catch (error) {
        console.error('\n❌ 자동 다운로드 실패:', error.message);
        console.log('\n📝 수동 다운로드 방법:');
        console.log('1. 브라우저가 열려있는 동안 "다운로드" 버튼 클릭');
        console.log('2. 다운로드한 파일이 data/ 디렉토리에 저장됨');
        console.log('3. 30초 대기 중... (수동 다운로드 가능)');

        await new Promise(resolve => setTimeout(resolve, 30000));

        // 수동 다운로드 확인
        const files = fs.readdirSync(downloadDir);
        const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

        if (excelFiles.length > 0) {
            console.log('\n✅ 다운로드 확인됨!');
            const latestFile = excelFiles[excelFiles.length - 1];
            console.log(`   파일: ${latestFile}`);
            console.log('\n📝 다음 단계:');
            console.log(`   python3 scripts/import_seoul_bus_routes_excel.py data/${latestFile}`);
            return latestFile;
        } else {
            console.log('\n❌ 다운로드된 파일 없음');
            console.log('수동으로 다운로드해주세요:');
            console.log('https://data.seoul.go.kr/dataList/OA-15066/F/1/datasetView.do');
            return null;
        }

    } finally {
        await browser.close();
    }
}

downloadDirect().catch(console.error);
