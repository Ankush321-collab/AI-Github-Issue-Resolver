import pytest
from unittest.mock import AsyncMock, patch

from shared.llm_client import LLMClient, LLMConfig


@pytest.mark.asyncio
async def test_llm_client_creation():
    config = LLMConfig(api_key="test-key")
    client = LLMClient(config)

    assert client.config.api_key == "test-key"
    assert client.config.model == "moonshotai/Kimi-K2.5"

    await client.close()


@pytest.mark.asyncio
async def test_llm_response_model():
    response_mock = {
        "choices": [{"message": {"content": '{"test": "value"}'}}],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5},
    }

    from shared.llm_client import LLMResponse

    response = LLMResponse(content='{"test": "value"}', raw_response=response_mock, usage={"prompt_tokens": 10, "completion_tokens": 5})

    assert response.content == '{"test": "value"}'
    assert response.usage == {"prompt_tokens": 10, "completion_tokens": 5}
