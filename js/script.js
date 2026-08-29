// Gerenciamento de Estado
let audioFile = null;
let audioBuffer = null;
let audioContext = null;
let audioSource = null;
let isPlaying = false;
let startTime = 0;
let pauseOffset = 0;
let playbackRate = 1.0;
let volume = 1.0;

let phrases = ["🎵"];
let currentPhraseIndex = 0;
let timestamps = [{ start: 0, end: 0 }];

// Elementos do DOM
const audioInput = document.getElementById('audio-input');
const textInput = document.getElementById('text-input');
const audioFileName = document.getElementById('audio-file-name');
const textFileName = document.getElementById('text-file-name');

const btnPlayPause = document.getElementById('btn-play-pause');
const playIcon = document.getElementById('play-icon');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');

const volumeControl = document.getElementById('volume-control');
const speedControl = document.getElementById('speed-control');
const speedVal = document.getElementById('speed-val');

const slotPrev = document.getElementById('slot-prev');
const slotCurr = document.getElementById('slot-curr');
const slotNext = document.getElementById('slot-next');
const phraseCounter = document.getElementById('phrase-counter');

const btnNextPhrase = document.getElementById('btn-next-phrase');
const btnMarkTime = document.getElementById('btn-mark-time');
const btnExportTxt = document.getElementById('btn-export-txt');
const btnExportCsv = document.getElementById('btn-export-csv');
const tableBody = document.getElementById('marks-table-body');

// Inicialização do AudioContext
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

// Utilitário: Formatar Segundos em MM:SS.mmm
function formatTime(sec) {
    if (isNaN(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// Upload de Áudio
audioInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    audioFile = file;
    audioFileName.textContent = file.name;

    const arrayBuffer = await file.arrayBuffer();
    const ctx = getAudioContext();
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    totalTimeEl.textContent = formatTime(audioBuffer.duration);
    btnPlayPause.disabled = false;
    pauseOffset = 0;
    updateProgressUI();
});

// Upload de Texto
textInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    textFileName.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (evt) => {
        const lines = evt.target.result
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        phrases = ["🎵", ...lines];
        timestamps = phrases.map(() => ({ start: null, end: null }));
        timestamps[0] = { start: 0, end: 0 };

        currentPhraseIndex = 0;
        btnNextPhrase.disabled = false;
        btnMarkTime.disabled = false;
        btnExportTxt.disabled = false;
        btnExportCsv.disabled = false;

        renderPhrases();
        renderTable();
    };
    reader.readAsText(file);
});

// Reprodução de Áudio
function playAudio() {
    if (!audioBuffer) return;
    const ctx = getAudioContext();

    audioSource = ctx.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.playbackRate.value = playbackRate;

    const gainNode = ctx.createGain();
    gainNode.gain.value = volume;

    audioSource.connect(gainNode);
    gainNode.connect(ctx.destination);

    startTime = ctx.currentTime - (pauseOffset / playbackRate);
    audioSource.start(0, pauseOffset);
    isPlaying = true;

    playIcon.textContent = '⏸';
    requestAnimationFrame(updatePlaybackProgress);

    audioSource.onended = () => {
        if (getCurrentAudioTime() >= audioBuffer.duration) {
            isPlaying = false;
            playIcon.textContent = '▶';
            pauseOffset = 0;
        }
    };
}

function pauseAudio() {
    if (!audioSource || !isPlaying) return;
    pauseOffset = getCurrentAudioTime();
    audioSource.stop();
    isPlaying = false;
    playIcon.textContent = '▶';
}

function getCurrentAudioTime() {
    if (!isPlaying) return pauseOffset;
    const ctx = getAudioContext();
    const elapsed = (ctx.currentTime - startTime) * playbackRate;
    return Math.min(elapsed, audioBuffer ? audioBuffer.duration : 0);
}

function updatePlaybackProgress() {
    if (!isPlaying) return;
    const curr = getCurrentAudioTime();
    currentTimeEl.textContent = formatTime(curr);
    updateProgressUI();
    requestAnimationFrame(updatePlaybackProgress);
}

function updateProgressUI() {
    if (!audioBuffer) return;
    const pct = (getCurrentAudioTime() / audioBuffer.duration) * 100;
    progressBar.style.width = `${pct}%`;
}

// Avançar/Retroceder no Player
progressContainer.addEventListener('click', (e) => {
    if (!audioBuffer) return;
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    pauseOffset = pct * audioBuffer.duration;

    if (isPlaying) {
        audioSource.stop();
        playAudio();
    } else {
        currentTimeEl.textContent = formatTime(pauseOffset);
        updateProgressUI();
    }
});

