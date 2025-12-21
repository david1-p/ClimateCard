.PHONY: help dev prod build clean logs restart db-shell redis-shell

help:
	@echo "기후동행카드 프로젝트 명령어:"
	@echo "  make dev        - 개발 환경 시작 (PostgreSQL + Redis)"
	@echo "  make prod       - 운영 환경 시작"
	@echo "  make build      - 전체 서비스 빌드"
	@echo "  make clean      - 컨테이너 정리 및 삭제"
	@echo "  make logs       - 실시간 로그 확인"
	@echo "  make restart    - 서비스 재시작"
	@echo "  make db-shell   - PostgreSQL 접속"
	@echo "  make redis-shell - Redis 접속"

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

build:
	docker-compose build

clean:
	docker-compose down -v

logs:
	docker-compose logs -f

restart:
	docker-compose restart

db-shell:
	docker exec -it climate-postgres psql -U postgres -d climate_transport_dev

redis-shell:
	docker exec -it climate-redis redis-cli
