// --- VARIÁVEIS DE ESTADO ---
let hands = []; // Array de mãos do jogador (para splits)
let activeHandIndex = 0; // Índice da mão ativa
let dealerCard = ''; // Carta visível do croupier

// --- CONSTANTES ---
const ALL_CARDS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// --- FUNÇÕES DE LÓGICA DE JOGO ---

function getCardValue(card) {
    if (['K', 'Q', 'J', '10'].includes(card)) {
        return 10;
    }
    if (card === 'A') {
        return 11; // Ás inicialmente vale 11, ajustado em getHandValue se estourar
    }
    return parseInt(card); // Converte string numérica para int
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

    // Ajusta o valor do Ás de 11 para 1 se a mão estourar
    while (total > 21 && numAces > 0) {
        total -= 10;
        numAces--;
    }
    return total;
}

function getStrategy(playerHand, dealerCard) {
    const playerValue = getHandValue(playerHand);
    const dealerValue = getCardValue(dealerCard);
    const isInitialHand = playerHand.length === 2; // Para verificar se é a primeira decisão da mão

    // 1. Rendição (Surrender) - Apenas na primeira decisão
    if (isInitialHand) {
        if (playerValue === 16 && [9, 10, getCardValue('A')].includes(dealerValue)) return "SURRENDER";
        if (playerValue === 15 && dealerValue === getCardValue('10')) return "SURRENDER";
    }

    // 2. Divisão (Split) - Apenas na primeira decisão, se forem pares
    if (isInitialHand && playerHand[0] === playerHand[1]) {
        const pairValue = getCardValue(playerHand[0]);
        // Par de Ases ou Oitos SEMPRE divide
        if (pairValue === 11 || pairValue === 8) return "SPLIT";
        // Par de 9s, divide exceto contra 7, 10 ou Ás do dealer
        if (pairValue === 9 && ![7, 10, getCardValue('A')].includes(dealerValue)) return "SPLIT";
        // Par de 7s, divide contra 2-7
        if (pairValue === 7 && dealerValue >= 2 && dealerValue <= 7) return "SPLIT";
        // Par de 6s, divide contra 2-6
        if (pairValue === 6 && dealerValue >= 2 && dealerValue <= 6) return "SPLIT";
        // Par de 4s, divide contra 5-6 (se puder dobrar após split, o que assumimos ser padrão)
        if (pairValue === 4 && [5, 6].includes(dealerValue)) return "SPLIT";
        // Par de 3s ou 2s, divide contra 2-7
        if ([2, 3].includes(pairValue) && dealerValue >= 2 && dealerValue <= 7) return "SPLIT";
        // Não divide 10s ou 5s
        if (pairValue === 10 || pairValue === 5) return "HIT"; // Ou "DOUBLE" se a regra permitir para 5s
    }

    // 3. Dobrar (Double Down) - Apenas na primeira decisão
    if (isInitialHand) {
        // Mãos "Soft" (com Ás que ainda vale 11)
        if (playerHand.includes('A') && playerValue > getHandValue([playerHand[0] === 'A' ? '1' : playerHand[0], playerHand[1] === 'A' ? '1' : playerHand[1]])) {
            if (playerValue === 19 && dealerValue === 6) return "DOUBLE";
            if (playerValue === 18 && dealerValue >= 2 && dealerValue <= 6) return "DOUBLE";
            if (playerValue === 17 && dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
            if (playerValue === 16 && dealerValue >= 4 && dealerValue <= 6) return "DOUBLE";
            if (playerValue === 15 && dealerValue >= 4 && dealerValue <= 6) return "DOUBLE";
            if (playerValue === 14 && dealerValue >= 5 && dealerValue <= 6) return "DOUBLE";
            if (playerValue === 13 && dealerValue >= 5 && dealerValue <= 6) return "DOUBLE";
        }
        // Mãos "Hard"
        if (playerValue === 11) return "DOUBLE";
        if (playerValue === 10 && dealerValue >= 2 && dealerValue <= 9) return "DOUBLE";
        if (playerValue === 9 && dealerValue >= 3 && dealerValue <= 6) return "DOUBLE";
    }

    // 4. Pedir (Hit) ou Parar (Stand)
    // Mãos "Soft" (com Ás valendo 11)
    if (playerHand.includes('A') && playerValue !== getHandValue([playerHand[0] === 'A' ? '1' : playerHand[0], playerHand[1] === 'A' ? '1' : playerHand[1]])) {
        if (playerValue >= 19) return "STAND";
        if (playerValue === 18 && ![2, 7, 8].includes(dealerValue)) return "STAND"; // Stand A-7 vs 2,7,8 (mas hit vs 9,10,A)
        return "HIT"; // Em todas as outras softs que não dobraram ou pararam
    } else { // Mãos "Hard" (sem Ás ou com Ás valendo 1)
        if (playerValue >= 17) return "STAND";
        if (playerValue >= 13 && dealerValue <= 6) return "STAND";
        if (playerValue === 12 && [4, 5, 6].includes(dealerValue)) return "STAND";
        // Regras de Hit para Hard hands
        if (playerValue <= 11) return "HIT";
        if (playerValue === 12 && ![4, 5, 6].includes(dealerValue)) return "HIT";
        if (playerValue >= 13 && dealerValue >= 7) return "HIT"; // Hard 13-16 vs 7 ou mais
    }
    
    // Fallback genérico (nunca deveria ser alcançado com a tabela completa)
    return "HIT";
}


// --- FUNÇÕES DE CONTROLE DA INTERFACE ---

function renderHands() {
    const handsContainer = document.getElementById('handsContainer');
    handsContainer.innerHTML = ''; 
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
        else if (handValue === 21) status = ' (21!)';
        
        // Exibir a carta do dealer apenas se houver mãos ativas
        const dealerInfo = index === activeHandIndex ? `<p class="dealer-info">Croupier: ${dealerCard}</p>` : '';

        handBox.innerHTML = `
            <h3>Mão ${index + 1} ${handValue !== 0 ? '(' + handValue + ')' : ''} ${status}</h3>
            <p>${hand.join(' - ')}</p>
            ${dealerInfo}
        `;
        handsContainer.appendChild(handBox);
    });
}

