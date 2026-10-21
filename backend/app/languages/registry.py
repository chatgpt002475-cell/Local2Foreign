"""
LiveVoice AI - Central Language Registry
Tracks truthful capabilities across ASR, Translation, and TTS for all 20 languages,
with full Male/Female gender choices and regional accent tones.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel

class SamplePhrase(BaseModel):
    native: str
    english: str
    phonetic: Optional[str] = None

class VoiceOption(BaseModel):
    id: str
    name: str
    gender: str  # "Male" or "Female"
    region: str  # "India", "United States", "United Kingdom", etc.
    accent_label: str

class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    asr_supported: bool
    translation_supported: bool
    tts_supported: bool
    default_voice: str
    available_voices: List[str]
    voices: List[VoiceOption] = []
    local_model_downloaded: bool
    model_size_mb: int
    model_version: str
    status: str  # ready, needs_download, degraded, unsupported
    notes: str
    sample_phrases: List[SamplePhrase]

LANGUAGE_PACKS: Dict[str, LanguageInfo] = {
    "en": LanguageInfo(
        code="en",
        name="English",
        native_name="English",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="en-US-AriaNeural",
        available_voices=["en-US-AriaNeural", "en-US-GuyNeural", "en-IN-PrabhatNeural", "en-IN-NeerjaNeural", "en-GB-RyanNeural", "en-GB-SoniaNeural", "en-AU-WilliamNeural"],
        voices=[
            VoiceOption(id="en-US-AriaNeural", name="Aria (US Female)", gender="Female", region="United States", accent_label="US Standard"),
            VoiceOption(id="en-US-GuyNeural", name="Guy (US Male)", gender="Male", region="United States", accent_label="US Standard"),
            VoiceOption(id="en-IN-NeerjaNeural", name="Neerja (India Female)", gender="Female", region="India", accent_label="Indian English"),
            VoiceOption(id="en-IN-PrabhatNeural", name="Prabhat (India Male)", gender="Male", region="India", accent_label="Indian English"),
            VoiceOption(id="en-GB-SoniaNeural", name="Sonia (UK Female)", gender="Female", region="United Kingdom", accent_label="British English"),
            VoiceOption(id="en-GB-RyanNeural", name="Ryan (UK Male)", gender="Male", region="United Kingdom", accent_label="British English"),
            VoiceOption(id="en-AU-WilliamNeural", name="William (Australia Male)", gender="Male", region="Australia", accent_label="Australian English"),
        ],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="Universal ASR, MT and multi-accent Edge Neural TTS supported.",
        sample_phrases=[
            SamplePhrase(native="Hello, how are you today?", english="Hello, how are you today?"),
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
        voices=[
            VoiceOption(id="te-IN-MohanNeural", name="Mohan (తెలుగు - Male)", gender="Male", region="India", accent_label="Andhra / Telangana Male"),
            VoiceOption(id="te-IN-ShrutiNeural", name="Shruti (తెలుగు - Female)", gender="Female", region="India", accent_label="Andhra / Telangana Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=185,
        model_version="1.0.0",
        status="ready",
        notes="High accuracy Indic ASR and Microsoft Edge Mohan/Shruti Neural voices.",
        sample_phrases=[
            SamplePhrase(native="నమస్కారం, మీరు ఎలా ఉన్నారు?", english="Hello, how are you?", phonetic="Namaskaram, meeru ela unnaru?"),
            SamplePhrase(native="నా పేరు రాహుల్, నేను హైదరాబాద్ నుండి వచ్చాను.", english="My name is Rahul, I came from Hyderabad.")
        ]
    ),
    "hi": LanguageInfo(
        code="hi",
        name="Hindi",
        native_name="हिन्दी",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="hi-IN-MadhurNeural",
        available_voices=["hi-IN-MadhurNeural", "hi-IN-SwaraNeural"],
        voices=[
            VoiceOption(id="hi-IN-MadhurNeural", name="Madhur (हिन्दी - Male)", gender="Male", region="India", accent_label="Standard Hindi Male"),
            VoiceOption(id="hi-IN-SwaraNeural", name="Swara (हिन्दी - Female)", gender="Female", region="India", accent_label="Standard Hindi Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=170,
        model_version="1.0.0",
        status="ready",
        notes="Comprehensive Hindi support across Whisper, MarianMT, and Neural TTS.",
        sample_phrases=[
            SamplePhrase(native="नमस्ते, आप कैसे हैं?", english="Hello, how are you?"),
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
        default_voice="ta-IN-ValluvarNeural",
        available_voices=["ta-IN-ValluvarNeural", "ta-IN-PallaviNeural"],
        voices=[
            VoiceOption(id="ta-IN-ValluvarNeural", name="Valluvar (தமிழ் - Male)", gender="Male", region="India", accent_label="Tamil Nadu Male"),
            VoiceOption(id="ta-IN-PallaviNeural", name="Pallavi (தமிழ் - Female)", gender="Female", region="India", accent_label="Tamil Nadu Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=175,
        model_version="1.0.0",
        status="ready",
        notes="Dravidian language pack with Pallavi and Valluvar neural voices.",
        sample_phrases=[
            SamplePhrase(native="வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?", english="Hello, how are you?")
        ]
    ),
    "kn": LanguageInfo(
        code="kn",
        name="Kannada",
        native_name="ಕನ್ನಡ",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="kn-IN-GaganNeural",
        available_voices=["kn-IN-GaganNeural", "kn-IN-SapnaNeural"],
        voices=[
            VoiceOption(id="kn-IN-GaganNeural", name="Gagan (ಕನ್ನಡ - Male)", gender="Male", region="India", accent_label="Karnataka Male"),
            VoiceOption(id="kn-IN-SapnaNeural", name="Sapna (ಕನ್ನಡ - Female)", gender="Female", region="India", accent_label="Karnataka Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=165,
        model_version="1.0.0",
        status="ready",
        notes="Kannada language support with Gagan and Sapna Neural voices.",
        sample_phrases=[
            SamplePhrase(native="ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?", english="Hello, how are you?")
        ]
    ),
    "ml": LanguageInfo(
        code="ml",
        name="Malayalam",
        native_name="മലയാളം",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ml-IN-MidhunNeural",
        available_voices=["ml-IN-MidhunNeural", "ml-IN-SobhanaNeural"],
        voices=[
            VoiceOption(id="ml-IN-MidhunNeural", name="Midhun (മലയാളം - Male)", gender="Male", region="India", accent_label="Kerala Male"),
            VoiceOption(id="ml-IN-SobhanaNeural", name="Sobhana (മലയാളം - Female)", gender="Female", region="India", accent_label="Kerala Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=170,
        model_version="1.0.0",
        status="ready",
        notes="Malayalam support with Sobhana/Midhun neural models.",
        sample_phrases=[
            SamplePhrase(native="നമസ്കാരം, സുഖമാണോ?", english="Hello, are you doing well?")
        ]
    ),
    "bn": LanguageInfo(
        code="bn",
        name="Bengali",
        native_name="বাংলা",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="bn-IN-BashkarNeural",
        available_voices=["bn-IN-BashkarNeural", "bn-IN-TanishaaNeural"],
        voices=[
            VoiceOption(id="bn-IN-BashkarNeural", name="Bashkar (বাংলা - Male)", gender="Male", region="India", accent_label="Bengal Male"),
            VoiceOption(id="bn-IN-TanishaaNeural", name="Tanishaa (বাংলা - Female)", gender="Female", region="India", accent_label="Bengal Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=160,
        model_version="1.0.0",
        status="ready",
        notes="Eastern Indo-Aryan support with Bashkar and Tanishaa voices.",
        sample_phrases=[
            SamplePhrase(native="হ্যালো, আপনি কেমন আছেন?", english="Hello, how are you?")
        ]
    ),
    "mr": LanguageInfo(
        code="mr",
        name="Marathi",
        native_name="मराठी",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="mr-IN-ManoharNeural",
        available_voices=["mr-IN-ManoharNeural", "mr-IN-AarohiNeural"],
        voices=[
            VoiceOption(id="mr-IN-ManoharNeural", name="Manohar (मराठी - Male)", gender="Male", region="India", accent_label="Maharashtra Male"),
            VoiceOption(id="mr-IN-AarohiNeural", name="Aarohi (मराठी - Female)", gender="Female", region="India", accent_label="Maharashtra Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=160,
        model_version="1.0.0",
        status="ready",
        notes="Marathi support with Aarohi and Manohar voices.",
        sample_phrases=[
            SamplePhrase(native="नमस्कार, तुम्ही कसे आहात?", english="Hello, how are you?")
        ]
    ),
    "gu": LanguageInfo(
        code="gu",
        name="Gujarati",
        native_name="ગુજરાતી",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="gu-IN-NiranjanNeural",
        available_voices=["gu-IN-NiranjanNeural", "gu-IN-DhwaniNeural"],
        voices=[
            VoiceOption(id="gu-IN-NiranjanNeural", name="Niranjan (ગુજરાતી - Male)", gender="Male", region="India", accent_label="Gujarat Male"),
            VoiceOption(id="gu-IN-DhwaniNeural", name="Dhwani (ગુજરાતી - Female)", gender="Female", region="India", accent_label="Gujarat Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=155,
        model_version="1.0.0",
        status="ready",
        notes="Gujarati support with Niranjan and Dhwani voices.",
        sample_phrases=[
            SamplePhrase(native="નમસ્તે, તમે કેમ છો?", english="Hello, how are you?")
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
        voices=[
            VoiceOption(id="pa-IN-GurpreetNeural", name="Gurpreet (ਪੰਜਾਬੀ - Female)", gender="Female", region="India", accent_label="Punjab Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=150,
        model_version="1.0.0",
        status="ready",
        notes="Punjabi Gurmukhi support with Gurpreet voice.",
        sample_phrases=[
            SamplePhrase(native="ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?", english="Hello, how are you?")
        ]
    ),
    "ur": LanguageInfo(
        code="ur",
        name="Urdu",
        native_name="اردو",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ur-PK-AsadNeural",
        available_voices=["ur-PK-AsadNeural", "ur-PK-UzmaNeural"],
        voices=[
            VoiceOption(id="ur-PK-AsadNeural", name="Asad (اردو - Male)", gender="Male", region="Pakistan", accent_label="Pakistani Urdu Male"),
            VoiceOption(id="ur-PK-UzmaNeural", name="Uzma (اردو - Female)", gender="Female", region="Pakistan", accent_label="Pakistani Urdu Female"),
        ],
        local_model_downloaded=True,
        model_size_mb=160,
        model_version="1.0.0",
        status="ready",
        notes="Urdu right-to-left language pack with Asad and Uzma neural voices.",
        sample_phrases=[
            SamplePhrase(native="السلام علیکم، آپ کیسے ہیں؟", english="Peace be upon you, how are you?")
        ]
    ),
    "es": LanguageInfo(
        code="es",
        name="Spanish",
        native_name="Español",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="es-ES-AlvaroNeural",
        available_voices=["es-ES-AlvaroNeural", "es-ES-ElviraNeural", "es-MX-JorgeNeural", "es-MX-DaliaNeural"],
        voices=[
            VoiceOption(id="es-ES-AlvaroNeural", name="Alvaro (Spain Male)", gender="Male", region="Spain", accent_label="Castilian Spanish"),
            VoiceOption(id="es-ES-ElviraNeural", name="Elvira (Spain Female)", gender="Female", region="Spain", accent_label="Castilian Spanish"),
            VoiceOption(id="es-MX-JorgeNeural", name="Jorge (Mexico Male)", gender="Male", region="Mexico", accent_label="Latin American Spanish"),
            VoiceOption(id="es-MX-DaliaNeural", name="Dalia (Mexico Female)", gender="Female", region="Mexico", accent_label="Latin American Spanish"),
        ],
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
        default_voice="fr-FR-HenriNeural",
        available_voices=["fr-FR-HenriNeural", "fr-FR-DeniseNeural", "fr-CA-AntoineNeural"],
        voices=[
            VoiceOption(id="fr-FR-HenriNeural", name="Henri (France Male)", gender="Male", region="France", accent_label="Metropolitan French"),
            VoiceOption(id="fr-FR-DeniseNeural", name="Denise (France Female)", gender="Female", region="France", accent_label="Metropolitan French"),
            VoiceOption(id="fr-CA-AntoineNeural", name="Antoine (Canada Male)", gender="Male", region="Canada", accent_label="Canadian French"),
        ],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="French neural voice with Henri and Denise.",
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
        default_voice="de-DE-ConradNeural",
        available_voices=["de-DE-ConradNeural", "de-DE-KatjaNeural"],
        voices=[
            VoiceOption(id="de-DE-ConradNeural", name="Conrad (German Male)", gender="Male", region="Germany", accent_label="Standard German"),
            VoiceOption(id="de-DE-KatjaNeural", name="Katja (German Female)", gender="Female", region="Germany", accent_label="Standard German"),
        ],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="German language pack with Conrad and Katja neural voices.",
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
        default_voice="pt-BR-AntonioNeural",
        available_voices=["pt-BR-AntonioNeural", "pt-BR-FranciscaNeural", "pt-PT-DuarteNeural"],
        voices=[
            VoiceOption(id="pt-BR-AntonioNeural", name="Antonio (Brazil Male)", gender="Male", region="Brazil", accent_label="Brazilian Portuguese"),
            VoiceOption(id="pt-BR-FranciscaNeural", name="Francisca (Brazil Female)", gender="Female", region="Brazil", accent_label="Brazilian Portuguese"),
            VoiceOption(id="pt-PT-DuarteNeural", name="Duarte (Portugal Male)", gender="Male", region="Portugal", accent_label="European Portuguese"),
        ],
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
        default_voice="it-IT-DiegoNeural",
        available_voices=["it-IT-DiegoNeural", "it-IT-ElsaNeural"],
        voices=[
            VoiceOption(id="it-IT-DiegoNeural", name="Diego (Italy Male)", gender="Male", region="Italy", accent_label="Standard Italian"),
            VoiceOption(id="it-IT-ElsaNeural", name="Elsa (Italy Female)", gender="Female", region="Italy", accent_label="Standard Italian"),
        ],
        local_model_downloaded=True,
        model_size_mb=140,
        model_version="1.0.0",
        status="ready",
        notes="Italian neural voice with Diego and Elsa.",
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
        default_voice="ja-JP-KeitaNeural",
        available_voices=["ja-JP-KeitaNeural", "ja-JP-NanamiNeural"],
        voices=[
            VoiceOption(id="ja-JP-KeitaNeural", name="Keita (日本 Male)", gender="Male", region="Japan", accent_label="Standard Japanese"),
            VoiceOption(id="ja-JP-NanamiNeural", name="Nanami (日本 Female)", gender="Female", region="Japan", accent_label="Standard Japanese"),
        ],
        local_model_downloaded=True,
        model_size_mb=190,
        model_version="1.0.0",
        status="ready",
        notes="Japanese Kanji/Kana tokenization and Keita/Nanami neural voices.",
        sample_phrases=[
            SamplePhrase(native="こんにちは、お元気ですか？", english="Hello, how are you?")
        ]
    ),
    "ko": LanguageInfo(
        code="ko",
        name="Korean",
        native_name="한국어",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ko-KR-InJoonNeural",
        available_voices=["ko-KR-InJoonNeural", "ko-KR-SunHiNeural"],
        voices=[
            VoiceOption(id="ko-KR-InJoonNeural", name="InJoon (한국 Male)", gender="Male", region="Korea", accent_label="Standard Korean"),
            VoiceOption(id="ko-KR-SunHiNeural", name="SunHi (한국 Female)", gender="Female", region="Korea", accent_label="Standard Korean"),
        ],
        local_model_downloaded=True,
        model_size_mb=180,
        model_version="1.0.0",
        status="ready",
        notes="Korean Hangul support with InJoon and SunHi voices.",
        sample_phrases=[
            SamplePhrase(native="안녕하세요, 오늘 기분이 어떠신가요?", english="Hello, how are you feeling today?")
        ]
    ),
    "zh": LanguageInfo(
        code="zh",
        name="Mandarin Chinese",
        native_name="中文",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="zh-CN-YunxiNeural",
        available_voices=["zh-CN-YunxiNeural", "zh-CN-XiaoxiaoNeural", "zh-TW-YunJheNeural"],
        voices=[
            VoiceOption(id="zh-CN-YunxiNeural", name="Yunxi (中文 Male)", gender="Male", region="China", accent_label="Mainland Mandarin"),
            VoiceOption(id="zh-CN-XiaoxiaoNeural", name="Xiaoxiao (中文 Female)", gender="Female", region="China", accent_label="Mainland Mandarin"),
            VoiceOption(id="zh-TW-YunJheNeural", name="YunJhe (台灣 Male)", gender="Male", region="Taiwan", accent_label="Taiwanese Mandarin"),
        ],
        local_model_downloaded=True,
        model_size_mb=210,
        model_version="1.0.0",
        status="ready",
        notes="Mandarin Chinese Simplified with Yunxi and Xiaoxiao neural voices.",
        sample_phrases=[
            SamplePhrase(native="你好，你今天过得怎么样？", english="Hello, how is your day going?")
        ]
    ),
    "ar": LanguageInfo(
        code="ar",
        name="Arabic",
        native_name="العربية",
        asr_supported=True,
        translation_supported=True,
        tts_supported=True,
        default_voice="ar-SA-HamedNeural",
        available_voices=["ar-SA-HamedNeural", "ar-SA-ZariyahNeural", "ar-EG-ShakirNeural"],
        voices=[
            VoiceOption(id="ar-SA-HamedNeural", name="Hamed (عربي Male)", gender="Male", region="Saudi Arabia", accent_label="Gulf Arabic"),
            VoiceOption(id="ar-SA-ZariyahNeural", name="Zariyah (عربي Female)", gender="Female", region="Saudi Arabia", accent_label="Gulf Arabic"),
            VoiceOption(id="ar-EG-ShakirNeural", name="Shakir (مصر Male)", gender="Male", region="Egypt", accent_label="Egyptian Arabic"),
        ],
        local_model_downloaded=True,
        model_size_mb=190,
        model_version="1.0.0",
        status="ready",
        notes="Modern Standard Arabic with Hamed and Zariyah neural voices.",
        sample_phrases=[
            SamplePhrase(native="مرحباً، كيف حالك اليوم؟", english="Hello, how are you today?")
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
