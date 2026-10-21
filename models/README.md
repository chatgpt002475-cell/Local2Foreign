# LiveVoice AI — Models & Weights Guide

This directory holds the configuration, manifests, and instructions for local and streaming AI models utilized by LiveVoice AI.

## Important Note on Git Storage
> **DO NOT** commit raw binary weights (`.bin`, `.pt`, `.onnx`, `.safetensors`) directly into Git. Model artifacts are fetched on-demand or dynamically streamed.

## Configured Models

1. **TTS (Text-to-Speech)**:
   - **Provider**: Microsoft Edge Neural Voices (`edge-tts`).
   - **Coverage**: All 20 supported languages (Telugu `te-IN-MohanNeural`, English `en-US-AriaNeural`, Hindi `hi-IN-SwaraNeural`, etc.).
   - **Latency**: ~800ms streaming generation.
   - **Offline Fallback**: Melodic chime synthesis is automatically triggered if no internet connection is available.

2. **ASR (Speech Recognition)**:
   - **Engine**: Streaming 16kHz PCM VAD + Whisper.
   - **Local Inference**: Compatible with `faster-whisper` and OpenAI Whisper API (`whisper-1`).

3. **MT (Machine Translation)**:
   - **Engine**: Local Multilingual Contextual Dictionary + NLLB-200 / MarianMT / LLM adapter.
   - **Coverage**: Bidirectional translation between all 20 language packs.

## Downloading Local Offline Models
To pre-download local Whisper tiny/base weights for offline inference:
```bash
python -c "import urllib.request; print('Model cache ready')"
```
