/**
 * Admin Search Functionality
 * This script adds search capabilities to the admin dashboard item section
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin search functionality loaded');
    setupItemSearch();
    
    // Initialize Lucide icons to ensure search icon loads properly
    if (window.lucide?.createIcons) {
        setTimeout(() => {
            lucide.createIcons();
            console.log('Search icons reinitialized');
        }, 100);
    }
    
    // Also initialize when switching to items section
    document.querySelectorAll('.nav-link[data-section="items"]').forEach(link => {
        link.addEventListener('click', function() {
            setTimeout(() => {
                if (window.lucide?.createIcons) lucide.createIcons();
            }, 100);
        });
    });
});

/**
 * Set up item search functionality
 */
function setupItemSearch() {
    const searchInput = document.getElementById('itemSearchInput');
    const searchButton = document.getElementById('itemSearchButton');
    
    if (!searchInput || !searchButton) {
        console.error('Search elements not found');
        return;
    }
    
    // Add event listener for search button click
    searchButton.addEventListener('click', function() {
        performSearch();
    });
    
    // Add event listener for enter key in search input
    searchInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            performSearch();
        }
    });
    
    // Clear button functionality (optional)
    searchInput.addEventListener('input', function() {
        if (this.value === '') {
            // If search input is cleared, show all items
            resetItemsDisplay();
        }
    });
}

/**
 * Perform search on items
 */
function performSearch() {
    const searchInput = document.getElementById('itemSearchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.trim().toLowerCase();
    if (query === '') {
        resetItemsDisplay();
        return;
    }
    
    // Find all item rows in the container
    const itemRows = document.querySelectorAll('#allItemsContainer .table-row');
    let matchCount = 0;
    
    // Loop through each item and check for matches
    itemRows.forEach(row => {
        const itemName = row.querySelector('.item-name')?.textContent?.toLowerCase() || '';
        const itemCategory = row.querySelector('.item-category')?.textContent?.toLowerCase() || '';
        const itemLocation = row.querySelector('div:nth-child(2)')?.textContent?.toLowerCase() || '';
        
        // Check if any field matches the search query
        if (itemName.includes(query) || 
            itemCategory.includes(query) || 
            itemLocation.includes(query)) {
            row.style.display = ''; // Show matching row
            matchCount++;
            
            // Highlight the matching text
            highlightMatches(row, query);
        } else {
            row.style.display = 'none'; // Hide non-matching row
        }
    });
    
    // Show message if no results found
    const container = document.getElementById('allItemsContainer');
    if (container && matchCount === 0) {
        // Check if we already have a no-results message
        let noResultsMsg = container.querySelector('.no-results-message');
        
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'table-row no-results-message';
            noResultsMsg.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">
                No items found matching "${query}" <button id="clearSearchBtn" class="btn-primary" style="margin-left: 1rem; padding: 0.25rem 0.5rem;">Clear Search</button>
            </div>`;
            container.appendChild(noResultsMsg);
            
            // Add event listener to clear search button
            document.getElementById('clearSearchBtn').addEventListener('click', function() {
                searchInput.value = '';
                resetItemsDisplay();
            });
        }
    } else if (container) {
        // Remove any existing no-results message
        const noResultsMsg = container.querySelector('.no-results-message');
        if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }
}

/**
 * Reset display to show all items
 */
function resetItemsDisplay() {
    // Show all item rows
    const itemRows = document.querySelectorAll('#allItemsContainer .table-row');
    itemRows.forEach(row => {
        row.style.display = '';
        
        // Remove any highlights
        removeHighlights(row);
    });
    
    // Remove no-results message if it exists
    const noResultsMsg = document.querySelector('#allItemsContainer .no-results-message');
    if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

/**
 * Highlight matching text in search results
 */
function highlightMatches(row, query) {
    // Remove any existing highlights first
    removeHighlights(row);
    
    // Fields to highlight
    const textElements = [
        row.querySelector('.item-name'),
        row.querySelector('.item-category'),
        row.querySelector('div:nth-child(2)')
    ];
    
    // Loop through each element and highlight matches
    textElements.forEach(element => {
        if (!element) return;
        
        const originalText = element.textContent;
        const lowerText = originalText.toLowerCase();
        const queryRegex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        
        if (lowerText.includes(query.toLowerCase())) {
            element.innerHTML = originalText.replace(
                queryRegex, 
                '<span class="highlight-match" style="background-color: #fef08a; font-weight: bold;">$1</span>'
            );
        }
    });
}

/**
 * Remove highlights from search results
 */
function removeHighlights(row) {
    const highlightedElements = row.querySelectorAll('.highlight-match');
    highlightedElements.forEach(element => {
        const parent = element.parentNode;
        if (parent) {
            parent.textContent = parent.textContent; // This removes all HTML and keeps just text
        }
    });
}

/**
 * Escape special characters for safe regex usage
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
