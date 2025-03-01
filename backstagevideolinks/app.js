// Function to connect to the WebSocket server
const connectWebSocket = () => {
    const websocket = new WebSocket(`ws://${window.location.hostname}:${window.location.port}/ws`);

    websocket.onopen = () => {
        console.log('WebSocket connected');
        // Fetch the current state immediately upon connection
        fetchCurrentEvent(); // Start updating the clock
        fetchProjectName(); // Fetch the project name
        showAllDivs();
        makeTitleCardBlinkGreen();
    };

    websocket.onclose = () => {
        console.warn('WebSocket disconnected, attempting to reconnect...');
        setTimeout(connectWebSocket, 1000); // Reconnect after 1 second
    };

    websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'ontime-eventNow') {
            handleEventNow(data.payload);
        } else if (data.type === 'ontime-eventNext') {
            handleEventNext(data.payload);
        } else if (data.type === 'ontime-timer') {
            handleTimerUpdates(data.payload);
        }
    };
};

const handleEventNow = (payload) => {
    if (payload) {
        updateTitleCard(payload);
        updateEventStartTime(payload);
        fetchNextFourEvents(payload.id);
        showAllDivs();
        makeTitleCardBlinkGreen();
    } else {
        hideAllDivs();
        clearTitleCard();
        clearEventStartTime();
    }
};

const handleEventNext = (payload) => {
    if (payload) {
        updateNextEventCard(payload);
    } else {
        clearNextEventCard();
    }
};

const handleTimerUpdates = (payload) => {
    updateTimerStartTime(payload.startedAt);
    updateTimerExpectedFinish(payload.expectedFinish);
    updateTimerCurrent(payload.current);
    updateClock(payload.clock);

    if (payload.duration && payload.elapsed) {
        updateProgressBar(payload.elapsed, payload.duration);
    } else {
        clearProgressBar();
    }
};

const fetchNextFourEvents = async (currentEventId) => {
    try {
        const response = await fetch(`/data/rundown`);
        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const data = await response.json();
        const events = data || []; // Fallback to an empty array if rundown is undefined

        // Filter only events of type "event"
        const filteredEvents = events.filter(event => event.type === 'event');

        // Find the index of the current event safely
        const currentIndex = filteredEvents.findIndex(event => event.id === currentEventId);

        if (currentIndex === -1) {
            console.warn('Current event not found in the rundown. Defaulting to the start of the list.');
            const nextEvents = filteredEvents.slice(0, 4); // Default to the first 4 events

            populateEventDivs(nextEvents);
            return;
        }

        // Get the next 4 events
        const nextEvents = filteredEvents.slice(currentIndex + 2, currentIndex + 6);
        document.getElementById("einsVor").classList.add("hidden")
        document.getElementById("einsVor").classList.remove("visible")
        document.getElementById("zweiVor").classList.add("hidden")
        document.getElementById("zweiVor").classList.remove("visible")
        document.getElementById("dreiVor").classList.add("hidden")
        document.getElementById("dreiVor").classList.remove("visible")
        document.getElementById("vierVor").classList.add("hidden")
        document.getElementById("vierVor").classList.remove("visible")
        populateEventDivs(nextEvents);
    } catch (error) {
        console.error('Error fetching next 4 events:', error);
    }
    if(true){
        document.getElementById("fuenfVor").classList.add("hidden")
        document.getElementById("fuenfVor").classList.remove("visible")

        const response = await fetch(`/data/rundown`);
        if (!response.ok) {
            throw new Error(`Failed to fetch events: ${response.statusText}`);
        }

        const data = await response.json();
        const events = data || [];
        const currentIndex = data.findIndex(event => event.id === currentEventId);

        for (let i = currentIndex; i >= 0; i--){
            if(events[i].type == "block"){
                const block = document.getElementById("fuenf");
                block.textContent = events[i].title || 'Event title not available';
                document.getElementById("fuenfVor").classList.remove("hidden")
                document.getElementById("fuenfVor").classList.add("visible")
                break;
            }
        }

    } else {
        console.error('Error fetching current block:', error);
    }
};

const populateEventDivs = (events) => {
    const divIds = ['eins', 'zwei', 'drei', 'vier'];
    events.forEach((event, index) => {
        const div = document.getElementById(divIds[index]);
        if (div) {
            div.textContent = event.title || 'Event title not available';
            document.getElementById(divIds[index] + "Vor").classList.remove("hidden")
            document.getElementById(divIds[index] + "Vor").classList.add("visible")
        }
    });

    // Clear remaining divs if fewer than 4 events
    for (let i = events.length; i < divIds.length; i++) {
        const div = document.getElementById(divIds[i]);
        if (div) {
            div.textContent = '';
        }
    }
};

