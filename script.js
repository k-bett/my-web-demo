const NAMES_POOL = [
    "Wanjiku_KE","John_Doe_USA","Omondi_Fitness","Sarah_Travels","Kamau_Tech",
    "Aiko_Japan","Nairobi_Eats","Mombasa_Babe","Carlos_Ruiz","Adhiambo_Style",
    "Kipchoge_Run","Swahili_Vibes","Pierre_Paris","Otieno_Comedy","Chin_Wei_Tech",
    "Amani_Love","Rashid_Coast","Bella_Italia","Simba_Arts","Muthoni_Crafts"
];

let simulationInterval = null;
let chartInstance = null;
let creators = [];
let budgetCap = 0;
let isPaused = false;
let previousRankings = new Map();
let ROW_HEIGHT = 0;

function updateRowHeight() {
    const sampleRow = document.querySelector(".creator-row");
    if (sampleRow) ROW_HEIGHT = sampleRow.offsetHeight;
}

function formatK(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
}
function formatCurrency(num) {
    return 'KSh ' + num.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0});
}

function startSimulation() {
    isPaused = false;
    document.getElementById('pauseBtn').disabled = false;
    updatePauseButtonUI();

    const budgetVal = document.getElementById('budgetInput').value;
    const partsVal = document.getElementById('participantsInput').value;
    const speedVal = document.getElementById('speedInput').value;

    if (!budgetVal || !partsVal) { alert("Please fill in Budget and Participants."); return; }

    budgetCap = parseFloat(budgetVal);
    const maxParticipants = parseInt(partsVal);

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('resultsPanel').style.display = 'block';
    document.getElementById('budgetDisplay').innerText = formatCurrency(budgetCap);

    creators = [];
    previousRankings.clear();

    // --- INITIALIZATION LOGIC FOR DIVERSITY (Pareto) ---
    for (let i = 0; i < maxParticipants; i++) {
        const name = NAMES_POOL[i % NAMES_POOL.length] + (i > NAMES_POOL.length ? `_${i}` : '');
        
        // Tiered Virality (Pareto Distribution)
        // Tier 1 (1 person): The Mega Star
        // Tier 2 (3 people): The Trends
        // Tier 3 (Rest): Average/Low
        let virality, initialViews;
        
        if (i === 0) {
            virality = 150.0; // Huge advantage
            initialViews = 50000;
        } else if (i < 4) {
            virality = 40.0; // High advantage
            initialViews = 12000;
        } else if (i < 10) {
            virality = 5.0; // Moderate
            initialViews = 2000;
        } else {
            virality = 0.5; // Low
            initialViews = 50;
        }

        // Add some randomness to starting point
        initialViews += Math.floor(Math.random() * 500);

        creators.push({
            id: i, name: "@" + name, img: `https://i.pravatar.cc/150?u=${i + 200}`,
            views: initialViews, virality: virality, earnings: 0
        });
    }

    initChart();
    startLoop(parseInt(speedVal));
}

function startLoop(speed) {
    if (simulationInterval) clearInterval(simulationInterval);
    simulationInterval = setInterval(simulateTick, speed);
    simulateTick();
}

function updateSpeed() {
    if (isPaused) return;
    const speedVal = document.getElementById('speedInput').value;
    startLoop(parseInt(speedVal));
}

function togglePause() {
    if (document.getElementById('pauseBtn').disabled) return;
    isPaused = !isPaused;
    updatePauseButtonUI();
}

function updatePauseButtonUI() {
    const btn = document.getElementById('pauseBtn');
    const liveInd = document.getElementById('liveIndicator');
    const liveTxt = document.getElementById('liveText');
    if (isPaused) {
        btn.innerHTML = '<i class="fas fa-play"></i> Resume'; btn.classList.add('paused');
        liveInd.style.backgroundColor = '#666'; liveInd.classList.remove('pulse-dot');
        liveTxt.innerText = "Paused"; liveTxt.style.color = "#666";
    } else {
        btn.innerHTML = '<i class="fas fa-pause"></i> Pause'; btn.classList.remove('paused');
        liveInd.style.backgroundColor = 'var(--accent)'; liveInd.classList.add('pulse-dot');
        liveTxt.innerText = "Live"; liveTxt.style.color = "var(--accent)";
    }
}

