"""
LiveVoice AI - Central Language Registry
Tracks truthful capabilities across ASR, Translation, and TTS for all 20 languages.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel

class SamplePhrase(BaseModel):
    native: str
    english: str
    phonetic: Optional[str] = None

class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    asr_supported: bool
    translation_supported: bool
    tts_supported: bool
    default_voice: str
    available_voices: List[str]
    local_model_downloaded: bool
    model_size_mb: int
    model_version: str
    status: str # ready, needs_download, degraded, unsupported
    notes: str
    sample_phrases: List[SamplePhrase]

# All 20 Languages with realistic capabilities and neural voices
LANGUAGE_PACKS: Dict[str, LanguageInfo] = {
    "en": LanguageInfo(
        code="en",
        name="English",
        native_name="English",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="en-US-AriaNeural",
        available_voices=["en-US-AriaNeural", "en-US-GuyNeural", "en-GB-SoniaNeural", "en-IN-NeerjaNeural"],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="Universal ASR, MT and Edge Neural TTS supported.",
        sample_phrases=[
            SamplePhrase(native="Hello, how are you today?", english="Hello, how are you today?", phonetic="Hel-lo, how ar yoo to-day?"),
            SamplePhrase(native="Welcome to LiveVoice real-time translation.", english="Welcome to LiveVoice real-time translation.")
        ]
    ),
    "te": LanguageInfo(
        code="te",
        name="Telugu",
        native_name="తెలుగు",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="te-IN-MohanNeural",
        available_voices=["te-IN-MohanNeural", "te-IN-ShrutiNeural"],
        local_model_downloaded=True,
        model_size_mb=185,
        model_version="1.0.0",
        status="ready",
        notes="High accuracy Indic ASR and Microsoft Edge Mohan/Shruti Neural voices.",
        sample_phrases=[
            SamplePhrase(native="నమస్కారం, మీరు ఎలా ఉన్నారు?", english="Hello, how are you?", phonetic="Namaskaram, meeru ela unnaru?"),
            SamplePhrase(native="నా పేరు రాహుల్, నేను హైదరాబాద్ నుండి వచ్చాను.", english="My name is Rahul, I came from Hyderabad.", phonetic="Naa peru Rahul, nenu Hyderabad nundi vachhanu.")
        ]
    ),
    "hi": LanguageInfo(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="hi-IN-SwaraNeural",
        available_voices=["hi-IN-SwaraNeural", "hi-IN-MadhurNeural"],
        local_model_downloaded=True,
        model_size_mb=170,
        model_version="1.0.0",
        status="ready",
        notes="Comprehensive Hindi support across Whisper, MarianMT, and Neural TTS.",
        sample_phrases=[
            SamplePhrase(native="नमस्ते, आप कैसे हैं?", english="Hello, how are you?", phonetic="Namaste, aap kaise hain?"),
            SamplePhrase(native="यह एक वास्तविक समय अनुवाद परीक्षण है।", english="This is a real-time translation test.")
        ]
    ),
    "ta": LanguageInfo(
        code="ta",
        name="Tamil",
        native_name="தமிழ்",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ta-IN-PallaviNeural",
        available_voices=["ta-IN-PallaviNeural", "ta-IN-ValluvarNeural"],
        local_model_downloaded=True,
        model_size_mb=175,
        model_version="1.0.0",
        status="ready",
        notes="Dravidian language pack with Pallavi and Valluvar neural voices.",
        sample_phrases=[
            SamplePhrase(native="வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?", english="Hello, how are you?", phonetic="Vanakkam, neengal eppadi irukkireergal?")
        ]
    ),
    "kn": LanguageInfo(
        code="kn",
        name="Kannada",
        native_name="ಕನ್ನಡ",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="kn-IN-SapnaNeural",
        available_voices=["kn-IN-SapnaNeural", "kn-IN-GaganNeural"],
        local_model_downloaded=True,
        model_size_mb=165,
        model_version="1.0.0",
        status="ready",
        notes="Kannada language support with Sapna Neural voice.",
        sample_phrases=[
            SamplePhrase(native="ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?", english="Hello, how are you?", phonetic="Namaskara, neevu hegiddeeri?")
        ]
    ),
    "ml": LanguageInfo(
        code="ml",
        name="Malayalam",
        native_name="മലയാളം",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ml-IN-SobhanaNeural",
        available_voices=["ml-IN-SobhanaNeural", "ml-IN-MidhunNeural"],
        local_model_downloaded=True,
        model_size_mb=170,
        model_version="1.0.0",
        status="ready",
        notes="Malayalam support with Sobhana/Midhun neural models.",
        sample_phrases=[
            SamplePhrase(native="നമസ്കാരം, സുഖമാണോ?", english="Hello, are you doing well?", phonetic="Namaskaram, sukhamaano?")
        ]
    ),
    "bn": LanguageInfo(
        code="bn",
        name="Bengali",
        native_name="বাংলা",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="bn-IN-TanishaaNeural",
        available_voices=["bn-IN-TanishaaNeural", "bn-IN-BashkarNeural"],
        local_model_downloaded=True,
        model_size_mb=160,
        model_version="1.0.0",
        status="ready",
        notes="Eastern Indo-Aryan support with Tanishaa and Bashkar voices.",
        sample_phrases=[
            SamplePhrase(native="হ্যালো, আপনি কেমন আছেন?", english="Hello, how are you?", phonetic="Hyālo, āpani kēmana āchēna?")
        ]
    ),
    "mr": LanguageInfo(
        code="mr",
        name="Marathi",
        native_name="मराठी",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="mr-IN-AarohiNeural",
        available_voices=["mr-IN-AarohiNeural", "mr-IN-ManoharNeural"],
        local_model_downloaded=True,
        model_size_mb=160,
        model_version="1.0.0",
        status="ready",
        notes="Marathi support with Aarohi and Manohar voices.",
        sample_phrases=[
            SamplePhrase(native="नमस्कार, तुम्ही कसे आहात?", english="Hello, how are you?", phonetic="Namaskar, tumhi kase aahat?")
        ]
    ),
    "gu": LanguageInfo(
        code="gu",
        name="Gujarati",
        native_name="ગુજરાતી",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="gu-IN-DhwaniNeural",
        available_voices=["gu-IN-DhwaniNeural", "gu-IN-NiranjanNeural"],
        local_model_downloaded=True,
        model_size_mb=155,
        model_version="1.0.0",
        status="ready",
        notes="Gujarati support with Dhwani and Niranjan voices.",
        sample_phrases=[
            SamplePhrase(native="નમસ્તે, તમે કેમ છો?", english="Hello, how are you?", phonetic="Namaste, tame kem chho?")
        ]
    ),
    "pa": LanguageInfo(
        code="pa",
        name="Punjabi",
        native_name="ਪੰਜਾਬੀ",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="pa-IN-GurpreetNeural",
        available_voices=["pa-IN-GurpreetNeural"],
        local_model_downloaded=True,
        model_size_mb=150,
        model_version="1.0.0",
        status="ready",
        notes="Punjabi Gurmukhi support with Gurpreet voice.",
        sample_phrases=[
            SamplePhrase(native="ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?", english="Hello, how are you?", phonetic="Sat sri akaal, tuhada ki haal hai?")
        ]
    ),
    "ur": LanguageInfo(
        code="ur",
        name="Urdu",
        native_name="اردو",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ur-PK-UzmaNeural",
        available_voices=["ur-PK-UzmaNeural", "ur-PK-AsadNeural"],
        local_model_downloaded=True,
        model_size_mb=160,
        model_version="1.0.0",
        status="ready",
        notes="Urdu right-to-left language pack with Uzma and Asad neural voices.",
        sample_phrases=[
            SamplePhrase(native="السلام علیکم، آپ کیسے ہیں؟", english="Peace be upon you, how are you?", phonetic="Assalam-o-alaikum, aap kaise hain?")
        ]
    ),
    "es": LanguageInfo(
        code="es",
        name="Spanish",
        native_name="Español",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="es-ES-ElviraNeural",
        available_voices=["es-ES-ElviraNeural", "es-ES-AlvaroNeural", "es-MX-DaliaNeural"],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="Spanish European and Latin American models.",
        sample_phrases=[
            SamplePhrase(native="¡Hola! ¿Cómo estás hoy?", english="Hello! How are you today?")
        ]
    ),
    "fr": LanguageInfo(
        code="fr",
        name="French",
        native_name="Français",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="fr-FR-DeniseNeural",
        available_voices=["fr-FR-DeniseNeural", "fr-FR-HenriNeural"],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="French neural voice with Denise and Henri.",
        sample_phrases=[
            SamplePhrase(native="Bonjour, comment allez-vous aujourd'hui?", english="Hello, how are you today?")
        ]
    ),
    "de": LanguageInfo(
        code="de",
        name="German",
        native_name="Deutsch",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="de-DE-KatjaNeural",
        available_voices=["de-DE-KatjaNeural", "de-DE-ConradNeural"],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="German language pack with Katja and Conrad neural voices.",
        sample_phrases=[
            SamplePhrase(native="Guten Tag, wie geht es Ihnen?", english="Good day, how are you?")
        ]
    ),
    "pt": LanguageInfo(
        code="pt",
        name="Portuguese",
        native_name="Português",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="pt-BR-FranciscaNeural",
        available_voices=["pt-BR-FranciscaNeural", "pt-PT-RaquelNeural"],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="Portuguese with Brazilian and European voices.",
        sample_phrases=[
            SamplePhrase(native="Olá, tudo bem com você?", english="Hello, is everything good with you?")
        ]
    ),
    "it": LanguageInfo(
        code="it",
        name="Italian",
        native_name="Italiano",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="it-IT-ElsaNeural",
        available_voices=["it-IT-ElsaNeural", "it-IT-DiegoNeural"],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="Italian neural voice with Elsa and Diego.",
        sample_phrases=[
            SamplePhrase(native="Ciao, come stai oggi?", english="Hello, how are you today?")
        ]
    ),
    "ja": LanguageInfo(
        code="ja",
        name="Japanese",
        native_name="日本語",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ja-JP-NanamiNeural",
        available_voices=["ja-JP-NanamiNeural", "ja-JP-KeitaNeural"],
        local_model_downloaded=True,
        model_size_mb=190,
        model_version="1.0.0",
        status="ready",
        notes="Japanese Kanji/Kana tokenization and Nanami neural voice.",
        sample_phrases=[
            SamplePhrase(native="こんにちは、お元気ですか？", english="Hello, how are you?", phonetic="Konnichiwa, ogenki desu ka?")
        ]
    ),
    "ko": LanguageInfo(
        code="ko",
        name="Korean",
        native_name="한국어",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ko-KR-SunHiNeural",
        available_voices=["ko-KR-SunHiNeural", "ko-KR-InJoonNeural"],
        local_model_downloaded=True,
        model_size_mb=180,
        model_version="1.0.0",
        status="ready",
        notes="Korean Hangul support with SunHi and InJoon voices.",
        sample_phrases=[
            SamplePhrase(native="안녕하세요, 오늘 기분이 어떠신가요?", english="Hello, how are you feeling today?", phonetic="Annyeonghaseyo, oneul gibuni eotteoshingayo?")
        ]
    ),
    "zh": LanguageInfo(
        code="zh",
        name="Mandarin Chinese",
        native_name="中文",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="zh-CN-XiaoxiaoNeural",
        available_voices=["zh-CN-XiaoxiaoNeural", "zh-CN-YunxiNeural"],
        local_model_downloaded=True,
        model_size_mb=210,
        model_version="1.0.0",
        status="ready",
        notes="Mandarin Chinese Simplified with Xiaoxiao neural voice.",
        sample_phrases=[
            SamplePhrase(native="你好，你今天过得怎么样？", english="Hello, how is your day going?", phonetic="Nǐ hǎo, nǐ jīntiān guò de zěnmeyàng?")
        ]
    ),
    "ar": LanguageInfo(
        code="ar",
        name="Arabic",
        native_name="العربية",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ar-SA-ZariyahNeural",
        available_voices=["ar-SA-ZariyahNeural", "ar-SA-HamedNeural"],
        local_model_downloaded=True,
        model_size_mb=190,
        model_version="1.0.0",
        status="ready",
        notes="Modern Standard Arabic with Zariyah and Hamed neural voices.",
        sample_phrases=[
            SamplePhrase(native="مرحباً، كيف حالك اليوم؟", english="Hello, how are you today?", phonetic="Marhaban, kayfa haluka al-yawm?")
        ]
    )
}

def get_all_languages() -> List[LanguageInfo]:
    return list(LANGUAGE_PACKS.values())

def get_language(code: str) -> Optional[LanguageInfo]:
    return LANGUAGE_PACKS.get(code.lower())

def validate_language_pair(source: str, target: str) -> tuple[bool, str]:
    if source not in LANGUAGE_PACKS:
        return False, f"Source language '{source}' is not supported in the 20-language pack."
    if target not in LANGUAGE_PACKS:
        return False, f"Target language '{target}' is not supported in the 20-language pack."
    if source == target:
        return True, "Source and target are the same; translation will be identity pass-through."
    return True, "Valid pair."
