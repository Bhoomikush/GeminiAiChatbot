const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");

let userMessage = ""

//Function to create message elements
const createmsgElement =(content,...classes) =>{
    const div =document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML =content;
    return div;
}

const generateResponse = () => {
    try{

    } catch(error){
        
    }
}

//Handle the form submissions
const handleFormSubmit =(e) =>{
    e.preventDefault();
    userMessage = promptInput.value.trim();
    if(!userMessage) return;

    promptInput.value="";

    // Generate user message Html and add in the chats container
    const userMsgHTML =`<p class="message-text"></p>`;
    const userMsgDiv = createmsgElement(userMsgHTML,"user-message");

    userMsgDiv.querySelector(".message-text").textContent =userMessage;
    chatsContainer.appendChild(userMsgDiv);

    setTimeout(()=>{
        // Generate user message Html and add in the chats container after 600ms
        const botMsgHTML =`<img src="gemini-chatbot-logo.svg" class="avatar"> <p class="message-text">Just a sec...</p>`;
        const botMsgDiv = createmsgElement(botMsgHTML,"bot-message","loading");
        chatsContainer.appendChild(botMsgDiv);
        generateResponse();
    }, 600);
}
promptForm.addEventListener("submit",handleFormSubmit)