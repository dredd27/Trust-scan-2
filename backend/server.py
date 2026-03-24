from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from openai import AsyncOpenAI

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'test_database')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# OpenAI client with Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
openai_client = AsyncOpenAI(
    api_key=EMERGENT_LLM_KEY,
    base_url="https://api.emergentai.dev/v1"
)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ---------- Models ----------

class AnalyzeMessageRequest(BaseModel):
    text: Optional[str] = None
    image_base64: Optional[str] = None

class AnalyzeMessageResponse(BaseModel):
    extracted_text: Optional[str] = None
    ai_analysis: str
    risk_indicators: List[str]

class RiskAnswer(BaseModel):
    question_id: int
    answer: str  # "SI", "NO", "NON SO"

class CalculateRiskRequest(BaseModel):
    answers: List[RiskAnswer]
    message_text: Optional[str] = None
    ai_analysis: Optional[str] = None

class RiskResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    score: int
    level: str  # "BASSO", "ATTENZIONE", "ALTO"
    label: str
    message: str
    advice: List[str]
    ai_analysis: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ---------- AI Analysis ----------

async def analyze_with_ai(text: Optional[str] = None, image_base64: Optional[str] = None) -> dict:
    """Analyze a message using GPT for scam detection."""
    
    system_msg = (
        "Sei un esperto di sicurezza informatica specializzato nel rilevamento di truffe e phishing. "
        "Analizza il messaggio fornito e identifica gli indicatori di truffa. "
        "Rispondi SEMPRE in italiano. "
        "Fornisci: 1) Un'analisi breve del messaggio (max 3 frasi), "
        "2) Una lista di indicatori di rischio trovati (es. urgenza, richiesta dati, link sospetto, errori grammaticali, promesse di premi). "
        "Formato risposta:\n"
        "ANALISI: [la tua analisi]\n"
        "INDICATORI: [indicatore1], [indicatore2], ..."
    )

    extracted_text = None

    try:
        if image_base64 and not text:
            # Analyze image with vision
            response = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_msg},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Estrai il testo da questa immagine di un messaggio e analizzalo per rilevare indicatori di truffa."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                        ]
                    }
                ],
                max_tokens=1000
            )
            
            # Also extract just the text
            extract_response = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "Sei un assistente OCR. Estrai SOLO il testo presente nell'immagine, senza commenti."},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Estrai tutto il testo visibile in questa immagine. Restituisci solo il testo, nient'altro."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                        ]
                    }
                ],
                max_tokens=500
            )
            extracted_text = extract_response.choices[0].message.content
            
        elif text:
            response = await openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": f"Analizza questo messaggio per rilevare indicatori di truffa:\n\n{text}"}
                ],
                max_tokens=1000
            )
        else:
            return {"extracted_text": None, "ai_analysis": "Nessun messaggio fornito.", "risk_indicators": []}

        response_text = response.choices[0].message.content
        ai_analysis = response_text
        risk_indicators = []

        if "ANALISI:" in response_text and "INDICATORI:" in response_text:
            parts = response_text.split("INDICATORI:")
            analysis_part = parts[0].replace("ANALISI:", "").strip()
            indicators_part = parts[1].strip() if len(parts) > 1 else ""
            ai_analysis = analysis_part
            risk_indicators = [i.strip() for i in indicators_part.split(",") if i.strip()]
        elif "INDICATORI:" in response_text:
            parts = response_text.split("INDICATORI:")
            ai_analysis = parts[0].strip()
            indicators_part = parts[1].strip() if len(parts) > 1 else ""
            risk_indicators = [i.strip() for i in indicators_part.split(",") if i.strip()]

        return {
            "extracted_text": extracted_text,
            "ai_analysis": ai_analysis,
            "risk_indicators": risk_indicators
        }
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        return {
            "extracted_text": None,
            "ai_analysis": f"Errore nell'analisi AI: {str(e)}",
            "risk_indicators": []
        }

# ---------- Routes ----------

@api_router.get("/")
async def root():
    return {"message": "SOS Truffa API attiva"}

@api_router.post("/analyze-message", response_model=AnalyzeMessageResponse)
async def analyze_message(request: AnalyzeMessageRequest):
    """Analyze a message using AI for scam detection."""
    if not request.text and not request.image_base64:
        return AnalyzeMessageResponse(
            extracted_text=None,
            ai_analysis="Nessun messaggio fornito per l'analisi.",
            risk_indicators=[]
        )

    result = await analyze_with_ai(text=request.text, image_base64=request.image_base64)

    return AnalyzeMessageResponse(
        extracted_text=result.get("extracted_text"),
        ai_analysis=result.get("ai_analysis", ""),
        risk_indicators=result.get("risk_indicators", [])
    )

@api_router.post("/calculate-risk", response_model=RiskResult)
async def calculate_risk(request: CalculateRiskRequest):
    """Calculate risk score based on answers and optionally AI analysis."""
    score = 0
    for answer in request.answers:
        if answer.answer == "SI":
            score += 2
        elif answer.answer == "NON SO":
            score += 1

    # Determine risk level
    if score <= 3:
        level = "BASSO"
        label = "RISCHIO BASSO"
        message = "Il messaggio presenta pochi elementi tipici delle truffe."
        advice = [
            "Non inserire mai password o codici",
            "Verifica sempre dal sito ufficiale"
        ]
    elif score <= 7:
        level = "ATTENZIONE"
        label = "ATTENZIONE"
        message = "Il messaggio contiene elementi sospetti."
        advice = [
            "Non cliccare sul link",
            "Verifica direttamente dal sito ufficiale",
            "Non farti mettere fretta"
        ]
    else:
        level = "ALTO"
        label = "ALTA PROBABILITÀ DI TRUFFA"
        message = "Il messaggio presenta molte caratteristiche tipiche delle truffe."
        advice = [
            "Non cliccare su alcun link",
            "Non inserire dati personali",
            "Elimina il messaggio"
        ]

    risk_result = RiskResult(
        score=score,
        level=level,
        label=label,
        message=message,
        advice=advice,
        ai_analysis=request.ai_analysis
    )

    # Save to MongoDB
    result_dict = risk_result.dict()
    await db.risk_analyses.insert_one(result_dict)

    return risk_result

@api_router.get("/analyses", response_model=List[RiskResult])
async def get_analyses():
    """Get recent analyses."""
    analyses = await db.risk_analyses.find({}, {"_id": 0}).sort("timestamp", -1).limit(50).to_list(50)
    return [RiskResult(**a) for a in analyses]

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
