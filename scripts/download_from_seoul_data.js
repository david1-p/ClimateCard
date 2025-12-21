const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * data.seoul.go.kr에서 노선별 정류소 Excel 파일 다운로드
 */
async function downloadRouteStationData() {
  console.log('🌐 Launching browser...');

  const downloadPath = path.resolve('/Users/david/Desktop/기후동행/scripts');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 다운로드 경로 설정
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  try {
    console.log('📱 Navigating to Seoul Open Data Portal...');
    await page.goto('https://data.seoul.go.kr/dataList/OA-1095/F/1/datasetView.do', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Page loaded!');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 스크린샷 저장
    await page.screenshot({
      path: '/Users/david/Desktop/기후동행/scripts/seoul_data_portal.png',
      fullPage: true
    });
    console.log('📸 Screenshot saved');

    // 다운로드 버튼 찾기 (여러 가능성 시도)
    console.log('\n🔍 Looking for download buttons...');

    const downloadSelectors = [
      'a:has-text("다운로드")',
      'button:has-text("다운로드")',
      'a[href*="download"]',
      'a[href*=".xlsx"]',
      '.download',
      '.btn-download'
    ];

    // 페이지에 있는 모든 링크 분석
    const downloadInfo = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const buttons = Array.from(document.querySelectorAll('button'));

      const downloadLinks = links
        .filter(a => a.textContent.includes('다운로드') || a.textContent.includes('download'))
        .map(a => ({
          text: a.textContent.trim().substring(0, 100),
          href: a.href,
          classes: a.className
        }));

      const downloadButtons = buttons
        .filter(btn => btn.textContent.includes('다운로드') || btn.textContent.includes('download'))
        .map(btn => ({
          text: btn.textContent.trim().substring(0, 100),
          classes: btn.className
        }));

      // 파일 목록 테이블 찾기
      const tables = Array.from(document.querySelectorAll('table'));
      const fileRows = [];

      tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'));
        rows.forEach(row => {
          const text = row.textContent;
          if (text.includes('.xlsx') || text.includes('.xls') || text.includes('정류소')) {
            const cells = Array.from(row.querySelectorAll('td, th'));
            fileRows.push({
              text: cells.map(c => c.textContent.trim()).join(' | ')
            });
          }
        });
      });

      return {
        downloadLinks,
        downloadButtons,
        fileRows
      };
    });

    console.log('\n📋 Found download elements:');
    console.log(JSON.stringify(downloadInfo, null, 2));

    // 최신 파일 다운로드 시도
    if (downloadInfo.fileRows.length > 0) {
      console.log(`\n✅ Found ${downloadInfo.fileRows.length} file entries`);

      // 첫 번째 다운로드 버튼 클릭 (보통 최신 파일)
      try {
        const downloadButton = await page.$('a[href*="download"], button.download, .btn-download');

        if (downloadButton) {
          console.log('🖱️  Clicking download button...');
          await downloadButton.click();
          console.log('⏳ Waiting for download to complete (10 seconds)...');
          await new Promise(resolve => setTimeout(resolve, 10000));

          // 다운로드된 파일 확인
          const files = fs.readdirSync(downloadPath);
          const xlsxFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));

          console.log(`\n✅ Files in download directory:`);
          xlsxFiles.forEach(f => console.log(`   - ${f}`));

          if (xlsxFiles.length > 0) {
            // 가장 최근 파일을 route_stations.xlsx로 이름 변경
            const latestFile = xlsxFiles[xlsxFiles.length - 1];
            const oldPath = path.join(downloadPath, latestFile);
            const newPath = path.join(downloadPath, 'route_stations.xlsx');

            if (fs.existsSync(newPath)) {
              fs.unlinkSync(newPath);
            }

            fs.renameSync(oldPath, newPath);
            console.log(`\n🎉 File saved as: route_stations.xlsx`);
          }
        } else {
          console.log('⚠️  Could not find download button automatically');
        }
      } catch (error) {
        console.log(`⚠️  Click error: ${error.message}`);
      }
    } else {
      console.log('\n⚠️  Could not find file list automatically');
    }

    // 브라우저 열어두기
    console.log('\n⏳ Keeping browser open for 20 seconds for manual download...');
    console.log('   If automatic download failed, please click the download button manually');
    await new Promise(resolve => setTimeout(resolve, 20000));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

downloadRouteStationData().catch(console.error);
