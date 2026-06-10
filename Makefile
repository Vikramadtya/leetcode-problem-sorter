.PHONY: dev mock frontend

# Start both frontend and mock server concurrently
dev:
	@echo "Starting Mock Server and Next.js Frontend (Tacker)..."
	@trap 'kill 0' SIGINT; \
	(cd mock-server && node server.js) & \
	(cd frontend && npm run dev) & \
	wait

# Start only the mock server
mock:
	@echo "Starting Mock Server..."
	cd mock-server && node server.js

# Start only the frontend
frontend:
	@echo "Starting Next.js Frontend (Tacker)..."
	cd frontend && npm run dev
