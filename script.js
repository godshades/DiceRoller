document.addEventListener('DOMContentLoaded', () => {
    // --- Constants and State ---
    const MAX_DICE = 6;
    const HISTORY_LIMIT = 50;
    const SETTINGS_KEY = 'diceAppSettings';
    const HISTORY_KEY = 'diceAppHistory'; // Optional: for persistent history

    let currentSettings = {
        numDice: 1,
        diceNames: Array(MAX_DICE).fill('').map((_, i) => `Die ${i + 1}`)
    };
    let rollHistory = []; // In-memory history

    // --- DOM Element References ---
    const diceArea = document.getElementById('dice-area');
    const copyClick = document.getElementById('text-to-copy');
    const rollButton = document.getElementById('roll-button');
    const historyLog = document.getElementById('history-log');
    const clearHistoryButton = document.getElementById('clear-history-button');
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const saveSettingsButton = document.getElementById('save-settings-button');
    const numDiceSelect = document.getElementById('num-dice-select');
    const diceNamesInputsContainer = document.getElementById('dice-names-inputs');
    const historyLimitSpan = document.getElementById('history-limit');

    // --- Initialization ---
    function init() {
        historyLimitSpan.textContent = HISTORY_LIMIT;
        loadSettings();
        // loadHistory(); // Uncomment if persisting history
        createDicePlaceholders();
        populateSettingsModal(); // Create name inputs first
        updateSettingsFormValues(); // Then fill them
        updateDiceVisibility();
        renderHistory();
        addEventListeners();
        registerServiceWorker();
    }

    // --- Settings Management ---
    function loadSettings() {
        const savedSettings = localStorage.getItem(SETTINGS_KEY);
        if (savedSettings) {
            try {
                const parsedSettings = JSON.parse(savedSettings);
                // Basic validation/merge
                currentSettings.numDice = Math.max(1, Math.min(MAX_DICE, parseInt(parsedSettings.numDice, 10) || 1));
                if (Array.isArray(parsedSettings.diceNames) && parsedSettings.diceNames.length === MAX_DICE) {
                    currentSettings.diceNames = parsedSettings.diceNames.map(name => String(name || '').trim());
                } else {
                    // If invalid names array, regenerate defaults but keep numDice
                    console.warn("Invalid dice names in localStorage, using defaults.");
                    currentSettings.diceNames = Array(MAX_DICE).fill('').map((_, i) => `Die ${i + 1}`);
                }
            } catch (e) {
                console.error("Error parsing settings from localStorage:", e);
                setDefaultSettings(); // Fallback to defaults on error
            }
        } else {
            setDefaultSettings(); // Use defaults if nothing is saved
        }
    }

    function saveSettings() {
        // Read values from form
        const numDice = parseInt(numDiceSelect.value, 10);
        const diceNames = [];
        const nameInputs = diceNamesInputsContainer.querySelectorAll('.dice-name-input');
        nameInputs.forEach(input => {
            diceNames.push(input.value.trim() || `Die ${parseInt(input.dataset.position, 10) + 1}`);
        });

        // Update state
        currentSettings.numDice = numDice;
        currentSettings.diceNames = diceNames;

        // Save to localStorage
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
        } catch (e) {
            console.error("Error saving settings to localStorage:", e);
            alert("Could not save settings. LocalStorage might be full or disabled.");
        }

        // Update UI
        updateDiceVisibility();
        closeSettingsModal();
    }

    function setDefaultSettings() {
        currentSettings = {
            numDice: 3,
            diceNames: Array(MAX_DICE).fill('').map((_, i) => `Die ${i + 1}`)
        };
        // Optionally: Clear localStorage if defaults are applied due to error?
        // localStorage.removeItem(SETTINGS_KEY);
    }

    function populateSettingsModal() {
        diceNamesInputsContainer.innerHTML = ''; // Clear previous inputs
        currentSettings.diceNames.forEach((name, index) => {
            const label = document.createElement('label');
            label.textContent = `Position ${index + 1}:`;
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'dice-name-input';
            input.dataset.position = index; // Store position index
            input.maxLength = 15; // Limit name length
            label.appendChild(input);
            diceNamesInputsContainer.appendChild(label);
        });
        updateSettingsFormValues(); // Ensure values reflect current state
    }

    function updateSettingsFormValues() {
        numDiceSelect.value = currentSettings.numDice;
        const nameInputs = diceNamesInputsContainer.querySelectorAll('.dice-name-input');
        nameInputs.forEach((input, index) => {
            input.value = currentSettings.diceNames[index] || '';
        });
    }

    function openSettingsModal() {
        updateSettingsFormValues(); // Ensure form reflects current state when opened
        settingsModal.hidden = false;
        // Add focus trap or manage focus if desired
    }

    function closeSettingsModal() {
        settingsModal.hidden = true;
    }

    // --- Dice Creation and Display ---
    function createDicePlaceholders() {
        diceArea.innerHTML = ''; // Clear existing
        for (let i = 0; i < MAX_DICE; i++) {
            const dieElement = document.createElement('div');
            dieElement.className = 'die hidden'; // Start hidden
            dieElement.dataset.position = i;
            dieElement.textContent = '?'; // Placeholder
            diceArea.appendChild(dieElement);
        }
    }

    function updateDiceVisibility() {
        const diceElements = diceArea.querySelectorAll('.die');
        diceElements.forEach((die, index) => {
            if (index < currentSettings.numDice) {
                die.classList.remove('hidden');
            } else {
                die.classList.add('hidden');
            }
        });
    }

    function updateDieFace(position, value) {
        const dieElement = diceArea.querySelector(`.die[data-position="${position}"]`);
        if (dieElement) {

            // --- CHANGE IS HERE ---
            // Original line (displays the number):
            // dieElement.textContent = value;

            // New lines (display the name corresponding to the value):
            let displayText = value.toString(); // Default to the number as fallback
            if (value >= 1 && value <= MAX_DICE && currentSettings.diceNames.length === MAX_DICE) {
                // Use the name based on the die roll result (value)
                displayText = currentSettings.diceNames[value - 1]; // Get name using value (1-based -> 0-based index)
            } else {
                console.warn(`Could not find name for result ${value}. Displaying number.`);
            }
            dieElement.textContent = displayText; // Set text to the name (or fallback number)
            // --- END OF CHANGE ---


            // Optional: Still keep data-face if needed for CSS styling based on number
            // dieElement.dataset.face = value;
        }
    }

    // --- Dice Rolling Logic ---
    function getRandomRoll() {
        return Math.floor(Math.random() * 6) + 1;
    }

    function handleRoll() {
        const numDiceToRoll = currentSettings.numDice;
        const diceElements = diceArea.querySelectorAll('.die:not(.hidden)');
        const results = [];
        const rolledDiceNames = []; // This will store names based on *results* now

        // Trigger animation
        diceElements.forEach(die => {
            die.classList.add('rolling');
            die.textContent = '?'; // Show placeholder during roll
        });

        // Wait for animation roughly, then show results
        setTimeout(() => {
            diceElements.forEach((die) => {
                // Check if the die is actually supposed to be rolled based on numDiceToRoll
                // Note: This assumes diceElements only contains the currently visible dice.
                // A safer check might be needed if diceElements could contain hidden ones.
                // However, the :not(.hidden) selector should handle this.

                const result = getRandomRoll();
                const position = parseInt(die.dataset.position, 10); // Get original position

                results.push(result); // Store the numerical result

                // --- CHANGE IS HERE ---
                // Original line (using name based on position):
                // rolledDiceNames.push(currentSettings.diceNames[position]);

                // New line (using name based on the die roll result):
                // Ensure result is within bounds (1-6) and array exists
                if (result >= 1 && result <= MAX_DICE && currentSettings.diceNames.length === MAX_DICE) {
                    const nameFromResult = currentSettings.diceNames[result - 1]; // Get name using result (1-based -> 0-based index)
                    rolledDiceNames.push(nameFromResult);
                } else {
                    // Fallback if something is wrong (e.g., names array incorrect size)
                    console.warn(`Could not find name for result ${result}. Using result number.`);
                    rolledDiceNames.push(result.toString()); // Or push the position name as a fallback: currentSettings.diceNames[position]
                }
                // --- END OF CHANGE ---

                updateDieFace(position, result); // Update the specific die face visually
                die.classList.remove('rolling');

            });
            // Only log if at least one die was rolled (results array is not empty)
            if (results.length > 0) {
                logRoll(rolledDiceNames); // Log the roll with names derived from results
            } else {
                // Handle case where maybe numDice was 0 or elements weren't found correctly
                console.warn("No dice were rolled.");
            }
        }, 500); // Adjust timing to match CSS animation duration
    }

    // --- History Management ---
    function logRoll(names) {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            timestamp: timestamp,
            rolledDiceNames: names
            // Optionally add results: results: results
        };

        rollHistory.unshift(entry); // Add to the beginning

        // Enforce limit
        if (rollHistory.length > HISTORY_LIMIT) {
            rollHistory.pop(); // Remove the oldest
        }

        renderHistory();
        // saveHistory(); // Uncomment if persisting history
    }

    function renderHistory() {
        historyLog.innerHTML = ''; // Clear current list
        rollHistory.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `${entry.timestamp} - ${entry.rolledDiceNames.join(', ')}`;
            historyLog.appendChild(li);
        });
    }

    function clearHistory() {
        rollHistory = [];
        renderHistory();
        // localStorage.removeItem(HISTORY_KEY); // Uncomment if persisting history
    }

    /* Optional: History Persistence using localStorage
    function saveHistory() {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(rollHistory));
        } catch (e) {
            console.error("Could not save history:", e);
        }
    }

    function loadHistory() {
        const savedHistory = localStorage.getItem(HISTORY_KEY);
        if (savedHistory) {
            try {
                rollHistory = JSON.parse(savedHistory);
                // Optional: Further validation if needed
                if (!Array.isArray(rollHistory)) rollHistory = [];
            } catch (e) {
                console.error("Error parsing history:", e);
                rollHistory = [];
            }
        } else {
            rollHistory = [];
        }
    }
    */

    // --- PWA Service Worker ---
    function registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                });
        }
    }

    // --- Event Listeners ---
    function addEventListeners() {
        copyClick.addEventListener('click', handleCopy);
        rollButton.addEventListener('click', handleRoll);
        clearHistoryButton.addEventListener('click', clearHistory);
        settingsButton.addEventListener('click', openSettingsModal);
        closeSettingsButton.addEventListener('click', closeSettingsModal);
        saveSettingsButton.addEventListener('click', saveSettings);

        // Close modal if clicking outside the content area
        settingsModal.addEventListener('click', (event) => {
            if (event.target === settingsModal) {
                closeSettingsModal();
            }
        });
    }

    function handleCopy() {
        try {
            const textElement = document.getElementById('text-to-copy');
            
            // Use the modern Clipboard API to copy the text
            navigator.clipboard.writeText(textElement.textContent);

            // Optional: Provide visual feedback
            textElement.classList.add('copied');
            setTimeout(() => textElement.classList.remove('copied'), 2000); // Remove feedback after 2 seconds

            console.log('Text copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    }

    // --- Start the application ---
    init();
});