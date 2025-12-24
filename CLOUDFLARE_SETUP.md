# ☁️ Cloudflare WAF 설정 가이드 (무료 플랜)

## 🎯 Cloudflare가 제공하는 것

### 무료 플랜 혜택
- ✅ **DDoS 방어** (무제한, 자동)
- ✅ **SSL/TLS 인증서** (무료, 자동 갱신)
- ✅ **CDN** (무제한 대역폭)
- ✅ **방화벽 규칙** (5개)
- ✅ **Rate Limiting** (기본)
- ✅ **봇 관리** (기본)

**월 비용: $0**

---

## 📝 Step 1: Cloudflare 가입 및 도메인 추가

### 1-1. Cloudflare 가입
```
1. https://dash.cloudflare.com/sign-up 접속
2. 이메일 + 비밀번호로 가입
3. 이메일 인증
```

### 1-2. 도메인 추가
```
1. Cloudflare 대시보드 → "Add a Site" 클릭
2. 도메인 입력: 기후동행.site
3. 플랜 선택: Free ($0/month) ✅
4. Continue 클릭
```

### 1-3. DNS 레코드 자동 스캔
```
Cloudflare가 현재 DNS 레코드를 자동으로 가져옵니다.
확인 후 Continue 클릭
```

---

## 🌐 Step 2: 네임서버 변경

### 2-1. Cloudflare 네임서버 확인
```
Cloudflare가 제공하는 네임서버 2개:
예시)
  june.ns.cloudflare.com
  marc.ns.cloudflare.com
```

### 2-2. 도메인 등록 업체에서 네임서버 변경

**가비아의 경우**:
```
1. 가비아 로그인 → My가비아 → 도메인
2. 기후동행.site 선택 → 관리
3. 네임서버 설정 → "다른 네임서버 사용"
4. Cloudflare 네임서버 2개 입력
5. 저장
```

**Cafe24, Whois, GoDaddy 등도 유사**

### 2-3. 적용 대기
```
네임서버 변경 후 전파 시간: 최대 24시간
보통 10분~1시간 이내 완료
```

---

## 🔒 Step 3: SSL/TLS 설정

### 3-1. SSL/TLS 모드 설정
```
1. Cloudflare 대시보드 → SSL/TLS
2. Overview → Encryption mode
3. "Full (strict)" 선택 ✅

모드 설명:
- Off: SSL 비활성화 (사용 금지)
- Flexible: Cloudflare↔사용자만 HTTPS (비권장)
- Full: Cloudflare↔사용자, Cloudflare↔서버 모두 HTTPS
- Full (strict): 위와 동일 + 서버 인증서 검증 ✅
```

### 3-2. Always Use HTTPS
```
1. SSL/TLS → Edge Certificates
2. "Always Use HTTPS" → On ✅
3. HTTP 요청을 자동으로 HTTPS로 리다이렉트
```

### 3-3. HSTS 활성화
```
1. SSL/TLS → Edge Certificates
2. HTTP Strict Transport Security (HSTS)
3. Enable HSTS → 다음 설정:
   - Max Age: 12 months ✅
   - Include subdomains: On
   - Preload: Off (선택 사항)
4. I understand 체크 → Next
```

---

## 🛡️ Step 4: 방화벽 규칙 설정

### 4-1. WAF (Web Application Firewall) 활성화
```
1. Security → WAF
2. Managed Rules → On ✅
```

### 4-2. 방화벽 규칙 추가 (무료: 5개)

#### 규칙 1: SQL Injection 차단
```
1. Security → WAF → Firewall rules → Create a firewall rule
2. Rule name: Block SQL Injection
3. Expression:
   Field: URI Path
   Operator: contains
   Value: ' OR 1=1 OR '' = '
4. Action: Block
5. Deploy
```

#### 규칙 2: Admin API Rate Limiting
```
Rule name: Rate Limit Admin API
Expression:
  (http.request.uri.path contains "/api/admin")
Action: Challenge (CAPTCHA)
```

#### 규칙 3: 특정 국가 차단 (선택 사항)
```
Rule name: Block Specific Countries
Expression:
  (ip.geoip.country in {"CN" "RU"})  # 예시
Action: Block
```

#### 규칙 4: User-Agent 없는 요청 차단 (봇)
```
Rule name: Block No User-Agent
Expression:
  (http.user_agent eq "")
Action: Block
```

