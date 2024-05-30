import React, { useState, useEffect } from "react";
import { sendKeysend, getKeysends, getPeers, getInfo } from "./lnd"; // Import the keysend functions
import "./App.css";

export default function App() {
  const [message, setMessage] = useState(""); // State to hold the current message being typed
  const [messages, setMessages] = useState([]); // State to hold all messages
  const [peers, setPeers] = useState([]); // State to hold all peers
  const [info, setInfo] = useState(null); // State to hold the current node info
  const [selectedChat, setSelectedChat] = useState(""); // State to hold the selected chat/peer
  const [host, setHost] = useState(""); // State to hold the host
  const [macaroon, setMacaroon] = useState(""); // State to hold the macaroon
  const [isConnected, setIsConnected] = useState(false); // State to check if connected

  const handleHostChange = (e) => setHost(e.target.value);
  const handleMacaroonChange = (e) => setMacaroon(e.target.value);

  const handleConnect = async () => {
    try {
      const nodeInfoResponse = await getInfo(host, macaroon);

      if (nodeInfoResponse) {
        setInfo(nodeInfoResponse);
        setIsConnected(true);
        try {
          const activePeers = await getPeers(host, macaroon);
          setPeers(activePeers);
        } catch (error) {
          console.error("Error connecting to node:", error);
          setIsConnected(false);
        }
      }
    } catch (error) {
      console.error("Error connecting to node:", error);
      setIsConnected(false);
    }
  };

  const handleMessageChange = (e) => setMessage(e.target.value);
  const handleChatChange = (e) => setSelectedChat(e.target.value);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (message.trim() !== "" && selectedChat !== "") {
      try {
        await sendKeysend(
          host,
          macaroon,
          selectedChat,
          info.identity_pubkey,
          1100,
          message,
        ); // Adjust amount as needed

        const newMessage = {
          message: message,
          chat: selectedChat,
          sent: true,
        };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setMessage("");
      } catch (error) {
        console.error("Error sending keysend:", error);
      }
    }
  };

  useEffect(() => {
    if (isConnected) {
      const fetchMessages = async () => {
        try {
          const keysendMessages = await getKeysends(host, macaroon);

          // remove duplicates by message.message field
          const uniqueKeysendMessages = keysendMessages.filter(
            (message, index, self) =>
              index === self.findIndex((t) => t.message === message.message),
          );

          setMessages((prevMessages) => {
            const combinedMessages = [...prevMessages, ...uniqueKeysendMessages];

            // remove duplicates from combined messages
            const uniqueCombinedMessages = combinedMessages.filter(
              (message, index, self) =>
                index === self.findIndex((t) => t.message === message.message),
            );

            return uniqueCombinedMessages;
          });
        } catch (error) {
          console.error("Error fetching keysend messages:", error);
        }
      };

      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);

      return () => clearInterval(interval);
    }
  }, [isConnected, host, macaroon]);

  if (!isConnected) {
    return (
      <main>
        <h2>Connect to your Lightning Node</h2>
        <div>
          <label htmlFor="hostInput">Host:</label>
          <input
            id="hostInput"
            type="text"
            value={host}
            onChange={handleHostChange}
          />
        </div>
        <div>
          <label htmlFor="macaroonInput">Macaroon:</label>
          <input
            id="macaroonInput"
            type="text"
            value={macaroon}
            onChange={handleMacaroonChange}
          />
        </div>
        <button onClick={handleConnect}>Connect</button>
      </main>
    );
  }

  return (
    <main>
      {info && <h1>Connected to: {info.alias}</h1>}
      <div>
        <label htmlFor="chatDropdown">Select Chat:</label>
        <select
          id="chatDropdown"
          value={selectedChat}
          onChange={handleChatChange}
        >
          <option value="">{selectedChat}</option>
          {peers &&
            peers.length > 0 &&
            peers.map((peer) => (
              <option key={peer} value={peer}>
                {peer}
              </option>
            ))}
        </select>
      </div>

      <div>
        <h2>Messages</h2>
        <ul>
          {messages
            .filter((message) => message?.chat && message.chat === selectedChat)
            .map((message, index) => (
              <li key={index}>
                <p>{message.message}</p>
              </li>
            ))}
        </ul>
      </div>

      <form onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          onChange={handleMessageChange}
        />
        <button type="submit">Send</button>
      </form>
    </main>
  );
}
