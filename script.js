// --- CONSTANTES E ESTADO GLOBAL ---
const CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
let memoCache = {}; // Cache para memoization, crucial para performance

// --- FUNÇÕES DE LÓGICA DE JOGO BÁSICAS ---
function getCardValue(card) {
    if (!card) return 0;
    if (['K', 'Q', 'J', '10'].includes(card)) return 10;
    if (card === 'A') return 11;
    return parseInt(card, 10);
}

function getHandValue(hand) {
    if (!hand || hand.length === 0) return 0;
    let total = 0;
    let numAces = 0;
    hand.forEach(card => {
        total += getCardValue(card);
        if (card === 'A') numAces++;
    });
    while (total > 21 && numAces > 0) {
        total -= 10;
        numAces--;
    }
    return total;
}

// --- MOTOR DE PROBABILIDADE ---

/**
 * Cria um objeto representando o baralho (shoe).
 * @param {number} numDecks - O número de baralhos no jogo.
 * @returns {object} Um objeto com a contagem de cada carta.
 */
function createDeck(numDecks) {
    const deck = {};
    CARDS.forEach(card => {
        const count = (card === '10' || ['J', 'Q', 'K'].includes(card)) ? 4 * numDecks : 4 * numDecks;
        if (['10', 'J', 'Q', 'K'].includes(card)) {
            deck['10'] = (deck['10'] || 0) + 4 * numDecks;
        } else {
            deck[card] = 4 * numDecks;
        }
    });
    // Corrige a contagem de cartas de valor 10
    deck['10'] = 4 * 4 * numDecks;
    return deck;
}


/**
 * Calcula a distribuição de probabilidades dos resultados finais do croupier.
 * Esta é uma função recursiva com cache (memoization).
 * @param {array} dealerHand - A mão atual do croupier.
 * @param {object} currentDeck - O estado atual do baralho.
 * @returns {object} Distribuição de probabilidades (ex: { bust: 0.4, 17: 0.15, ... }).
 */
function calculateDealerProbs(dealerHand, currentDeck) {
    const handKey = dealerHand.sort().join(',');
    if (memoCache[handKey]) {
        return memoCache[handKey];
    }

    const handValue = getHandValue(dealerHand);
    if (handValue > 21) return { bust: 1 };
    if (handValue >= 17) return { [handValue]: 1 };

    let totalProbs = {};
    let totalCardsRemaining = Object.values(currentDeck).reduce((a, b) => a + b, 0);
    if (totalCardsRemaining === 0) return { [handValue]: 1 };

    for (const card in currentDeck) {
        if (currentDeck[card] > 0) {
            const probOfDrawingCard = currentDeck[card] / totalCardsRemaining;
            
            const newDeck = { ...currentDeck };
            newDeck[card]--;
            
            const newHand = [...dealerHand, card];
            const nextProbs = calculateDealerProbs(newHand, newDeck);
            
            for (const outcome in nextProbs) {
                totalProbs[outcome] = (totalProbs[outcome] || 0) + probOfDrawingCard * nextProbs[outcome];
            }
        }
    }
    
    memoCache[handKey] = totalProbs;
    return totalProbs;
}


/**
 * Calcula o Valor Esperado (EV) de PARAR (Stand).
 * @param {number} playerValue - O valor da mão do jogador.
 * @param {object} dealerProbs - A distribuição de probabilidades do croupier.
 * @returns {object} Objeto com win, loss, push, e ev.
 */
function getStandEV(playerValue, dealerProbs) {
    let win = dealerProbs.bust || 0;
    let loss = 0;
    let push = dealerProbs[playerValue] || 0;

    for (let score = 17; score <= 21; score++) {
        if (dealerProbs[score]) {
            if (playerValue > score) win += dealerProbs[score];
            if (playerValue < score) loss += dealerProbs[score];
        }
    }
    return { win, loss, push, ev: win - loss };
}

/**
 * Calcula o Valor Esperado (EV) de PEDIR (Hit).
 * @param {array} playerHand - A mão atual do jogador.
 * @param {object} dealerProbs - A distribuição de probabilidades do croupier.
 * @param {object} currentDeck - O estado atual do baralho.
 * @returns {object} Objeto com win, loss, push, e ev.
 */
