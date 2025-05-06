// Configurações iniciais
const BOSS_POKEMON_ID = 6; // Charizard
const MAX_RANDOM_POKEMON = 151; // Primeira geração
const BASE_HP = 100;

// Elementos do DOM
const battleBtn = document.getElementById('battle-btn');
const addChallengerBtn = document.getElementById('add-challenger-btn');
const queueDisplay = document.getElementById('queue-display');
const queueSize = document.getElementById('queue-size');
const battleDisplay = document.getElementById('battle-display');
const battleResult = document.getElementById('battle-result');
const nextChallenger = document.getElementById('next-challenger');
const winnersList = document.getElementById('winners-list');
const attackSound = document.getElementById('attack-sound');
const victorySound = document.getElementById('victory-sound');

// Estado do jogo
const queue = [];
const winners = [];
let bossPokemon = null;
let bossCurrentHP = BASE_HP * 3; // Chefe tem HP triplicado

// Inicialização
async function init() {
    try {
        // Carrega dados do Pokémon chefe
        bossPokemon = await fetchPokemonData(BOSS_POKEMON_ID);
        updateBossDisplay();
        
        // Habilita botões
        addChallengerBtn.disabled = false;
        
        // Carrega vencedores do localStorage
        loadWinners();
    } catch (error) {
        console.error('Erro ao inicializar:', error);
        battleDisplay.innerHTML = '<p class="error">Erro ao carregar dados do Pokémon chefe.</p>';
    }
}

