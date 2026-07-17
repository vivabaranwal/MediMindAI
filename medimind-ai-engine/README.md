# MediMind AI Engine (Python AI/ML Microservice)

This is the FastAPI-based clinical reasoning and AI agent microservice for the MediMind AI platform.

## 🛠️ Setup & Local Execution

1. **Create Python Virtual Environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `medimind-ai-engine` folder:
   ```env
   OPENAI_API_KEY=your-openai-api-key
   QDRANT_URL=http://localhost:6333
   INTERNAL_API_SECRET=super-secret-token
   ```

4. **Run the Uvicorn Server**:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The service will run locally at `http://localhost:8000`.

## 🔒 Security
All incoming endpoints require the `X-Internal-Secret` header matching the `INTERNAL_API_SECRET` defined in the settings.
