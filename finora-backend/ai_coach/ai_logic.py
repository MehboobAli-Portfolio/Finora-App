import json
import logging
import os
import re
import time

from transactions.models import Transaction

logger = logging.getLogger(__name__)

# Intent routing: absolute confidence and top1-top2 margin (see plan).
SKLEARN_MIN_CONF = 0.28
SKLEARN_MIN_MARGIN = 0.06
TORCH_MIN_CONF = 0.22
TORCH_MIN_MARGIN = 0.04

_CATEGORY_LABELS = dict(Transaction.CATEGORY_CHOICES)

CURRENCY_SYMBOLS = {
    'USD': '$',
    'PKR': 'Rs. ',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'AED': 'AED ',
    'SAR': 'SAR ',
    'CAD': 'CA$',
    'AUD': 'AU$',
    'JPY': '¥',
    'BDT': '৳',
    'TRY': '₺',
    'CNY': '¥',
    'KRW': '₩',
    'MYR': 'RM ',
    'SGD': 'S$',
    'THB': '฿',
    'PHP': '₱',
    'IDR': 'Rp ',
    'ZAR': 'R ',
    'NGN': '₦',
    'EGP': 'E£',
    'BRL': 'R$',
    'MXN': 'MX$',
    'QAR': 'QAR ',
    'KWD': 'KWD ',
    'BHD': 'BHD ',
    'OMR': 'OMR ',
}

def fmt_curr(amount, currency='PKR'):
    sym = CURRENCY_SYMBOLS.get((currency or 'PKR').upper(), f"{currency} ")
    num = float(amount or 0)
    if num < 0:
        return f"-{sym}{abs(num):,.2f}"
    return f"{sym}{num:,.2f}"

# ── Market data ───────────────────────────────────────────────────────────────
# Primary source: Django cache populated every 10 min by Celery task.
# Fallback: in-process module-level cache (same behaviour as before).
# Both paths are used so the system degrades gracefully without Redis/Celery.

_MODULE_MARKET_CACHE: dict | None = None
_MODULE_MARKET_CACHE_TIME: float = 0
_MODULE_CACHE_EXPIRY: int = 300   # 5 minutes for in-process fallback

MARKET_CACHE_KEY = 'finora_market_data'   # must match ai_coach/tasks.py


def get_market_data():
    """
    Return the latest market prices dict.
    Tries Django cache first (populated by Celery), falls back to a direct
    yfinance call with an in-process 5-minute TTL so we never block on Redis.
    """
    global _MODULE_MARKET_CACHE, _MODULE_MARKET_CACHE_TIME

    # ── 1. Try Django cache (instant, pre-warmed by Celery task) ─────────
    try:
        from django.core.cache import cache as _django_cache
        cached = _django_cache.get(MARKET_CACHE_KEY)
        if cached:
            return cached
    except Exception:
        pass  # Cache unavailable — fall through to yfinance

    # ── 2. In-process fallback cache ─────────────────────────────────────
    now = time.time()
    if _MODULE_MARKET_CACHE and (now - _MODULE_MARKET_CACHE_TIME < _MODULE_CACHE_EXPIRY):
        return _MODULE_MARKET_CACHE

    # ── 3. Live yfinance call (only when both caches are cold/stale) ──────
    try:
        import yfinance as yf
        import concurrent.futures

        def _fetch():
            spy  = yf.Ticker('SPY').fast_info
            btc  = yf.Ticker('BTC-USD').fast_info
            qqq  = yf.Ticker('QQQ').fast_info
            gold = yf.Ticker('GC=F').fast_info
            return {
                'spy_price':  spy.last_price,
                'btc_price':  btc.last_price,
                'qqq_price':  qqq.last_price,
                'gold_price': gold.last_price,
                'fetched_at': now,
            }

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(_fetch)
            try:
                data = future.result(timeout=2.5)  # shortcut: 2.5 s hard cap; raise on slow provider
            except concurrent.futures.TimeoutError:
                logger.warning('yfinance live fetch timed out — using stale cache')
                return _MODULE_MARKET_CACHE

        _MODULE_MARKET_CACHE = data
        _MODULE_MARKET_CACHE_TIME = now
        return data
    except Exception as exc:
        logger.warning('yfinance live fetch failed: %s', exc)
        return _MODULE_MARKET_CACHE  # Return stale cache rather than None


