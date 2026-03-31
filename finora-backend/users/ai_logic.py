import random
import json
import torch
import os
import re

# We will load the model lazily when FinoraAI is instantiated to avoid circular imports
from .ml_model import FinoraNet

class FinoraAI:
    _model = None
    _meta = None
    
    @classmethod
    def load_model(cls):
        if cls._model is not None and cls._meta is not None:
            return
            
        model_path = os.path.join(os.path.dirname(__file__), "bot_model.pth")
        meta_path = os.path.join(os.path.dirname(__file__), "bot_meta.json")
        
        if not os.path.exists(model_path) or not os.path.exists(meta_path):
            # Fallback if model isn't trained yet
            return
            
        with open(meta_path, 'r') as f:
            cls._meta = json.load(f)
            
        input_size = cls._meta['input_size']
        hidden_size = cls._meta['hidden_size']
        output_size = cls._meta['output_size']
        
        # Determine device
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

    def generate_daily_suggestion(self):
        """Generates a contextual piece of advice for the dashboard."""
        
        # Scenario 1: No budget set
        if self.budget <= 0:
            return "You haven't set a Monthly Budget yet! Setting one is the first step towards financial freedom."
            
        percentage_spent = (self.expenses / self.budget) * 100 if self.budget > 0 else 0
        remaining = self.budget - self.expenses
        
        # Scenario 2: Over budget or critically close
        if percentage_spent >= 100:
            return f"Caution: You've exceeded your monthly budget of ${self.budget:,.2f}. Try to minimize non-essential spending for the rest of the month."
        elif percentage_spent >= 85:
            return f"You're at {percentage_spent:.0f}% of your monthly budget. You have ${remaining:,.2f} left to spend carefully."
            
        # Scenario 3: No goals
        if self.goals_count == 0:
            return "You have no active savings goals! Setting a tangible goal can accelerate your wealth building."
            
        # Scenario 4: Good standing
        if self.income > 0 and self.expenses < (self.income * 0.5):
            return "Fantastic! Your expenses are less than 50% of your income this month. You have a great opportunity to invest the surplus."
            
        advices = [
            f"You have ${remaining:,.2f} left in your budget to keep your finances on track.",
            "Remember to track every expense immediately to maintain an accurate view of your wealth.",
            "Building wealth is a marathon, not a sprint. Keep sticking to your budget!",
            "Review your recent transactions at the end of every week to catch any unnecessary subscriptions."
        ]
        return random.choice(advices)

    def process_chat_message(self, message: str) -> str:
        """Uses the trained PyTorch Deep Learning Model to classify intent and respond."""
        
        if FinoraAI._model is None or FinoraAI._meta is None:
            return "My AI Model is currently disconnected or still training! Please try again later."
            
        # 1. Tokenize input
        tokens = [t for t in re.split(r'\W+', message.lower()) if t]
        all_words = FinoraAI._meta['all_words']
        tags = FinoraAI._meta['tags']
        
        # 2. Bag of Words array
        bag = torch.zeros(len(all_words), dtype=torch.float32)
        for idx, w in enumerate(all_words):
            if w in tokens:
                bag[idx] = 1.0
                
        # 3. Model Inference mapping semantic bag to hidden logic layers
        bag = bag.unsqueeze(0) # Add batch dimension
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        bag = bag.to(device)
        
        with torch.no_grad():
            output = FinoraAI._model(bag)
            
        probabilities = torch.softmax(output, dim=1)
        prob, predicted_idx = torch.max(probabilities, dim=1)
        
        intent = tags[predicted_idx.item()]
        confidence = prob.item()
        
        if confidence < 0.25 or intent == "unknown":
            return "I couldn't quite understand that. Could you rephrase your question about your budget, balance, savings, or investing?"
            
        # 4. Generate Data-Driven Response based on neural classification
        return self._generate_response(intent)
        
    def _generate_response(self, intent):
        if intent == "greeting":
            return f"Hello, {self.user.username}! I am the Finora AI Neural Coach. How can I help you mathematically optimize your wealth today?"
            
        elif intent == "check_budget":
            if self.budget <= 0:
                return "You haven't set a budget yet! Head to your Profile to configure a monthly limit so I can analyze it."
            remaining = self.budget - self.expenses
            pct = (self.expenses / self.budget) * 100
            if remaining < 0:
                return f"Warning: You are over budget by ${abs(remaining):,.2f}! Stop spending on non-essentials immediately to recover."
            return f"You currently have ${remaining:,.2f} remaining in your regular budget. You've burnt through {pct:.1f}% of it so far."
            
        elif intent == "check_balance":
            return f"According to your logged transactions, your total net balance currently stands at ${self.balance:,.2f}."
            
        elif intent == "check_spending":
            return f"You've tracked ${self.expenses:,.2f} in overall expenses this month. Check your Analytics tab to see your exact category breakdown!"
            
        elif intent == "check_goals":
            if self.goals_count == 0:
                return "You are currently tracking 0 financial goals. A proven way to build wealth is to set a target for an Emergency Fund right now."
            return f"You are pursuing {self.goals_count} financial goals and have successfully completed {self.completed_goals} of them! Keep saving your surplus budget to crush the rest."
            
        elif intent == "investing_advice":
            return "Based on compound interest models, investing is critical for wealth generation. Ensure you have a 3-month emergency fund first. Then, prioritize maxing out employer match retirement accounts (like a 401k), followed by broad market, low-cost index funds or ETFs."
            
        elif intent == "debt_advice":
            return "High-interest debt destroys wealth. Focus on the 'Avalanche Method' (paying off the highest interest rate first) to mathematically save the most money. Conversely, the 'Snowball Method' (paying the smallest balance first) builds psychological momentum."
            
        return "I'm still learning! Ask me about your 'budget', 'balance', 'goals', or ask for general advice on 'investing'."