function updateGame() {
    renderHands();
    const currentHand = hands[activeHandIndex];
    const handValue = getHandValue(currentHand);

    // Se a mão atual já estourou ou fez 21, passa para a próxima ou finaliza
    if (handValue >= 21) {
        return nextHandOrEndGame();
    }
    
    const strategy = getStrategy(currentHand, dealerCard);
    document.getElementById('actionText').textContent = strategy;
    renderActionButtons(strategy, currentHand);
}

function renderActionButtons(strategy, currentHand) {
    const buttonsDiv = document.getElementById('actionButtons');
    buttonsDiv.innerHTML = ''; 

    const handValue = getHandValue(currentHand);
    const isInitialHand = currentHand.length === 2;
    const canDouble = isInitialHand; // Regra comum: só dobra na mão inicial
    const canSplit = isInitialHand && currentHand[0] === currentHand[1]; // Só divide pares na mão inicial

    // Pedir (Hit)
    if (handValue < 21) { // Só pode pedir se não estourou ou fez 21
        const hitBtn = document.createElement('button');
        hitBtn.textContent = 'Pedir (Hit)';
        hitBtn.onclick = handleHit;
        buttonsDiv.appendChild(hitBtn);
    }
    
    // Parar (Stand)
    const standBtn = document.createElement('button');
    standBtn.textContent = 'Parar (Stand)';
    standBtn.className = 'stand-btn';
    standBtn.onclick = nextHandOrEndGame;
    buttonsDiv.appendChild(standBtn);


    // Dobrar (Double)
    if (canDouble && (strategy === "DOUBLE" || strategy.includes("DOUBLE"))) {
        const doubleBtn = document.createElement('button');
        doubleBtn.textContent = 'Dobrar (Double)';
        doubleBtn.className = 'double-btn';
        doubleBtn.onclick = () => handleHit(true); // 'true' para indicar que é uma dobra
        buttonsDiv.appendChild(doubleBtn);
    }

    // Dividir (Split)
    if (canSplit && strategy === "SPLIT") {
        const splitBtn = document.createElement('button');
        splitBtn.textContent = 'Dividir (Split)';
        splitBtn.className = 'split-btn';
        splitBtn.onclick = handleSplit;
        buttonsDiv.appendChild(splitBtn);
    }
    
    // Rendição (Surrender) - Apenas na primeira ação
    if (isInitialHand && strategy === "SURRENDER") {
        const surrenderBtn = document.createElement('button');
        surrenderBtn.textContent = 'Rendir (Surrender)';
        surrenderBtn.className = 'surrender-btn'; // Adicionar estilo para surrender
        surrenderBtn.onclick = () => {
            document.getElementById('actionText').textContent = "Você se rendeu (Surrender)!";
            nextHandOrEndGame();
        };
        buttonsDiv.appendChild(surrenderBtn);
    }
}

