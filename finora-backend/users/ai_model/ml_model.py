import torch
import torch.nn as nn

class FinoraNet(nn.Module):
    """
    A Deep Learning Feed-Forward Neural Network to classify User Financial intents.
    It takes a Bag-of-Words array corresponding to the user's sentence and 
    maps it mathematically to the correct financial feature vector.
    """
    def __init__(self, input_size, hidden_size, num_classes):
        super(FinoraNet, self).__init__()
        self.l1 = nn.Linear(input_size, hidden_size) 
        self.l2 = nn.Linear(hidden_size, hidden_size) 
        self.l3 = nn.Linear(hidden_size, hidden_size)
        self.l4 = nn.Linear(hidden_size, num_classes)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
    
    def forward(self, x):
        out = self.l1(x)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.l2(out)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.l3(out)
        out = self.relu(out)
        out = self.dropout(out)
        out = self.l4(out)
        # CrossEntropyLoss applies Softmax automatically internally
        return out
