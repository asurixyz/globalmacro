# Global Macro

**Global Macro** is a real-time macroeconomic simulation game where you step into the shoes of a Central Bank Governor and Economic Planner for a major world economy.

Your mandate is simple but perilous: **Survive a 1200-day term** without crashing the economy or being ousted by a political coup.

![Global Macro Screenshot](https://via.placeholder.com/800x450?text=Global+Macro+Simulation)

## 🎯 Objective
- **Survive:** Complete the full 1200-day term.
- **Maintain Reputation:** You start with **50% Reputation**. If it hits **0%**, you are fired.
- **Prosper:** Keep GDP Growth high (>2%), Inflation stable (2-3%), and Debt manageable (<100%).

## 🕹️ Controls
You have three primary levers to pull in the **Command Center**:

1.  **Rate Override (Monetary Policy):**
    *   Adjust the Central Bank's policy rate relative to the Taylor Rule.
    *   *Raise Rates:* Fights inflation and defends currency, but hurts growth.
    *   *Cut Rates:* Stimulates growth, but risks inflation and currency depreciation.

2.  **Fiscal Balance (Fiscal Policy):**
    *   Set the government's primary budget balance as a % of GDP.
    *   *Deficit (-):* Stimulates demand (boosts growth), but increases Debt.
    *   *Surplus (+):* Pays down Debt, but drags on growth.

3.  **Tariffs (Trade Policy):**
    *   Set import tariffs.
    *   *High Tariffs:* Can improve Net Exports temporarily, but reduces long-term efficiency.

## 📊 Key Indicators
-   **Real GDP:** The actual output of your economy.
-   **Inflation:** The rate of price increases. High inflation destroys reputation.
-   **Debt / GDP:** The sustainability of your government's borrowing.
-   **FX Rate:** The strength of your currency against the USD.
-   **Global Risk (Chi):** Global market sentiment. High risk triggers capital flight to safety (USD).

## 🛠️ Tech Stack
-   **Core:** Vanilla JavaScript (ES6+)
-   **Rendering:** HTML5 Canvas & CSS Grid
-   **Charts:** [Chart.js](https://www.chartjs.org/)
-   **Styling:** Custom CSS with a "Finance Terminal" aesthetic (JetBrains Mono font).

## 🚀 How to Run
1.  Clone the repository.
2.  Open `index.html` in any modern web browser.
3.  Select a country to begin your term.

## 👨‍💻 Credits
**Developed by:** [Venkatakrishnan Asuri](https://github.com/asurixyz)

*Built as a simulation of dynamic stochastic general equilibrium (DSGE) models with a gamified layer.*
