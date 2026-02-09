// Modal and Tab functionality
class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.closeBtn = this.modal.querySelector('.close');
        this.setupEventListeners();
    }

    open() {
        document.body.style.overflow = 'hidden';
        this.modal.classList.add('active');
        // Focus on the first focusable element
        const focusable = this.modal.querySelector('button, [href], input, select, textarea');
        if (focusable) focusable.focus();
    }

    close() {
        document.body.style.overflow = '';
        this.modal.classList.remove('active');
        
        // If closing item details modal and we came from image search, re-open it
        if (this.modal.id === 'itemDetailsModal' && window._returnToImageSearch) {
            window._returnToImageSearch = false;
            setTimeout(() => {
                if (window.imageSearchModal) {
                    window.imageSearchModal.open();
                }
            }, 100);
        }
    }

    setupEventListeners() {
        // Close modal when clicking the close button
        this.closeBtn.addEventListener('click', () => this.close());

        // Close modal when clicking outside the modal content
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }
}

// Tab functionality
class Tabs {
    constructor(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) return;
        
        this.tabButtons = this.container.querySelectorAll('.tab-button');
        this.tabPanes = this.container.querySelectorAll('.tab-pane');
        this.setupTabs();
    }

    setupTabs() {
        this.tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Hide all tab panes
        this.tabPanes.forEach(pane => {
            pane.classList.remove('active');
        });

        // Deactivate all tab buttons
        this.tabButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Show the selected tab pane
        const activePane = this.container.querySelector(`#${tabId}-tab`);
        if (activePane) {
            activePane.classList.add('active');
        }

        // Activate the clicked tab button
        const activeButton = this.container.querySelector(`[data-tab="${tabId}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}

// Chat functionality
class Chat {
    constructor(containerId) {
        this.container = document.querySelector(containerId);
        if (!this.container) return;
        
        this.messagesContainer = this.container.querySelector('.chat-messages');
        this.messageInput = this.container.querySelector('.chat-input input');
        this.sendButton = this.container.querySelector('.chat-input button');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Add user message
        this.addMessage(message, 'user');
        this.messageInput.value = '';

        // Simulate staff response after a short delay
        setTimeout(() => {
            this.addMessage('Thank you for your message. Our staff will get back to you shortly.', 'staff');
        }, 1000);
    }

    addMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.textContent = text;
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize modals when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modals
    const itemDetailsModal = new Modal('itemDetailsModal');
    const claimModal = new Modal('claimModal');
    const imageSearchModal = new Modal('imageSearchModal');

    // Initialize tabs in the item details modal
    const tabs = new Tabs('.modal-content');
    // Expose a helper to switch tabs in item details
    window.switchItemDetailsTab = function(tabId){
        if (tabs && typeof tabs.switchTab === 'function') {
            tabs.switchTab(tabId);
        }
    };

    // Initialize chat in the chat tab
    const chat = new Chat('#chat-tab');

    // Make modals globally available
    window.itemDetailsModal = itemDetailsModal;
    window.claimModal = claimModal;
    window.imageSearchModal = imageSearchModal;
});

// Function to open item details modal with item data
function openItemDetails(item) {
    if (!item) return;

    // Set item data in the modal
    document.getElementById('modalItemImage').src = item.image || 'https://via.placeholder.com/400x300?text=No+Image';
    document.getElementById('modalItemTitle').textContent = item.title || 'Untitled Item';
    document.getElementById('modalItemDescription').textContent = item.description || 'No description available.';
    
    // Hide status badge
    const statusBadge = document.getElementById('modalItemStatus');
    statusBadge.style.display = 'none';
    
    // Set item details
    document.getElementById('modalItemCategory').textContent = item.category || 'Not specified';
    document.getElementById('modalItemLocation').textContent = item.location || 'Location not specified';
    
    // Format dates
    const formatDate = (dateString) => {
        if (!dateString) return 'Not specified';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    document.getElementById('modalItemDate').textContent = formatDate(item.date);
    document.getElementById('modalItemDisposalDate').textContent = formatDate(item.disposalDate);
    
    // Set up Chat with Staff button
    const claimBtn = document.getElementById('claimItemBtn');
    if (item.status === 'claimed') {
        claimBtn.textContent = 'This item has been claimed';
        claimBtn.disabled = true;
    } else {
        claimBtn.textContent = 'Chat with Staff';
        claimBtn.disabled = false;
        claimBtn.onclick = (e) => {
            e.stopPropagation();
            // Redirect to item details page with chat
            window.location.href = `item-details.html?id=${item.id}`;
        };
    }
    
    // Clear any existing chat messages
    const chatMessages = document.querySelector('#chat-tab .chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        // Add a welcome message
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'message staff';
        welcomeMsg.textContent = 'Hello! How can I help you with this item?';
        chatMessages.appendChild(welcomeMsg);
    }
    
    // Open the modal
    window.itemDetailsModal.open();
}
