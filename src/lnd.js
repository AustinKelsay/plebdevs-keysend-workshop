import axios from "axios";
import CryptoJS from "crypto-js";
import { Buffer } from "buffer";

export const sendKeysend = async (
  host,
  macaroon,
  destination,
  amount,
  message,
) => {
  try {
    const preimage = CryptoJS.lib.WordArray.random(32);
    const preimageHex = preimage.toString(CryptoJS.enc.Hex);
    const hash = CryptoJS.SHA256(preimage);
    const paymentHash = hash.toString(CryptoJS.enc.Hex);

    const preimageBuffer = Buffer.from(preimageHex, "hex");
    const paymentHashBuffer = Buffer.from(paymentHash, "hex");

    const requestBody = {
      dest: Buffer.from(destination, "hex").toString("base64"),
      amt: amount,
      payment_hash: paymentHashBuffer.toString("base64"),
      final_cltv_delta: 40,
      dest_custom_records: {
        34349334: Buffer.from(message, "utf8").toString("base64"),
        5482373484: preimageBuffer.toString("base64"),
      },
      fee_limit: {
        fixed: 1000,
      },
      dest_features: [9],
    };

    console.log("Request Body:", JSON.stringify(requestBody, null, 2));

    const response = await axios.post(
      `https://${host}:8080/v1/channels/transactions`,
      requestBody,
      {
        headers: {
          "Grpc-Metadata-Macaroon": macaroon,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error(
      "Error sending keysend:",
      error.response ? error.response.data : error.message,
    );
    throw error;
  }
};

export const getKeysends = async (host, macaroon) => {
  const response = await axios.get(`https://${host}:8080/v1/invoices`, {
    headers: {
      "Grpc-Metadata-Macaroon": macaroon,
      "Content-Type": "application/json",
    },
  });

  const invoices = response.data.invoices;

  const keysendTransactions = invoices
    .filter((tx) => tx.is_keysend === true)
    .map((tx) => ({
      amount: tx.amt_paid_sat,
      message:
        tx.htlcs.length > 0 &&
        Buffer.from(tx.htlcs[0].custom_records["34349334"], "base64").toString(
          "utf-8",
        ),
      sent: false,
    }));

  return keysendTransactions;
};

export const getPeers = async (host, macaroon) => {
  const response = await axios.get(`https://${host}:8080/v1/peers`, {
    headers: {
      "Grpc-Metadata-Macaroon": macaroon,
    },
  });

  const peers = response.data.peers;

  console.log("peers", peers);

  if (!peers && !peers.length > 0) {
    return [];
  }

  const peerKeys = peers.map((peer) => {
    return peer.pub_key;
  });

  return peerKeys;
};

export const getInfo = async (host, macaroon) => {
  const response = await axios.get(`https://${host}:8080/v1/getinfo`, {
    headers: {
      "Grpc-Metadata-Macaroon": macaroon,
    },
  });

  if (!response.data) {
    return null;
  }

  return response.data;
};
