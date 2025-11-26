class UIController {
    constructor(engine) {
        this.engine = engine;
        this.charts = {};
        this.selectedCountry = null;

        // Initialize UI
        this.initCountrySelection();
        this.initCharts();
        this.bindControls();

        // Start Update Loop
        this.updateLoop();
    }

    initCountrySelection() {
        const modal = document.getElementById('modal-overlay');
        const grid = document.getElementById('country-select-grid');

        Object.keys(this.engine.countries).forEach(name => {
            const card = document.createElement('div');
            card.className = 'select-card';
            card.innerHTML = `
                <span class="select-flag">${this.getFlag(name)}</span>
                <span class="select-name">${name}</span>
            `;
            card.onclick = () => {
                this.selectCountry(name);
                modal.classList.add('hidden');
            };
            grid.appendChild(card);
        });
    }

    selectCountry(name) {
        this.selectedCountry = name;
        this.engine.setPlayerCountry(name);
        document.getElementById('player-country').textContent = name;

        // Re-init charts to focus on this country
        this.initCharts();
    }

    bindControls() {
        // Playback
        const startBtn = document.getElementById('start-btn');
        const pauseBtn = document.getElementById('pause-btn');

        startBtn.onclick = () => {
            this.engine.start();
            startBtn.disabled = true;
            startBtn.textContent = 'RUNNING';
            pauseBtn.textContent = 'PAUSE';
        };

        pauseBtn.onclick = () => {
            if (this.engine.running) {
                this.engine.pause();
                pauseBtn.textContent = 'RESUME';
            } else {
                this.engine.start();
                pauseBtn.textContent = 'PAUSE';
            }
        };

        // Speed
        document.getElementById('speed-down').onclick = () => {
            this.engine.setSpeed(Math.max(0.1, this.engine.speed - 0.5));
            this.updateSpeedDisplay();
        };
        document.getElementById('speed-up').onclick = () => {
            this.engine.setSpeed(Math.min(10, this.engine.speed + 0.5));
            this.updateSpeedDisplay();
        };

        // Policy Controls
        // Rate Override
        const updateRate = (val) => {
            this.engine.playerControls.rateOverride = val / 100;
            document.getElementById('rate-val').textContent = val > 0 ? `+${val}` : val;
        };
        document.getElementById('rate-down').onclick = () => {
            let val = Math.round(this.engine.playerControls.rateOverride * 100) - 25;
            if (val < -500) val = -500;
            updateRate(val);
        };
        document.getElementById('rate-up').onclick = () => {
            let val = Math.round(this.engine.playerControls.rateOverride * 100) + 25;
            if (val > 500) val = 500;
            updateRate(val);
        };

        // Fiscal Balance
        const updateFiscal = (val) => {
            this.engine.playerControls.fiscalBalance = val;
            document.getElementById('fiscal-val').textContent = val.toFixed(1);
        };
        document.getElementById('fiscal-down').onclick = () => {
            let val = this.engine.playerControls.fiscalBalance - 0.1;
            if (val < -10) val = -10;
            updateFiscal(Math.round(val * 10) / 10);
        };
        document.getElementById('fiscal-up').onclick = () => {
            let val = this.engine.playerControls.fiscalBalance + 0.1;
            if (val > 5) val = 5;
            updateFiscal(Math.round(val * 10) / 10);
        };

        // Tariffs
        const updateTariff = (val) => {
            this.engine.playerControls.tariffLevel = val;
            document.getElementById('tariff-val').textContent = val;
        };
        document.getElementById('tariff-down').onclick = () => {
            let val = this.engine.playerControls.tariffLevel - 1;
            if (val < 0) val = 0;
            updateTariff(val);
        };
        document.getElementById('tariff-up').onclick = () => {
            let val = this.engine.playerControls.tariffLevel + 1;
            if (val > 50) val = 50;
            updateTariff(val);
        };
    }

    updateSpeedDisplay() {
        document.getElementById('speed-display').textContent = `SPEED: ${this.engine.speed.toFixed(1)}x`;
    }

    initCharts() {
        const ctxGDP = document.getElementById('gdp-chart').getContext('2d');
        const ctxInf = document.getElementById('inflation-chart').getContext('2d');
        const ctxDebt = document.getElementById('debt-chart').getContext('2d');
        const ctxFX = document.getElementById('fx-chart').getContext('2d');

        // Destroy existing charts if they exist
        if (this.charts.gdp) this.charts.gdp.destroy();
        if (this.charts.inflation) this.charts.inflation.destroy();
        if (this.charts.debt) this.charts.debt.destroy();
        if (this.charts.fx) this.charts.fx.destroy();

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: false } },
            elements: { point: { radius: 0 }, line: { borderWidth: 2, tension: 0.1 } }, // Thicker line for single country
            scales: {
                x: { display: true, ticks: { display: false }, grid: { display: false } }, // Hide x-axis labels but keep axis
                y: {
                    grid: { color: '#222' },
                    ticks: { color: '#666', font: { family: 'JetBrains Mono', size: 9 } }
                }
            }
        };

        this.charts.gdp = new Chart(ctxGDP, { type: 'line', options: commonOptions, data: { labels: [], datasets: [] } });
        this.charts.inflation = new Chart(ctxInf, { type: 'line', options: commonOptions, data: { labels: [], datasets: [] } });
        this.charts.debt = new Chart(ctxDebt, { type: 'line', options: commonOptions, data: { labels: [], datasets: [] } });
        this.charts.fx = new Chart(ctxFX, {
            type: 'line',
            options: { ...commonOptions, scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, type: 'logarithmic' } } },
            data: { labels: [], datasets: [] }
        });

        // Initialize Dataset for Player Country ONLY
        const c = this.selectedCountry;
        if (!c) return; // Should not happen if called after selection

        const colors = {
            'United States': '#00ccff', 'China': '#ff3333', 'Euro Area': '#ffff33',
            'India': '#ff00ff', 'Japan': '#ff99cc', 'Brazil': '#33ff33',
            'Russia': '#999999', 'Saudi Arabia': '#cc9900'
        };

        const color = colors[c] || '#fff';

        [this.charts.gdp, this.charts.inflation, this.charts.debt, this.charts.fx].forEach(chart => {
            chart.data.datasets = [{
                label: c,
                borderColor: color,
                backgroundColor: color + '10', // Slight fill
                fill: true,
                borderWidth: 2,
                data: []
            }];
        });
    }

    update() {
        // Check Game Over first
        if (this.engine.gameOverState) {
            // Small timeout to allow the last frame to render
            setTimeout(() => {
                alert(this.engine.gameOverState.reason);
                this.engine.gameOverState = null;
            }, 100);
        }

        if (!this.engine.running) return;

        // 1. Update Tickers
        document.getElementById('current-date').textContent = `Day ${Math.floor(this.engine.time)} / ${this.engine.termLength}`;
        document.getElementById('oil-price').textContent = `$${this.engine.global.P_oil.toFixed(2)}`;
        document.getElementById('global-risk').textContent = this.engine.global.chi.toFixed(2);
        document.getElementById('world-rate').textContent = `${this.engine.global.R_world.toFixed(2)}%`;

        // 2. Update Player Dashboard
        if (this.selectedCountry) {
            const pc = this.engine.countries[this.selectedCountry];

            // Reputation
            const repEl = document.getElementById('player-reputation');
            repEl.textContent = `${this.engine.reputation.toFixed(1)}%`;
            repEl.style.color = this.engine.reputation > 50 ? 'var(--primary)' : (this.engine.reputation < 25 ? 'var(--secondary)' : 'var(--text-primary)');

            document.getElementById('player-real-gdp').textContent = `$${pc.Y_real.toFixed(2)} T`;
            document.getElementById('player-nom-gdp').textContent = `$${pc.Y_nom.toFixed(2)} T`;
            document.getElementById('player-growth').textContent = `${pc.g.toFixed(2)}%`;
            document.getElementById('player-inflation').textContent = `${pc.pi.toFixed(2)}%`;
            document.getElementById('player-debt').textContent = `${pc.d.toFixed(1)}%`;

            // Color coding
            document.getElementById('player-growth').style.color = pc.g > 0 ? 'var(--primary)' : 'var(--secondary)';
            document.getElementById('player-inflation').style.color = pc.pi > 2 ? 'var(--secondary)' : 'var(--primary)';
        }

        // 3. Update Country Grid
        this.updateCountryGrid();

        // 4. Update Charts (only if new data)
        this.updateCharts();

        // 5. Update Events
        this.updateEvents();
    }

    updateCountryGrid() {
        const grid = document.getElementById('country-grid');
        grid.innerHTML = ''; // Rebuilding is fast enough for this size, or optimize later

        Object.keys(this.engine.countries).forEach(name => {
            const c = this.engine.countries[name];
            const row = document.createElement('div');
            row.className = `country-row ${name === this.selectedCountry ? 'player-owned' : ''}`;

            const gColor = c.g >= 0 ? 'positive' : 'negative';

            row.innerHTML = `
                <span class="c-flag">${this.getFlag(name)}</span>
                <span class="c-name">${name}</span>
                <span class="c-gdp" style="color: #888; font-size: 11px;">$${c.Y_nom.toFixed(1)}T</span>
                <span class="c-stat ${gColor}">${c.g.toFixed(1)}%</span>
            `;
            grid.appendChild(row);
        });
    }

    updateCharts() {
        const h = this.engine.history;
        if (h.time.length === 0) return;

        // Update labels (X-axis)
        const labels = h.time;

        // Update datasets for Player Country only
        const c = this.selectedCountry;
        if (!c) return;

        // Helper to update a single chart
        const updateChart = (chart, dataArray) => {
            chart.data.labels = labels;
            chart.data.datasets[0].data = dataArray;
            chart.update('none');
        };

        updateChart(this.charts.gdp, h.countries[c].g);
        updateChart(this.charts.inflation, h.countries[c].pi);
        updateChart(this.charts.debt, h.countries[c].d);
        updateChart(this.charts.fx, h.countries[c].s);
    }

    updateEvents() {
        const list = document.getElementById('events-list');
        list.innerHTML = '';
        this.engine.events.slice(0, 10).forEach(e => {
            const item = document.createElement('div');
            item.className = 'event-item';
            item.innerHTML = `
                <div class="event-time">Day ${Math.floor(e.time)}</div>
                <div class="event-msg">${e.text}</div>
            `;
            list.appendChild(item);
        });
    }

    updateLoop() {
        this.update();
        requestAnimationFrame(() => this.updateLoop());
    }

    getFlag(name) {
        const flags = {
            'United States': '🇺🇸', 'China': '🇨🇳', 'Euro Area': '🇪🇺',
            'India': '🇮🇳', 'Japan': '🇯🇵', 'Brazil': '🇧🇷',
            'Russia': '🇷🇺', 'Saudi Arabia': '🇸🇦'
        };
        return flags[name] || '🏳️';
    }
}
