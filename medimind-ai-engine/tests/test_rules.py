from app.schemas.common import QA
from app.schemas.documents import LabValue
from app.validation.clinical_rules import detect_red_flags, is_affirmative, max_risk
from app.validation.lab_values import reconcile_flag


def qa(q, a):
    return QA(question=q, answer=a)


# ------------------------------------------------------------------ red flags


def test_denied_red_flag_question_does_not_trigger():
    """Regression: the old code matched the question text, so answering 'No' still flagged HIGH."""
    r = detect_red_flags("Sore throat for two days", [qa("Are you experiencing any shortness of breath?", "No")])
    assert r.labels == []
    assert r.floor == "low"


def test_affirmed_red_flag_question_triggers_critical_for_airway():
    r = detect_red_flags("Sore throat", [qa("Do you have shortness of breath or hoarseness?", "Yes, since last night")])
    assert "shortness of breath / difficulty breathing" in r.labels
    assert r.floor == "critical"


def test_negated_mention_in_complaint_does_not_trigger():
    assert detect_red_flags("Ear pain, no difficulty swallowing", []).labels == []
    assert detect_red_flags("Ear pain without stridor", []).labels == []


def test_plain_mention_in_complaint_triggers():
    r = detect_red_flags("Neck swelling and difficulty swallowing for 3 days", [])
    assert r.floor == "high"
    assert len(r.labels) == 2


def test_swelling_behind_the_ear_is_recognised_as_a_mastoid_red_flag():
    """Found by a live run: 'swelling behind the ear' is the classic mastoiditis sign but was missed."""
    for complaint in ("Ear pain for 4 days with swelling behind the ear", "Left ear pain, redness behind her ear", "post-auricular swelling"):
        r = detect_red_flags(complaint, [])
        assert r.labels == ["mastoid tenderness or swelling"], complaint
        assert r.floor == "high"


def test_denied_swelling_behind_the_ear_does_not_flag():
    assert detect_red_flags("Ear pain, no swelling behind the ear", []).labels == []
    r = detect_red_flags("Ear pain", [qa("Is there tenderness, pain, or swelling behind the ear (mastoid area)?", "No")])
    assert r.labels == []
    r = detect_red_flags("Ear pain", [qa("Is there tenderness, pain, or swelling behind the ear (mastoid area)?", "Yes, tender")])
    assert r.floor == "high"


def test_unknown_or_empty_answers_are_not_affirmative():
    for answer in ("", "  ", "unknown", "not sure", "No", "none", "denies", "N/A"):
        assert not is_affirmative(answer), answer
    for answer in ("yes", "Yes, mild", "left side", "present"):
        assert is_affirmative(answer), answer


def test_max_risk_never_lowers():
    assert max_risk("low", "high") == "high"
    assert max_risk("critical", "medium") == "critical"


# ------------------------------------------------------------ lab flag checks


def lab(value, ref, flag="normal"):
    return LabValue(name="Hemoglobin", value=value, unit="g/dL", reference_range=ref, flag=flag)


def test_arithmetic_overrides_wrong_model_flag():
    assert reconcile_flag(lab("9.1", "12.0-16.0", "normal")).flag == "low"
    assert reconcile_flag(lab("18", "12.0 - 16.0", "normal")).flag == "high"
    assert reconcile_flag(lab("14", "12-16", "high")).flag == "normal"


def test_one_sided_ranges():
    assert reconcile_flag(lab("240", "<200", "normal")).flag == "high"
    assert reconcile_flag(lab("50", ">40", "low")).flag == "normal"


def test_critical_from_report_is_preserved_and_unparseable_left_alone():
    assert reconcile_flag(lab("6.0", "12-16", "critical")).flag == "critical"
    assert reconcile_flag(lab("positive", "negative", "unknown")).flag == "unknown"
    assert reconcile_flag(lab("9.1", None, "low")).flag == "low"


# ------------------------------------------------------------------ compound questions and self-harm


def test_compound_question_answered_with_one_symptom_flags_only_that_symptom():
    """Regression: 'chest pain or shortness of breath?' -> 'Chest Pain' wrongly flagged shortness of breath (critical)."""
    r = detect_red_flags(
        "Heartbreak",
        [qa("Are you feeling any physical symptoms, such as chest pain or shortness of breath?", "Chest Pain")],
    )
    assert r.labels == []
    assert r.floor == "low"


def test_compound_question_answered_with_generic_yes_still_flags():
    r = detect_red_flags("Sore throat", [qa("Do you have shortness of breath or hoarseness?", "Yes")])
    assert "shortness of breath / difficulty breathing" in r.labels


def test_compound_question_answer_naming_the_flag_flags_it():
    r = detect_red_flags("Cough", [qa("Any chest pain or shortness of breath?", "shortness of breath at night")])
    assert "shortness of breath / difficulty breathing" in r.labels


def test_self_harm_affirmed_is_a_red_flag():
    r = detect_red_flags("Heartbreak", [qa("Have you had any thoughts of self-harm or suicide?", "Yes")])
    assert r.labels == ["thoughts of self-harm / suicide"]
    assert r.floor == "high"


def test_self_harm_denied_is_not_a_red_flag():
    assert detect_red_flags("Low mood", [qa("Have you had any thoughts of self-harm or suicide?", "No")]).labels == []
    assert detect_red_flags("Low mood, denies suicidal thoughts", []).labels == []
    assert detect_red_flags("Low mood, no thoughts of self-harm", []).labels == []
