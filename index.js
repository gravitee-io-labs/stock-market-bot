const host = process.env.HOST;
const authToken = process.env.AUTH_TOKEN;

const interval = 5000;
const stockList = [
  "gravitee",
  "kong",
  "apigee",
  "wso2",
  "solo",
  "tyk",
  "apisix",
  "aws",
  "mulesoft",
];

let stockPrices = {};

function getSharesPurchased(currentStockPrice) {
  return currentStockPrice > 900
    ? -10
    : currentStockPrice < 50
    ? 10
    : Math.random() < 0.5
    ? 10
    : -10;
}

function getRandomPrice() {
  return Math.floor(Math.random() * 200) + 1;
}

async function createUser() {
  try {
    const response = await fetch(`https://${host}/stock-market/users`, {
      method: "POST",
      headers: {
        "X-Gravitee-API-Key": authToken,
      },
      body: JSON.stringify({
        STARTING_CASH: 10000000000,
      }),
    });

    if (response.ok) {
      console.log("User created successfully");
      fetchStockPrices();
    } else {
      throw new Error(`Failed to create user. Status: ${response.status}.`);
    }
  } catch (error) {
    console.error("Creating user failed:", error);
  }
}

async function fetchStockPrices() {
  try {
    const response = await fetch(
      `http://${host}/stock-market/current_stock_prices`,
      {
        method: "GET",
        headers: {
          "X-Gravitee-API-Key": authToken,
        },
      }
    );

    if (response.ok) {
      console.log(
        "Stock prices fetched successfully. Attempting to extract prices..."
      );
      const data = await response.json();

      if (data?.items?.length === 0) {
        console.log(
          "Extraction failed due to empty prices array. Bot will generate random execution prices"
        );
      } else {
        data.items.forEach((item) => {
          const stockData = JSON.parse(item.content);
          stockPrices[stockData.key] = stockData.CURRENT_PRICE;
        });
        console.log("Extraction complete");
      }
      startBotLoop();
    } else {
      throw new Error(
        `Failed to fetch stock prices. Status: ${response.status}`
      );
    }
  } catch (error) {
    console.error("Fetching stock prices failed:", error);
    console.log("test error");
  }
}

async function startBotLoop() {
  console.log("Bot loop beginning...");
  const timer = setInterval(async () => {
    const randomStockIndex = Math.floor(Math.random() * stockList.length);
    const stock = stockList[randomStockIndex];
    const price = stockPrices[stock] || getRandomPrice(); // Use the latest price if available
    const shares = getSharesPurchased(price);
    const action = shares > 0 ? "buy" : "sell";
    try {
      const response = await fetch(`http://${host}/stock-market/orders`, {
        method: "POST",
        headers: {
          "X-Gravitee-API-Key": authToken,
          stock: stock,
        },
        body: JSON.stringify({
          EXECUTION_PRICE: price,
          SHARES_PURCHASED: shares,
        }),
      });

      if (response.ok) {
        console.log(
          `Executed ${action} order for ${shares} shares of ${
            stock[0].toUpperCase() + stock.slice(1)
          } at $${price.toFixed(2)}. Total: $${(price * shares).toFixed(2)}`
        );
      } else {
        console.error(
          "API request for",
          stock,
          "failed. Status:",
          response.status
        );
      }
    } catch (error) {
      console.error("API request for", stock, "failed:", error);
    }
  }, interval);
}

createUser();
