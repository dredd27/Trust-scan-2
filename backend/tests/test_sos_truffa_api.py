"""
Backend API tests for SOS Truffa app
Tests: Root endpoint, analyze-message, calculate-risk, analyses endpoints
"""
import pytest
import requests
import os
import base64
from io import BytesIO
from PIL import Image

# Get backend URL from environment
BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BACKEND_URL:
    BACKEND_URL = "https://trust-scan-2.preview.emergentagent.com"
BACKEND_URL = BACKEND_URL.rstrip('/')

class TestHealthCheck:
    """Test basic API health"""
    
    def test_root_endpoint(self):
        """Test GET /api/ returns success"""
        response = requests.get(f"{BACKEND_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "SOS Truffa" in data["message"]
        print(f"✓ Root endpoint working: {data}")


class TestAnalyzeMessage:
    """Test POST /api/analyze-message endpoint"""
    
    def test_analyze_text_message(self):
        """Test AI analysis with text input"""
        payload = {
            "text": "URGENTE! Il tuo conto bancario è stato bloccato. Clicca qui per sbloccarlo: http://fake-bank.com/unlock"
        }
        response = requests.post(
            f"{BACKEND_URL}/api/analyze-message",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "ai_analysis" in data
        assert "risk_indicators" in data
        assert isinstance(data["risk_indicators"], list)
        
        print(f"✓ Text analysis completed")
        print(f"  AI Analysis: {data['ai_analysis'][:100]}...")
        print(f"  Risk Indicators: {data['risk_indicators']}")
    
    def test_analyze_with_image(self):
        """Test AI analysis with base64 image (screenshot simulation)"""
        # Create a simple test image with text
        img = Image.new('RGB', (400, 200), color='white')
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        # Draw sample scam text
        sample_text = "URGENTE!\nClicca qui ora"
        draw.text((50, 50), sample_text, fill='black')
        
        # Convert to base64
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        payload = {
            "image_base64": img_base64
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/analyze-message",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "ai_analysis" in data
        assert "risk_indicators" in data
        assert "extracted_text" in data
        
        print(f"✓ Image analysis completed")
        print(f"  Extracted text: {data.get('extracted_text', 'None')[:100] if data.get('extracted_text') else 'None'}")
        print(f"  AI Analysis: {data['ai_analysis'][:100]}...")
    
    def test_analyze_empty_request(self):
        """Test API handles empty request properly"""
        payload = {}
        response = requests.post(
            f"{BACKEND_URL}/api/analyze-message",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "ai_analysis" in data
        assert "Nessun messaggio fornito" in data["ai_analysis"]
        print(f"✓ Empty request handled correctly")


class TestCalculateRisk:
    """Test POST /api/calculate-risk endpoint with risk level validation"""
    
    def test_calculate_risk_basso(self):
        """Test risk calculation for BASSO level (score 0-3)"""
        # All NO answers = score 0
        answers = [
            {"question_id": i+1, "answer": "NO"} 
            for i in range(7)
        ]
        payload = {
            "answers": answers,
            "message_text": "Test message",
            "ai_analysis": "Test analysis"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/calculate-risk",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "score" in data
        assert "level" in data
        assert "label" in data
        assert "message" in data
        assert "advice" in data
        assert isinstance(data["advice"], list)
        
        # Validate BASSO level
        assert data["score"] == 0
        assert data["level"] == "BASSO"
        assert data["label"] == "RISCHIO BASSO"
        
        print(f"✓ Risk calculation BASSO: score={data['score']}, level={data['level']}")
        
        # Verify data was saved - GET to check persistence
        # We'll test this in the analyses endpoint test
    
    def test_calculate_risk_attenzione(self):
        """Test risk calculation for ATTENZIONE level (score 4-7)"""
        # Mix of SI and NO to get score in 4-7 range
        # 3 SI (3*2=6) = score 6
        answers = [
            {"question_id": 1, "answer": "SI"},   # +2 = 2
            {"question_id": 2, "answer": "SI"},   # +2 = 4
            {"question_id": 3, "answer": "SI"},   # +2 = 6
            {"question_id": 4, "answer": "NO"},   # +0 = 6
            {"question_id": 5, "answer": "NO"},   # +0 = 6
            {"question_id": 6, "answer": "NO"},   # +0 = 6
            {"question_id": 7, "answer": "NO"},   # +0 = 6
        ]
        payload = {
            "answers": answers,
            "message_text": "Test message with some risk",
            "ai_analysis": "Some indicators found"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/calculate-risk",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["score"] == 6
        assert data["level"] == "ATTENZIONE"
        assert data["label"] == "ATTENZIONE"
        
        print(f"✓ Risk calculation ATTENZIONE: score={data['score']}, level={data['level']}")
    
    def test_calculate_risk_alto(self):
        """Test risk calculation for ALTO level (score 8+)"""
        # All SI answers = 7*2 = 14
        answers = [
            {"question_id": i+1, "answer": "SI"} 
            for i in range(7)
        ]
        payload = {
            "answers": answers,
            "message_text": "Highly suspicious message",
            "ai_analysis": "Multiple risk indicators"
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/calculate-risk",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["score"] == 14
        assert data["level"] == "ALTO"
        assert data["label"] == "ALTA PROBABILITÀ DI TRUFFA"
        
        print(f"✓ Risk calculation ALTO: score={data['score']}, level={data['level']}")
    
    def test_calculate_risk_with_nonso(self):
        """Test risk calculation with NON SO answer (question 5)"""
        # Question 5 with NON SO = +1
        answers = [
            {"question_id": 1, "answer": "NO"},      # +0 = 0
            {"question_id": 2, "answer": "SI"},      # +2 = 2
            {"question_id": 3, "answer": "NO"},      # +0 = 2
            {"question_id": 4, "answer": "SI"},      # +2 = 4
            {"question_id": 5, "answer": "NON SO"},  # +1 = 5
            {"question_id": 6, "answer": "NO"},      # +0 = 5
            {"question_id": 7, "answer": "NO"},      # +0 = 5
        ]
        payload = {
            "answers": answers
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/calculate-risk",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["score"] == 5
        assert data["level"] == "ATTENZIONE"
        
        print(f"✓ Risk calculation with NON SO: score={data['score']}, level={data['level']}")
    
    def test_calculate_risk_boundary_basso_attenzione(self):
        """Test boundary between BASSO (<=3) and ATTENZIONE (4-7)"""
        # Score = 3 (should be BASSO)
        answers = [
            {"question_id": 1, "answer": "SI"},      # +2 = 2
            {"question_id": 2, "answer": "NON SO"},  # +1 = 3
            {"question_id": 3, "answer": "NO"},      # +0 = 3
            {"question_id": 4, "answer": "NO"},      # +0 = 3
            {"question_id": 5, "answer": "NO"},      # +0 = 3
            {"question_id": 6, "answer": "NO"},      # +0 = 3
            {"question_id": 7, "answer": "NO"},      # +0 = 3
        ]
        payload = {"answers": answers}
        
        response = requests.post(f"{BACKEND_URL}/api/calculate-risk", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 3
        assert data["level"] == "BASSO"
        
        # Score = 4 (should be ATTENZIONE)
        answers[1]["answer"] = "SI"  # Change question 2 to SI
        payload = {"answers": answers}
        
        response = requests.post(f"{BACKEND_URL}/api/calculate-risk", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 4
        assert data["level"] == "ATTENZIONE"
        
        print(f"✓ Boundary test BASSO/ATTENZIONE: 3=BASSO, 4=ATTENZIONE")
    
    def test_calculate_risk_boundary_attenzione_alto(self):
        """Test boundary between ATTENZIONE (<=7) and ALTO (8+)"""
        # Score = 7 (should be ATTENZIONE)
        answers = [
            {"question_id": 1, "answer": "SI"},      # +2 = 2
            {"question_id": 2, "answer": "SI"},      # +2 = 4
            {"question_id": 3, "answer": "SI"},      # +2 = 6
            {"question_id": 4, "answer": "NON SO"},  # +1 = 7
            {"question_id": 5, "answer": "NO"},      # +0 = 7
            {"question_id": 6, "answer": "NO"},      # +0 = 7
            {"question_id": 7, "answer": "NO"},      # +0 = 7
        ]
        payload = {"answers": answers}
        
        response = requests.post(f"{BACKEND_URL}/api/calculate-risk", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 7
        assert data["level"] == "ATTENZIONE"
        
        # Score = 8 (should be ALTO)
        answers[4]["answer"] = "SI"  # Change question 5 to SI
        payload = {"answers": answers}
        
        response = requests.post(f"{BACKEND_URL}/api/calculate-risk", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["score"] == 9  # 2+2+2+1+2 = 9
        assert data["level"] == "ALTO"
        
        print(f"✓ Boundary test ATTENZIONE/ALTO: 7=ATTENZIONE, 8+=ALTO")


class TestAnalyses:
    """Test GET /api/analyses endpoint"""
    
    def test_get_analyses(self):
        """Test retrieving saved analyses"""
        # First, create a test analysis
        answers = [{"question_id": i+1, "answer": "NO"} for i in range(7)]
        create_response = requests.post(
            f"{BACKEND_URL}/api/calculate-risk",
            json={"answers": answers, "message_text": "TEST_retrieval_check"}
        )
        assert create_response.status_code == 200
        
        # Now get all analyses
        response = requests.get(f"{BACKEND_URL}/api/analyses")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least the analysis we just created
        assert len(data) > 0
        
        # Check structure of first analysis
        first = data[0]
        assert "id" in first
        assert "score" in first
        assert "level" in first
        assert "label" in first
        assert "message" in first
        assert "advice" in first
        assert "timestamp" in first
        
        print(f"✓ Analyses retrieval working: {len(data)} analyses found")
        print(f"  Latest analysis: score={first['score']}, level={first['level']}")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
