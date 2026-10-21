import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_health_check_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/healthz")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"

@pytest.mark.asyncio
async def test_list_languages_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/languages")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 20

@pytest.mark.asyncio
async def test_diagnostics_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/diagnostics/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["supported_languages_count"] == 20

@pytest.mark.asyncio
async def test_translate_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/translate",
            json={
                "text": "Hello, how are you?",
                "source_lang": "en",
                "target_lang": "te",
                "synthesize_audio": False
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["source_lang"] == "en"
        assert data["target_lang"] == "te"
        assert "నమస్కారం" in data["translated_text"] or len(data["translated_text"]) > 0

@pytest.mark.asyncio
async def test_language_test_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/languages/te/test",
            json={"phrase": "నమస్కారం, మీరు ఎలా ఉన్నారు?"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["source_code"] == "te"
        assert data["target_lang"] == "en"
        assert len(data["translated_text"]) > 0
        assert data["total_ms"] > 0
