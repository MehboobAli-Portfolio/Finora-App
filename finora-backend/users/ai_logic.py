import random
import json
import torch
import os
import re
import yfinance as yf

# We will load the model lazily when FinoraAI is instantiated to avoid circular imports
from .ai_model.ml_model import FinoraNet

def get_market_data():
    try:
        spy = yf.Ticker("SPY").fast_info
        btc = yf.Ticker("BTC-USD").fast_info
        qqq = yf.Ticker("QQQ").fast_info
        gold = yf.Ticker("GC=F").fast_info
        return {
            "spy_price": spy.last_price,
            "btc_price": btc.last_price,
            "qqq_price": qqq.last_price,
            "gold_price": gold.last_price
        }
    except Exception:
        return None

class FinoraAI:
    _model = None
    _meta = None
    
    @classmethod
    def load_model(cls):
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
        
    def __init__(self, user, balance, income, expenses, budget, goals_count, completed_goals, recent_transactions, active_goals=None):
        FinoraAI.load_model()
        
        self.user = user
        self.balance = float(balance)
        self.income = float(income)
        self.expenses = float(expenses)
        self.budget = float(budget)
        self.goals_count = goals_count
        self.completed_goals = completed_goals
        self.txs = recent_transactions
        self.active_goals = active_goals or []
        self.market_data = get_market_data()
        
        # Calculate Finora Health Score (0-100)
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

    def generate_daily_suggestion(self):
        """Generates 1 hyper-focused contextual idea for the dashboard based deeply on health score."""
        surplus = self.income - self.expenses
        
        if self.health_score < 40:
            if self.budget <= 0:
                return f"Health Score: {self.health_score}/100. Critical Action: You haven't set a Monthly Budget. Establishing one is mathematically proven to be the fastest way to get your finances on track."
            if self.expenses > self.budget:
                over = self.expenses - self.budget
                return f"Health Score: {self.health_score}/100. Critical Alert: You are over budget by ${over:,.2f}. Avoid non-essential spending for the remainder of the month."
            if surplus <= 0:
                return f"Health Score: {self.health_score}/100. Savings Alert: Your expenses are currently consuming your entire income (${self.income:,.2f}). Try to reduce discretionary spending by 15% this week."
                
        elif self.health_score < 75:
            if self.active_goals and surplus > 0:
                goal = self.active_goals[0]
                dist = float(goal.target_amount - goal.current_amount)
                months = dist / surplus
                return f"Health Score: {self.health_score}/100. Track Forecast: With your current surplus of ${surplus:,.2f}/month, if you focus entirely on your '{goal.title}' goal, you will complete it in just {months:.1f} months!"
            return f"Health Score: {self.health_score}/100. Doing well: You have a surplus of ${surplus:,.2f}. Consider opening a savings goal to direct this cash effectively, like an Emergency Fund."
            
        else:
            if self.active_goals and surplus > 0:
                return f"Health Score: {self.health_score}/100. Excellent momentum! You have ${surplus:,.2f}/mo extra cash. If you divide this equally among your {len(self.active_goals)} active goals, they will grow on autopilot."
            elif self.market_data and surplus > 0:
                spy_price = self.market_data.get('spy_price', 500)
                return f"Health Score: {self.health_score}/100. Wealth Building: With a massive surplus of ${surplus:,.2f}/mo, consider dollar-cost averaging into an index fund like SPY (currently ${spy_price:,.2f}) to drastically accelerate compound growth over the next 5 years."
            return f"Health Score: {self.health_score}/100. Financial Independence unlocked! Keep optimizing your strategy."

    def _extract_ticker(self, message):
        # Allow explicit $TICKER search
        match = re.search(r'\$([A-Za-z]{1,5})\b', message)
        if match: return match.group(1).upper()
        
        # Auto-detect common names
        name_map = {
            "apple": "AAPL", "tesla": "TSLA", "microsoft": "MSFT", "google": "GOOG",
            "amazon": "AMZN", "meta": "META", "nvidia": "NVDA", "netflix": "NFLX",
            "ethereum": "ETH-USD", "dogecoin": "DOGE-USD", "solana": "SOL-USD",
            "gold": "GC=F", "silver": "SI=F"
        }
        words = message.lower().split()
        for word in words:
            if word in name_map:
                return name_map[word]
                
        # Detect ALL CAPS words (likely tickers)
        matches = re.findall(r'\b[A-Z]{2,5}\b', message)
        if matches:
            return matches[0]
        return None

    def process_chat_message(self, message: str) -> str:
        """Uses the trained PyTorch Deep Learning Model to classify intent and respond."""
        
        # Dynamic Market Lookup Hook
        ticker = self._extract_ticker(message)
        if ticker:
            try:
                info = yf.Ticker(ticker).fast_info
                price = info.last_price
                prev_close = info.previous_close
                change = ((price - prev_close) / prev_close) * 100
                direction = "📈 Up" if change >= 0 else "📉 Down"
                return f"Live Market Data Explorer 🌐:\n{ticker} is {direction} and currently trading at ~${price:,.2f} ({change:+.2f}% today).\n\nIf you believe in the long-term fundamentals of {ticker}, maintaining a balanced portfolio approach and using Dollar Cost Averaging with your available surplus can be highly effective. How else can I help?"
            except Exception:
                pass # If ticker fetch fails, continue to intent parser
                
        if FinoraAI._model is None or FinoraAI._meta is None:
            return "My AI Model is currently disconnected or still training! Please try again later."
            
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
        prob, predicted_idx = torch.max(probabilities, dim=1)
        
        intent = tags[predicted_idx.item()]
        confidence = prob.item()
        
        if confidence < 0.20 or intent == "unknown":
            intent = self._fallback_keyword_matcher(message.lower())

        if intent == "unknown":
            return "Could you rephrase that? I'm highly trained to discuss your budget, goals, current balance, spending habits, and live market trends!"
            
        return self._generate_response(intent)

    def _fallback_keyword_matcher(self, text):
        if any(w in text for w in ["market", "spy", "stock", "crypto", "bitcoin"]): return "market_status"
        if any(w in text for w in ["limit", "budget", "spend"]): return "check_budget"
        if any(w in text for w in ["save", "reduce"]): return "improve_savings"
        return "unknown"
        
    def _generate_response(self, intent):
        if intent == "greeting":
            return f"Hello, {self.user.username}! I am the Finora AI Neural Coach. Ask me to deeply analyze your budget or fetch live market trends."
        
        elif intent == "check_budget":
            score_msg = f"Your Finora Health Score is currently {self.health_score}/100. "
            if self.budget <= 0: return score_msg + "You haven't set a budget yet! Head to your Profile to configure a monthly limit."
            remaining = self.budget - self.expenses
            pct = (self.expenses / self.budget) * 100
            if remaining < 0: return score_msg + f"\n⚠️ Alert: You are over budget by ${abs(remaining):,.2f}! It's completely normal to slip up, but to get back on track, try to pause non-essential spending for the rest of the month."
            return score_msg + f"\nYou currently have ${remaining:,.2f} remaining in your regular budget. You've used {pct:.1f}% of it so far. Keep up the balanced habits!"
            
        elif intent == "check_balance":
            return f"According to your logged transactions, your total net balance currently stands at ${self.balance:,.2f}."
            
        elif intent == "check_spending":
            msg = f"You've tracked ${self.expenses:,.2f} in overall expenses this month. "
            if self.budget > 0 and self.expenses > self.budget:
                msg += "\n\n⚠️ HIGH ALERT: You have exceeded your monthly budget constraint! It's okay, but let's be mindful and stop non-essential spending for now."
            return msg + " Check your Analytics tab to see your exact category breakdown!"
            
        elif intent == "check_goals":
            surplus = self.income - self.expenses
            base_msg = f"You are actively pursuing {len(self.active_goals)} financial goal(s) and have successfully completed {self.completed_goals} milestone(s)!\n\n"
            
            if len(self.active_goals) == 0:
                return base_msg + "A balanced approach to wealth starts with setting a specific target, like an Emergency Fund right now."

            if surplus > 0:
                base_msg += f"With your current monthly surplus of ${surplus:,.2f}, here are your live forecasts if you allocate your extra cash optimally:\n\n"
                split_surplus = surplus / len(self.active_goals)
                for g in self.active_goals:
                    rem = float(g.target_amount - g.current_amount)
                    if rem <= 0: continue
                    months = rem / split_surplus
                    base_msg += f"🎯 **{g.title}**: Remaining ${rem:,.2f}. By directing your equal share (${split_surplus:,.2f}/mo) toward this, you'll reach it in **{months:.1f} months**!\n"
            else:
                base_msg += f"Currently, your expenses are limiting your ability to save. Let's look at your remaining targets:\n\n"
                for g in self.active_goals:
                    rem = float(g.target_amount - g.current_amount)
                    base_msg += f"- {g.title}: ${rem:,.2f} left.\n"
                base_msg += "\nTry to cut back your discretionary spending this week to unlock savings momentum."
                
            return base_msg
            
        elif intent == "investing_advice":
            surplus = self.income - self.expenses
            detailed_advise = f"To reach your goals efficiently, we want a balanced approach: managing risk while investing your surplus for steady growth. Your Finora Score is {self.health_score}/100.\n\n"
            if surplus > 0:
                sp500_annual_return = 0.08
                five_year_inv = (surplus) * (((1 + sp500_annual_return/12)**(12*5) - 1) / (sp500_annual_return/12))
                
                detailed_advise += "Balanced Portfolio Recommendation Engine 📊:\n"
                detailed_advise += "1️⃣ 70% Core (S&P 500 / SPY): Safe, long-term steady growth.\n"
                detailed_advise += "2️⃣ 15% Tech (QQQ): Aggressive growth via top tech giants.\n"
                detailed_advise += "3️⃣ 10% Protection (Gold / GC=F): A proven hedge against inflation.\n"
                detailed_advise += "4️⃣ 5% High Risk (Bitcoin / BTC): Optional allocation for potential exponential upside.\n\n"
                
                detailed_advise += f"💡 Projection: If you invest your ${surplus:,.2f}/month surplus consistently, an ~8% historical return could yield approximately **${five_year_inv:,.2f}** in 5 years! Stay balanced and consistent."
            else:
                detailed_advise += f"Investing is powerful, but right now, your monthly expenses (${self.expenses:,.2f}) completely consume your income. A balanced approach means eliminating high-interest debt and building a small cash safety net first. Try cutting back discretionary spending to create a cash surplus, then you can confidently start investing!"
            return detailed_advise
            
        elif intent == "debt_advice":
            return "High-interest debt destroys wealth. Focus on the 'Avalanche Method' (paying off the highest interest rate first) to mathematically save the most money."
            
        elif intent == "market_status":
            if not self.market_data: return "I'm currently unable to fetch live market charts. Check your internet connection."
            spy_price = self.market_data['spy_price']
            btc_price = self.market_data['btc_price']
            surplus = self.income - self.expenses
            adv = f"Live Market Intel 📈:\n- S&P 500 (SPY) is trading at ~${spy_price:,.2f}.\n- Bitcoin (BTC) is around ${btc_price:,.2f}.\n\n"
            if surplus > 0:
                shares_spy = surplus / spy_price
                shares_btc = surplus / btc_price
                adv += f"With your current budget surplus of ${surplus:,.2f}/month, you could afford to buy approximately {shares_spy:.2f} shares of SPY or {shares_btc:.5f} BTC each month! Buying consistently regardless of price (Dollar Cost Averaging) is the best way to hit your wealth goals over time."
            else:
                adv += "Your current monthly expenses are consuming your income, so purchasing these assets right now isn't recommended. Focus on building your savings first!"
            return adv
            
        elif intent == "improve_savings":
            return "To save more immediately: 1. Cancel unused subscriptions. 2. Pre-allocate 20% of your income to savings the second you get paid. 3. Cook meals at home to drastically lower food expenses."
            
        elif intent == "tax_advice":
            return "Tax efficiency is key to wealth. Maximize pre-tax contributions to 401ks or Traditional IRAs to lower your taxable income. For taxable accounts, hold investments for over a year to benefit from lower Long-Term Capital Gains rates. Consider tax-loss harvesting to offset gains!"
            
        elif intent == "crypto_advice":
            return "Crypto (like Bitcoin/Ethereum) can be a high-growth, albeit highly volatile, component of a modern portfolio. We recommend capping high-risk alternative assets like crypto at a maximum of 5-10% of your total net worth to prevent extreme volatility from derailing your goals."
            
        elif intent == "retirement_advice":
            return "For retirement, taking advantage of employer matches in a 401k is basically free money! Aim to invest at least 15% of your gross income towards retirement across vehicles like a Roth IRA (tax-free growth) or Traditional 401k. The power of compounding makes starting early your biggest advantage."
            
        elif intent == "real_estate":
            return "Real estate is a fantastic tangible asset for building equity and generating rental cash flow. Before purchasing a property, ensure you have a dedicated 20% down payment saved in a high-yield account, and a 3-6 month emergency fund intact. Be aware of hidden costs like property taxes and maintenance!"
            
        return "I'm still learning! Ask me about your 'budget', 'balance', 'goals', or ask for general advice on 'investing'."
