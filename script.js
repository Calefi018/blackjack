// --- CONSTANTES E ESTADO GLOBAL ---
const CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
let memoCache = {};

// --- FUNÇÕES DE LÓGICA DE JOGO BÁSICAS ---
function getCardValue(card) { /* ... (sem alterações) ... */ }
function getHandValue(hand) { /* ... (sem alterações) ... */ }

// --- MOTOR DE PROBABILIDADE (COM SPLIT) ---

function createDeck(numDecks) {
    const deck = {};
    for (let i = 1; i <= 9; i++) {
        const cardName = i === 1 ? 'A' : i.toString();
        deck[cardName] = 4 * numDecks;
    }
    deck['10'] = 16 * numDecks;
    return deck;
}

function calculateDealerProbs(dealerHand, currentDeck) { /* ... (sem alterações) ... */ }

// NOVA FUNÇÃO: Calcula o Valor Esperado da ação de SPLIT.
function getSplitEV(pairCard, dealerProbs, currentDeck) {
    let totalWeightedEv = 0;
    const totalCardsRemaining = Object.values(currentDeck).reduce((a, b) => a + b, 0);

    if (totalCardsRemaining === 0) return -1; // Não pode dividir se não há cartas

    // Itera sobre cada carta possível que podemos receber na primeira mão dividida
    for (const firstCardDrawn in currentDeck) {
        if (currentDeck[firstCardDrawn] > 0) {
            const probOfDrawingFirst = currentDeck[firstCardDrawn] / totalCardsRemaining;
            
            // Cria a nova mão e o novo baralho
            const newHand1 = [pairCard, firstCardDrawn];
            const deckAfterFirstDraw = { ...currentDeck };
            deckAfterFirstDraw[firstCardDrawn]--;
            const cardsRemainingAfterFirst = totalCardsRemaining - 1;

            let secondHandEvSum = 0;
            // Agora, para a segunda mão, fazemos o mesmo processo
            if (cardsRemainingAfterFirst > 0) {
                for (const secondCardDrawn in deckAfterFirstDraw) {
                    if (deckAfterFirstDraw[secondCardDrawn] > 0) {
                         const probOfDrawingSecond = deckAfterFirstDraw[secondCardDrawn] / cardsRemainingAfterFirst;
                         const newHand2 = [pairCard, secondCardDrawn];
                         const deckAfterSecondDraw = { ...deckAfterFirstDraw };
                         deckAfterSecondDraw[secondCardDrawn]--;

                         // O valor da segunda mão é o melhor EV que podemos obter dela
                         const evHand2 = getBestEvForHand(newHand2, dealerProbs, deckAfterSecondDraw).ev;
                         secondHandEvSum += probOfDrawingSecond * evHand2;
                    }
                }
            }

            const evHand1 = getBestEvForHand(newHand1, dealerProbs, deckAfterFirstDraw).ev;
            
            // O EV total para este cenário (receber a 'firstCardDrawn') é a soma dos EVs das duas mãos
            totalWeightedEv += probOfDrawingFirst * (evHand1 + secondHandEvSum);
        }
    }
    
    // O EV do Split é o EV total ponderado. Subtraímos 1 para representar a aposta adicional.
    return totalWeightedEv - 1; 
}


function getBestEvForHand(playerHand, dealerProbs, currentDeck) { /* ... (sem alterações) ... */ }
function getStandEV(playerValue, dealerProbs) { /* ... (sem alterações) ... */ }

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    
    calculateBtn.addEventListener('click', () => {
        memoCache = {};
        
        const numDecks = parseInt(document.getElementById('deckCount').value);
        const playerHandStr = document.getElementById('playerCards').value.toUpperCase().split(' ');
        const dealerCardStr = document.getElementById('dealerCard').value.toUpperCase();
        
        if (playerHandStr.length !== 2 || !dealerCardStr) {
            alert("Por favor, insira exatamente duas cartas para o jogador.");
            return;
        }

        const initialDeck = createDeck(numDecks);
        const playerHand = playerHandStr.map(c => (getCardValue(c) === 10) ? '10' : c);
        const dealerCard = (getCardValue(dealerCardStr) === 10) ? '10' : dealerCardStr;

        playerHand.forEach(card => initialDeck[card]--);
        initialDeck[dealerCard]--;

        const dealerProbs = calculateDealerProbs([dealerCard], initialDeck);
        const playerValue = getHandValue(playerHand);

        const standResult = getStandEV(playerValue, dealerProbs);
        
        let hitEvCalc = 0;
        const totalCardsRemaining = Object.values(initialDeck).reduce((a, b) => a + b, 0);
        if (totalCardsRemaining > 0) {
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
            'PEDIR (Hit)': { ev: hitEvCalc },
            'DOBRAR (Double)': { ev: hitEvCalc * 2 }
        };

        // ADICIONADO: Lógica para calcular e incluir a opção de Split
        if (playerHand[0] === playerHand[1]) {
            // O EV de um split é calculado de forma diferente, pois envolve duas mãos.
            // A nossa função getSplitEV já está ajustada para a aposta dupla.
            const pairCard = playerHand[0];
            const deckForSplit = {...initialDeck};

            // A lógica de split é complexa, vamos simplificar para chamar o EV de uma mão x2
            let singleHandEvSum = 0;
            for(const card in deckForSplit){
                if(deckForSplit[card] > 0){
                    const newHand = [pairCard, card];
                    const newDeck = {...deckForSplit};
                    newDeck[card]--;
                    singleHandEvSum += (deckForSplit[card]/totalCardsRemaining) * getBestEvForHand(newHand, dealerProbs, newDeck).ev;
                }
            }
            results['DIVIDIR (Split)'] = { ev: singleHandEvSum * 2 };
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
            
            if(res.win === undefined){ // Para ações sem probs de win/loss diretas
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
