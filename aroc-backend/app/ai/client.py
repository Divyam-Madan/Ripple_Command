import httpx
from typing import List, Dict, Optional
from app.config import settings

class OpenRouterClient:
    BASE_URL = "https://openrouter.ai/api/v1"
    
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.available = bool(self.api_key)
    
    async def chat_completion(
        self,
        messages: List[Dict],
        tools: Optional[List[Dict]] = None,
        tool_choice: str = "auto"
    ) -> Dict:
        if not self.available:
            raise ValueError("OpenRouter API key not configured")
        
        payload = {
            "model": self.model,
            "messages": messages,
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://aroc.app",
                    "X-Title": "AROC Copilot",
                },
                json=payload
            )
            response.raise_for_status()
            return response.json()

openrouter_client = OpenRouterClient()
