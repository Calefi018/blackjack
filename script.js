// Funções para calcular valores
function getCardValue(card) {
    if (['K', 'Q', 'J', '10'].includes(card)) {
        return 10;
    }
    if (card === 'A') {
        return 11;
    }
    return parseInt(card);
}

function getHandValue(hand) {
    let total = 0;
    let numAces = 0;
    hand.forEach(card => {
        total += getCardValue(card);
        if (card === 'A') {
            numAces++;
        }
    });

    while (total > 21 && numAces > 0) {
        total -= 10;
        numAces--;
    }
    return total;
}

// Lógica principal da estratégia
function getStrategy(playerHand, dealerCard) {
    const playerValue = getHandValue(playerHand);
    const dealerValue = getCardValue(dealerCard);

    // Regra de Pares (Split)
    if (playerHand.length === 2 && playerHand[0] === playerHand[1]) {
        const pair = playerHand[0];
        if (pair === 'A' || pair === '8') return "DIVIDIR (Split)";
        if (pair === '9' && ![7, 10, 11].includes(dealerValue)) return "DIVIDIR (Split)";
        // ... (Adicionar outras regras de split aqui)
    }

    // Regras para Mãos "Soft" (com Ás)
    if (playerHand.includes('A') && getHandValue(playerHand) !== (getCardValue(playerHand[0]) + getCardValue(playerHand[1]))) {
        if (playerValue >= 19) return "PARAR (Stand)";
        if (playerValue === 18 && dealerValue <= 8) return "PARAR (Stand)";
        // Para simplificar, as regras de dobrar em mãos soft viram PEDIR
        return "PEDIR (Hit)";
    }
    
    // Regras para Mãos "Hard"
    if (playerValue >= 17) return "PARAR (Stand)";
    if (playerValue >= 13 && dealerValue <= 6) return "PARAR (Stand)";
    if (playerValue === 12 && [4, 5, 6].includes(dealerValue)) return "PARAR (Stand)";

    if (playerValue === 11) return "DOBRAR (Double) ou PEDIR";
    if (playerValue === 10 && dealerValue <= 9) return "DOBRAR (Double) ou PEDIR";
    if (playerValue === 9 && dealerValue >= 3 && dealerValue <= 6) return "DOBRAR (Double) ou PEDIR";


    return "PEDIR (Hit)";
}

// --- Interação com a Página (DOM) ---
document.addEventListener('DOMContentLoaded', () => {
    const calculateBtn = document.getElementById('calculateBtn');
    const resultDiv = document.getElementById('result');
    const actionText = document.getElementById('actionText');

    calculateBtn.addEventListener('click', () => {
        const playerCard1 = document.getElementById('playerCard1').value;
        const playerCard2 = document.getElementById('playerCard2').value;
        const dealerCard = document.getElementById('dealerCard').value;

        const playerHand = [playerCard1, playerCard2];
        const action = getStrategy(playerHand, dealerCard);

        actionText.textContent = action;
        resultDiv.classList.remove('hidden');
    });
});
