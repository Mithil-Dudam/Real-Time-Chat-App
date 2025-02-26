import { useState, useEffect, useRef } from "react";
import useWebSocket from "react-use-websocket";
import api from "./api";
import { CircleUser,CircleArrowLeft } from "lucide-react";

const SOCKET_URL = "ws://localhost:8000/ws";

const App = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ text: string; sent_by: number }[]>([]);
  const [chatID, setChatID] = useState(0);

  const { sendMessage, lastMessage } = useWebSocket(`${SOCKET_URL}/${chatID}`, {
    shouldReconnect: () => true,
  });

  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const parsedMessage = JSON.parse(lastMessage.data);
        setMessages((prev) => [...prev, { text: parsedMessage.text, sent_by: parsedMessage.sent_by }]);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    }
  }, [lastMessage]);

  const handleSend = async () => {
    if (message.trim() === "") return;
    try {
      await api.post(`/text?chat_id=${chatID}&sent_by=${ID}`, { text: message });
    } catch (error: any) {
      console.error(error);
      setError("Couldn't send text");
    }
    sendMessage(JSON.stringify({ sent_by: ID, text: message }));
    setMessage("");
  };

  const [display, setDisplay] = useState<number>(0);
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState<string>("");
  const [ID, setID] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const GoBackToLogin = () => {
    setDisplay(0)
    setEmail("")
    setPassword("")
    setUsername("")
    setError(null)
  }

  const Login = async () => {
    setError(null);
    if (email === "" || password === "") {
      setError("Please enter all fields");
      return;
    }
    try {
      const response = await api.post("/login", { email: email, password: password });
      if (response.status === 200) {
        setMessage("");
        setID(response.data.id);
        alert("Login Successful");
        setDisplay(2);
        setEmail("");
        setPassword("");
      }
    } catch (error: any) {
      console.error(error);
      if (error.response) {
        setError(error.response.data.detail);
      } else {
        setError("Couldn't perform login");
      }
    }
  };

  const ToRegister = () => {
    setDisplay(1)
    setEmail("")
    setPassword("")
    setError(null)
  }

  const Register = async () => {
    setError(null);
    if (username === "" || password === "" || email === "") {
      setError("Please enter all fields");
      return;
    }
    try {
      const response = await api.post("/new-user", { email: email, password: password, username: username });
      if (response.status === 201) {
        setMessage(response.data.message);
        setUsername("");
        setPassword("");
        setEmail("");
        setDisplay(0);
      }
    } catch (error: any) {
      console.error(error);
      if (error.response) {
        setError(error.response.data.detail);
      } else {
        setError("Error: Couldn't create a new user");
      }
    }
  };

  const [allUsers, setAllUsers] = useState<{ username: String; user_id: number }[]>([]);

  const AllUsers = async () => {
    setError(null);
    try {
      const response = await api.get(`/users?user_id=${ID}`);
      if (response.status === 200) {
        setAllUsers(response.data);
      }
    } catch (error: any) {
      console.error(error);
      setError("Couldn't get all users");
    }
  };

  useEffect(() => {
    if (display === 2) {
      AllUsers();
    }
  }, [display]);

  const [recipient, setRecipient] = useState(0);

  const StartChatting = async (user_id: number) => {
    setDisplay(3);
    setRecipient(user_id);
    try {
      const response = await api.post(`/chat?id=${ID}&recipient=${user_id}`);
      if (response.status === 201) {
        setChatID(response.data.chat_id);
      }
    } catch (error: any) {
      console.error(error);
      setError("Couldn't create chat");
    }
  };

  const [allTexts, setAllTexts] = useState<{ text: String; sent_by: number }[]|null>([]);

  const AllTexts = async () => {
    setError(null);
    try {
      const response = await api.get(`/texts?chat_id=${chatID}`);
      if (response.status === 200) {
        setAllTexts(response.data);
      }
    } catch (error: any) {
      console.error(error);
      setError("Error: Couldn't get all texts");
    }
  };

  useEffect(() => {
    if (display === 3) {
      AllTexts();
    }
  }, [chatID]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, allTexts]);

  const GoBack = () => {
    setDisplay(2)
    setAllTexts(null)
    setChatID(0)
    setMessages([])
  }

  return (
    <div className="min-w-screen min-h-screen flex bg-cyan-100">
      {display === 0 && (
        <div className="text-white flex justify-center items-center min-w-screen min-h-screen">
          <div className="my-auto rounded-lg border-3 bg-white text-gray-500 px-5 py-5">
            <h1 className="text-center font-bold text-2xl">Welcome Back!</h1>
            <p className="text-center mt-2 text-lg text-gray-400 font-semibold">Enter your details to login</p>
            <div className="mb-5 mt-7 flex justify-between">
              <label className="mr-2 font-semibold">Enter email:</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`px-1 placeholder:text-sm border-2 rounded`}
                placeholder="Enter your email..."
              />
            </div>
            <div className="flex justify-between">
              <label className="mr-2 font-semibold">Enter password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`px-1 placeholder:text-sm border-2 rounded`}
                placeholder="Enter your password..."
              />
            </div>
            <div className="flex justify-center mt-7">
              <button
                className="cursor-pointer border-2 font-semibold px-2 py-1 hover:bg-gray-500 hover:text-white rounded-2xl"
                onClick={Login}
              >
                Login
              </button>
            </div>
            <p className="text-red-500 text-center mt-2">{error}</p>
            <div className="text-center mt-5">
              <p>
                Don't have an account ?{" "}
                <span className="hover:underline font-semibold cursor-pointer" onClick={ToRegister}>
                  Sign Up
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
      {display === 1 && (
        <div className="text-white flex justify-center items-center min-w-screen min-h-screen">
          <div className="my-auto rounded-lg border-3 bg-white text-gray-500 px-5 py-5">
            <p><CircleArrowLeft size={30} className="mb-2 cursor-pointer" onClick={GoBackToLogin}/></p>
            <h1 className="text-center font-bold text-2xl">Welcome!</h1>
            <p className="text-center mt-2 text-lg text-gray-400 font-semibold">Enter your details to Register</p>
            <div className="mb-5 mt-7 flex justify-between">
              <label className="mr-2 font-bold">Enter email:</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`px-1 placeholder:text-sm border-2 rounded`}
                placeholder="Enter your email..."
              />
            </div>
            <div className="mb-5 flex justify-between">
              <label className="mr-2 font-bold">Enter password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`px-1 placeholder:text-sm border-2 rounded`}
                placeholder="Enter your password..."
              />
            </div>
            <div className="flex justify-between">
              <label className="mr-2 font-bold">Enter username:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`px-1 placeholder:text-sm border-2 rounded`}
                placeholder="Enter your username..."
              />
            </div>
            <div className="flex justify-center mt-7">
              <button
                className="cursor-pointer border-2 px-2 py-1 hover:bg-gray-500 hover:text-white rounded-2xl font-semibold"
                onClick={Register}
              >
                Register
              </button>
            </div>
            <p className="text-red-500 text-center mt-2">{error}</p>
          </div>
        </div>
      )}
      {display === 2 && (
        <div className="border w-[80%] mx-auto h-[80vh] bg-white flex items-center my-auto overflow-auto">
          <div className="grid grid-cols-5 gap-2 p-2">
            {allUsers.map((user, index) => (
              <div
                key={index}
                className="p-1 mb-5 cursor-pointer hover:bg-gray-100 bg-blue-100 border flex items-center space-x-2"
                onClick={() => StartChatting(user.user_id)}
              >
                <CircleUser size={30} className="mr-2" />
                {<p className="truncate w-full">{user.username}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {display === 3 && (
        <div className="p-4 w-[80%] mx-auto">
          <p><CircleArrowLeft className="mb-2 bg-white rounded-full cursor-pointer" onClick={GoBack}/></p>
          <div
            ref={chatContainerRef}
            className="border-5 p-2 h-[80vh] overflow-auto bg-white"
          >
            {allTexts?.map((text, index) => (
              <div
                key={index}
                className={`p-1 border-b border-gray-100 my-5 ${text.sent_by === ID ? "text-right" : "text-left"}`}
              >
                <span
                  className={`border p-2 rounded-xl ${
                    text.sent_by === ID ? "border-blue-700 bg-sky-300" : "border-green-700 text-right bg-green-400"
                  }`}
                >
                  {text.text}
                </span>
              </div>
            ))}
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-1 border-b border-gray-100 my-5 ${msg.sent_by === ID ? "text-right" : "text-left"}`}
              >
                <span
                  className={`border p-2 rounded-xl ${
                    msg.sent_by === ID ? "border-blue-700 bg-sky-300" : "border-green-700 text-right bg-green-400"
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border p-1 flex-1 bg-white"
            />
            <button onClick={handleSend} className="ml-2 border-black border font-semibold cursor-pointer bg-blue-500 text-white p-1">
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
