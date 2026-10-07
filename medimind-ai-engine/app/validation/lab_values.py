"""Cross-check model-assigned lab flags against the numbers printed on the report."""

import re

from app.schemas.documents import LabValue

_NUM = r"[-+]?\d+(?:\.\d+)?"
_RANGE = re.compile(rf"^\s*({_NUM})\s*(?:-|–|—|to)\s*({_NUM})")
_LT = re.compile(rf"^\s*(?:<|<=|≤|up to|below)\s*({_NUM})", re.I)
_GT = re.compile(rf"^\s*(?:>|>=|≥|above)\s*({_NUM})", re.I)


def _to_float(text: str) -> float | None:
    m = re.search(_NUM, text.replace(",", ""))
    return float(m.group()) if m else None


def reconcile_flag(item: LabValue) -> LabValue:
    """If both the value and a parseable reference range exist, the arithmetic wins over
    the model's label. 'critical' from the model is preserved (the report may state it)."""
    if not item.reference_range or item.flag == "critical":
        return item
    value = _to_float(item.value)
    if value is None:
        return item

    computed: str | None = None
    if m := _RANGE.match(item.reference_range):
        low, high = float(m.group(1)), float(m.group(2))
        computed = "low" if value < low else "high" if value > high else "normal"
    elif m := _LT.match(item.reference_range):
        computed = "normal" if value <= float(m.group(1)) else "high"
    elif m := _GT.match(item.reference_range):
        computed = "normal" if value >= float(m.group(1)) else "low"

    if computed and computed != item.flag:
        return item.model_copy(update={"flag": computed})
    return item
