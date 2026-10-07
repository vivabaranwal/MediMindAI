import re
from dataclasses import dataclass

from app.documents.extract import PageText


@dataclass(frozen=True)
class Chunk:
    page: int
    index: int  # running index across the whole document
    text: str


def _split_long(text: str, size: int, overlap: int) -> list[str]:
    step = max(1, size - overlap)
    return [text[i : i + size] for i in range(0, len(text), step)]


def chunk_pages(pages: list[PageText], size: int, overlap: int) -> list[Chunk]:
    """Chunk each page on paragraph/line boundaries up to `size` characters. Chunks never
    span pages, so every chunk can be cited as 'page N'. A chunk may exceed `size` by at
    most `overlap` + 2 characters (the carried-over tail plus a paragraph break)."""
    chunks: list[Chunk] = []
    for page in pages:
        blocks = [b.strip() for b in re.split(r"\n\s*\n|\r\n\s*\r\n", page.text) if b.strip()]
        pieces: list[str] = []
        for block in blocks:
            pieces.extend(_split_long(block, size, overlap) if len(block) > size else [block])

        current = ""
        for piece in pieces:
            if current and len(current) + len(piece) + 2 > size:
                chunks.append(Chunk(page.number, len(chunks), current))
                current = current[-overlap:] + "\n\n" + piece if overlap else piece
            else:
                current = f"{current}\n\n{piece}" if current else piece
        if current.strip():
            chunks.append(Chunk(page.number, len(chunks), current))
    return chunks
