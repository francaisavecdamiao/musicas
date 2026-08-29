document.addEventListener("DOMContentLoaded", () => {
    const audioElement = document.createElement("audio");
    document.body.appendChild(audioElement);

    const audioInput = document.getElementById("audio-input");
    const textInput = document.getElementById("text-input");
    const audioFileName = document.getElementById("audio-file-name");
    const textFileName = document.getElementById("text-file-name");
    
    const btnPlayPause = document.getElementById("btn-play-pause");
    const btnPlaySync = document.getElementById("btn-play-sync");
    const playIcon = document.getElementById("play-icon");
    
    const currentTimeEl = document.getElementById("current-time");
    const totalTimeEl = document.getElementById("total-time");
    const progressBar = document.getElementById("progress-bar");
    const progressContainer = document.getElementById("progress-container");
    
    const volumeControl = document.getElementById("volume-control");
    const speedControl = document.getElementById("speed-control");
    const speedVal = document.getElementById("speed-val");

    const slotPrev = document.getElementById("slot-prev");
    const slotCurr = document.getElementById("slot-curr");
    const slotNext = document.getElementById("slot-next");
    const phraseCounter = document.getElementById("phrase-counter");
    
    const btnMarkTime = document.getElementById("btn-mark-time");
    const btnExportTxt = document.getElementById("btn-export-txt");
    const btnExportCsv = document.getElementById("btn-export-csv");
    const marksTableBody = document.getElementById("marks-table-body");

    let phrases = [];
    let currentIndex = 0;
    let marks = [];

    // Formatação de Tempo (MM:SS.mmm)
    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00.000";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const millis = Math.floor((seconds % 1) * 1000);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
    }

    // Carregar Áudio
    audioInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            audioFileName.textContent = file.name;
            const fileURL = URL.createObjectURL(file);
            audioElement.src = fileURL;
            btnPlayPause.disabled = false;
            if (btnPlaySync) btnPlaySync.disabled = false;
        }
    });

    // Carregar Texto
    textInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            textFileName.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                phrases = text.split(/\r?\n/).map(p => p.trim()).filter(p => p.length > 0);
                currentIndex = 0;
                marks = phrases.map(p => ({ text: p, start: null, end: null }));
                
                if (phrases.length > 0) {
                    btnMarkTime.disabled = false;
                    btnExportTxt.disabled = false;
                    btnExportCsv.disabled = false;
                    updateDisplay();
                    renderTable();
                }
            };
            reader.readAsText(file);
        }
    });

    // Controle de Play/Pause Unificado
    function togglePlay() {
        if (audioElement.paused) {
            audioElement.play();
            playIcon.textContent = "❚❚";
            if (btnPlaySync) btnPlaySync.textContent = "❚❚";
        } else {
            audioElement.pause();
            playIcon.textContent = "▶";
            if (btnPlaySync) btnPlaySync.textContent = "▶";
        }
    }

    btnPlayPause.addEventListener("click", togglePlay);
    if (btnPlaySync) btnPlaySync.addEventListener("click", togglePlay);

    audioElement.addEventListener("timeupdate", () => {
        const current = audioElement.currentTime;
        const duration = audioElement.duration || 0;
        currentTimeEl.textContent = formatTime(current);
        totalTimeEl.textContent = formatTime(duration);
        
        if (duration > 0) {
            progressbarUpdate(current, duration);
        }
    });

    audioElement.addEventListener("loadedmetadata", () => {
        totalTimeEl.textContent = formatTime(audioElement.duration);
    });

    function progressbarUpdate(current, duration) {
        const percent = (current / duration) * 100;
        progressBar.style.width = `${percent}%`;
    }

    progressContainer.addEventListener("click", (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / progressContainer.clientWidth;
        if (audioElement.duration) {
            audioElement.currentTime = pos * audioElement.duration;
        }
    });

    volumeControl.addEventListener("input", (e) => {
        audioElement.volume = e.target.value;
    });

    speedControl.addEventListener("input", (e) => {
        const val = e.target.value;
        audioElement.playbackRate = val;
        speedVal.textContent = `${val}x`;
    });

    // Atualizar Display do Sincronizador
    function updateDisplay() {
        if (phrases.length === 0) return;

        // Frase Anterior
        if (currentIndex > 0) {
            slotPrev.textContent = phrases[currentIndex - 1];
        } else {
            slotPrev.textContent = "";
        }

        // Frase Atual (Destaque)
        slotCurr.innerHTML = `<div class="frase-content">${phrases[currentIndex]}</div>`;

        // Frase Posterior
        if (currentIndex < phrases.length - 1) {
            slotNext.textContent = phrases[currentIndex + 1];
        } else {
            slotNext.textContent = "";
        }

        phraseCounter.textContent = `Frase ${currentIndex + 1} de ${phrases.length}`;
    }

    // Ação Unificada de Marcar Tempo e Avançar
    function markAndNext() {
        if (phrases.length === 0) return;
        const currentTime = audioElement.currentTime;

        // Define o tempo inicial se não houver
        if (marks[currentIndex].start === null) {
            marks[currentIndex].start = currentTime;
        }
        
        // Atualiza o tempo final com o momento atual
        marks[currentIndex].end = currentTime;

        renderTable();

        // Avança para a próxima frase se houver
        if (currentIndex < phrases.length - 1) {
            currentIndex++;
            updateDisplay();
        }
    }

    function prevPhrase() {
        if (currentIndex > 0) {
            currentIndex--;
            updateDisplay();
        }
    }

    function nextPhrase() {
        if (currentIndex < phrases.length - 1) {
            currentIndex++;
            updateDisplay();
        }
    }

    btnMarkTime.addEventListener("click", markAndNext);

    // Atalhos de Teclado
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT") return;

        if (e.code === "Space") {
            e.preventDefault();
            togglePlay();
        } else if (e.code === "KeyM" || e.code === "KeyC" || e.code === "ArrowRight") {
            e.preventDefault();
            markAndNext();
        } else if (e.code === "ArrowLeft") {
            e.preventDefault();
            prevPhrase();
        }
    });

    // Tabela de Marcações
    function renderTable() {
        marksTableBody.innerHTML = "";
        marks.forEach((mark, index) => {
            const tr = document.createElement("tr");
            if (index === currentIndex) {
                tr.style.backgroundColor = "#FFF5EB";
            }
            
            const duration = (mark.start !== null && mark.end !== null && mark.end >= mark.start) 
                ? (mark.end - mark.start).toFixed(3) + "s" 
                : "-";

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${mark.text}</td>
                <td>${mark.start !== null ? formatTime(mark.start) : "-"}</td>
                <td>${mark.end !== null ? formatTime(mark.end) : "-"}</td>
                <td>${duration}</td>
                <td><button class="btn btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="jumpTo(${index})">Ir</button></td>
            `;
            marksTableBody.appendChild(tr);
        });
    }

    window.jumpTo = function(index) {
        currentIndex = index;
        updateDisplay();
        if (marks[index].start !== null) {
            audioElement.currentTime = marks[index].start;
        }
        renderTable();
    };

    // Exportar Arquivos
    btnExportTxt.addEventListener("click", () => {
        const textContent = marks.map(m => `[${formatTime(m.start || 0)} --> ${formatTime(m.end || 0)}] ${m.text}`).join("\n");
        downloadFile(textContent, "marcacoes.txt", "text/plain");
    });

    btnExportCsv.addEventListener("click", () => {
        const csvContent = "Index,Texto,Inicio,Fim\n" + marks.map((m, i) => `${i+1},"${m.text}","${formatTime(m.start || 0)}","${formatTime(m.end || 0)}"`).join("\n");
        downloadFile(csvContent, "marcacoes.csv", "text/csv");
    });

    function downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
});
