
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
import { pathToFileURL } from 'url';

// --- CONFIGURATION ---
const SKUS = ['18391208', '18391209', '18391210', '18391211'];
const POSTAL_CODE = 'V3M0B2';
const LOCATIONS = '600|134|973|961|152|994|941|147|388|899|900|952|958|705|701|318|328|450|451|501|763|796|915|13|929|133|992';

// Env Vars
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO || EMAIL_USER;
const IS_TEST_MODE = process.env.TEST_MODE === 'true';
// Optional protection for Cloud Function HTTP trigger
const CRON_SECRET = process.env.CRON_SECRET; 

async function checkInventory(logFn = console.log) {
  logFn(`Starting inventory check for SKUs: ${SKUS.join(', ')}...`);

  const skuParam = SKUS.join('|');
  const params = new URLSearchParams({
    accept: 'application/vnd.bestbuy.standardproduct.v1+json',
    'accept-language': 'en-CA',
    locations: LOCATIONS,
    postalCode: POSTAL_CODE,
    skus: skuParam
  });

  const url = `https://www.bestbuy.ca/ecomm-api/availability/products?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    /** @type {any} */
    const data = await response.json();
    const inStockItems = [];

    if (data && data.availabilities) {
      data.availabilities.forEach(item => {
        const hasPickup = item.pickup.purchasable || item.pickup.locations.some(l => l.hasInventory || l.quantityOnHand > 0);
        const hasShipping = item.shipping.purchasable || item.shipping.status === 'InStock';

        if (hasPickup || hasShipping) {
          inStockItems.push({
            sku: item.sku,
            pickup: hasPickup,
            shipping: hasShipping,
            details: item
          });
        }
      });
    }

    if (IS_TEST_MODE) {
      logFn("🧪 TEST MODE ACTIVE: Simulating a fake in-stock item...");
      inStockItems.push({
        sku: 'TEST-MODE-SKU-12345',
        pickup: true,
        shipping: true,
        details: { sku: 'TEST-MODE-SKU-12345' }
      });
    }

    if (inStockItems.length > 0) {
      logFn(`🎉 STOCK FOUND (${inStockItems.length} items)! Sending email...`);
      await sendEmail(inStockItems, logFn);
      return { success: true, items: inStockItems.length };
    } else {
      logFn('No stock found for any SKU.');
      return { success: true, items: 0 };
    }

  } catch (error) {
    console.error('Error fetching inventory:', error);
    // If running in Google Cloud Functions, throw to let GCP handle logging
    if (process.env.GOOGLE_FUNCTION_TARGET) {
      throw error; 
    } 
    // If running in AWS Lambda, let the handler catch it
    else if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw error;
    }
    else {
      // Standalone/GitHub Actions
      // @ts-ignore
      process.exit(1);
    }
  }
}

async function sendEmail(items, logFn = console.log) {
  if (!EMAIL_USER || !EMAIL_PASS) {
    logFn('⚠️ Missing EMAIL_USER or EMAIL_PASS environment variables. Skipping email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  const isTest = IS_TEST_MODE ? '[TEST EMAIL] ' : '';

  const itemListHtml = items.map(item => `
    <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
      <h3 style="margin: 0;">SKU: ${item.sku}</h3>
      <p><strong>Shipping:</strong> ${item.shipping ? '✅ Available' : '❌ Out of Stock'}</p>
      <p><strong>Pickup:</strong> ${item.pickup ? '✅ Available' : '❌ Out of Stock'}</p>
      <a href="https://www.bestbuy.ca/en-ca/product/${item.sku}" style="background-color: #0046be; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px; display: inline-block; margin-top: 5px;">Buy Now</a>
    </div>
  `).join('');

  const mailOptions = {
    from: `"BestBuy Tracker" <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject: `${isTest}🚨 STOCK ALERT: ${items.length} Item(s) Available!`,
    html: `
      <h2>${isTest}Stock Detected!</h2>
      <p style="font-size: 14px; color: #333; background-color: #f0f9ff; padding: 8px; border-radius: 4px; display: inline-block;">
        📍 Target Region: <strong>${POSTAL_CODE}</strong>
      </p>
      <p>The following items are now available:</p>
      ${itemListHtml}
      <p style="font-size: 12px; color: #666; margin-top: 20px;">Check triggered via Cloud Monitor.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    logFn('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

// --- GOOGLE CLOUD FUNCTION ENTRY POINT ---
export const inventoryCheckHttp = async (req, res) => {
  // Security Check: If CRON_SECRET is set in env, it must be present in query params
  if (CRON_SECRET && req.query.secret !== CRON_SECRET) {
    console.warn("Unauthorized access attempt.");
    return res.status(403).send('Forbidden: Invalid Secret');
  }

  try {
    const result = await checkInventory((msg) => console.log(msg));
    res.status(200).json(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

// --- AWS LAMBDA ENTRY POINT ---
export const handler = async (event) => {
  console.log("AWS Lambda triggered");
  try {
    const result = await checkInventory((msg) => console.log(msg));
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Lambda Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// --- STANDALONE EXECUTION (For GitHub Actions or Local) ---
// Only run if this file is executed directly by Node
// @ts-ignore
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkInventory();
}
