import { useState, useEffect, useRef } from "react";


function ChatBox({ socket, onEndRound, recoveredSession }) {
  

  const [messages, setMessages] = useState(() => {
    if (recoveredSession) {
      return [{ type: "system", text: "Stranger has joined the chat" }, ...recoveredSession.messages];
    }
    return [];
  });
  
  const [input, setInput] = useState("");
  

  const [isWaiting, setIsWaiting] = useState(() => {
    if (recoveredSession && recoveredSession.messages.length > 0) {
       return recoveredSession.messages[recoveredSession.messages.length - 1].type === "user";
    }
    return false;
  });
  
  const [timeLeft, setTimeLeft] = useState(null);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  

  const roundStartRef = useRef(
    recoveredSession 
      ? { startTime: recoveredSession.startTime, durationSeconds: recoveredSession.durationSeconds } 
      : null
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isWaiting]);


  useEffect(() => {
    const timer = setInterval(() => {
      if (!roundStartRef.current) return;
      const { startTime, durationSeconds } = roundStartRef.current;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, durationSeconds - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        handleEndRound();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onEndRound]);

  useEffect(() => {
    socket.on("round_start", ({ startTime, durationSeconds }) => {
      roundStartRef.current = { startTime, durationSeconds };
      setMessages([{ type: "system", text: "Stranger has joined the chat" }]);
    });

    socket.on("receive_message", ({ text, timestamp }) => {
      setMessages((prev) => [...prev, { type: "bot", text, timestamp }]);
      setIsWaiting(false);
    });


    // only ready if new session
    if (!recoveredSession) {
      socket.emit("ready");
    }

    return () => {
      socket.off("round_start");
      socket.off("receive_message");
    };
  }, [socket, recoveredSession]);

  useEffect(() => {
    if (!isWaiting) inputRef.current?.focus();
  }, [isWaiting]);

  const formatTime = (seconds) => {
    if (seconds === null) return "--:--";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleEndRound = () => {
    socket.emit("leave_chat");
    if (onEndRound) onEndRound();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isWaiting) return;
    setMessages((prev) => [...prev, { type: "user", text: input }]);
    setIsWaiting(true);
    socket.emit("send_message", { text: input });
    setInput("");
  };

  return (
    <div className="chatbox-wrapper">
      <div className="simple-chatbox">
        <div className="chat-header">
          <span className="timer">{formatTime(timeLeft)}</span>
          <button className="guess-button" onClick={handleEndRound}>Make Guess</button>
        </div>

        <div className="messages-container">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.type}-wrapper`}>
              <div className={`chat-message ${msg.type}-message`}>{msg.text}</div>
              {msg.timestamp && <span className="timestamp">{msg.timestamp}</span>}
            </div>
          ))}
          {isWaiting && (
            <div className="chat-message bot-message" style={{ opacity: 0.7 }}>
              typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="chat-form">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder={isWaiting ? "Waiting for reply..." : "Type your response..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isWaiting}
          />
          <button type="submit" className="chat-button" disabled={isWaiting}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatBox;