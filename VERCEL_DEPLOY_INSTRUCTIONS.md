# Deploy Backend SOS Truffa su Vercel

## Prerequisiti
- Account Vercel (puoi crearlo con GitHub)
- Repository GitHub con il codice

---

## METODO 1: Deploy da interfaccia web (CONSIGLIATO)

### Passo 1: Vai su Vercel
```
https://vercel.com/new
```

### Passo 2: Importa il repository
1. Clicca **"Import Git Repository"**
2. Seleziona il tuo repository GitHub (es. `scam-detector-app-4`)
3. Clicca **"Import"**

### Passo 3: Configura il progetto
- **Framework Preset**: Other
- **Root Directory**: Clicca "Edit" e scrivi `backend`
- **Build Command**: lascia vuoto
- **Output Directory**: lascia vuoto

### Passo 4: Aggiungi le variabili d'ambiente
Nella sezione **"Environment Variables"** aggiungi:

| Nome | Valore |
|------|--------|
| `MONGO_URL` | `mongodb+srv://...` (il tuo MongoDB Atlas) |
| `DB_NAME` | `sos_truffa_production` |
| `EMERGENT_LLM_KEY` | `sk-emergent-1Fa390aBeFbAe44193` |

### Passo 5: Deploy!
Clicca **"Deploy"** e attendi ~2 minuti.

### Passo 6: Copia l'URL
Dopo il deploy, Vercel ti darà un URL tipo:
```
https://scam-detector-backend.vercel.app
```
**COPIA QUESTO URL!**

---

## METODO 2: Deploy da terminale (alternativo)

### PowerShell:
```powershell
# Installa Vercel CLI
npm install -g vercel

# Vai nella cartella backend
cd C:\TUO_PERCORSO\scam-detector-app-4\backend

# Login
vercel login

# Deploy
vercel --prod
```

Quando chiede:
- "Set up and deploy?" → Y
- "Which scope?" → Il tuo account
- "Link to existing project?" → N
- "Project name?" → sos-truffa-backend
- "Directory?" → ./
- "Override settings?" → N

---

## Verifica il deploy

Apri nel browser:
```
https://TUO-URL-VERCEL.vercel.app/api/
```

Devi vedere:
```json
{"message": "SOS Truffa API attiva"}
```

---

## Aggiorna l'app mobile

### PowerShell:
```powershell
# Vai nella cartella del progetto
cd C:\TUO_PERCORSO\scam-detector-app-4

# Aggiorna da GitHub
git pull origin main

# Vai in frontend
cd frontend

# Modifica .env
notepad .env
```

### Nel file .env:
```
EXPO_PUBLIC_BACKEND_URL=https://TUO-URL-VERCEL.vercel.app
```

### Ricompila con cache pulita:
```powershell
# Pulisci cache
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .expo -ErrorAction SilentlyContinue

# Build
eas build --platform ios --clear-cache
```

---

## Problemi comuni

### "Function timed out"
Le funzioni Vercel hanno un timeout di 10 secondi (free tier).
L'analisi AI potrebbe richiedere più tempo. Soluzioni:
- Vercel Pro ha timeout di 60 secondi
- Oppure l'app gestisce già questo caso mostrando "Servizio IA non disponibile"

### "MongoDB connection error"
- Assicurati di usare MongoDB Atlas (non localhost)
- Verifica che l'IP di Vercel sia nella whitelist di Atlas (oppure metti 0.0.0.0/0)

---

## MongoDB Atlas (se non l'hai già)

1. Vai su https://www.mongodb.com/atlas
2. Crea un account gratuito
3. Crea un cluster (Free Tier - M0)
4. Crea un utente database (Database Access)
5. Aggiungi IP 0.0.0.0/0 alla whitelist (Network Access)
6. Clicca "Connect" → "Drivers" → Copia la connection string
7. Sostituisci `<password>` con la tua password

Esempio connection string:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```
