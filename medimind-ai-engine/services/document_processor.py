import os
from PyPDF2 import PdfReader

class DocumentProcessor:
    def extract_text_from_pdf(self, file_path: str) -> str:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at path: {file_path}")
        
        try:
            reader = PdfReader(file_path)
            text_parts = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
            return "\n".join(text_parts).strip()
        except Exception as e:
            raise RuntimeError(f"Failed to parse PDF: {str(e)}")

document_processor = DocumentProcessor()
