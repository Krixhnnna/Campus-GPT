document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-button');
    const clearButton = document.getElementById('clear-btn');
    const micButton = document.getElementById('mic-button');
    const micIconInactive = document.getElementById('mic-icon-inactive');
    const micIconActive = document.getElementById('mic-icon-active');

    let messages = [];
    let isLoading = false;
    let isListening = false;
    let recognition = null;
    let initialInput = "";

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isListening = true;
            micButton.classList.add('listening');
            micIconInactive.style.display = 'none';
            micIconActive.style.display = 'block';
            micButton.title = "Stop listening";
            initialInput = chatInput.value;
        };

        recognition.onresult = (event) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            chatInput.value = initialInput + (initialInput && transcript ? " " : "") + transcript;
            updateSendButtonState();
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            stopListening();
        };

        recognition.onend = () => {
            stopListening();
        };
    } else {
        micButton.style.display = 'none'; // Hide if not supported
    }

    const stopListening = () => {
        isListening = false;
        micButton.classList.remove('listening');
        micIconInactive.style.display = 'block';
        micIconActive.style.display = 'none';
        micButton.title = "Start voice prompt";
        if (recognition) {
            recognition.stop();
        }
    };

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            if (recognition) {
                try {
                    recognition.start();
                } catch(e) {
                    console.error("Error starting recognition", e);
                }
            } else {
                alert("Your browser does not support Speech Recognition. Please try Google Chrome or Safari.");
            }
        }
    };

    micButton.addEventListener('click', toggleListening);

    const formatTime = () => {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderMessages = () => {
        chatContainer.innerHTML = '';
        
        messages.forEach(msg => {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${msg.role === 'user' ? 'user' : 'bot'}`;
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.textContent = msg.content;
            
            const time = document.createElement('div');
            time.className = 'message-time';
            time.textContent = msg.time;

            wrapper.appendChild(bubble);

            if (msg.role !== 'user') {
                const actionContainer = document.createElement('div');
                actionContainer.className = 'message-actions';

                const copySvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
                const checkSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                const speakSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;

                const copyBtn = document.createElement('button');
                copyBtn.className = 'action-btn copy-btn';
                copyBtn.innerHTML = copySvg;
                copyBtn.title = 'Copy to clipboard';
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(msg.content).catch(err => console.error('Copy failed:', err));
                    copyBtn.innerHTML = checkSvg;
                    setTimeout(() => copyBtn.innerHTML = copySvg, 2000);
                };

                const stopSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12"></rect></svg>`;
                let isPlaying = false;

                const speakBtn = document.createElement('button');
                speakBtn.className = 'action-btn speak-btn';
                speakBtn.innerHTML = speakSvg;
                speakBtn.title = 'Read aloud';
                speakBtn.onclick = async () => {
                    if (isPlaying && window.currentAudio) {
                        window.currentAudio.pause();
                        window.currentAudio.currentTime = 0;
                        window.currentAudio = null;
                        isPlaying = false;
                        speakBtn.innerHTML = speakSvg;
                        return;
                    }

                    if (window.currentAudio) {
                        window.currentAudio.pause();
                        window.currentAudio.currentTime = 0;
                    }

                    try {
                        speakBtn.innerHTML = stopSvg;
                        isPlaying = true;

                        const response = await fetch('/api/speak', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: msg.content })
                        });

                        if (!response.ok) throw new Error("Failed to generate speech");

                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        
                        window.currentAudio = new Audio(url);
                        window.currentAudio.play();

                        window.currentAudio.onended = () => {
                            isPlaying = false;
                            speakBtn.innerHTML = speakSvg;
                            URL.revokeObjectURL(url);
                        };
                    } catch (err) {
                        console.error(err);
                        isPlaying = false;
                        speakBtn.innerHTML = speakSvg;
                        alert("ElevenLabs API failed to load speech.");
                    }
                };

                actionContainer.appendChild(copyBtn);
                actionContainer.appendChild(speakBtn);
                wrapper.appendChild(actionContainer);
            }

            wrapper.appendChild(time);
            chatContainer.appendChild(wrapper);
        });

        if (isLoading) {
            const loadingWrapper = document.createElement('div');
            loadingWrapper.className = 'message-wrapper bot';
            loadingWrapper.innerHTML = `
                <div class="message-bubble">
                    <div class="typing">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            `;
            chatContainer.appendChild(loadingWrapper);
        }

        scrollToBottom();
    };

    const scrollToBottom = () => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    };

    const initChat = () => {
        messages = [
            {
                role: "assistant",
                content: "Welcome to LPU! I am Campus GPT, your personal university guide. How can I assist you today?",
                time: formatTime()
            }
        ];
        renderMessages();
    };

    const clearChat = () => {
        messages = [
            {
                role: "assistant",
                content: "Chat cleared. How can I help you with LPU today?",
                time: formatTime()
            }
        ];
        renderMessages();
    };

    clearButton.addEventListener('click', clearChat);

    const updateSendButtonState = () => {
        sendButton.disabled = !chatInput.value.trim() || isLoading;
    };

    chatInput.addEventListener('input', updateSendButtonState);

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (isListening) {
            stopListening();
        }

        const inputContent = chatInput.value.trim();
        if (!inputContent || isLoading) return;

        const userMessage = {
            role: "user",
            content: inputContent,
            time: formatTime()
        };

        messages.push(userMessage);
        chatInput.value = '';
        updateSendButtonState();
        isLoading = true;
        renderMessages();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages })
            });

            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            messages.push({
                ...data,
                time: formatTime()
            });

        } catch (error) {
            console.error("Chat error:", error);
            messages.push({
                role: "assistant",
                content: error.message || "I encountered an error. Please ensure your API key is correctly set in .env.",
                time: formatTime()
            });
        } finally {
            isLoading = false;
            renderMessages();
        }
    });

    initChat();
});