function getHitEV(playerHand, dealerProbs, currentDeck) {
    let totalEv = 0;
    let totalWin = 0;
    let totalLoss = 0;
    let totalPush = 0;
    let totalCardsRemaining = Object.values(currentDeck).reduce((a, b) => a + b, 0);
    if (totalCardsRemaining === 0) return getStandEV(getHandValue(playerHand), dealerProbs);

    for (const card in currentDeck) {
        if (currentDeck[card] > 0) {
            const probOfDrawingCard = currentDeck[card] / totalCardsRemaining;
            const newHand = [...playerHand, card];
            const newValue = getHandValue(newHand);
            
            if (newValue > 21) {
                totalEv -= probOfDrawingCard; // Perda garantida
                totalLoss += probOfDrawingCard;
            } else {
                // Após pedir, o jogador joga de forma ótima (ou para, ou pede de novo).
                // Aqui, por simplicidade, vamos assumir que ele vai parar.
                // Uma implementação completa seria recursiva aqui também.
                const standResults = getStandEV(newValue, dealerProbs);
                totalEv += probOfDrawingCard * standResults.ev;
                totalWin += probOfDrawingCard * standResults.win;
                totalLoss += probOfDrawingCard * standResults.loss;
                totalPush += probOfDrawingCard * standResults.push;
            }
        }
    }
    return { win: totalWin, loss: totalLoss, push: totalPush, ev: totalEv };
}


// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    
    calculateBtn.addEventListener('click', () => {
        memoCache = {}; // Limpa o cache para cada novo cálculo
        
        const numDecks = parseInt(document.getElementById('deckCount').value);
        const playerHand = document.getElementById('playerCards').value.toUpperCase().split(' ');
        const dealerCard = document.getElementById('dealerCard').value.toUpperCase();
        
        if (playerHand.length === 0 || !dealerCard) {
            alert("Por favor, preencha as cartas.");
            return;
        }

        // 1. Criar o baralho e remover as cartas visíveis
        const initialDeck = createDeck(numDecks);
        playerHand.forEach(card => initialDeck[getCardValue(card) === 10 ? '10' : card]--);
        initialDeck[getCardValue(dealerCard) === 10 ? '10' : dealerCard]--;

        // 2. Calcular probabilidades do croupier
        const dealerProbs = calculateDealerProbs([dealerCard], initialDeck);

        // 3. Calcular resultados para cada ação
        const playerValue = getHandValue(playerHand);
        const standResult = getStandEV(playerValue, dealerProbs);
        const hitResult = getHitEV(playerHand, dealerProbs, initialDeck);
        
        // Simulação para Dobrar (é um Hit, mas com aposta dobrada)
        const doubleResult = {
            win: hitResult.win,
            loss: hitResult.loss,
            push: hitResult.push,
            ev: hitResult.ev * 2
        };

        const results = {
            'PARAR (Stand)': standResult,
            'PEDIR (Hit)': hitResult
        };

        // Dobrar só é uma opção na mão inicial
        if (playerHand.length === 2) {
            results['DOBRAR (Double)'] = doubleResult;
        }

        // 4. Encontrar a melhor ação
        let bestAction = '';
        let bestEv = -Infinity;
        for (const action in results) {
            if (results[action].ev > bestEv) {
                bestEv = results[action].ev;
                bestAction = action;
            }
        }

        // 5. Exibir os resultados
        const resultsBreakdown = document.getElementById('results-breakdown');
        resultsBreakdown.innerHTML = '';
        for (const action in results) {
            const res = results[action];
            const box = document.createElement('div');
            box.className = 'result-box';
            if (action === bestAction) {
                box.classList.add('best');
            }
            box.innerHTML = `
                <h4>${action}</h4>
                <p class="win">Vitória: ${(res.win * 100).toFixed(2)}%</p>
                <p class="loss">Derrota: ${(res.loss * 100).toFixed(2)}%</p>
                <p class="push">Empate: ${(res.push * 100).toFixed(2)}%</p>
                <p class="ev">EV: ${res.ev.toFixed(4)}</p>
            `;
            resultsBreakdown.appendChild(box);
        }

        document.getElementById('best-action').textContent = `Ação com maior Valor Esperado (EV): ${bestAction}`;
        document.getElementById('resultsContainer').classList.remove('hidden');
    });
});
