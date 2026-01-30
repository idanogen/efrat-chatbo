const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const agentCards = document.getElementById('agentCards');
const currentAgentName = document.getElementById('currentAgentName');

let currentAgent = null;
let agents = [];

// Initialize
document.addEventListener('DOMContentLoaded', loadAgents);

// Load agents from server
async function loadAgents() {
    try {
        const response = await fetch('/api/agents');
        agents = await response.json();
        renderAgentCards();
    } catch (error) {
        console.error('Failed to load agents:', error);
    }
}

// Render agent selection cards
function renderAgentCards() {
    agentCards.innerHTML = agents.map(agent => `
        <div class="agent-card" data-agent-id="${agent.id}">
            <div class="agent-icon">${agent.icon}</div>
            <div class="agent-info">
                <h3>${agent.name}</h3>
                <p>${agent.description}</p>
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.agent-card').forEach(card => {
        card.addEventListener('click', () => selectAgent(card.dataset.agentId));
    });
}

// Select an agent
function selectAgent(agentId) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    currentAgent = agent;

    // Update UI
    document.querySelectorAll('.agent-card').forEach(card => {
        card.classList.toggle('active', card.dataset.agentId === agentId);
    });

    currentAgentName.textContent = `${agent.icon} ${agent.name} מוכן לשיחה`;

    // Enable input
    userInput.disabled = false;
    userInput.placeholder = `שתף את ${agent.name}...`;
    sendButton.disabled = false;
    userInput.focus();

    // Clear chat and show welcome message
    chatMessages.innerHTML = '';
    const welcomeMessages = {
        efrat: 'שלום! אני כאן כדי ללוות אותך בתהליך של התבוננות עצמית באמצעות מודל א.פ.ר.ת. ספר/י לי, מה עובר עליך?',
        tasks: 'היי! אני כאן כדי לעזור לך לתכנן משימות בצורה שבאמת תעבוד בשבילך. מה המשימה שאתה רוצה לתכנן?'
    };
    addMessage(welcomeMessages[agentId] || 'שלום! איך אני יכול לעזור?', 'assistant');
}

// Auto-resize textarea
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

// Add message to chat
function addMessage(content, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = role === 'assistant' ? (currentAgent?.icon || '🤖') : '👤';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    bubbleDiv.appendChild(contentDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return contentDiv;
}

// Show typing indicator
function showTyping() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    messageDiv.id = 'typingIndicator';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.textContent = currentAgent?.icon || '🤖';

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'message-bubble';
    bubbleDiv.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Hide typing indicator
function hideTyping() {
    const typing = document.getElementById('typingIndicator');
    if (typing) typing.remove();
}

// Send message to server
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || !currentAgent) return;

    addMessage(message, 'user');
    userInput.value = '';
    userInput.style.height = 'auto';
    sendButton.disabled = true;

    showTyping();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                agentId: currentAgent.id
            })
        });

        hideTyping();

        const data = await response.json();

        if (data.error) {
            console.error('Server error:', data.details);
            addMessage(`מצטער, קרתה שגיאה: ${data.details || 'נסה שוב'}`, 'assistant');
        } else {
            addMessage(data.reply, 'assistant');
        }
    } catch (error) {
        hideTyping();
        addMessage('מצטער, לא הצלחתי להתחבר לשרת.', 'assistant');
        console.error('Error:', error);
    }

    sendButton.disabled = false;
    userInput.focus();
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});
