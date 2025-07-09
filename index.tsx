/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Chat } from '@google/genai';

// --- DOM Elements ---
const chatContainer = document.getElementById('chat-container') as HTMLElement;
const chatForm = document.getElementById('chat-form') as HTMLFormElement;
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const sendButton = document.getElementById('send-button') as HTMLButtonElement;

// --- Gemini AI Setup ---
const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const chat: Chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: 'You are a helpful and friendly AI assistant. Format your responses with simple Markdown.',
  },
});

/**
 * Sanitizes and converts simple Markdown to HTML.
 * @param {string} text The text to convert.
 * @returns {string} The HTML string.
 */
const markdownToHtml = (text: string): string => {
  // Sanitize to prevent XSS
  let sanitizedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Basic Markdown to HTML conversion
  return sanitizedText
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Newlines
    .replace(/\n/g, '<br>');
};

/**
 * Appends a message to the chat container.
 * @param {string} sender - 'user' or 'ai'.
 * @param {string} text - The initial message content.
 * @returns {HTMLElement} The created message paragraph element.
 */
const appendMessage = (sender: 'user' | 'ai', text: string): HTMLElement => {
  const messageWrapper = document.createElement('div');
  messageWrapper.classList.add('message', `${sender}-message`);

  const messageParagraph = document.createElement('p');
  // For user messages, we only need to set the text content.
  if (sender === 'user') {
    messageParagraph.textContent = text;
  }
  
  messageWrapper.appendChild(messageParagraph);
  chatContainer.appendChild(messageWrapper);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return messageParagraph;
};

/**
 * Sets the loading state of the form.
 * @param {boolean} isLoading - Whether the form should be in a loading state.
 */
const setLoading = (isLoading: boolean) => {
  promptInput.disabled = isLoading;
  sendButton.disabled = isLoading;
  sendButton.classList.toggle('loading', isLoading);
};

/**
 * Handles the form submission to send a message to the AI.
 * @param {Event} e - The form submission event.
 */
const handleFormSubmit = async (e: Event) => {
  e.preventDefault();
  const userPrompt = promptInput.value.trim();
  if (!userPrompt) return;

  // Append user's message and clear input
  appendMessage('user', userPrompt);
  chatForm.reset();

  setLoading(true);

  // Create a placeholder for the AI's response and get the paragraph element
  const aiMessageParagraph = appendMessage('ai', '');
  aiMessageParagraph.innerHTML = '<span class="cursor"></span>';

  try {
    const stream = await chat.sendMessageStream({ message: userPrompt });

    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk.text;
      aiMessageParagraph.innerHTML = markdownToHtml(fullResponse) + '<span class="cursor"></span>';
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    // Remove cursor after streaming is complete
    aiMessageParagraph.innerHTML = markdownToHtml(fullResponse);

  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // Sanitize error message before displaying
    aiMessageParagraph.innerHTML = `<strong>Error:</strong> ${markdownToHtml(errorMessage)}`;
    aiMessageParagraph.style.color = '#ff4d4d';
  } finally {
    setLoading(false);
  }
};

// --- Event Listeners ---
chatForm.addEventListener('submit', handleFormSubmit);