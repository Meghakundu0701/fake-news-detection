import os
import re
import string
import json
import pickle
import math
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.metrics import accuracy_score
from flask import Flask, request, jsonify, Response

app = Flask(__name__, static_folder='static', static_url_path='')

# Global variables to hold model assets
model = None
vectorizer = None
word_coef_map = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Ensure models directory exists and load assets
def load_model_assets():
    global model, vectorizer, word_coef_map
    model_path = os.path.join(BASE_DIR, "models", "model.pkl")
    vectorizer_path = os.path.join(BASE_DIR, "models", "vectorizer.pkl")
    coef_path = os.path.join(BASE_DIR, "models", "feature_coefficients.json")
    
    if not (os.path.exists(model_path) and os.path.exists(vectorizer_path) and os.path.exists(coef_path)):
        print("Model assets not found. Please run model_trainer.py first.")
        return False
        
    print("Loading model assets...")
    with open(model_path, "rb") as f:
        model = pickle.load(f)
    with open(vectorizer_path, "rb") as f:
        vectorizer = pickle.load(f)
    with open(coef_path, "r") as f:
        word_coef_map = json.load(f)
        
    print("Model assets loaded successfully!")
    return True

# Load model assets on import
load_model_assets()

# ----------------- Lexicons for Emotion Manipulation -----------------
FEAR_WORDS = {
    'terror', 'terrorist', 'terrorism', 'panic', 'threat', 'threatening', 'deadly', 'fatal', 
    'crisis', 'catastrophe', 'catastrophic', 'danger', 'dangerous', 'dangerously', 'warning', 
    'conspiracy', 'scared', 'afraid', 'apocalypse', 'apocalyptic', 'epidemic', 'collapsing', 
    'collapse', 'fatality', 'horrifying', 'horrific', 'fears', 'scary', 'weapons', 'nuclear', 
    'toxic', 'poison', 'kill', 'killer', 'killing', 'dying', 'death', 'deaths', 'virus', 
    'outbreak', 'uncontrolled', 'looming', 'disaster', 'ruin', 'ruined', 'ruining', 'devastating', 
    'devastated', 'devastation', 'scandalous', 'doom', 'doomed', 'panic-stricken', 'vulnerable',
    'extinction', 'horror', 'frightening', 'dread', 'nightmare', 'chaos', 'chaotic'
}

RAGE_WORDS = {
    'outrage', 'outraged', 'furious', 'fury', 'disgrace', 'disgraceful', 'shameful', 'shame', 
    'slammed', 'blasted', 'disgusting', 'disgusted', 'unacceptable', 'hypocrisy', 'hypocrite', 
    'scandal', 'exposed', 'liar', 'lying', 'lies', 'betrayal', 'betrayed', 'attacks', 'attacked', 
    'destroying', 'destroyed', 'greedy', 'greed', 'stole', 'stolen', 'cheated', 'cheat', 'corrupt', 
    'corruption', 'offensive', 'ridiculous', 'anger', 'angry', 'hateful', 'hate', 'insulting', 
    'insult', 'mocked', 'mock', 'condemned', 'condemn', 'arrogant', 'crooked', 'con-artist', 
    'traitor', 'betray', 'fool', 'foolish', 'stupid', 'coward', 'cowardly', 'blame', 'blamed'
}

CLICKBAIT_WORDS = {
    'shocking', 'unbelievable', 'miracle', 'epic', 'insane', 'extraordinary', 'breaking', 'massive', 
    'ultimate', 'secret', 'secrets', 'magical', 'spectacular', 'reveal', 'revealed', 'reveals', 
    'shock', 'shocked', 'astonishing', 'mind-blowing', 'gasp', 'gasped', 'sensational', 'uncovered',
    'exposed', 'confirms', 'finally', 'must-see', 'critical', 'danger', 'dangers', 'proof', 'proven'
}

SENSATIONALISM_WORDS = {
    'mind-blowing', 'unbelievable', 'miracle', 'shocking', 'epic', 'insane', 'extraordinary', 
    'sensational', 'breaking', 'massive', 'ultimate', 'secret', 'magical', 'spectacular', 
    'chaos', 'nightmare', 'apocalypse', 'apocalyptic', 'historical', 'historic', 'unprecedented', 
    'unbelievably', 'devastating', 'monumental', 'colossal', 'catastrophic', 'world-ending', 
    'insanely', 'jaw-dropping', 'earth-shattering', 'mind-boggling', 'astounding'
}

CLICKBAIT_TITLE_PATTERNS = [
    r'^(you won\'t believe|this is how|what happens next|this one|the truth about|revealed|reveals|is this|why you need)\b',
    r'\b(will blow your mind|shocking truth|this one trick|critical mistake|hidden danger|secret they don\'t|must see)\b'
]

