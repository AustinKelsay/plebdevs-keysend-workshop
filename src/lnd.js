import axios from "axios";
import CryptoJS from "crypto-js";
import { Buffer } from "buffer"; // Use the buffer package

/**
 * Sends a keysend payment through the LND REST API.
 *
 * @param {string} destination - The destination public key (hex-encoded string).
 * @param {number} amount - The amount to send in satoshis.
 * @param {string} message - The message to send with the payment.
 * @returns {Object} - The response data from the LND node.
 */
export const sendKeysend = async (destination, amount, message) => {
  try {
    // Retrieve the macaroon and host from environment variables
    const MACAROON = import.meta.env.VITE_MACAROON;
    const HOST = import.meta.env.VITE_HOST;

    // Generate a random 32-byte (256-bit) preimage
    const preimage = CryptoJS.lib.WordArray.random(32);
    const preimageHex = preimage.toString(CryptoJS.enc.Hex);

    // Create a SHA-256 hash of the preimage to use as the payment hash
    const hash = CryptoJS.SHA256(preimage);
    const paymentHash = hash.toString(CryptoJS.enc.Hex);

    // Ensure preimage is a Buffer
    const preimageBuffer = Buffer.from(preimageHex, "hex");
    const paymentHashBuffer = Buffer.from(paymentHash, "hex");

    // Construct the request body for the keysend payment
    const requestBody = {
      dest: Buffer.from(destination, "hex").toString("base64"), // Base64 encoded destination public key
      amt: amount, // Amount in satoshis
      payment_hash: paymentHashBuffer.toString("base64"), // Base64 encoded SHA-256 hash of the preimage
      final_cltv_delta: 40, // Time-lock value (in blocks) for the payment
      dest_custom_records: {
        34349334: Buffer.from(message, "utf8").toString("base64"), // Custom record for the message
        5482373484: preimageBuffer.toString("base64"), // Custom record for the preimage
      },
      // timeout_seconds: 60, // Timeout in seconds for the payment
      fee_limit: {
        fixed: 1000, // Maximum fee (in satoshis) for the payment
      },
      dest_features: [9], // Features required in the destination node (e.g., TLV)
    };

    // Log the request body to debug the issue
    console.log("Request Body:", JSON.stringify(requestBody, null, 2));

    // Make a POST request to the LND REST API to send the keysend payment
    const response = await axios.post(
      `https://${HOST}:8080/v1/channels/transactions`, // API endpoint for transactions
      requestBody, // Request body containing the payment details
      {
        headers: {
          "Grpc-Metadata-Macaroon": MACAROON, // Macaroon for authentication
          "Content-Type": "application/json", // Content type of the request
        },
      },
    );

    // Return the response data from the LND node
    return response.data;
  } catch (error) {
    console.error(
      "Error sending keysend:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
};

/**
 * Retrieves recent keysend transactions from the LND node.
 *
 * @returns {Array} - An array of keysend transactions.
 */
export const getKeysends = async () => {
  // Retrieve the macaroon and host from environment variables
  const MACAROON = import.meta.env.VITE_MACAROON;
  const HOST = import.meta.env.VITE_HOST;

  // Make a GET request to the LND REST API to retrieve recent transactions
  const response = await axios.get(
    `https://${HOST}:8080/v1/transactions`, // API endpoint for transactions
    {
      headers: {
        "Grpc-Metadata-Macaroon": MACAROON, // Macaroon for authentication
        "Content-Type": "application/json", // Content type of the request
      },
    },
  );

  // Extract transactions from the response data
  const transactions = response.data.transactions;

  // Filter the transactions to find keysend transactions
  const keysendTransactions = transactions.filter((tx) => {
    return tx.dest_custom_records && tx.dest_custom_records["34349334"]; // Check for custom record with the keysend message
  });

  // Return the filtered keysend transactions
  return keysendTransactions;
};

// Define a function to fetch peers from the LND node
export const getPeers = async () => {
  // Retrieve the macaroon and host from environment variables
  const MACAROON = import.meta.env.VITE_MACAROON;
  const HOST = import.meta.env.VITE_HOST;
  // Make a GET request to the LND REST API to retrieve peers
  const response = await axios.get(
    `https://${HOST}:8080/v1/peers`, // API endpoint for peers
    {
      headers: {
        "Grpc-Metadata-Macaroon": MACAROON, // Macaroon for authentication"
      },
    },
  );
  // Extract peers from the response data
  const peers = response.data.peers;

  if (!peers && !peers.length > 0) {
    return [];
  }

  // extract only the pub_key of the peers and add to array
  const peerKeys = peers.map((peer) => {
    return peer.pub_key;
  });

  // Return the peers
  return peerKeys;
};
