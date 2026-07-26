# Finora – AI-Powered Personal Finance & Wealth Management

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-lightblue.svg)

**Finora** is a comprehensive full-stack personal finance application designed to empower users with complete control over their financial health. Combining intelligent expense tracking, AI-driven insights, and real-time wealth management tools, Finora helps users make smarter financial decisions and achieve long-term financial goals.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Performance Optimization](#performance-optimization)
- [Deployment](#deployment)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

---

## 📊 Overview

Finora provides a unified platform for personal financial management with the following capabilities:

- **Real-time Expense Tracking** – Categorize and monitor daily spending with an intelligent dynamic form system
- **Financial Goal Management** – Set, edit, and track savings targets with visual progress indicators
- **Investment Ledger** – Track asset growth, capital allocations, and portfolio performance
- **AI Neural Coach** – Get personalized spending analysis and financial recommendations through a native chat interface
- **Salary Analysis** – Compare income patterns across locations and analyze compensation tiers
- **Receipt Scanning** – Capture receipts via OCR technology for automated expense categorization

---

## 🎯 Key Features

### Core Functionality

| Feature | Description |
|---------|-------------|
| **💸 Intelligent Expense Tracking** | Dynamic expense categorization with customizable form inputs for comprehensive spending analysis |
| **🎯 Financial Goal Architect** | Create and monitor savings goals with real-time progress visualization and achievement milestones |
| **📊 Investment Management** | Dedicated portfolio ledger for tracking asset allocation, growth metrics, and capital management |
| **🧠 Neural Coach (AI Module)** | Native real-time AI chat providing contextual spending insights and personalized financial recommendations |
| **💰 Salary Reality Check** | Advanced income analysis tool with location-based comparisons and compensation tier breakdowns |
| **📈 Receipt Scanning** | OCR-powered receipt capture with automatic expense categorization and metadata extraction |
| **📱 Cross-Platform Support** | Seamless experience across iOS, Android, and web platforms |

---

## 🛠️ Technology Stack

### Frontend Architecture
- **Framework:** React Native 0.81.5
- **Router:** Expo Router 6.0.23
- **State Management:** Zustand 5.0.12, Async Storage
- **HTTP Client:** Axios 1.13.6
- **Data Fetching:** TanStack React Query 5.100.6
- **Charting & Visualization:** Victory Native 41.20.2
- **Animations:** React Native Reanimated 4.1.1
- **UI Components:** Expo Vector Icons, React Native Gesture Handler
- **Development:** Expo 54.0.34

### Backend Architecture
- **Framework:** Django 5.x + Django REST Framework
- **Authentication:** JWT (JSON Web Tokens)
- **AI Integration:** Custom Neural Coach module with intelligent analysis
- **Database:** PostgreSQL (recommended for production)
- **API Structure:** Modular Django apps architecture
  - `users` – User authentication and profile management
  - `ai_coach` – AI-powered financial insights
  - `salary_reality` – Salary analysis and comparisons
  - `transactions` – Expense tracking
  - `goals` – Financial goal management

### Infrastructure
- **Mobile Platforms:** iOS & Android via Expo
- **Web:** React web target (development/preview)
- **Build System:** Expo Build Service (EAS)

---

## 🚀 Getting Started

### Prerequisites

**Frontend:**
- Node.js 18 or higher
- npm or yarn package manager
- Expo CLI (`npm install -g expo-cli`)

**Backend:**
- Python 3.9 or higher
- pip package manager
- Virtual environment support

### Frontend Installation

```bash
# 1. Clone the repository
git clone https://github.com/MehboobAli-Portfolio/Finora-App.git
cd Finora-App/Finora

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your backend API_URL
# Example: API_URL=http://localhost:8000/api

# 4. Start development server
npm start

# Platform-specific commands:
npm run ios      # Run on iOS simulator
npm run android  # Run on Android emulator
npm run web      # Run in web browser
```

### Backend Installation

```bash
# 1. Navigate to backend directory
cd Finora-App/finora-backend

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate
# On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with database credentials and security settings

# 5. Initialize database
python manage.py migrate
python manage.py collectstatic --noinput

# 6. Create superuser account (for admin access)
python manage.py createsuperuser

# 7. Start development server
python manage.py runserver
# Server runs at: http://localhost:8000
```

---

## 📁 Project Structure

```
Finora-App/
├── Finora/                              # Frontend (React Native + Expo)
│   ├── app/
│   │   ├── (tabs)/                      # Tab-based navigation
│   │   │   ├── _layout.jsx              # Tab navigator configuration
│   │   │   ├── dashboard.jsx            # Financial overview & KPIs
│   │   │   ├── transactions.jsx         # Expense tracking & history
│   │   │   ├── goals.jsx                # Financial goal management
│   │   │   ├── salary-reality.jsx       # Salary analysis & comparisons
│   │   │   └── ai.jsx                   # AI Neural Coach chat interface
│   │   ├── _layout.jsx                  # Root app layout
│   │   └── index.jsx                    # App entry point
│   ├── services/
│   │   ├── api.js                       # Axios API client configuration
│   │   ├── authAPI.js                   # Authentication endpoints
│   │   ├── aiAPI.js                     # AI Coach API integration
│   │   ├── salaryAPI.js                 # Salary analysis endpoints
│   │   └── transactionAPI.js            # Transaction endpoints
│   ├── components/                      # Reusable React components
│   ├── hooks/                           # Custom React hooks
│   ├── package.json                     # Frontend dependencies
│   ├── app.json                         # Expo configuration
│   └── .env.example                     # Environment template
│
├── finora-backend/                      # Backend (Django REST)
│   ├── config/                          # Core Django configuration
│   │   ├── settings.py                  # Django settings & middleware
│   │   ├── urls.py                      # Root URL routing
│   │   ├── wsgi.py                      # Production WSGI app
│   │   └── asgi.py                      # WebSocket/async support
│   │
│   ├── users/                           # User management module
│   │   ├── models.py                    # User profile model
│   │   ├── views.py                     # Authentication & profile views
│   │   ├── serializers.py               # Request/response serialization
│   │   ├── urls.py                      # Module routes (/api/auth/)
│   │   └── admin.py                     # Django admin configuration
│   │
│   ├── transactions/                    # Expense tracking module
│   │   ├── models.py                    # Transaction model
│   │   ├── views.py                     # CRUD endpoints
│   │   ├── serializers.py               # Serialization logic
│   │   └── urls.py                      # Transaction routes
│   │
│   ├── goals/                           # Goal management module
│   │   ├── models.py                    # Financial goal model
│   │   ├── views.py                     # Goal CRUD operations
│   │   ├── serializers.py               # Goal serialization
│   │   └── urls.py                      # Goal routes
│   │
│   ├── ai_coach/                        # AI Intelligence module
│   │   ├── views.py                     # Chat & insight endpoints
│   │   ├── serializers.py               # AI response serialization
│   │   ├── urls.py                      # AI routes (/api/ai/)
│   │   ├── ai_logic.py                  # AI processing algorithms
│   │   ├── ai_model/                    # Neural model files
│   │   └── prompts.py                   # AI prompt templates
│   │
│   ├── salary_reality/                  # Salary Analysis module
│   │   ├── views.py                     # Analysis endpoints
│   │   ├── serializers.py               # Response serialization
│   │   ├── urls.py                      # Routes (/api/salary/)
│   │   ├── salary_logic.py              # Analysis algorithms
│   │   └── models.py                    # Salary tier data
│   │
│   ├── manage.py                        # Django CLI
│   ├── requirements.txt                 # Python dependencies
│   ├── .env.example                     # Environment template
│   └── tests/                           # Test suite
│
├── scripts/                             # Utility & deployment scripts
├── .gitignore                           # Git ignore rules
├── LICENSE                              # MIT License
└── README.md                            # This file
```

---

## 🔌 API Documentation

### Authentication Module (`/api/auth/`)

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| `POST` | `/register/` | Create user account | Email, password, name | User object + JWT token |
| `POST` | `/login/` | Authenticate user | Email, password | JWT access & refresh tokens |
| `POST` | `/logout/` | Invalidate session | Authorization header | Success message |
| `GET` | `/profile/` | Retrieve user details | Authorization header | User profile object |
| `PUT` | `/profile/` | Update user information | Name, email, settings | Updated user object |
| `GET` | `/dashboard/` | Financial overview | Authorization header | Balance, expenses, goals summary |

### Transactions Module (`/api/transactions/`)

```
GET    /api/transactions/                - List all user transactions
POST   /api/transactions/                - Create new expense entry
GET    /api/transactions/{id}/           - Retrieve transaction details
PUT    /api/transactions/{id}/           - Update transaction
DELETE /api/transactions/{id}/           - Remove transaction
GET    /api/transactions/category/stats/ - Get category-based statistics
```

### Goals Module (`/api/goals/`)

```
GET    /api/goals/                       - List all financial goals
POST   /api/goals/                       - Create new goal
GET    /api/goals/{id}/                  - Retrieve goal details
PUT    /api/goals/{id}/                  - Update goal progress
DELETE /api/goals/{id}/                  - Delete goal
GET    /api/goals/{id}/progress/         - Get goal achievement metrics
```

### AI Coach Module (`/api/ai/`)

```
POST   /api/ai/chat/                     - Send message to Neural Coach
GET    /api/ai/chat/history/             - Retrieve chat conversation history
POST   /api/ai/insight/                  - Get spending analysis insights
POST   /api/ai/recommendations/          - Receive financial recommendations
GET    /api/ai/summary/                  - Get monthly financial summary
```

### Salary Reality Module (`/api/salary/`)

```
POST   /api/salary/analyse/              - Analyze salary across locations
GET    /api/salary/tiers/                - Retrieve salary tier data
GET    /api/salary/compare/              - Compare compensation packages
GET    /api/salary/locations/            - List available locations
```

### Response Format

All endpoints return JSON with standard format:

```json
{
  "success": true,
  "data": { /* response object */ },
  "message": "Operation successful",
  "timestamp": "2026-07-19T10:30:00Z"
}
```

---

## 🔐 Security

### Implemented Security Measures

✅ **JWT Authentication** – Secure stateless token-based authentication  
✅ **Environment Variables** – Sensitive data protection via .env configuration  
✅ **Secure Storage** – React Native Secure Store for token persistence  
✅ **HTTP Headers** – Security headers configuration  
✅ **CORS Policy** – Cross-origin request validation  

### Production Security Checklist

Add these settings to Django `settings.py` for production:

```python
# HTTPS & SSL
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Security Headers
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
X_FRAME_OPTIONS = 'DENY'

# Content Security Policy
SECURE_CONTENT_SECURITY_POLICY = {
    "default-src": ("'self'",),
    "script-src": ("'self'",),
    "style-src": ("'self'", "'unsafe-inline'"),
}

# Additional
DEBUG = False
ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']
```

---

## 📈 Performance Optimization

### Frontend Optimization Strategies

- **Component Memoization** – Use `React.memo()` for expensive render prevention
- **Lazy Loading** – Implement code splitting for transaction lists and chart components
- **Image Optimization** – Compress and cache receipt images
- **State Management** – Minimize re-renders with proper Zustand store architecture
- **Chart Optimization** – Virtual scrolling for large financial datasets

### Backend Optimization Strategies

- **Database Queries** – Use `select_related()` and `prefetch_related()` for efficient joins
- **Caching Layer** – Redis caching for salary tier data and user preferences
- **Rate Limiting** – API throttling for AI coach requests (e.g., 100 requests/hour)
- **Pagination** – Implement cursor-based pagination for large transaction lists
- **Indexing** – Database indexes on `user_id`, `transaction_date`, `category`

### Monitoring & Profiling

- Use Django Debug Toolbar for query analysis
- Implement APM (Application Performance Monitoring) tools
- Monitor backend response times and frontend render performance

---

## 🚢 Deployment

### Backend Deployment (Production)

#### Using Gunicorn + Nginx

```bash
# 1. Install production server
pip install gunicorn

# 2. Create systemd service file
sudo nano /etc/systemd/system/finora.service

[Unit]
Description=Finora Django Application
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/finora-backend
ExecStart=/var/www/finora/venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4

[Install]
WantedBy=multi-user.target

# 3. Enable and start service
sudo systemctl enable finora
sudo systemctl start finora

# 4. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/finora

server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 5. Enable Nginx site
sudo ln -s /etc/nginx/sites-available/finora /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

#### Environment Configuration

```bash
export DEBUG=False
export SECRET_KEY='your-very-secret-key-here'
export DATABASE_URL='postgresql://user:password@db-host:5432/finora_prod'
export ALLOWED_HOSTS='yourdomain.com,www.yourdomain.com'
export AI_MODEL_PATH='/path/to/ai/model'
```

### Frontend Deployment (Mobile)

#### Build & Publish with EAS (Expo Application Services)

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo account
eas login

# 3. Configure EAS project
eas build:configure

# 4. Build for production
eas build --platform all --auto-submit

# 5. Submit to app stores
eas submit --platform ios
eas submit --platform android
```

#### Web Deployment

```bash
# Build for web
npm run build:web

# Deploy to hosting (Vercel, Netlify, etc.)
# Vercel:
vercel deploy

# Netlify:
netlify deploy --prod --dir=.expo/web
```

---

## 🧪 Testing

### Test Structure

```
finora-backend/
├── tests/
│   ├── test_users.py           # User authentication tests
│   ├── test_transactions.py    # Transaction CRUD tests
│   ├── test_ai_coach.py        # AI module tests
│   ├── test_salary_reality.py  # Salary analysis tests
│   └── fixtures/               # Test data fixtures
```

### Running Tests

```bash
# Backend - Run all tests
cd finora-backend
pytest tests/ -v

# Run specific test file
pytest tests/test_users.py -v

# Run with coverage report
pytest tests/ --cov=. --cov-report=html

# Frontend - Run component tests
cd Finora
npm test
```

### Test Coverage Goals

- **Unit Tests:** 80%+ coverage for business logic
- **Integration Tests:** API endpoint workflows
- **E2E Tests:** Critical user journeys (register → add transaction → check goal)

---

## 🤝 Development Workflow

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat:` – New feature
- `fix:` – Bug fix
- `refactor:` – Code restructuring
- `docs:` – Documentation update
- `test:` – Test addition
- `chore:` – Build/dependency updates

**Example:**

```bash
git commit -m "feat(ai-coach): Add spending pattern analysis

- Implemented ML model for spending categorization
- Added endpoint for monthly spending trends
- Integrated with frontend dashboard

Closes #42"
```

### Pull Request Process

1. Push feature branch to remote
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create Pull Request on GitHub with:
   - Clear title and description
   - Link to related issues
   - Screenshots/demos for UI changes
   - Test coverage details

3. Address code review feedback

4. Merge to `main` branch after approval

---

## 📞 Support & Contact

- **Developer:** Mehboob Ali  
- **Email:** mehboob56ali78@gmail.com  
- **GitHub:** [@MehboobAli-Portfolio](https://github.com/MehboobAli-Portfolio)  
- **Repository:** [Finora-App](https://github.com/MehboobAli-Portfolio/Finora-App)

### Reporting Issues

Please report bugs via [GitHub Issues](https://github.com/MehboobAli-Portfolio/Finora-App/issues) with:
- Clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (OS, app version, backend URL)
- Screenshots or error logs

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](LICENSE) file for complete details.

You are free to use, modify, and distribute this software for personal or commercial purposes.

---

## 🙏 Acknowledgments

- **Expo Team** – For React Native development tools and services
- **Django REST Framework** – Robust API development framework
- **React Native Community** – Extensive component library and documentation
- **Contributors & Testers** – For feedback and bug reports

---

**Last Updated:** July 19, 2026  
**Status:** Active Development  
**Version:** 1.0.0