// Carrega dados de um Pokémon da API
async function fetchPokemonData(pokemonId) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`);
    if (!response.ok) throw new Error('Pokémon não encontrado');
    
    const data = await response.json();
    
    return {
        id: data.id,
        name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
        image: data.sprites.other['official-artwork'].front_default,
        types: data.types.map(t => t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1)).join('/'),
        stats: {
            hp: data.stats[0].base_stat,
            attack: data.stats[1].base_stat,
            defense: data.stats[2].base_stat
        }
    };
}

// Adiciona um desafiante aleatório à fila
async function addRandomChallenger() {
    addChallengerBtn.disabled = true;
    
    try {
        const randomId = Math.floor(Math.random() * MAX_RANDOM_POKEMON) + 1;
        const pokemon = await fetchPokemonData(randomId);
        
        queue.push(pokemon);
        updateQueueDisplay();
        
        if (queue.length === 1) {
            updateNextChallengerDisplay();
            battleBtn.disabled = false;
        }
    } catch (error) {
        console.error('Erro ao adicionar desafiante:', error);
        battleDisplay.innerHTML = '<p class="error">Erro ao adicionar desafiante. Tente novamente.</p>';
    } finally {
        addChallengerBtn.disabled = false;
    }
}

// Atualiza a exibição da fila
function updateQueueDisplay() {
    queueDisplay.innerHTML = '';
    queueSize.textContent = `(${queue.length})`;
    
    queue.forEach((pokemon, index) => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerHTML = `
            <p><strong>${pokemon.name}</strong></p>
            <p>Tipo: ${pokemon.types}</p>
            <p>HP: ${pokemon.stats.hp * 2}</p>
            <p>Ataque: ${pokemon.stats.attack}</p>
            <p>Posição: ${index + 1}</p>
        `;
        queueDisplay.appendChild(item);
    });
}

// Atualiza a exibição do próximo desafiante
function updateNextChallengerDisplay() {
    if (queue.length > 0) {
        const pokemon = queue[0];
        nextChallenger.innerHTML = `
            <img src="${pokemon.image}" alt="${pokemon.name}">
            <h3>${pokemon.name}</h3>
            <p>Tipo: ${pokemon.types}</p>
            <p>HP: ${pokemon.stats.hp * 2}</p>
            <p>Ataque: ${pokemon.stats.attack}</p>
        `;
    } else {
        nextChallenger.innerHTML = '<p>Nenhum desafiante na fila</p>';
        battleBtn.disabled = true;
    }
}

// Atualiza a exibição do chefe
function updateBossDisplay() {
    if (bossPokemon) {
        document.getElementById('boss-name').textContent = bossPokemon.name;
        document.getElementById('boss-type').textContent = `Tipo: ${bossPokemon.types}`;
        document.getElementById('boss-hp').textContent = `HP: ${bossCurrentHP}/${BASE_HP * 3}`;
    }
}

// Executa uma batalha
function performBattle() {
    if (queue.length === 0) return;
    
    battleBtn.disabled = true;
    battleDisplay.innerHTML = '<p>Preparando batalha...</p>';
    
    // Remove o primeiro desafiante da fila (FIFO)
    const challenger = queue.shift();
    updateQueueDisplay();
    updateNextChallengerDisplay();
    
    // Exibe informações da batalha
    displayBattleInfo(challenger);
    
    // Simula a batalha após um pequeno delay
    setTimeout(() => {
        const result = simulateBattle(challenger);
        displayBattleResult(challenger, result);
        
        if (result.winner === 'challenger') {
            winners.push({ pokemon: challenger, bossHpLeft: bossCurrentHP });
            saveWinners();
            updateWinnersDisplay();
            
            // Toca som de vitória
            victorySound.play();
        } else {
            // Toca som de ataque
            attackSound.play();
        }
        
        // Anima o ataque
        animateAttack(result.winner);
        
        // Habilita o botão de batalha se ainda houver desafiantes
        if (queue.length > 0) {
            setTimeout(() => {
                battleBtn.disabled = false;
            }, 1000);
        }
    }, 1500);
}

// Exibe informações da batalha
function displayBattleInfo(challenger) {
    battleDisplay.innerHTML = `
        <div class="battle-info">
            <div class="challenger-info">
                <img src="${challenger.image}" alt="${challenger.name}">
                <h3>${challenger.name}</h3>
                <p>Tipo: ${challenger.types}</p>
                <p>HP: ${challenger.stats.hp * 2}</p>
                <p>Ataque: ${challenger.stats.attack}</p>
            </div>
            <div class="vs">
                <h2>VS</h2>
            </div>
            <div class="boss-info">
                <img src="${bossPokemon.image}" alt="${bossPokemon.name}">
                <h3>${bossPokemon.name}</h3>
                <p>Tipo: ${bossPokemon.types}</p>
                <p>HP: ${bossCurrentHP}/${BASE_HP * 3}</p>
                <p>Ataque: ${bossPokemon.stats.attack}</p>
            </div>
        </div>
    `;
}

// Simula a batalha e retorna o resultado
function simulateBattle(challenger) {
    const challengerPower = challenger.stats.attack + challenger.stats.hp;
    const bossPower = bossPokemon.stats.attack + BASE_HP;
    
    // Chance baseada no poder relativo, mas com alguma aleatoriedade
    const challengerChance = challengerPower / (challengerPower + bossPower) * 0.8 + Math.random() * 0.2;
    
    if (challengerChance > 0.5) {
        // Desafiante vence - reduz HP do chefe
        const damage = Math.floor(challenger.stats.attack * (0.8 + Math.random() * 0.4));
        bossCurrentHP = Math.max(0, bossCurrentHP - damage);
        updateBossDisplay();
        
        return { winner: 'challenger', damage };
    } else {
        // Chefe vence - reduz HP do desafiante (não implementado, pois o desafiante é removido da fila)
        return { winner: 'boss' };
    }
}

// Exibe o resultado da batalha
function displayBattleResult(challenger, result) {
    if (result.winner === 'challenger') {
        battleResult.className = 'winner';
        battleResult.innerHTML = `
            <p>${challenger.name} venceu!</p>
            <p>Infligiu ${result.damage} de dano ao ${bossPokemon.name}!</p>
            <p>HP restante do ${bossPokemon.name}: ${bossCurrentHP}</p>
        `;
    } else {
        battleResult.className = 'loser';
        battleResult.innerHTML = `
            <p>${challenger.name} foi derrotado por ${bossPokemon.name}!</p>
        `;
    }
}

// Anima o ataque
function animateAttack(winner) {
    const bossElement = document.getElementById('boss-pokemon');
    const battleInfo = battleDisplay.querySelector('.battle-info');
    
    if (winner === 'challenger') {
        bossElement.classList.add('attack-animation');
        setTimeout(() => bossElement.classList.remove('attack-animation'), 500);
    } else {
        if (battleInfo) {
            const challengerInfo = battleInfo.querySelector('.challenger-info');
            if (challengerInfo) {
                challengerInfo.classList.add('attack-animation');
                setTimeout(() => challengerInfo.classList.remove('attack-animation'), 500);
            }
        }
    }
}

// Atualiza a exibição dos vencedores
function updateWinnersDisplay() {
    winnersList.innerHTML = '';
    
    // Ordena vencedores pelo HP restante do chefe (menor primeiro)
    const sortedWinners = [...winners].sort((a, b) => a.bossHpLeft - b.bossHpLeft);
    
    sortedWinners.forEach(winner => {
        const winnerItem = document.createElement('div');
        winnerItem.className = 'winner-card';
        winnerItem.innerHTML = `
            <img src="${winner.pokemon.image}" alt="${winner.pokemon.name}">
            <div>
                <h3>${winner.pokemon.name}</h3>
                <p>Derrotou ${bossPokemon.name} com ${winner.bossHpLeft} HP restante</p>
                <p>Tipo: ${winner.pokemon.types} | Ataque: ${winner.pokemon.stats.attack}</p>
            </div>
        `;
        winnersList.appendChild(winnerItem);
    });
}

// Salva vencedores no localStorage
function saveWinners() {
    localStorage.setItem('pokemonWinners', JSON.stringify(winners));
}

// Carrega vencedores do localStorage
function loadWinners() {
    const savedWinners = localStorage.getItem('pokemonWinners');
    if (savedWinners) {
        const parsedWinners = JSON.parse(savedWinners);
        winners.push(...parsedWinners);
        updateWinnersDisplay();
    }
}

// Event Listeners
addChallengerBtn.addEventListener('click', addRandomChallenger);
battleBtn.addEventListener('click', performBattle);

// Inicializa o jogo
init();