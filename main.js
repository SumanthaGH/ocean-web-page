// UI Elements
const video = document.getElementById('cinematic-video');
const tvBox = document.getElementById('tv-box');
const guideUI = document.getElementById('guide-ui');
const guideText = document.getElementById('guide-text');
const restartBtn = document.getElementById('restart-btn');

// ==========================================
// CONFIGURATION
// ==========================================

// CAMERA FLOW SPEED
const CAMERA_SPEED = 4.0;

// Add your specific timestamps here! (In seconds)
const PAUSE_POINTS = [
    5.0,   
    10.0,  
    20.0,  
    27.0,  
    35.0   
];
// ==========================================

// Apply the speed configuration
video.playbackRate = CAMERA_SPEED;

let currentCheckpointIndex = 0;
let isWaitingForInput = true;
let hasStarted = false;
let videoEnded = false;

// Set initial boot-up state
gsap.set(guideUI, { opacity: 0 });
// Fade in the guide asking to press enter
gsap.to(guideUI, { opacity: 1, duration: 2, delay: 1 });

// --- CRAZY CAMERA MOVEMENT ENGINE ---
function triggerCrazyCamera(isPlaying) {
    if (isPlaying) {
        gsap.to(tvBox, {
            scale: 1.1 + Math.random() * 0.15,
            rotationZ: (Math.random() - 0.5) * 6,
            x: (Math.random() - 0.5) * 60,
            y: (Math.random() - 0.5) * 60,
            duration: 2.5,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            overwrite: "auto"
        });
    } else {
        gsap.to(tvBox, {
            scale: 1.0,
            rotationZ: 0,
            x: 0,
            y: 0,
            duration: 1.2,
            ease: "back.out(1.5)",
            overwrite: "auto"
        });
    }
}

// Check exactly when to pause
video.addEventListener('timeupdate', () => {
    if (isWaitingForInput || currentCheckpointIndex >= PAUSE_POINTS.length) return;
    
    const nextPauseTime = PAUSE_POINTS[currentCheckpointIndex];
    
    if (video.currentTime >= nextPauseTime) {
        video.pause();
        isWaitingForInput = true;
        triggerCrazyCamera(false);
        
        // Show the prompt for the next checkpoint
        guideText.innerHTML = "Press Enter to dive deeper";
        if (window.EntryModel) window.EntryModel.visible = true;
        if (window.ExitModel) window.ExitModel.visible = false;
        gsap.to(guideUI, { opacity: 1, duration: 0.5 });
    }
});

// Primary Input Controller
window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (videoEnded) return;

        // Boot-Up sequence (first press)
        if (!hasStarted) {
            hasStarted = true;
            isWaitingForInput = false;
            
            // Hide the boot-up text
            gsap.to(guideUI, { opacity: 0, duration: 0.5 });
            
            triggerCrazyCamera(true);
            video.play().catch(err => console.error("Autoplay blocked", err));
            return;
        }

        // Subsequent checkpoint presses
        if (isWaitingForInput && currentCheckpointIndex < PAUSE_POINTS.length) {
            gsap.to(guideUI, { opacity: 0, duration: 0.3 });
            
            isWaitingForInput = false;
            currentCheckpointIndex++;
            
            triggerCrazyCamera(true);
            video.play();
        }
    }
});

// Final Shark state
video.addEventListener('ended', () => {
    triggerCrazyCamera(false);
    isWaitingForInput = true;
    videoEnded = true; 
    
    // Switch to Shark Dialogue
    guideText.innerHTML = "Shark is your end so go back to first.";
    if (window.EntryModel) window.EntryModel.visible = false;
    if (window.ExitModel) window.ExitModel.visible = true;
    
    restartBtn.style.display = 'inline-block';
    
    gsap.to(guideUI, { opacity: 1, duration: 1, ease: 'power2.out' });
});

// The Restart Button logic
restartBtn.addEventListener('click', () => {
    gsap.to(guideUI, { opacity: 0, duration: 0.5, onComplete: () => {
        // Reset states
        currentCheckpointIndex = 0;
        isWaitingForInput = true;
        hasStarted = false;
        videoEnded = false; 
        video.currentTime = 0;
        
        // Reset the Guide text to boot-up phase
        guideText.innerHTML = "Press Enter to begin the dive";
        if (window.EntryModel) window.EntryModel.visible = true;
        if (window.ExitModel) window.ExitModel.visible = false;
        
        restartBtn.style.display = 'none';
        
        // Fade it back in
        gsap.to(guideUI, { opacity: 1, duration: 0.8 });
    }});
});
