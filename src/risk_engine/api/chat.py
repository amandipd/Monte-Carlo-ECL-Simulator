"""v3 chat routes.

Mounted at ``/api/v3/chat`` in the main app (see sections 2.3 and 4.1 of
CURSOR_PROMPT.md). Uses Ollama (free, local) via the existing ``OllamaClient`` —
no paid SDK and no new dependencies (``requests`` is already available).

``POST /chat/query`` grounds an LLM answer in a cached simulation result:
1. Fetch the cached results for ``job_id`` (key ``sim_result:{job_id}``).
2. Build a results context string.
3. Ask Ollama with the credit-risk system prompt + context + user query.
4. Cache the answer under ``chat:{job_id}:{hash(query)}`` with a 1 hour TTL.
"""
import hashlib
import os

from fastapi import APIRouter, HTTPException, Request

from risk_engine.surrogate.cache import ECLCache
from risk_engine.surrogate.llm_client import LLMClientError, OllamaClient
from risk_engine.api.schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

CHAT_CACHE_TTL = 3600  # 1 hour

CHAT_SYSTEM_PROMPT = """You are an expert credit risk analyst with access to Monte Carlo ECL simulation results.

This system models Expected Credit Loss on loan portfolios using:
- Macro inputs: unemployment_rate (%), interest_rate (%), housing_price_index (index, baseline=100)
- Hazard rate model: base hazard (5%) scaled by macro stress factors
- PD = 1 - exp(-hazard_rate * time_horizon)
- ECL = simulated_defaults * avg_exposure ($250K) * LGD (45%)

Answer questions about the simulation results precisely. Cite specific numbers.
When asked "what if" questions, explain how changing macro inputs would affect the hazard rate and ECL.
Do not invent metrics that aren't in the results (no Sharpe ratio, no Greeks — this is credit risk, not market risk).

Be concise. Answer in 1-3 sentences."""


def build_context(results: dict) -> str:
    """Render cached simulation results into an LLM context block."""
    macro = results["macro_inputs"]
    return f"""Simulation Results:
- Macro Inputs: unemployment={macro['unemployment_rate']:.1f}%, interest={macro['interest_rate']:.1f}%, HPI={macro['housing_price_index']:.1f}
- Portfolio: {results['n_loans']:,} loans, avg exposure $250,000, LGD 45%
- Hazard Rate: {results['hazard_rate']:.4f} (baseline: 0.05)
- Probability of Default: {results['pd']:.4f} ({results['pd'] * 100:.2f}%)
- Simulated Defaults: {results['defaults']:,} out of {results['n_loans']:,}
- Expected Credit Loss: ${results['ecl']:,.0f}
- Default Rate: {results['default_rate']:.4f} ({results['default_rate'] * 100:.2f}%)
- Method: {results['method']}, computed in {results['elapsed_ms']:.1f}ms
- Baseline ECL (neutral macros): ~$5.5B on 100M loans"""


def query_ollama(
    system_prompt: str,
    context: str,
    query: str,
    history: list[dict],
    client: OllamaClient | None = None,
) -> str:
    """Call Ollama with simulation context + the user's question.

    Only the current exchange is sent (context + query); Ollama on consumer
    hardware has a small context window, so we avoid replaying full history.
    """
    ollama = client or OllamaClient()
    full_query = f"{context}\n\nUser question: {query}"
    return ollama.chat(system_prompt=system_prompt, user_prompt=full_query)


def _mock_enabled() -> bool:
    return os.getenv("LLM_MOCK", "false").lower() in {"1", "true", "yes"}


def _mock_chat_response(results: dict, query: str) -> str:
    """Deterministic grounded response for tests / offline development."""
    return (
        f"For this scenario the expected credit loss is ${results['ecl']:,.0f} "
        f"across {results['n_loans']:,} loans, driven by a hazard rate of "
        f"{results['hazard_rate']:.4f} and a probability of default of "
        f"{results['pd'] * 100:.2f}%."
    )


def _chat_cache_key(job_id: str, query: str) -> str:
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()[:16]
    return f"chat:{job_id}:{digest}"


@router.post("/query", response_model=ChatResponse)
async def chat_query(request_body: ChatRequest, request: Request) -> ChatResponse:
    cache: ECLCache = request.app.state.ecl_cache

    results = cache.get_json(f"sim_result:{request_body.job_id}")
    if results is None:
        raise HTTPException(
            status_code=404,
            detail=f"Simulation {request_body.job_id} not found",
        )

    chat_key = _chat_cache_key(request_body.job_id, request_body.query)
    cached = cache.get_json(chat_key)
    if cached is not None and "response" in cached:
        return ChatResponse(response=cached["response"], cached=True)

    context = build_context(results)

    if _mock_enabled():
        answer = _mock_chat_response(results, request_body.query)
    else:
        try:
            answer = query_ollama(
                CHAT_SYSTEM_PROMPT,
                context,
                request_body.query,
                request_body.conversation_history,
            )
        except LLMClientError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Ollama unreachable. Run: ollama serve ({exc})",
            ) from exc

    cache.set_json(chat_key, {"response": answer}, ttl_seconds=CHAT_CACHE_TTL)
    return ChatResponse(response=answer, cached=False)
