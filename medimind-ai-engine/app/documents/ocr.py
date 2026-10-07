from typing import Protocol

import pytesseract
from PIL import Image
import io

from app.core.errors import OcrError, OcrUnavailable


class OcrEngine(Protocol):
    def image_to_text(self, png_bytes: bytes) -> str: ...

    def is_available(self) -> bool: ...


class TesseractOcr:
    """Local OCR: scanned reports never leave the service boundary."""

    def __init__(self, languages: str):
        self._languages = languages

    def is_available(self) -> bool:
        try:
            installed = set(pytesseract.get_languages(config=""))
        except Exception:
            return False
        return all(lang in installed for lang in self._languages.split("+"))

    def image_to_text(self, png_bytes: bytes) -> str:
        try:
            with Image.open(io.BytesIO(png_bytes)) as img:
                return pytesseract.image_to_string(img, lang=self._languages).strip()
        except pytesseract.TesseractNotFoundError as exc:
            raise OcrUnavailable("Tesseract is not installed on this host.") from exc
        except pytesseract.TesseractError as exc:
            raise OcrError("OCR failed on a page (check installed language packs).") from exc