#### 규칙 5: Suspicious User-Agent 차단
```
Rule name: Block Suspicious Bots
Expression:
  (http.user_agent contains "bot" or
   http.user_agent contains "crawler" or
   http.user_agent contains "spider")
  and not (http.user_agent contains "Googlebot")
Action: Challenge
```

---

## ⚡ Step 5: 성능 최적화

### 5-1. Auto Minify
```
1. Speed → Optimization
2. Auto Minify:
   - JavaScript: On ✅
   - CSS: On ✅
   - HTML: On ✅
```

### 5-2. Brotli 압축
```
1. Speed → Optimization
2. Brotli: On ✅
```

### 5-3. Rocket Loader (선택)
```
1. Speed → Optimization
2. Rocket Loader: Off
   (React 앱에서는 비활성화 권장)
```

---

## 🤖 Step 6: 봇 관리

### 6-1. Bot Fight Mode (무료)
```
1. Security → Bots
2. Bot Fight Mode: On ✅
3. 자동으로 악성 봇 차단
```

### 6-2. JavaScript Detection
```
1. Security → Settings
2. JavaScript Detections: On ✅
3. JavaScript 비활성화 브라우저 차단
```

---

## 📊 Step 7: 분석 및 모니터링

### 7-1. Analytics 확인
```
1. Analytics & Logs → Traffic
2. 실시간 트래픽 확인
3. 차단된 요청 확인
```

### 7-2. Security Events
```
1. Security → Events
2. 방화벽이 차단한 요청 확인
3. 오탐 (False Positive) 확인
```

---

## ✅ Step 8: 설정 검증

### 8-1. SSL/TLS 테스트
```bash
# 터미널에서 실행
curl -I https://기후동행.site

# 예상 응답:
HTTP/2 200
server: cloudflare
```

### 8-2. WAF 테스트
```bash
# SQL Injection 시도 (차단되어야 함)
curl "https://기후동행.site/api/routes/search?keyword=' OR 1=1--"

# 예상 응답: 403 Forbidden (Cloudflare 차단)
```

### 8-3. Rate Limiting 테스트
```bash
# 짧은 시간에 여러 요청
for i in {1..100}; do
  curl https://기후동행.site/api/stations/nearby?lat=37.5&lng=127&radius=500 &
done

# 일부 요청이 차단되거나 Challenge 페이지 표시
```

---

## 📋 최종 체크리스트

### 필수 설정 ✅
- [ ] 네임서버 변경 완료
- [ ] SSL/TLS: Full (strict)
- [ ] Always Use HTTPS: On
- [ ] HSTS: Enabled
- [ ] WAF Managed Rules: On
- [ ] Bot Fight Mode: On
- [ ] 방화벽 규칙 5개 설정

### 선택 설정 ⚠️
- [ ] Auto Minify: On
- [ ] Brotli: On
- [ ] 특정 국가 차단 (필요 시)

---

## 💰 비용 요약

```
Cloudflare 무료 플랜: $0/월
  ✓ DDoS 방어 (무제한)
  ✓ SSL/TLS (무료)
  ✓ CDN (무제한)
  ✓ 방화벽 규칙 5개
  ✓ 봇 관리
  ✓ 분석 대시보드

총 비용: $0
```

---

## 🚨 문제 해결

### Q1: 네임서버 변경 후 사이트 접속 안 됨
```
A: 전파 시간 필요 (최대 24시간)
   https://www.whatsmydns.net 에서 확인
```

### Q2: SSL 인증서 오류
```
A: SSL/TLS 모드를 "Flexible"에서 "Full (strict)"로 변경
   서버에 유효한 SSL 인증서 설치 필요
```

### Q3: 정상 요청이 차단됨 (False Positive)
```
A: Security → Events 에서 차단된 요청 확인
   필요 시 방화벽 규칙 수정 또는 제외
```

### Q4: 무료 플랜 제한
```
A: 방화벽 규칙 5개 제한
   → 우선순위 높은 규칙만 설정
   → Rate Limiting은 백엔드에서 처리
```

---

## 📚 참고 자료

- [Cloudflare 공식 문서](https://developers.cloudflare.com/)
- [SSL/TLS 설정 가이드](https://developers.cloudflare.com/ssl/)
- [WAF 규칙 작성](https://developers.cloudflare.com/waf/)

---

**설정 완료 시간**: 약 30분 (네임서버 전파 제외)
**월 비용**: $0
**보안 등급**: A+ (SSL Labs)
