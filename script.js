// --- VARIÁVEIS DE ESTADO ---
let hands = [];
let activeHandIndex = 0;
let dealerCard = '';

// --- CONSTANTES ---
const ALL_CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// --- FUNÇÕES DE LÓGICA DE JOGO (Versão estável) ---
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

function isSoftHand(hand) {
    if (!hand.includes('A')) return false;
    return getHandValue(hand.map(c => c === 'A' ? '1' : c)) + 10 === getHandValue(hand);
}

function getStrategy(playerHand, dealerCard) {
    const playerValue = getHandValue(playerHand);
    const dealerValue = getCardValue(dealerCard);
    const isInitialHand = playerHand.length === 2;
    const isSoft = isSoftHand(playerHand);

    // Prioridade 1: Split
    if (isInitialHand && playerHand[0] === playerHand[1]) {
        const pairValue = getCardValue(playerHand[0]);
        if (pairValue === 11 || pairValue === 8) return "SPLIT";
        if (pairValue === 9 && ![7, 10, 11].includes(dealerValue)) return "SPLIT";
        if (pairValue === 7 && dealerValue <= 7) return "SPLIT";
        if (pairValue === 6 && dealerValue <= 6) return "SPLIT";
        if (pairValue === 4 && [5, 6].includes(dealerValue)) return "SPLIT";
        if ([2, 3].includes(pairValue) && dealerValue <= 7) return "SPLIT";
    }

    // Prioridade 2: Mãos Soft (Dobrar, Parar ou Pedir)
    if (isSoft) {
        if (isInitialHand) { // Soft Doubles
            if (playerValue >= 19 && dealerValue === 6) return "DOUBLE";
            if (playerValue === 18 && dealerValue >= 2 && dealerValue <= 6) return "DOUBLE";
            if (playerValue === 17 && dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
            if (playerValue <= 16 && dealerValue >= 4 && dealerValue <= 6) return "DOUBLE";
        }
        if (playerValue >= 19) return "STAND";
        if (playerValue === 18 && dealerValue <= 8) return "STAND";
        return "HIT";
    }

    // Prioridade 3: Mãos Hard (Dobrar, Parar ou Pedir)
    if (isInitialHand) { // Hard Doubles
        if (playerValue === 11) return "DOUBLE";
        if (playerValue === 10 && dealerValue <= 9) return "DOUBLE";
        if (playerValue === 9 && dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
    }
    if (playerValue >= 17) return "STAND";
    if (playerValue >= 13 && dealerValue <= 6) return "STAND";
    if (playerValue === 12 && [4, 5, 6].includes(dealerValue)) return "STAND";
    
    return "HIT";
}


// --- FUNÇÕES DE CONTROLE DA INTERFACE (Motor do Jogo Refeito) ---

function renderHands() {
    const handsContainer = document.getElementById('handsContainer');
    handsContainer.innerHTML = '';
    if (hands.length === 0) return;

    hands.forEach((hand, index) => {
        const handBox = document.createElement('div');
        handBox.className = 'hand-box';
        if (index === activeHandIndex) {
            handBox.classList.add('active');
        }
        const handValue = getHandValue(hand);
        let status = '';
        if (handValue > 21) status = ' (Estourou!)';
        if (handValue === 21) status = ' (21!)';
        const dealerInfo = `<p class="dealer-info">Croupier: ${dealerCard}</p>`;
        
        handBox.innerHTML = `
            <h3>Mão ${index + 1} (${handValue}) ${status}</h3>
            <p>${hand.join(' - ')}</p>
            ${index === activeHandIndex ? dealerInfo : ''}
        `;
        handsContainer.appendChild(handBox);
    });
}

// REFINAMENTO: O motor principal do jogo, agora com fluxo lógico correto.
function updateGame() {
    // Se o índice ativo já passou do número de mãos, a rodada acabou.
    if (activeHandIndex >= hands.length) {
        document.getElementById('actionText').textContent = "Rodada Finalizada!";
        document.getElementById('actionButtons').innerHTML = ''; // Limpa botões
        renderHands(); // Renderiza uma última vez para remover o destaque
        return;
    }

    const currentHand = hands[activeHandIndex];
    const handValue = getHandValue(currentHand);
    
    // Atualiza a tela ANTES de tomar decisões
    renderHands();
    
    // Se a mão atual está "completa" (21 ou estourou), passa para a próxima.
    if (handValue >= 21) {
        setTimeout(nextHand, 1200); // Espera um pouco para o jogador ver o resultado
        return;
    }
    
    // Se a mão está em jogo, calcula a estratégia e mostra os botões.
    const strategy = getStrategy(currentHand, dealerCard);
    document.getElementById('actionText').textContent = strategy;
    renderActionButtons(strategy, currentHand);
}

function renderActionButtons(strategy, currentHand) {
    const buttonsDiv = document.getElementById('actionButtons');
    buttonsDiv.innerHTML = '';
    const isInitialHand = currentHand.length === 2;

    // Ações possíveis baseadas na estratégia e regras
    const possibleActions = new Set();
    if (strategy === "HIT" || strategy === "DOUBLE") possibleActions.add("HIT");
    if (strategy === "STAND" || strategy === "SPLIT") possibleActions.add("STAND");
    if (strategy === "DOUBLE" && isInitialHand) possibleActions.add("DOUBLE");
    if (strategy === "SPLIT" && isInitialHand) possibleActions.add("SPLIT");

    // Renderiza os botões
    if (possibleActions.has('HIT')) {
        const hitBtn = document.createElement('button');
        hitBtn.textContent = 'Pedir (Hit)';
        hitBtn.onclick = handleHit;
        buttonsDiv.appendChild(hitBtn);
    }
    if (possibleActions.has('STAND')) {
        const standBtn = document.createElement('button');
        standBtn.textContent = 'Parar (Stand)';
        standBtn.className = 'stand-btn';
        standBtn.onclick = nextHand;
        buttonsDiv.appendChild(standBtn);
    }
    if (possibleActions.has('DOUBLE')) {
        const doubleBtn = document.createElement('button');
        doubleBtn.textContent = 'Dobrar (Double)';
        doubleBtn.className = 'double-btn';
        doubleBtn.onclick = () => handleHit(true);
        buttonsDiv.appendChild(doubleBtn);
    }
    if (possibleActions.has('SPLIT')) {
        const splitBtn = document.createElement('button');
        splitBtn.textContent = 'Dividir (Split)';
        splitBtn.className = 'split-btn';
        splitBtn.onclick = handleSplit;
        buttonsDiv.appendChild(splitBtn);
    }
}

// REFINAMENTO: Funções de ação simplificadas. Elas apenas modificam o estado e chamam updateGame().
function handleHit(isDouble = false) {
    const newCard = prompt("Qual carta você recebeu?");
    if (newCard && ALL_CARDS.includes(newCard.toUpperCase())) {
        hands[activeHandIndex].push(newCard.toUpperCase());
        if (isDouble) {
            renderHands(); // Mostra a carta final
            setTimeout(nextHand, 1200); // Dobrar encerra a mão
        } else {
            updateGame(); // Continua jogando a mesma mão
        }
    } else if (newCard) {
        alert("Carta inválida!");
    }
}

function handleSplit() {
    const originalCard = hands[activeHandIndex][0];
    hands.splice(activeHandIndex, 1, [originalCard], [originalCard]);
    
    let newCard1 = prompt(`Mão ${activeHandIndex + 1} (${originalCard}): Qual a 2ª carta?`);
    if (newCard1 && ALL_CARDS.includes(newCard1.toUpperCase())) {
        hands[activeHandIndex].push(newCard1.toUpperCase());
    }
    
    let newCard2 = prompt(`Mão ${activeHandIndex + 2} (${originalCard}): Qual a 2ª carta?`);
    if (newCard2 && ALL_CARDS.includes(newCard2.toUpperCase())) {
        hands[activeHandIndex + 1].push(newCard2.toUpperCase());
    }
    
    updateGame();
}

// REFINAMENTO: Função dedicada para avançar a mão
function nextHand() {
    activeHandIndex++;
    updateGame();
}

// --- INICIALIZAÇÃO E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const initialSetupDiv = document.getElementById('initialSetup');
    const gameplayDiv = document.getElementById('gameplay');

    function populateSelects() {
        document.querySelectorAll('select').forEach(select => {
            if (select.options.length === 0) {
                ALL_CARDS.forEach(card => {
                    const option = document.createElement('option');
                    option.value = card;
                    option.textContent = card;
                    select.appendChild(option);
                });
            }
        });
        document.getElementById('playerCard1').value = '2';
        document.getElementById('playerCard2').value = '2';
        document.getElementById('dealerCard').value = '3';
    }

    populateSelects();

    document.getElementById('startBtn').addEventListener('click', () => {
        hands = [[
            document.getElementById('playerCard1').value,
            document.getElementById('playerCard2').value,
        ]];
        dealerCard = document.getElementById('dealerCard').value;
        activeHandIndex = 0;
        
        initialSetupDiv.classList.add('hidden');
        gameplayDiv.classList.remove('hidden');
        
        updateGame();
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        gameplayDiv.classList.add('hidden');
        initialSetupDiv.classList.remove('hidden');
        hands = [];
        activeHandIndex = 0;
    });
});
