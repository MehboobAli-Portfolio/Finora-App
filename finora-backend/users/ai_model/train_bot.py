import json
import re
import os
import sys

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

# Ensure models can be imported when running as a standalone script
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from users.ai_model.ml_model import FinoraNet
from users.ai_model.intent_corpus import FINORA_INTENTS

intents = FINORA_INTENTS


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

X_train = torch.tensor(np.asarray(X_train, dtype=np.float32))
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
hidden_size = 64
output_size = len(tags)
input_size = len(all_words)
learning_rate = 0.002
num_epochs = 250

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

        outputs = model(words)
        loss = criterion(outputs, labels)

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

    if (epoch + 1) % 100 == 0:
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
    "tags": tags,
}
with open(meta_path, 'w') as f:
    json.dump(meta, f)

print(f'Neural Network compiled and saved to {model_path}')
print('Finora Deep Learning Bot is now READY for production inference!')
