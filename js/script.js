document.addEventListener('DOMContentLoaded', () => {
    // Elementos do DOM
    const audioInput = document.getElementById('audio-input');
    const textInput = document.getElementById('text-input');
    const audioFilename = document.getElementById('audio-filename');
    const textFilename = document.getElementById('text-filename');
    const audioPlayer = document.getElementById('audio-player');
    
    const prevPhraseEl = document.getElementById('prev-phrase');
    const currentPhraseEl = document.getElementById('current-phrase');
    const nextPhraseEl = document.getElementById('next-phrase');

    const playBtn = document.getElementById('play-btn');
    const stopBtn = document.getElementById('stop-btn');
    const markBtn = document.getElementById('mark-btn');
    const exportBtn = document.getElementById('export-btn');
    const progressBar = document.getElementById('progress-bar');
    const volumeSlider = document.getElementById('volume-slider');
    const speedSelect = document.getElementById('speed-select');
    const currentTimeEl = document.getElementById('current-time');
    const totalTimeEl = document.getElementById('total-time');

    // Estado da Aplicação
    let phrases = [];
    let currentIndex = 0;
    let timestamps = []; // Guarda os objetos { text, start, end }
    let audioFileName = '';

    // --- CARREGAMENTO DE ARQUIVOS ---

    audioInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            audioFileName = file.name;
            audioFilename.textContent = file.name;
            const url = URL.createObjectURL(file);
            audioPlayer.src = url;
            playBtn.disabled = false;
            stopBtn.disabled = false;
            progressBar.disabled = false;
        }
    });

    textInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            textFilename.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (evt) => {
                const lines = evt.target.result.split(/\r?\n/);
                phrases = lines.map(line => line.trim()).filter(line => line.length > 0);
                currentIndex = 0;
                timestamps = new Array(phrases.length).fill(null);
                updatePhraseDisplay();
                checkReadyToExport();
                if (audioPlayer.src) markBtn.disabled = false;
            };
            reader.readAsText(file);
        }
    });

    // --- CONTROLES DE ÁUDIO ---

    audioPlayer.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
        progressBar.max = audioPlayer.duration;
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (!progressBar.matches(':active')) {
            progressBar.value = audioPlayer.currentTime;
        }
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        autoSyncCheck(audioPlayer.currentTime);
    });

    playBtn.addEventListener('click', () => {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playBtn.textContent = '⏸ Pause';
        } else {
            audioPlayer.pause();
            playBtn.textContent = '▶ Play';
        }
    });

    stopBtn.addEventListener('click', () => {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        playBtn.textContent = '▶ Play';
    });

    progressBar.addEventListener('input', () => {
        audioPlayer.currentTime = progressBar.value;
    });

    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = e.target.value;
    });

    speedSelect.addEventListener('change', (e) => {
        audioPlayer.playbackRate = parseFloat(e.target.value);
    });

    // --- LÓGICA DE SINCRONIZAÇÃO E MARCAÇÃO ---

    function updatePhraseDisplay() {
        if (phrases.length === 0) return;

        prevPhraseEl.textContent = currentIndex > 0 ? phrases[currentIndex - 1] : '';
        currentPhraseEl.innerHTML = `<div class="phrase-card">${phrases[currentIndex]}</div>`;
        nextPhraseEl.textContent = currentIndex < phrases.length - 1 ? phrases[currentIndex + 1] : '';
    }

    function markCurrentTimestamp() {
        if (phrases.length === 0) return;

        const currentTime = audioPlayer.currentTime;

        // Se a frase anterior existir e ainda não tiver um 'end', fecha ela
        if (currentIndex > 0 && timestamps[currentIndex - 1]) {
            timestamps[currentIndex - 1].end = currentTime;
        }

        // Define a marcação da frase atual
        timestamps[currentIndex] = {
            text: phrases[currentIndex],
            start: currentTime,
            end: null
        };

        // Avança para a próxima frase se disponível
        if (currentIndex < phrases.length - 1) {
            currentIndex++;
            updatePhraseDisplay();
        } else {
            // Última frase fecha no fim do áudio ou tempo atual
            timestamps[currentIndex].end = audioPlayer.duration || currentTime;
        }

        checkReadyToExport();
    }

    function autoSyncCheck(currentTime) {
        // Modo Leitura: Se os timestamps já foram mapeados, avança o texto automaticamente durante o play
        if (timestamps.length > 0 && timestamps[0] !== null) {
            const foundIndex = timestamps.findIndex(ts => ts && ts.start <= currentTime && (ts.end === null || ts.end >= currentTime));
            if (foundIndex !== -1 && foundIndex !== currentIndex) {
                currentIndex = foundIndex;
                updatePhraseDisplay();
            }
        }
    }

    markBtn.addEventListener('click', markCurrentTimestamp);

    // --- ATALHOS DE TECLADO ---

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            playBtn.click();
        } else if (e.code === 'ArrowRight') {
            if (currentIndex < phrases.length - 1) {
                currentIndex++;
                updatePhraseDisplay();
            }
        } else if (e.code === 'ArrowLeft') {
            if (currentIndex > 0) {
                currentIndex--;
                updatePhraseDisplay();
            }
        } else if (e.code === 'Enter' || e.code === 'KeyM') {
            if (!markBtn.disabled) markCurrentTimestamp();
        } else if (e.ctrlKey && e.code === 'KeyE') {
            e.preventDefault();
            if (!exportBtn.disabled) exportData();
        }
    });

    // --- EXPORTAÇÃO ---

    function checkReadyToExport() {
        const hasSomeTimestamp = timestamps.some(ts => ts !== null);
        exportBtn.disabled = !hasSomeTimestamp;
    }

    function exportData() {
        const now = new Date();
        const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

        let content = `# Temporização - Áudio: ${audioFileName || 'desconhecido'}\n`;
        content += `# Gerado em: ${dateStr}\n`;
        content += `# Total de frases: ${phrases.length}\n\n`;

        timestamps.forEach((ts, idx) => {
            if (ts) {
                const startStr = formatTime(ts.start);
                const endStr = ts.end ? formatTime(ts.end) : formatTime(ts.start + 2.0);
                content += `FRASE ${idx + 1}: "${ts.text}" - ${startStr} -> ${endStr}\n`;
            }
        });

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `temporizacao_${Date.now()}.txt`;
        link.click();
    }

    exportBtn.addEventListener('click', exportData);

    // --- AUXILIARES ---

    function formatTime(seconds) {
        if (isNaN(seconds)) return '00:00.000';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);

        const pad = (num, size = 2) => String(num).padStart(size, '0');
        return `${pad(mins)}:${pad(secs)}.${pad(ms, 3)}`;
    }
});
