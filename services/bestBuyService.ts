import { BASE_API_URL, CORS_PROXY_PREFIX } from "../constants";
import { Availability, BestBuyResponse } from "../types";

export const fetchInventory = async (
  skus: string[],
  postalCode: string,
  locations: string
): Promise<Availability[]> => {
  if (skus.length === 0) return [];

  const skuParam = skus.join('|');
  
  // Construct the query parameters
  const params = new URLSearchParams({
    accept: 'application/vnd.bestbuy.standardproduct.v1+json',
    'accept-language': 'en-CA',
    locations: locations,
    postalCode: postalCode,
    skus: skuParam
  });

  // Construct the full URL
  const targetUrl = `${BASE_API_URL}?${params.toString()}`;
  
  // Wrap with CORS proxy
  // Note: We encode the target URL to ensure special characters (like pipes |) are handled correctly by the proxy
  const proxiedUrl = `${CORS_PROXY_PREFIX}${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxiedUrl, {
      method: 'GET',
      headers: {
        // Some proxies require no headers, or specific headers. 
        // BestBuy requires a User-Agent typically, but the proxy might handle it or the browser sends one.
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status: ${response.status} ${response.statusText}`);
    }

    const data: BestBuyResponse = await response.json();
    return data.availabilities;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};