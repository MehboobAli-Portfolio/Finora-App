# Finora App

Finora is a mobile-first personal finance app built to help users manage daily spending, savings goals, investments, and long-term financial planning in one place. The project combines a React Native + Expo frontend with a Django REST API backend to provide a complete personal finance experience for budgeting, portfolio tracking, and AI-assisted insights.

## Overview

Finora helps users:

- track expenses and recurring spending
- create and monitor financial goals
- manage investment holdings over time
- analyze salary scenarios and income planning
- get AI-based advice for budgeting and spending behavior
- scan receipts and keep financial records organized

## Features

- Expense tracking and category-based financial entries
- Savings goal creation and progress tracking
- Investment portfolio tracking and detail views
- Salary reality analysis tools
- AI-powered chat experience for financial coaching
- User authentication and profile management
- Secure token-based authentication using JWT
- Mobile-first architecture with Expo and React Native

## Tech Stack

### Frontend

- React Native
- Expo
- Expo Router
- Zustand
- TanStack React Query
- Axios
- SecureStore for authenticated token storage
- Victory Native for charts and analytics
- Reanimated for smooth mobile interactions

### Backend

- Django
- Django REST Framework
- JWT authentication
- SQLite for local development
- Redis + Celery for optional background tasks and caching
- Libraries for market data and AI features, including Torch, yfinance, scikit-learn, sentence-transformers, and chromadb

## Project Structure

```text
Finora-App/
├── Finora/                              # React Native + Expo frontend
│   ├── app/                             # Expo Router screens and navigation
│   │   ├── (tabs)/                      # Main tab navigation screens
│   │   │   ├── _layout.jsx
│   │   │   ├── index.jsx                # Dashboard/home screen
│   │   │   ├── expenses.jsx             # Expense management
│   │   │   ├── goals.jsx                # Goals dashboard
│   │   │   ├── invest.jsx               # Investment overview
│   │   │   ├── salary-reality.jsx       # Salary analysis views
│   │   │   ├── ai.jsx                   # AI coach interface
│   │   │   └── profile.jsx              # User profile screen
│   │   ├── _layout.jsx                  # Root app layout
│   │   ├── login.jsx                   # Login screen
│   │   ├── register.jsx                # Registration screen
│   │   ├── forgot-password.jsx         # Password reset screen
│   │   ├── add-expense.jsx             # Add expense form
│   │   ├── add-goal.jsx                # Add goal form
│   │   ├── add-investment.jsx          # Add investment form
│   │   ├── edit-expense.jsx            # Edit expense form
│   │   ├── edit-goal.jsx               # Edit goal form
│   │   ├── edit-investment.jsx         # Edit investment form
│   │   ├── investment-detail/[id].jsx  # Investment detail page
│   │   └── index.jsx                   # Launch screen/router entry
│   ├── services/                       # API client helpers
│   ├── context/                        # App context providers
│   ├── store/                          # Shared Zustand stores
│   ├── utils/                          # Utility/helper modules
│   ├── assets/                         # Images and static assets
│   ├── app.config.js                   # Expo config and API URL setup
│   ├── package.json                    # Frontend dependencies
│   ├── theme.js                        # Shared app theme
│   └── .npmrc                          # npm config
│
├── finora-backend/                      # Django backend
│   ├── ai_coach/                       # AI coach logic and routes
│   ├── config/                         # Django config package
│   ├── goals/                          # Goal-related API app
│   ├── investments/                     # Investment portfolio API app
│   ├── salary_reality/                  # Salary analysis API app
│   ├── transactions/                   # Expense transaction API app
│   ├── users/                          # Auth and user management app
│   ├── asgi.py                         # ASGI app entry
│   ├── wsgi.py                         # WSGI app entry
│   ├── manage.py                      # Django management CLI
│   ├── settings.py                    # Project settings and config
│   ├── urls.py                        # Root API routing
│   ├── requirements.txt               # Python dependencies
│   ├── create_admin.py                # Helper for creating admin user
│   ├── create_admin.ps1               # PowerShell admin helper
│   └── db.sqlite3                     # SQLite database used in dev
│
├── start.ps1                           # Starts backend, frontend, and optional Celery
├── .gitignore
├── LICENSE
├── README.md
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Python 3.10+
- Git
- Redis (optional, for Celery and cache-based background tasks)

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

### 3. Install backend dependencies

```bash
cd ../finora-backend
python -m venv .venv
source .venv/bin/activate
# On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in `finora-backend/` with values like:

```env
SECRET_KEY=your-strong-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.158
CORS_ALLOWED_ORIGINS=http://localhost:8081,http://127.0.0.1:8081,http://192.168.1.158:8081
```

Optional Redis config:

```env
REDIS_URL=redis://127.0.0.1:6379/1
```

### 5. Run database migrations

```bash
python manage.py migrate
```

### 6. Start the backend

```bash
python manage.py runserver 0.0.0.0:8000
```

### 7. Start the frontend

Open a new terminal and run:

```bash
cd Finora
npx expo start
```

### 8. Run everything together

A ready-made PowerShell launcher is included:

```powershell
powershell -ExecutionPolicy Bypass -File start.ps1
```

This script starts the Django backend, Expo frontend, and Celery workers if Redis is reachable.

## API Structure

The backend exposes these main API groups:

- `/api/auth/` — login, register, dashboard, profile, password reset
- `/api/transactions/` — expenses and analytics
- `/api/goals/` — savings goals
- `/api/investments/` — holdings, pricing, market data, analytics
- `/api/salary/` — salary comparison and planning logic
- `/api/ai/` — AI chat and financial insights

## Frontend Configuration

The Expo app resolves the backend URL dynamically using `app.config.js` and `expo-constants`.

Default development API URL:

```text
http://192.168.1.158:8000/api/
```

You can override this by setting the `API_URL` environment variable in the Expo environment.

## Notes

- The project is organized into a separate frontend and backend for easier local development.
- SQLite is used by default for local development.
- Redis and Celery are optional but are used for scheduled refreshes and cache-backed background workloads.
- The app includes both authentication flows and finance-specific modules such as investments, goals, salary analysis, and AI coaching.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## Repository

- GitHub: https://github.com/MehboobAli-Portfolio
- Project: https://github.com/MehboobAli-Portfolio/Finora-App
