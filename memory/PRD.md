# SOS Truffa – Verifica Messaggi - PRD

## Descrizione
App mobile per la verifica di messaggi sospetti (SMS, email, messaggi). L'utente può caricare uno screenshot o incollare il testo del messaggio, rispondere a 8 domande di verifica e ottenere un livello di rischio calcolato + analisi AI.

## Funzionalità
- **Welcome Screen**: Schermata iniziale con descrizione e CTA
- **Step 1 - Input**: Scelta tra screenshot (con OCR AI) o testo
- **Step 2 - Domande**: 8 domande SI/NO (Q5 ha anche NON SO)
  1. Il messaggio crea urgenza?
  2. Ti chiede dati personali o bancari?
  3. Il mittente è sconosciuto o sospetto?
  4. È presente un link?
  5. Il link sembra strano o diverso dal sito ufficiale?
  6. Ci sono errori grammaticali o frasi strane?
  7. Ti promette un rimborso o un premio?
  8. Richiede di contattare un numero di telefono mobile?
- **Step 3 - Risultato**: Punteggio, livello rischio, analisi AI, consigli

## Calcolo Rischio
- SI = 2 punti, NON SO = 1 punto, NO = 0 punti
- 0-3 → BASSO, 4-7 → ATTENZIONE, 8+ → ALTO
- Punteggio massimo: 16

## Stack Tecnico
- Frontend: Expo React Native (TypeScript)
- Backend: FastAPI (Python)
- Database: MongoDB
- AI: OpenAI GPT-4o (via Emergent Universal Key)

## API Endpoints
- `POST /api/analyze-message` - Analisi AI del messaggio (testo o immagine base64)
- `POST /api/calculate-risk` - Calcolo rischio basato su risposte
- `GET /api/analyses` - Storico analisi

## Interfaccia
- Lingua: Italiano
- Tema: Light mode, Trust & Security
- No autenticazione (uso anonimo)
