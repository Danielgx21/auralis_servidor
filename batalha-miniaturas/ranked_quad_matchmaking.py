"""Pareamento de quatro participantes com expansão gradual e bots de espera.

Não implementa combates: é uma política isolada, para ser ligada ao
orquestrador de partidas de quatro participantes sem alterar o PvP 1x1.
"""
from dataclasses import dataclass
from typing import Optional, Sequence

PARTY_SIZE = 4
INITIAL_RATING_WINDOW = 25
WINDOW_STEP = 25
WINDOW_STEP_SECONDS = 15
MIN_BOT_WAIT = 60
FULL_BOT_WAIT = 90
MAX_WINDOW = 500


@dataclass(frozen=True)
class WaitingPlayer:
    user_id: str
    rating: int
    joined_at: float


@dataclass(frozen=True)
class BotSeat:
    ordinal: int
    rating: int
    kind: str = "bot"


@dataclass(frozen=True)
class MatchPlan:
    players: tuple[WaitingPlayer, ...]
    bots: tuple[BotSeat, ...]
    max_rating_difference: int
    waited_seconds: int

    def __post_init__(self):
        if len(self.players) + len(self.bots) != PARTY_SIZE:
            raise ValueError("Uma partida requer quatro participantes.")
        if len({player.user_id for player in self.players}) != len(self.players):
            raise ValueError("Participantes humanos não podem se repetir.")


def rating_window(wait_seconds: float) -> int:
    """Faixa cresce 25 pontos a cada quinze segundos de espera."""
    return min(MAX_WINDOW, INITIAL_RATING_WINDOW +
               WINDOW_STEP * max(0, int(wait_seconds // WINDOW_STEP_SECONDS)))


def bot_slots(wait_seconds: float, human_count: int) -> int:
    """Sem bots antes de 60s; depois, preencher progressivamente.

    60 a 74s: admite um bot se houver >=3 humanos.
    75 a 89s: admite dois bots se houver >=2 humanos.
    A partir de 90s: admite três bots, inclusive para um humano.
    """
    if not 1 <= human_count <= PARTY_SIZE:
        return 0
    if wait_seconds < MIN_BOT_WAIT:
        allowed = 0
    elif wait_seconds < 75:
        allowed = 1
    elif wait_seconds < FULL_BOT_WAIT:
        allowed = 2
    else:
        allowed = 3
    return min(PARTY_SIZE - human_count, allowed)


def choose_group(queue: Sequence[WaitingPlayer], now: float) -> Optional[MatchPlan]:
    """Seleciona o grupo mais compatível a partir de quem espera há mais tempo.

    O bot ocupa somente vagas que continuaram vazias após o prazo.
    A pontuação do bot se aproxima da média dos humanos selecionados,
    sem criar contas artificiais e sem entrar no ranking.
    """
    unique = {}
    for p in queue:
        if p.user_id not in unique or p.joined_at < unique[p.user_id].joined_at:
            unique[p.user_id] = p
    players = sorted(unique.values(), key=lambda p: (p.joined_at, p.user_id))
    if not players:
        return None
    for first in players:
        wait = max(0, now - first.joined_at)
        window = rating_window(wait)
        closest = sorted(
            (p for p in players if p.user_id != first.user_id
             and abs(p.rating - first.rating) <= window),
            key=lambda p: (abs(p.rating - first.rating), p.joined_at, p.user_id),
        )
        humans = (first, *closest[: PARTY_SIZE - 1])
        capacity = bot_slots(wait, len(humans))
        if len(humans) + capacity < PARTY_SIZE:
            continue
        humans = humans[:PARTY_SIZE]
        avg = round(sum(p.rating for p in humans) / len(humans))
        bots = tuple(BotSeat(ordinal=i + 1, rating=avg)
                     for i in range(PARTY_SIZE - len(humans)))
        return MatchPlan(
            players=tuple(humans),
            bots=bots,
            max_rating_difference=window,
            waited_seconds=int(wait),
        )
    return None
