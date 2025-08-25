// ===== 語音播報支援 =====
class CantoneseTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voice = null;
    this.queue = [];
    this.isSpeaking = false;

    // 載入 voices（部分瀏覽器需等待 onvoiceschanged）
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      if (voices && voices.length) {
        // 優先尋找粵語/廣東話
        // 關鍵字 yue、zh-HK、Cantonese
        this.voice =
          voices.find(v => /yue|zh[-_]HK|cantonese/i.test(`${v.lang} ${v.name}`)) ||
          null;
      }
    };

    loadVoices();
    if (typeof this.synth.onvoiceschanged !== 'undefined') {
      this.synth.onvoiceschanged = () => loadVoices();
    }
  }

  speak(text, opts = {}) {
    if (!this.synth) return;
    const utter = new SpeechSynthesisUtterance(text);
    if (this.voice) utter.voice = this.voice;

    // 廣東話常用的語速、音調可微調
    utter.rate = opts.rate ?? 1.0;
    utter.pitch = opts.pitch ?? 1.0;
    utter.volume = opts.volume ?? 1.0;

    utter.onend = () => {
      this.isSpeaking = false;
      this._playNext();
    };
    utter.onerror = () => {
      this.isSpeaking = false;
      this._playNext();
    };

    this.queue.push(utter);
    if (!this.isSpeaking) this._playNext();
  }

  _playNext() {
    if (this.queue.length === 0) return;
    const next = this.queue.shift();
    this.isSpeaking = true;
    this.synth.speak(next);
  }

  cancel() {
    if (this.synth) {
      this.queue = [];
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}



class CountdownTimer {
  constructor() {
    this.minutes = 1; // Default 5 minutes
    this.totalSeconds = 0;
    this.remainingSeconds = 0;
    this.timerInterval = null;
    this.state = 'idle'; // idle, running, expired
    this.audioContext = null;
    this.tts = new CantoneseTTS();

    // 播報旗標，避免重複播報
    this.announced20 = false;
    this.announced10 = false;
    this.announced5to1 = new Set(); // 記錄已播報的 5,4,3,2,1
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  init() {
    console.log('Initializing timer application');
    this.initElements();
    this.bindEvents();
    this.initAudio();
    this.updateDisplay();
    console.log('Timer application initialized successfully');
  }
  
  initElements() {
    // Timer display
    this.timerDisplay = document.getElementById('timerDisplay');
    
    // Control buttons
    this.startBtn = document.getElementById('startBtn');
    this.stopBtn = document.getElementById('stopBtn');
    this.nextBtn = document.getElementById('nextBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    
    // Control groups
    this.startControls = document.getElementById('startControls');
    this.runningControls = document.getElementById('runningControls');
    
    // Modal elements
    this.settingsModal = document.getElementById('settingsModal');
    this.modalOverlay = document.getElementById('modalOverlay');
    this.modalClose = document.getElementById('modalClose');
    this.minutesInput = document.getElementById('minutesInput');
    this.cancelBtn = document.getElementById('cancelBtn');
    this.saveBtn = document.getElementById('saveBtn');
    
    // Timer app container
    this.timerApp = document.querySelector('.timer-app');
    
    // Log elements for debugging
    console.log('Elements found:', {
      startBtn: !!this.startBtn,
      settingsBtn: !!this.settingsBtn,
      timerDisplay: !!this.timerDisplay,
      settingsModal: !!this.settingsModal,
      startControls: !!this.startControls,
      runningControls: !!this.runningControls
    });
  }
  
  resetAnnouncements() {
    this.announced20 = false;
    this.announced10 = false;
    this.announced5to1.clear();
  }


  bindEvents() {
    console.log('Binding events...');
    
    // Control buttons with detailed logging
    if (this.startBtn) {
      this.startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('START button clicked');
        this.startTimer();
      });
      console.log('Start button event bound');
    } else {
      console.error('Start button not found!');
    }
    
    if (this.stopBtn) {
      this.stopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('STOP button clicked');
        this.stopTimer();
      });
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('NEXT button clicked');
        this.nextTimer();
      });
    }
    
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('SETTINGS button clicked');
        this.openSettings();
      });
      console.log('Settings button event bound');
    } else {
      console.error('Settings button not found!');
    }
    
    // Modal events
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSettings();
      });
    }
    
    if (this.modalClose) {
      this.modalClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeSettings();
      });
    }
    
    if (this.cancelBtn) {
      this.cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeSettings();
      });
    }
    
    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveSettings();
      });
    }
    
    // Input validation
    if (this.minutesInput) {
      this.minutesInput.addEventListener('input', () => this.validateInput());
    }
    
    // Keyboard events
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    console.log('All events bound successfully');
  }
  
  initAudio() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('Audio context initialized');
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }
  
  playNotificationSound() {
    console.log('Playing notification sound');
    
    if (!this.audioContext) {
      this.playFallbackSound();
      return;
    }
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.5);
      
      // Play additional beeps for expired state
      if (this.state === 'expired') {
        setTimeout(() => {
          this.playAdditionalBeep();
        }, 600);
      }
      
    } catch (error) {
      console.warn('Error playing notification sound:', error);
      this.playFallbackSound();
    }
  }
  
  playAdditionalBeep() {
    if (!this.audioContext || this.state !== 'expired') return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.3);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Error playing additional beep:', error);
    }
  }
  
  playFallbackSound() {
    try {
      const audio = new Audio();
      audio.volume = 0.3;
      // Simple beep sound data
      audio.src = 'data:audio/wav;base64,UklGRr4CAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YZoCAAC4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4';
      audio.play().catch(e => console.warn('Fallback audio failed:', e));
    } catch (error) {
      console.warn('Fallback sound creation failed:', error);
    }
  }
  
  validateInput() {
    const value = parseInt(this.minutesInput.value);
    if (isNaN(value) || value < 1) {
      this.minutesInput.value = 1;
    } else if (value > 60) {
      this.minutesInput.value = 60;
    }
  }
  
  openSettings() {
    console.log('Opening settings modal');
    if (this.minutesInput) {
      this.minutesInput.value = this.minutes;
    }
    if (this.settingsModal) {
      this.settingsModal.classList.remove('hidden');
      if (this.minutesInput) {
        setTimeout(() => {
          this.minutesInput.focus();
          this.minutesInput.select();
        }, 100);
      }
    }
  }
  
  closeSettings() {
    console.log('Closing settings modal');
    if (this.settingsModal) {
      this.settingsModal.classList.add('hidden');
    }
  }
  
  saveSettings() {
    console.log('Saving settings');
    const newMinutes = parseInt(this.minutesInput.value);
    if (newMinutes >= 1 && newMinutes <= 60) {
      this.minutes = newMinutes;
      console.log('Timer set to', this.minutes, 'minutes');
      if (this.state === 'idle') {
        this.updateDisplay();
      }
    }
    this.closeSettings();
  }
  
  startTimer() {
    console.log('Starting timer for', this.minutes, 'minutes');
    if (this.state !== 'idle') {
      console.log('Timer not idle, current state:', this.state);
      return;
    }
    
    this.totalSeconds = this.minutes * 60;
    this.remainingSeconds = this.totalSeconds;
    this.state = 'running';
    
    console.log('Timer state changed to running. Total seconds:', this.totalSeconds);
    
    this.showRunningControls();
    this.resetAnnouncements();
    // 確保使用者互動後可播放語音
    if (this.tts?.synth && this.tts.synth.paused) {
      try { this.tts.synth.resume(); } catch(e){}
    }

    if (this.timerApp) {
      this.timerApp.classList.add('timer-running');
    }
    
    // Start the countdown interval
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      console.log('Countdown:', this.remainingSeconds, 'seconds remaining');
      this.updateDisplay();
      
      if (this.remainingSeconds <= 0) {
        console.log('Timer expired!');
        this.timerExpired();
      }
    }, 1000);
    
    this.updateDisplay();
  }
  
  stopTimer() {
    console.log('Stopping timer');
    if (this.state !== 'running' && this.state !== 'expired') return;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.state = 'idle';
    this.remainingSeconds = 0;
    
    this.showStartControls();
    if (this.timerApp) {
      this.timerApp.classList.remove('timer-running', 'timer-expired');
    }
    this.tts.cancel();
    this.resetAnnouncements();
    this.updateDisplay();
  }
  
  nextTimer() {
    console.log('Starting next timer');
    if (this.state !== 'running' && this.state !== 'expired') return;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    
    if (this.timerApp) {
      this.timerApp.classList.remove('timer-expired');
    }
    
    this.remainingSeconds = this.totalSeconds;

    this.tts.cancel();
    this.resetAnnouncements();
    this.state = 'running';
    
    if (this.timerApp) {
      this.timerApp.classList.add('timer-running');
    }
    
    this.timerInterval = setInterval(() => {
      this.remainingSeconds--;
      console.log('Next countdown:', this.remainingSeconds, 'seconds remaining');
      this.updateDisplay();
      
      if (this.remainingSeconds <= 0) {
        this.timerExpired();
      }
    }, 1000);
    
    this.updateDisplay();
  }
  
  handleAnnouncements() {
    const s = this.remainingSeconds;

    // 20 秒播報
    if (s === 20 && !this.announced20) {
      this.announced20 = true;
      // 用廣東話：仲有二十秒
      this.tts.speak("仲有二十秒");
    }

    // 10 秒播報
    if (s === 10 && !this.announced10) {
      this.announced10 = true;
      this.tts.speak("仲有十秒");
    }

    // 5,4,3,2,1 每秒播報
    if (s <= 5 && s >= 1 && !this.announced5to1.has(s)) {
      this.announced5to1.add(s);
      // 建議簡短詞以減少重疊（亦可用「仲有X秒」）
      const map = {5:"五",4:"四",3:"三",2:"二",1:"一"};
      this.tts.speak(map[s]);
    }

    // 0 秒結束時，保留您原本的結束提示音或語音
    if (s === 0) {
      // 可選：到點亦用語音「時間到」或保留原來蜂鳴
      // this.tts.speak("時間到");
      // 或維持原本 beep
    }
  }

  // 範例：既有的 tick（請合併邏輯到您的計時流程）
  tick() {
    if (this.remainingSeconds > 0) {
      this.remainingSeconds -= 1;
      this.updateDisplay();
      this.handleAnnouncements();
    } else {
      // 到 0 的既有流程（播放聲音、切換按鈕等）
      // ...
    }
  }
  
  timerExpired() {
    console.log('Timer expired');
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    this.state = 'expired';
    this.remainingSeconds = 0;
    
    if (this.timerApp) {
      this.timerApp.classList.remove('timer-running');
      this.timerApp.classList.add('timer-expired');
    }
    
    this.updateDisplay();
    this.playNotificationSound();
  }
  
  showStartControls() {
    console.log('Showing start controls');
    if (this.startControls) {
      this.startControls.classList.remove('hidden');
      console.log('Start controls shown');
    }
    if (this.runningControls) {
      this.runningControls.classList.add('hidden');
      console.log('Running controls hidden');
    }
  }
  
  showRunningControls() {
    console.log('Showing running controls');
    if (this.startControls) {
      this.startControls.classList.add('hidden');
      console.log('Start controls hidden');
    }
    if (this.runningControls) {
      this.runningControls.classList.remove('hidden');
      console.log('Running controls shown');
    }
  }
  
  updateDisplay() {
    let displaySeconds;
    
    if (this.state === 'idle') {
      displaySeconds = 0; // Show 00:00 when idle
    } else {
      displaySeconds = Math.max(0, this.remainingSeconds);
    }
    
    const minutes = Math.floor(displaySeconds / 60);
    const seconds = displaySeconds % 60;
    
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (this.timerDisplay) {
      this.timerDisplay.textContent = formattedTime;
      console.log('Display updated to:', formattedTime, 'State:', this.state);
    }
  }
  
  handleKeyboard(event) {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (this.state === 'idle') {
          this.startTimer();
        } else if (this.state === 'running' || this.state === 'expired') {
          this.stopTimer();
        }
        break;
      case 'KeyS':
        if (!event.ctrlKey && !event.altKey) {
          event.preventDefault();
          this.openSettings();
        }
        break;
      case 'KeyN':
        if (this.state === 'running' || this.state === 'expired') {
          event.preventDefault();
          this.nextTimer();
        }
        break;
      case 'Escape':
        if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
          this.closeSettings();
        }
        break;
      case 'Enter':
        if (this.settingsModal && !this.settingsModal.classList.contains('hidden')) {
          this.saveSettings();
        }
        break;
    }
  }
  
  resumeAudio() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Global timer instance
let globalTimer = null;

// Initialize the timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, creating timer instance');
  globalTimer = new CountdownTimer();
  window.timer = globalTimer; // Make it accessible globally
  
  // Resume audio context on any user interaction
  const resumeAudio = () => {
    if (globalTimer && globalTimer.audioContext && globalTimer.audioContext.state === 'suspended') {
      globalTimer.audioContext.resume();
      console.log('Audio context resumed');
    }
  };
  
  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('keydown', resumeAudio, { once: true });
  document.addEventListener('touchstart', resumeAudio, { once: true });
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page is hidden');
  } else {
    console.log('Page is visible');
  }
});

// Prevent accidental page refresh when timer is running
window.addEventListener('beforeunload', (event) => {
  if (globalTimer && globalTimer.state === 'running') {
    event.preventDefault();
    event.returnValue = '計時器正在運行中，確定要離開頁面嗎？';
    return event.returnValue;
  }
});