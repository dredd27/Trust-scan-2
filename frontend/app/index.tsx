import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Image,
  Dimensions,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideInLeft,
} from 'react-native-reanimated';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------- Colors ----------
const C = {
  primary: '#0056D2',
  primaryLight: '#E3F2FD',
  primaryDark: '#0041A3',
  safe: '#10B981',
  safeBg: '#ECFDF5',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  bg: '#F8FAFC',
  paper: '#FFFFFF',
  input: '#F1F5F9',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textDisabled: '#CBD5E1',
  border: '#E2E8F0',
};

// ---------- Questions ----------
const QUESTIONS = [
  { id: 1, text: 'Il messaggio crea urgenza?', desc: '(es. "agisci subito", "blocco conto")' },
  { id: 2, text: 'Ti chiede dati personali o bancari?', desc: '(password, carta, codice OTP)' },
  { id: 3, text: 'Il mittente è sconosciuto o sospetto?', desc: '' },
  { id: 4, text: 'È presente un link?', desc: '' },
  { id: 5, text: 'Il link sembra strano o diverso dal sito ufficiale?', desc: '', hasNonSo: true },
  { id: 6, text: 'Ci sono errori grammaticali o frasi strane?', desc: '' },
  { id: 7, text: 'Ti promette un rimborso o un premio?', desc: '' },
  { id: 8, text: 'Richiede di contattare un numero di telefono mobile?', desc: '' },
];

type Answer = 'SI' | 'NO' | 'NON SO' | null;
type InputMethod = 'screenshot' | 'text' | null;

