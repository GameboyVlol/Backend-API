const express = require('express');
const app = express();
const PORT = 3000;

// Function to calculate the price of an American option using the Binomial Tree Model
function americanOptionPrice(S, K, T, r, sigma, steps, optionType = "call") {
    const dt = T / steps; // Time step
    const u = Math.exp(sigma * Math.sqrt(dt)); // Up factor
    const d = 1 / u; // Down factor
    const q = (Math.exp(r * dt) - d) / (u - d); // Risk-neutral probability

    // Initialize asset prices at maturity
    const prices = Array.from({ length: steps + 1 }, (_, i) => S * Math.pow(u, steps - i) * Math.pow(d, i));

    // Option values at maturity (for calls or puts)
    const values = prices.map(price => {
        if (optionType === "call") return Math.max(0, price - K); // Call option at maturity
        if (optionType === "put") return Math.max(0, K - price);  // Put option at maturity
        throw new Error("Invalid option type");
    });

    // Backward induction to calculate option value at each node
    for (let step = steps - 1; step >= 0; step--) {
        for (let i = 0; i <= step; i++) {
            // Calculate continuation value (holding the option)
            values[i] = Math.exp(-r * dt) * (q * values[i] + (1 - q) * values[i + 1]);

            // Early exercise value (if it's an American option)
            let earlyExercise;
            if (optionType === "call") {
                earlyExercise = Math.max(0, prices[i] - K); // Call option early exercise
            } else if (optionType === "put") {
                earlyExercise = Math.max(0, K - prices[i]); // Put option early exercise
            } else {
                throw new Error("Invalid option type");
            }

            // The option value is the maximum of continuing or early exercising
            values[i] = Math.max(values[i], earlyExercise);
        }
    }

    return values[0]; // Return the option price at the root node (time 0)
}

// API endpoint for option pricing
app.get('/price', (req, res) => {
    // Extract query parameters
    const { S, K, T, r, sigma, steps, optionType } = req.query;

    // Validate input
    if (!S || !K || !T || !r || !sigma || !steps || !optionType) {
        return res.status(400).json({ error: "Missing required query parameters" });
    }

    try {
        // Convert inputs to numbers and calculate the option price
        const price = americanOptionPrice(
            parseFloat(S),
            parseFloat(K),
            parseFloat(T),
            parseFloat(r),
            parseFloat(sigma),
            parseInt(steps),
            optionType
        );
        res.json({ price });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
