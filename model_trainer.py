import os
import re
import string
import json
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

print("Starting model training pipeline...")

# Ensure models directory exists
os.makedirs("models", exist_ok=True)

# 1. Detect and load dataset
dataset_path = "news 1.csv"
if not os.path.exists(dataset_path):
    dataset_path = "news.csv"
    if not os.path.exists(dataset_path):
        raise FileNotFoundError("Neither 'news 1.csv' nor 'news.csv' was found in the workspace.")

print(f"Loading dataset from: {dataset_path}")
df = pd.read_csv(dataset_path)
print(f"Dataset loaded successfully. Shape: {df.shape}")

# 2. Text cleaning function
def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    # Remove bracketed text (e.g. [Reuters])
    text = re.sub(r'\[.*?\]', '', text)
    # Remove URLs
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    # Remove HTML tags
    text = re.sub(r'<.*?>+', '', text)
    # Remove punctuation
    text = re.sub(r'[%s]' % re.escape(string.punctuation), '', text)
    # Remove newlines
    text = re.sub(r'\n', ' ', text)
    # Remove words containing digits
    text = re.sub(r'\w*\d\w*', '', text)
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Combine title and text if title is available, otherwise use text only
print("Preprocessing and cleaning text...")
if 'title' in df.columns:
    df['combined_text'] = df['title'].fillna("") + " " + df['text'].fillna("")
else:
    df['combined_text'] = df['text'].fillna("")

df['clean_combined'] = df['combined_text'].apply(clean_text)

# Normalize labels
# Handle numeric labels (0 -> FAKE, 1 -> REAL) or string labels
def normalize_label(label):
    if isinstance(label, (int, np.integer)):
        return "REAL" if label == 1 else "FAKE"
    label_str = str(label).strip().upper()
    if label_str in ['1', 'REAL', 'TRUE', 'FACTUAL']:
        return "REAL"
    return "FAKE"

df['normalized_label'] = df['label'].apply(normalize_label)
labels = df['normalized_label']

print("Label distribution after normalization:")
print(labels.value_counts())

# 3. Train-test split
x_train, x_test, y_train, y_test = train_test_split(
    df['clean_combined'], labels, test_size=0.2, random_state=42, stratify=labels
)
print(f"Data split: {len(x_train)} train samples, {len(x_test)} test samples.")

# 4. TF-IDF Vectorization
print("Fitting TF-IDF Vectorizer...")
# We use bi-grams (ngram_range=(1,2)) to capture phrases, limited to 10,000 features
vectorizer = TfidfVectorizer(stop_words='english', max_df=0.7, ngram_range=(1, 2), max_features=10000)
tf_train = vectorizer.fit_transform(x_train)
tf_test = vectorizer.transform(x_test)

# 5. Train LinearSVC model
print("Training LinearSVC model...")
model = LinearSVC(C=1.0, random_state=42, max_iter=2000)
model.fit(tf_train, y_train)

# Evaluate model
y_pred = model.predict(tf_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"\n=================== Training Complete ===================")
print(f"Model Accuracy on Test Set: {accuracy * 100:.2f}%")
print("\nClassification Report:")
print(classification_report(y_test, y_pred))
print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred, labels=['FAKE', 'REAL']))

# 6. Save serialized objects
print("\nSaving model objects...")
with open("models/model.pkl", "wb") as f:
    pickle.dump(model, f)
with open("models/vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

# 7. Extract and save feature coefficients for Explainable AI (XAI)
# Class 0: 'FAKE', Class 1: 'REAL' (alphabetical sorting of target labels in sklearn)
feature_names = vectorizer.get_feature_names_out()
coefficients = model.coef_[0]

# Create word -> coefficient mapping
word_coef_map = {}
for word, coef in zip(feature_names, coefficients):
    word_coef_map[word] = float(coef)

# Save the coefficient map as JSON for fast backend lookup
with open("models/feature_coefficients.json", "w") as f:
    json.dump(word_coef_map, f, indent=2)

print("Feature coefficients JSON saved successfully!")
print("Model pipeline files created: models/model.pkl, models/vectorizer.pkl, models/feature_coefficients.json")
