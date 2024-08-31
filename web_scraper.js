const puppeteer = require("puppeteer");
const fs = require("fs");
const dotenv = require("dotenv"); // Import dotenv
dotenv.config(); // Load environment variables from .env

async function start() {
    const username = process.env.INSTAGRAM_USERNAME; // Fetch username from .env
    const password = process.env.INSTAGRAM_PASSWORD; // Fetch password from .env

    const screenshots = []; // Array to store screenshots as buffer data
    
    const browser = await puppeteer.launch({
        headless: false,
        executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' // Path to your Chrome installation
    });
    const page = await browser.newPage();

    // Login to Instagram
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[name="username"]');
    await page.type('input[name="username"]', username); 
    await page.type('input[name="password"]', password); 
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Handle popups
    try {
        await page.waitForSelector('button:contains("Save Info")', { timeout: 2000 });
        await page.click('button:contains("Save Info")');
    } catch (error) {
        console.log('No "Save Info" popup found.');
    }
    try {
        await page.waitForSelector('button:contains("Not Now")', { timeout: 2000 });
        await page.click('button:contains("Not Now")');
    } catch (error) {
        console.log('No "Turn on Notifications" popup found.');
    }

    // Navigate to Direct Messages
    await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });

    // Function to scroll chat and find all instances of a keyword
    async function scrollAndFindAllKeywords(targetMessage, chatUsername) {
        let foundAny = false;

        const chatContainer = await page.$('div[role="list"]');
        if (!chatContainer) {
            console.log('Chat container not found.');
            return false;
        }

        let lastHeight = await page.evaluate(el => el.scrollHeight, chatContainer);

        while (true) {
            const foundMessages = await page.evaluate((targetMessage) => {
                const messages = [];
                const messageElements = document.querySelectorAll('div[dir="auto"]');
                const dateElements = document.querySelectorAll('span.x186z157.xk50ysn');
                
                messageElements.forEach((el, index) => {
                    if (el.innerText.toLowerCase().includes(targetMessage.toLowerCase())) {
                        const timestamp = dateElements[index] ? dateElements[index].innerText : 'Unknown Time';
                        messages.push({ message: el.innerText, timestamp: timestamp });
                    }
                });
                return messages;
            }, targetMessage);

            if (foundMessages.length > 0) {
                foundAny = true;
                for (const found of foundMessages) {
                    const screenshotBuffer = await page.screenshot({ fullPage: true });
                    screenshots.push({ chatUsername, message: found.message, timestamp: found.timestamp, screenshot: screenshotBuffer });
                    console.log(`Captured screenshot for message: "${found.message}" from ${chatUsername}.`);
                }
            }

            await page.evaluate(el => el.scrollBy(0, el.scrollHeight), chatContainer);
            await delay(1000);

            let newHeight = await page.evaluate(el => el.scrollHeight, chatContainer);
            if (newHeight === lastHeight) break;
            lastHeight = newHeight;
        }
        return foundAny;
    }

    // Delay function
    function delay(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    // Process each chat
    let chatElements = await page.$$('div[role="listitem"]');
    console.log(`Found ${chatElements.length} chats.`);
    for (let i = 0; i < chatElements.length; i++) {
        await chatElements[i].click();
        await delay(2000);

        const chatUsername = await page.evaluate(() => {
            const usernameElement = document.querySelector('span.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
            return usernameElement ? usernameElement.innerText : 'Unknown User';
        });

        const targetMessage = "Hi";
        const messageFound = await scrollAndFindAllKeywords(targetMessage, chatUsername);

        if (messageFound) {
            console.log(`Found messages in chat with ${chatUsername}.`);
        } else {
            console.log(`No messages containing "${targetMessage}" found in chat with ${chatUsername}.`);
        }

        // Go back to the chat list
        await page.goto('https://www.instagram.com/direct/inbox/', { waitUntil: 'networkidle2' });
        chatElements = await page.$$('div[role="listitem"]');
    }

    await browser.close();

    // Retrieve and process screenshots at the end
    screenshots.forEach((screenshotData, index) => {
        const { chatUsername, message, timestamp, screenshot } = screenshotData;
        const screenshotPath = `screenshots/${chatUsername}_${index}_${Date.now()}.png`;
        fs.writeFileSync(screenshotPath, screenshot);
        console.log(`Saved screenshot to ${screenshotPath} for message "${message}" from ${chatUsername} at ${timestamp}.`);
    });
}

start().catch(console.error);
