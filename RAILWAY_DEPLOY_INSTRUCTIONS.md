# Guida Deploy Backend SOS Truffa su Railway

## Prerequisiti
- Account Railway creato (fatto!)
- Repository GitHub con il codice (già sincronizzato)

---

## PASSO 1: Crea un nuovo progetto su Railway

1. Vai su https://railway.app/dashboard
2. Clicca **"New Project"**
3. Seleziona **"Deploy from GitHub repo"**
4. Autorizza Railway ad accedere al tuo GitHub (se non già fatto)
5. Cerca e seleziona il repository **scam-detector-app-4** (o il nome del tuo repo)

---

## PASSO 2: Configura il servizio

Dopo aver selezionato il repo:

1. Railway ti chiederà quale cartella deployare
2. **IMPORTANTE**: Scrivi `/backend` come root directory
3. Clicca **"Deploy"**

---

## PASSO 3: Aggiungi le variabili d'ambiente

Dopo che il deploy inizia:

1. Clicca sul servizio creato
2. Vai nella tab **"Variables"**
3. Clicca **"+ Add Variable"** e aggiungi:

```
MONGO_URL=<IL_TUO_MONGODB_URL>
DB_NAME=sos_truffa_production
EMERGENT_LLM_KEY=sk-emergent-1Fa390aBeFbAe44193
```

**NOTA SUL MONGODB:**
- Se non hai un MongoDB in produzione, puoi:
  - Usare MongoDB Atlas (gratuito): https://www.mongodb.com/atlas
  - Oppure aggiungere un servizio MongoDB su Railway stesso

---

## PASSO 4: Configura il dominio pubblico

1. Nella tab **"Settings"** del servizio
2. Scorri fino a **"Networking"**
3. Clicca **"Generate Domain"**
4. Railway ti darà un URL tipo: `sos-truffa-backend-production.up.railway.app`

**COPIA QUESTO URL!** Ti servirà per aggiornare l'app.

---

## PASSO 5: Verifica il deploy

Apri nel browser:
```
https://TUO-URL-RAILWAY.up.railway.app/api/
```

Dovresti vedere:
```json
{"message": "SOS Truffa API attiva"}
```

---

## PASSO 6: Aggiorna l'app mobile

Ora devi aggiornare l'URL del backend nell'app.

### Sul tuo PC Windows (PowerShell):

```powershell
# 1. Vai nella cartella del progetto
cd C:\TUO_PERCORSO\scam-detector-app-4\frontend

# 2. Modifica il file .env
notepad .env
```

### Nel file .env, aggiungi/modifica questa riga:
```
EXPO_PUBLIC_BACKEND_URL=https://TUO-URL-RAILWAY.up.railway.app
```

(Sostituisci `TUO-URL-RAILWAY` con l'URL che hai copiato al passo 4)

---

## PASSO 7: Rebuild dell'app

Ora devi rifare la build dell'app con il nuovo URL.

### PowerShell (IMPORTANTE: pulisci la cache!):

```powershell
# Vai nella cartella frontend
cd C:\TUO_PERCORSO\scam-detector-app-4\frontend

# Pulisci TUTTE le cache
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

# Reinstalla le dipendenze (per sicurezza)
npm install
# oppure
yarn install

# Fai la build per iOS con cache pulita
eas build --platform ios --clear-cache
```

---

## Risoluzione Problemi

### Il deploy su Railway fallisce?
1. Controlla i log nella tab "Deployments"
2. Verifica che tutte le variabili d'ambiente siano impostate
3. Assicurati che la root directory sia `/backend`

### L'app non si connette al backend?
1. Verifica che l'URL in `.env` sia corretto (con https://)
2. Ricompila l'app con `--clear-cache`
3. Elimina la vecchia build da TestFlight prima di installare la nuova

### MongoDB non funziona?
- Per un'app in produzione, ti consiglio MongoDB Atlas (gratuito fino a 512MB)
- Crea un cluster su https://www.mongodb.com/atlas e copia la connection string

---

## Struttura URL finale

- **Backend Railway**: `https://tuo-progetto.up.railway.app`
- **API endpoint**: `https://tuo-progetto.up.railway.app/api/analyze-message`
- **Health check**: `https://tuo-progetto.up.railway.app/api/`
