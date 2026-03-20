# SOS Truffa – Verifica Messaggi
## Informazioni per App Store

### Nome App
SOS Truffa – Verifica Messaggi

### Sottotitolo (max 30 caratteri)
Verifica messaggi sospetti

### Categoria
Utility / Produttività

### Parole chiave
truffa, phishing, scam, sicurezza, SMS, email, verifica, protezione, frode, messaggio

### Descrizione App Store (Italiano)

Hai ricevuto un SMS, una email o un messaggio sospetto? Non sai se è una truffa?

SOS Truffa ti aiuta a verificare in pochi passaggi il livello di rischio di qualsiasi messaggio ricevuto.

COME FUNZIONA:
• Carica uno screenshot del messaggio oppure incolla il testo
• Rispondi a 8 semplici domande
• Ricevi subito il livello di rischio: Basso, Attenzione o Alta Probabilità di Truffa

FUNZIONALITÀ:
• Analisi AI integrata – L'intelligenza artificiale analizza il contenuto del messaggio per individuare indicatori di truffa
• Lettura automatica da screenshot – Carica un'immagine e il testo viene estratto automaticamente
• 8 domande mirate – Basate sugli schemi più comuni utilizzati dai truffatori
• Risultato immediato – Scopri in pochi secondi se il messaggio è sospetto
• Consigli personalizzati – Suggerimenti pratici su come comportarti in base al rischio

PERCHÉ USARLA:
Le truffe via SMS, email e messaggi sono in costante aumento. SOS Truffa è uno strumento semplice e gratuito pensato per aiutare chiunque — anche chi ha poca dimestichezza con la tecnologia — a riconoscere i tentativi di frode.

Proteggi te stesso e le persone a cui vuoi bene. Condividi l'app con familiari e amici.

DISCLAIMER:
Questo servizio fornisce una valutazione orientativa basata su schemi comuni di truffa. Non sostituisce verifiche ufficiali presso banche o enti pubblici.

### Descrizione Breve (Promotional Text - max 170 caratteri)
Ricevi messaggi sospetti? Verifica subito se sono truffe con l'analisi AI. Carica screenshot o incolla il testo e scopri il livello di rischio in pochi secondi.

### Privacy Policy URL
(Da creare - necessaria per App Store)

### Età consigliata
4+ (nessun contenuto inappropriato)

### Lingue supportate
Italiano

---

## Configurazione Bundle ID
- Bundle ID iOS: com.dredd27.sostruffa
- Package Android: com.dredd27.sostruffa

## Comandi per pubblicazione

### 1. Clona il progetto
```
git clone https://github.com/dredd27/Trust-scan-2.git
cd Trust-scan-2/frontend
npm install
```

### 2. Installa EAS CLI
```
npm install -g eas-cli
eas login
```

### 3. Configura EAS
```
eas build:configure
```

### 4. Build iOS (nel cloud)
```
eas build --platform ios
```

### 5. Pubblica su App Store
```
eas submit --platform ios
```
