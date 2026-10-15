// Интерактивность сайта. Тексты и оформление можно менять отдельно в index.html и style.css.
(() => {
    "use strict";

    // -------------------- Звёздное небо --------------------
    const canvas = document.getElementById("starfield");
    const ctx = canvas.getContext("2d");
    let stars = [];
    let width = 0;
    let height = 0;
    let animationFrame = 0;

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const count = Math.min(Math.floor(width * height / 2500), 420);
        stars = Array.from({ length: count }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.35 + 0.25,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.018 + 0.004,
            drift: (Math.random() - 0.5) * 0.06
        }));
    }

    function animateStars() {
        ctx.clearRect(0, 0, width, height);
        for (const star of stars) {
            star.phase += star.speed;
            star.y += star.drift;
            if (star.y > height + 2) star.y = -2;
            if (star.y < -2) star.y = height + 2;
            const opacity = 0.28 + (Math.sin(star.phase) + 1) * 0.34;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 159, 28, ${opacity})`;
            ctx.fill();
        }
        animationFrame = requestAnimationFrame(animateStars);
    }

    resizeCanvas();
    animateStars();
    window.addEventListener("resize", resizeCanvas);

    // -------------------- Переход к открытке --------------------
    const beginJourney = document.getElementById("beginJourney");
    beginJourney.addEventListener("click", () => {
        document.getElementById("letter").scrollIntoView({ behavior: "smooth" });
        playTone(660, 0.07);
    });

    // -------------------- Открытка-конверт --------------------
    const envelopeButton = document.getElementById("openLetter");
    const letterCard = document.getElementById("letterCard");
    const closeLetter = document.getElementById("closeLetter");

    envelopeButton.addEventListener("click", () => {
        envelopeButton.classList.add("opened");
        letterCard.classList.remove("hidden");
        envelopeButton.setAttribute("aria-expanded", "true");
        playTone(520, 0.09);
        setTimeout(() => letterCard.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
    });

    closeLetter.addEventListener("click", () => {
        letterCard.classList.add("hidden");
        envelopeButton.classList.remove("opened");
        envelopeButton.setAttribute("aria-expanded", "false");
    });

    // -------------------- Призраки с посланиями --------------------
    const popup = document.getElementById("memoryPopup");
    const popupTitle = document.getElementById("memoryTitle");
    const popupMessage = document.getElementById("memoryMessage");
    const closeMemory = () => popup.classList.add("hidden");

    document.querySelectorAll(".memory-star").forEach((button) => {
        button.addEventListener("click", () => {
            popupTitle.textContent = button.dataset.title || "Особый призрак";
            popupMessage.textContent = button.dataset.message || "Небольшое послание для тебя.";
            popup.classList.remove("hidden");
            playTone(740, 0.08);
            document.getElementById("closeMemory").focus();
        });
    });

    document.getElementById("closeMemory").addEventListener("click", closeMemory);
    document.getElementById("memoryOkay").addEventListener("click", closeMemory);
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMemory();
    });

    // -------------------- Звуковые сигналы без файлов --------------------
    let soundEnabled = false;
    let audioContext = null;
    const soundToggle = document.getElementById("soundToggle");
    const soundIcon = document.getElementById("soundIcon");
    const soundLabel = soundToggle.querySelector(".sound-label");

    function playTone(frequency = 600, duration = 0.08) {
        if (!soundEnabled) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) return;
            audioContext = audioContext || new AudioContextClass();
            if (audioContext.state === "suspended") audioContext.resume();
            const oscillator = audioContext.createOscillator();
            const gain = audioContext.createGain();
            oscillator.type = "sine";
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.07, audioContext.currentTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
            oscillator.connect(gain);
            gain.connect(audioContext.destination);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + duration + 0.02);
        } catch (error) {
            // Sound is an optional extra; the site still works if audio is unavailable.
        }
    }

    soundToggle.addEventListener("click", () => {
        soundEnabled = !soundEnabled;
        soundToggle.setAttribute("aria-pressed", String(soundEnabled));
        soundIcon.textContent = soundEnabled ? "🎵" : "♪";
        soundLabel.textContent = soundEnabled ? "Звук включён" : "Звук выключен";
        if (soundEnabled) playTone(880, 0.12);
    });

    // -------------------- Мини-игра «Охота за приведениями и мышками» --------------------
    // Настройки приходят из content.py (см. GAME_DURATION, GAME_WIN_HEADLINE и т.д.).
    const gameConfig = Object.assign({
        duration: 30,
        winMessages: [],
        winHeadline: "Охота окончена! 🎃",
        winSub: "Ты поймал {count} существ.",
        loseHeadline: "Время вышло 👻",
        loseSub: "Поймано: {count}. Попробуй ещё раз!"
    }, window.GAME_CONFIG || {});

    const gameField = document.getElementById("gameField");
    const gameIntro = document.getElementById("gameIntro");
    const gameMessage = document.getElementById("gameMessage");
    const startGame = document.getElementById("startGame");
    const restartGame = document.getElementById("restartGame");
    const scoreElement = document.getElementById("score");
    const timeElement = document.getElementById("timeLeft");
    const playsElement = document.getElementById("playsCount");
    const reward = document.getElementById("reward");
    const rewardMessage = document.getElementById("rewardMessage");
    const finalButton = document.getElementById("finalButton");
    const finale = document.getElementById("finale");

    const gameDuration = Number(gameConfig.duration) || 30;
    const winMessages = Array.isArray(gameConfig.winMessages) ? gameConfig.winMessages : [];

    // Типы существ: привидение (1 очко) и мышка (2 очка, быстрее)
    const CREATURE_TYPES = [
        { emoji: "👻", points: 1, speed: 2.6, size: 44 },
        { emoji: "🦇", points: 2, speed: 3.4, size: 38 }
    ];

    // Счётчики хранятся в браузере, поэтому сохраняются между перезагрузками.
    const STORAGE_PLAYS = "halloweenHuntPlays";
    const STORAGE_WINS = "halloweenHuntWins";

    function readCounter(key) {
        const value = parseInt(window.localStorage.getItem(key) || "0", 10);
        return Number.isFinite(value) && value >= 0 ? value : 0;
    }

    let plays = readCounter(STORAGE_PLAYS);
    let wins = readCounter(STORAGE_WINS);

    let score = 0;
    let timeLeft = gameDuration;
    let gameRunning = false;
    let countdownInterval = null;
    let spawnTimeout = null;

    function refreshPlays() {
        if (playsElement) playsElement.textContent = String(plays);
    }
    refreshPlays();

    function clearGameTimers() {
        if (countdownInterval) clearInterval(countdownInterval);
        if (spawnTimeout) clearTimeout(spawnTimeout);
        countdownInterval = null;
        spawnTimeout = null;
    }

    function removeCreatures() {
        gameField.querySelectorAll(".game-creature").forEach((c) => c.remove());
    }

    function updateGameStats() {
        scoreElement.textContent = String(score);
        timeElement.textContent = String(timeLeft);
    }

    function setGameMessage(headline, sub) {
        gameMessage.innerHTML = "";
        const strong = document.createElement("strong");
        strong.textContent = headline;
        gameMessage.appendChild(strong);
        if (sub) {
            gameMessage.appendChild(document.createElement("br"));
            gameMessage.appendChild(document.createTextNode(sub));
        }
        gameMessage.classList.remove("hidden");
    }

    function sparkleBurst(x, y) {
        const burst = document.createElement("span");
        burst.className = "collect-burst";
        burst.textContent = "🎃";
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        gameField.appendChild(burst);
        setTimeout(() => burst.remove(), 520);
    }

    function spawnCreature() {
        if (!gameRunning) return;

        const corners = ["tl", "tr", "bl", "br"];
        const corner = corners[Math.floor(Math.random() * corners.length)];
        const type = CREATURE_TYPES[Math.floor(Math.random() * CREATURE_TYPES.length)];

        const creature = document.createElement("button");
        creature.type = "button";
        creature.className = "game-creature";
        creature.textContent = type.emoji;
        creature.dataset.points = type.points;

        const size = type.size;
        const fw = gameField.clientWidth || 600;
        const fh = gameField.clientHeight || 300;

        let x, y, tx, ty;
        if (corner === "tl") { x = 0; y = 0; tx = fw - size; ty = fh - size; }
        else if (corner === "tr") { x = fw - size; y = 0; tx = 0; ty = fh - size; }
        else if (corner === "bl") { x = 0; y = fh - size; tx = fw - size; ty = 0; }
        else { x = fw - size; y = fh - size; tx = 0; ty = 0; }

        creature.style.left = `${x}px`;
        creature.style.top = `${y}px`;
        creature.style.width = `${size}px`;
        creature.style.height = `${size}px`;
        creature.style.fontSize = `${size * 0.6}px`;
        creature.style.transition = `left ${type.speed}s linear, top ${type.speed}s linear`;

        gameField.appendChild(creature);

        // Небольшая задержка, чтобы браузер применил transition после вставки в DOM.
        requestAnimationFrame(() => {
            creature.style.left = `${tx}px`;
            creature.style.top = `${ty}px`;
        });

        creature.addEventListener("click", (event) => {
            event.stopPropagation();
            if (!gameRunning || !creature.isConnected) return;
            score += Number(creature.dataset.points);
            updateGameStats();
            playTone(600 + score * 12, 0.05);
            sparkleBurst(x + size / 2 - 8, y + size / 2 - 12);
            creature.remove();
        });

        // Существо исчезает само, если его не поймали.
        setTimeout(() => {
            if (creature.isConnected) creature.remove();
        }, type.speed * 1000 + 150);

        if (gameRunning) {
            spawnTimeout = setTimeout(spawnCreature, 750);
        }
    }

    function finishGame() {
        gameRunning = false;
        clearGameTimers();
        removeCreatures();
        restartGame.classList.remove("hidden");

        plays += 1;
        window.localStorage.setItem(STORAGE_PLAYS, String(plays));
        refreshPlays();

        const sub = gameConfig.winSub.replace("{count}", score);
        setGameMessage(gameConfig.winHeadline, sub);

        if (rewardMessage && winMessages.length) {
            const index = (plays - 1) % winMessages.length;
            rewardMessage.textContent = winMessages[index];
        }
        reward.classList.remove("hidden");
        playTone(880, 0.18);
        setTimeout(() => reward.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
    }

    function startNewGame() {
        clearGameTimers();
        removeCreatures();
        score = 0;
        timeLeft = gameDuration;
        gameRunning = true;
        reward.classList.add("hidden");
        restartGame.classList.add("hidden");
        gameIntro.classList.add("hidden");
        gameMessage.classList.add("hidden");
        updateGameStats();
        spawnCreature();

        countdownInterval = setInterval(() => {
            timeLeft -= 1;
            updateGameStats();
            if (timeLeft <= 0) finishGame();
        }, 1000);
    }

    startGame.addEventListener("click", startNewGame);
    restartGame.addEventListener("click", startNewGame);

    finalButton.addEventListener("click", () => {
        finale.classList.remove("hidden");
        finale.scrollIntoView({ behavior: "smooth", block: "center" });
        playTone(880, 0.12);
    });

    document.getElementById("backToStart").addEventListener("click", () => {
        finale.classList.add("hidden");
        document.getElementById("home").scrollIntoView({ behavior: "smooth" });
    });

    // Ensure timers are cleared if the page is unloaded.
    window.addEventListener("beforeunload", () => {
        clearGameTimers();
        cancelAnimationFrame(animationFrame);
    });
})();
