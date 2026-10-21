import json
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

def test_websocket_start_and_ping():
    client = TestClient(app)
    with client.websocket_connect("/ws/translate") as ws:
        # Start session
        ws.send_json({
            "type": "start_session",
            "source_lang": "te",
            "target_lang": "en"
        })
        msg = ws.receive_json()
        assert msg["type"] == "session_started"
        assert msg["source_lang"] == "te"
        assert msg["target_lang"] == "en"

        # Ping
        ws.send_json({"type": "ping"})
        msg = ws.receive_json()
        assert msg["type"] == "pong"

def test_websocket_direct_text_translation():
    client = TestClient(app)
    with client.websocket_connect("/ws/translate") as ws:
        ws.send_json({
            "type": "start_session",
            "source_lang": "te",
            "target_lang": "en"
        })
        _ = ws.receive_json()

        # Send Telugu text
        ws.send_json({
            "type": "text_input",
            "text": "నమస్కారం, మీరు ఎలా ఉన్నారు?"
        })
        msg = ws.receive_json()
        assert msg["type"] == "transcript"
        assert msg["is_final"] is True
        assert msg["source_text"] == "నమస్కారం, మీరు ఎలా ఉన్నారు?"
        assert len(msg["translated_text"]) > 0
        assert msg["audio_base64"] is not None
        assert msg["metrics"]["total_turnaround_ms"] > 0
