import pymupdf as fitz
import pytest

from app.core.errors import FileRejected, FileTooLarge, OcrError, UnsupportedFileType
from app.documents.chunking import chunk_pages
from app.documents.extract import DocumentExtractor, PageText
from tests.conftest import make_png, make_scanned_pdf, make_text_pdf

LONG = "Hemoglobin 9.1 g/dL reference 12.0-16.0. " * 3


@pytest.fixture
def extractor(settings, ocr):
    return DocumentExtractor(settings, ocr)


def test_text_pdf_uses_text_layer_without_ocr(extractor, ocr):
    doc = extractor.extract(make_text_pdf(LONG, LONG + " second page"))
    assert len(doc.pages) == 2
    assert doc.ocr_pages == 0
    assert ocr.calls == 0
    assert "Hemoglobin" in doc.pages[0].text


def test_scanned_pdf_falls_back_to_ocr(extractor, ocr):
    doc = extractor.extract(make_scanned_pdf())
    assert ocr.calls == 1
    assert doc.ocr_pages == 1
    assert "SCANNED REPORT" in doc.pages[0].text


def test_mixed_pdf_only_ocrs_pages_without_text(extractor, ocr, tmp_path):
    text_pdf = fitz.open(stream=make_text_pdf(LONG), filetype="pdf")
    scanned = fitz.open(stream=make_scanned_pdf(), filetype="pdf")
    text_pdf.insert_pdf(scanned)
    doc = extractor.extract(text_pdf.tobytes())
    assert [p.ocr for p in doc.pages] == [False, True]
    assert ocr.calls == 1


def test_image_goes_through_ocr(extractor, ocr):
    doc = extractor.extract(make_png())
    assert doc.pages[0].ocr is True
    assert ocr.calls == 1


def test_wholly_unreadable_document_is_rejected(extractor, ocr):
    ocr.text = "ab"  # OCR found almost nothing on the only page
    with pytest.raises(OcrError):
        extractor.extract(make_scanned_pdf())


def test_low_confidence_pages_are_reported(extractor, ocr):
    ocr.text = "ab"  # second page unreadable, first page fine
    both = fitz.open(stream=make_text_pdf(LONG), filetype="pdf")
    both.insert_pdf(fitz.open(stream=make_scanned_pdf(), filetype="pdf"))
    doc = extractor.extract(both.tobytes())
    assert doc.low_confidence_pages == [2]


@pytest.mark.parametrize("payload", [b"MZ\x90\x00 pretend executable", b"<html>hi</html>", b"GIF89a....."])
def test_rejects_files_by_content_not_name(extractor, payload):
    with pytest.raises(UnsupportedFileType):
        extractor.extract(payload)


def test_rejects_empty_and_corrupt_and_oversized(extractor, settings):
    with pytest.raises(FileRejected):
        extractor.extract(b"")
    with pytest.raises(FileRejected):
        extractor.extract(b"%PDF-1.7 this is not a real pdf")
    with pytest.raises(FileTooLarge):
        extractor.extract(b"%PDF-" + b"0" * (settings.MAX_UPLOAD_BYTES + 1))


def test_rejects_encrypted_pdf(extractor):
    doc = fitz.open(stream=make_text_pdf(LONG), filetype="pdf")
    data = doc.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="owner", user_pw="user")
    with pytest.raises(FileRejected, match="Password"):
        extractor.extract(data)


def test_rejects_pdf_with_too_many_pages(extractor, settings):
    data = make_text_pdf(*[LONG] * (settings.MAX_PDF_PAGES + 1))
    with pytest.raises(FileRejected, match="pages"):
        extractor.extract(data)


# ------------------------------------------------------------------- chunking


def test_chunks_respect_size_and_never_span_pages():
    pages = [
        PageText(1, "\n\n".join(f"Paragraph {i} " + "x" * 200 for i in range(20)), False, False),
        PageText(2, "Short page two.", False, False),
    ]
    chunks = chunk_pages(pages, size=600, overlap=50)
    assert all(len(c.text) <= 600 + 50 + 2 for c in chunks)
    assert {c.page for c in chunks} == {1, 2}
    assert [c.index for c in chunks] == list(range(len(chunks)))
    assert chunks[-1].page == 2 and chunks[-1].text == "Short page two."


def test_single_huge_paragraph_is_split():
    chunks = chunk_pages([PageText(1, "y" * 4000, False, False)], size=1000, overlap=100)
    assert len(chunks) >= 4
    assert all(len(c.text) <= 1000 + 100 + 2 for c in chunks)
