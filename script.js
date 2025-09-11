// --- SCRIPT.JS COMPLETO (VERSÃO FINAL COM SPLIT) ---

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

function createDeck(numDecks) {
    const deck = {};
    for (let i = 1; i <= 9; i++) {
        const cardName = i === 1 ? 'A' : i.toString();
        deck[cardName] = 4 * numDecks;
    }
    deck['10'] = 16 * numDecks;
    return deck;
}

function calculateDealerProbs(dealerHand, currentDeck) {
    const handKey = `D:${dealerHand.sort().join(',')}`;
    if (memoCache[handKey]) return memoCache[handKey];

    const handValue = getHandValue(dealerHand);
    if (handValue > 21) return { bust: 1 };
    if (handValue >= 17) return { [handValue]: 1 };

    let totalProbs = {};
    const totalCardsRemaining = Object.values(currentDeck).reduce((a, b) => a + b, 0);
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


function getBestEvForHand(playerHand, dealerProbs, currentDeck) {
    const handKey = `P:${playerHand.sort().join(',')}`;
    if (memoCache[handKey]) return memoCache[handKey];

    const playerValue = getHandValue(playerHand);
    if (playerValue > 21) return { ev: -1 }; // Retorna apenas o EV

    // EV ao PARAR (Stand)
    const standResult = getStandEV(playerValue, dealerProbs);

    // EV ao PEDIR (Hit)
    let hitEv = -Infinity;
    const totalCardsRemaining = Object.values(currentDeck).reduce((a, b) => a + b, 0);

    if (totalCardsRemaining > 0) {
        let weightedEvSum = 0;
        for (const card in currentDeck) {
            if (currentDeck[card] > 0) {
                const probOfDrawingCard = currentDeck[card] / totalCardsRemaining;
                const newDeck = { ...currentDeck };
                newDeck[card]--;
                const newHand = [...playerHand, card];
                const nextHandBestEv = getBestEvForHand(newHand, dealerProbs, newDeck);
                weightedEvSum += probOfDrawingCard * nextHandBestEv.ev;
            }
        }
        hitEv = weightedEvSum;
    }

    const bestEv = Math.max(standResult.ev, hitEv);
    memoCache[handKey] = { ev: bestEv };
    return { ev: bestEv };
}


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

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    
    calculateBtn.addEventListener('click', () => {
        memoCache = {};
        
        const numDecks = parseInt(document.getElementById('deckCount').value);
        const playerHandStr = document.getElementById('playerCards').value.toUpperCase().split(' ');
        const dealerCardStr = document.getElementById('dealerCard').value.toUpperCase();
        
        if (playerHandStr.length === 0 || playerHandStr.some(c => !CARDS.includes(c)) || !CARDS.includes(dealerCardStr)) {
            alert("Mão ou carta do croupier inválida. Use A, K, Q, J, 10...2");
            return;
        }

        const initialDeck = createDeck(numDecks);
        const playerHand = playerHandStr.map(c => (getCardValue(c) === 10) ? '10' : c);
        const dealerCard = (getCardValue(dealerCardStr) === 10) ? '10' : dealerCardStr;

        playerHand.forEach(card => { if(initialDeck[card]) initialDeck[card]-- });
        if(initialDeck[dealerCard]) initialDeck[dealerCard]--;

        const dealerProbs = calculateDealerProbs([dealerCard], initialDeck);
        const playerValue = getHandValue(playerHand);

        // Calcular EV para Stand
        const standResult = getStandEV(playerValue, dealerProbs);
        
        // Calcular EV para Hit
        let hitEvCalc = 0;
        const totalCardsRemaining = Object.values(initialDeck).reduce((a, b) => a + b, 0);
        if (totalCardsRemaining > 0 && playerValue < 21) {
            for(const card in initialDeck) {
                if(initialDeck[card] > 0) {
                    const newHand = [...playerHand, card];
                    const newDeck = {...initialDeck};
                    newDeck[card]--;
                    hitEvCalc += (initialDeck[card]/totalCardsRemaining) * getBestEvForHand(newHand, dealerProbs, newDeck).ev;
                }
            }
        }
        
        const results = {
            'PARAR (Stand)': standResult,
        };
        if (playerValue < 21) {
            results['PEDIR (Hit)'] = { ev: hitEvCalc };
        }
        
        // Adicionar Dobrar e Dividir se for a mão inicial
        if (playerHand.length === 2) {
            if (playerValue < 21) {
                results['DOBRAR (Double)'] = { ev: hitEvCalc * 2 };
            }

            if (playerHand[0] === playerHand[1]) {
                const pairCard = playerHand[0];
                let singleHandEvSum = 0;
                if (totalCardsRemaining > 0) {
                    for(const card in initialDeck){
                        if(initialDeck[card] > 0){
                            const newHand = [pairCard, card];
                            const newDeck = {...initialDeck};
                            newDeck[card]--;
                            singleHandEvSum += (initialDeck[card]/totalCardsRemaining) * getBestEvForHand(newHand, dealerProbs, newDeck).ev;
                        }
                    }
                }
                results['DIVIDIR (Split)'] = { ev: singleHandEvSum * 2 };
            }
        }

        let bestAction = '';
        let bestEv = -Infinity;
        for (const action in results) {
            if (results[action].ev > bestEv) {
                bestEv = results[action].ev;
                bestAction = action;
            }
        }

        const resultsBreakdown = document.getElementById('results-breakdown');
        resultsBreakdown.innerHTML = '';
        for (const action in results) {
            const res = results[action];
            const box = document.createElement('div');
            box.className = 'result-box';
            if (action === bestAction) box.classList.add('best');
            
            if(res.win === undefined){
                 box.innerHTML = `<h4>${action}</h4><p class="ev">Valor Esperado (EV): ${res.ev.toFixed(4)}</p>`;
            } else {
                 box.innerHTML = `
                    <h4>${action}</h4>
                    <p class="win">Vitória: ${(res.win * 100).toFixed(2)}%</p>
                    <p class="loss">Derrota: ${(res.loss * 100).toFixed(2)}%</p>
                    <p class="push">Empate: ${(res.push * 100).toFixed(2)}%</p>
                    <p class="ev">EV: ${res.ev.toFixed(4)}</p>
                `;
            }
            resultsBreakdown.appendChild(box);
        }

        document.getElementById('best-action').textContent = `Ação com maior Valor Esperado (EV): ${bestAction}`;
        document.getElementById('resultsContainer').classList.remove('hidden');
    });
});
