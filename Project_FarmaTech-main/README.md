# 💊 PharmaTech — AI-Powered Prescription Safety & Drug Interaction Analysis

PharmaTech is a modern clinical decision support system designed to detect drug-drug interactions, food-drug interactions, pregnancy risks, organ contraindications (renal, hepatic, cardiac), and calculate personalized patient risk scores.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)

---

### 2. Backend Setup (FastAPI)

Navigate to the `Backend` directory:
```bash
cd Backend
```

Install Python dependencies:
```bash
python -m pip install -r requirements.txt
```

Run the backend server:
```bash
uvicorn main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

Run backend unit tests:
```bash
python -m pytest test_main.py
```

---

### 3. Frontend Setup (React + Vite + TypeScript)

From the root project directory:
```bash
npm install
```

Start the development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Run linter:
```bash
npm run lint
```

---

## 🏗️ Architecture & Features

```
Project_PharmaTech-main/
├── Backend/
│   ├── main.py          # FastAPI application & REST endpoints
│   ├── data.py          # Drug database, interactions, food warnings & disease contraindications
│   ├── test_main.py     # Comprehensive automated test suite (12 test cases)
│   └── requirements.txt # Python dependencies
├── src/
│   ├── components/
│   │   ├── DrugInput.tsx     # Debounced autocomplete drug search & tag management
│   │   ├── PatientForm.tsx   # Age, gender, pregnancy, organ impairment & conditions
│   │   ├── ResultsPanel.tsx  # Severity badges, interaction breakdowns, and recommendations
│   │   ├── RiskGauge.tsx     # Interactive SVG risk meter & visual risk index
│   │   └── QRScanner.tsx     # QR code scanner & digital prescription generator
│   ├── services/
│   │   └── api.ts            # Typed API client with automatic offline fallback
│   ├── App.tsx               # Main layout, tabs, state orchestrator
│   └── index.css             # Design system with responsive themes & custom styling
├── index.html
├── package.json
└── vite.config.ts
```

### Key Capabilities:
- **Comprehensive Drug Interactions**: Multi-drug cross-checking with 3-tier severity classification (High, Moderate, Low).
- **Patient Context Engine**: Considers renal failure, liver disease, pregnancy, age, and existing medical conditions.
- **Food & Dietary Advisories**: Alerts for grapefruit juice, dairy, high-potassium foods, and alcohol.
- **Digital Prescription & QR Code**: Generate and scan digital QR prescriptions for clinical workflows.
- **Resilient Fallback Mode**: Client-side fallback analyzer ensures continuous operation even if offline.
