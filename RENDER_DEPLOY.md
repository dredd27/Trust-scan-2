# SOS Truffa — Deploy su Render (senza MongoDB)

Il backend è stato semplificato: NON usa più alcun database.
Tutta la logica di calcolo del rischio gira in locale sull'app.
Il backend serve solo per l'analisi AI tramite GPT-4o (Emergent LLM Key).

## Variabili d'ambiente richieste su Render

Solo UNA variabile è obbligatoria:

| Nome                 | Valore                                  | Note                                        |
|----------------------|-----------------------------------------|---------------------------------------------|
| `EMERGENT_LLM_KEY`   | `sk-emergent-...` (la tua chiave)       | Obbligatoria per l'analisi AI               |
| `CORS_ORIGINS`       | `*`                                     | Opzionale (default: `*`)                    |
| `PYTHON_VERSION`     | `3.11.9`                                | Già incluso in `render.yaml`                |

NON serve più `MONGO_URL` né `DB_NAME`.

## Configurazione manuale su Render (se non usi render.yaml)

- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/api/health`
- **Runtime:** Python 3.11.9

## Test rapido dopo il deploy

```bash
curl https://TUO-APP.onrender.com/api/health
# Atteso: {"status":"healthy"}

curl https://TUO-APP.onrender.com/api/
# Atteso: {"message":"SOS Truffa API attiva","status":"ok"}
```

## Endpoint disponibili

- `GET  /api/` — info API
- `GET  /api/health` — health check per Render
- `POST /api/analyze-message` — analisi AI (testo o screenshot base64)
- `POST /api/calculate-risk` — calcolo rischio stateless (parità col frontend)

## Aggiornare l'app Expo dopo il deploy

In `frontend/eas.json`, sotto il profilo `production`, imposta:

```json
"env": {
  "EXPO_PUBLIC_BACKEND_URL": "https://TUO-APP.onrender.com"
}
```