class FinoraAI:
    _model = None
    _meta = None

    @classmethod
    def load_model(cls):
        import torch
        from .ai_model.ml_model import FinoraNet

        if cls._model is not None and cls._meta is not None:
            return

        model_path = os.path.join(os.path.dirname(__file__), "ai_model", "bot_model.pth")
        meta_path = os.path.join(os.path.dirname(__file__), "ai_model", "bot_meta.json")

        if not os.path.exists(model_path) or not os.path.exists(meta_path):
            return

        with open(meta_path, 'r') as f:
            cls._meta = json.load(f)

        input_size = cls._meta['input_size']
        hidden_size = cls._meta['hidden_size']
        output_size = cls._meta['output_size']

        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        cls._model = FinoraNet(input_size, hidden_size, output_size).to(device)
        cls._model.load_state_dict(torch.load(model_path, map_location=device))
        cls._model.eval()

    @property
    def market_data(self):
        if self._market_data is None:
            self._market_data = get_market_data()
        return self._market_data

    def __init__(
        self,
        user,
        balance,
        income,
        expenses,
        budget,
        goals_count,
        completed_goals,
        recent_transactions,
        active_goals=None,
        spending_by_category=None,
        investments=None,
    ):
        FinoraAI.load_model()

        self.user = user
        self.balance = float(balance)
        self.income = float(income)
        self.expenses = float(expenses)
        self.budget = float(budget)
        self.goals_count = goals_count
        self.completed_goals = completed_goals
        self.txs = recent_transactions or []
        self.active_goals = active_goals or []
        self.spending_by_category = spending_by_category or []
        self.investments = investments or []
        self._market_data = None # Lazy loaded

        score = 100
        surplus = self.income - self.expenses
        if self.income > 0:
            savings_rate = surplus / self.income
            if savings_rate < 0.20:
                score -= (0.20 - savings_rate) * 100
        else:
            score = 0

        if self.budget > 0 and self.expenses > self.budget:
            score -= 20

        score += (self.completed_goals * 5)
        self.health_score = max(0, min(100, int(score)))

    def fmt(self, amount):
        curr = getattr(self.user, 'currency', 'PKR')
        return fmt_curr(amount, curr)

    def generate_daily_suggestion(self):
        """Generates 1 hyper-focused contextual idea for the dashboard based deeply on health score."""
        surplus = self.income - self.expenses

        if self.health_score < 40:
            if self.budget <= 0:
                return f"Health Score: {self.health_score}/100. Critical Action: You haven't set a Monthly Budget. Establishing one is mathematically proven to be the fastest way to get your finances on track."
            if self.expenses > self.budget:
                over = self.expenses - self.budget
                return f"Health Score: {self.health_score}/100. Critical Alert: You are over budget by {self.fmt(over)}. Avoid non-essential spending for the remainder of the month."
            if surplus <= 0:
                return f"Health Score: {self.health_score}/100. Savings Alert: Your expenses are currently consuming your entire income ({self.fmt(self.income)}). Try to reduce discretionary spending by 15% this week."

        elif self.health_score < 75:
            if self.active_goals and surplus > 0:
                goal = self.active_goals[0]
                dist = float(goal.target_amount - goal.current_amount)
                months = dist / surplus
                return f"Health Score: {self.health_score}/100. Track Forecast: With your current surplus of {self.fmt(surplus)}/month, if you focus entirely on your '{goal.name}' goal, you will complete it in just {months:.1f} months!"
            return f"Health Score: {self.health_score}/100. Doing well: You have a surplus of {self.fmt(surplus)}. Consider opening a savings goal to direct this cash effectively, like an Emergency Fund."

        else:
            if self.active_goals and surplus > 0:
                return f"Health Score: {self.health_score}/100. Excellent momentum! You have {self.fmt(surplus)}/mo extra cash. If you divide this equally among your {len(self.active_goals)} active goals, they will grow on autopilot."
            elif self.market_data and surplus > 0:
                spy_price = self.market_data.get('spy_price', 500)
                return f"Health Score: {self.health_score}/100. Wealth Building: With a massive surplus of {self.fmt(surplus)}/mo, consider dollar-cost averaging into an index fund like SPY (currently ${spy_price:,.2f}) to drastically accelerate compound growth over the next 5 years."
            return f"Health Score: {self.health_score}/100. Financial Independence unlocked! Keep optimizing your strategy."

    def _extract_ticker(self, message):
        # Explicit ticker with $ prefix: $AAPL, $TSLA, $BTC
        match = re.search(r'\$([A-Za-z]{1,5})\b', message)
        if match:
            return match.group(1).upper()

        name_map = {
            "apple": "AAPL", "tesla": "TSLA", "microsoft": "MSFT", "google": "GOOG",
            "amazon": "AMZN", "meta": "META", "nvidia": "NVDA", "netflix": "NFLX",
            "bitcoin": "BTC-USD", "ethereum": "ETH-USD", "dogecoin": "DOGE-USD", "solana": "SOL-USD",
            "gold": "GC=F", "silver": "SI=F", "s&p 500": "SPY", "sp500": "SPY", "nasdaq": "QQQ",
        }
        low = message.lower()
        # Only check ticker names if asking about price, stock, crypto, or market
        if any(w in low for w in ["price", "stock", "quote", "share", "crypto", "trading at", "ticker", "market"]):
            for name, ticker in name_map.items():
                if name in low:
                    return ticker

        return None

    def _extract_amount(self, message):
        # Extract things like $500, 500 dollars, 500.00
        match = re.search(r'\$?(\d+(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:dollars|bucks)?\b', message, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(',', ''))
            except ValueError:
                return None
        return None

    def _category_breakdown_text(self):
        if not self.spending_by_category:
            return ""
        lines = []
        for row in self.spending_by_category[:5]:
            cat = row.get("category") or "other"
            label = _CATEGORY_LABELS.get(cat, cat.replace("_", " ").title())
            total = float(row.get("total") or 0)
            lines.append(f"- {label}: {self.fmt(total)}")
        return "\nTop categories this month:\n" + "\n".join(lines)

    def _recent_activity_text(self, limit=8):
        if not self.txs:
            return ""
        lines = []
        for t in self.txs[:limit]:
            desc = t.get("description") or "Entry"
            amt = float(t.get("amount") or 0)
            cat = t.get("category") or "other"
            label = _CATEGORY_LABELS.get(cat, cat)
            tt = t.get("txn_type") or "expense"
            d = t.get("date") or ""
            sign = "+" if tt == "income" else "-"
            lines.append(f"- {d} {desc} ({label}) {sign}{self.fmt(amt)}")
        return "\nRecent activity from your ledger:\n" + "\n".join(lines)

    def process_chat_message(self, message: str, chat_history: list = None) -> tuple:
        """Classifies intent, extracts entities, and returns (response, intent, entities)."""
        import torch
        import yfinance as yf
        from .ai_model.intent_sklearn import predict_intent_sklearn, sklearn_intent_available

        entities = {}
        
        ticker = self._extract_ticker(message)
        if ticker:
            entities['ticker'] = ticker

        amount = self._extract_amount(message)
        if amount is not None:
            entities['amount'] = amount

        # Only fetch live ticker if user is explicitly querying for price or market
        if ticker and any(w in message.lower() for w in ["price", "trading", "stock", "how much is", "$", "quote"]):
            try:
                ticker_obj = yf.Ticker(ticker)
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    future = pool.submit(lambda: ticker_obj.fast_info)
                    try:
                        info = future.result(timeout=1.5)
                    except concurrent.futures.TimeoutError:
                        logger.warning('yfinance ticker lookup timed out for %s', ticker)
                        raise Exception('timeout')
                price = getattr(info, 'last_price', None)
                prev_close = getattr(info, 'previous_close', None)
                
                if price and prev_close:
                    change = ((price - prev_close) / prev_close) * 100
                    direction = "📈 Up" if change >= 0 else "📉 Down"
                    return (
                        f"Live Market Data Explorer 🌐:\n{ticker} is {direction} and currently trading at "
                        f"~${price:,.2f} ({change:+.2f}% today).\n\n"
                        f"If you believe in the long-term fundamentals of {ticker}, maintaining a balanced portfolio "
                        "approach and using Dollar Cost Averaging with your available surplus can be highly effective. "
                        "How else can I help?",
                        "market_status",
                        entities
                    )
            except Exception as exc:
                logger.warning('yfinance ticker fetch failed for %s: %s', ticker, exc)

        intent = None
        lower = message.lower()

        if sklearn_intent_available():
            sk = predict_intent_sklearn(message)
            if sk is not None and sk.intent != "unknown":
                if sk.confidence >= SKLEARN_MIN_CONF and sk.margin >= SKLEARN_MIN_MARGIN:
                    intent = sk.intent

        if intent is None and FinoraAI._model is not None and FinoraAI._meta is not None:
            tokens = [t for t in re.split(r'\W+', message.lower()) if t]
            all_words = FinoraAI._meta['all_words']
            tags = FinoraAI._meta['tags']

            bag = torch.zeros(len(all_words), dtype=torch.float32)
            for idx, w in enumerate(all_words):
                if w in tokens:
                    bag[idx] = 1.0

            bag = bag.unsqueeze(0)
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
            bag = bag.to(device)

            with torch.no_grad():
                output = FinoraAI._model(bag)

            probabilities = torch.softmax(output, dim=1)
            vals, _ = torch.sort(probabilities[0], descending=True)
            p1 = vals[0].item()
            p2 = vals[1].item() if probabilities.shape[1] > 1 else 0.0
            margin = p1 - p2
            prob, predicted_idx = torch.max(probabilities, dim=1)
            t_intent = tags[predicted_idx.item()]
            conf = prob.item()

            if t_intent != "unknown" and conf >= TORCH_MIN_CONF and margin >= TORCH_MIN_MARGIN:
                intent = t_intent

        if intent is None:
            intent = self._fallback_keyword_matcher(lower)

        if intent == "unknown":
            return (
                "Could you rephrase that? I'm highly trained to discuss your budget, goals, current balance, "
                "spending habits, portfolio, and live market trends!",
                intent,
                entities
            )

        # Basic context awareness from history
        if chat_history and len(chat_history) > 0:
            last_msg = chat_history[-1]
            last_intent = last_msg.get("intent") or ""
            if "market_status" in last_intent and intent == "investing_advice":
                # slightly context-aware response modification
                pass

        return (self._generate_response(intent), intent, entities)

    def _fallback_keyword_matcher(self, text):
        if any(w in text for w in ["portfolio", "holdings", "my investments", "my stocks", "positions"]):
            return "check_portfolio"
        if any(w in text for w in ["goal", "goals", "savings target"]):
            return "check_goals"
        if any(w in text for w in ["balance", "net worth", "how much money", "how much cash", "how much do i have"]):
            return "check_balance"
        if any(w in text for w in ["spent", "spending", "expenses", "where did my money", "categories"]):
            return "check_spending"
        if any(w in text for w in ["50/30/20", "50 30 20", "zero-based", "envelope method", "budget rule"]):
            return "rule_50_30_20"
        if any(w in text for w in ["accounting", "chartered accountant", "ca advice", "balance sheet", "p&l", "profit and loss", "double entry", "bookkeeping", "accrual", "depreciation", "ebitda"]):
            return "ca_accounting"
        if any(w in text for w in ["tax", "deduction", "write off", "write-off", "capital gains", "irs", "fbr", "1099", "w2", "vat", "gst", "tax slab"]):
            return "tax_advice"
        if any(w in text for w in ["emergency fund", "rainy day", "safety net", "contingency fund"]):
            return "emergency_fund"
        if any(w in text for w in ["compound interest", "compounding", "rule of 72", "fire", "financial independence", "safe withdrawal", "4% rule"]):
            return "compound_interest_fire"
        if any(w in text for w in ["debt", "loan", "credit card", "pay off", "avalanche", "snowball", "apr", "refinance"]):
            return "debt_advice"
        if any(w in text for w in ["insurance", "term life", "health insurance", "premium", "coverage", "policy"]):
            return "insurance_advice"
        if any(w in text for w in ["freelance", "business", "invoice", "cash flow", "llc", "sole proprietor"]):
            return "business_finance"
        if any(w in text for w in ["401k", "ira", "retire", "retirement", "pension", "roth"]):
            return "retirement_advice"
        if any(w in text for w in ["house", "mortgage", "rent or buy", "property", "real estate"]):
            return "real_estate"
        if any(w in text for w in ["crypto", "bitcoin", "ethereum", "blockchain", "doge"]):
            return "crypto_advice"
        if any(w in text for w in ["market", "spy", "stock market", "nasdaq", "btc price"]):
            return "market_status"
        if any(w in text for w in ["invest", "wealth", "etf", "index fund", "stock tip"]):
            return "investing_advice"
        if any(w in text for w in ["limit", "budget", "overspend", "afford"]):
            return "check_budget"
        if any(w in text for w in ["save", "reduce", "frugal", "cut back", "spend less"]):
            return "improve_savings"
        if any(w in text for w in ["financial advice", "financial advisor", "money management", "personal finance"]):
            return "general_advisory"
        if re.search(r"\b(hello|hi|hey|thanks|good morning|good evening|help me)\b", text):
            return "greeting"
        return "unknown"

    def _generate_response(self, intent):
        if intent == "greeting":
            base = (
                f"Hello, {self.user.username}! I am the Finora AI Neural Coach. "
                "Ask about your budget, spending, goals, portfolio, or live market trends."
            )
            extra = self._recent_activity_text(5)
            if extra:
                return base + "\n" + extra
            return base

        elif intent == "check_budget":
            score_msg = f"Your Finora Health Score is currently {self.health_score}/100. "
            if self.budget <= 0:
                return score_msg + "You haven't set a budget yet! Head to your Profile to configure a monthly limit."
            remaining = self.budget - self.expenses
            pct = (self.expenses / self.budget) * 100
            if remaining < 0:
                return score_msg + (
                    f"\n⚠️ Alert: You are over budget by {self.fmt(abs(remaining))}! It's completely normal to slip up, "
                    "but to get back on track, try to pause non-essential spending for the rest of the month."
                )
            return score_msg + (
                f"\nYou currently have {self.fmt(remaining)} remaining in your regular budget. "
                f"You've used {pct:.1f}% of it so far. Keep up the balanced habits!"
            )

        elif intent == "check_balance":
            return f"According to your logged transactions, your total net balance currently stands at {self.fmt(self.balance)}."

        elif intent == "check_spending":
            msg = f"You've tracked {self.fmt(self.expenses)} in overall expenses this month.\n"
            msg += self._category_breakdown_text()
            msg += self._recent_activity_text(8)
            if self.budget > 0 and self.expenses > self.budget:
                msg += "\n\n⚠️ HIGH ALERT: You have exceeded your monthly budget constraint! Let's pause non-essential spending for now."
            elif not self.spending_by_category and not self.txs:
                msg += "\n\nLog more expenses in Finora to unlock category insights here."
            return msg.strip()

        elif intent == "check_goals":
            surplus = self.income - self.expenses
            base_msg = (
                f"You are actively pursuing {len(self.active_goals)} financial goal(s) and have successfully "
                f"completed {self.completed_goals} milestone(s)!\n\n"
            )

            if len(self.active_goals) == 0:
                return base_msg + "A balanced approach to wealth starts with setting a specific target, like an Emergency Fund right now."

            if surplus > 0:
                base_msg += (
                    f"With your current monthly surplus of {self.fmt(surplus)}, here are your live forecasts if you "
                    "allocate your extra cash optimally:\n\n"
                )
                split_surplus = surplus / len(self.active_goals)
                for g in self.active_goals:
                    rem = float(g.target_amount - g.current_amount)
                    if rem <= 0:
                        continue
                    months = rem / split_surplus
                    base_msg += (
                        f"🎯 **{g.name}**: Remaining {self.fmt(rem)}. By directing your equal share "
                        f"({self.fmt(split_surplus)}/mo) toward this, you'll reach it in **{months:.1f} months**!\n"
                    )
            else:
                base_msg += "Currently, your expenses are limiting your ability to save. Let's look at your remaining targets:\n\n"
                for g in self.active_goals:
                    rem = float(g.target_amount - g.current_amount)
                    base_msg += f"- {g.name}: {self.fmt(rem)} left.\n"
                base_msg += "\nTry to cut back your discretionary spending this week to unlock savings momentum."

            return base_msg

        elif intent == "check_portfolio":
            if not self.investments:
                return (
                    "You don't have any positions logged in Finora yet. Add stocks, crypto, ETFs, or other assets "
                    "under Investments so I can summarize performance and cost basis here."
                )
            lines = [
                f"Portfolio snapshot ({len(self.investments)} position(s) shown):",
                "",
            ]
            total_cost = 0.0
            total_val = 0.0
            for inv in self.investments:
                name = inv.get("name") or "Asset"
                itype = inv.get("investment_type") or "other"
                sym = (inv.get("symbol") or "").strip()
                cost = float(inv.get("amount") or 0)
                val = float(inv.get("current_value") or 0)
                rp = inv.get("return_percentage")
                total_cost += cost
                total_val += val
                sym_part = f" ({sym})" if sym else ""
                ret = f"{float(rp):+.1f}%" if rp is not None else "n/a"
                lines.append(f"- {name}{sym_part} [{itype}]: book value {self.fmt(val)} vs cost {self.fmt(cost)} → {ret} unrealized")
            if total_cost > 0:
                agg = (total_val - total_cost) / total_cost * 100
                lines.append("")
                lines.append(f"Combined unrealized return vs cost basis: {agg:+.1f}% (not live market advice).")
            lines.append("")
            lines.append("Update current values periodically in the app for accuracy.")
            return "\n".join(lines)

        elif intent == "investing_advice":
            surplus = self.income - self.expenses
            detailed_advise = (
                f"To reach your goals efficiently, we want a balanced approach: managing risk while investing your "
                f"surplus for steady growth. Your Finora Score is {self.health_score}/100.\n\n"
            )
            if surplus > 0:
                sp500_annual_return = 0.08
                five_year_inv = (surplus) * (((1 + sp500_annual_return / 12) ** (12 * 5) - 1) / (sp500_annual_return / 12))

                detailed_advise += "Balanced Portfolio Recommendation Engine 📊:\n"
                detailed_advise += "1️⃣ 70% Core (S&P 500 / SPY): Safe, long-term steady growth.\n"
                detailed_advise += "2️⃣ 15% Tech (QQQ): Aggressive growth via top tech giants.\n"
                detailed_advise += "3️⃣ 10% Protection (Gold / GC=F): A proven hedge against inflation.\n"
                detailed_advise += "4️⃣ 5% High Risk (Bitcoin / BTC): Optional allocation for potential exponential upside.\n\n"

                detailed_advise += (
                    f"💡 Projection: If you invest your {self.fmt(surplus)}/month surplus consistently, an ~8% historical "
                    f"return could yield approximately **{self.fmt(five_year_inv)}** in 5 years! Stay balanced and consistent."
                )
            else:
                detailed_advise += (
                    f"Investing is powerful, but right now, your monthly expenses ({self.fmt(self.expenses)}) completely "
                    "consume your income. A balanced approach means eliminating high-interest debt and building a small "
                    "cash safety net first. Try cutting back discretionary spending to create a cash surplus, then you "
                    "can confidently start investing!"
                )
            return detailed_advise

        elif intent == "ca_accounting":
            return (
                "🏛️ **Chartered Accountant Advisory — Core Financial Principles**:\n\n"
                "1️⃣ **The Golden Equation**: Assets = Liabilities + Equity. Every transaction affects both sides in double-entry bookkeeping.\n"
                "2️⃣ **Cash vs Accrual Accounting**: Cash accounting records money when received/paid. Accrual records revenue when earned and expenses when incurred — giving true visibility into profitability.\n"
                "3️⃣ **The 3 Core Statements**:\n"
                "   • **P&L (Income Statement)**: Revenue minus Cost of Goods and Overheads = Net Operating Profit.\n"
                "   • **Balance Sheet**: Snapshot of what you own (Cash, Equipment, Inventory) vs what you owe (Debt, Accounts Payable).\n"
                "   • **Cash Flow Statement**: Tracks actual liquidity across Operating, Investing, and Financing activities.\n"
                "4️⃣ **Working Capital & Runway**: Always maintain at least 3 to 6 months of operating cash to withstand business or life downturns.\n\n"
                "Need specific ledger structuring, depreciation schedules, or profit margin analysis? Let me know!"
            )

        elif intent == "rule_50_30_20":
            inc = self.income if self.income > 0 else 100000
            needs = inc * 0.50
            wants = inc * 0.30
            savings = inc * 0.20
            return (
                f"📊 **The 50/30/20 Budgeting Framework (Tailored to You)**:\n\n"
                f"Based on your tracked monthly income of **{self.fmt(inc)}**:\n\n"
                f"• **50% Needs ({self.fmt(needs)})**: Essential obligations (rent/mortgage, groceries, basic utilities, transport, minimum debt payments).\n"
                f"• **30% Wants ({self.fmt(wants)})**: Lifestyle choices (dining out, subscriptions, leisure, vacations, shopping).\n"
                f"• **20% Savings & Debt ({self.fmt(savings)})**: Emergency fund buildup, retirement investing, index funds, accelerated debt payoff.\n\n"
                f"💡 **Finora Audit**: Your actual expenses this month are **{self.fmt(self.expenses)}** "
                f"({(self.expenses/inc*100):.1f}% of income). "
                f"{'You are maintaining a healthy surplus!' if self.expenses < inc else '⚠️ Your expenses exceed income — consider reducing discretionary Wants by 15%.'}"
            )

        elif intent == "emergency_fund":
            three_months = self.expenses * 3 if self.expenses > 0 else 150000
            six_months = self.expenses * 6 if self.expenses > 0 else 300000
            return (
                f"🛡️ **Emergency Fund Strategy (Chartered Accountant Guide)**:\n\n"
                f"An emergency fund is your financial shield against layoffs, medical emergencies, or unforeseen repairs.\n\n"
                f"• **Recommended Baseline**: 3 to 6 months of essential living expenses.\n"
                f"• **Your Target**: Based on your current expenses ({self.fmt(self.expenses)}/mo):\n"
                f"   - Minimum (3 Months): **{self.fmt(three_months)}**\n"
                f"   - Optimal (6 Months): **{self.fmt(six_months)}**\n"
                f"• **Where to Keep It**: In a High-Yield Savings Account (HYSA) or liquid money market fund — NEVER in volatile stocks or locked illiquid deposits.\n"
                f"• **Action Plan**: Set up an automatic transfer on payday until you hit your 3-month milestone!"
            )

        elif intent == "compound_interest_fire":
            surplus = max(self.income - self.expenses, 10000)
            ten_yr_future = surplus * (((1 + 0.08/12)**(12*10) - 1) / (0.08/12))
            annual_exp = self.expenses * 12 if self.expenses > 0 else 600000
            fire_target = annual_exp * 25
            return (
                f"🔥 **Compound Interest & Financial Independence (FIRE)**:\n\n"
                f"1️⃣ **The Rule of 72**: Divide 72 by your annual return to find doubling time. At 8% average return, your money doubles every **9 years**.\n"
                f"2️⃣ **Your Wealth Compounding**: Investing your surplus of **{self.fmt(surplus)}/month** at 8% annual return yields:\n"
                f"   • In 5 Years: **{self.fmt(surplus * (((1 + 0.08/12)**(12*5) - 1) / (0.08/12)))}**\n"
                f"   • In 10 Years: **{self.fmt(ten_yr_future)}** (over double your contributions through compounding!)\n"
                f"3️⃣ **The 4% Safe Withdrawal Rule (FIRE)**:\n"
                f"   • Annual Lifestyle Cost: {self.fmt(annual_exp)}\n"
                f"   • Your FIRE Number (25x expenses): **{self.fmt(fire_target)}**\n"
                f"Once your invested portfolio hits {self.fmt(fire_target)}, you can safely withdraw 4% annually indefinitely without depleting capital!"
            )

        elif intent == "business_finance":
            return (
                "💼 **Business & Freelancer Financial Management**:\n\n"
                "1️⃣ **Separate Personal & Business**: Never mingle funds. Open a dedicated business account for all client receipts and business expenses.\n"
                "2️⃣ **The 30% Tax Reserve Rule**: Automatically transfer 25% to 30% of every client invoice into a separate tax holding account.\n"
                "3️⃣ **Cash Flow Runway**: Maintain 3 months of operating expenses in cash before taking distributions or owner drawings.\n"
                "4️⃣ **Invoice Terms**: Use Net-15 terms with automatic payment reminders, and offer 2% discount for payments within 7 days to accelerate cash flow.\n"
                "5️⃣ **Valid Deductions**: Keep receipts for software subscriptions, home office square footage, internet, phone bills, and equipment depreciation."
            )

        elif intent == "insurance_advice":
            annual_in = self.income * 12 if self.income > 0 else 1200000
            term_rec = annual_in * 10
            return (
                f"🛡️ **Insurance Architecture — Wealth Protection**:\n\n"
                f"1️⃣ **Term Life Insurance**: If anyone depends on your income, carry pure Term Life covering **10x to 12x annual income** (~{self.fmt(term_rec)}). Avoid costly whole life / endowment policies which have high fees and poor yields.\n"
                f"2️⃣ **Comprehensive Health Insurance**: Medical emergencies are the #1 cause of sudden bankruptcy. Ensure you have inpatient hospitalization coverage with an affordable deductible.\n"
                f"3️⃣ **Disability Protection**: Your greatest asset is your ability to earn. Long-term disability coverage replaces up to 60-70% of income if injured.\n"
                f"4️⃣ **Auto & Property**: Always maintain maximum liability limits to protect your personal net worth from civil claims."
            )

        elif intent == "general_advisory":
            return (
                f"🎩 **Finora Personal Chartered Accountant & Financial Advisor**:\n\n"
                f"Here is your real-time financial health audit:\n"
                f"• **Net Balance**: {self.fmt(self.balance)}\n"
                f"• **Monthly Income**: {self.fmt(self.income)} | **Expenses**: {self.fmt(self.expenses)}\n"
                f"• **Health Score**: **{self.health_score}/100**\n"
                f"• **Active Goals**: {len(self.active_goals)} active | {self.completed_goals} completed\n\n"
                f"**Advisor Recommendations**:\n"
                f"1. {'Maintain your budget constraints!' if self.expenses <= self.budget else '⚠️ Curb non-essential spending to bring expenses within budget.'}\n"
                f"2. Ensure you have at least 3 months of living expenses saved in an emergency reserve.\n"
                f"3. Direct surplus capital into diversified index funds and active goal targets.\n\n"
                f"Ask me about: **Taxes & Write-offs**, **50/30/20 Rule**, **FIRE Calculation**, **Debt Avalanche**, or **Accounting Principles**!"
            )

        elif intent == "debt_advice":
            surplus = self.income - self.expenses
            return (
                "💳 **Debt Elimination Blueprint (Chartered Accountant Analysis)**:\n\n"
                "1️⃣ **Debt Avalanche (Mathematically Optimal)**:\n"
                "   • Pay minimums on all obligations, then channel 100% of excess cash to the loan with the **highest Interest Rate (APR)**.\n"
                "   • Saves the absolute most money in total interest charges.\n\n"
                "2️⃣ **Debt Snowball (Behavioral Momentum)**:\n"
                "   • Pay off the **smallest balance first** regardless of rate.\n"
                "   • Gives psychological quick wins and reduces the count of open obligations.\n\n"
                f"3️⃣ **Your Capacity**: You currently have a monthly surplus of **{self.fmt(max(0, surplus))}**. "
                f"Allocating this surplus directly to principal reduction will cut payoff time by up to 50%!\n\n"
                "⚠️ **Rule of Thumb**: Never invest aggressively if you carry credit card debt with APR above 15% — paying off high APR debt is guaranteed return!"
            )

        elif intent == "tax_advice":
            return (
                "🏛️ **Tax Planning & Optimization (Chartered Accountant Advice)**:\n\n"
                "1️⃣ **Maximize Pre-Tax Contributions**: Contributing to retirement accounts (401k, Traditional IRA, or local provident funds) directly reduces taxable gross income.\n"
                "2️⃣ **Tax-Loss Harvesting**: Sell losing positions in taxable brokerage accounts before year-end to offset realized capital gains.\n"
                "3️⃣ **Long-Term vs Short-Term Capital Gains**: Hold investments for at least 12+ months to qualify for preferential long-term capital gains tax rates.\n"
                "4️⃣ **Deductible Business & Work Expenses**:\n"
                "   • Home office deduction (dedicated square footage)\n"
                "   • Equipment, software subscriptions, cell phone & internet % used for work\n"
                "   • Professional courses, books, and certifications\n"
                "5️⃣ **Documentation**: Keep electronic receipts for all deductible expenses for a minimum of 5 to 7 years in case of audit."
            )

        elif intent == "market_status":
            if not self.market_data:
                return "I'm currently unable to fetch live market charts. Check your internet connection."
            spy_price = self.market_data['spy_price']
            btc_price = self.market_data['btc_price']
            surplus = self.income - self.expenses
            adv = (
                f"Live Market Intel 📈:\n- S&P 500 (SPY) is trading at ~${spy_price:,.2f}.\n"
                f"- Bitcoin (BTC) is around ${btc_price:,.2f}.\n\n"
            )
            if surplus > 0:
                shares_spy = surplus / spy_price
                shares_btc = surplus / btc_price
                adv += (
                    f"With your current budget surplus of {self.fmt(surplus)}/month, you could afford to buy approximately "
                    f"{shares_spy:.2f} shares of SPY or {shares_btc:.5f} BTC each month! Dollar Cost Averaging helps "
                    "smooth volatility over time."
                )
            else:
                adv += "Your current monthly expenses are consuming your income, so purchasing these assets right now isn't recommended. Focus on building your savings first!"
            return adv

        elif intent == "crypto_advice":
            return (
                "Crypto (like Bitcoin/Ethereum) can be a high-growth, albeit highly volatile, component of a modern "
                "portfolio. We recommend capping high-risk alternative assets like crypto at a maximum of 5-10% of "
                "your total net worth to prevent extreme volatility from derailing your goals."
            )

        elif intent == "retirement_advice":
            return (
                "For retirement, taking advantage of employer matches in a 401k is basically free money! Aim to invest "
                "at least 15% of your gross income towards retirement across vehicles like a Roth IRA (tax-free growth) "
                "or Traditional 401k. The power of compounding makes starting early your biggest advantage."
            )

        elif intent == "real_estate":
            return (
                "Real estate is a fantastic tangible asset for building equity and generating rental cash flow. Before "
                "purchasing a property, ensure you have a dedicated 20% down payment saved in a high-yield account, and "
                "a 3-6 month emergency fund intact. Be aware of hidden costs like property taxes and maintenance!"
            )

        return "I'm still learning! Ask me about your 'budget', 'balance', 'goals', 'portfolio', or 'investing'."
