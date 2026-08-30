const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
app.use(express.json());

async function checkGmailExists(email) {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        
        await page.goto('https://accounts.google.com/ServiceLogin', { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
        });

        await page.waitForSelector('input[type="email"]');
        await page.type('input[type="email"]', email);
        await page.click('#identifierNext');

        await new Promise(r => setTimeout(r, 2500));

        const passwordInput = await page.$('input[type="password"]');
        const pageContent = await page.content();

        await browser.close();

        if (passwordInput) {
            return { exists: true, message: "Account exists" };
        }

        if (
            pageContent.includes("Couldn’t find your Google Account") || 
            pageContent.includes("Couldn't find") ||
            pageContent.includes("খুঁজে পাওয়া যায়নি")
        ) {
            return { exists: false, message: "Account does NOT exist" };
        }

        return { exists: false, message: "Account not found" };

    } catch (error) {
        if (browser) await browser.close();
        return { exists: false, error: error.message };
    }
}

app.get('/check-gmail', async (req, res) => {
    const email = req.query.email;

    if (!email || !email.includes('@gmail.com')) {
        return res.status(400).json({ exists: false, message: "Invalid email" });
    }

    const result = await checkGmailExists(email);
    return res.json(result);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
