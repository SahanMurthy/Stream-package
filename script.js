const scenes = document.querySelectorAll('.scene');
// Control buttons are now only for the local control panel, not used in OBS scenes
const controlButtons = {
    starting: document.getElementById('btn-starting'),
    intro: document.getElementById('btn-intro'),
    horizontal: document.getElementById('btn-horizontal'),
    vertical: document.getElementById('btn-vertical'),
    brb: document.getElementById('btn-brb'),
    outro: document.getElementById('btn-outro'),
};
const eventButtons = {
    sub: document.getElementById('btn-sub'),
    superchat: document.getElementById('btn-superchat'),
};

let countdownInterval;
let isAudioInitialized = false;
const sounds = {};
let musicBass, musicPad, subSynth, superchatBell, superchatBass;

// --- Professional Synthesized Audio Engine ---
function initAudio() {
    if (isAudioInitialized) return;
    
    const setupAudio = async () => {
        await Tone.start(); 
        
        const masterReverb = new Tone.Reverb(2.5).toDestination();
        masterReverb.wet.value = 0.4;

        const masterDelay = new Tone.FeedbackDelay("8n", 0.5).connect(masterReverb);
        const masterFilter = new Tone.AutoFilter("2n").connect(masterReverb).start();

        musicBass = new Tone.MonoSynth({
            oscillator: { type: "fmsawtooth", modulationType: "triangle", modulationIndex: 1, harmonicity: 0.5 },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
            filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0, release: 1, baseFrequency: 100, octaves: 5 }
        }).connect(masterFilter);
        musicBass.volume.value = -10;

        musicPad = new Tone.PolySynth(Tone.AMSynth, {
            harmonicity: 1.5,
            envelope: { attack: 1, decay: 0.5, sustain: 0.5, release: 2 },
        }).connect(masterFilter);
        musicPad.volume.value = -20;
        
        sounds.musicLoop = new Tone.Part((time, value) => {
            musicBass.triggerAttackRelease(value.note, value.duration, time);
            musicPad.triggerAttackRelease(value.chord, "1m", time);
        }, [
            { time: "0:0", note: "C2", duration: "4n", chord: ["C3", "Eb3", "G3"] },
            { time: "0:2", note: "G2", duration: "4n", chord: ["G3", "Bb3", "D4"] },
            { time: "1:0", note: "Eb2", duration: "4n", chord: ["Eb3", "G3", "Bb3"] },
            { time: "1:2", note: "Bb2", duration: "4n", chord: ["Bb2", "D3", "F3"] },
        ]).start(0);
        sounds.musicLoop.loop = true;
        sounds.musicLoop.loopEnd = "2m";

        subSynth = new Tone.MonoSynth({
            oscillator: { type: "square" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 },
            filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1, baseFrequency: 400, octaves: 3 }
        }).connect(masterDelay);
        subSynth.volume.value = -12;
        sounds.subscriber = (time) => {
            subSynth.triggerAttackRelease("C5", "16n", time);
            subSynth.setNote("G5", time + 0.1);
        };

        superchatBell = new Tone.MetalSynth({
            frequency: 300,
            harmonicity: 7.1,
            modulationIndex: 20,
            resonance: 4000,
            octaves: 1.5,
            envelope: { attack: 0.001, decay: 1.4, release: 0.2 },
        }).connect(masterDelay);
        superchatBell.volume.value = -10;

        superchatBass = new Tone.MembraneSynth({
            pitchDecay: 0.01,
            octaves: 4,
            envelope: { attack: 0.001, decay: 0.3, sustain: 0.01, release: 0.2 },
        }).connect(masterReverb);
        superchatBass.volume.value = -8;
        
        sounds.superchat = (time) => {
            superchatBass.triggerAttackRelease("C2", "8n", time);
            superchatBell.triggerAttackRelease("C5", "2n", time + 0.05);
        };
        
        isAudioInitialized = true;
        console.log("Remastered Professional Audio Engine Initialized.");
    };
    
    setupAudio();
}

function playMusic() {
     if (isAudioInitialized && Tone.Transport.state !== 'started') {
        Tone.Transport.start();
    }
}

function stopMusic() {
    if (isAudioInitialized && Tone.Transport.state === 'started') {
        Tone.Transport.stop();
        Tone.Transport.cancel(0); 
    }
}

function playSound(type) {
    if (!isAudioInitialized) return;
    const now = Tone.now();
    switch (type) {
        case 'subscriber':
            sounds.subscriber(now);
            break;
        case 'superchat':
            sounds.superchat(now);
            break;
    }
}