btnPlayPause.addEventListener('click', () => {
    if (isPlaying) pauseAudio();
    else playAudio();
});

// Controles de Volume e Velocidade
volumeControl.addEventListener('input', (e) => {
    volume = parseFloat(e.target.value);
});

speedControl.addEventListener('input', (e) => {
    playbackRate = parseFloat(e.target.value);
    speedVal.textContent = `${playbackRate.toFixed(1)}x`;
});

// Renderização dos Slots de Frase
function renderPhrases() {
    const total = phrases.length;
    phraseCounter.textContent = `Frase ${currentPhraseIndex} de ${total - 1}`;

    // Anterior
    if (currentPhraseIndex > 0) {
        const prevText = phrases[currentPhraseIndex - 1];
        slotPrev.innerHTML = prevText === "🎵" ? '<span>🎵</span>' : prevText;
    } else {
        slotPrev.innerHTML = '';
    }

    // Destaque Laranja com Texto Branco Forçado + transição suave
    const currText = phrases[currentPhraseIndex];
    updateCurrentSlot(currText);

    // Próxima
    if (currentPhraseIndex < total - 1) {
        const nextText = phrases[currentPhraseIndex + 1];
        slotNext.innerHTML = nextText === "🎵" ? '<span>🎵</span>' : nextText;
    } else {
        slotNext.innerHTML = '';
    }
}

// Atualiza o slot em destaque com efeito "karaokê": a CAIXA laranja
// (.frase-content, já fixa no HTML) nunca é recriada nem some - ela
// fica parada o tempo todo, é isso que mantém o quadro sem piscar.
// Só o TEXTO (um <span class="frase-text"> dentro dela) é trocado, e a
// cada troca ele sobe + cresce do tamanho pequeno até o tamanho final
// da caixa, com uma transição CSS de verdade.
function updateCurrentSlot(text) {
    const contentEl = slotCurr.querySelector('.frase-content');
    let textEl = contentEl.querySelector('.frase-text');

    // Na primeira chamada, o HTML só tem o texto "🎵" solto dentro da
    // caixa (sem o span) - criamos o span uma única vez aqui.
    if (!textEl) {
        contentEl.innerHTML = '';
        textEl = document.createElement('span');
        textEl.className = 'frase-text';
        contentEl.appendChild(textEl);
    }

    // 1) Aplica o estado inicial (pequeno, embaixo, transparente) e já
    //    coloca o novo texto nesse estado.
    textEl.classList.add('is-entering');
    textEl.textContent = text;

    // 2) Força o navegador a calcular/"fotografar" esse estado inicial
    //    ANTES de tirar a classe. Sem isso, o navegador às vezes junta
    //    as duas mudanças no mesmo frame e a transição é pulada (o
    //    "piscar" que você ainda via).
    void textEl.offsetHeight;

    // 3) Remove a classe: agora existe um "antes" (pequeno/embaixo) e
    //    um "depois" (tamanho normal) já pintados em frames diferentes,
    //    então a transição do CSS roda de verdade, subindo e crescendo
    //    suavemente até o tamanho/fonte da caixa laranja.
    textEl.classList.remove('is-entering');
}

// Navegação entre Frases + Marcação Automática
function nextPhrase() {
    if (currentPhraseIndex < phrases.length - 1) {
        currentPhraseIndex++;
        renderPhrases();
        markTimestamp();
        highlightActiveRow();
    }
}

function prevPhrase() {
    if (currentPhraseIndex > 0) {
        currentPhraseIndex--;
        renderPhrases();
        highlightActiveRow();
    }
}

// Marcação de Tempo
function markTimestamp() {
    if (currentPhraseIndex === 0) return;

    const now = getCurrentAudioTime();

    if (!timestamps[currentPhraseIndex]) {
        timestamps[currentPhraseIndex] = { start: null, end: null };
    }

    timestamps[currentPhraseIndex].start = now;

    if (currentPhraseIndex > 1 && timestamps[currentPhraseIndex - 1].start !== null) {
        timestamps[currentPhraseIndex - 1].end = now;
    }

    renderTable();
}

