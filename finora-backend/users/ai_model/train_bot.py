import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import re
import os
import sys

# Ensure models can be imported when running as a standalone script
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from users.ai_model.ml_model import FinoraNet

# Define financial intents manually for Finora
intents = {
    "greeting": [
        "hello", "hi", "hey", "good morning", "good evening", "what is up", "help me",
        "hey bot", "hello finora", "yo", "greetings", "howdy", "can you help me",
        "i need assistance", "are you there", "hi there", "hello ai", "what's up"
    ],
    "check_budget": [
        "what is my budget", "how much budget do I have left", "budget status", "am I broke", 
        "how much can I spend", "spend limit", "can I afford this", "whats left in my budget", 
        "show me my budget", "do i have budget left", "monthly budget", "did i overspend",
        "budget limit", "what is my spending limit", "tell me my budget"
    ],
    "check_balance": [
        "what is my balance", "show my money", "how much cash do I have", "account balance", 
        "my net worth", "total balance", "how rich am i", "how much do i have in total",
        "current balance", "show me my net worth", "total remaining money", "my checking balance"
    ],
    "check_spending": [
        "how much have I spent", "what are my expenses", "show my spending", "where did my money go", 
        "expenses this month", "total spent this month", "how much did I spend", "my expenditure",
        "show me expenses", "recent expenses", "spending summary", "spent so far"
    ],
    "check_goals": [
        "what are my goals", "show my financial goals", "how far along am I", "target savings", 
        "goal progress", "did i reach my goals", "how are my goals doing", "savings goals",
        "my active goals", "update on goals", "list my goals"
    ],
    "investing_advice": [
        "how to invest", "give me investing advice", "stocks", "bonds", "what should I invest in", 
        "grow my money", "passive income", "how to buy stocks", "best investments",
        "index funds", "etf", "investing strategies", "how to build wealth", "start investing"
    ],
    "debt_advice": [
        "how to pay off debt", "debt snowball", "credit card debt", "loans", "avalanche method", 
        "getting out of debt", "eliminate debt", "pay down loans", "reduce my debt", 
        "student loans", "how to get debt free"
    ],
    "market_status": [
        "how is the stock market", "what are the stocks doing", "market update", "live market",
        "is the market up", "spy price", "apple stock", "bitcoin price", "live stock data",
        "current market trends", "what's green today", "is the market crashing"
    ],
    "improve_savings": [
        "how do i save more", "i have no money", "teach me how to save", "i want to stop spending",
        "reduce my expenses", "how to budget better", "frugal tips", "savings tips",
        "how to build an emergency fund", "ways to cut back", "save money"
    ],
    "unknown": ["asdfgh", "qwerty", "this makes no sense", "afjaslfkj", "unknown word"]
}

def tokenize(sentence):
    """Simple regex tokenizer to avoid nltk dependency downloading."""
    tokens = re.split(r'\W+', sentence.lower())
    return [t for t in tokens if t]

def bag_of_words(tokenized_sentence, all_words):
    """Generate a mathematical array (1s and 0s) mapping words to the vocabulary."""
    bag = torch.zeros(len(all_words), dtype=torch.float32)
    for idx, w in enumerate(all_words):
        if w in tokenized_sentence:
            bag[idx] = 1.0
    return bag

# 1. Prepare Data
all_words = []
tags = []
xy = []

for tag, patterns in intents.items():
    tags.append(tag)
    for pattern in patterns:
        tokens = tokenize(pattern)
        all_words.extend(tokens)
        xy.append((tokens, tag))

# Remove duplicates and sort
ignore_words = ['?', '!', '.', ',']
all_words = sorted(list(set([w for w in all_words if w not in ignore_words])))
tags = sorted(tags)

X_train = []
y_train = []

for (pattern_sentence, tag) in xy:
    bag = bag_of_words(pattern_sentence, all_words)
    X_train.append(bag.numpy())
    
    label = tags.index(tag)
    y_train.append(label)

X_train = torch.tensor(X_train, dtype=torch.float32)
y_train = torch.tensor(y_train, dtype=torch.long)

class ChatDataset(Dataset):
    def __init__(self):
        self.n_samples = len(X_train)
        self.x_data = X_train
        self.y_data = y_train

    def __getitem__(self, index):
        return self.x_data[index], self.y_data[index]

    def __len__(self):
        return self.n_samples

# 2. Hyperparameters
batch_size = 8
hidden_size = 16
output_size = len(tags)
input_size = len(all_words)
learning_rate = 0.005
num_epochs = 1500

dataset = ChatDataset()
train_loader = DataLoader(dataset=dataset, batch_size=batch_size, shuffle=True)

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
model = FinoraNet(input_size, hidden_size, output_size).to(device)

criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)

# 3. Training Loop
print(f"Deploying Neural Network on {device}...")
print(f"Vocabulary Size: {input_size} | Intent Classes: {output_size}")

for epoch in range(num_epochs):
    for (words, labels) in train_loader:
        words = words.to(device)
        labels = labels.to(device)

        # Forward
        outputs = model(words)
        loss = criterion(outputs, labels)

        # Backward and optimize
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    if (epoch+1) % 300 == 0:
        print(f'Epoch [{epoch+1}/{num_epochs}], Loss: {loss.item():.4f}')

print(f'Training Initialization Complete. Final Loss: {loss.item():.4f}')

# 4. Save Model & Meta Data
model_path = os.path.join(os.path.dirname(__file__), "bot_model.pth")
meta_path = os.path.join(os.path.dirname(__file__), "bot_meta.json")

torch.save(model.state_dict(), model_path)

meta = {
    "input_size": input_size,
    "hidden_size": hidden_size,
    "output_size": output_size,
    "all_words": all_words,
    "tags": tags
}
with open(meta_path, 'w') as f:
    json.dump(meta, f)

print(f'Neural Network compiled and saved to {model_path}')
print('Finora Deep Learning Bot is now READY for production inference!')
