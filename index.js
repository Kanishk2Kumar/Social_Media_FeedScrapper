const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const xlsx = require("xlsx");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files (CSS, images)

// Serve index.html file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/start-scraping", upload.single("fileUpload"), async (req, res) => {
    const { username, password, keyword } = req.body;
    const fileBuffer = req.file ? req.file.buffer : null;

    if (fileBuffer) {
        // Handle multiple accounts scraping
        const accounts = processExcelFile(fileBuffer);
        await runMultipleAccounts(accounts, keyword);
    } else {
        // Handle single account scraping
        await start(username, password, keyword);
    }

    res.status(200).send("Scraping started");
});

// Function to process Excel file
function processExcelFile(buffer) {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(sheet);
}

// Single account scraping function
async function start(username, password, keyword) {
    const logFilePath = `message_log_${username}_${Date.now()}.txt`;

    const browser = await puppeteer.launch({
        headless: false,
        executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    });
    const page = await browser.newPage();

    // Login to Instagram
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "networkidle2" });
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: "networkidle2" });

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

        // Check if the chat element exists
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
                const dateElements = document.querySelectorAll('span.x186z157.xk50ysn'); // Date elements

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
                foundMessages.forEach(found => {
                    const logEntry = `Username: ${chatUsername}, Date & Time: ${found.timestamp}, Message: "${found.message}"\n`;
                    fs.appendFileSync(logFilePath, logEntry);
                    console.log(`Logged message: "${found.message}" from ${chatUsername}.`);
                });
            }

            await page.evaluate(el => el.scrollBy(0, el.scrollHeight), chatContainer);
            await delay(1000);

            let newHeight = await page.evaluate(el => el.scrollHeight, chatContainer);
            if (newHeight === lastHeight) break;
            lastHeight = newHeight;
        }
        return foundAny;
    }

    // Delay function replacement for page.waitForTimeout
    function delay(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    // Process each chat
    let chatElements = await page.$$('div[role="listitem"]');
    console.log(`Found ${chatElements.length} chats.`);
    for (let i = 0; i < chatElements.length; i++) {
        await chatElements[i].click();
        await delay(2000);

        // Extract chat username from the specific class
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
}

// Multiple account scraping function
async function runMultipleAccounts(accounts, keyword) {
    const scrapingPromises = accounts.map(account => {
        const { username, password } = account;
        return start(username, password, keyword);
    });
    await Promise.all(scrapingPromises);
}

// Start the server
app.listen(3000, () => console.log("Server running on port 3000"));
