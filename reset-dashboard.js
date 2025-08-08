// Simple script to reset dashboard state
// Run this in browser console if you get stuck

console.log('🔄 Resetting DevFlow Dashboard...');

// Clear all localStorage
localStorage.clear();

// Set onboarding as completed
localStorage.setItem('devflow_onboarding_completed', 'true');

// Clear any demo user data
localStorage.removeItem('devflow_demo_user');

console.log('✅ Dashboard reset complete! Refresh the page.');
console.log('🔑 Use: loic@loic.fr / loic to login');

// Auto refresh after 2 seconds
setTimeout(() => {
    window.location.reload();
}, 2000);