import pytest
from httpx import AsyncClient

from main import app

# A known-bad/invalid API key for testing
INVALID_API_KEY = "prx-invalid-key-for-testing-purposes"

# A placeholder for a valid key. In a real test suite, this would be
# loaded from a test-specific environment or configuration.
VALID_API_KEY = "prx-a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890"

@pytest.mark.asyncio
async def test_process_endpoint_no_api_key():
    """
    Tests that a request to a protected endpoint without an API key is rejected.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/process", json={"task_type": "echo", "prompt": "test"})
    assert response.status_code == 401
    assert "API key is missing" in response.json()["detail"]

@pytest.mark.asyncio
async def test_process_endpoint_invalid_api_key():
    """
    Tests that a request with an invalid API key is rejected.
    """
    headers = {"X-API-Key": INVALID_API_KEY}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/process", json={"task_type": "echo", "prompt": "test"}, headers=headers)
    assert response.status_code == 401
    assert "Invalid API key" in response.json()["detail"]

@pytest.mark.asyncio
async def test_process_endpoint_valid_api_key():
    """
    Tests that a request with a valid API key is accepted.
    This test assumes the underlying 'echo' skill works.
    """
    headers = {"X-API-Key": VALID_API_KEY}
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post("/api/v1/process", json={"task_type": "echo", "prompt": "test"}, headers=headers)
    
    # We expect a 200 OK if the key is valid.
    assert response.status_code == 200
    response_data = response.json()
    assert response_data["status"] == "success"
    assert response_data["result"]["echoed_prompt"] == "test"

@pytest.mark.asyncio
async def test_unprotected_endpoint_works_without_key():
    """
    Tests that a public/unprotected endpoint (like /docs) remains accessible without an API key.
    This is a sanity check to ensure the middleware is not applied globally by mistake.
    """
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # The /docs endpoint should always be available
        response = await ac.get("/docs")
    assert response.status_code == 200
    assert "<title>FastAPI - Swagger UI</title>" in response.text


# TODO: Add test for CLI utility `python main.py generate-api-key`
# TODO: Add test to verify that the API key used is captured in the audit log