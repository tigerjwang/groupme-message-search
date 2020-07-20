let db;

var messages = [];
var viewStart = 0;
var viewEnd = 0;

// https://stackoverflow.com/a/494348/5000320
function createElementFromHTML(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes
  return div.firstChild; 
}

function populateGroups(obj) {
	obj.response.forEach((group) => {
		var opt = document.createElement("option");
		opt.value = group.id;
		opt.innerHTML = group.name + "; " + group.id;
		document.getElementById('group-select').appendChild(opt);
	});
}

function populatePreviews(conversations) {
	var i;
	for (i = 0; i < conversations.length; i++) {
		var preview = document.createElement('div');
		preview.setAttribute('id', 'conversation-'+i);
		preview.setAttribute('class', 'conversation-preview');

		var j;
		for (j = 0; j < Math.min(4, conversations[i].length); j++) {
			if (!messages[conversations[i][j]].text) {
				continue;
			}
			var message = document.createElement('div');
			var bold = document.createElement('b');
			var name = document.createTextNode(messages[conversations[i][j]].name+': ');
			bold.appendChild(name);
			var text = document.createTextNode(messages[conversations[i][j]].text);
			message.setAttribute('class', 'preview-message');
			message.setAttribute('id', "p"+conversations[i][j]);
			message.appendChild(bold);
			message.appendChild(text);
			preview.appendChild(message);
		}
		preview.addEventListener('click', previewOnClick, false);
		document.getElementById('preview-container').appendChild(preview);
	}
}

async function getGroups(token) {
	if (token && token=="") {
		// Error handling
	}
	console.log('Getting user groups...');

	const response = await fetch('https://api.groupme.com/v3/groups?token='+token, {
	    method: 'GET',
	    headers: {
	      'Content-Type': 'application/json'
	    }
	  });
	const myJson = await response.json();
	populateGroups(myJson);
}

async function getMessages() {
	console.log('Getting user messages...');
	groupId = document.getElementById('group-select').value;
	token = document.getElementById('token').value;

	let objectStore = db.transaction('messages_os').objectStore('messages_os');
	objectStore.openCursor().onsuccess = function(e) {
		let cursor = e.target.result;
		if(cursor) {
			if(groupId == cursor.value.groupId) {
				messages = cursor.value.allMessages;
			}
			cursor.continue();
		} else {
			console.log("IDB TRANS: No messages stored");
		}
		if(messages.length == 0) {
			fetchMessages(token, groupId);
			IDB_storeMessages(groupId);
		}
	};
}

async function fetchMessages(token, group_id) {
	console.log('Downloading user messages...');
	var before_id = '';
	var status = 0;
	do {
		var url = 'https://api.groupme.com/v3/groups/' + group_id + '/messages?before_id=' + before_id + '&limit=100&token=' + token;
		const response = await fetch(url, {
		    method: 'GET',
		    headers: {
		      'Content-Type': 'application/json'
		    }
	  	});
	  	status = response.status;
	  	if (status == 304) {
	  		break;
	  	}
	  	const batch = await response.json();
	  	messages = messages.concat(batch.response.messages);
	  	before_id = messages[messages.length-1].id;
	  	console.log('Completed fetching' + messages.length + '/' + batch.response.count + ' messages...');
	} while (status != 304); // Code 304 signals end of message stream
	
	console.log('fetchMessages done: size ' + messages.length);
	console.log(messages[0]);
}

