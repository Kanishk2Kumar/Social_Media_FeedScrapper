const puppeteer = require("puppeteer");

// Function to introduce a delay using a Promise
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function start() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    // Array of Instagram chat links
    const chatLinks = [
        'https://www.instagram.com/direct/t/17850163040804975/',
        'https://www.instagram.com/direct/t/104645497715224/',
        'https://www.instagram.com/direct/t/103569117708052/',
        'https://www.instagram.com/direct/t/17850821571060108/'
    ];

    // Navigate to Instagram's login page
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });

    // Wait for the login form to load
    await page.waitForSelector('input[name="username"]');

    // Enter your Instagram username and password
    await page.type('input[name="username"]', 'shunichi_ibe_10'); // Replace with your username
    await page.type('input[name="password"]', 'passwordnhibataunga'); // Replace with your password

    // Click the login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Bypass 'Save Your Login Info' popup if present
    try {
        await page.waitForSelector('button:contains("Save Info")', { timeout: 2000 });
        await page.click('button:contains("Save Info")');
    } catch (error) {
        console.log('No "Save Info" popup found.');
    }

    // Bypass 'Turn on Notifications' popup if present
    try {
        await page.waitForSelector('button:contains("Not Now")', { timeout: 2000 });
        await page.click('button:contains("Not Now")');
    } catch (error) {
        console.log('No "Turn on Notifications" popup found.');
    }

    // Loop through each chat link in the array
    for (let link of chatLinks) {
        console.log(`Opening chat: ${link}`);

        // Navigate to the specific chat link
        await page.goto(link, { waitUntil: 'networkidle2' });

        // Wait for messages to load in the chat
        try {
            await page.waitForSelector('div[dir="auto"]', { timeout: 3000 });

            // Find the first occurrence of "Hi"
            const messageFound = await page.evaluate(() => {
                const messageElements = document.querySelectorAll('div[dir="auto"]');
                for (let el of messageElements) {
                    if (el.innerText === "Hi") {
                        el.scrollIntoView();
                        return true;
                    }
                }
                return false;
            });

            // If the message is found, take a screenshot
            if (messageFound) {
                console.log('Found the first "Hi" message.');

                // Wait a moment to ensure the message is fully scrolled into view before taking the screenshot
                await delay(2000); // Introduce a delay

                // Take a screenshot of the chat
                await page.screenshot({ path: `chat_screenshot_${Date.now()}.png`, fullPage: true });
                console.log('Screenshot taken.');
            } else {
                console.log('No "Hi" message found in this chat.');
            }

        } catch (error) {
            console.log(`Error processing chat at ${link}:`, error);
        }

        console.log(`Finished processing chat: ${link}`);
    }
    // Close browser after processing all chats
    await browser.close();
}

start();