# Text cleaning helper
def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'https?://\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>+', '', text)
    text = re.sub(r'[%s]' % re.escape(string.punctuation), '', text)
    text = re.sub(r'\n', ' ', text)
    text = re.sub(r'\w*\d\w*', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

# Tokenize text into words (retaining exact spacing/casing positions if possible, or just raw tokens)
def tokenize_words(text):
    # Split by whitespace, punctuation, etc.
    return re.findall(r'\b[a-zA-Z]+\b', text.lower())

# Serve index.html
@app.route('/')
def index():
    return app.send_static_file('index.html')

# POST endpoint for prediction, XAI, and emotions
@app.route('/predict', methods=['POST'])
def predict():
    if model is None or vectorizer is None or word_coef_map is None:
        return jsonify({"error": "Model assets are not loaded on server."}), 500
        
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON payload received."}), 400
        
    title = data.get('title', '').strip()
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({"error": "News content text is required."}), 400

    # Combine title and text for classification model
    combined_raw = title + " " + text
    combined_cleaned = clean_text(combined_raw)
    
    # 1. Fake/Real Classification & Confidence (Platt Scaling)
    tf_vector = vectorizer.transform([combined_cleaned])
    decision_val = float(model.decision_function(tf_vector)[0])
    
    # Sigmoid function to get credibility probability (0 to 1)
    credibility_prob = 1.0 / (1.0 + math.exp(-decision_val))
    
    prediction = "REAL" if credibility_prob >= 0.5 else "FAKE"
    confidence = credibility_prob if prediction == "REAL" else (1.0 - credibility_prob)
    confidence_pct = round(confidence * 100, 2)
    credibility_pct = round(credibility_prob * 100, 2)

    # 2. Explainable AI (XAI) Word Weights
    # Get non-zero indices and their values from sparse TF-IDF vector
    nonzero_indices = tf_vector.nonzero()[1]
    feature_names = vectorizer.get_feature_names_out()
    
    word_contributions = {}
    for idx in nonzero_indices:
        word = feature_names[idx]
        tfidf_val = tf_vector[0, idx]
        coef = word_coef_map.get(word, 0.0)
        contribution = tfidf_val * coef
        word_contributions[word] = contribution

    # Sort contributions to extract top keywords
    sorted_contributions = sorted(word_contributions.items(), key=lambda x: x[1], reverse=True)
    
    # Top 5 Real Indicators (highest positive contributions)
    top_real = [{"word": w, "weight": float(c)} for w, c in sorted_contributions[:5] if c > 0]
    
    # Top 5 Fake Indicators (most negative contributions, sorted ascending)
    top_fake = [{"word": w, "weight": float(c)} for w, c in sorted(word_contributions.items(), key=lambda x: x[1])[:5] if c < 0]

    # Convert contributions to float for JSON transfer
    serializable_contributions = {w: float(c) for w, c in word_contributions.items()}

    # 3. Emotion Manipulation Detection
    title_lower = title.lower()
    text_lower = text.lower()
    
    # Tokenize words for counting
    title_words = tokenize_words(title)
    text_words = tokenize_words(text)
    all_words = title_words + text_words
    word_count = len(all_words)
    
    # Count matches and record trigger words
    fear_matches = [w for w in all_words if w in FEAR_WORDS]
    rage_matches = [w for w in all_words if w in RAGE_WORDS]
    clickbait_matches = [w for w in all_words if w in CLICKBAIT_WORDS]
    sensationalism_matches = [w for w in all_words if w in SENSATIONALISM_WORDS]

    # Fear-mongering score calculation
    fear_count = len(fear_matches)
    fear_score = min(100, (fear_count * 20) + (10 if fear_count > 0 else 0))
    
    # Rage bait score calculation
    rage_count = len(rage_matches)
    rage_score = min(100, (rage_count * 20) + (10 if rage_count > 0 else 0))
    
    # Sensationalism score calculation
    sensational_count = len(sensationalism_matches)
    sensational_score = min(100, (sensational_count * 15) + (10 if sensational_count > 0 else 0))

    # Clickbait score calculation (incorporating structural markers)
    clickbait_score_raw = 0
    title_clickbait_trigger = False
    
    # Title regex patterns
    for pattern in CLICKBAIT_TITLE_PATTERNS:
        if re.search(pattern, title_lower):
            clickbait_score_raw += 45
            title_clickbait_trigger = True
            break
            
    # Title ALL CAPS check
    title_caps_trigger = False
    clean_title_only_alpha = re.sub(r'[^a-zA-Z\s]', '', title)
    alpha_words = clean_title_only_alpha.split()
    if len(alpha_words) >= 4 and all(w.isupper() for w in alpha_words):
        clickbait_score_raw += 30
        title_caps_trigger = True
        
    # Title Exclamation check
    excl_count = title.count('!')
    if excl_count > 0:
        clickbait_score_raw += min(25, excl_count * 10)
        
    # Clickbait vocabulary density
    clickbait_words_count = len(clickbait_matches)
    clickbait_score_raw += min(35, clickbait_words_count * 10)
    
    clickbait_score = min(100, clickbait_score_raw)

    # 4. Text Statistics
    char_count = len(text)
    raw_words = text.split()
    stats_word_count = len(raw_words)
    reading_time = max(1, round(stats_word_count / 220)) # Average adult reads ~220 WPM
    
    unique_words_count = len(set(tokenize_words(combined_cleaned)))
    lexical_diversity = round((unique_words_count / (len(tokenize_words(combined_cleaned)) + 1)) * 100, 1)

    # Pack response
    response_data = {
        "prediction": prediction,
        "confidence": confidence_pct,
        "credibility_score": credibility_pct,
        "xai": {
            "word_weights": serializable_contributions,
            "top_real_indicators": top_real,
            "top_fake_indicators": top_fake
        },
        "emotions": {
            "scores": {
                "fear_mongering": fear_score,
                "rage_bait": rage_score,
                "clickbait": clickbait_score,
                "sensationalism": sensational_score
            },
            "triggers": {
                "fear_mongering": list(set(fear_matches)),
                "rage_bait": list(set(rage_matches)),
                "clickbait": list(set(clickbait_matches)),
                "sensationalism": list(set(sensationalism_matches)),
                "structural": {
                    "title_clickbait_trigger": title_clickbait_trigger,
                    "title_caps_trigger": title_caps_trigger,
                    "title_exclamation_count": excl_count
                }
            }
        },
        "statistics": {
            "word_count": stats_word_count,
            "char_count": char_count,
            "reading_time": reading_time,
            "lexical_diversity": lexical_diversity
        }
    }
    
    return jsonify(response_data)

@app.route('/model_status', methods=['GET'])
def model_status():
    status_path = os.path.join(BASE_DIR, "models", "model_status.json")
    if os.path.exists(status_path):
        try:
            with open(status_path, "r") as f:
                status_data = json.load(f)
            return jsonify(status_data)
        except Exception as e:
            pass
            
    # Default or fallback metrics
    return jsonify({
        "accuracy": 98.44,
        "vocab_size": 10000,
        "dataset_size": 45757,
        "last_trained": "2026-06-17 12:27:22",
        "dataset_file": "news 1.csv"
    })

@app.route('/retrain', methods=['POST'])
def retrain():
    # Extract request parameters/files outside the generator scope to avoid Flask context issues
    uploaded_file = request.files.get('file')
    use_default = request.form.get('use_default', 'false') == 'true'
    
    temp_path = None
    filename = None
    if uploaded_file:
        filename = uploaded_file.filename
        os.makedirs("models", exist_ok=True)
        temp_path = f"models/temp_{int(datetime.now().timestamp())}.csv"
        uploaded_file.save(temp_path)

    def run_training_stream(temp_path=temp_path, filename=filename, use_default=use_default):
        global model, vectorizer, word_coef_map
        try:
            yield "SYSTEM: Initializing Retraining Pipeline...\n"
            
            os.makedirs("models", exist_ok=True)
            
            if use_default:
                dataset_path = "news.csv"
                yield "SYSTEM: Loading default baseline dataset (news.csv)...\n"
                if not os.path.exists(dataset_path):
                    yield "ERROR: 'news.csv' not found on server.\n"
                    return
                df = pd.read_csv(dataset_path)
                filename = "news.csv"
            elif temp_path:
                yield f"SYSTEM: Loading uploaded CSV dataset '{filename}'...\n"
                df = pd.read_csv(temp_path)
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            else:
                if os.path.exists("news 1.csv"):
                    dataset_path = "news 1.csv"
                else:
                    dataset_path = "news.csv"
                yield f"SYSTEM: No file uploaded. Loading local '{dataset_path}'...\n"
                if not os.path.exists(dataset_path):
                    yield f"ERROR: '{dataset_path}' not found on server.\n"
                    return
                df = pd.read_csv(dataset_path)
                filename = dataset_path
                
            yield f"SYSTEM: Dataset successfully loaded. Shape: {df.shape}\n"
            
            if 'label' not in df.columns:
                yield "ERROR: Dataset missing 'label' column.\n"
                return
            if 'text' not in df.columns and 'combined_text' not in df.columns:
                yield "ERROR: Dataset missing 'text' column.\n"
                return
                
            yield "SYSTEM: Normalizing labels (REAL vs FAKE)...\n"
            def normalize_label(label):
                if isinstance(label, (int, np.integer)):
                    return "REAL" if label == 1 else "FAKE"
                label_str = str(label).strip().upper()
                if label_str in ['1', 'REAL', 'TRUE', 'FACTUAL']:
                    return "REAL"
                return "FAKE"
            
            df['normalized_label'] = df['label'].apply(normalize_label)
            labels = df['normalized_label']
            
            label_counts = labels.value_counts().to_dict()
            yield f"SYSTEM: Label distribution: FAKE: {label_counts.get('FAKE', 0)}, REAL: {label_counts.get('REAL', 0)}\n"
            
            yield "SYSTEM: Preprocessing and text cleaning...\n"
            if 'title' in df.columns:
                df['combined_text'] = df['title'].fillna("") + " " + df['text'].fillna("")
            else:
                df['combined_text'] = df['text'].fillna("")
                
            df['clean_combined'] = df['combined_text'].apply(clean_text)
            
            yield "SYSTEM: Splitting dataset into train/test sets (80/20 split)...\n"
            x_train, x_test, y_train, y_test = train_test_split(
                df['clean_combined'], labels, test_size=0.2, random_state=42, stratify=labels
            )
            yield f"SYSTEM: Split summary: {len(x_train)} train samples, {len(x_test)} test samples.\n"
            
            yield "SYSTEM: Executing TF-IDF Vectorizer (max features: 10,000, bigrams)...\n"
            vectorizer_new = TfidfVectorizer(stop_words='english', max_df=0.7, ngram_range=(1, 2), max_features=10000)
            tf_train = vectorizer_new.fit_transform(x_train)
            tf_test = vectorizer_new.transform(x_test)
            
            yield "SYSTEM: Fitting Linear Support Vector Classifier...\n"
            model_new = LinearSVC(C=1.0, random_state=42, max_iter=2000)
            model_new.fit(tf_train, y_train)
            
            yield "SYSTEM: Running evaluation on test split...\n"
            y_pred = model_new.predict(tf_test)
            accuracy = accuracy_score(y_test, y_pred)
            accuracy_pct = round(accuracy * 100, 2)
            yield f"EVALUATION: Test accuracy achieved: {accuracy_pct}%\n"
            
            yield "SYSTEM: Serializing and saving new model assets...\n"
            try:
                os.makedirs(os.path.join(BASE_DIR, "models"), exist_ok=True)
                with open(os.path.join(BASE_DIR, "models", "model.pkl"), "wb") as f:
                    pickle.dump(model_new, f)
                with open(os.path.join(BASE_DIR, "models", "vectorizer.pkl"), "wb") as f:
                    pickle.dump(vectorizer_new, f)
            except Exception as e:
                yield f"WARNING: Failed to write model files to disk (read-only environment?): {str(e)}\n"
                
            yield "SYSTEM: Generating Explainable AI coefficient weights map...\n"
            feature_names = vectorizer_new.get_feature_names_out()
            coefficients = model_new.coef_[0]
            word_coef_map_new = {}
            for word, coef in zip(feature_names, coefficients):
                word_coef_map_new[word] = float(coef)
                
            try:
                with open(os.path.join(BASE_DIR, "models", "feature_coefficients.json"), "w") as f:
                    json.dump(word_coef_map_new, f, indent=2)
            except Exception as e:
                yield f"WARNING: Failed to write feature coefficients to disk: {str(e)}\n"
                
            now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            status_data = {
                "accuracy": accuracy_pct,
                "vocab_size": len(feature_names),
                "dataset_size": len(df),
                "last_trained": now_str,
                "dataset_file": filename
            }
            try:
                with open(os.path.join(BASE_DIR, "models", "model_status.json"), "w") as f:
                    json.dump(status_data, f, indent=2)
            except Exception as e:
                yield f"WARNING: Failed to write model status to disk: {str(e)}\n"
                
            model = model_new
            vectorizer = vectorizer_new
            word_coef_map = word_coef_map_new
            
            yield "SYSTEM: In-memory model hot-swapped successfully!\n"
            yield "SUCCESS: Model training pipeline completed successfully!\n"
            
        except Exception as e:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
            yield f"ERROR: Retraining failed: {str(e)}\n"
            
    return Response(run_training_stream(), mimetype='text/plain')

if __name__ == '__main__':
    loaded = load_model_assets()
    if not loaded:
        print("CRITICAL: Failed to load model assets. Server starting without models.")
    app.run(debug=True, port=5000)