// Function to fetch the current project name from the server
const fetchProjectName = async () => {
    try {
        const response = await fetch(`/data/project`);
        if (!response.ok) {
            throw new Error(`Failed to fetch project name: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.title) {
            updateProjectHeader(data.title);
        }
        if (data.description) {
            updateProjectDescription(data.description);
        }
    } catch (error) {
        console.error('Error fetching project name:', error);
    }
};

// Show all divs with fade
const divs = document.querySelectorAll('.fade');
const showAllDivs = () => {
    divs.forEach(div => {
        div.classList.remove('hidden');
        div.classList.add('visible');
    });
};

// Hide all divs with fade
const hideAllDivs = () => {
    divs.forEach(div => {
        div.classList.remove('visible');
        div.classList.add('hidden');
    });
};

// Function to update the project name in the '.project-header' element
const updateProjectHeader = (projectName) => {
    const projectHeaderElement = document.querySelector('.projekttitel');
    if (projectHeaderElement) {
        projectHeaderElement.textContent = projectName;
    }
};

// Function to update the project name in the '.project-header' element
const updateProjectDescription = (projectDescription) => {
    const projectDescriptionElement = document.querySelector('img');
    if (projectDescriptionElement) {
        projectDescriptionElement.setAttribute("src", projectDescription);
    }
};

// Function to fetch the current event from the server
const fetchCurrentEvent = async () => {
    try {
        const response = await fetch(`/api/poll`);
        if (!response.ok) {
            throw new Error(`Failed to fetch current event: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.payload) {
            if (data.payload.clock) {
                updateClock();
            }
            if (data.payload.eventNow) {
                updateTitleCard(data.payload.eventNow);
                updateEventStartTime(data.payload.eventNow);
            } else {
                clearTitleCard();
                clearEventStartTime();
            }
            if (data.payload.eventNext) {
                updateNextEventCard(data.payload.eventNext);
                fetchNextFourEvents(data.payload.eventNow.id);
            } else {
                clearNextEventCard();
            }
            if (data.payload.timer) {
                if (data.payload.timer.startedAt) {
                    updateTimerStartTime(data.payload.timer.startedAt);
                } else {
                    clearTimerStartTime();
                }
                if (data.payload.timer.expectedFinish) {
                    updateTimerExpectedFinish(data.payload.timer.expectedFinish);
                } else {
                    clearTimerExpectedFinish();
                }
                if (data.payload.timer.current !== undefined) {
                    updateTimerCurrent(data.payload.timer.current);
                } else {
                    clearTimerCurrent();
                }
                if (data.payload.timer.duration && data.payload.timer.elapsed) {
                    updateProgressBar(data.payload.timer.elapsed, data.payload.timer.duration);
                } else {
                    clearProgressBar();
                }
            }
        }
    } catch (error) {
        console.error('Error fetching current event:', error);
        clearTitleCard();
        clearEventStartTime();
        clearNextEventCard();
        clearTimerStartTime();
        clearTimerExpectedFinish();
        clearTimerCurrent();
        clearProgressBar();
    }
};

// Function to update the title card with the current event title
const updateTitleCard = (eventNow) => {
    const titleElement = document.querySelector('.title-card__title');
    if (titleElement && eventNow && eventNow.title) {
        titleElement.textContent = eventNow.title;
    }
};

// Function to clear the title card when no current event is active
const clearTitleCard = () => {
    const titleElement = document.querySelector('.title-card__title');
    if (titleElement) {
        titleElement.textContent = '';
    }
};

// Function to update the title card with the next event title
const updateNextEventCard = (eventNext) => {
    const nextTitleElement = document.querySelector('.naechstes .title-card__title');
    if (nextTitleElement && eventNext && eventNext.title) {
        nextTitleElement.textContent = eventNext.title;
        document.querySelector('.naechstes').classList.remove("hidden")
        document.querySelector('.naechstes').classList.add("visible")
    }
};

// Function to clear the next event card when no next event is available
const clearNextEventCard = () => {
    const nextTitleElement = document.querySelector('.naechstes .title-card__title');
    if (nextTitleElement) {
        nextTitleElement.textContent = '';
        document.querySelector('.naechstes').classList.remove("visible")
        document.querySelector('.naechstes').classList.add("hidden")
    }
};

// Function to update the event start time in the '.aux-timers__value.start' element
const updateEventStartTime = (eventNow) => {
    const startTimeElement = document.querySelector('.aux-timers__value.start');
    if (startTimeElement && eventNow && eventNow.timeStart) {
        const startTime = new Date(eventNow.timeStart);
        const hours = String((startTime.getHours() - 4 + 24) % 24).padStart(2, '0');
        const minutes = String(startTime.getMinutes()).padStart(2, '0');
        const seconds = String(startTime.getSeconds()).padStart(2, '0');
        startTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
    } else if (startTimeElement) {
        startTimeElement.textContent = '';
    }
};

// Function to clear the event start time when no event is active
const clearEventStartTime = () => {
    const startTimeElement = document.querySelector('.aux-timers__value.start');
    if (startTimeElement) {
        startTimeElement.textContent = '';
    }
};

// Function to update the timer start time in the '.aux-timers__value.start' element
const updateTimerStartTime = (startedAt) => {
    const timerStartElement = document.querySelector('.aux-timers__value.start');
    if (timerStartElement && startedAt) {
        const startTime = new Date(startedAt);
        const hours = String((startTime.getHours() - 1 + 24) % 24).padStart(2, '0');
        const minutes = String(startTime.getMinutes()).padStart(2, '0');
        const seconds = String(startTime.getSeconds()).padStart(2, '0');
        timerStartElement.textContent = `${hours}:${minutes}:${seconds}`;
    } else if (timerStartElement) {
        timerStartElement.textContent = '';
    }
};

// Function to clear the timer start time when no timer is active
const clearTimerStartTime = () => {
    const timerStartElement = document.querySelector('.aux-timers__value.start');
    if (timerStartElement) {
        timerStartElement.textContent = '';
    }
};

// Function to update the timer expected finish time in the '.aux-timers__value.ende' element
const updateTimerExpectedFinish = (expectedFinish) => {
    const finishTimeElement = document.querySelector('.aux-timers__value.ende');
    if (finishTimeElement && expectedFinish) {
        const finishTime = new Date(expectedFinish);
        const hours = String((finishTime.getHours() - 1 + 24) % 24).padStart(2, '0');
        const minutes = String(finishTime.getMinutes()).padStart(2, '0');
        const seconds = String(finishTime.getSeconds()).padStart(2, '0');
        finishTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
    } else if (finishTimeElement) {
        finishTimeElement.textContent = '';
    }
};

// Function to clear the timer expected finish time when no timer is active
const clearTimerExpectedFinish = () => {
    const finishTimeElement = document.querySelector('.aux-timers__value.ende');
    if (finishTimeElement) {
        finishTimeElement.textContent = '';
    }
};

// Function to update the current timer value in the '.aux-timers__value.aktuell' element
const updateTimerCurrent = (current) => {
    const currentTimeElement = document.querySelector('.aux-timers__value.aktuell');
    if (currentTimeElement && current !== null) {
        const isNegative = current < 0;
        const absCurrent = Math.abs(current);
        const hours = Math.floor(absCurrent / (60 * 60 * 1000));
        const minutes = Math.floor((absCurrent % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((absCurrent % (60 * 1000)) / 1000);

        if (hours > 0) {
            currentTimeElement.textContent = `${isNegative ? '-' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        } else {
            currentTimeElement.textContent = `${isNegative ? '-' : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    } else if (currentTimeElement) {
        currentTimeElement.textContent = '';
    }
};

// Function to clear the current timer value when no timer is active
const clearTimerCurrent = () => {
    const currentTimeElement = document.querySelector('.aux-timers__value.aktuell');
    if (currentTimeElement) {
        currentTimeElement.textContent = '';
    }
};

// Function to update the progress bar width in the '.progress-bar__indicator' element
const updateProgressBar = (elapsed, duration) => {
    const progressBarElement = document.querySelector('.progress-bar__indicator');
    if (progressBarElement && duration > 0) {
        const percentage = Math.min((elapsed / duration) * 100, 100);
        progressBarElement.style.width = `${percentage}%`;
    }
};

// Function to clear the progress bar when no timer is active
const clearProgressBar = () => {
    const progressBarElement = document.querySelector('.progress-bar__indicator');
    if (progressBarElement) {
        progressBarElement.style.width = '0%';
    }
};

// Function to update the clock in the '.time' element
const updateClock = async () => {
    const response = await fetch(`/api/poll`);
    if (!response.ok) {
        throw new Error(`Failed to fetch current event: ${response.statusText}`);
    }
    const data = await response.json();
    const currentTimeMillis = data.payload.clock;
    const now = new Date(currentTimeMillis);
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    document.querySelector('.uhrzeit').textContent = `${hours}:${minutes}:${seconds}`;
};

// Function to make the title card blink green
const makeTitleCardBlinkGreen = () => {
    const titleCardElement = document.querySelector('.event.now');
    if (titleCardElement) {
        titleCardElement.classList.add('blink');
        setTimeout(() => {
            titleCardElement.classList.remove('blink');
        }, 2900); // Remove the blink effect after 3 seconds
    }
};

// Initialize WebSocket connection
connectWebSocket();