"""Deterministic clinical safety rules for triage.

These run in code, not in a prompt, so their behaviour is exact and testable.
Policy: the language model may raise a risk level, but never lower it below the floor
established here from explicit red-flag findings.

Drug-allergy checks are NOT here: they are enforced in Laravel (App\Services\Clinical\DrugAllergyChecker),
the system of record, so they work without AI consent and when this service is down.
"""

import re
from dataclasses import dataclass

from app.schemas.common import QA, RiskLevel

_ORDER: dict[str, int] = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def max_risk(a: RiskLevel, b: RiskLevel) -> RiskLevel:
    return a if _ORDER[a] >= _ORDER[b] else b


# ---------------------------------------------------------------- red flags

@dataclass(frozen=True)
class RedFlag:
    label: str
    patterns: tuple[str, ...]
    floor: RiskLevel


RED_FLAGS: tuple[RedFlag, ...] = (
    RedFlag("shortness of breath / difficulty breathing", ("shortness of breath", "difficulty breathing", "breathless", "trouble breathing", "dyspnea", "dyspnoea"), "critical"),
    RedFlag("stridor", ("stridor", "noisy breathing"), "critical"),
    RedFlag("drooling / inability to swallow saliva", ("drooling",), "critical"),
    RedFlag("difficulty swallowing (dysphagia)", ("dysphagia", "difficulty swallowing", "difficulty or pain when swallowing", "trouble swallowing", "painful swallowing"), "high"),
    RedFlag("neck swelling", ("neck swelling", "swelling in your neck", "swelling in the neck", "neck mass", "neck lump"), "high"),
    RedFlag("mastoid tenderness or swelling", ("mastoid", "behind the ear", "behind her ear", "behind his ear", "behind my ear", "postauricular", "post-auricular", "retroauricular"), "high"),
    RedFlag("facial weakness / asymmetry", ("facial weakness", "facial asymmetry", "facial droop", "face drooping"), "high"),
    RedFlag("sudden hearing loss", ("sudden hearing loss", "sudden deafness"), "high"),
    RedFlag("heavy or uncontrolled nosebleed", ("heavy nosebleed", "uncontrolled nosebleed", "heavy bleeding from the nose"), "high"),
    RedFlag("hoarseness lasting weeks / voice change", ("hoarseness", "change in voice"), "medium"),
    RedFlag("thoughts of self-harm / suicide", ("self-harm", "self harm", "suicid", "hurt myself", "harm myself", "end my life", "kill myself"), "high"),
)

_NEGATIVE_START = re.compile(r"^\s*(no|nope|none|nil|never|denies|denied|absent|negative|not|nothing|without)\b", re.I)
_UNKNOWN = re.compile(r"^\s*(unknown|unsure|not sure|don'?t know|do not know|n/?a|can'?t say|cannot say)\b", re.I)
_NEGATION_BEFORE = re.compile(r"\b(no|not|denies|denied|without|negative for|free of|absence of)\b[^.;,]{0,25}$", re.I)


def is_affirmative(answer: str) -> bool:
    """An answer counts as a positive finding unless it is empty, a denial, or 'unknown'."""
    answer = answer.strip()
    if not answer:
        return False
    if _NEGATIVE_START.match(answer) or _UNKNOWN.match(answer):
        return False
    return True


# "Yes", "yes, since last night", "both": an answer that confirms the whole question rather than naming something specific.
_GENERIC_YES = re.compile(r"^\s*(yes|yeah|yep|yup|sure|definitely|both|all of them|all|present|positive)\b", re.I)
# A question that lists several symptoms ("such as chest pain or shortness of breath").
_COMPOUND = re.compile(r"\bsuch as\b|\bor\b|,|/", re.I)


def _answer_confirms(question: str, answer: str, patterns: tuple[str, ...]) -> bool:
    """Does this answer confirm the flag named in the question?

    For a question about a single finding, any affirmative answer does. For a question that lists several
    findings, a specific answer ("Chest Pain") confirms only what it names; only a generic yes confirms them all.
    This stops "chest pain or shortness of breath?" -> "Chest Pain" from flagging shortness of breath.
    """
    if not is_affirmative(answer):
        return False
    if not _COMPOUND.search(question):
        return True
    return bool(_GENERIC_YES.match(answer)) or _mentioned_affirmatively(answer, patterns)


def _mentions(text: str, patterns: tuple[str, ...]) -> bool:
    low = text.lower()
    return any(p in low for p in patterns)


def _mentioned_affirmatively(text: str, patterns: tuple[str, ...]) -> bool:
    """Free-text mention that is not negated ('no shortness of breath' does not count)."""
    low = text.lower()
    for p in patterns:
        for m in re.finditer(re.escape(p), low):
            if not _NEGATION_BEFORE.search(low[: m.start()]):
                return True
    return False


@dataclass(frozen=True)
class RedFlagResult:
    labels: list[str]
    floor: RiskLevel


def detect_red_flags(chief_complaint: str, qa: list[QA]) -> RedFlagResult:
    """Red flags come from (a) non-negated mentions in the complaint and (b) screening
    questions about a red flag that were answered affirmatively. The question text alone
    never triggers a flag."""
    labels: list[str] = []
    floor: RiskLevel = "low"
    for flag in RED_FLAGS:
        hit = _mentioned_affirmatively(chief_complaint, flag.patterns) or any(
            _mentions(item.question, flag.patterns) and _answer_confirms(item.question, item.answer, flag.patterns) for item in qa
        )
        if hit:
            labels.append(flag.label)
            floor = max_risk(floor, flag.floor)
    return RedFlagResult(labels=labels, floor=floor)
