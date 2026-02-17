import { Resend } from 'resend';

const resend = new Resend('re_NE5iTpsd_9hU72aTQpZaxkiBxzzkSXfnH');

async function diagnostics() {
    console.log('--- Starting Deep Diagnostics ---');

    // 1. Check Domains
    console.log('\n1. Checking Domains...');
    try {
        // Domains list usually comes in .data (or .data.data depending on version)
        const domains = await resend.domains.list();
        // Log raw to be safe
        console.log('RAW DOMAIN RESPONSE:', JSON.stringify(domains, null, 2));
    } catch (e) { console.error('Domain check failed:', e.message); }

    // 2. Check Specific Email ID from logs
    const targetId = '1c6f892a-6468-425e-90df-037b590e69c7';
    console.log(`\n2. Checking Email ID: ${targetId}...`);
    try {
        const email = await resend.emails.get(targetId);
        console.log('RAW EMAIL RESPONSE:', JSON.stringify(email, null, 2));
    } catch (e) {
        console.error('Email check failed:', e.message);
    }

    console.log('\n--- Diagnostics Complete ---');
}

diagnostics().then(() => process.exit(0));
