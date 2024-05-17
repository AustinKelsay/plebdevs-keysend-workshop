import React, { useState, useEffect } from "react";
import { sendKeysend, getKeysends, getPeers } from "./lnd"; // Import the keysend functions
import "./App.css";

export default function App() {
  const [message, setMessage] = useState(""); // State to hold the current message being typed
  const [messages, setMessages] = useState([]); // State to hold all messages
  const [peers, setPeers] = useState([]); // State to hold all peers
  const [selectedChat, setSelectedChat] = useState(""); // State to hold the selected chat/peer
  // const [peers, setPeers] = useState([]); // State to hold the peers

  // Function to handle input changes for the message input field
  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  // Function to handle the selection of a chat/peer
  const handleChatChange = (e) => {
    setSelectedChat(e.target.value);
  };

  // Function to handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior
    if (message.trim() !== "" && selectedChat !== "") {
      try {
        // Send the keysend payment with the message
        await sendKeysend(selectedChat, 1100, message); // Adjust amount as needed

        // Add the sent message to the local state
        const newMessage = {
          id: Date.now(),
          content: message,
          chat: selectedChat,
          sent: true, // Mark this message as sent
        };
        setMessages([...messages, newMessage]);
        setMessage(""); // Clear the input field
      } catch (error) {
        console.error("Error sending keysend:", error);
      }
    }
  };

  // Function to fetch recent keysend messages periodically
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const activePeers = await getPeers();
        setPeers(activePeers);
        const keysendMessages = await getKeysends();
        const newMessages = keysendMessages.map((tx) => ({
          id: tx.tx_hash,
          content: Buffer.from(
            tx.dest_custom_records["34349334"],
            "hex",
          ).toString("utf8"),
          chat: tx.dest,
          sent: false, // Mark this message as received
        }));
        setMessages((prevMessages) => [...prevMessages, ...newMessages]);
      } catch (error) {
        console.error("Error fetching keysend messages:", error);
      }
    };

    // Fetch messages immediately and then periodically
    fetchMessages();
    const interval = setInterval(fetchMessages, 60000); // Adjust interval as needed (e.g., every minute)

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  return (
    <main>
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
            .filter((message) => message.chat === selectedChat)
            .map((message) => (
              <li key={message.id}>
                {message.content} {message.sent ? "(Sent)" : "(Received)"}
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
