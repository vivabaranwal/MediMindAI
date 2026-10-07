"""File validation and text extraction.

PDFs: use the embedded text layer when it exists; render and OCR only pages without one.
Images: OCR. The file type is decided from the bytes, never from the filename or the
client-declared MIME type.
"""

import io
from dataclasses import dataclass

import pymupdf as fitz  # PyMuPDF
from PIL import Image, ImageSequence, UnidentifiedImageError

from app.core.config import Settings
from app.core.errors import FileRejected, FileTooLarge, OcrError, UnsupportedFileType
from app.documents.ocr import OcrEngine


@dataclass(frozen=True)
class PageText:
    number: int  # 1-based
    text: str
    ocr: bool
    low_confidence: bool


@dataclass(frozen=True)
class ExtractedDocument:
    pages: list[PageText]

    @property
    def ocr_pages(self) -> int:
        return sum(1 for p in self.pages if p.ocr)

    @property
    def characters(self) -> int:
        return sum(len(p.text) for p in self.pages)

    @property
    def low_confidence_pages(self) -> list[int]:
        return [p.number for p in self.pages if p.low_confidence]


def sniff_type(data: bytes) -> str:
    if data.startswith(b"%PDF-"):
        return "pdf"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image"
    if data.startswith(b"\xff\xd8\xff"):
        return "image"
    if data.startswith((b"II*\x00", b"MM\x00*")):
        return "image"
    raise UnsupportedFileType("Only PDF, JPEG, PNG and TIFF files are accepted.")


class DocumentExtractor:
    def __init__(self, settings: Settings, ocr: OcrEngine):
        self._s = settings
        self._ocr = ocr
        Image.MAX_IMAGE_PIXELS = settings.MAX_IMAGE_PIXELS

    def extract(self, data: bytes) -> ExtractedDocument:
        if len(data) == 0:
            raise FileRejected("The file is empty.")
        if len(data) > self._s.MAX_UPLOAD_BYTES:
            raise FileTooLarge()

        kind = sniff_type(data)
        pages = self._from_pdf(data) if kind == "pdf" else self._from_image(data)

        if sum(len(p.text.strip()) for p in pages) < self._s.MIN_TEXT_CHARS_PER_PAGE:
            raise OcrError("No readable text was found in the document.")
        return ExtractedDocument(pages=pages)

    # ------------------------------------------------------------------ pdf

    def _from_pdf(self, data: bytes) -> list[PageText]:
        try:
            doc = fitz.open(stream=data, filetype="pdf")
        except Exception as exc:
            raise FileRejected("The PDF is corrupt or unreadable.") from exc

        with doc:
            if doc.needs_pass:
                raise FileRejected("Password-protected PDFs are not supported.")
            if doc.page_count == 0:
                raise FileRejected("The PDF has no pages.")
            if doc.page_count > self._s.MAX_PDF_PAGES:
                raise FileRejected(f"The PDF has more than {self._s.MAX_PDF_PAGES} pages.")

            out: list[PageText] = []
            for index, page in enumerate(doc, start=1):
                text = page.get_text("text").strip()
                if len(text) >= self._s.MIN_TEXT_CHARS_PER_PAGE:
                    out.append(PageText(index, text, ocr=False, low_confidence=False))
                    continue

                pix = page.get_pixmap(matrix=fitz.Matrix(self._s.OCR_RENDER_SCALE, self._s.OCR_RENDER_SCALE))
                ocr_text = self._ocr.image_to_text(pix.tobytes("png"))
                # Keep whichever source produced more text (a short text layer may be real, e.g. a stamp).
                best = ocr_text if len(ocr_text) > len(text) else text
                out.append(PageText(index, best, ocr=len(ocr_text) > len(text),
                                    low_confidence=len(best) < self._s.MIN_TEXT_CHARS_PER_PAGE))
            return out

    # --------------------------------------------------------------- images

    def _from_image(self, data: bytes) -> list[PageText]:
        try:
            with Image.open(io.BytesIO(data)) as img:
                frames = []
                for frame in ImageSequence.Iterator(img):
                    if len(frames) >= self._s.MAX_PDF_PAGES:
                        raise FileRejected(f"The image has more than {self._s.MAX_PDF_PAGES} frames.")
                    buf = io.BytesIO()
                    frame.convert("RGB").save(buf, format="PNG")
                    frames.append(buf.getvalue())
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
            raise FileRejected("The image is corrupt, unreadable or too large.") from exc

        out = []
        for index, png in enumerate(frames, start=1):
            text = self._ocr.image_to_text(png)
            out.append(PageText(index, text, ocr=True,
                                low_confidence=len(text) < self._s.MIN_TEXT_CHARS_PER_PAGE))
        return out
