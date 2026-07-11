"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_push_1 = __importDefault(require("web-push"));
const keys = web_push_1.default.generateVAPIDKeys();
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
//# sourceMappingURL=generate-vapid-keys.js.map