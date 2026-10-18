const input = document.getElementById("input");
const box = document.getElementById("message-box");
const zone = document.getElementById("message-zone");
const sendbtn = document.getElementById("send-btn");
const clearbtn = document.getElementById("clear-btn");
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
const banner = document.getElementById("offline-banner");
const chatHistory = [];
let started = false;

function renderMarkdown(text) {
    // Escape first, so anything the model returns can't inject HTML
    const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const inline = (s) => s
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>");

    const lines = escape(text).split("\n");
    let html = "";
    let list = null;      // "ul", "ol", or null
    let inCode = false;

    const closeList = () => {
        if (list) { html += `</${list}>`; list = null; }
    };

    for (const line of lines) {
        // Code blocks
        if (line.trim().startsWith("```")) {
            closeList();
            html += inCode ? "</code></pre>" : "<pre><code>";
            inCode = !inCode;
            continue;
        }
        if (inCode) { html += line + "\n"; continue; }

        const bullet = line.match(/^\s*[*-]\s+(.*)/);
        const numbered = line.match(/^\s*\d+\.\s+(.*)/);
        const heading = line.match(/^#{1,6}\s+(.*)/);

        if (bullet || numbered) {
            const type = bullet ? "ul" : "ol";
            if (list !== type) { closeList(); html += `<${type}>`; list = type; }
            html += `<li>${inline((bullet || numbered)[1])}</li>`;
        } else if (heading) {
            closeList();
            html += `<p><strong>${inline(heading[1])}</strong></p>`;
        } else if (line.trim() === "") {
            closeList();
        } else {
            closeList();
            html += `<p>${inline(line)}</p>`;
        }
    }
    if (inCode) html += "</code></pre>";
    closeList();
    return html;
}

function addMessage(text, who) {
    const row = document.createElement("div");
    row.className = `row ${who}`;


    const div = document.createElement("div");

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = who === "user" ? "You":"Deep";

    const bubble = document.createElement('div');
    bubble.className = "msg";
    
    if (who === "ai") {
    bubble.innerHTML = renderMarkdown(text);
} else {
    bubble.textContent = text;     // user text stays plain
}
    row.append(name, bubble);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
}

// change this
async function getReply(text) {
    const res = await fetch ("/api/chat/",{
        method: "POST", 
        headers: {"Content-type": "application/json", "X-CSRFToken": csrfToken},
        body: JSON.stringify({prompt: text}), 
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || "Request failed");
    return data.reply;
}


  
async function sendMessage() {
    const text = input.value.trim();
    if (!text || sendbtn.disabled) return;   // also blocks Enter while waiting

    if (!navigator.onLine) {
    banner.hidden = false;
    return;
    }

    input.value = "";
    sendbtn.disabled = true;
    sendbtn.textContent = "Sending...";

    try {
        if (!started) {
            started = true;
            zone.classList.add("leaving");
            await new Promise((r) => setTimeout(r, 500));
            zone.classList.remove("leaving");
            zone.classList.add("active");
        }

        addMessage(text, "user");
        chatHistory.push({ role: "user", content: text });

        const reply = await getReply(text);
        addMessage(reply, "ai");
        chatHistory.push({ role: "assistant", content: reply });
    } catch (err) {
        addMessage("Something went wrong.", "ai");
        console.error(err);
    } finally {
        sendbtn.disabled = false;
        sendbtn.textContent = "Send";
        input.focus();
    }

    
}

sendbtn.addEventListener('click', sendMessage);
clearbtn.addEventListener("click", () => {
    input.value = "";
    input.focus();
});
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
    })

function updateOnlineStatus() {
    banner.hidden = navigator.onLine; 
}
window.addEventListener("online", updateOnlineStatus);
window.addEventListener("offline", updateOnlineStatus);
updateOnlineStatus();

if ('serviceWorker' in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(console.error);
    });
}