// =================================================================
// ASSISTENTE DE BLACKJACK EXPERT - CÓDIGO COMPLETO
// =================================================================
document.addEventListener('DOMContentLoaded', () => {

    // --- MÓDULO 1: ESTADO GLOBAL E CONSTANTES ---
    const ALL_CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let memoCache = {}; // Cache para o motor de probabilidade
    // Estado do Jogo
    let hands = [];
    let activeHandIndex = 0;
    let dealerCard = '';
    let deck = {};
    // Estado da Contagem
    let runningCount = 0;
    let cardsPlayed = 0;
    let numDecks = 6;

    // --- MÓDULO 2: LÓGICA DE JOGO BÁSICA ---
    function getCardValue(card) { /* ... (código anterior estável) ... */ }
    function getHandValue(hand) { /* ... (código anterior estável) ... */ }
    
    // --- MÓDULO 3: MOTOR DE CONTAGEM DE CARTAS ---
    function getCardCountValue(card) {
        const value = getCardValue(card);
        if (value >= 2 && value <= 6) return 1;
        if (value >= 10 || value === 11) return -1;
        return 0;
    }

    function updateCount(value, numCards = 1) {
        runningCount += value * numCards;
        cardsPlayed += numCards;
        updateCountDisplay();
    }

    function updateCountDisplay() {
        const decksRemaining = Math.max(0.5, (numDecks * 52 - cardsPlayed) / 52);
        const trueCount = runningCount / decksRemaining;

        document.getElementById('running-count').textContent = runningCount;
        document.getElementById('cards-played').textContent = cardsPlayed;
        document.getElementById('true-count').textContent = trueCount.toFixed(2);
        
        // Lógica de recomendação de aposta
        const betAdvice = document.getElementById('bet-advice');
        if (trueCount >= 4) {
            betAdvice.textContent = "Aposta: ALTA (8x+)";
            betAdvice.style.backgroundColor = "#4CAF50"; // Verde
        } else if (trueCount >= 2) {
            betAdvice.textContent = "Aposta: MÉDIA (2x-4x)";
            betAdvice.style.backgroundColor = "#FFC107"; // Amarelo
        } else if (trueCount <= -2) {
            betAdvice.textContent = "Aposta: MÍNIMA (NÃO JOGUE!)";
            betAdvice.style.backgroundColor = "#f44336"; // Vermelho
        } else {
            betAdvice.textContent = "Aposta: MÍNIMA (1x)";
            betAdvice.style.backgroundColor = "#607D8B"; // Cinza
        }
    }

    function checkDeviations(playerHand, dealerCard, trueCount) {
        const playerValue = getHandValue(playerHand);
        const dealerValue = getCardValue(dealerCard);
        // Exemplos das "Illustrious 18"
        if (playerValue === 16 && dealerValue === 10 && trueCount >= 0) return "PARAR (Stand)";
        if (playerValue === 15 && dealerValue === 10 && trueCount >= 4) return "PARAR (Stand)";
        if (playerValue === 12 && dealerValue === 3 && trueCount >= 2) return "PARAR (Stand)";
        // Seguro (Insurance) é uma jogada especial
        if (dealerCard === 'A' && trueCount >= 3) return "FAZER SEGURO (Insurance)";
        return null;
    }

    // --- MÓDULO 4: MOTOR DE PROBABILIDADE (Cálculos de EV) ---
    function createDeck(numDecks) { /* ... (código anterior estável) ... */ }
    function calculateDealerProbs(dealerHand, currentDeck) { /* ... (código anterior estável) ... */ }
    function getBestEvForHand(playerHand, dealerProbs, currentDeck) { /* ... (código anterior estável) ... */ }
    function getStandEV(playerValue, dealerProbs) { /* ... (código anterior estável) ... */ }

    // --- MÓDULO 5: MOTOR DE JOGO PRINCIPAL E UI ---
    
    function playGame() {
        if (activeHandIndex >= hands.length) {
            document.getElementById('actionText').textContent = "Rodada Finalizada!";
            document.getElementById('actionButtons').innerHTML = '';
            return;
        }

        const currentHand = hands[activeHandIndex];
        const handValue = getHandValue(currentHand);
        renderHands();

        if (handValue >= 21) {
            setTimeout(handleStand, 1000);
            return;
        }

        // ---- O CORAÇÃO DA ANÁLISE ----
        memoCache = {}; // Limpa o cache para cada cálculo
        
        // 1. Calcula as probabilidades do Croupier com o baralho atualizado
        const dealerProbs = calculateDealerProbs([dealerCard], deck);
        
        // 2. Calcula o EV de todas as ações possíveis
        const results = calculateAllActionsEV(currentHand, dealerProbs, deck);

        // 3. Encontra a melhor ação com base no EV
        let bestAction = '';
        let bestEv = -Infinity;
        for (const action in results) {
            if (results[action].ev > bestEv) {
                bestEv = results[action].ev;
                bestAction = action;
            }
        }
        
        // 4. Verifica por desvios da estratégia baseados na contagem
        const trueCount = parseFloat(document.getElementById('true-count').textContent);
        const deviation = checkDeviations(currentHand, dealerCard, trueCount);
        
        // 5. Exibe os resultados
        renderResults(results, bestAction, deviation);
        renderActionButtons(bestAction, currentHand);
    }
    
    function calculateAllActionsEV(playerHand, dealerProbs, currentDeck) {
        const playerValue = getHandValue(playerHand);
        const results = {};
        
        // Stand
        results['PARAR (Stand)'] = getStandEV(playerValue, dealerProbs);

        // Hit
        let hitEvCalc = 0;
        const totalCardsRemaining = Object.values(currentDeck).reduce((a, b) => a + b, 0);
        if (totalCardsRemaining > 0 && playerValue < 21) {
            for (const card in currentDeck) {
                if (currentDeck[card] > 0) {
                    const newHand = [...playerHand, card];
                    const newDeck = { ...currentDeck }; newDeck[card]--;
                    hitEvCalc += (currentDeck[card] / totalCardsRemaining) * getBestEvForHand(newHand, dealerProbs, newDeck).ev;
                }
            }
        }
        results['PEDIR (Hit)'] = { ev: hitEvCalc };

        // Double & Split
        if (playerHand.length === 2) {
            results['DOBRAR (Double)'] = { ev: hitEvCalc * 2 };
            if (playerHand[0] === playerHand[1]) {
                const pairCard = playerHand[0];
                let singleHandEvSum = 0;
                if (totalCardsRemaining > 0) {
                    for (const card in currentDeck) {
                        if (currentDeck[card] > 0) {
                            const newHand = [pairCard, card];
                            const newDeck = { ...currentDeck }; newDeck[card]--;
                            singleHandEvSum += (currentDeck[card] / totalCardsRemaining) * getBestEvForHand(newHand, dealerProbs, newDeck).ev;
                        }
                    }
                }
                results['DIVIDIR (Split)'] = { ev: singleHandEvSum * 2 };
            }
        }
        return results;
    }

    function renderHands() { /* ... (código anterior estável) ... */ }

    function renderResults(results, bestAction, deviation) {
        const resultsBreakdown = document.getElementById('results-breakdown');
        resultsBreakdown.innerHTML = '';
        for (const action in results) {
            const res = results[action];
            const box = document.createElement('div');
            box.className = 'result-box';
            if (action === bestAction) box.classList.add('best');
            
            box.innerHTML = `<h4>${action}</h4>`;
            if (res.win !== undefined) {
                 box.innerHTML += `<p>V:${(res.win * 100).toFixed(1)}% L:${(res.loss * 100).toFixed(1)}% P:${(res.push * 100).toFixed(1)}%</p>`;
            }
            box.innerHTML += `<p class="ev">EV: ${res.ev.toFixed(4)}</p>`;
            resultsBreakdown.appendChild(box);
        }
        
        document.getElementById('best-action').textContent = `Ação por EV: ${bestAction}`;
        const deviationAlert = document.getElementById('deviation-alert');
        if (deviation && deviation !== bestAction) {
            deviationAlert.textContent = `ALERTA DE CONTAGEM: A jogada ideal é ${deviation}!`;
            deviationAlert.classList.remove('hidden');
        } else {
            deviationAlert.classList.add('hidden');
        }
    }

    function renderActionButtons(bestAction, currentHand) { /* ... (código anterior estável) ... */ }

    function handleHit(isDouble = false) {
        const newCard = prompt("Qual carta você recebeu?");
        if (newCard && ALL_CARDS.includes(newCard.toUpperCase())) {
            const card = newCard.toUpperCase();
            hands[activeHandIndex].push(card);
            deck[getCardValue(card) === 10 ? '10' : card]--; // Remove do baralho
            updateCount(getCardCountValue(card)); // Atualiza a contagem
            
            if (isDouble) handleStand();
            else playGame();
        } else if (newCard) {
            alert("Carta inválida!");
        }
    }
    function handleStand() {
        activeHandIndex++;
        playGame();
    }
    function handleSplit() {
        // ... (lógica de split precisa ser atualizada para interagir com o deck e a contagem)
        alert("Função de Split interativo a ser implementada!");
    }

    // --- INICIALIZAÇÃO E EVENT LISTENERS ---
    numDecks = parseInt(document.getElementById('deckCount').value);

    document.getElementById('deckCount').addEventListener('change', (e) => {
        numDecks = parseInt(e.target.value);
    });

    // Listeners para contagem rápida
    document.getElementById('count-low-btn').addEventListener('click', () => updateCount(1));
    document.getElementById('count-mid-btn').addEventListener('click', () => updateCount(0));
    document.getElementById('count-high-btn').addEventListener('click', () => updateCount(-1));

    // Listeners do jogo
    document.getElementById('startBtn').addEventListener('click', () => {
        deck = createDeck(numDecks);
        
        const playerHandStr = document.getElementById('playerCards').value.toUpperCase().split(' ');
        const dealerCardStr = document.getElementById('dealerCard').value.toUpperCase();
        
        hands = [playerHandStr];
        dealerCard = dealerCardStr;
        activeHandIndex = 0;
        
        // Remove cartas iniciais do baralho e atualiza contagem
        [...playerHandStr, dealerCardStr].forEach(cardStr => {
            const card = (getCardValue(cardStr) === 10) ? '10' : cardStr;
            if (deck[card]) {
                deck[card]--;
                updateCount(getCardCountValue(card));
            }
        });

        document.getElementById('initialSetup').classList.add('hidden');
        document.getElementById('gameplay').classList.remove('hidden');
        playGame();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('gameplay').classList.add('hidden');
        document.getElementById('initialSetup').classList.remove('hidden');
        // Opcional: resetar a contagem
        // runningCount = 0; cardsPlayed = 0; updateCountDisplay();
    });

    // Colar as funções `getCardValue`, `getHandValue`, etc. aqui
    // ... (o código completo das funções omitidas por brevidade)
});


// Cole as funções que foram omitidas com "/* ... */" aqui
// Elas são as mesmas das versões anteriores
// getCardValue, getHandValue, createDeck, calculateDealerProbs, getBestEvForHand, getStandEV, renderHands, renderActionButtons
