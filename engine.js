class MacroEngine {
    constructor() {
        this.time = 0;
        this.running = false;
        this.speed = 1.0;
        this.dt = 0.05; // Time step
        this.realTimePerDay = 2000; // ms per game day at 1x speed

        // Initialize Global Variables (Oil, Risk, World Rate)
        this.global = {
            P_oil: 80.0,      // Oil Price
            R_world: 4.0,     // Global Risk-Free Rate
            chi: 0.0,         // Global Risk Aversion (VIX-like)

            // Parameters
            kappa_P: 0.02, theta_P: 80.0, sigma_P: 1.5,
            kappa_chi: 0.1, theta_chi: 0.0, sigma_chi: 0.2,
            kappa_R: 0.01, theta_R: 4.0, sigma_R: 0.05,

            // Shocks
            J_P: 0, J_chi: 0
        };

        // Initialize Countries
        this.countries = this.initializeCountries();

        // Trade Matrix (simplified gravity model weights)
        this.tradeMatrix = this.initializeTradeMatrix();

        // Event System
        this.events = [];
        this.nextEventTime = Math.random() * 20 + 10;

        // Player State
        this.playerCountry = null; // Will be set by UI
        this.termLength = 1200;
        this.reputation = 50.0;
        this.gameOverState = null;
        this.playerControls = {
            rateOverride: 0.0,    // Basis points or percentage points added to target
            fiscalBalance: 0.0,   // Target Primary Balance % GDP
            tariffLevel: 5.0,     // Average tariff rate %
            intervention: 0.0     // FX intervention intensity
        };

        // Data History for Charts (Circular buffers or decimated arrays)
        this.history = {
            time: [],
            countries: {}
        };
        Object.keys(this.countries).forEach(c => {
            this.history.countries[c] = {
                g: [], pi: [], d: [], s: [], q: [], Y_nom: [], Y_real: [], i: []
            };
        });
    }

    initializeCountries() {
        // Parameters based on "real" characteristics
        // Y: Output, g: Growth, pi: Inflation, i: Rate, s: FX, d: Debt, q: Equity, rho: Spread
        const c = {
            'United States': {
                Y_nom: 27.72, Y_real: 23.77, g: 2.0, pi: 2.0, i: 5.25, s: 1.0, d: 108.2, q: 100, rho: 0.0, sigma: 0.0,
                Y_pot_growth: 2.0, pi_target: 2.0, r_star: 1.0,
                a: 0.1, b: 0.5, c: 0.1,
                phi: 0.2, kappa: 0.1, eta: 0.05,
                lambda_m: 0.1, phi_pi: 1.5, phi_y: 0.5,
                debt_limit: 150, fiscal_mult: 0.5
            },
            'China': {
                Y_nom: 17.79, Y_real: 17.18, g: 5.0, pi: 2.5, i: 3.0, s: 7.2, d: 80, q: 100, rho: 0.5, sigma: 0.1,
                Y_pot_growth: 4.5, pi_target: 3.0, r_star: 2.0,
                a: 0.15, b: 0.3, c: 0.2,
                phi: 0.3, kappa: 0.15, eta: 0.1,
                lambda_m: 0.1, phi_pi: 1.2, phi_y: 0.5,
                debt_limit: 120, fiscal_mult: 0.6
            },
            'Euro Area': {
                Y_nom: 17.75, Y_real: 17.75, g: 1.5, pi: 2.0, i: 4.5, s: 0.9, d: 90, q: 100, rho: 0.2, sigma: 0.05,
                Y_pot_growth: 1.2, pi_target: 2.0, r_star: 0.5,
                a: 0.1, b: 0.4, c: 0.15,
                phi: 0.2, kappa: 0.1, eta: 0.15,
                lambda_m: 0.08, phi_pi: 1.5, phi_y: 0.5,
                debt_limit: 100, fiscal_mult: 0.4
            },
            'India': {
                Y_nom: 3.57, Y_real: 4.13, g: 6.5, pi: 5.0, i: 6.5, s: 83.0, d: 82, q: 100, rho: 1.5, sigma: 0.2,
                Y_pot_growth: 6.5, pi_target: 4.0, r_star: 2.0,
                a: 0.2, b: 0.3, c: 0.1,
                phi: 0.4, kappa: 0.2, eta: 0.2,
                lambda_m: 0.15, phi_pi: 1.5, phi_y: 0.5,
                debt_limit: 90, fiscal_mult: 0.7
            },
            'Japan': {
                Y_nom: 4.20, Y_real: 4.61, g: 1.0, pi: 1.0, i: 0.1, s: 150.0, d: 250, q: 100, rho: 0.1, sigma: 0.05,
                Y_pot_growth: 0.8, pi_target: 2.0, r_star: -0.5,
                a: 0.1, b: 0.2, c: 0.1,
                phi: 0.1, kappa: 0.05, eta: 0.15,
                lambda_m: 0.05, phi_pi: 1.5, phi_y: 0.5,
                debt_limit: 300, fiscal_mult: 0.3
            },
            'Brazil': {
                Y_nom: 2.17, Y_real: 2.18, g: 2.0, pi: 4.5, i: 10.0, s: 5.0, d: 85, q: 100, rho: 2.5, sigma: 0.3,
                Y_pot_growth: 2.0, pi_target: 3.25, r_star: 4.0,
                a: 0.2, b: 0.4, c: 0.15,
                phi: 0.5, kappa: 0.25, eta: 0.1,
                lambda_m: 0.2, phi_pi: 1.8, phi_y: 0.5,
                debt_limit: 100, fiscal_mult: 0.5
            },
            'Russia': {
                Y_nom: 2.02, Y_real: 0.49, g: 1.5, pi: 6.0, i: 15.0, s: 90.0, d: 20, q: 100, rho: 4.0, sigma: 0.5,
                Y_pot_growth: 1.0, pi_target: 4.0, r_star: 3.0,
                a: 0.15, b: 0.2, c: 0.1,
                phi: 0.4, kappa: 0.2, eta: -0.3,
                lambda_m: 0.2, phi_pi: 1.5, phi_y: 0.5,
                debt_limit: 50, fiscal_mult: 0.4
            },
            'Saudi Arabia': {
                Y_nom: 1.07, Y_real: 1.07, g: 3.0, pi: 2.5, i: 5.0, s: 3.75, d: 30, q: 100, rho: 0.8, sigma: 0.1,
                Y_pot_growth: 2.5, pi_target: 2.0, r_star: 1.5,
                a: 0.2, b: 0.1, c: 0.3,
                phi: 0.3, kappa: 0.1, eta: -0.5,
                lambda_m: 0.1, phi_pi: 1.2, phi_y: 0.2,
                debt_limit: 60, fiscal_mult: 0.6
            }
        };

        // Initialize s_fair (Fair Value FX) for all
        Object.keys(c).forEach(k => {
            c[k].s_fair = c[k].s;
        });

        return c;
    }

    initializeTradeMatrix() {
        // Simplified: everyone trades with everyone based on size
        const matrix = {};
        const countries = Object.keys(this.countries);
        countries.forEach(i => {
            matrix[i] = {};
            countries.forEach(j => {
                if (i !== j) {
                    matrix[i][j] = 0.1; // Base trade weight
                }
            });
        });
        return matrix;
    }

    setPlayerCountry(countryName) {
        if (this.countries[countryName]) {
            this.playerCountry = countryName;
            // Initialize controls to current state
            const c = this.countries[countryName];
            this.playerControls.rateOverride = 0;
            this.playerControls.fiscalBalance = -2.0; // Default deficit
            this.playerControls.tariffLevel = 5.0;
        }
    }

    update(dt) {
        this.updateGlobal(dt);
        this.calculateTrade(dt);

        Object.keys(this.countries).forEach(name => {
            this.updateCountry(name, this.countries[name], dt);
        });

        this.updateReputation(dt);
        this.handleEvents(dt);
        this.checkGameOver();
        this.recordHistory();
        this.time += dt;
    }

    checkGameOver() {
        if (!this.running) return;

        // Win Condition
        if (this.time >= this.termLength) {
            this.running = false;
            const msg = this.getRandomMessage('win');
            this.triggerGameOver(true, msg);
        }

        // Loss Condition (Reputation)
        if (this.reputation <= 0) {
            this.running = false;
            const msg = this.getRandomMessage('loss');
            this.triggerGameOver(false, msg);
        }
    }

    triggerGameOver(win, msg) {
        this.gameOverState = { win: win, reason: msg };
    }

    getRandomMessage(type) {
        const wins = [
            "Re-elected in a landslide! The people love you.",
            "Statue erected in your honor. A golden age!",
            "History will remember you as 'The Great'.",
            "Retired peacefully to a private island. Mission accomplished.",
            "Nobel Prize in Economics awarded for your stewardship."
        ];
        const losses = [
            "Coup d'état! The military has seized the palace.",
            "Vote of No Confidence passed. You are out.",
            "Impeached for gross incompetence. Shame!",
            "Forced to resign amidst mass protests.",
            "The economy collapsed, and so did your government."
        ];
        const pool = type === 'win' ? wins : losses;
        return pool[Math.floor(Math.random() * pool.length)];
    }

    updateReputation(dt) {
        if (!this.playerCountry) return;
        const c = this.countries[this.playerCountry];

        // Reputation Dynamics
        // Reward: Growth > 2%, Low Inflation, Low Debt
        // Penalize: Recession, High Inflation, High Debt

        let delta = 0;

        // Growth Reward/Penalty
        if (c.g > 2.0) delta += 0.05;
        else if (c.g < 0) delta -= 0.1;

        // Inflation Penalty (Target ~2-3%)
        if (c.pi > 5.0) delta -= 0.1;
        if (c.pi > 10.0) delta -= 0.2;

        // Debt Penalty
        if (c.d > 100) delta -= 0.05;
        if (c.d > 150) delta -= 0.1;

        // Apply
        this.reputation += delta * dt;
        this.reputation = Math.min(100, Math.max(0, this.reputation));
    }

    updateGlobal(dt) {
        const g = this.global;
        const sqrtDt = Math.sqrt(dt);

        // Oil Price: Mean Reverting SDE + Jump
        const dP = g.kappa_P * (g.theta_P - g.P_oil) * dt + g.sigma_P * this.randn() * sqrtDt + g.J_P * dt;
        g.P_oil += dP;
        g.P_oil = Math.max(10, g.P_oil); // Floor
        g.J_P *= 0.9; // Decay jump

        // Global Risk (Chi): Mean Reverting SDE
        const dChi = -g.kappa_chi * (g.chi - g.theta_chi) * dt + g.sigma_chi * this.randn() * sqrtDt + g.J_chi * dt;
        g.chi += dChi;
        g.chi = Math.max(0, g.chi); // Risk >= 0
        g.J_chi *= 0.9;

        // World Rate: Mean Reverting
        const dR = g.kappa_R * (g.theta_R - g.R_world) * dt + g.sigma_R * this.randn() * sqrtDt;
        g.R_world += dR;
    }

    calculateTrade(dt) {
        // Placeholder for future complexity
    }

    updateCountry(name, c, dt) {
        const g = this.global;
        const sqrtDt = Math.sqrt(dt);

        // 1. Output Gap (y_tilde) & Growth
        const real_rate = c.i - c.pi;
        const rate_gap = real_rate - c.r_star;

        // FIX: Compare s to s_fair, not 1.0
        const fx_competitiveness = (name === 'United States') ? 0 : Math.log(c.s / c.s_fair);
        const tariff_drag = (name === this.playerCountry) ? (this.playerControls.tariffLevel - 5) * 0.1 : 0;

        const nx_shock = 0.1 * fx_competitiveness - tariff_drag;

        const dg = -c.a * (c.g - c.Y_pot_growth) - c.b * rate_gap + c.c * nx_shock;
        const growth_noise = 0.5 * this.randn() * sqrtDt;

        // Fiscal Impulse (Player only)
        let fiscal_impulse = 0;
        if (name === this.playerCountry) {
            const deficit_excess = -(this.playerControls.fiscalBalance) - 2.0;
            fiscal_impulse = deficit_excess * c.fiscal_mult * 0.1;
        }

        c.g += dg * dt + growth_noise + fiscal_impulse * dt;

        // Update GDP Levels (Annualized Growth)
        // Y_real grows by g
        c.Y_real *= (1 + (c.g / 100) * (dt / 365));

        // Y_nom grows by g + pi (approx)
        c.Y_nom *= (1 + ((c.g + c.pi) / 100) * (dt / 365));


        // 2. Inflation (Phillips Curve)
        const output_gap_proxy = (c.g - c.Y_pot_growth); // Growth above trend = inflationary
        const oil_change = (g.P_oil - 80) / 80; // % deviation from baseline

        const dpi = -c.phi * (c.pi - c.pi_target) + c.kappa * output_gap_proxy + c.eta * oil_change;
        const pi_noise = 0.2 * this.randn() * sqrtDt;
        c.pi += dpi * dt + pi_noise;


        // 3. Monetary Policy (Taylor Rule)
        let i_target = c.r_star + c.pi + c.phi_pi * (c.pi - c.pi_target) + c.phi_y * output_gap_proxy;

        // Player Override
        if (name === this.playerCountry) {
            i_target += this.playerControls.rateOverride;
        }

        // Smooth adjustment
        const di = -c.lambda_m * (c.i - i_target);
        c.i += di * dt;
        c.i = Math.max(0, c.i); // ZLB


        // 4. Debt Dynamics
        let pb = -2.0; // Default deficit
        if (name === this.playerCountry) {
            pb = this.playerControls.fiscalBalance;
        }

        // Snowball effect: (r - g) * d
        const snowball = ((c.i - c.pi) - c.g) / 100 * c.d;
        const deficit_contribution = -pb; // Surplus reduces debt

        c.d += (snowball + deficit_contribution) * dt;
        c.d = Math.max(0, c.d);


        // 5. Risk Premium (Spread)
        const debt_excess = Math.max(0, c.d - c.debt_limit);
        // Reduced sensitivity and capped risk to prevent explosion
        const risk_local = Math.min(20.0, 0.02 * debt_excess);
        const risk_global = (name === 'United States') ? 0 : g.chi * 1.0;

        const target_rho = risk_local + risk_global + c.sigma;
        c.rho += 0.2 * (target_rho - c.rho) * dt;


        // 6. FX (UIP + Valuation)
        const dt_years = dt / 365; // Convert days to years for annual rates

        if (name !== 'United States') {
            const i_us = this.countries['United States'].i;
            const pi_us = this.countries['United States'].pi;

            // Update Fair Value (Relative PPP)
            // Annual inflation diff applied over dt_years
            c.s_fair *= (1 + (c.pi - pi_us) / 100 * dt_years);

            // UIP Flow
            const carry_flow = -(c.i - i_us - c.rho) / 100;
            const valuation_pull = 0.5 * Math.log(c.s_fair / c.s); // Stronger pull

            // Drift is an Annual Rate
            const drift_s = carry_flow + valuation_pull;
            const vol_s = 0.1; // Annual volatility

            // Apply drift scaled by time
            c.s *= (1 + drift_s * dt_years + vol_s * this.randn() * Math.sqrt(dt_years));
        }


        // 7. Asset Prices (Equity)
        const equity_return = 0.05 + 1.0 * (c.g - c.Y_pot_growth) / 100 - 0.5 * (c.i - c.pi) / 100 - 0.5 * c.rho / 100;
        const vol_q = 0.15 + 0.5 * g.chi;

        c.q *= (1 + equity_return * dt_years + vol_q * this.randn() * Math.sqrt(dt_years));
    }

    handleEvents(dt) {
        if (this.time >= this.nextEventTime) {
            this.triggerRandomEvent();
            // More frequent: every 40-80 days
            this.nextEventTime = this.time + Math.random() * 40 + 40;
        }
    }

    triggerRandomEvent() {
        const rand = Math.random();
        let msg = "";

        // 10% Chance: Major Shock (Oil or Risk)
        if (rand < 0.1) {
            if (Math.random() > 0.5) {
                const shock = (Math.random() > 0.5 ? 1 : -1) * 20;
                this.global.J_P = shock;
                msg = shock > 0 ? "🛢️ Oil Supply Shock! Prices Spiking." : "📉 Oil Price Collapse!";
            } else {
                this.global.J_chi = 2.0;
                msg = "📉 Global Market Panic! Risk-off sentiment prevails.";
            }
        }
        // 20% Chance: Country Specific Economic Event
        else if (rand < 0.3) {
            const names = Object.keys(this.countries);
            const target = names[Math.floor(Math.random() * names.length)];
            const type = Math.random() > 0.5 ? 'crisis' : 'boom';

            if (type === 'crisis') {
                this.countries[target].sigma += 1.5;
                msg = `⚠️ Credit Watch: ${target} outlook negative.`;
                setTimeout(() => { this.countries[target].sigma -= 1.5; }, 4000); // Shorter duration
            } else {
                this.countries[target].g += 1.0;
                msg = `🚀 Tech breakthrough in ${target}! Growth outlook upgraded.`;
            }
        }
        // 70% Chance: Political / Flavor Text (No major impact)
        else {
            const flavorEvents = [
                "G20 Summit concludes with vague promises of cooperation.",
                "IMF releases updated World Economic Outlook.",
                "Davos: Billionaires discuss inequality over canapés.",
                "Protests erupt in emerging markets over food prices.",
                "Central Bank Governors meet in Jackson Hole.",
                "New trade deal signed between regional powers.",
                "Tech sector regulation talks stall in parliament.",
                "Climate accord signed, markets react with indifference.",
                "Election season heats up in major economies.",
                "Supply chain bottlenecks reported at major ports.",
                "Youth unemployment figures spark parliamentary debate.",
                "Consumer confidence index hits a 6-month high."
            ];
            msg = "📰 " + flavorEvents[Math.floor(Math.random() * flavorEvents.length)];
        }

        this.events.unshift({ time: this.time, text: msg });
        if (this.events.length > 10) this.events.pop();
    }

    recordHistory() {
        // Record sub-daily for smooth charts (every ~0.2 days)
        // We use a fixed step check to avoid recording every single micro-step if speed is high
        const recordStep = 0.2;
        const currentStep = Math.floor(this.time / recordStep);
        const lastStep = this.lastRecordStep || -1;

        if (currentStep > lastStep) {
            this.lastRecordStep = currentStep;
            this.history.time.push(this.time); // Push exact time for smooth x-axis
            Object.keys(this.countries).forEach(c => {
                const country = this.countries[c];
                this.history.countries[c].g.push(country.g);
                this.history.countries[c].pi.push(country.pi);
                this.history.countries[c].d.push(country.d);
                this.history.countries[c].s.push(country.s);
                this.history.countries[c].q.push(country.q);
                this.history.countries[c].Y_nom.push(country.Y_nom);
                this.history.countries[c].Y_real.push(country.Y_real);
                this.history.countries[c].i.push(country.i);
            });

            // Limit history length
            if (this.history.time.length > 500) {
                this.history.time.shift();
                Object.keys(this.countries).forEach(c => {
                    this.history.countries[c].g.shift();
                    this.history.countries[c].pi.shift();
                    this.history.countries[c].d.shift();
                    this.history.countries[c].s.shift();
                    this.history.countries[c].q.shift();
                    this.history.countries[c].Y_nom.shift();
                    this.history.countries[c].Y_real.shift();
                    this.history.countries[c].i.shift();
                });
            }
        }
    }

    randn() {
        // Box-Muller transform for normal distribution
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    // Control Methods
    start() { this.running = true; this.loop(); }
    pause() { this.running = false; }
    setSpeed(s) { this.speed = s; }

    loop() {
        if (!this.running) return;

        const now = performance.now();
        const delta = now - (this.lastFrame || now);
        this.lastFrame = now;

        const daysToAdvance = delta / (this.realTimePerDay / this.speed);

        this.accumulator = (this.accumulator || 0) + daysToAdvance;

        while (this.accumulator >= this.dt) {
            this.update(this.dt);
            this.accumulator -= this.dt;
        }

        requestAnimationFrame(() => this.loop());
    }
}