function handleHit(isDouble = false) {
    const newCard = prompt("Qual carta você recebeu? (Ex: A, K, 7)");
    if (newCard && ALL_CARDS.includes(newCard.toUpperCase())) {
        hands[activeHandIndex].push(newCard.toUpperCase());
        if (isDouble) {
            // Após dobrar, a mão para automaticamente
            renderHands(); // Atualiza a tela uma última vez
            nextHandOrEndGame();
        } else {
            updateGame(); // Recalcula a estratégia para a nova mão
        }
    } else if (newCard) { // Se o usuário digitou algo mas não é uma carta válida
        alert("Carta inválida! Por favor, use A, K, Q, J, 10, 9...2.");
        // Não avança, o usuário precisa digitar uma carta válida
    }
    // Se o usuário cancelou o prompt, não faz nada
}

function handleSplit() {
    const originalCard = hands[activeHandIndex][0];
    const newHand1 = [originalCard];
    const newHand2 = [originalCard];
    
    // Remove a mão original e insere as duas novas mãos divididas
    hands.splice(activeHandIndex, 1, newHand1, newHand2);

    // Pede a segunda carta para a primeira nova mão
    let newCard1 = prompt(`Mão ${activeHandIndex + 1} (${originalCard}): Qual a segunda carta?`);
    if (newCard1 && ALL_CARDS.includes(newCard1.toUpperCase())) {
        hands[activeHandIndex].push(newCard1.toUpperCase());
    } else {
        alert("Carta inválida para a primeira mão dividida! Reinicie se for o caso.");
        return; // Sai da função se a carta for inválida
    }

    // Pede a segunda carta para a segunda nova mão
    let newCard2 = prompt(`Mão ${activeHandIndex + 2} (${originalCard}): Qual a segunda carta?`);
    if (newCard2 && ALL_CARDS.includes(newCard2.toUpperCase())) {
        hands[activeHandIndex + 1].push(newCard2.toUpperCase());
    } else {
        alert("Carta inválida para a segunda mão dividida! Reinicie se for o caso.");
        return; // Sai da função se a carta for inválida
    }
    
    // Se dividir Ases, as novas mãos só recebem UMA carta.
    // O Blackjack real daria uma carta e você pararia; aqui a simulação continua.
    if (originalCard === 'A') {
        renderHands(); // Atualiza a tela com as mãos divididas e suas 2as cartas
        // Após dividir Ases, você só recebe uma carta e então a mão deve parar
        // Para simplificar, faremos a mesma lógica de "dobrar" aqui para Ases
        setTimeout(() => { // Pequeno delay para a UI atualizar antes de passar
            nextHandOrEndGame();
        }, 500);
    } else {
        updateGame(); // Recalcula para a primeira mão dividida
    }
}


function nextHandOrEndGame() {
    // Esconde os botões de ação enquanto decide o que fazer
    document.getElementById('actionButtons').innerHTML = '';
    document.getElementById('actionText').textContent = "Calculando...";

    // Incrementa para a próxima mão
    activeHandIndex++;

    if (activeHandIndex < hands.length) {
        // Ainda há mãos para jogar
        updateGame();
    } else {
        // Todas as mãos foram jogadas
        document.getElementById('actionText').textContent = "Rodada Finalizada!";
        // Opcional: mostrar totais finais de todas as mãos
    }
}


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    const initialSetupDiv = document.getElementById('initialSetup');
    const gameplayDiv = document.getElementById('gameplay');

    function populateSelects() {
        const selects = document.querySelectorAll('select');
        selects.forEach(select => {
            if (select.options.length === 0) { // Evita duplicar opções se já existirem
                ALL_CARDS.forEach(card => {
                    const option = document.createElement('option');
                    option.value = card;
                    option.textContent = card;
                    select.appendChild(option);
                });
            }
        });
        // Valores padrão para facilitar testes (8-8 vs 6 é um bom split)
        document.getElementById('playerCard1').value = '8';
        document.getElementById('playerCard2').value = '8';
        document.getElementById('dealerCard').value = '6';
    }

    populateSelects();

    document.getElementById('startBtn').addEventListener('click', () => {
        hands = [[ // Começa com uma única mão
            document.getElementById('playerCard1').value,
            document.getElementById('playerCard2').value,
        ]];
        dealerCard = document.getElementById('dealerCard').value;
        activeHandIndex = 0; // Sempre começa na primeira mão
        
        initialSetupDiv.classList.add('hidden');
        gameplayDiv.classList.remove('hidden');
        
        updateGame(); // Inicia o loop de jogo
    });

    document.getElementById('resetBtn').addEventListener('click', () => {
        gameplayDiv.classList.add('hidden');
        initialSetupDiv.classList.remove('hidden');
        // Limpa as variáveis de estado
        hands = [];
        activeHandIndex = 0;
        dealerCard = '';
        // Resetar seleções se quiser
        document.getElementById('playerCard1').value = '8';
        document.getElementById('playerCard2').value = '8';
        document.getElementById('dealerCard').value = '6';
    });
});
