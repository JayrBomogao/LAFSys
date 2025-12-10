// One-time script to remove the "Remove Sample Items Only" button
document.addEventListener('DOMContentLoaded', () => {
    // Find and remove the button
    const buttonToRemove = document.querySelector('button:contains("Remove Sample Items Only")');
    if (buttonToRemove) {
        buttonToRemove.remove();
        console.log('Sample items removal button has been removed');
    }
});
