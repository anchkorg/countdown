// Simple, robust countdown timer implementation
console.log('App.js loading...');

// Timer state
let timerState = {
    totalSeconds: 60,
    currentSeconds: 60,
    isRunning: false,
    interval: null,
    hasAnnouncedTwenty: false,
    hasAnnouncedTen: false,
    lastAnnouncedSecond: -1
};

// DOM elements
let elements = {};

// Speech synthesis
let speechSupported = false;
let cantoneseVoice = null;

// Initialize when DOM is ready
function initializeTimer() {
    console.log('Initializing timer...');
    
    // Get DOM elements
    elements = {
        timeDisplay: document.getElementById('timeDisplay'),
        startBtn: document.getElementById('startBtn'),
        nextBtn: document.getElementById('nextBtn'),
        stopBtn: document.getElementById('stopBtn'),
        activeControls: document.getElementById('activeControls'),
        settingsBtn: document.getElementById('settingsBtn'),
        settingsModal: document.getElementById('settingsModal'),
        modalOverlay: document.getElementById('modalOverlay'),
        closeModal: document.getElementById('closeModal'),
        minutesInput: document.getElementById('minutesInput'),
        saveSettings: document.getElementById('saveSettings'),
        cancelSettings: document.getElementById('cancelSettings')
    };

    // Check elements
    for (let [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Element not found: ${key}`);
            return;
        }
    }
    console.log('All elements found successfully');

    // Setup speech
    setupSpeech();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize UI
    updateDisplay();
    updateButtonStates();
    
    console.log('Timer initialized successfully');
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Start button
    elements.startBtn.onclick = function() {
        console.log('Start button clicked');
        startTimer();
    };
    
    // Next button
    elements.nextBtn.onclick = function() {
        console.log('Next button clicked');
        nextTimer();
    };
    
    // Stop button
    elements.stopBtn.onclick = function() {
        console.log('Stop button clicked');
        stopTimer();
    };
    
    // Settings button
    elements.settingsBtn.onclick = function() {
        console.log('Settings button clicked');
        openSettings();
    };
    
    // Close modal
    elements.closeModal.onclick = function() {
        console.log('Close modal clicked');
        closeSettings();
    };
    
    // Modal overlay
    elements.modalOverlay.onclick = function() {
        closeSettings();
    };
    
    // Save settings
    elements.saveSettings.onclick = function() {
        console.log('Save settings clicked');
        saveSettings();
    };
    
    // Cancel settings
    elements.cancelSettings.onclick = function() {
        closeSettings();
    };
    
    // Enter key in input
    elements.minutesInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
            saveSettings();
        }
    };
    
    // Escape key
    document.onkeydown = function(e) {
        if (e.key === 'Escape' && elements.settingsModal.style.display === 'flex') {
            closeSettings();
        }
    };
    
    console.log('Event listeners set up successfully');
}

function setupSpeech() {
    speechSupported = 'speechSynthesis' in window;
    if (speechSupported) {
        const voices = speechSynthesis.getVoices();
        cantoneseVoice = voices.find(voice => 
            voice.lang.includes('yue') || 
            voice.lang.includes('zh-HK') || 
            voice.lang.includes('zh-CN')
        ) || null;
        
        if (voices.length === 0) {
            speechSynthesis.onvoiceschanged = () => {
                const newVoices = speechSynthesis.getVoices();
                cantoneseVoice = newVoices.find(voice => 
                    voice.lang.includes('yue') || 
                    voice.lang.includes('zh-HK') || 
                    voice.lang.includes('zh-CN')
                ) || null;
            };
        }
    }
}

function speak(text) {
    if (!speechSupported) {
        console.log('Would speak:', text);
        return;
    }
    
    try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        if (cantoneseVoice) utterance.voice = cantoneseVoice;
        utterance.lang = 'zh-HK';
        utterance.rate = 0.9;
        utterance.volume = 0.8;
        speechSynthesis.speak(utterance);
    } catch (error) {
        console.error('Speech error:', error);
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateDisplay() {
    if (elements.timeDisplay) {
        elements.timeDisplay.textContent = formatTime(timerState.currentSeconds);
    }
}

function updateButtonStates() {
    if (timerState.isRunning) {
        // Show next/stop, hide start
        elements.startBtn.style.display = 'none';
        elements.activeControls.style.display = 'flex';
    } else {
        // Show start, hide next/stop
        elements.startBtn.style.display = 'inline-flex';
        elements.activeControls.style.display = 'none';
    }
}

function startTimer() {
    console.log('Starting timer...');
    
    timerState.isRunning = true;
    timerState.currentSeconds = timerState.totalSeconds;
    timerState.hasAnnouncedTwenty = false;
    timerState.hasAnnouncedTen = false;
    timerState.lastAnnouncedSecond = -1;
    
    updateButtonStates();
    updateDisplay();
    
    timerState.interval = setInterval(() => {
        tick();
    }, 1000);
}

function tick() {
    if (timerState.currentSeconds <= 0) {
        handleTimeExpired();
        return;
    }
    
    // Voice announcements
    if (timerState.currentSeconds === 20 && !timerState.hasAnnouncedTwenty) {
        speak('還有20秒');
        timerState.hasAnnouncedTwenty = true;
    }
    
    if (timerState.currentSeconds === 10 && !timerState.hasAnnouncedTen) {
        speak('還有10秒');
        timerState.hasAnnouncedTen = true;
    }
    
    if (timerState.currentSeconds <= 5 && timerState.currentSeconds >= 1 && 
        timerState.lastAnnouncedSecond !== timerState.currentSeconds) {
        const numberWords = { 5: '五', 4: '四', 3: '三', 2: '二', 1: '一' };
        speak(numberWords[timerState.currentSeconds]);
        timerState.lastAnnouncedSecond = timerState.currentSeconds;
    }
    
    timerState.currentSeconds--;
    updateDisplay();
}

function handleTimeExpired() {
    clearTimer();
    playNotificationSound();
    console.log('Timer expired!');
}

function playNotificationSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
        console.error('Audio error:', error);
    }
}

function nextTimer() {
    console.log('Next timer...');
    clearTimer();
    startTimer();
}

function stopTimer() {
    console.log('Stop timer...');
    clearTimer();
    timerState.isRunning = false;
    timerState.currentSeconds = timerState.totalSeconds;
    updateButtonStates();
    updateDisplay();
}

function clearTimer() {
    if (timerState.interval) {
        clearInterval(timerState.interval);
        timerState.interval = null;
    }
    timerState.isRunning = false;
}

function openSettings() {
    console.log('Opening settings...');
    elements.minutesInput.value = Math.floor(timerState.totalSeconds / 60);
    elements.settingsModal.style.display = 'flex';
    elements.settingsModal.setAttribute('aria-hidden', 'false');
    
    setTimeout(() => {
        elements.minutesInput.focus();
        elements.minutesInput.select();
    }, 100);
}

function closeSettings() {
    console.log('Closing settings...');
    elements.settingsModal.style.display = 'none';
    elements.settingsModal.setAttribute('aria-hidden', 'true');
}

function saveSettings() {
    const minutes = parseInt(elements.minutesInput.value);
    
    if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        alert('請輸入 1 到 60 分鐘之間的數值');
        elements.minutesInput.focus();
        return;
    }
    
    console.log('Saving settings:', minutes, 'minutes');
    
    if (!timerState.isRunning) {
        timerState.totalSeconds = minutes * 60;
        timerState.currentSeconds = timerState.totalSeconds;
        updateDisplay();
    }
    
    closeSettings();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTimer);
} else {
    initializeTimer();
}

// Also try initializing after a short delay as fallback
setTimeout(() => {
    if (!elements.timeDisplay) {
        console.log('Fallback initialization...');
        initializeTimer();
    }
}, 500);

console.log('App.js loaded');