# Finora - AI-Powered Personal Finance & Wealth Management

![Status](https://img.shields.io/badge/status-active-success.svg)
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

> **Finora** is a comprehensive full-stack personal finance application that empowers users to take complete control of their financial health. Combining intelligent expense tracking, AI-driven insights, and goal-based financial planning, Finora transforms how users manage wealth.

---

## 🎯 Features

### Core Capabilities
- **💸 Intelligent Expense Tracking** - Categorize and monitor daily expenses with dynamic form systems
- **🎯 Financial Goal Architect** - Set, edit, and visualize savings targets with real-time progress tracking
- **📊 Investment Management** - Dedicated ledger for tracking asset growth and capital allocations
- **🧠 Neural Coach (AI)** - Native real-time chat with AI module providing spending analysis and financial recommendations
- **💰 Salary Reality Check** - Analyze income patterns across locations with comparative tier breakdowns
- **📈 Receipt Scanning** - OCR-powered receipt capture and expense categorization

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React Native 0.81.5
- **Router**: Expo Router 6.0.23
- **State Management**: AsyncStorage (persistent local state)
- **HTTP Client**: Axios 1.13.6
- **Charting**: react-native-chart-kit 6.12.0
- **UI Components**: Expo Vector Icons, React Native Reanimated

### Backend
- **Framework**: Django 5.x + Django REST Framework
- **Authentication**: JWT (stateful sessions)
- **AI Integration**: Custom Neural Coach module
- **Database**: PostgreSQL (recommended for production)
- **API Structure**: Modular apps (users, ai_coach, salary_reality)

### Infrastructure
- **Mobile Platforms**: iOS & Android (via Expo)
- **Web Support**: React web target (preview only)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.9+ (backend)
- npm or yarn (frontend)
- pip (backend)
- Expo CLI (mobile development)

### Frontend Setup

```bash
# Clone repository
git clone https://github.com/MehboobAli-Portfolio/Finora-App.git
cd Finora-App/Finora

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API_URL

# Run development server
npm start

# Platform-specific
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web preview
```

### Backend Setup

```bash
# Navigate to backend
cd Finora-App/finora-backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env
# Edit .env with database credentials

# Database setup
python manage.py migrate
python manage.py collectstatic

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

---

## 📁 Project Structure

```
Finora-App/
├── Finora/                          # Frontend (React Native)
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── _layout.jsx         # Tab navigation
│   │   │   ├── dashboard.jsx       # Financial overview
│   │   │   ├── transactions.jsx    # Expense tracking
│   │   │   ├── goals.jsx           # Goal management
│   │   │   ├── salary-reality.jsx  # Salary analysis
│   │   │   └── ai.jsx              # Neural Coach chat
│   │   └── _layout.jsx
│   ├── services/
│   │   ├── api.js                  # API client configuration
│   │   ├── authAPI.js              # Auth endpoints
│   │   ├── aiAPI.js                # AI Coach endpoints
│   │   └── salaryAPI.js            # Salary analysis endpoints
│   ├── package.json
│   └── app.json
│
├── finora-backend/                  # Backend (Django)
│   ├── config/                      # Core Django configuration
│   │   ├── settings.py              # Settings (INSTALLED_APPS, middleware)
│   │   ├── urls.py                  # Root URL routing
│   │   ├── wsgi.py                  # WSGI application
│   │   └── asgi.py                  # ASGI application
│   │
│   ├── users/                       # Authentication & Profile
│   │   ├── models.py                # User model
│   │   ├── views.py                 # Auth & dashboard views
│   │   ├── urls.py                  # User URLs (/api/auth/)
│   │   └── serializers.py
│   │
│   ├── ai_coach/                    # AI Module
│   │   ├── views.py                 # Chat & insight views
│   │   ├── urls.py                  # URLs (/api/ai/)
│   │   ├── ai_logic.py              # AI processing logic
│   │   ├── ai_model/                # Neural model files
│   │   └── serializers.py
│   │
│   ├── salary_reality/              # Salary Analysis
│   │   ├── views.py                 # Salary endpoints
│   │   ├── urls.py                  # URLs (/api/salary/)
│   │   ├── salary_logic.py          # Analysis algorithms
│   │   └── serializers.py
│   │
│   ├── manage.py
│   └── requirements.txt
│
├── scripts/                         # Utility scripts
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register/          - User registration
POST   /api/auth/login/              - User login (JWT)
POST   /api/auth/logout/             - User logout
GET    /api/auth/profile/            - Get user profile
PUT    /api/auth/profile/            - Update user profile
```

### Dashboard
```
GET    /api/auth/dashboard/          - Financial overview (balance, expenses, goals)
```

### AI Coach
```
POST   /api/ai/chat/                 - Send message to AI
GET    /api/ai/chat/history/         - Retrieve chat history
POST   /api/ai/insight/              - Get spending insights
```

### Salary Reality
```
POST   /api/salary/analyse/          - Analyze salary across locations
GET    /api/salary/tiers/            - Get salary tier data
```

### Transactions
```
GET    /api/transactions/            - List all transactions
POST   /api/transactions/            - Create new transaction
PUT    /api/transactions/{id}/       - Update transaction
DELETE /api/transactions/{id}/       - Delete transaction
```

### Goals
```
GET    /api/goals/                   - List financial goals
POST   /api/goals/                   - Create new goal
PUT    /api/goals/{id}/              - Update goal
DELETE /api/goals/{id}/              - Delete goal
```

---

## 🔐 Security Best Practices

✅ **Implemented:**
- JWT-based authentication
- Stateful session management
- Environment variable protection

⚠️ **Recommended Enhancements:**
```python
# Add to Django settings
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_SECURITY_POLICY = {...}
```

---

## 🧪 Testing

### Run Tests
```bash
# Backend tests
cd finora-backend
pytest tests/ -v

# Frontend tests
cd Finora
npm test
```

### Test Coverage
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

---

## 📊 Performance Optimization

### Frontend
- Memoize expensive component renders
- Implement lazy loading for transaction lists
- Optimize chart rendering for large datasets

### Backend
- Database query optimization (select_related, prefetch_related)
- Implement caching for salary tier data
- Rate limiting for AI chat API
- Pagination for list endpoints

---

## 🚢 Deployment

### Backend (Production)
```bash
# Using Gunicorn + Nginx
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000

# Environment setup
export DEBUG=False
export SECRET_KEY=your-secret-key
export DATABASE_URL=postgresql://user:password@host/db
```

### Frontend (Production)
```bash
# Build for EAS
eas build --platform all

# Or build locally for specific platform
npm run build:ios
npm run build:android
```

---

## 🤝 Contributing

1. Create a feature branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Commit with semantic messages
   ```bash
   git commit -m "feat: description of feature"
   git commit -m "fix: description of fix"
   git commit -m "refactor: description of refactor"
   ```

3. Push and create a Pull Request
   ```bash
   git push origin feature/your-feature-name
   ```

4. PR should include:
   - Clear description of changes
   - Tests for new functionality
   - Updated documentation

---

## 📝 Commit Message Guidelines

Follow conventional commits:
```
feat:     New feature
fix:      Bug fix
refactor: Code restructuring
docs:     Documentation
test:     Test additions
chore:    Build/dependencies
```

Example:
```bash
git commit -m "feat: Add salary reality comparison chart

- Implemented location-based salary analysis
- Added tier comparison visualization
- Integrated with salary_reality API endpoints
"
```

---

## 🐛 Bug Reports & Issues

Report issues via GitHub Issues with:
- Clear title and description
- Steps to reproduce
- Expected vs. actual behavior
- Environment details (OS, versions)
- Screenshots/logs if applicable

---

## 📞 Support & Contact

- **Author**: Mehboob Ali
- **Email**: mehboob56ali78@gmail.com
- **Repository**: [MehboobAli-Portfolio/Finora-App](https://github.com/MehboobAli-Portfolio/Finora-App)

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- Expo team for React Native development tools
- Django REST Framework community
- Contributors and testers

---

**Last Updated**: April 19, 2026  
**Status**: Active Development
