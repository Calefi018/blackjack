// --- VARIÁVEIS DE ESTADO ---
let hands = [];
let activeHandIndex = 0;
let dealerCard = '';

// --- CONSTANTES ---
const ALL_CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// --- FUNÇÕES DE LÓGICA DE JOGO ---

// CORREÇÃO: Função mais simples e robusta para obter o valor da carta.
function getCardValue(card) {
    if (['K', 'Q', 'J', '10'].includes(card)) return 10;
    if (card === 'A') return 11;
    return parseInt(card, 10);
}

// CORREÇÃO: Garantia de que sempre retorna um número.
function getHandValue(hand) {
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

// REFINAMENTO: Função auxiliar para checar se uma mão é "soft" (Ás valendo 11).
function isSoftHand(hand) {
    let total = 0;
    let hasAce = false;
    hand.forEach(card => {
        total += getCardValue(card);
        if (card === 'A') hasAce = true;
    });
    return hasAce && total <= 21;
}

function getStrategy(playerHand, dealerCard) {
    const playerValue = getHandValue(playerHand);
    const dealerValue = getCardValue(dealerCard);
    const isInitialHand = playerHand.length === 2;
    const isSoft = isSoftHand(playerHand);

    // 1. Rendição (Surrender)
    if (isInitialHand && playerValue === 16 && !isSoft && [9, 10, 11].includes(dealerValue)) return "SURRENDER";
    if (isInitialHand && playerValue === 15 && dealerValue === 10) return "SURRENDER";

    // 2. Divisão (Split)
    if (isInitialHand && playerHand[0] === playerHand[1]) {
        const pairValue = getCardValue(playerHand[0]);
        if (pairValue === 11 || pairValue === 8) return "SPLIT";
        if (pairValue === 9 && ![7, 10, 11].includes(dealerValue)) return "SPLIT";
        if (pairValue === 7 && dealerValue <= 7) return "SPLIT";
        if (pairValue === 6 && dealerValue <= 6) return "SPLIT";
        if (pairValue === 4 && [5, 6].includes(dealerValue)) return "SPLIT";
        if ([2, 3].includes(pairValue) && dealerValue <= 7) return "SPLIT";
    }

    // 3. Dobrar (Double Down)
    if (isInitialHand) {
        if (isSoft) { // Soft Doubles
            if (playerValue >= 13 && playerValue <= 18 && [5, 6].includes(dealerValue)) return "DOUBLE";
            if (playerValue >= 17 && playerValue <= 18 && [3, 4].includes(dealerValue)) return "DOUBLE";
        } else { // Hard Doubles
            if (playerValue === 11) return "DOUBLE";
            if (playerValue === 10 && dealerValue <= 9) return "DOUBLE";
            if (playerValue === 9 && dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
        }
    }

    // 4. Pedir (Hit) ou Parar (Stand)
    if (isSoft) { // Soft Hands
        if (playerValue >= 19) return "STAND";
        if (playerValue === 18 && dealerValue <= 8) return "STAND";
        return "HIT";
    } else { // Hard Hands
        if (playerValue >= 17) return "STAND";
        if (playerValue >= 13 && dealerValue <= 6) return "STAND";
        if (playerValue === 12 && [4, 5, 6].includes(dealerValue)) return "STAND";
        return "HIT";
    }
}


// --- FUNÇÕES DE CONTROLE DA INTERFACE ---

function renderHands() {
    const handsContainer = document.getElementById('handsContainer');
    handsContainer.innerHTML = '';
    hands.forEach((hand, index) => {
        const handBox = document.createElement('div');
        handBox.className = 'hand-box';
        if (index === activeHandIndex && hands.length > 0) {
            handBox.classList.add('active');
        }
        const handValue = getHandValue(hand); // CORREÇÃO: Chamando a função correta
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

// CORREÇÃO: Lógica de fluxo de jogo totalmente refeita
function updateGame() {
    if (activeHandIndex >= hands.length) {
        // Todas as mãos foram jogadas
        document.getElementById('actionText').textContent = "Rodada Finalizada!";
        document.getElementById('actionButtons').innerHTML = ''; // Limpa botões
        return;
    }

    renderHands();
    const currentHand = hands[activeHandIndex];
    const handValue = getHandValue(currentHand);

    if (handValue >= 21) {
        // Mão estourou ou fez 21, passa para a próxima automaticamente
        setTimeout(() => nextHand(), 1000); // Espera 1s para o jogador ver o resultado
        return;
    }
    
    const strategy = getStrategy(currentHand, dealerCard);
    document.getElementById('actionText').textContent = strategy;
    renderActionButtons(strategy, currentHand);
}

function renderActionButtons(strategy, currentHand) {
    const buttonsDiv = document.getElementById('actionButtons');
    buttonsDiv.innerHTML = '';
    const isInitialHand = currentHand.length === 2;

    const actions = new Set();
    // Adiciona ações com base na estratégia
    if (strategy === 'HIT' || strategy === 'DOUBLE') actions.add('HIT');
    if (strategy === 'STAND') actions.add('STAND');
    if (strategy === 'DOUBLE') actions.add('DOUBLE');
    if (strategy === 'SPLIT') actions.add('SPLIT');
    if (strategy === 'SURRENDER') actions.add('SURRENDER');
    
    // Sempre adiciona Stand como uma opção manual, a menos que a estratégia seja Hit
    if (strategy !== 'HIT') actions.add('STAND');


    if (actions.has('HIT')) {
        const hitBtn = document.createElement('button');
        hitBtn.textContent = 'Pedir (Hit)';
        hitBtn.onclick = handleHit;
        buttonsDiv.appendChild(hitBtn);
    }
    if (actions.has('STAND')) {
        const standBtn = document.createElement('button');
        standBtn.textContent = 'Parar (Stand)';
        standBtn.className = 'stand-btn';
        standBtn.onclick = nextHand;
        buttonsDiv.appendChild(standBtn);
    }
    if (actions.has('DOUBLE') && isInitialHand) {
        const doubleBtn = document.createElement('button');
        doubleBtn.textContent = 'Dobrar (Double)';
        doubleBtn.className = 'double-btn';
        doubleBtn.onclick = () => handleHit(true);
        buttonsDiv.appendChild(doubleBtn);
    }
    if (actions.has('SPLIT') && isInitialHand && currentHand[0] === currentHand[1]) {
        const splitBtn = document.createElement('button');
        splitBtn.textContent = 'Dividir (Split)';
        splitBtn.className = 'split-btn';
        splitBtn.onclick = handleSplit;
        buttonsDiv.appendChild(splitBtn);
    }
}


function handleHit(isDouble = false) {
    const newCard = prompt("Qual carta você recebeu?");
    if (newCard && ALL_CARDS.includes(newCard.toUpperCase())) {
        hands[activeHandIndex].push(newCard.toUpperCase());
        if (isDouble) {
            renderHands();
            setTimeout(() => nextHand(), 1000);
        } else {
            updateGame();
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
        document.getElementById('playerCard1').value = '3';
        document.getElementById('playerCard2').value = '3';
        document.getElementById('dealerCard').value = '8';
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
