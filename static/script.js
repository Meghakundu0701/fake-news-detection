// Fake News Detector Frontend Dashboard Controller

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // DOM Elements References - Scanner
    const articleTitleInput = document.getElementById('article-title');
    const articleTextInput = document.getElementById('article-text');
    const btnAnalyze = document.getElementById('btn-analyze');
    const btnClear = document.getElementById('btn-clear');
    
    const welcomeCard = document.getElementById('welcome-card');
    const resultsDashboard = document.getElementById('results-dashboard');
    
    // Diagnostic Results
    const credibilityVal = document.getElementById('credibility-value');
    const credibilityLabel = document.getElementById('credibility-label');
    const gaugeProgress = document.getElementById('gauge-progress');
    const verdictBadge = document.getElementById('verdict-badge');
    const confidenceText = document.getElementById('confidence-text');
    
    // Emotion Scores
    const scoreClickbait = document.getElementById('score-clickbait');
    const barClickbait = document.getElementById('bar-clickbait');
    const scoreFear = document.getElementById('score-fear');
    const barFear = document.getElementById('bar-fear');
    const scoreRage = document.getElementById('score-rage');
    const barRage = document.getElementById('bar-rage');
    const scoreSensationalism = document.getElementById('score-sensationalism');
    const barSensationalism = document.getElementById('bar-sensationalism');
    
    // XAI Content Viewer
    const renderedTitle = document.getElementById('rendered-title');
    const highlightedText = document.getElementById('highlighted-text');
    
    const chkShowReal = document.getElementById('chk-show-real');
    const chkShowFake = document.getElementById('chk-show-fake');
    const chkShowEmotions = document.getElementById('chk-show-emotions');
    
    // Details Panels
    const realPredictors = document.getElementById('real-predictors');
    const fakePredictors = document.getElementById('fake-predictors');
    
    // Statistics
    const statWordCount = document.getElementById('stat-word-count');
    const statReadTime = document.getElementById('stat-read-time');
    const statDiversity = document.getElementById('stat-diversity');
    const statCharCount = document.getElementById('stat-char-count');
    
    // History
    const historyList = document.getElementById('history-list');
    
    // Tooltip
    const tooltip = document.getElementById('xai-tooltip');

    // DOM Elements References - Navigation & Training Hub
    const tabHub = document.getElementById('tab-hub');
    const scannerView = document.getElementById('scanner-view');
    const hubView = document.getElementById('hub-view');
    const statusModelName = document.getElementById('status-model-name');
    const hubModelAccuracy = document.getElementById('hub-model-accuracy');
    const hubModelVocab = document.getElementById('hub-model-vocab');
    const dropZone = document.getElementById('drop-zone');
    const datasetFileInput = document.getElementById('dataset-file');
    const datasetPreview = document.getElementById('dataset-preview');
    const previewRowCount = document.getElementById('preview-row-count');
    const previewRealCount = document.getElementById('preview-real-count');
    const previewFakeCount = document.getElementById('preview-fake-count');
    const btnRetrain = document.getElementById('btn-retrain');
    const btnResetModel = document.getElementById('btn-reset-model');
    const btnClearTerminal = document.getElementById('btn-clear-terminal');
    const terminalConsole = document.getElementById('terminal-console');

    // Global variables
    let currentData = null;
    let currentUploadFile = null;

    // ----------------- Sample Articles Data -----------------
    const samples = {
        'real-science': {
            title: "NASA Rover Discoveries on Mars Reveal Ancient Water Channels and Organic Chemistry Minerals",
            text: "NASA's Perseverance Mars rover has gathered critical data indicating the existence of ancient water channels in Jezero Crater. The rover utilized its Mastcam-Z imaging system to capture detailed stratigraphic layering consistent with a historical lakebed delta. Furthermore, the SHERLOC instrument detected presence of carbon-bearing organic molecules locked within rock formations. Scientists stress that these findings, while suggesting a hospitable environment in Mars' deep past, do not represent direct proof of past microbial life. Perseverance will continue scanning and collecting core samples for potential future return to Earth, providing planetary geologists with invaluable samples of Martian geologic history."
        },
        'fake-conspiracy': {
            title: "SHOCKING SECRET: Secret Chemical Outbreak Exposed in Water Supply Triggering Mind Control Behavior!",
            text: "You won't believe what they are hiding from you! Leaked documents from deep state insiders have exposed a shocking secret conspiracy to poison our water supply. A toxic chemical outbreak has been secretly injected into city reservoirs across the nation to control citizens and trigger submissive, mind-control behavior. This horrific scheme will destroy our freedom completely. High-level whistleblowers confirm this deadly virus is already spreading rapidly! The media is staying silent because they are complicit in this shameful corruption. Share this shocking truth now before they take this warning down! The end is near if we do not fight back against this evil agenda right away!"
        },
        'real-emotional': {
            title: "Lawmakers Blast Opponent's Disgraceful Energy Bill as a Cruel Attack on Struggling Families",
            text: "In a furious press conference, lawmakers blasted the newly proposed energy bill as a disgraceful and shameful attack on struggling working-class families. Leaders from the opposition party slammed the legislation, calling it a corrupt scandal designed to line the pockets of greedy corporate executives while stealing resources from ordinary citizens. Activists blasted the policy as a cruel, disgustingly selfish betrayal of public trust. While the authors of the bill argue that the deregulation will trigger long-term economic growth and lower costs eventually, opponents condemned it as absolute hypocrisy. The heated dispute is escalating rapidly, with angry protesters assembling outside the legislative building demanding immediate changes."
        }
    };

    // ----------------- Loading Sample News -----------------
    document.querySelectorAll('.sample-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sampleKey = btn.getAttribute('data-sample');
            const sample = samples[sampleKey];
            if (sample) {
                articleTitleInput.value = sample.title;
                articleTextInput.value = sample.text;
                // Auto trigger scan
                triggerAnalysis();
            }
        });
    });

    // Clear Button
    btnClear.addEventListener('click', () => {
        articleTitleInput.value = '';
        articleTextInput.value = '';
        welcomeCard.classList.remove('hide');
        resultsDashboard.classList.add('hide');
        currentData = null;
    });

    // Analyze Button click
    btnAnalyze.addEventListener('click', () => {
        triggerAnalysis();
    });

    // Trigger analysis
    function triggerAnalysis() {
        const title = articleTitleInput.value.trim();
        const text = articleTextInput.value.trim();
        
        if (!text) {
            alert("Please paste the article content first.");
            return;
        }

        // Show loading state
        btnAnalyze.disabled = true;
        btnAnalyze.innerHTML = '<i data-lucide="loader-2" class="spin-animation"></i> <span>Running Diagnostic...</span>';
        lucide.createIcons();

        fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, text })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Server error occurred during prediction.");
            }
            return response.json();
        })
        .then(data => {
            currentData = data;
            renderResults(title, text, data);
            saveToHistory(title, data);
        })
        .catch(err => {
            console.error(err);
            alert("An error occurred: " + err.message);
        })
        .finally(() => {
            // Restore button state
            btnAnalyze.disabled = false;
            btnAnalyze.innerHTML = '<i data-lucide="cpu"></i> <span>Run Full Diagnostic</span>';
            lucide.createIcons();
        });
    }

    // ----------------- Render Diagnostic Results -----------------
    function renderResults(originalTitle, originalText, data) {
        welcomeCard.classList.add('hide');
        resultsDashboard.classList.remove('hide');

        // 1. Update Gauge & Verdict
        const credibility = data.credibility_score;
        credibilityVal.textContent = `${credibility}%`;
        
        // Circular gauge calculations (Circumference ~ 440)
        const circumference = 440;
        const offset = circumference - (circumference * credibility / 100);
        gaugeProgress.style.strokeDashoffset = offset;

        if (data.prediction === "REAL") {
            gaugeProgress.style.stroke = "var(--neon-real)";
            gaugeProgress.style.filter = "drop-shadow(0 0 8px var(--neon-real-glow))";
            verdictBadge.className = "badge badge-real";
            verdictBadge.textContent = "REAL NEWS";
            credibilityLabel.textContent = "CREDIBLE";
            credibilityLabel.style.color = "var(--neon-real)";
        } else {
            gaugeProgress.style.stroke = "var(--neon-fake)";
            gaugeProgress.style.filter = "drop-shadow(0 0 8px var(--neon-fake-glow))";
            verdictBadge.className = "badge badge-fake";
            verdictBadge.textContent = "MISINFORMATION RISK";
            credibilityLabel.textContent = "UNRELIABLE";
            credibilityLabel.style.color = "var(--neon-fake)";
        }
        confidenceText.textContent = `Model Confidence: ${data.confidence}%`;

        // 2. Update Emotion Bars
        const emotions = data.emotions.scores;
        scoreClickbait.textContent = `${emotions.clickbait}%`;
        barClickbait.style.width = `${emotions.clickbait}%`;
        
        scoreFear.textContent = `${emotions.fear_mongering}%`;
        barFear.style.width = `${emotions.fear_mongering}%`;
        
        scoreRage.textContent = `${emotions.rage_bait}%`;
        barRage.style.width = `${emotions.rage_bait}%`;
        
        scoreSensationalism.textContent = `${emotions.sensationalism}%`;
        barSensationalism.style.width = `${emotions.sensationalism}%`;

        // 3. Render XAI Highlighted Texts
        renderHighlightedText(originalTitle, originalText);

        // 4. Render Predictor Charts
        renderPredictorCharts(data.xai);

        // 5. Update Statistics
        const stats = data.statistics;
        statWordCount.textContent = stats.word_count;
        statReadTime.textContent = `${stats.reading_time} min`;
        statDiversity.textContent = `${stats.lexical_diversity}%`;
        statCharCount.textContent = stats.char_count;
    }

    // ----------------- Render Word Attribution Highlights -----------------
    function renderHighlightedText(originalTitle, originalText) {
        if (!currentData) return;

        const xaiWeights = currentData.xai.word_weights;
        const triggers = currentData.emotions.triggers;
        
        // Trigger words lists (lowercase sets for fast lookup)
        const fearSet = new Set(triggers.fear_mongering);
        const rageSet = new Set(triggers.rage_bait);
        const clickbaitSet = new Set(triggers.clickbait);
        const sensationalSet = new Set(triggers.sensationalism);

        // Get filter toggle values
        const showReal = chkShowReal.checked;
        const showFake = chkShowFake.checked;
        const showEmotions = chkShowEmotions.checked;

        // Highlighting parsing helper
        function highlightContent(text) {
            if (!text) return "";
            
            // Regex splits on alphanumeric word tokens including apostrophes, preserving all other separators
            const tokens = text.split(/(\b[a-zA-Z0-9]+(?:\'[a-zA-Z0-9]+)?\b)/g);
            
            return tokens.map((token, index) => {
                // If it is a separator token (even indices), output directly
                if (index % 2 === 0) {
                    return escapeHtml(token);
                }
                
                const wordLower = token.toLowerCase();
                let highlightClass = "";
                let hoverAttributes = `data-word="${escapeHtml(token)}"`;
                
                // 1. Check XAI Weight
                const weight = xaiWeights[wordLower];
                const hasWeight = weight !== undefined;
                
                // 2. Check Emotional Triggers
                const emotionsFound = [];
                if (fearSet.has(wordLower)) emotionsFound.push("Fear-mongering");
                if (rageSet.has(wordLower)) emotionsFound.push("Rage Bait");
                if (clickbaitSet.has(wordLower)) emotionsFound.push("Clickbait");
                if (sensationalSet.has(wordLower)) emotionsFound.push("Sensationalism");
                
                // Determine highlight coloring based on weights and categories
                if (showReal && hasWeight && weight > 0.002) {
                    highlightClass = "xai-highlight-real";
                    hoverAttributes += ` data-weight="${weight.toFixed(5)}" data-type="real"`;
                } else if (showFake && hasWeight && weight < -0.002) {
                    highlightClass = "xai-highlight-fake";
                    hoverAttributes += ` data-weight="${weight.toFixed(5)}" data-type="fake"`;
                } else if (showEmotions && emotionsFound.length > 0) {
                    highlightClass = "xai-highlight-emotion";
                    hoverAttributes += ` data-emotions="${emotionsFound.join(', ')}" data-type="emotion"`;
                }
                
                if (highlightClass) {
                    return `<span class="xai-word ${highlightClass}" ${hoverAttributes}>${escapeHtml(token)}</span>`;
                } else {
                    return escapeHtml(token);
                }
            }).join('');
        }

        // Render title and text
        renderedTitle.innerHTML = highlightContent(originalTitle) || "Untitled Article";
        highlightedText.innerHTML = highlightContent(originalText);

        // Bind Tooltip listeners
        bindTooltipEvents();
    }

    // Toggle highlights listeners
    chkShowReal.addEventListener('change', () => {
        if (currentData) renderHighlightedText(articleTitleInput.value, articleTextInput.value);
    });
    chkShowFake.addEventListener('change', () => {
        if (currentData) renderHighlightedText(articleTitleInput.value, articleTextInput.value);
    });
    chkShowEmotions.addEventListener('change', () => {
        if (currentData) renderHighlightedText(articleTitleInput.value, articleTextInput.value);
    });

    // HTML escape utility
    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // ----------------- Bind Tooltip Listeners -----------------
    function bindTooltipEvents() {
        const words = document.querySelectorAll('.xai-word');
        
        words.forEach(word => {
            word.addEventListener('mouseenter', (e) => {
                const rect = word.getBoundingClientRect();
                const wordText = word.getAttribute('data-word');
                const type = word.getAttribute('data-type');
                
                let tooltipContent = `<div class="xai-tooltip-header">Linguistic: "${wordText}"</div>`;
                
                if (type === 'real' || type === 'fake') {
                    const weight = parseFloat(word.getAttribute('data-weight'));
                    const verdict = weight > 0 ? "Pushes to REAL" : "Pushes to FAKE";
                    const verdictClass = weight > 0 ? "text-real" : "text-fake";
                    
                    tooltipContent += `
                        <div class="xai-tooltip-row">
                            <span class="xai-tooltip-label">Classification:</span>
                            <span class="xai-tooltip-value ${verdictClass}">${verdict}</span>
                        </div>
                        <div class="xai-tooltip-row">
                            <span class="xai-tooltip-label">Model Weight:</span>
                            <span class="xai-tooltip-value">${weight.toFixed(5)}</span>
                        </div>
                    `;
                } else if (type === 'emotion') {
                    const emotions = word.getAttribute('data-emotions');
                    tooltipContent += `
                        <div class="xai-tooltip-row">
                            <span class="xai-tooltip-label">Persuasion:</span>
                            <span class="xai-tooltip-value text-warn">${emotions}</span>
                        </div>
                        <div class="xai-tooltip-row">
                            <span class="xai-tooltip-label">Trigger Status:</span>
                            <span class="xai-tooltip-value text-info">Emotional Match</span>
                        </div>
                    `;
                }
                
                tooltip.innerHTML = tooltipContent;
                tooltip.classList.remove('hide');
                
                // Position tooltip above the word
                tooltip.style.left = `${window.scrollX + rect.left + (rect.width/2) - (tooltip.offsetWidth/2)}px`;
                tooltip.style.top = `${window.scrollY + rect.top - tooltip.offsetHeight - 8}px`;
            });
            
            word.addEventListener('mouseleave', () => {
                tooltip.classList.add('hide');
            });
        });
    }

    // ----------------- Render Predictor Bar Charts -----------------
    function renderPredictorCharts(xaiData) {
        // Clear previous
        realPredictors.innerHTML = "";
        fakePredictors.innerHTML = "";
        
        const realList = xaiData.top_real_indicators;
        const fakeList = xaiData.top_fake_indicators;
        
        // Find max weight for bar scaling normalization
        let maxWeight = 0.001;
        realList.forEach(item => { if (Math.abs(item.weight) > maxWeight) maxWeight = Math.abs(item.weight); });
        fakeList.forEach(item => { if (Math.abs(item.weight) > maxWeight) maxWeight = Math.abs(item.weight); });
        
        // Render Real Predictors
        if (realList.length === 0) {
            realPredictors.innerHTML = `<p class="empty-text">No significant indicators found.</p>`;
        } else {
            realList.forEach(item => {
                const widthPct = Math.min(100, (Math.abs(item.weight) / maxWeight) * 100);
                const itemEl = document.createElement('div');
                itemEl.className = 'pred-item';
                itemEl.innerHTML = `
                    <div class="pred-word-info">
                        <span class="pred-word">${escapeHtml(item.word)}</span>
                        <span class="pred-weight text-real">+${item.weight.toFixed(4)}</span>
                    </div>
                    <div class="pred-weight-track">
                        <div class="pred-weight-fill real-fill" style="width: ${widthPct}%"></div>
                    </div>
                `;
                realPredictors.appendChild(itemEl);
            });
        }

        // Render Fake Predictors
        if (fakeList.length === 0) {
            fakePredictors.innerHTML = `<p class="empty-text">No significant indicators found.</p>`;
        } else {
            fakeList.forEach(item => {
                const widthPct = Math.min(100, (Math.abs(item.weight) / maxWeight) * 100);
                const itemEl = document.createElement('div');
                itemEl.className = 'pred-item';
                itemEl.innerHTML = `
                    <div class="pred-word-info">
                        <span class="pred-word">${escapeHtml(item.word)}</span>
                        <span class="pred-weight text-fake">${item.weight.toFixed(4)}</span>
                    </div>
                    <div class="pred-weight-track">
                        <div class="pred-weight-fill fake-fill" style="width: ${widthPct}%"></div>
                    </div>
                `;
                fakePredictors.appendChild(itemEl);
            });
        }
    }

    // ----------------- Save and Render Session History -----------------
    const HISTORY_KEY = "veritas_history_logs";
    
    function saveToHistory(title, data) {
        let history = getHistory();
        
        // Remove duplicate if same title exists
        history = history.filter(item => item.title !== title);
        
        // Add to front
        history.unshift({
            title: title || "Untitled Article",
            prediction: data.prediction,
            confidence: data.confidence,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: articleTextInput.value
        });
        
        // Cap at 10 items
        if (history.length > 10) history.pop();
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistory();
    }
    
    function getHistory() {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    }
    
    function renderHistory() {
        historyList.innerHTML = "";
        const history = getHistory();
        
        if (history.length === 0) {
            historyList.innerHTML = `<p class="empty-text">No scans in this session yet.</p>`;
            return;
        }
        
        history.forEach(item => {
            const badgeClass = item.prediction === "REAL" ? "badge-real" : "badge-fake";
            const scoreClass = item.prediction === "REAL" ? "text-real" : "text-fake";
            
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-title">${escapeHtml(item.title)}</div>
                <div class="history-meta">
                    <span class="badge ${badgeClass}">${item.prediction}</span>
                    <span class="history-pct ${scoreClass}">${item.confidence}%</span>
                </div>
            `;
            
            // Reload on click
            historyItem.addEventListener('click', () => {
                articleTitleInput.value = item.title === "Untitled Article" ? "" : item.title;
                articleTextInput.value = item.text;
                triggerAnalysis();
            });
            
            historyList.appendChild(historyItem);
        });
    }

    // ----------------- Model Training Hub Controller -----------------
    
    // Tab toggle — single button switches between Scanner and Training Hub
    let isHubOpen = false;

    tabHub.addEventListener('click', () => {
        if (tabHub.disabled) return;
        isHubOpen = !isHubOpen;
        if (isHubOpen) {
            tabHub.classList.add('active');
            hubView.classList.remove('hide');
            scannerView.classList.add('hide');
            tabHub.innerHTML = '<i data-lucide="arrow-left"></i><span>Back to Scanner</span>';
        } else {
            tabHub.classList.remove('active');
            hubView.classList.add('hide');
            scannerView.classList.remove('hide');
            tabHub.innerHTML = '<i data-lucide="cpu"></i><span>Training Hub</span>';
        }
        lucide.createIcons();
    });

    // Helper: append a line of log to the terminal console
    function appendTerminal(text, type = 'system') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}-line`;
        
        const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        line.textContent = `[${timeStr}] ${text}`;
        
        terminalConsole.appendChild(line);
        terminalConsole.scrollTop = terminalConsole.scrollHeight;
    }

    // Fetch and render model status
    function loadModelStatus() {
        fetch('/model_status')
            .then(res => {
                if (!res.ok) throw new Error("Could not fetch model status.");
                return res.json();
            })
            .then(data => {
                statusModelName.textContent = `LinearSVC ${data.accuracy}% Accuracy Model Loaded`;
                hubModelAccuracy.textContent = `${data.accuracy}%`;
                hubModelVocab.textContent = data.vocab_size.toLocaleString();
                
                appendTerminal(`SYSTEM: Active Model loaded. File: '${data.dataset_file}', Accuracy: ${data.accuracy}%, Features: ${data.vocab_size.toLocaleString()}, Trained: ${data.last_trained}`, 'success');
            })
            .catch(err => {
                console.error(err);
                statusModelName.textContent = "Error loading model status";
                appendTerminal(`ERROR: Failed to fetch model status: ${err.message}`, 'error');
            });
    }

    // Clear Terminal button
    btnClearTerminal.addEventListener('click', () => {
        terminalConsole.innerHTML = "";
        appendTerminal("Terminal cleared. Ready.", "system");
    });

    // Drag and Drop Zone event listeners
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    dropZone.addEventListener('click', () => {
        datasetFileInput.click();
    });

    datasetFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // File Selection Handler
    function handleFileSelect(file) {
        if (!file.name.endsWith('.csv')) {
            alert("Only standard CSV datasets are supported (.csv files).");
            appendTerminal(`WARNING: Rejected file '${file.name}' - not a CSV file.`, 'error');
            return;
        }

        currentUploadFile = file;
        dropZone.querySelector('p').innerHTML = `Selected file: <strong>${escapeHtml(file.name)}</strong> (${(file.size / (1024*1024)).toFixed(2)} MB)`;
        
        terminalConsole.innerHTML = "";
        parseLocalCSV(file);
    }

    // Locally parse CSV in chunks using FileReader to count label classes and total lines
    function parseLocalCSV(file) {
        appendTerminal(`SYSTEM: Analyzing CSV dataset structure locally: '${file.name}'...`, 'system');
        
        const reader = new FileReader();
        let offset = 0;
        const chunkSize = 1024 * 1024 * 3; // 3MB chunks
        let headerLine = "";
        let labelIndex = -1;
        let realCountLocal = 0;
        let fakeCountLocal = 0;
        let totalCountLocal = 0;
        let leftOver = "";
        
        btnRetrain.disabled = true;
        btnResetModel.disabled = true;

        reader.onload = function(evt) {
            if (evt.target.error) {
                appendTerminal(`ERROR: Failed to read file chunks: ${evt.target.error.message}`, 'error');
                btnResetModel.disabled = false;
                return;
            }

            const chunk = leftOver + evt.target.result;
            const lines = chunk.split(/\r?\n/);
            leftOver = lines.pop(); // Keep incomplete last line
            
            let startIdx = 0;
            if (offset === 0 && lines.length > 0) {
                headerLine = lines[0];
                const cols = headerLine.split(',');
                labelIndex = cols.findIndex(c => c.trim().toLowerCase() === 'label');
                if (labelIndex === -1) {
                    labelIndex = cols.findIndex(c => c.toLowerCase().includes('lbl') || c.toLowerCase().includes('target') || c.toLowerCase().includes('class'));
                }
                if (labelIndex === -1) {
                    labelIndex = cols.length - 1;
                }
                startIdx = 1;
                appendTerminal(`SYSTEM: Found columns: [${cols.map(c => c.trim()).join(', ')}]`, 'system');
                appendTerminal(`SYSTEM: Mapped target label column to index: ${labelIndex}`, 'system');
            }
            
            for (let i = startIdx; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                
                const parts = splitCsvLine(line);
                const labelVal = parts[labelIndex];
                if (labelVal) {
                    const cleanVal = labelVal.trim().toUpperCase();
                    if (cleanVal === 'REAL' || cleanVal === '1' || cleanVal === 'TRUE' || cleanVal === 'FACTUAL') {
                        realCountLocal++;
                    } else {
                        fakeCountLocal++;
                    }
                    totalCountLocal++;
                }
            }
            
            offset += chunkSize;
            if (offset < file.size) {
                appendTerminal(`SYSTEM: Read ${(offset / (1024*1024)).toFixed(1)} MB...`, 'system');
                readNextSlice();
            } else {
                if (leftOver.trim()) {
                    const parts = splitCsvLine(leftOver);
                    const labelVal = parts[labelIndex];
                    if (labelVal) {
                        const cleanVal = labelVal.trim().toUpperCase();
                        if (cleanVal === 'REAL' || cleanVal === '1' || cleanVal === 'TRUE' || cleanVal === 'FACTUAL') {
                            realCountLocal++;
                        } else {
                            fakeCountLocal++;
                        }
                        totalCountLocal++;
                    }
                }
                
                datasetPreview.classList.remove('hide');
                previewRowCount.textContent = totalCountLocal.toLocaleString();
                previewRealCount.textContent = realCountLocal.toLocaleString();
                previewFakeCount.textContent = fakeCountLocal.toLocaleString();
                
                appendTerminal(`SYSTEM: Pre-validation completed successfully.`, 'success');
                appendTerminal(`SYSTEM: Total rows parsed: ${totalCountLocal.toLocaleString()}`, 'system');
                appendTerminal(`SYSTEM: Class ratio: REAL = ${realCountLocal.toLocaleString()} | FAKE = ${fakeCountLocal.toLocaleString()}`, 'system');
                
                btnRetrain.disabled = false;
                btnResetModel.disabled = false;
            }
        };

        function readNextSlice() {
            const slice = file.slice(offset, offset + chunkSize);
            reader.readAsText(slice);
        }

        readNextSlice();
    }

    // Split CSV row while preserving commas nested inside quotes
    function splitCsvLine(line) {
        const result = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = "";
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    // Trigger Model Retraining Pipeline on the server
    btnRetrain.addEventListener('click', () => {
        if (!currentUploadFile) {
            alert("Please select a valid CSV dataset first.");
            return;
        }

        btnRetrain.disabled = true;
        btnResetModel.disabled = true;
        tabHub.disabled = true;
        
        appendTerminal("SYSTEM: Starting training run on server...", "system");
        
        const formData = new FormData();
        formData.append('file', currentUploadFile);
        formData.append('use_default', 'false');
        
        executeRetrainFetch(formData);
    });

    // Reset Model to default (which retrains on base news.csv)
    btnResetModel.addEventListener('click', () => {
        if (!confirm("Are you sure you want to reset and retrain the model using the default 'news.csv' baseline?")) {
            return;
        }
        
        btnRetrain.disabled = true;
        btnResetModel.disabled = true;
        tabHub.disabled = true;
        
        appendTerminal("SYSTEM: Resetting model. Running retraining pipeline on baseline dataset...", "system");
        
        const formData = new FormData();
        formData.append('use_default', 'true');
        
        executeRetrainFetch(formData);
    });

    // Handle Streaming Response from `/retrain`
    async function executeRetrainFetch(formData) {
        try {
            const response = await fetch('/retrain', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error("HTTP error starting retraining pipeline.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.trim()) {
                        let type = 'system';
                        if (line.startsWith('ERROR:')) type = 'error';
                        else if (line.startsWith('SUCCESS:') || line.startsWith('EVALUATION:')) type = 'success';
                        
                        appendTerminal(line, type);
                    }
                }
            }

            if (buffer.trim()) {
                let type = 'system';
                if (buffer.startsWith('ERROR:')) type = 'error';
                else if (buffer.startsWith('SUCCESS:') || buffer.startsWith('EVALUATION:')) type = 'success';
                appendTerminal(buffer, type);
            }

            appendTerminal("SYSTEM: Retraining execution finished.", "system");
            loadModelStatus();
            
        } catch (error) {
            console.error(error);
            appendTerminal(`ERROR: Connection failed or interrupted: ${error.message}`, 'error');
        } finally {
            btnRetrain.disabled = currentUploadFile == null;
            btnResetModel.disabled = false;
            tabHub.disabled = false;
        }
    }

    // Initial history & model status load
    renderHistory();
    loadModelStatus();
});
