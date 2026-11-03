<div align="center">

# 💸 Finora

### Your money, organized. Your future, in focus.

A mobile-first personal finance app for managing income, expenses, savings, and investments — with AI-powered coaching to help you make more confident financial decisions.

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API](#-api-overview)

</div>

---

## ✨ About Finora

Finora brings the essentials of personal finance together in one place. Track spending, build savings goals, monitor investments, explore income scenarios, and get AI-powered guidance — all through a mobile-first experience.

| 💳 Track | 🎯 Plan | 📈 Grow | 🤖 Learn |
|:---:|:---:|:---:|:---:|
| Understand expenses and recurring spending | Set goals and follow your progress | Keep an eye on investment holdings | Get budgeting insights from the AI coach |

## 🚀 Features

| Feature | What it helps you do |
|---|---|
| **Expense tracking** | Record and organize expenses by category |
| **Savings goals** | Create financial goals and monitor progress |
| **Investment tracking** | View investment holdings and details |
| **Salary reality** | Explore salary scenarios and income planning |
| **AI financial coach** | Chat for budgeting advice and financial insights |
| **Receipt scanning** | Scan receipts and keep financial records organized |
| **Account management** | Register, sign in, and manage your profile |
| **Mobile-first experience** | Use the app built with Expo and React Native |

## 🧰 Tech Stack

| Area | Technologies |
|---|---|
| **Mobile app** | React Native, Expo, Expo Router |
| **State & data** | Zustand, TanStack React Query, Axios |
| **Mobile utilities** | Expo SecureStore, Reanimated |
| **Charts** | Victory Native |
| **Backend** | Python, Django, Django REST Framework |
| **Authentication** | JWT |
| **Development database** | SQLite |
| **Optional background work** | Redis, Celery |
| **AI & finance libraries** | PyTorch, yfinance, scikit-learn, sentence-transformers, ChromaDB |

## 📁 Project Structure

```text
Finora-App/
├── Finora/                         # React Native + Expo app
│   ├── app/                        # Screens and Expo Router navigation
│   │   ├── (tabs)/                 # Main app tabs
│   │   ├── investment-detail/      # Investment details
│   │   └── ...                     # Auth, expenses, goals, investments
│   ├── services/                   # API client helpers
│   ├── context/                    # App context providers
│   ├── store/                      # Zustand stores
│   ├── utils/                      # Shared utilities
│   ├── assets/                     # Images and static assets
│   ├── app.config.js               # Expo configuration
│   └── package.json                # Frontend dependencies
│
├── finora-backend/                 # Django REST API
│   ├── ai_coach/                   # AI coaching features
│   ├── goals/                      # Savings goal APIs
│   ├── investments/                # Investment APIs
│   ├── salary_reality/             # Salary analysis
│   ├── transactions/               # Expense APIs
│   ├── users/                      # Authentication and profiles
│   ├── config/                     # Django configuration
│   ├── requirements.txt            # Python dependencies
│   └── manage.py                   # Django management CLI
│
├── start.ps1                       # Windows development launcher
├── LICENSE
└── README.md
```

## 🛠️ Getting Started

### Prerequisites

| Requirement | Version / Notes |
|---|---|
| Node.js | 18 or newer |
| npm or Yarn | Use the package manager you prefer |
| Python | 3.10 or newer |
| Git | For cloning the repository |
| Redis | Optional; used for Celery and cache-based tasks |

### 1. Clone the repository

```bash
git clone https://github.com/MehboobAli-Portfolio/Finora-App.git
cd Finora-App
```

### 2. Install frontend dependencies

```bash
cd Finora
npm install
```

### 3. Set up the backend environment

From the repository root:

```bash
cd finora-backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install backend dependencies:

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in `finora-backend/` and set the values required by your local setup. For example:

```env
SECRET_KEY=your-strong-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.158
CORS_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081,http://192.168.1.158:8081
```

Optional Redis configuration:

```env
REDIS_URL=redis://127.0.0.1:6379/1
```

> **Tip:** Replace the example host and origin values with the addresses used by your development environment. Keep real secrets out of version control.

### 5. Apply database migrations

While in `finora-backend/` with the virtual environment activated:

```bash
python manage.py migrate
```

### 6. Start the backend

```bash
python manage.py runserver 0.0.0.0:8000
```

### 7. Start the mobile app

Open a second terminal:

```bash
cd Finora
npx expo start
```

### Run the development stack together (Windows)

The repository includes a PowerShell launcher:

```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

The script starts the Django backend, Expo frontend, and Celery workers when Redis is available.

## 🔌 API Overview

| Endpoint | Purpose |
|---|---|
| `/api/auth/` | Authentication, dashboard, profile, and password reset |
| `/api/transactions/` | Expenses and transaction analytics |
| `/api/goals/` | Savings goals |
| `/api/investments/` | Investment holdings, market data, and analytics |
| `/api/salary/` | Salary comparison and income planning |
| `/api/ai/` | AI chat and financial insights |

## ⚙️ Frontend Configuration

The Expo app resolves the backend URL through `app.config.js` and `expo-constants`. The current default development URL is:

```text
http://192.168.1.158:8000/api/
```

To use a different backend, configure the `API_URL` environment variable for your Expo environment.

## 🗺️ What's Included

- Separate mobile frontend and Django backend
- SQLite-backed local development by default
- Optional Redis and Celery support for background tasks
- Finance tools for expenses, goals, investments, and salary planning
- An AI coach experience for financial guidance

## 📄 License

Finora is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

## 🔗 Repository

[MehboobAli-Portfolio/Finora-App](https://github.com/MehboobAli-Portfolio/Finora-App)

<div align="center">

**Build healthier money habits with Finora.**

</div>
