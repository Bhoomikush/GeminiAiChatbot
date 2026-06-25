const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");

// API setup
const API_KEY = "...";

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

let userMessage = "";
const chatHistory = [];

// Function to create message elements
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");

  div.classList.add("message", ...classes);

  div.innerHTML = content;

  return div;
};

// Typing effect
const typingEffect = (text, textElement, botMsgDiv) => {

  textElement.textContent = "";

  const words = text.split(" ");

  let wordIndex = 0;

  // Remove loading before typing starts
  botMsgDiv.classList.remove("loading");

  const typingInterval = setInterval(() => {

    if (wordIndex < words.length) {

      textElement.textContent +=
        (wordIndex === 0 ? "" : " ") +
        words[wordIndex++];

      // Auto scroll while typing
      chatsContainer.scrollTop =
        chatsContainer.scrollHeight;

    } else {

      clearInterval(typingInterval);
    }

  }, 40);
};

// Generate bot response
const generateResponse = async (botMsgDiv) => {

  const textElement =
    botMsgDiv.querySelector(".message-text");

  // Add user message to history
  chatHistory.push({
    role: "user",
    parts: [
      {
        text: userMessage
      }
    ]
  });

  // Limit history size
  if (chatHistory.length > 20) {
    chatHistory.splice(0, 2);
  }

  try {

    // API request
    const response = await fetch(
      `${API_URL}?key=${API_KEY}`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          contents: chatHistory,

          generationConfig: {
            temperature: 0.3,
            topP: 0.8,
            topK: 20,
            maxOutputTokens: 500
          },

          systemInstruction: {
            parts: [
              {
                text:
                  "You are a helpful and accurate AI assistant. Give concise and factual answers."
              }
            ]
          }
        })
      }
    );

    const data = await response.json();

    console.log(data);

    // Check API errors
    if (!response.ok) {
      throw new Error(
        data.error?.message || "Something went wrong"
      );
    }

    // Check if response exists
    if (
      !data.candidates ||
      !data.candidates.length
    ) {
      throw new Error("No response generated");
    }

    // Extract AI response
    const responseText =
      data.candidates[0].content.parts[0].text
        .replace(/\*\*/g, "")
        .replace(/```/g, "")
        .trim();

    // Typing animation
    typingEffect(
      responseText,
      textElement,
      botMsgDiv
    );

    // Save bot response
    chatHistory.push({
      role: "model",
      parts: [
        {
          text: responseText
        }
      ]
    });

  } catch (error) {

    console.error(error);

    textElement.textContent =
      "Error: " + error.message;

    botMsgDiv.classList.remove("loading");
  }
};

// Handle form submit
const handleFormSubmit = (e) => {

  e.preventDefault();

  userMessage = promptInput.value.trim();

  if (!userMessage) return;

  // Clear input
  promptInput.value = "";

  // User message HTML
  const userMsgHTML = `
    <p class="message-text"></p>
  `;

  // Create user message
  const userMsgDiv = createMsgElement(
    userMsgHTML,
    "user-message"
  );

  userMsgDiv.querySelector(".message-text").textContent =
    userMessage;

  chatsContainer.appendChild(userMsgDiv);

  // Auto scroll
  chatsContainer.scrollTop =
    chatsContainer.scrollHeight;

  // Delay bot response
  setTimeout(() => {

    // Bot loading HTML
    const botMsgHTML = `
      <img src="gemini-chatbot-logo.svg" class="avatar">
      <p class="message-text">Just a sec...</p>
    `;

    // Create bot message
    const botMsgDiv = createMsgElement(
      botMsgHTML,
      "bot-message",
      "loading"
    );

    chatsContainer.appendChild(botMsgDiv);

    // Auto scroll
    chatsContainer.scrollTop =
      chatsContainer.scrollHeight;

    // Generate AI response
    generateResponse(botMsgDiv);

  }, 600);
};

// Form submit event
promptForm.addEventListener(
  "submit",
  handleFormSubmit
);