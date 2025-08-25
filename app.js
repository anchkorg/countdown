// ========= 廣東話 TTS 管理 =========
class CantoneseTTS {
    constructor(selectElem) {
        this.synth = window.speechSynthesis;
        this.voices = [];
        this.voice = null;
        this.queue = [];
        this.isSpeaking = false;
        this.selectElem = selectElem;

        this._onVoicesChanged = this._onVoicesChanged.bind(this);
        if (typeof this.synth.onvoiceschanged !== "undefined") {
            this.synth.onvoiceschanged = this._onVoicesChanged;
        }
        this.initVoices();
        if (this.selectElem) {
            this.selectElem.addEventListener("change", () => {
                const idx = this.selectElem.value;
                this.voice = this.voices[idx] || null;
            });
        }
    }
    initVoices() {
        // 大多瀏覽器 voices 會延遲載入
        setTimeout(() => {
            this.voices = this.synth.getVoices();
            let defaultIndex = 0;
            let foundCantoneseIndex = -1;
            this.voices.forEach((v, idx) => {
                const match = /yue|zh[-_]HK|cantonese/i.test(
                    `${v.lang} ${v.name}`
                );
                if (match && foundCantoneseIndex === -1) foundCantoneseIndex = idx;
            });
            if (this.selectElem) {
                this.selectElem.innerHTML = '';
                this.voices.forEach((v, i) => {
                    const label = `${v.name} (${v.lang})`;
                    const opt = document.createElement("option");
                    opt.value = i;
                    if (i === foundCantoneseIndex) opt.selected = true;
                    opt.textContent = label;
                    this.selectElem.appendChild(opt);
                });
            }
            // 選預設：優先廣東話
            if (foundCantoneseIndex !== -1) {
                this.voice = this.voices[foundCantoneseIndex];
            } else if (this.voices.length > 0) {
                this.voice = this.voices[0];
            }
        }, 200);
    }
    _onVoicesChanged() {
        this.initVoices();
    }
    speak(text, opts = {}) {
        if (!this.synth) return;
        const utter = new SpeechSynthesisUtterance(text);
        if (this.voice) utter.voice = this.voice;
        utter.rate = opts.rate ?? 1.05; // 廣東話語音通常要稍微快一點較自然
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

// ========= 主倒數計時器 =========
class CountdownTimer {
    constructor() {
        // 初始化元素
        this.minutes = 5;
        this.totalSeconds = 300;
        this.remainingSeconds = 300;
        this.timerInterval = null;
        this.state = "idle";
        this.announced20 = false;
        this.announced10 = false;
        this.announced5to1 = new Set();

        // UI Elements
        this.timerDisplay = document.getElementById('timerDisplay');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.startControls = document.getElementById('startControls');
        this.runningControls = document.getElementById('runningControls');
        this.settingsModal = document.getElementById('settingsModal');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalClose = document.getElementById('modalClose');
        this.minutesInput = document.getElementById('minutesInput');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.voiceSelect = document.getElementById('voiceSelect');

        // TTS
        this.tts = new CantoneseTTS(this.voiceSelect);

        this.bindEvents();
        this.updateDisplay();
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startTimer());
        this.stopBtn.addEventListener('click', () => this.stopTimer());
        this.nextBtn.addEventListener('click', () => this.nextTimer());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        this.modalOverlay.addEventListener('click', () => this.closeSettings());
        this.modalClose.addEventListener('click', () => this.closeSettings());
        this.cancelBtn.addEventListener('click', () => this.closeSettings());
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.minutesInput.addEventListener('input', e => {
            const v = Math.max(1, Math.min(60, parseInt(e.target.value) || 5));
            this.minutesInput.value = v;
        });
    }

    resetAnnouncements() {
        this.announced20 = false;
        this.announced10 = false;
        this.announced5to1.clear();
    }

    openSettings() {
        this.minutesInput.value = this.minutes;
        this.settingsModal.classList.add('show');
        this.modalOverlay.classList.add('show');
    }
    closeSettings() {
        this.settingsModal.classList.remove('show');
        this.modalOverlay.classList.remove('show');
    }
    saveSettings() {
        this.minutes = Math.max(1, Math.min(60, parseInt(this.minutesInput.value) || 5));
        this.closeSettings();
        this.updateDisplay();
    }

    startTimer() {
        this.totalSeconds = this.minutes * 60;
        this.remainingSeconds = this.totalSeconds;
        this.resetAnnouncements();
        this.tts.cancel();
        this.updateDisplay();
        this.setState('running');
        this.tick(); // 立即顯示
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => this.tick(), 1000);
    }
    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.tts.cancel();
        this.setState('idle');
        this.resetAnnouncements();
        this.updateDisplay();
    }
    nextTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.tts.cancel();
        this.resetAnnouncements();
        this.remainingSeconds = this.totalSeconds;
        this.updateDisplay();
        this.setState('running');
        this.tick();
        this.timerInterval = setInterval(() => this.tick(), 1000);
    }
    setState(newState) {
        this.state = newState;
        if (newState === 'idle') {
            this.startControls.classList.remove('hidden');
            this.runningControls.classList.add('hidden');
        } else if (newState === 'running') {
            this.startControls.classList.add('hidden');
            this.runningControls.classList.remove('hidden');
        }
    }
    updateDisplay() {
        const mm = String(Math.floor(this.remainingSeconds / 60)).padStart(2, '0');
        const ss = String(this.remainingSeconds % 60).padStart(2, '0');
        this.timerDisplay.textContent = `${mm}:${ss}`;
    }
    handleAnnouncements() {
        const s = this.remainingSeconds;
        if (s === 20 && !this.announced20) {
            this.announced20 = true;
            this.tts.speak("仲有二十秒");
        } else if (s === 10 && !this.announced10) {
            this.announced10 = true;
            this.tts.speak("仲有十秒");
        } else if (s <= 5 && s >= 1 && !this.announced5to1.has(s)) {
            this.announced5to1.add(s);
            const map = {5:"五",4:"四",3:"三",2:"二",1:"一"};
            this.tts.speak(map[s]);
        }
    }
    tick() {
        if (this.remainingSeconds > 0) {
            this.remainingSeconds--;
            this.updateDisplay();
            this.handleAnnouncements();
        } else {
            // 時間到時蜂鳴聲（如不需語音提示可保留原邏輯）
            this.playBeep();
            this.stopTimer(); // 預設結束即停止計時
        }
    }
    playBeep() {
        // 用 AudioContext 播放純音
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = 1100;
            gain.gain.value = 0.18;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
            osc.onended = () => ctx.close();
        }
    }
}

// ===== 啟動 Timer =====
window.addEventListener('DOMContentLoaded', () => {
    new CountdownTimer();
});
