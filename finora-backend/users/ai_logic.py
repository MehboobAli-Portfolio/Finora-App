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
        
    def __init__(self, user, balance, income, expenses, budget, goals_count, completed_goals, recent_transactions):
        FinoraAI.load_model()
        
        self.user = user
        self.balance = float(balance)
        self.income = float(income)
        self.expenses = float(expenses)
        self.budget = float(budget)
        self.goals_count = goals_count
        self.completed_goals = completed_goals
        self.txs = recent_transactions
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
        """Generates 3 contextual ideas for the dashboard as a multi-line bulleted string."""
        ideas = []
        
        # Idea 1: Spending & Budget
        if self.budget <= 0:
            ideas.append("Set a Budget: You haven't set a Monthly Budget yet. Setting one is the first step towards financial freedom.")
        else:
            percentage_spent = (self.expenses / self.budget) * 100
            remaining = self.budget - self.expenses
            if percentage_spent >= 100:
                ideas.append(f"Budget Alert: You've exceeded your monthly limit by ${abs(remaining):,.2f}. Avoid non-essential spending.")
            elif percentage_spent >= 80:
                ideas.append(f"Spend Carefully: You have ${remaining:,.2f} left. You've burned through {percentage_spent:.0f}% of your budget.")
            else:
                ideas.append(f"Great job: You have ${remaining:,.2f} left in your budget. Keep maintaining this healthy rate.")

        # Idea 2: Goals & Savings
        if self.goals_count == 0:
            ideas.append("Create a Goal: You have 0 active savings goals. Aim for a 3-month emergency fund.")
        elif self.completed_goals == self.goals_count:
            ideas.append(f"Amazing: You accomplished all {self.goals_count} of your goals! Set a new aspirational milestone.")
        else:
            ideas.append(f"Stay Focused: You are currently pursuing {self.goals_count} goals. Allocate surplus income to them immediately.")

        # Idea 3: Market/Investments
        surplus = self.income - self.expenses
        if self.market_data and surplus > 0:
            spy_price = self.market_data.get('spy_price', 500)
            btc_price = self.market_data.get('btc_price', 60000)
            potential_spy = surplus / spy_price
            ideas.append(f"Investing Opportunity: You have a monthly surplus of ${surplus:,.2f}! If you invest this consistently in the S&P 500 (currently ${spy_price:,.2f}), you could buy ~{potential_spy:.2f} shares a month. Historically, an 8% annual return on this surplus could drastically accelerate your financial goals compared to leaving it in a savings account. Alternatively, allocating a small percentage to crypto (Bitcoin is ~${btc_price:,.2f}) could offer high-growth potential.")
        elif surplus <= 0 and self.income > 0:
            ideas.append("Savings Alert: Your expenses are currently consuming your entire income! To reach long-term goals or buy assets like stocks and crypto, you must create a surplus. Try to reduce your discretionary spending by 15% this week.")
        else:
            ideas.append("Build Wealth: Compound interest accelerates wealth. Review your weekly transaction logs to eliminate shadow subscriptions.")

        return "\n\n".join(ideas)

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
            base_msg = f"You are pursuing {self.goals_count} financial goals and have successfully completed {self.completed_goals} of them! "
            if self.goals_count == 0: return "You are currently tracking 0 financial goals. A balanced approach to wealth starts with setting a target for an Emergency Fund right now."
            if surplus > 0:
                base_msg += f"\n\nAt your current surplus of ${surplus:,.2f}/mo, you have fantastic momentum to crush the rest of your targets! Every dollar saved accelerates your timeline."
            else:
                base_msg += f"\n\nRight now, your expenses are limiting your ability to save. Try to identify one discretionary area to cut back on this week to help you hit your next goal."
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
            
        return "I'm still learning! Ask me about your 'budget', 'balance', 'goals', or ask for general advice on 'investing'."