function simulateTick() {
    if (isPaused) return;

    let totalViews = 0;
    
    // Pick one random "Breakout" creator who gets a massive temporary boost
    const luckyWinnerIndex = Math.floor(Math.random() * creators.length);

    creators.forEach((c, index) => {
        // Base growth: random * virality
        let growth = Math.floor(Math.random() * 100 * c.virality);
        
        // Momentum: The rich get richer (add 0.5% of current views to growth)
        growth += Math.floor(c.views * 0.005);

        // Lucky Break logic
        if (index === luckyWinnerIndex && Math.random() > 0.7) {
            growth += 5000; // Sudden viral spike
        }

        c.views += growth;
        totalViews += c.views;
    });

    const effectiveCPM = totalViews > 0 ? (budgetCap / totalViews) * 1000 : 0;
    creators.forEach(c => {
        const share = totalViews > 0 ? (c.views / totalViews) : 0;
        c.earnings = share * budgetCap;
    });

    document.getElementById('totalViewsDisplay').innerText = formatK(totalViews);
    document.getElementById('cpmDisplay').innerText = "KSh " + effectiveCPM.toFixed(2);

    const sortedCreators = [...creators].sort((a,b) => b.views - a.views);
    const top10 = sortedCreators.slice(0, 10);

    renderTable(top10, totalViews);
    updateChart(top10);
}

function renderTable(topCreators, totalViews) {
    const tbody = document.getElementById('creatorsTableBody');
    const currentRankings = new Map();
    topCreators.forEach((c, idx) => currentRankings.set(c.id, idx));

    const existingRows = new Map();
    tbody.querySelectorAll('.creator-row').forEach(row => {
        existingRows.set(parseInt(row.getAttribute('data-creator-id')), row);
    });

    existingRows.forEach((row, id) => {
        if (!currentRankings.has(id)) {
            row.classList.add('leaving');
            setTimeout(() => { if (row && row.remove) row.remove(); }, 620);
        }
    });

    topCreators.forEach((c, newIndex) => {
        const sharePercent = totalViews > 0 ? ((c.views / totalViews) * 100).toFixed(1) : 0;
        let existingRow = existingRows.get(c.id);

        if (!existingRow) {
            existingRow = document.createElement('tr');
            existingRow.className = 'creator-row entering';
            existingRow.setAttribute('data-creator-id', c.id);
            tbody.appendChild(existingRow);
            setTimeout(() => existingRow.classList.remove('entering'), 620);
        }

        existingRow.innerHTML = `
            <td>${newIndex + 1}</td>
            <td>
                <div class="creator-cell">
                    <img src="${c.img}" class="avatar" alt="${c.name}">
                    <div class="creator-name-txt">${c.name}</div>
                    ${c.virality > 30 ? '<i class="fas fa-fire trend-icon" style="color:var(--warning); font-size:0.7rem;"></i>' : ''}
                </div>
            </td>
            <td>${formatK(c.views)}</td>
            <td>${sharePercent}%</td>
            <td>${formatCurrency(c.earnings)}</td>
        `;

        requestAnimationFrame(() => {
            updateRowHeight();
            const h = ROW_HEIGHT > 0 ? ROW_HEIGHT : 50; 
            existingRow.style.top = `${newIndex * h}px`;
        });
    });

    previousRankings.clear();
    currentRankings.forEach((idx, id) => previousRankings.set(id, idx));
}

function initChart() {
    const ctx = document.getElementById('shareChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Earnings', data: [], backgroundColor: '#6c5ce7', borderRadius: 4 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#888' }, grid: { display: false } },
                y: { ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });
}

function updateChart(topCreators) {
    if (!chartInstance) return;
    chartInstance.data.labels = topCreators.map(c => c.name.substring(0,10));
    chartInstance.data.datasets[0].data = topCreators.map(c => c.earnings);
    chartInstance.update('none');
}
