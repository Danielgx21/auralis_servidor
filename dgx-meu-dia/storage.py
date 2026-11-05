"""Persistência segura do DGX Meu Dia em PostgreSQL (Neon).

Um único perfil, com senha escolhida pelo usuário. A configuração inicial
exige SETUP_CODE, nunca publicado na interface.
"""
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone

try:
    import psycopg
except ImportError:
    # Render deste serviço foi criado com build sem dependências e a integração
    # disponível não permite alterar esse comando. Instala ao iniciar.
    import subprocess
    import sys
    from pathlib import Path
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "--disable-pip-version-check",
         "--no-input", "-r", str(Path(__file__).with_name("requirements.txt"))]
    )
    import psycopg

from psycopg.types.json import Jsonb

ALLOWED_KEYS = {
    "dgx_moods_v1",
    "dgx_challenges_v1",
    "dgx_reminders_v1",
    "dgx_notified_v1",
    "dgx_plants_v1",
    "dgx_tasks_v1",
    "dgx_payments_v1",
}
SESSION_DAYS = 60


def connect():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL não configurada")
    return psycopg.connect(url, connect_timeout=10)


def initialize():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS dgx_account (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                password_salt BYTEA NOT NULL,
                password_digest BYTEA NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS dgx_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES dgx_account(id) ON DELETE CASCADE,
                expires_at TIMESTAMPTZ NOT NULL
            )
            """)
            cur.execute("""
            CREATE TABLE IF NOT EXISTS dgx_data (
                user_id BIGINT NOT NULL REFERENCES dgx_account(id) ON DELETE CASCADE,
                key TEXT NOT NULL,
                value JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                PRIMARY KEY(user_id,key)
            )
            """)


def password_hash(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 390_000)


def has_account():
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT EXISTS(SELECT 1 FROM dgx_account)")
            return bool(cur.fetchone()[0])


def create_account(password, code):
    expected = os.environ.get("SETUP_CODE", "")
    if not expected or not hmac.compare_digest(code or "", expected):
        raise ValueError("Código inicial incorreto.")
    if not 10 <= len(password) <= 200:
        raise ValueError("A senha deve ter de 10 a 200 caracteres.")
    salt = secrets.token_bytes(24)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT pg_advisory_xact_lock(20261105)")
            cur.execute("SELECT id FROM dgx_account LIMIT 1")
            if cur.fetchone():
                raise ValueError("O perfil já foi configurado. Use Entrar.")
            cur.execute(
                "INSERT INTO dgx_account(password_salt,password_digest) VALUES (%s,%s) RETURNING id",
                (salt, password_hash(password, salt)),
            )
            user_id = cur.fetchone()[0]
    return start_session(user_id)


def login(password):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id,password_salt,password_digest FROM dgx_account LIMIT 1")
            row = cur.fetchone()
    if not row:
        raise ValueError("Primeiro configure o perfil.")
    account_id, salt, digest = row
    if not hmac.compare_digest(password_hash(password, bytes(salt)), bytes(digest)):
        raise ValueError("Senha incorreta.")
    return start_session(account_id)


def start_session(user_id):
    token = secrets.token_urlsafe(40)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO dgx_sessions(token_hash,user_id,expires_at) VALUES (%s,%s,%s)",
                (token_hash, user_id, expires),
            )
    return token


def current_user(token):
    if not token:
        return None
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM dgx_sessions WHERE token_hash=%s AND expires_at>now()",
                (hashlib.sha256(token.encode()).hexdigest(),),
            )
            result = cur.fetchone()
            return result[0] if result else None


def logout(token):
    if not token:
        return
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM dgx_sessions WHERE token_hash=%s",
                        (hashlib.sha256(token.encode()).hexdigest(),))


def read_data(user_id):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT key,value FROM dgx_data WHERE user_id=%s", (user_id,))
            return {key: value for key, value in cur.fetchall() if key in ALLOWED_KEYS}


def write_data(user_id, key, value):
    if key not in ALLOWED_KEYS:
        raise ValueError("Tipo de dado não reconhecido.")
    payload_size = len(json.dumps(value, ensure_ascii=False))
    if payload_size > 200_000:
        raise ValueError("Registro maior que o permitido.")
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""
            INSERT INTO dgx_data(user_id,key,value) VALUES (%s,%s,%s)
            ON CONFLICT(user_id,key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()
            """, (user_id, key, Jsonb(value)))
