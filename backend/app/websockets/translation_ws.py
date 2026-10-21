"""
LiveVoice AI - Streaming WebSocket Endpoint
"""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.session_manager import session_manager
from ..config import settings

ws_router = APIRouter()

@ws_router.websocket("/ws/translate")
async def websocket_translation_endpoint(websocket: WebSocket):
    await websocket.accept()
    current_session = None

    try:
        while True:
            message = await websocket.receive()

            if "text" in message and message["text"]:
                try:
                    data = json.loads(message["text"])
                    msg_type = data.get("type")

                    if msg_type == "start_session":
                        source_lang = data.get("source_lang", settings.DEFAULT_SOURCE_LANG)
                        target_lang = data.get("target_lang", settings.DEFAULT_TARGET_LANG)
                        auto_detect = data.get("auto_detect", False)
                        provider = data.get("provider", settings.AI_PROVIDER)
                        voice = data.get("voice")

                        current_session = await session_manager.create_session(
                            websocket=websocket,
                            source_lang=source_lang,
                            target_lang=target_lang,
                            auto_detect=auto_detect,
                            provider=provider,
                            voice=voice
                        )
                        await websocket.send_json({
                            "type": "session_started",
                            "session_id": current_session.session_id,
                            "source_lang": source_lang,
                            "target_lang": target_lang
                        })

                    elif msg_type == "update_config" and current_session:
                        current_session.update_config(
                            source_lang=data.get("source_lang"),
                            target_lang=data.get("target_lang"),
                            auto_detect=data.get("auto_detect")
                        )

                    elif msg_type == "text_input" and current_session:
                        text = data.get("text", "")
                        s_lang = data.get("source_lang")
                        t_lang = data.get("target_lang")
                        await current_session.process_direct_text(text, s_lang, t_lang)

                    elif msg_type == "ping":
                        await websocket.send_json({"type": "pong"})

                    elif msg_type == "stop_session":
                        if current_session:
                            session_manager.remove_session(current_session.session_id)
                            current_session = None

                except json.JSONDecodeError:
                    await websocket.send_json({"type": "error", "message": "Invalid JSON payload"})

            elif "bytes" in message and message["bytes"]:
                if current_session:
                    await current_session.handle_audio_frame(message["bytes"])

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[WebSocket] Exception: {e}")
    finally:
        if current_session:
            session_manager.remove_session(current_session.session_id)