async function getConversations(search_term) {
	console.log(`searching conversations for "${search_term}"...`);

	/* DEBUGGING */

	// clear all children first for a fresh search
	document.getElementById('preview-container').innerHTML = '';

	if (messages.length == 0) {
		await getMessages(document.getElementById('token').value, document.getElementById('group-select').value);
	}

	var conversations = [];
	var conversation = [];
	var i;
	var prev;
	for (i = 0; i < messages.length; i++) {
		var message = messages[i];
		if (!message.text) { // skip if no text
			//console.log(message);
			continue;
		}
		if (message.text.includes(search_term)) {
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
	populatePreviews(conversations);
}

async function populateMessages(startFrom, howMany) {
	startFrom = parseInt(startFrom)
	viewStart = startFrom;
	viewEnd = startFrom+howMany;
	if (messages.length == 0) {
		await getMessages();
	}
	var parent = document.getElementById('message-viewer');
	parent.innerHTML = "";
	var buttonHTML = `<button type="button" id="button_load_prev">PREV 50</button>`
	var button = createElementFromHTML(buttonHTML);
	button.addEventListener('click', buttonPrevClick, false);
	parent.appendChild(button);

	console.log("deleting existing...")

	console.log("populating messages..." + (startFrom+howMany) + "..." + messages.length + "..." + Math.min(startFrom + howMany, messages.length))

	for (var i = startFrom; i < Math.min(startFrom + howMany, messages.length); i++) {
		//console.log("adding");
		var timestamp = new Date(messages[i].created_at * 1000);

		var newMessageElement = 
`<div class="message-container" id="${messages[i].id}"">
	<div class="left-container">
		<img class="profile-photo">
	</div>
	<div class="right-container">
		<div class="message-box">
			<div class="message-text">${messages[i].text}</div>
			<div class="time-stamp">${timestamp.toString()}</div>
		</div>
		<div class="attachment-container">
		</div>
	</div>
</div>`;
		var element = createElementFromHTML(newMessageElement);
		parent.appendChild(element);
	}
	buttonHTML = `<button type="button" id="button_load_next">NEXT 50</button>`
	button = createElementFromHTML(buttonHTML);
	button.addEventListener('click', buttonNextClick, false);
	parent.appendChild(button);
}

// SET ONCLICK

document.getElementById('button_display_messages').onclick = function() {
	populateMessages(0,100);
};

document.getElementById('button_get_messages').onclick = function() {
	getMessages();
};

window.onload = function() {

	/* IndexedDB LOGIC */

	let request = window.indexedDB.open('messages_db', 1);

	request.onerror = function() {
		console.log('IDB TRANS: ERROR Database failed to open. Cannot read locally stored messages!');
	};

	request.onsuccess = function() {
		console.log('IDB TRANS: Database opened successfully.');
		db = request.result;
	}

	// runs when we create, or upgrade, the database
	request.onupgradeneeded = function(e) {
		let db = e.target.result;
		let objectStore = db.createObjectStore('messages_os', { keyPath: 'id', autoIncrement:true });
		objectStore.createIndex('allMessages', 'allMessages', { unique: false });
		objectStore.createIndex('groupId', 'groupId', { unique: true });
		console.log("IDB TRANS: Database successfully set up")
	}
};

/* IndexedDB METHOD */
function IDB_storeMessages(group_id) {
	let newItem = { 
		allMessages: messages, 
		groupId: group_id
	};
	let transaction = db.transaction(['messages_os'], 'readwrite');
	let objectStore = transaction.objectStore('messages_os');
	console.log("IDB TRANS: storing messages...")
	let request = objectStore.add(newItem);
	request.oncomplete = function() {
		console.log(`IDB TRANS: messages successfully stored, size ${message.length}`);
	}
	transaction.onerror = function(e) {
		console.log(e);
		console.log("IDB TRANS: ERROR messages failed to load!");
	}
}

/* IndexedDB METHOD */
function IDB_loadStoredMessages(groupId) {
	let objectStore = db.transaction('messages_os').objectStore('messages_os');
	objectStore.openCursor().onsuccess = function(e) {
		let cursor = e.target.result;
		if(cursor) {
			if(groupId == cursor.value.groupId) {
				messages = cursor.value.allMessages;
			}
			cursor.continue();
		} else {
			console.log("IDB TRANS: No messages stored");
		}
		console.log(`IDB TRANS: Messages finished loading for ${groupId}, size ${messages.length}`);
	};
}
