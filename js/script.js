// Variáveis principais
let audio = null;
let frases = ['🎵'];
let indiceAtual = 0;

// Elementos DOM
const audioInput = document.getElementById('audioFile');
const textInput = document.getElementById('textFile');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const speedControl = document.getElementById('speedControl');
const volumeControl = document.getElementById('volumeControl');
const speedValue = document.getElementById('speedValue');
const progressFill = document.getElementById('progressFill');
const fraseDestaque = document.getElementById('fraseDestaque');
const fraseAnterior = document.getElementById('fraseAnterior');
const frasePosterior = document.getElementById('frasePosterior');
const contador = document.getElementById('contador');
const destacarBtn = document.getElementById('destacarBtn');
const audioName = document.getElementById('audioName');

// Carregar áudio
audioInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        if (audio) {
            audio.pause();
            URL.revokeObjectURL(audio.src);
        }
        const url = URL.createObjectURL(file);
        audio = new Audio(url);
        audioName.textContent = file.name;
        configurarAudio();
        playBtn.textContent = '▶ Play';
        progressFill.style.width = '0%';
    }
});

// Carregar texto
textInput.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const text = event.target.result;
            const linhas = text.split(/\r?\n/).filter(line => line.trim() !== '');
            frases = ['🎵', ...linhas];
            indiceAtual = 0;
            atualizarDisplay();
        };
        reader.readAsText(file, 'UTF-8');
    }
});

// Configurar áudio
function configurarAudio() {
    if (!audio) return;

    audio.playbackRate = parseFloat(speedControl.value);
    audio.volume = parseFloat(volumeControl.value);

    audio.addEventListener('timeupdate', function () {
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = progress + '%';
        }
    });

    audio.addEventListener('ended', function () {
        playBtn.textContent = '▶ Play';
        progressFill.style.width = '0%';
    });
}

// Atualizar display das frases
function atualizarDisplay() {
    const total = Math.max(frases.length - 1, 0);

    // Frase em destaque
    fraseDestaque.textContent = frases[indiceAtual] || '🎵';
    fraseDestaque.classList.remove('fade-in');
    void fraseDestaque.offsetWidth; // force reflow
    fraseDestaque.classList.add('fade-in');

    // Frase anterior
    if (indiceAtual > 0) {
        fraseAnterior.textContent = frases[indiceAtual - 1];
        fraseAnterior.style.display = 'block';
    } else {
        fraseAnterior.textContent = '';
        fraseAnterior.style.display = 'none';
    }

    // Frase posterior
    if (indiceAtual < frases.length - 1) {
        frasePosterior.textContent = frases[indiceAtual + 1];
        frasePosterior.style.display = 'block';
    } else {
        frasePosterior.textContent = '';
        frasePosterior.style.display = 'none';
    }

    // Contador
    contador.textContent = `Frase ${indiceAtual} de ${total}`;
}

// Avançar (tecla D e botão DESTACAR)
function avancar() {
    if (indiceAtual < frases.length - 1) {
        indiceAtual++;
        atualizarDisplay();
    }
}

// Voltar (tecla ←)
function voltar() {
    if (indiceAtual > 0) {
        indiceAtual--;
        atualizarDisplay();
    }
}

// Play / Pause
function togglePlay() {
    if (!audio) return;

    if (audio.paused) {
        audio.play();
        playBtn.textContent = '⏸ Pause';
    } else {
        audio.pause();
        playBtn.textContent = '▶ Play';
    }
}

// Eventos de teclado
document.addEventListener('keydown', function (e) {
    // Ignora se estiver digitando em input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'd':
        case 'D':
            e.preventDefault();
            avancar();
            break;
        case 'ArrowLeft':
            e.preventDefault();
            voltar();
            break;
        case 'ArrowRight':
            e.preventDefault();
            avancar();
            break;
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
    }
});

// Botão DESTACAR
destacarBtn.addEventListener('click', avancar);

// Botões de áudio
playBtn.addEventListener('click', togglePlay);

stopBtn.addEventListener('click', function () {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        playBtn.textContent = '▶ Play';
        progressFill.style.width = '0%';
    }
});

// Velocidade
speedControl.addEventListener('input', function () {
    const value = parseFloat(this.value);
    speedValue.textContent = value.toFixed(1) + 'x';
    if (audio) {
        audio.playbackRate = value;
    }
});

// Volume
volumeControl.addEventListener('input', function () {
    if (audio) {
        audio.volume = parseFloat(this.value);
    }
});

// Inicializar
atualizarDisplay();
