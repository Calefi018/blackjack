// --- VARIÁVEIS DE ESTADO DO JOGO ---
let playerHand = [];
let dealerCard = '';

// --- FUNÇÕES DE LÓGICA (iguais a antes) ---
function getCardValue(card) {
    if (['K', 'Q', 'J', '10'].includes(card)) return 10;
    if (card === 'A') return 11;
    return parseInt(card);
}

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

function getStrategy(playerHand, dealerCard) {
    const playerValue = getHandValue(playerHand);
    const dealerValue = getCardValue(dealerCard);
    
    // Se a mão já tem 3+ cartas, não se pode mais dividir ou dobrar
    if (playerHand.length > 2) {
        if (playerValue >= 17) return "PARAR (Stand)";
        if (playerValue >= 13 && dealerValue <= 6) return "PARAR (Stand)";
        if (playerValue === 12 && [4, 5, 6].includes(dealerValue)) return "PARAR (Stand)";
        return "PEDIR (Hit)";
    }

    // Estratégia para 2 cartas (igual a antes)
    if (playerHand.length === 2 && playerHand[0] === playerHand[1]) {
        const pair = playerHand[0];
        if (pair === 'A' || pair === '8') return "DIVIDIR (Split)";
        if (pair === '9' && ![7, 10, 11].includes(dealerValue)) return "DIVIDIR (Split)";
    }
    if (playerHand.includes('A') && getHandValue(playerHand) !== (getCardValue(playerHand[0]) + getCardValue(playerHand[1]))) {
        if (playerValue >= 19) return "PARAR (Stand)";
        if (playerValue === 18 && dealerValue <= 8) return "PARAR (Stand)";
        return "PEDIR (Hit)";
    }
    if (playerValue >= 17) return "PARAR (Stand)";
    if (playerValue >= 13 && dealerValue <= 6) return "PARAR (Stand)";
    if (playerValue === 12 && [4, 5, 6].includes(dealerValue)) return "PARAR (Stand)";
    if (playerValue === 11) return "DOBRAR (Double) ou PEDIR";
    if (playerValue === 10 && dealerValue <= 9) return "DOBRAR (Double) ou PEDIR";
    if (playerValue === 9 && dealerValue >= 3 && dealerValue <= 6) return "DOBRAR (Double) ou PEDIR";

    return "PEDIR (Hit)";
}


// --- FUNÇÕES DE CONTROLE DA INTERFACE ---

// Atualiza a tela com a mão atual e a nova estratégia
function updateUI() {
    const playerValue = getHandValue(playerHand);
    const action = getStrategy(playerHand, dealerCard);

    document.getElementById('currentHandText').textContent = playerHand.join(' - ');
    document.getElementById('currentHandValue').textContent = `Total: ${playerValue}`;
    document.getElementById('dealerCardText').textContent = dealerCard;
    document.getElementById('actionText').textContent = action;
    
    // Se estourou ou fez 21, ou a sugestão é parar, desativa o botão de pedir
    const addCardBtn = document.getElementById('addCardBtn');
    if (playerValue >= 21 || !action.includes('PEDIR')) {
        addCardBtn.disabled = true;
        document.getElementById('addCardSection').style.opacity = '0.5';
        if(playerValue > 21) document.getElementById('actionText').textContent = "ESTOUROU (Bust)";
        if(playerValue === 21) document.getElementById('actionText').textContent = "BLACKJACK / 21! - PARAR (Stand)";
    } else {
        addCardBtn.disabled = false;
        document.getElementById('addCardSection').style.opacity = '1';
    }
}

// Preenche os menus de seleção de cartas
function populateSelects() {
    const cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        cards.forEach(card => {
            const option = document.createElement('option');
            option.value = card;
            option.textContent = card;
            select.appendChild(option);
        });
    });
    // Valores padrão
    document.getElementById('playerCard1').value = '10';
    document.getElementById('playerCard2').value = '6';
    document.getElementById('dealerCard').value = '7';
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    populateSelects();

    const startBtn = document.getElementById('startBtn');
    const addCardBtn = document.getElementById('addCardBtn');
    const resetBtn = document.getElementById('resetBtn');

    const initialSetupDiv = document.getElementById('initialSetup');
    const gameplayDiv = document.getElementById('gameplay');

    // Botão INICIAR RODADA
    startBtn.addEventListener('click', () => {
        playerHand = [
            document.getElementById('playerCard1').value,
            document.getElementById('playerCard2').value,
        ];
        dealerCard = document.getElementById('dealerCard').value;

        initialSetupDiv.classList.add('hidden');
        gameplayDiv.classList.remove('hidden');
        
        updateUI();
    });

    // Botão ADICIONAR CARTA
    addCardBtn.addEventListener('click', () => {
        const newCard = document.getElementById('newCardSelect').value;
        playerHand.push(newCard);
        updateUI();
    });

    // Botão REINICIAR RODADA
    resetBtn.addEventListener('click', () => {
        playerHand = [];
        dealerCard = '';

        gameplayDiv.classList.add('hidden');
        initialSetupDiv.classList.remove('hidden');
    });
});
