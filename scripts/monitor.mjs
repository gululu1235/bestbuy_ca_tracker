

import fetch from 'node-fetch'; // GitHub Actions environments usually have this or use native fetch in Node 18+
import nodemailer from 'nodemailer';

// --- CONFIGURATION ---
const SKUS = ['18391208', '18391209', '18391210', '18391211'];
const POSTAL_CODE = 'V3M0B2';
const LOCATIONS = '600|134|973|961|152|994|941|147|388|899|900|952|958|705|701|318|328|450|451|501|763|796|915|13|929|133|992';

// Email Configuration (Read from Environment Variables for security)
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS; // App Password for Gmail
const EMAIL_TO = process.env.EMAIL_TO || EMAIL_USER;

async function checkInventory() {
  console.log(`Starting inventory check for SKUs: ${SKUS.join(', ')}...`);

  const skuParam = SKUS.join('|');
  const params = new URLSearchParams({
    accept: 'application/vnd.bestbuy.standardproduct.v1+json',
    'accept-language': 'en-CA',
    locations: LOCATIONS,
    postalCode: POSTAL_CODE,
    skus: skuParam
  });

  // Note: No CORS proxy needed for Node.js
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

    const data = await response.json();
    const inStockItems = [];

    data.availabilities.forEach(item => {
      // Logic from your frontend types
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

    if (inStockItems.length > 0) {
      console.log('🎉 STOCK FOUND! Sending email...');
      await sendEmail(inStockItems);
    } else {
      console.log('No stock found for any SKU.');
    }

  } catch (error) {
    console.error('Error fetching inventory:', error);
    // @ts-ignore
    process.exit(1);
  }
}

async function sendEmail(items) {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('⚠️ Missing EMAIL_USER or EMAIL_PASS environment variables. Skipping email.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  const itemListHtml = items.map(item => `
    <div style="border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
      <h3 style="margin: 0;">SKU: ${item.sku}</h3>
      <p><strong>Shipping:</strong> ${item.shipping ? '✅ Available' : '❌ Out of Stock'}</p>
      <p><strong>Pickup:</strong> ${item.pickup ? '✅ Available' : '❌ Out of Stock'}</p>
      <a href="https://www.bestbuy.ca/en-ca/product/${item.sku}/${item.sku}" style="background-color: #0046be; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px; display: inline-block; margin-top: 5px;">Buy Now</a>
    </div>
  `).join('');

  const mailOptions = {
    from: `"BestBuy Tracker" <${EMAIL_USER}>`,
    to: EMAIL_TO,
    subject: `🚨 STOCK ALERT: ${items.length} Item(s) Available!`,
    html: `
      <h2>Stock Detected!</h2>
      <p>The following items are now available:</p>
      ${itemListHtml}
      <p style="font-size: 12px; color: #666;">This check ran via GitHub Actions.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

checkInventory();