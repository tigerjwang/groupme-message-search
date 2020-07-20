function buttonPrevClick() {
	populateMessages(viewStart-50,100);
}

function buttonNextClick() {
	populateMessages(viewStart.indexOf()+50,100);
}