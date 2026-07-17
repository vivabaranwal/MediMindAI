import unittest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from main import app
from services.document_processor import document_processor
from services.vector_store import vector_store
from agents.report_analyzer import report_analyzer_graph
from agents.chat_assistant import chat_assistant_graph

class TestRagAndAgents(unittest.IsolatedAsyncioTestCase):
    
    def test_document_processor_file_not_found(self):
        with self.assertRaises(FileNotFoundError):
            document_processor.extract_text_from_pdf("non_existent_file.pdf")

    @patch("services.document_processor.PdfReader")
    def test_document_processor_extraction(self, mock_pdf_reader):
        # Mock PdfReader and Page extracting text
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Patient name: Sherlock Holmes\nHemoglobin: 14.5 g/dL"
        
        mock_reader_instance = MagicMock()
        mock_reader_instance.pages = [mock_page]
        mock_pdf_reader.return_value = mock_reader_instance
        
        # Create a dummy file path just to bypass exists check
        with patch("os.path.exists", return_value=True):
            text = document_processor.extract_text_from_pdf("dummy.pdf")
            self.assertIn("Sherlock Holmes", text)
            self.assertIn("Hemoglobin", text)

    def test_vector_store_indexing_and_retrieval(self):
        # Index document into in-memory Qdrant
        text = "This patient has severe throat pain and mild anemia with low hemoglobin levels."
        added = vector_store.add_document(text, patient_id=1, encounter_id=101)
        self.assertGreater(added, 0)
        
        # Test retrieval with correct encounter_id
        results = vector_store.retrieve("hemoglobin", encounter_id=101, top_k=1)
        self.assertEqual(len(results), 1)
        self.assertIn("hemoglobin", results[0]["text_chunk"])
        
        # Test retrieval with different encounter_id (should be filtered out)
        results_other = vector_store.retrieve("hemoglobin", encounter_id=999, top_k=1)
        self.assertEqual(len(results_other), 0)

    async def test_report_analyzer_workflow(self):
        text = "Laboratory results show high cholesterol levels."
        state = {
            "text": text,
            "findings": {},
            "abnormalities": [],
            "status": "pending"
        }
        
        res = await report_analyzer_graph.ainvoke(state)
        self.assertEqual(res["status"], "success")
        self.assertIn("Serum cholesterol elevated", str(res["abnormalities"]))

    async def test_chat_assistant_rag_workflow(self):
        # Index a document to query against
        text = "Patient is allergic to Penicillin."
        vector_store.add_document(text, patient_id=1, encounter_id=202)
        
        state = {
            "query": "Is the patient allergic to Penicillin?",
            "encounter_id": 202,
            "history": [],
            "context": "",
            "response": ""
        }
        
        res = await chat_assistant_graph.ainvoke(state)
        self.assertIn("allergic to Penicillin", res["context"])
        self.assertIn("[MOCK RAG RESPONSE]", res["response"])

    def test_analyze_report_endpoint_unauthorized(self):
        client = TestClient(app)
        response = client.post(
            "/api/ai/analyze-report",
            json={"file_path": "dummy.pdf", "patient_id": 1, "encounter_id": 101},
            headers={"X-Internal-Secret": "wrong-secret"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("Invalid or missing internal API secret", response.json()["detail"])

    @patch("services.document_processor.document_processor.extract_text_from_pdf")
    def test_analyze_report_endpoint_success(self, mock_extract):
        mock_extract.return_value = "Patient name: John Doe\nLaboratory results show high cholesterol levels."
        client = TestClient(app)
        response = client.post(
            "/api/ai/analyze-report",
            json={"file_path": "dummy.pdf", "patient_id": 1, "encounter_id": 101},
            headers={"X-Internal-Secret": "super-secret-token"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("Clinical report parsed successfully", data["summary"])
        self.assertTrue(any("Serum cholesterol elevated" in x for x in data["abnormalities"]))

    def test_chat_endpoint_unauthorized(self):
        client = TestClient(app)
        response = client.post(
            "/api/ai/chat",
            json={"query": "Is the patient allergic?", "encounter_id": 202, "history": []},
            headers={"X-Internal-Secret": "wrong-secret"}
        )
        self.assertEqual(response.status_code, 401)

    def test_chat_endpoint_success(self):
        # Index something for search first
        vector_store.add_document("Patient is allergic to Penicillin.", patient_id=1, encounter_id=202)
        
        client = TestClient(app)
        response = client.post(
            "/api/ai/chat",
            json={"query": "Is the patient allergic to Penicillin?", "encounter_id": 202, "history": []},
            headers={"X-Internal-Secret": "super-secret-token"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("allergic to Penicillin", data["context"])
        self.assertIn("[MOCK RAG RESPONSE]", data["response"])

if __name__ == "__main__":
    unittest.main()