// Renderizar Tabela
function renderTable() {
    if (phrases.length <= 1) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-msg">Nenhum texto carregado. Faça upload do arquivo .txt para começar.</td></tr>';
        return;
    }

    let html = '';
    for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];
        const ts = timestamps[i] || { start: null, end: null };
        const isF0 = i === 0;

        const startStr = ts.start !== null ? formatTime(ts.start) : '--:--.---';
        const endStr = ts.end !== null ? formatTime(ts.end) : '--:--.---';

        let durationStr = '--:--.---';
        if (ts.start !== null && ts.end !== null && ts.end >= ts.start) {
            durationStr = formatTime(ts.end - ts.start);
        }

        const activeClass = i === currentPhraseIndex ? 'style="background-color: #FFF3E0; font-weight: bold;"' : '';

        html += `
            <tr ${activeClass} id="row-phrase-${i}">
                <td>F${i}</td>
                <td>${phrase}</td>
                <td><span class="badge-time">${startStr}</span></td>
                <td><span class="badge-time">${endStr}</span></td>
                <td>${durationStr}</td>
                <td>
                    ${!isF0 ? `<button class="btn-del" onclick="clearMark(${i})">✕</button>` : ''}
                </td>
            </tr>
        `;
    }
    tableBody.innerHTML = html;
}

function clearMark(index) {
    if (timestamps[index]) {
        timestamps[index] = { start: null, end: null };
        renderTable();
    }
}

// Rola APENAS o container da tabela (A página web inteira não se move)
function highlightActiveRow() {
    const activeRow = document.getElementById(`row-phrase-${currentPhraseIndex}`);
    const tableWrapper = document.querySelector('.table-wrapper');

    if (activeRow && tableWrapper) {
        const rowTop = activeRow.offsetTop;
        const rowHeight = activeRow.offsetHeight;
        const wrapperScrollTop = tableWrapper.scrollTop;
        const wrapperHeight = tableWrapper.clientHeight;

        if (rowTop < wrapperScrollTop) {
            tableWrapper.scrollTop = rowTop;
        } else if (rowTop + rowHeight > wrapperScrollTop + wrapperHeight) {
            tableWrapper.scrollTop = rowTop + rowHeight - wrapperHeight;
        }
    }
}

// Exportar Arquivos
btnExportTxt.addEventListener('click', () => exportData('txt'));
btnExportCsv.addEventListener('click', () => exportData('csv'));

function exportData(format) {
    const audioName = audioFile ? audioFile.name : 'audio.mp3';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (format === 'txt') {
        let content = `# Temporização - Áudio: ${audioName}\n`;
        content += `# Gerado em: ${nowStr}\n`;
        content += `# Total de frases: ${phrases.length - 1}\n\n`;

        phrases.forEach((phrase, i) => {
            const ts = timestamps[i] || { start: null, end: null };
            if (i === 0) {
                content += `FRASE 0: 🎵 - 00:00.000 (início)\n`;
            } else {
                const s = ts.start !== null ? formatTime(ts.start) : '00:00.000';
                const e = ts.end !== null ? formatTime(ts.end) : '00:00.000';
                const dur = (ts.start !== null && ts.end !== null) ? formatTime(ts.end - ts.start) : '00:00.000';
                content += `FRASE ${i}: "${phrase}"\n`;
                content += `  Início: ${s}\n`;
                content += `  Fim: ${e}\n`;
                content += `  Duração: ${dur}\n\n`;
            }
        });

        downloadFile(content, 'sincronizacao_audio.txt', 'text/plain');
    } else if (format === 'csv') {
        let content = `ID,Frase,Inicio,Fim,Duracao\n`;
        phrases.forEach((phrase, i) => {
            const ts = timestamps[i] || { start: null, end: null };
            const s = ts.start !== null ? formatTime(ts.start) : '00:00.000';
            const e = ts.end !== null ? formatTime(ts.end) : '00:00.000';
            const dur = (ts.start !== null && ts.end !== null) ? formatTime(ts.end - ts.start) : '00:00.000';
            content += `${i},"${phrase.replace(/"/g, '""')}",${s},${e},${dur}\n`;
        });

        downloadFile(content, 'sincronizacao_audio.csv', 'text/csv');
    }
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Intercepta e Bloqueia Ações Padrão de Rolagem na Janela Principal
window.addEventListener('keydown', (e) => {
    if (['Space', 'Enter', 'ArrowUp', 'ArrowDown'].includes(e.code) &&
        !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
    }
}, false);

// Atalhos do Teclado
document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    // N, Enter, Espaço ou Seta Direita avançam a frase e registram a minutagem
    if (['n', 'N', 'Enter', 'ArrowRight'].includes(e.key) || e.code === 'Space') {
        e.preventDefault();
        nextPhrase();
    }
    else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPhrase();
    }
    else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        markTimestamp();
    }
    else if (e.ctrlKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        exportData('txt');
    }
});

btnNextPhrase.addEventListener('click', nextPhrase);
btnMarkTime.addEventListener('click', markTimestamp);
