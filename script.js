const chatsContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const filePreview = promptForm.querySelector(".file-preview");
const stopResponseBtn = promptForm.querySelector("#stop-response-btn");

// API setup
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

let userMessage = "";
let base64File = null;
let fileMimeType = null;
let fileName = "";
let activeTypingInterval = null;
let abortController = null;
const chatHistory = [];

// Create message elements
const createMsgElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

// Scroll to bottom
const scrollToBottom = () => {
  container.scrollTo({
    top: container.scrollHeight,
    behavior: "smooth"
  });
};

// Typing effect
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  // Remove loading state
  botMsgDiv.classList.remove("loading");

  activeTypingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(activeTypingInterval);
      activeTypingInterval = null;
      promptForm.classList.remove("generating");
    }
  }, 40);
};

// Generate AI response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");

  // Build the parts for this message (text + optional file)
  const parts = [{ text: userMessage }];

  if (base64File && fileMimeType) {
    parts.push({
      inline_data: {
        mime_type: fileMimeType,
        data: base64File
      }
    });
  }

  // Add user message to history
  chatHistory.push({
    role: "user",
    parts: parts
  });

  // Clear file state now that it's been added to history
  base64File = null;
  fileMimeType = null;
  fileName = "";

  // Limit history
  if (chatHistory.length > 20) {
    chatHistory.splice(0, 2);
  }

  try {
    // Mark UI as generating so the stop button shows in place of the attach button
    abortController = new AbortController();
    promptForm.classList.add("generating");

    // API request
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: "POST",
      signal: abortController.signal,
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
              text: "You are a helpful and accurate AI assistant. Give concise and factual answers."
            }
          ]
        }
      })
    });

    const data = await response.json();
    console.log(data);

    // API errors
    if (!response.ok) {
      throw new Error(data.error?.message || "Something went wrong");
    }

    // No response
    if (!data.candidates || !data.candidates.length) {
      throw new Error("No response generated");
    }

    // Extract response
    const responseText = data.candidates[0].content.parts[0].text
      .replace(/\*\*/g, "")
      .replace(/```/g, "")
      .trim();

    // Typing animation
    typingEffect(responseText, textElement, botMsgDiv);

    // Save bot response
    chatHistory.push({
      role: "model",
      parts: [{ text: responseText }]
    });

  } catch (error) {
    if (error.name === "AbortError") {
      // Request was cancelled by the user via the stop button
      textElement.textContent = "Response stopped.";
    } else {
      console.error(error);
      textElement.textContent = "Error: " + error.message;
    }
    botMsgDiv.classList.remove("loading");
    promptForm.classList.remove("generating");
  } finally {
    abortController = null;
  }
};

// Handle form submit
const handleFormSubmit = (e) => {
  e.preventDefault();

  userMessage = promptInput.value.trim();
  if (!userMessage) return;

  // Clear input
  promptInput.value = "";

  // Hide header + suggestions once chat starts
  container.classList.add("hide-header");

  // User message HTML (image preview for images, a file chip for everything else)
  let attachmentHTML = "";
  if (base64File) {
    if (fileMimeType.startsWith("image/")) {
      attachmentHTML = `<img src="${filePreview.src}" class="img-attachment" />`;
    } else {
      attachmentHTML = `
        <div class="file-attachment">
          <span class="material-symbols-rounded">description</span>
          <span class="file-attachment-name">${fileName}</span>
        </div>
      `;
    }
  }

  const userMsgHTML = `
    <p class="message-text"></p>
    ${attachmentHTML}
  `;

  // Create user message
  const userMsgDiv = createMsgElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userMessage;
  chatsContainer.appendChild(userMsgDiv);

  scrollToBottom();

  // Bot response delay
  setTimeout(() => {
    // Bot loading HTML
    const botMsgHTML = `<img src="gemini-chatbot-logo.svg" class="avatar"><p class="message-text">Just a sec...</p>`;

    // Create bot message
    const botMsgDiv = createMsgElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);

    scrollToBottom();

    // Generate AI response
    generateResponse(botMsgDiv);
  }, 600);

  // Reset file upload UI now that the message has been sent
  fileUploadWrapper.classList.remove("active", "img-attached");
};

// Handle file selection
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.addEventListener("load", () => {
    fileMimeType = file.type;
    fileName = file.name;
    base64File = reader.result.split(",")[1]; // strip "data:...;base64," prefix

    fileUploadWrapper.classList.add("active");

    // Only show an actual image preview for image files.
    // Non-image files (pdf, txt, csv, etc.) can't render as <img>,
    // which is what was causing the broken-image icon.
    if (file.type.startsWith("image/")) {
      filePreview.src = reader.result;
      fileUploadWrapper.classList.add("img-attached");
    } else {
      filePreview.src = "#";
      fileUploadWrapper.classList.remove("img-attached");
    }

    fileInput.value = ""; // allow re-selecting the same file again later
  });
});

// Cancel a selected file before sending
promptForm.querySelector("#cancel-file-btn").addEventListener("click", () => {
  base64File = null;
  fileMimeType = null;
  fileName = "";
  filePreview.src = "#";
  fileUploadWrapper.classList.remove("active", "img-attached");
});

// Stop an in-progress response (either the network request or the typing animation)
stopResponseBtn.addEventListener("click", () => {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }

  if (activeTypingInterval) {
    clearInterval(activeTypingInterval);
    activeTypingInterval = null;

    // Mark the currently-typing bot message as no longer loading
    const lastBotMsg = chatsContainer.querySelector(".bot-message.loading");
    if (lastBotMsg) lastBotMsg.classList.remove("loading");
  }

  promptForm.classList.remove("generating");
});

// Submit event
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

// Delete chat (clear conversation)
document.querySelector("#delete-toggle-btn").addEventListener("click", () => {
  chatHistory.length = 0; // clear conversation history
  chatsContainer.innerHTML = ""; // remove all messages from UI
  container.classList.remove("hide-header"); // show header + suggestions again
});

// Theme toggle (light/dark mode)
const themeToggleBtn = document.querySelector("#theme-toggle-btn");

// Load saved theme on page load
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLight ? "dark_mode" : "light_mode";
});