// Sample items data
const itemsData = [
    {
        id: 1,
        title: "Black Wallet",
        description: "Black leather wallet found near Burnham Park. Contains ID and some cash.",
        location: "Burnham Park, Baguio City",
        date: "2023-11-15T10:30:00",
        status: "active",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        disposalDate: "2023-12-15T23:59:59"
    },
    {
        id: 2,
        title: "iPhone 13 Pro",
        description: "Gold iPhone 13 Pro found at SM City Baguio food court. Has a blue protective case.",
        location: "SM City Baguio, Baguio City",
        date: "2023-11-14T15:45:00",
        status: "claimed",
        image: "https://images.unsplash.com/photo-1632809947610-8fefdb8f9c2f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        disposalDate: "2023-12-10T23:59:59"
    },
    {
        id: 3,
        title: "Umbrella",
        description: "Blue and white striped umbrella left at the Baguio Cathedral pews.",
        location: "Baguio Cathedral, Baguio City",
        date: "2023-11-16T08:15:00",
        status: "active",
        image: "https://images.unsplash.com/photo-1534957753291-64d667ce2927?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        disposalDate: "2023-11-25T23:59:59"
    },
    {
        id: 4,
        title: "Laptop Bag",
        description: "Black Lenovo laptop bag containing a charger and some documents. Found at a jeepney terminal.",
        location: "Jeepney Terminal, Session Road, Baguio City",
        date: "2023-11-10T17:20:00",
        status: "soon",
        image: "https://images.unsplash.com/photo-1593062096033-9a26b09da705?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        disposalDate: "2023-11-20T23:59:59"
    },
    {
        id: 5,
        title: "Keys with Keychain",
        description: "Set of 3 keys with a small teddy bear keychain. Found near Wright Park.",
        location: "Wright Park, Baguio City",
        date: "2023-11-17T11:10:00",
        status: "active",
        image: "https://images.unsplash.com/photo-1593897158940-8f00a4b9d858?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        disposalDate: "2023-12-01T23:59:59"
    },
    {
        id: 6,
        title: "Water Bottle",
        description: "Stainless steel water bottle with 'Baguio' sticker. Found at Mines View Park.",
        location: "Mines View Park, Baguio City",
        date: "2023-11-18T13:45:00",
        status: "active",
        image: "https://images.unsplash.com/photo-1602143407151-a6214e29c75f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80",
        disposalDate: "2023-12-05T23:59:59"
    }
];

// Function to get items (simulating API call)
function getItems() {
    return new Promise((resolve) => {
        // Simulate API call delay
        setTimeout(() => {
            resolve([...itemsData]);
        }, 300);
    });
}

// Function to get item by ID
function getItemById(id) {
    return new Promise((resolve) => {
        // Simulate API call delay
        setTimeout(() => {
            const item = itemsData.find(item => item.id === parseInt(id));
            resolve(item || null);
        }, 200);
    });
}

// Function to filter items by status
function getItemsByStatus(status) {
    return new Promise((resolve) => {
        // Simulate API call delay
        setTimeout(() => {
            if (status === 'all') {
                resolve([...itemsData]);
            } else {
                const filtered = itemsData.filter(item => item.status === status);
                resolve(filtered);
            }
        }, 200);
    });
}

// Function to search items
function searchItems(query) {
    return new Promise((resolve) => {
        // Simulate API call delay
        setTimeout(() => {
            if (!query.trim()) {
                resolve([...itemsData]);
                return;
            }
            
            const searchTerm = query.toLowerCase();
            const results = itemsData.filter(item => 
                item.title.toLowerCase().includes(searchTerm) ||
                item.description.toLowerCase().includes(searchTerm) ||
                item.location.toLowerCase().includes(searchTerm)
            );
            
            resolve(results);
        }, 300);
    });
}
