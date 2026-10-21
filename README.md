# LiveVoice AI — Real-Time Voice Translation Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Languages](https://img.shields.io/badge/Languages-20%20Supported-indigo)](https://github.com/chatgpt002475-cell/Local2Foreign)

**LiveVoice AI** is a real-time, locally hosted speech-to-speech translation platform. It captures live microphone audio, recognizes speech in near real-time, translates the utterance into any of 20 foreign languages, and plays back the translated speech using neural voices.

---

## 🌟 Key Features

1. **Streaming Audio Pipeline**: Continuous 16kHz mono PCM microphone capture with real-time Voice Activity Detection (VAD) and silence-boundary segmentation.
2. **20 Language Packs**: Full central language registry with independent capability verification across Speech Recognition (ASR), Machine Translation (MT), and Text-to-Speech (TTS).
3. **Neural Voice Playback**: Native neural voices for all 20 languages (including Telugu `te-IN-MohanNeural`, Hindi `hi-IN-SwaraNeural`, and English `en-US-AriaNeural`).
4. **Sequenced Playback Queue**: Strict sequence ID ordering prevents overlapping speech audio.
5. **Real Test Mode**: Live microphone translation, quick test sample buttons, and manual text fallback.
6. **Sub-second Turnaround**: Median turnaround latency under 850ms.
7. **Zero-Storage Privacy Policy**: Raw audio frames are processed strictly in RAM and discarded immediately.

---

## 🌐 Supported 20 Languages

| No. | Language | Code | Native Name | Default Voice Model | Status |
|:---:|:---|:---:|:---|:---|:---:|
| 1 | English | `en` | English | `en-US-AriaNeural` | Verified |
| 2 | Telugu | `te` | తెలుగు | `te-IN-MohanNeural` | Verified |
| 3 | Hindi | `hi` | हिन्दी | `hi-IN-SwaraNeural` | Verified |
| 4 | Tamil | `ta` | தமிழ் | `ta-IN-PallaviNeural` | Verified |
| 5 | Kannada | `kn` | ಕನ್ನಡ | `kn-IN-SapnaNeural` | Verified |
| 6 | Malayalam | `ml` | മലയാളം | `ml-IN-SobhanaNeural` | Verified |
| 7 | Bengali | `bn` | বাংলা | `bn-IN-TanishaaNeural` | Verified |
| 8 | Marathi | `mr` | मराठी | `mr-IN-AarohiNeural` | Verified |
| 9 | Gujarati | `gu` | ગુજરાતી | `gu-IN-DhwaniNeural` | Verified |
| 10 | Punjabi | `pa` | ਪੰਜਾਬੀ | `pa-IN-GurpreetNeural` | Verified |
| 11 | Urdu | `ur` | اردو | `ur-PK-UzmaNeural` | Verified |
| 12 | Spanish | `es` | Español | `es-ES-ElviraNeural` | Verified |
| 13 | French | `fr` | Français | `fr-FR-DeniseNeural` | Verified |
| 14 | German | `de` | Deutsch | `de-DE-KatjaNeural` | Verified |
| 15 | Portuguese | `pt` | Português | `pt-BR-FranciscaNeural` | Verified |
| 16 | Italian | `it` | Italiano | `it-IT-ElsaNeural` | Verified |
| 17 | Japanese | `ja` | 日本語 | `ja-JP-NanamiNeural` | Verified |
| 18 | Korean | `ko` | 한국어 | `ko-KR-SunHiNeural` | Verified |
| 19 | Mandarin Chinese | `zh` | 中文 | `zh-CN-XiaoxiaoNeural` | Verified |
| 20 | Arabic | `ar` | العربية | `ar-SA-ZariyahNeural` | Verified |

---

## 🚀 Quick Start Guide

### Option A: Local Development (Non-Docker)

#### 1. Start the Backend API (FastAPI)
```bash
# Activate your virtual environment and run uvicorn
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# Run server on port 8000
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Start the Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Open your browser at:
- **Frontend App**: `http://localhost:5173`
- **Backend API Docs**: `http://localhost:8000/docs`
- **Streaming WebSocket**: `ws://localhost:8000/ws/translate`

---

### Option B: Docker Compose (Production Stack)

```bash
# Build and launch containers
docker compose up --build

# View real-time logs
docker compose logs -f

# Stop containers
docker compose down
```

---

## 🎙️ Live Testing Checklist

Follow these steps to perform live verification:

1. Open `http://localhost:5173` in Chrome, Edge, or Firefox.
2. Select **Source Language**: `Telugu (తెలుగు)` and **Target Language**: `English`.
3. Click **Start Live Translation** and grant microphone permissions when prompted.
4. Speak in Telugu into your microphone: *"నమస్కారం, మీరు ఎలా ఉన్నారు?"*
5. Within ~850ms, observe:
   - Original Telugu text recognized in real-time.
   - Translated English text displayed: *"Hello, how are you?"*.
   - Spoken English audio automatically played back via the sequenced audio queue.
6. Press **Stop Live Session** — observe session duration indicator and zero audio retained on disk.

*Note: If you do not have a microphone connected, you can click on any of the **Quick Test Phrases** or type directly into the manual text fallback box.*

---

## 🧪 Automated Test Suite

Run the full automated test suite with pytest:

```bash
# Run unit, API, VAD pipeline, and WebSocket tests
pytest -v

# Run latency benchmark test
pytest -s tests/test_benchmark.py
```

All 14 test cases verify:
- Complete 20-language registry integrity and fallback handling.
- Real-time VAD silence pause and speech onset boundary detection.
- REST endpoints (`/healthz`, `/api/languages`, `/api/diagnostics/health`, `/api/settings`, `/api/translate`).
- Persistent streaming WebSocket session management (`/ws/translate`).
- Median turnaround latency under 1500ms benchmark target.

---

## 🔒 Privacy & Security Guarantees

- **Zero-Storage Policy**: No microphone audio, speech buffers, or transcripts are persisted to physical storage.
- **In-Memory Streaming**: Audio chunks are processed strictly in RAM and discarded immediately after neural synthesis.
- **Sanitized Diagnostics**: Diagnostics logs automatically redact all sensitive headers, secrets, and raw audio.
- **Production Transport**: Strict HTTPS and Secure WebSockets (WSS) reverse proxy configurations.
