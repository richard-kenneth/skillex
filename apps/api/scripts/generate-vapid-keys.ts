import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('\n=== VAPID KEYS GENERATED ===');
console.log('Public Key:');
console.log(keys.publicKey);
console.log('\nPrivate Key:');
console.log(keys.privateKey);
console.log('============================\n');
console.log('Add these to apps/api/.env and apps/web/.env:');
console.log('API .env:');
console.log(`VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log('VAPID_EMAIL="mailto:your-email@example.com"');
console.log('\nWeb .env:');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