function switchScene(sceneId) {
    stopMusic(); 

    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }

    scenes.forEach(scene => {
        const isActive = scene.id === `${sceneId}-scene`;
        scene.classList.toggle('active', isActive);
         if (isActive) {
            const logoPaths = scene.querySelectorAll('.logo-svg path');
            if(logoPaths) {
                logoPaths.forEach(path => {
                    path.style.animation = 'none';
                    path.offsetHeight; 
                    path.style.animation = null;
                });
            }
        }
    });
    
    Object.values(controlButtons).forEach(btn => btn.classList.remove('active'));
    if (controlButtons[sceneId]) {
        controlButtons[sceneId].classList.add('active');
    }

    if (sceneId === 'starting') {
        startCountdown(300);
    }
    if (sceneId === 'intro' || sceneId === 'outro') {
        playMusic();
    }
}

function startCountdown(durationInSeconds) {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;
    let timer = durationInSeconds;
    const updateTimer = () => {
        const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
        const seconds = String(timer % 60).padStart(2, '0');
        countdownEl.textContent = `${minutes}:${seconds}`;
    };
    
    updateTimer();
    countdownInterval = setInterval(() => {
        timer--;
        updateTimer();
        if (timer < 0) {
            clearInterval(countdownInterval);
            countdownEl.textContent = "00:00";
        }
    }, 1000);
}

function handleAlert(type, details) {
    let title = '', detail = '', icon = '⭐', alertClass = '';
    
    if (type === 'subscriber') {
        title = 'New Subscriber!';
        detail = details.username;
        icon = '⭐';
        alertClass = 'subscriber-alert';
        document.querySelectorAll('.latest-sub').forEach(el => el.textContent = details.username);
        playSound('subscriber');
    } else if (type === 'superchat') {
        title = `${details.username} | ${details.amount}`;
        detail = `<div class="detail">${details.message}</div>`;
        icon = '💰';
        alertClass = 'superchat-alert';
        playSound('superchat');
    }

    const alertHTML = `
        <div class="alert-box ${alertClass}">
            <div class="icon">${icon}</div>
            <div class="message">
                <p class="title">${title}</p>
                ${type === 'subscriber' ? `<p class="detail">${detail}</p>` : detail}
            </div>
        </div>`;
    
    // An alert can happen on any scene that has an alert wrapper
    const alertWrapper = document.querySelector('.scene.active .alert-wrapper');
    if (alertWrapper) {
        displayAlert(alertWrapper, alertHTML);
    }
}

function displayAlert(container, html) {
    if (!container) return;
    const alertNode = document.createElement('div');
    alertNode.innerHTML = html;
    const alertBox = alertNode.firstElementChild;
    
    container.appendChild(alertBox);

    setTimeout(() => {
        alertBox.style.animation = 'fadeOut 0.5s ease-out forwards';
         setTimeout(() => {
            alertBox.remove();
        }, 500);
    }, 5000);
}


// --- StreamElements Integration ---
// This function will be called by StreamElements when a new event happens
window.addEventListener('onEventReceived', function (obj) {
    if (!obj.detail.event) {
      return;
    }
    const event = obj.detail.event;

    if (event.type === 'subscriber') {
        initAudio();
        handleAlert('subscriber', { username: event.data.displayName });
    }
    if (event.type === 'superchat') {
        initAudio();
        handleAlert('superchat', { 
            username: event.data.displayName,
            amount: event.data.displayString,
            message: event.data.message
        });
    }
});

// This function is called when the widget is loaded
window.addEventListener('onWidgetLoad', function (obj) {
    // You can use obj.detail.fieldData to get any custom fields you set up
    initAudio();
});


// --- Initialization Logic for local testing/control panel ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sceneParam = urlParams.get('scene');

    if (sceneParam) {
        document.body.classList.add('scene-view');
        initAudio(); 
        switchScene(sceneParam); 
    } else {
        // This is the control panel view
        switchScene('starting');
        // Add manual triggers for testing
        eventButtons.sub.addEventListener('click', () => {
            initAudio();
            handleAlert('subscriber', { username: 'TestSubscriber' });
        });
        eventButtons.superchat.addEventListener('click', () => {
            initAudio();
            handleAlert('superchat', {
                username: 'TestDonator',
                amount: '$5.00',
                message: 'This is a test!'
            });
        });
         Object.keys(controlButtons).forEach(key => {
            controlButtons[key].addEventListener('click', () => {
                initAudio();
                switchScene(key);
            });
        });
    }
});

