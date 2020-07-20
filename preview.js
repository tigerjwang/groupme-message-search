document.getElementById('button_search').onclick = function() {
	const searchWord = document.getElementById('input_search').value;
	makePreviews(searchWord);
};

/* Trims and highlights preview message text */
function buildPreviewMessageText(messageText, searchWord) {
	if(messageText.length > 100) {
		messageText = messageText.substring(0,100) + "..."
	}
	var re = new RegExp(searchWord, 'g');
	messageText = messageText.replace(re, `<mark>${searchWord}</mark>`);
	return messageText;
}

/* Formats created_at date to mm/dd/yyyy format */
function buildPreviewMessageDate(message) {
	const date = new Date(message.created_at * 1000);
	const formatted = (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear();
	return formatted;
}

function buildPreviewMessageDiv(message, searchWord) {
	const formattedText = buildPreviewMessageText(message.text, searchWord);
	const formattedDate = buildPreviewMessageDate(message);
	const div = `<div class="preview-message" id="${messages.indexOf(message)}">
					<img class="preview-profile-pic">
					<div class="preview-right-section">
						<div class="preview-header">
							<div class="preview-profile-name">${message.name}</div>
							<div class="preview-message-date">${formattedDate}</div>
						</div>
						
						<div class="preview-message-text">${formattedText}</div>
					</div>
				</div>`;
	return div
}

function buildPreviewDiv(conversation, searchWord) {
	var div = '<div class="preview">';
	for(var i = 0; i < conversation.length; i++) {
		div += buildPreviewMessageDiv(messages[conversation[i]], searchWord);
	}
	div += '</div>';
	return div
}

function makePreviews(searchWord) {
	// Clear existing content
	document.getElementById('preview-container').innerHTML = '';

	/* Search messages */
	var conversations = [];
	var conversation = [];
	var prev;
	for (var i = 0; i < messages.length; i++) {
		var message = messages[i];
		if (!message.text) { // skip if no text
			//console.log(message);
			continue;
		}
		if (message.text.toLowerCase().includes(searchWord.toLowerCase())) {
			//console.log("found on " + i);
			if (!prev) {
				prev = i;
			}
			if (i - prev <= 10) {
				conversation.push(i);
			} else {
				conversations.push(conversation);
				conversation = [];
				conversation.push(i);
			}
			prev = i;
		}
	}
	if (conversations.length != 0) {
		conversations.push(conversation);
	}

	/* Populate on-screen */
	for(var i = 0; i < conversations.length; i++) {
		const divHTML = buildPreviewDiv(conversations[i], searchWord);
		const div = createElementFromHTML(divHTML);
		// Click to display in message-viewer
		div.addEventListener('click', previewOnClick, false);
		document.getElementById('preview-container').appendChild(div);
	}
}

var previewOnClick = function() {
	populateMessages(this.firstChild.id, 100);
}