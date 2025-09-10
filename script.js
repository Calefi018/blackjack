// --- VARIÁVEIS DE ESTADO ---
let hands = []; // Agora pode ter várias mãos: [['A', '5']] ou [['8'], ['8']]
let activeHandIndex = 0;
let dealerCard = '';

// --- LÓGICA DE BLACKJACK (Refinada) ---
function getCardValue(card) { /* ... (sem alterações) ... */ }
function getHandValue(hand) { /* ... (sem alterações) ... */ }

function getStrategy(playerHand, dealerCard) {
    const playerValue = getHandValue(playerHand);
    const dealerValue = getCardValue(dealerCard);
    const isFirstAction = playerHand.length === 2;

    // 1. Regras de Rendição (Surrender) - Opcional, mas para um bot completo...
    if (isFirstAction && playerValue === 16 && [9, 10, 11].includes(dealerValue)) return "SURRENDER";
    if (isFirstAction && playerValue === 15 && dealerValue === 10) return "SURRENDER";

    // 2. Regras de Divisão (Split)
    if (isFirstAction && playerHand[0] === playerHand[1]) {
        const pair = getCardValue(playerHand[0]);
        if (pair === 11 || pair === 8) return "SPLIT"; // Ases e Oitos
        if (pair === 9 && ![7, 10, 11].includes(dealerValue)) return "SPLIT";
        if (pair === 7 && dealerValue <= 7) return "SPLIT";
        if (pair === 6 && dealerValue <= 6) return "SPLIT";
        if (pair === 4 && [5, 6].includes(dealerValue)) return "SPLIT"; // Se puder dobrar após dividir
        if (pair === 3 && dealerValue <= 7) return "SPLIT";
        if (pair === 2 && dealerValue <= 7) return "SPLIT";
    }

    // 3. Regras de Dobrar (Double Down)
    if (isFirstAction) {
        // Mãos "Soft" (com Ás)
        if (playerHand.includes('A')) {
            if (playerValue === 18 && dealerValue <= 6) return "DOUBLE";
            if (playerValue === 17 && dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
            // ... (outras regras de double soft)
        }
        // Mãos "Hard"
        if (playerValue === 11) return "DOUBLE";
        if (playerValue === 10 && dealerValue <= 9) return "DOUBLE";
        if (playerValue === 9 && dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
    }

    // 4. Regras de Pedir (Hit) ou Parar (Stand)
    if (playerHand.includes('A') && playerValue > getHandValue(['A', '10'])) { // Soft Hands
        if (playerValue >= 19) return "STAND";
        if (playerValue === 18 && dealerValue > 8) return "HIT";
        return "STAND"; // Para A,7 vs <=8
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
    handsContainer.innerHTML = ''; // Limpa as mãos antigas
    hands.forEach((hand, index) => {
        const handBox = document.createElement('div');
        handBox.className = 'hand-box';
        if (index === activeHandIndex) {
            handBox.classList.add('active');
        }
        const handValue = getHandValue(hand);
        let status = '';
        if (handValue > 21) status = ' (Estourou!)';
        if (handValue === 21 && hand.length === 2) status = ' (Blackjack!)';
        
        handBox.innerHTML = `
            <h3>Mão ${index + 1}${status}</h3>
            <p>${hand.join(' - ')} (${handValue})</p>
        `;
        handsContainer.appendChild(handBox);
    });
}

function updateGame() {
    renderHands();
    const currentHand = hands[activeHandIndex];
    const handValue = getHandValue(currentHand);

    if (handValue >= 21) {
        // Se a mão estourou ou fez 21, passa para a próxima automaticamente
        return nextHandOrEndGame();
    }
    
    const strategy = getStrategy(currentHand, dealerCard);
    document.getElementById('actionText').textContent = strategy;
    renderActionButtons(strategy);
}

function renderActionButtons(strategy) {
    const buttonsDiv = document.getElementById('actionButtons');
    buttonsDiv.innerHTML = ''; // Limpa botões antigos
    
    // Botão de Parar (Stand) sempre disponível (a menos que já tenha estourado)
    const standBtn = document.createElement('button');
    standBtn.textContent = 'Parar (Stand)';
    standBtn.className = 'stand-btn';
    standBtn.onclick = () => {
        nextHandOrEndGame();
    };
    buttonsDiv.appendChild(standBtn);

    // Botões contextuais
    if (strategy === "HIT" || strategy === "DOUBLE") {
        const hitBtn = document.createElement('button');
        hitBtn.textContent = 'Pedir (Hit)';
        hitBtn.onclick = handleHit;
        buttonsDiv.appendChild(hitBtn);
    }
    if (strategy === "DOUBLE") {
        const doubleBtn = document.createElement('button');
        doubleBtn.textContent = 'Dobrar (Double)';
        doubleBtn.className = 'double-btn';
        doubleBtn.onclick = () => {
            // No modo assistente, dobrar é como pedir uma carta e parar.
            handleHit(true); // 'true' para indicar que é uma dobra
        };
        buttonsDiv.appendChild(doubleBtn);
    }
    if (strategy === "SPLIT") {
        const splitBtn = document.createElement('button');
        splitBtn.textContent = 'Dividir (Split)';
        splitBtn.className = 'split-btn';
        splitBtn.onclick = handleSplit;
        buttonsDiv.appendChild(splitBtn);
    }
}

function handleHit(isDouble = false) {
    const newCard = prompt("Qual carta você recebeu?");
    if (newCard) {
        hands[activeHandIndex].push(newCard.toUpperCase());
        if (isDouble) {
             // Após dobrar, a mão para e passa para a próxima.
            renderHands(); // Atualiza a tela uma última vez
            nextHandOrEndGame();
        } else {
            updateGame();
        }
    }
}

function handleSplit() {
    const originalHand = hands[activeHandIndex];
    hands.splice(activeHandIndex, 1, [originalHand[0]], [originalHand[1]]);
    
    // Pede a segunda carta para cada nova mão
    let newCard1 = prompt(`Mão 1 (${originalHand[0]}): Qual a segunda carta?`);
    let newCard2 = prompt(`Mão 2 (${originalHand[1]}): Qual a segunda carta?`);
    
    if (newCard1 && newCard2) {
        hands[activeHandIndex].push(newCard1.toUpperCase());
        hands[activeHandIndex + 1].push(newCard2.toUpperCase());
    }
    
    updateGame();
}

function nextHandOrEndGame() {
    if (activeHandIndex < hands.length - 1) {
        activeHandIndex++;
        updateGame();
    } else {
        document.getElementById('actionText').textContent = "Rodada Finalizada!";
        document.getElementById('actionButtons').innerHTML = '';
    }
}


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    // Código de inicialização e event listeners
    // ... (restante do código igual ao anterior para popular selects e botões de start/reset)
});

// Cole o restante do código de `DOMContentLoaded` da versão anterior aqui.
// (populateSelects, e os listeners para startBtn e resetBtn, adaptando-os)
// A lógica dentro deles precisa ser ajustada para o novo sistema.
// Por exemplo: o startBtn agora inicializa o `hands` array e o `activeHandIndex`.

// Versão completa e ajustada do DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
    const initialSetupDiv = document.getElementById('initialSetup');
    const gameplayDiv = document.getElementById('gameplay');

    function populateSelects() {
        const cards = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        document.querySelectorAll('select').forEach(select => {
            if(select.options.length === 0) {
                 cards.forEach(card => {
                    const option = document.createElement('option');
                    option.value = card;
                    option.textContent = card;
                    select.appendChild(option);
                });
            }
        });
        document.getElementById('playerCard1').value = '8';
        document.getElementById('playerCard2').value = '8';
        document.getElementById('dealerCard').value = '6';
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
    });
});