export default function Index() {
  const [step, setStep] = useState(0);
  const [inputMethod, setInputMethod] = useState<InputMethod>(null);
  const [messageText, setMessageText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answer[]>(new Array(8).fill(null));
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [aiIndicators, setAiIndicators] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [riskResult, setRiskResult] = useState<any>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [donationModal, setDonationModal] = useState<'paypal' | 'satispay' | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // ---------- Pick Image ----------
  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageBase64(result.assets[0].base64 || null);
      setImageUri(result.assets[0].uri);
    }
  }, []);

  // ---------- Analyze Message (AI) ----------
  const analyzeMessage = useCallback(async () => {
    setLoadingAi(true);
    try {
      const body: any = {};
      if (inputMethod === 'text') {
        body.text = messageText;
      } else if (inputMethod === 'screenshot' && imageBase64) {
        body.image_base64 = imageBase64;
      }
      const res = await fetch(`${BACKEND_URL}/api/analyze-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setAiAnalysis(data.ai_analysis || '');
      setAiIndicators(data.risk_indicators || []);
      if (data.extracted_text) {
        setExtractedText(data.extracted_text);
      }
    } catch (e) {
      setAiAnalysis('Errore nella connessione al server.');
    } finally {
      setLoadingAi(false);
    }
  }, [inputMethod, messageText, imageBase64]);

  // ---------- Calculate Risk ----------
  const calculateRisk = useCallback(async () => {
    setLoadingRisk(true);
    try {
      const answerList = answers.map((a, i) => ({
        question_id: i + 1,
        answer: a || 'NO',
      }));
      const res = await fetch(`${BACKEND_URL}/api/calculate-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answerList,
          message_text: messageText || extractedText,
          ai_analysis: aiAnalysis,
        }),
      });
      const data = await res.json();
      setRiskResult(data);
    } catch (e) {
      setRiskResult({
        score: 0,
        level: 'ERRORE',
        label: 'Errore',
        message: 'Impossibile calcolare il rischio. Riprova.',
        advice: [],
      });
    } finally {
      setLoadingRisk(false);
    }
  }, [answers, messageText, extractedText, aiAnalysis]);

  // ---------- Navigate Steps ----------
  const goToStep1 = () => {
    setStep(1);
    scrollRef.current?.scrollTo({ y: 0 });
  };
  const goToStep2 = async () => {
    Keyboard.dismiss();
    setStep(2);
    scrollRef.current?.scrollTo({ y: 0 });
    // Fire AI analysis in background
    analyzeMessage();
  };
  const goToStep3 = async () => {
    setStep(3);
    scrollRef.current?.scrollTo({ y: 0 });
    await calculateRisk();
  };
  const resetAll = () => {
    setStep(0);
    setInputMethod(null);
    setMessageText('');
    setImageBase64(null);
    setImageUri(null);
    setAnswers(new Array(8).fill(null));
    setAiAnalysis('');
    setAiIndicators([]);
    setExtractedText(null);
    setRiskResult(null);
    scrollRef.current?.scrollTo({ y: 0 });
  };

  const setAnswer = (index: number, value: Answer) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const canProceedStep1 =
    (inputMethod === 'text' && messageText.trim().length > 0) ||
    (inputMethod === 'screenshot' && imageBase64 !== null);

  const allAnswered = answers.every((a) => a !== null);

  // ---------- Render Welcome ----------
  const renderWelcome = () => (
    <Animated.View entering={FadeIn.duration(600)} style={styles.stepContainer}>
      <View style={styles.welcomeIconRow}>
        <View style={styles.shieldCircle}>
          <MaterialCommunityIcons name="shield-check" size={48} color={C.primary} />
        </View>
      </View>
      <Text style={styles.welcomeTitle}>SOS Truffa</Text>
      <Text style={styles.welcomeSubtitle}>Verifica Messaggi</Text>
      <View style={styles.welcomeDescCard}>
        <MaterialCommunityIcons name="alert-decagram" size={24} color={C.primary} style={{ alignSelf: 'center', marginBottom: 8 }} />
        <Text style={styles.welcomeDesc}>
          Hai ricevuto un SMS, una email o un messaggio sospetto?
        </Text>
        <Text style={styles.welcomeDescBold}>
          Verifica in pochi passaggi il livello di rischio.
        </Text>
      </View>
      <View style={styles.featuresCard}>
        <Text style={styles.featuresTitle}>Cosa puoi fare:</Text>
        <FeatureItem icon="image-search" label="Analisi Screenshot" />
        <FeatureItem icon="text-search" label="Analisi Testo" />
        <FeatureItem icon="brain" label="Intelligenza Artificiale" />
        <FeatureItem icon="speedometer" label="Risultato Istantaneo" />
      </View>
      <TouchableOpacity
        testID="start-verification-btn"
        style={styles.ctaBtn}
        onPress={goToStep1}
        activeOpacity={0.85}
      >
        <View style={styles.ctaInner}>
          <MaterialCommunityIcons name="shield-search" size={26} color="#FFF" />
          <View>
            <Text style={styles.ctaBtnText}>Inizia la Verifica</Text>
            <Text style={styles.ctaBtnSub}>Analizza un messaggio sospetto</Text>
          </View>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={24} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </Animated.View>
  );

  // ---------- Render Step 1 ----------
  const renderStep1 = () => (
    <Animated.View entering={SlideInRight.duration(400)} style={styles.stepContainer}>
      <StepHeader step={1} title="Inserisci il messaggio" />
      <Text style={styles.sectionLabel}>Scegli una delle due opzioni:</Text>
      <View style={styles.optionRow}>
        <TouchableOpacity
          testID="option-screenshot"
          style={[
            styles.optionCard,
            inputMethod === 'screenshot' && styles.optionCardActive,
          ]}
          onPress={() => setInputMethod('screenshot')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="image-plus"
            size={32}
            color={inputMethod === 'screenshot' ? C.primary : C.textSecondary}
          />
          <Text
            style={[
              styles.optionText,
              inputMethod === 'screenshot' && styles.optionTextActive,
            ]}
          >
            Carica{'\n'}Screenshot
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="option-text"
          style={[
            styles.optionCard,
            inputMethod === 'text' && styles.optionCardActive,
          ]}
          onPress={() => setInputMethod('text')}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="text-box-outline"
            size={32}
            color={inputMethod === 'text' ? C.primary : C.textSecondary}
          />
          <Text
            style={[
              styles.optionText,
              inputMethod === 'text' && styles.optionTextActive,
            ]}
          >
            Incolla{'\n'}Testo
          </Text>
        </TouchableOpacity>
      </View>

      {inputMethod === 'screenshot' && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <TouchableOpacity
            testID="upload-image-btn"
            style={styles.uploadArea}
            onPress={pickImage}
            activeOpacity={0.7}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <MaterialCommunityIcons name="cloud-upload" size={40} color={C.textSecondary} />
                <Text style={styles.uploadText}>Tocca per caricare un'immagine</Text>
              </View>
            )}
          </TouchableOpacity>
          {imageUri && (
            <TouchableOpacity onPress={() => { setImageBase64(null); setImageUri(null); }} style={styles.removeImageBtn}>
              <MaterialCommunityIcons name="close-circle" size={18} color={C.danger} />
              <Text style={styles.removeImageText}>Rimuovi immagine</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {inputMethod === 'text' && (
        <Animated.View entering={FadeInDown.duration(300)}>
          <TextInput
            testID="message-text-input"
            style={styles.textArea}
            placeholder="Incolla qui il messaggio ricevuto"
            placeholderTextColor={C.textDisabled}
            multiline
            numberOfLines={6}
            value={messageText}
            onChangeText={setMessageText}
            textAlignVertical="top"
          />
        </Animated.View>
      )}

      <View style={styles.navRow}>
        <TouchableOpacity testID="back-to-welcome" style={styles.secondaryBtn} onPress={() => setStep(0)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={C.primary} />
          <Text style={styles.secondaryBtnText}>Indietro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="go-to-step2-btn"
          style={[styles.primaryBtn, styles.navBtn, !canProceedStep1 && styles.btnDisabled]}
          onPress={goToStep2}
          disabled={!canProceedStep1}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Avanti</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // ---------- Render Step 2 ----------
  const renderStep2 = () => (
    <Animated.View entering={SlideInRight.duration(400)} style={styles.stepContainer}>
      <StepHeader step={2} title="Rispondi alle domande" />
      <Text style={styles.sectionLabel}>Rispondi in base al messaggio ricevuto:</Text>

      {QUESTIONS.map((q, index) => (
        <Animated.View
          key={q.id}
          entering={FadeInDown.delay(index * 60).duration(300)}
          style={styles.questionCard}
        >
          <View style={styles.questionHeader}>
            <View style={styles.questionNumber}>
              <Text style={styles.questionNumberText}>{q.id}</Text>
            </View>
            <View style={styles.questionTextWrap}>
              <Text style={styles.questionText}>{q.text}</Text>
              {q.desc ? <Text style={styles.questionDesc}>{q.desc}</Text> : null}
            </View>
          </View>
          <View style={styles.answerRow}>
            <AnswerButton
              testID={`q${q.id}-si`}
              label="SÌ"
              active={answers[index] === 'SI'}
              color={C.danger}
              onPress={() => setAnswer(index, 'SI')}
            />
            <AnswerButton
              testID={`q${q.id}-no`}
              label="NO"
              active={answers[index] === 'NO'}
              color={C.safe}
              onPress={() => setAnswer(index, 'NO')}
            />
            {q.hasNonSo && (
              <AnswerButton
                testID={`q${q.id}-nonso`}
                label="NON SO"
                active={answers[index] === 'NON SO'}
                color={C.warning}
                onPress={() => setAnswer(index, 'NON SO')}
              />
            )}
          </View>
        </Animated.View>
      ))}

      {loadingAi && (
        <View style={styles.aiLoadingCard}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={styles.aiLoadingText}>Analisi AI in corso...</Text>
        </View>
      )}

      <View style={styles.navRow}>
        <TouchableOpacity testID="back-to-step1" style={styles.secondaryBtn} onPress={() => setStep(1)} activeOpacity={0.7}>
          <MaterialCommunityIcons name="arrow-left" size={20} color={C.primary} />
          <Text style={styles.secondaryBtnText}>Indietro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="go-to-step3-btn"
          style={[styles.primaryBtn, styles.navBtn, !allAnswered && styles.btnDisabled]}
          onPress={goToStep3}
          disabled={!allAnswered}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>Calcola Rischio</Text>
          <MaterialCommunityIcons name="shield-search" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  // ---------- Render Step 3 ----------
  const renderStep3 = () => {
    if (loadingRisk) {
      return (
        <Animated.View entering={FadeIn.duration(400)} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Calcolo del rischio in corso...</Text>
        </Animated.View>
      );
    }
    if (!riskResult) return null;

    const levelColor =
      riskResult.level === 'BASSO' ? C.safe :
      riskResult.level === 'ATTENZIONE' ? C.warning : C.danger;
    const levelBg =
      riskResult.level === 'BASSO' ? C.safeBg :
      riskResult.level === 'ATTENZIONE' ? C.warningBg : C.dangerBg;
    const levelIcon =
      riskResult.level === 'BASSO' ? 'shield-check' :
      riskResult.level === 'ATTENZIONE' ? 'shield-alert' : 'shield-remove';

    return (
      <Animated.View entering={FadeIn.duration(600)} style={styles.stepContainer}>
        <StepHeader step={3} title="Risultato" />

        {/* Risk Level Card */}
        <Animated.View entering={FadeInUp.duration(500)} style={[styles.resultCard, { backgroundColor: levelBg, borderColor: levelColor }]}>
          <MaterialCommunityIcons name={levelIcon} size={56} color={levelColor} />
          <Text style={[styles.resultLabel, { color: levelColor }]} testID="risk-label">
            {riskResult.label}
          </Text>
          <Text style={styles.resultMessage}>{riskResult.message}</Text>
        </Animated.View>

        {/* AI Analysis */}
        {aiAnalysis ? (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <MaterialCommunityIcons name="brain" size={22} color={C.primary} />
              <Text style={styles.aiCardTitle}>Analisi AI</Text>
            </View>
            <Text style={styles.aiCardText}>{aiAnalysis}</Text>
            {aiIndicators.length > 0 && (
              <View style={styles.indicatorsList}>
                <Text style={styles.indicatorsTitle}>Indicatori trovati:</Text>
                {aiIndicators.map((ind, i) => (
                  <View key={i} style={styles.indicatorRow}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={C.warning} />
                    <Text style={styles.indicatorText}>{ind}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        ) : null}

        {/* Extracted Text */}
        {extractedText ? (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.extractedCard}>
            <View style={styles.aiCardHeader}>
              <MaterialCommunityIcons name="text-recognition" size={22} color={C.primary} />
              <Text style={styles.aiCardTitle}>Testo Estratto</Text>
            </View>
            <Text style={styles.extractedText}>{extractedText}</Text>
          </Animated.View>
        ) : null}

        {/* Advice */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.adviceCard}>
          <View style={styles.aiCardHeader}>
            <MaterialCommunityIcons name="lightbulb-on" size={22} color={C.warning} />
            <Text style={styles.aiCardTitle}>Consigli</Text>
          </View>
          {riskResult.advice.map((a: string, i: number) => (
            <View key={i} style={styles.adviceRow}>
              <MaterialCommunityIcons name="check-circle" size={18} color={C.safe} />
              <Text style={styles.adviceText}>{a}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} style={styles.disclaimerCard}>
          <MaterialCommunityIcons name="information" size={18} color={C.textSecondary} />
          <Text style={styles.disclaimerText}>
            Questo servizio fornisce una valutazione orientativa basata su schemi comuni di truffa.
            Non sostituisce verifiche ufficiali presso banche o enti pubblici.
          </Text>
        </Animated.View>

        {/* Support Section - BEFORE Nuova Verifica */}
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.supportSection}>
          <Text style={styles.supportTitle}>Ti è stato utile?</Text>
          <Text style={styles.supportDesc}>
            Salva questo strumento tra i preferiti per averlo sempre a portata di mano.
          </Text>

          <TouchableOpacity
            testID="add-bookmark-btn"
            style={styles.bookmarkBtn}
            onPress={() => {
              Linking.openURL('https://trust-scan-2.preview.emergentagent.com');
            }}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="bookmark-plus" size={22} color={C.primary} />
            <Text style={styles.bookmarkBtnText}>Aggiungi ai Preferiti</Text>
          </TouchableOpacity>

          <View style={styles.donationDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>oppure</Text>
            <View style={styles.dividerLine} />
          </View>

          <Text style={styles.donationDesc}>
            Vuoi supportare questo progetto gratuito?
          </Text>

          <View style={styles.donationRow}>
            <TouchableOpacity
              testID="donate-paypal-btn"
              style={styles.donateBtn}
              onPress={() => Linking.openURL('https://www.paypal.com/qrcodes/p2pqrc/KCLXJ8CWZ8BES')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="coffee" size={20} color="#003087" />
              <Text style={styles.donateBtnText}>Offri un caffè</Text>
              <Text style={styles.donateBtnSub}>PayPal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="donate-satispay-btn"
              style={styles.donateBtn}
              onPress={() => setDonationModal('satispay')}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="heart" size={20} color="#E42313" />
              <Text style={styles.donateBtnText}>Dona con</Text>
              <Text style={styles.donateBtnSub}>Satispay</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Nuova Verifica - at the very bottom */}
        <TouchableOpacity testID="new-verification-btn" style={styles.primaryBtn} onPress={resetAll} activeOpacity={0.8}>
          <MaterialCommunityIcons name="refresh" size={22} color="#FFF" />
          <Text style={styles.primaryBtnText}>Nuova Verifica</Text>
        </TouchableOpacity>

        {/* Donation Modal */}
        <Modal
          visible={donationModal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setDonationModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                testID="close-donation-modal"
                style={styles.modalClose}
                onPress={() => setDonationModal(null)}
              >
                <MaterialCommunityIcons name="close" size={24} color={C.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {donationModal === 'paypal' ? 'Dona con PayPal' : 'Dona con Satispay'}
              </Text>
              <Text style={styles.modalDesc}>
                Scansiona il QR code per fare una donazione
              </Text>
              <Image
                source={
                  donationModal === 'paypal'
                    ? require('../assets/images/paypal_qr.jpeg')
                    : require('../assets/images/satispay_qr.jpeg')
                }
                style={styles.qrImage}
              />
              <Text style={styles.modalThank}>Grazie per il tuo supporto!</Text>
            </View>
          </View>
        </Modal>
      </Animated.View>
    );
  };

  // ---------- Progress Bar ----------
  const renderProgress = () => {
    if (step === 0) return null;
    return (
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                s <= step ? styles.progressDotActive : {},
                s < step ? styles.progressDotDone : {},
              ]}
            >
              {s < step ? (
                <MaterialCommunityIcons name="check" size={14} color="#FFF" />
              ) : (
                <Text style={[styles.progressDotText, s <= step && styles.progressDotTextActive]}>
                  {s}
                </Text>
              )}
            </View>
            {s < 3 && <View style={[styles.progressLine, s < step && styles.progressLineActive]} />}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} testID="sos-truffa-app">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        {renderProgress()}
        <ScrollView
          ref={scrollRef}
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && renderWelcome()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- Sub-components ----------

function StepHeader({ step, title }: { step: number; title: string }) {
  return (
    <View style={styles.stepHeaderRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>PASSO {step}</Text>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
    </View>
  );
}

function FeatureItem({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.featureItem}>
      <MaterialCommunityIcons name={icon as any} size={20} color={C.primary} />
      <Text style={styles.featureItemText}>{label}</Text>
    </View>
  );
}

function AnswerButton({
  testID,
  label,
  active,
  color,
  onPress,
}: {
  testID: string;
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.answerBtn,
        active && { backgroundColor: color, borderColor: color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.answerBtnText, active && { color: '#FFF' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  flex1: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  stepContainer: { padding: 20 },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: C.paper,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.input,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.border,
  },
  progressDotActive: { borderColor: C.primary, backgroundColor: C.primaryLight },
  progressDotDone: { backgroundColor: C.primary, borderColor: C.primary },
  progressDotText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },
  progressDotTextActive: { color: C.primary },
  progressLine: { width: 48, height: 3, backgroundColor: C.border, marginHorizontal: 4, borderRadius: 2 },
  progressLineActive: { backgroundColor: C.primary },

  // Welcome
  welcomeIconRow: { alignItems: 'center', marginTop: 32, marginBottom: 16 },
  shieldCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 20,
    fontWeight: '500',
    color: C.primary,
    textAlign: 'center',
    marginTop: 4,
  },
  welcomeDescCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeDesc: {
    fontSize: 17,
    lineHeight: 26,
    color: C.textPrimary,
    textAlign: 'center',
  },
  welcomeDescBold: {
    fontSize: 17,
    lineHeight: 26,
    color: C.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featuresCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
  },
  featuresTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  featureItemText: {
    fontSize: 15,
    color: C.textPrimary,
    fontWeight: '500',
  },

  // CTA Button
  ctaBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  ctaBtnSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '400',
    marginTop: 2,
  },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
  },
  secondaryBtnText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  navBtn: { flex: 1 },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  btnDisabled: { opacity: 0.4 },

  // Step Header
  stepHeaderRow: { marginBottom: 20 },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepBadgeText: { fontSize: 12, fontWeight: '700', color: C.primary, letterSpacing: 1 },
  stepTitle: { fontSize: 24, fontWeight: '600', color: C.textPrimary, letterSpacing: -0.25 },
  sectionLabel: { fontSize: 16, color: C.textSecondary, marginBottom: 16 },

  // Step 1 options
  optionRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  optionCard: {
    flex: 1,
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    minHeight: 120,
  },
  optionCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSecondary,
    textAlign: 'center',
  },
  optionTextActive: { color: C.primary },

  // Upload
  uploadArea: {
    backgroundColor: C.paper,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.border,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
    overflow: 'hidden',
  },
  uploadPlaceholder: { alignItems: 'center', gap: 12 },
  uploadText: { fontSize: 15, color: C.textSecondary },
  previewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'contain' },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'center',
  },
  removeImageText: { fontSize: 14, color: C.danger },

  // Text input
  textArea: {
    backgroundColor: C.input,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: C.textPrimary,
    minHeight: 150,
    borderWidth: 1,
    borderColor: C.border,
    lineHeight: 24,
  },

  // Questions
  questionCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  questionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionNumberText: { fontSize: 14, fontWeight: '700', color: C.primary },
  questionTextWrap: { flex: 1 },
  questionText: { fontSize: 15, fontWeight: '600', color: C.textPrimary, lineHeight: 22 },
  questionDesc: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  answerRow: { flexDirection: 'row', gap: 8 },
  answerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  answerBtnText: { fontSize: 14, fontWeight: '600', color: C.textSecondary },

  // AI loading
  aiLoadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  aiLoadingText: { fontSize: 14, color: C.primary, fontWeight: '500' },

  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  loadingText: { fontSize: 16, color: C.textSecondary, marginTop: 16 },

  // Results
  resultCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    marginBottom: 16,
  },
  resultLabel: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  resultMessage: { fontSize: 16, color: C.textPrimary, textAlign: 'center', lineHeight: 24, marginTop: 4 },

  // AI Card
  aiCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  aiCardTitle: { fontSize: 17, fontWeight: '600', color: C.textPrimary },
  aiCardText: { fontSize: 15, color: C.textPrimary, lineHeight: 24 },
  indicatorsList: { marginTop: 12 },
  indicatorsTitle: { fontSize: 14, fontWeight: '600', color: C.textSecondary, marginBottom: 6 },
  indicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  indicatorText: { fontSize: 14, color: C.textPrimary, flex: 1 },

  // Extracted text
  extractedCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  extractedText: { fontSize: 14, color: C.textSecondary, lineHeight: 22, fontStyle: 'italic' },

  // Advice
  adviceCard: {
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  adviceText: { fontSize: 15, color: C.textPrimary, flex: 1, lineHeight: 22 },

  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: C.input,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  disclaimerText: { fontSize: 13, color: C.textSecondary, lineHeight: 20, flex: 1 },

  // Support Section
  supportSection: {
    marginTop: 24,
    backgroundColor: C.paper,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
  },
  supportDesc: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.primaryLight,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  bookmarkBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
  },
  donationDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    fontSize: 13,
    color: C.textSecondary,
    paddingHorizontal: 12,
  },
  donationDesc: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  donationRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  donateBtn: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  donateBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  donateBtnSub: {
    fontSize: 12,
    color: C.textSecondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: C.paper,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  modalClose: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: 12,
    resizeMode: 'contain',
  },
  modalThank: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
    marginTop: 16,
  },
});
