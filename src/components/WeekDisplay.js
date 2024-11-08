class WeekDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = this.getTemplate();
    this.currentDate = new Date();
    this.tasks = [];
    this.isResizing = false;
    this.isCreatingTask = false;
    this.currentDate = this.getMonday(new Date());
    this.interactiveNavbar();
  }

  // Helper function to get the Monday of the current week
  getMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(today.setDate(diff));
  }

  interactiveNavbar() {
    // Add event listeners aux boutons
    this.shadowRoot.querySelector('.prev-week-btn').
      addEventListener('click', () => this.changeWeek(-1));
    this.shadowRoot.querySelector('.today-btn').
      addEventListener('click', () => this.goToToday());
    this.shadowRoot.querySelector('.next-week-btn').
      addEventListener('click', () => this.changeWeek(1));
    this.shadowRoot.querySelector('#dark-mode-toggle').
      addEventListener('click', () => this.toggleDarkMode());
    this.shadowRoot.querySelector('.task-list-btn').
      addEventListener('click', () => this.showTaskList());

    // next week
    const handleRightBtn = (event) => {
      if (event.key === 'ArrowRight') { this.changeWeek(1); }
    };
    document.addEventListener('keydown', handleRightBtn);

    // last week
    const handleLeftBtn = (event) => {
      if (event.key === 'ArrowLeft') { this.changeWeek(-1); }
    };
    document.addEventListener('keydown', handleLeftBtn);

    // this week
    const handleDownBtn = (event) => {
      if (event.key === 'ArrowDown') { this.goToToday(); }
    };
    document.addEventListener('keydown', handleDownBtn);
  }

  showTaskList() {
    let darkModeOn;
    if (this.isDarkModeOn()) darkModeOn = "dark-mode";
    const modal = document.createElement('div');
    modal.classList.add('task-list-modal', `${darkModeOn}`);

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '<i class="fas fa-times"></i>';
    closeButton.classList.add('close-btn', `${darkModeOn}`);
    closeButton.addEventListener('click', () => {
      modal.remove();
      document.removeEventListener('keydown', handleEscapeKey);
    });

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscapeKey);
      }
    };

    // Add the keydown listener to close the modal when Escape is pressed
    document.addEventListener('keydown', handleEscapeKey);

    if (this.tasks.length === 0) {
      const noTasksMessage = document.createElement('div');
      noTasksMessage.classList.add("no-tasks-msg", `${darkModeOn}`);
      noTasksMessage.textContent = "No tasks created to display :(";
      modal.appendChild(noTasksMessage);
    } else {
      const taskList = document.createElement('ul');
      taskList.classList.add('task-list', `${darkModeOn}`);

      this.tasks.forEach(task => {
        const taskItem = document.createElement('li');
        taskItem.classList.add('task-item', `${darkModeOn}`);
        const taskTitle = document.createElement('strong');
        taskTitle.innerHTML = `<i class="fas fa-tasks"></i> 
          ${task.title}`;
        const taskDescription = document.createElement('p');
        taskDescription.innerHTML = `<i class="fas fa-align-left"></i> 
          ${task.description}`;
        const taskDate = document.createElement('p');
        taskDate.innerHTML = `<i class="fas fa-calendar-alt"></i> 
          ${task.date.toLocaleDateString()}`;
        const taskDuration = document.createElement('p');
        taskDuration.innerHTML = `<i class="fas fa-hourglass-half"></i> 
          ${this.convertMinutesToTime(task.duration)}`;

        taskItem.appendChild(taskTitle);
        if (task.description) taskItem.appendChild(taskDescription);
        taskItem.appendChild(taskDate);
        taskItem.appendChild(taskDuration);

        taskList.appendChild(taskItem);
      });
      modal.appendChild(taskList);
    }

    modal.appendChild(closeButton);
    this.shadowRoot.appendChild(modal);
  }

  renderTimeSlots() {
    const calendar = this.shadowRoot.querySelector('.calendar');
    const timeLabelCol = this.shadowRoot.querySelector('.time-label-col');

    const currentTimeSlots = calendar.querySelectorAll(".time-slot");
    currentTimeSlots.forEach(cts => cts.remove());

    const currentTimeLabels = timeLabelCol.querySelectorAll('.time-header');
    currentTimeLabels.forEach(ctl => ctl.remove());

    let darkModeOn;

    if (this.isDarkModeOn()) {
      darkModeOn = "dark-mode";
    }

    for (let hour = 0; hour < 24; hour++) {
      const timeLabel = document.createElement('div');
      timeLabel.classList.add('time-slot', 'time-header', `${darkModeOn}`);
      timeLabel.textContent = `${hour}:00`;
      timeLabelCol.appendChild(timeLabel);

      for (let day = 0; day < 7; day++) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add("time-slot");
        timeSlot.setAttribute('data-hour', hour);
        timeSlot.setAttribute('data-day', day);
        calendar.appendChild(timeSlot);
      }
    }
    // afficher mois milieu du nav bar
    const options = { year: 'numeric', month: 'long' };
    const formattedDate = this.currentDate.toLocaleDateString('en-US', options);
    const monthYearDisplay = this.shadowRoot.querySelector('.month-year-display');
    monthYearDisplay.textContent = formattedDate;
  }

  /*
   * active mode sombre
   * */
  toggleDarkMode() {
    const elementsToToggle = this.shadowRoot.querySelectorAll(
      `.container, .calendar, .day-header, .time-header, .empty, 
      .navbar, .header-row, .container-time-label, button, 
      .task, .remove-btn, .resize-handle, .title, .time, .description,
      .task-list-modal, .task-list, .task-item, .close-btn, .current-day`
    );
    elementsToToggle.forEach(el => el.classList.toggle("dark-mode"));
    this.renderTasks();
  }

  /*
   * permettent la navigation 
   * */
  changeWeek(direction) {
    this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
    this.updateCalendar();
  }
  goToToday() {
    this.currentDate = this.getMonday(new Date());
    this.updateCalendar();
  }
  updateCalendar() {
    this.renderTimeSlots();
    this.populateWeekDates();
    this.renderTasks();
  }
  connectedCallback() {
    this.renderTimeSlots();
    this.addCalendarListener();
    this.createAndResizeTask();
    this.populateWeekDates();
    this.renderTasks();
  }

  /*
   * teste si mode sombre est actif
   * */
  isDarkModeOn() {
    const nav = this.shadowRoot.querySelector('.navbar');
    if (nav.classList.contains("dark-mode")) return true;
    else return false;
  }

  /*
   * cree le grid du calendrier
   * */
  renderTimeSlots() {
    const calendar = this.shadowRoot.querySelector('.calendar');
    const timeLabelCol = this.shadowRoot.querySelector('.time-label-col');

    const currentTimeSlots = calendar.querySelectorAll(".time-slot");
    currentTimeSlots.forEach(cts => cts.remove());

    const currentTimeLabels = timeLabelCol.querySelectorAll('.time-header');
    currentTimeLabels.forEach(ctl => ctl.remove());

    let darkModeOn;

    if (this.isDarkModeOn()) {
      darkModeOn = "dark-mode";
    }

    for (let hour = 0; hour < 24; hour++) {
      const timeLabel = document.createElement('div');
      timeLabel.classList.add('time-slot', 'time-header', `${darkModeOn}`);
      timeLabel.textContent = `${hour}:00`;
      timeLabelCol.appendChild(timeLabel);

      for (let day = 0; day < 7; day++) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add("time-slot");
        timeSlot.setAttribute('data-hour', hour);
        timeSlot.setAttribute('data-day', day);
        calendar.appendChild(timeSlot);
      }
    }
    // afficher mois nav bar
    const options = { year: 'numeric', month: 'long' };
    const formattedDate = this.currentDate.toLocaleDateString('en-US', options);
    const monthYearDisplay = this.shadowRoot.querySelector('.month-year-display');
    monthYearDisplay.textContent = formattedDate;
  }


  populateWeekDates() {
    const headerRow = this.shadowRoot.querySelector(".header-row");
    const dayHeaders = headerRow.querySelectorAll(".day-header");

    // Find Monday of the current week based on this.currentDate
    const dayOfWeek = this.currentDate.getDay();
    const monday = new Date(this.currentDate);
    monday.setDate(this.currentDate.getDate() - ((dayOfWeek + 6) % 7));

    // Array of day names
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for accurate comparison

    // Populate each day header with the current date and day name
    dayHeaders.forEach((dayHeader, index) => {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + index); // Loop over days
      const dayNumber = currentDay.getDate();
      const dayName = dayNames[index]; // Get the name of the day from the array

      // Combine day name and date
      dayHeader.textContent = `${dayName} ${dayNumber}`;

      // Compare currentDay with today based on year, month, and day
      if (currentDay.getFullYear() === today.getFullYear() &&
        currentDay.getMonth() === today.getMonth() &&
        currentDay.getDate() === today.getDate()) {
        dayHeader.classList.add("current-day"); // Add special class for today
      } else {
        dayHeader.classList.remove("current-day"); // Remove the class if it's not today
      }
    });
  }

  // beautify numbers in day-headers
  beautifyNumbers(n) {
    const dateNumber = document.createElement("div");
    dateNumber.classList.add("day-number");
    dateNumber.textContent = n;
    return dateNumber;
  }

  renderTasks() {
    const calendar = this.shadowRoot.querySelector(".calendar");
    const calWidth = calendar.clientWidth;
    const calHeight = calendar.clientHeight;
    calendar.querySelectorAll(".task").forEach(taskEl => taskEl.remove());

    // Get the height of a single time slot
    const slotHeight = this.shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight;

    // Calculate the start of the current week (Monday) and the end of the week (next Monday)
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay() + 1); // Set to Monday
    startOfWeek.setHours(0, 0, 0, 0); // Clear time for accurate comparison

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7); // Set to next Monday

    const localTasks = this.loadTasksFromLocalStorage();

    const filteredTasks = localTasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate >= startOfWeek && taskDate < endOfWeek;
    });

    // Sort tasks by dayPosition and startTime
    filteredTasks.sort((a, b) => a.dayPosition - b.dayPosition || a.startTime - b.startTime);

    // Array to hold arrays of tasks that collide on the same day
    const collidingTasks = [];

    // Find colliding tasks
    filteredTasks.forEach(task => {
      let collisionFound = false;
      for (let i = 0; i < collidingTasks.length; i++) {
        const group = collidingTasks[i];
        // Check collision with all tasks in the group
        if (group[0].dayPosition === task.dayPosition &&
          group.some(t => (task.startTime < t.endTime && task.endTime > t.startTime))) {
          group.push(task);
          collisionFound = true;
          break;
        }
      }
      if (!collisionFound) {
        collidingTasks.push([task]);
      }
    });

    // Function to check if two tasks collide
    function isColliding(task1, task2) {
      return task1.startTime < task2.endTime && task1.endTime > task2.startTime;
    }

    // Render tasks
    collidingTasks.forEach(group => {
      group.sort((a, b) => a.startTime - b.startTime);

      // Initialize an array to track the column each task is assigned to
      const columns = [];

      group.forEach(task => {
        // Find the first available column where this task doesn't collide
        let columnIndex = 0;
        while (columnIndex < columns.length && columns[columnIndex].some(t => isColliding(t, task))) {
          columnIndex++;
        }

        // If no column is found, create a new one
        if (!columns[columnIndex]) {
          columns[columnIndex] = [];
        }

        // Assign the task to the found/created column
        columns[columnIndex].push(task);

        let darkModeOn;
        if (this.isDarkModeOn()) {
          darkModeOn = "dark-mode";
        }

        const taskEl = document.createElement("div");
        taskEl.classList.add("task", `${darkModeOn}`);
        taskEl.setAttribute("data-id", task.taskId);

        // Calculate task positions
        const left = (task.dayPosition * calWidth) / 7 + (columnIndex * calWidth) / (7 * columns.length);
        const top = Math.max(((task.startTime / 1440) * calHeight), 0);
        const width = calWidth / (7 * columns.length);

        taskEl.style.left = `${(left / calWidth) * 100}%`;
        taskEl.style.width = `${(width / calWidth) * 100}%`;
        taskEl.style.top = `${top}px`;

        const height = (task.duration / 60) * slotHeight;
        taskEl.style.height = `${height}px`;

        const title = document.createElement("div");
        title.classList.add('title', `${darkModeOn}`);
        title.textContent = task.title;
        taskEl.appendChild(title);

        const time = document.createElement("div");
        time.classList.add("time", `${darkModeOn}`);
        time.textContent = `${this.formatTime(task.startTime)} - ${this.formatTime(task.endTime)}`;
        taskEl.appendChild(time);

        const description = document.createElement("div");
        description.classList.add("description", `${darkModeOn}`);
        description.textContent = `${task.description}`;
        taskEl.appendChild(description);

        taskEl.addEventListener('click', (e) => {
          if (!e.target.classList.contains("resize-handle") &&
            !e.target.classList.contains("remove-btn")) {
            this.showTaskForm(task, taskEl);
          }
        });

        // Add resize handles to the task element
        this.addResizeHandles(taskEl);
        this.addRemoveButton(taskEl);
        this.dragAndDrop(taskEl, task);

        calendar.appendChild(taskEl);
      });
    });
  }

  addCalendarListener() {
    const calendar = this.shadowRoot.querySelector(".calendar");
    calendar.addEventListener("mousedown", (e) => {
      if (this.isResizing) {
        this.isResizing = false;
        e.stopPropagation();
        return;
      } else {
        const clickedElement = e.target;
        // Check if the clicked element is not a task, a resize handle, or within a task
        if (!clickedElement.classList.contains("task") &&
          !clickedElement.classList.contains("resize-handle") &&
          !clickedElement.closest(".task")) {
          // this.createTask(e);
          this.createAndResizeTask(e);
        }
      }
    });
  }

  // load tasks from local storage
  loadTasksFromLocalStorage() {
    const storedJSON = JSON.parse(localStorage.getItem("tasks")) || [];
    return storedJSON.map(obj =>
      new Task(obj._id, new Date(obj._date), obj._title, obj._startTime, obj._endTime)
    );
  }

  // save tasks to localStorage
  saveTasksToLocalStorage() {

    localStorage.setItem('tasks', JSON.stringify(this.tasks));  // Store tasks in localStorage as a JSON string
  }

  createAndResizeTask() {
    const calendar = this.shadowRoot.querySelector(".calendar");
    let isDrawing = false;
    let startX, startY;
    let currentTask = null;
    let currentElement = null;

    const onMouseMove = (e) => {
      if (!isDrawing) return;

      const totalMinutesDay = 1440;
      const minMinutes = 15;
      const minHeight = (minMinutes / totalMinutesDay) * calendar.offsetHeight;

      const currentY = this.calculatePosition(e, "resize").y;
      let newHeight, newTop;
      if (currentY >= startY) {
        newHeight = Math.max(currentY - startY, minHeight);
        newTop = startY;
      } else {
        newHeight = Math.max(startY - currentY, minHeight);
        newTop = startY - newHeight;
      }

      currentElement.style.height = `${newHeight}px`;
      currentElement.style.top = `${newTop}px`;

      const task = this.tasks.find(task => task.taskId == currentElement.getAttribute("data-id"));
      if (task) {
        const newStartTime = Math.floor((newTop / calendar.offsetHeight) * totalMinutesDay);
        const newEndTime = newStartTime + Math.floor((newHeight / calendar.offsetHeight) * totalMinutesDay);

        task.startTime = Math.max(newStartTime, 0);
        task.endTime = Math.min(newEndTime, totalMinutesDay);
        if (task.endTime - task.startTime < minMinutes) {
          task.endTime = task.startTime + minMinutes;
        }
      }
      this.saveTasksToLocalStorage();
    };

    const onMouseUp = () => {
      if (!isDrawing) return;

      isDrawing = false;
      this.isCreatingTask = false;
      this.renderTasks();

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      this.showTaskForm(currentTask, currentElement);
      this.saveTasksToLocalStorage();
    };

    const onMouseDown = (e) => {
      e.preventDefault();
      if (this.isCreatingTask || this.isResizing) return;

      const clickedTask = e.target.closest(".task");
      if (!clickedTask && !e.target.classList.contains("resize-handle") && !e.target.classList.contains("remove-btn")) {
        this.isCreatingTask = true;
        isDrawing = true;

        const { x, y, dayIndex } = this.calculatePosition(e, "create");
        const calendar = this.shadowRoot.querySelector(".calendar");
        const today = new Date();
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
        const taskDate = new Date(this.currentDate);
        taskDate.setDate(this.currentDate.getDate() + dayIndex);

        const slotHeight = this.getSlotDimensions().height;
        const topProp = Math.round(y / slotHeight) * slotHeight;
        const totalMinutesDay = 1440;
        const startTime = Math.floor((topProp / calendar.clientHeight) * totalMinutesDay);
        const endTime = startTime + 60;
        const taskId = Date.now() + Math.random();
        const description = "(untitled task)";

        const task = new Task(taskId, taskDate, description, startTime, endTime);
        this.tasks.push(task);

        let darkModeOn;
        if (this.isDarkModeOn()) darkModeOn = "dark-mode";

        const taskEl = document.createElement("div");
        taskEl.classList.add("task", `${darkModeOn}`);
        taskEl.setAttribute("data-id", task.taskId);

        const calWidth = calendar.clientWidth;
        const calHeight = calendar.clientHeight;

        const left = (dayIndex * calWidth) / 7;
        const top = (startTime / totalMinutesDay) * calHeight;
        const width = calWidth / 7;

        taskEl.style.left = `${(left / calWidth) * 100}%`;
        taskEl.style.width = `${(width / calWidth) * 100}%`;
        taskEl.style.top = `${top}px`;
        const height = (endTime - startTime) / 60 * slotHeight;
        taskEl.style.height = `${height}px`;

        const title = document.createElement("div");
        title.classList.add('title', `${darkModeOn}`);
        title.textContent = task.title;
        taskEl.appendChild(title);

        const time = document.createElement("div");
        time.classList.add("time", `${darkModeOn}`);
        time.textContent =
          `${this.formatTime(task.startTime)} - ${this.formatTime(task.endTime)}`;
        taskEl.appendChild(time);

        this.addResizeHandles(taskEl);
        this.addRemoveButton(taskEl);
        this.dragAndDrop(taskEl, task);

        taskEl.addEventListener('click', (e) => {
          if (!e.target.classList.contains("resize-handle") &&
            !e.target.classList.contains("remove-btn") &&
            !taskEl.classList.contains('dragging')) {
            this.showTaskForm(task, taskEl);
          }
        });

        calendar.appendChild(taskEl);

        currentTask = task;
        currentElement = taskEl;

        startX = x;
        startY = y;

        calendar.addEventListener('mousemove', onMouseMove);
        calendar.addEventListener('mouseup', onMouseUp);

        this.saveTasksToLocalStorage();
      }
    };

    calendar.addEventListener('mousedown', onMouseDown);
  }

  showTaskForm(task) {
    if (this.isDragging) { return; }

    // Create the overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay'; // Apply overlay class

    let darkModeOn;
    if (this.isDarkModeOn()) darkModeOn = "dark-mode";

    // Create the form
    const form = document.createElement('form');
    form.classList.add("form", `${darkModeOn}`);
    form.innerHTML = `
  <label>Date: <input type="date" name="date" value="${this.formatDate(task.date)}" required></label>
  <label>Title: <input type="text" name="title" value="${task.title}" required></label>
  <label>Start Time: <input type="time" name="startTime" value="${this.convertMinutesToTime(task.startTime)}" required></label>
  <label>End Time: <input type="time" name="endTime" value="${this.convertMinutesToTime(task.endTime)}" required></label>
  <div class="duration-display"></div>
  <label>Description: <textarea name="description" rows="6" cols="60">${task.description}</textarea></label>
  <label>Description: <textarea name="description" rows="6" cols="60">${task.description}</textarea></label>
  <button type="submit">Save</button>
  <div class="error-message"></div>
    `;

    // Focus on the submit button
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.focus();

    // Function to update the duration display
    const updateTimeDisplay = () => {
      const startTimeInput = form.querySelector('input[name="startTime"]');
      const endTimeInput = form.querySelector('input[name="endTime"]');
      const durationDisplay = form.querySelector('.duration-display');

      const startTime = this.convertTimeToMinutes(startTimeInput.value);
      let endTime = this.convertTimeToMinutes(endTimeInput.value);

      // If endTime is null or empty, set it to 1440 minutes (24:00)
      if (!endTimeInput.value) {
        endTime = 1440;
      }

      // Calculate duration
      const duration = endTime - startTime;

      // Update duration display
      durationDisplay.textContent = duration > 0
        ? `Duration: ${Math.floor(duration / 60)} hours ${duration % 60} minutes`
        : 'Duration: 0 hours 0 minutes';
    };

    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const date = formData.get('date');
      const title = formData.get('title');
      const startTime = this.convertTimeToMinutes(formData.get('startTime'));
      let endTime = this.convertTimeToMinutes(formData.get('endTime'));
      const errorMessageElement = form.querySelector('.error-message');

      // Clear previous error message
      errorMessageElement.style.display = 'none';
      errorMessageElement.textContent = '';

      // Validation checks
      const selectedDate = new Date(date);
      if (isNaN(selectedDate.getTime())) {
        errorMessageElement.textContent = 'Please select a valid date.';
        errorMessageElement.style.display = 'block';
        return;
      }

      if (startTime < 0 || startTime > 1440) {
        errorMessageElement.textContent = 'Start time must be between 00:00 and 24:00.';
        errorMessageElement.style.display = 'block';
        return;
      }
      if (endTime < 0 || endTime > 1440) {
        errorMessageElement.textContent = 'End time must be between 00:00 and 24:00.';
        errorMessageElement.style.display = 'block';
        return;
      }
      if (endTime <= startTime) {
        errorMessageElement.textContent = 'End time must be greater than start time.';
        errorMessageElement.style.display = 'block';
        return;
      }

      // Update task only if all validations pass
      task.title = title;
      task.date = selectedDate; // Use the selected date
      task.description = formData.get('description');
      task.startTime = startTime;
      task.endTime = endTime;

      overlay.remove(); // Remove the overlay
      this.renderTasks(); // Re-render tasks
    });

    // Close the form on Escape key press
    const closeForm = (e) => {
      if (e.key === 'Escape') {
        overlay.remove(); // Remove the overlay
        document.removeEventListener('keydown', closeForm); // Clean up the event listener
      }
    };

    // Add event listener for Escape key
    document.addEventListener('keydown', closeForm);

    // Append the form to the overlay
    overlay.appendChild(form);

    // Append the overlay to the shadow root
    this.shadowRoot.appendChild(overlay);

    // Initial update of the time display and duration
    updateTimeDisplay();
  }

  // Helper function to format the date to 'YYYY-MM-DD'
  formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Helper method to convert minutes to time format (HH:MM)
  convertMinutesToTime(minutes) {
    const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
    const mins = String(minutes % 60).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  // Helper method to convert time format (HH:MM) to minutes
  convertTimeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;
  }

  dragAndDrop(taskEl, task) {
    const calendar = this.shadowRoot.querySelector(".calendar");
    const dragThreshold = 5;
    let startX, startY, offsetX, offsetY;
    let isDragging = false;
    let mouseDownTime;
    let taskObj;

    const onMouseMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDragging && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
        isDragging = true;
        taskEl.classList.add('dragging');
      }

      if (isDragging) {
        const { x, y } = this.calculatePosition(e, "drag");
        taskEl.style.left = `${x - offsetX}px`;
        taskEl.style.top = `${y - offsetY}px`;

      }
    };

    const onMouseUp = (e) => {
      const mouseUpTime = Date.now();
      const clickDuration = mouseUpTime - mouseDownTime;

      if (clickDuration < 50) {
        // Short click - do nothing
      } else if (isDragging) {
        const rect = taskEl.getBoundingClientRect();
        const calendarRect = calendar.getBoundingClientRect();

        // Ensure the task is within the bounds of the calendar
        if (rect.top < calendarRect.top) {
          taskEl.style.top = `0px`;
        }

        if (rect.left < calendarRect.left || rect.left < 0) {
          taskEl.style.left = '0px';
        } else if (rect.right > calendarRect.right) {
          taskEl.style.left = `${calendar.clientWidth - taskEl.offsetWidth}px`;
        }

        // Calculate the correct top property relative to the calendar
        let taskTop = taskEl.getBoundingClientRect().top - calendarRect.top;
        let startTime = Math.max(Math.floor((taskTop / calendar.clientHeight) * 1440), 0);
        startTime = Math.round(startTime / 15) * 15;

        // Ensure startTime is not negative
        if (startTime < 0) {
          startTime = 0;
        }

        const dayWidth = calendar.clientWidth / 7;
        let clientX = e.clientX;

        // Adjust clientX to prevent exceeding calendar boundaries
        if (clientX < 70) {
          clientX = 70;
        } else if (clientX > calendar.clientWidth) {
          clientX = calendar.clientWidth;
        }

        // Calculate the index of the day based on the current week's Monday
        const dayIndex = Math.floor((clientX - calendarRect.left) / dayWidth);

        // Calculate the new date based on the current week's Monday
        const newDate = new Date(this.currentDate);
        newDate.setDate(this.currentDate.getDate() + dayIndex);

        // Adjust startTime to ensure the task's endTime is within the day
        let endTime = startTime + task.duration;
        if (endTime > 1440) { // 1440 minutes = 24 hours
          endTime = 1440;
          startTime = endTime - task.duration;
        }

        taskObj.date = newDate;
        taskObj.startTime = startTime;
        taskObj.endTime = endTime;

        // Update taskEl's top position
        taskTop = (startTime / 1440) * calendar.clientHeight;
        taskEl.style.top = `${taskTop}px`;

        this.saveTasksToLocalStorage();
        this.renderTasks();
      }

      taskEl.classList.remove('dragging');
      isDragging = false;

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    const onMouseDown = (e) => {
      const taskId = e.target.getAttribute("data-id");
      this.tasks = this.loadTasksFromLocalStorage();
      taskObj = this.tasks.find(t => t.taskId == taskId);
      startX = e.clientX;
      startY = e.clientY;

      const taskRect = taskEl.getBoundingClientRect();
      offsetX = e.clientX - taskRect.left;
      offsetY = e.clientY - taskRect.top;

      mouseDownTime = Date.now();

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    taskEl.addEventListener('mousedown', onMouseDown);
  }

  // Calculates position within the calendar grid
  calculatePosition(e, context) {
    const calendar = this.shadowRoot.querySelector(".calendar");
    const rect = calendar.getBoundingClientRect();

    // Ensure each day occupies an exact portion of calendar width (7-day week)
    const dayWidth = calendar.clientWidth / 7;
    const { height } = this.getSlotDimensions();

    const dayIndex = Math.floor((e.clientX - rect.left) / dayWidth); // Day column
    const a = (calendar.clientHeight / 1440) * 15; // 

    let slotIndex, x, y;
    x = slotIndex = e.clientX - rect.left; // Time row

    if (context === "resize") {
      slotIndex = e.clientY - rect.top; // Time col 
      y = Math.floor(slotIndex / a) * a;
      if (y >= calendar.clientHeight) {
        y = calendar.clientHeight;
      } else if (y < 0) {
        y = 0;
      }
    } else if (context === "create") {
      slotIndex = Math.floor((e.clientY - rect.top) / height);
      y = slotIndex * height;
    } else if (context === "drag") {
      x = e.clientX - rect.left; // Time col 
      y = e.clientY - rect.top; // Time row
    }
    return { x, y, dayIndex };
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  addRemoveButton(taskEl) {
    const removeBtn = document.createElement("div");
    let darkModeOn;
    if (this.isDarkModeOn()) darkModeOn = "dark-mode";
    removeBtn.classList.add("remove-btn", `${darkModeOn}`);
    removeBtn.textContent = "✕";

    removeBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      taskEl.classList.add("collapsing");

      taskEl.addEventListener('transitionend', () => {
        const taskId = taskEl.getAttribute("data-id");

        this.tasks = this.tasks.filter(task => task.taskId != taskId);
        this.saveTasksToLocalStorage();
        this.renderTasks();
      }, { once: true });
    });

    taskEl.appendChild(removeBtn);
  }

  addResizeHandles(taskEl) {
    const topHandle = document.createElement("div");
    const bottomHandle = document.createElement("div");

    let darkModeOn;
    if (this.isDarkModeOn()) darkModeOn = "dark-mode";

    topHandle.classList.add("resize-handle", "top-handle", `${darkModeOn}`);
    bottomHandle.classList.add("resize-handle", "bottom-handle", `${darkModeOn}`);

    topHandle.addEventListener("mousedown", (e) =>
      this.resize(e, 'top', taskEl)
    );
    bottomHandle.addEventListener("mousedown", (e) =>
      this.resize(e, 'bottom', taskEl)
    );

    taskEl.appendChild(topHandle);
    taskEl.appendChild(bottomHandle);
  }

  resize(e) {
    e.preventDefault();
    e.stopPropagation();
    this.isResizing = true;
    const direction = e.target.classList.contains("top-handle") ? "top" : "bottom";
    const taskEl = e.target.parentElement;
    const taskId = taskEl.getAttribute("data-id");
    this.tasks = this.loadTasksFromLocalStorage();
    const taskObj = this.tasks.find(t => t.taskId == taskId);
    const slotHeight = this.
      shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight;
    const minTaskHeight = this.
      shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight / 4;
    const calHeight = this.shadowRoot.querySelector(".calendar").clientHeight;

    let initY = this.calculatePosition(e, "resize").y;
    let initialHeight = taskEl.offsetHeight;
    let initialTop = taskEl.offsetTop;
    let initialStartTime = taskObj.startTime;
    let initialEndTime = taskObj.endTime;

    // Event listener for mousemove to update the height
    const onMouseMove = (moveEvent) => {
      let currentY = this.calculatePosition(moveEvent, "resize").y;
      const heightChange = currentY - initY;
      let newHeight = initialHeight + heightChange;

      if (direction === "top") {
        newHeight = initialHeight - heightChange;
        let newTop = initialTop + heightChange;
        // Ensure minimum height
        if (newHeight < minTaskHeight) {
          newHeight = minTaskHeight;
          newTop = initialTop + (initialHeight - minTaskHeight);
        }
        taskEl.style.top = `${newTop}px`;

        // Calculate new start time based on the top handle movement
        taskObj.startTime = initialStartTime + (heightChange / slotHeight) * 60;

      } else if (direction == "bottom") {
        if (newHeight < minTaskHeight) {
          newHeight = minTaskHeight;
        } else if (currentY >= calHeight) {
          currentY = calHeight;
        }
        // Calculate new end time based on the bottom handle movement
        taskObj.endTime = initialEndTime + (heightChange / slotHeight) * 60;
      }
      taskEl.style.height = `${newHeight}px`;
      this.saveTasksToLocalStorage();
    };

    // Event listener for mouseup to stop resizing
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (taskObj.endTime > 1440) taskObj.endTime = 1440;

      this.saveTasksToLocalStorage();
      this.renderTasks();
    };

    // Add event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }


  // Gets the dimensions for a single slot in the calendar
  getSlotDimensions() {
    const slot = this.shadowRoot.
      querySelector(".time-slot:not(.time-header)");
    return {
      width: slot.clientWidth,
      height: slot.clientHeight,
    };
  }


  initParametersButton() {
    const parametersContainer = this.shadowRoot.querySelector('.parameters-container');
    const parametersWindow = document.createElement('div');
    parametersWindow.classList.add('parameters-window');
    parametersWindow.innerHTML = `
    `;
    parametersContainer.appendChild(parametersWindow);

    // Add event listeners
    const parametersBtn = this.shadowRoot.querySelector('.parameters-btn');

    parametersBtn.addEventListener('mouseover', () => {
      parametersWindow.style.display = 'block';
    });

    parametersBtn.addEventListener('mouseout', () => {
      parametersWindow.style.display = 'none';
    });

    parametersWindow.addEventListener('mouseover', () => {
      parametersWindow.style.display = 'block';
    });

    parametersWindow.addEventListener('mouseout', () => {
      parametersWindow.style.display = 'none';
    });
  }




  getTemplate() {
    return `

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
<style>
:host {
  display: block;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  margin: 0;
  --time-slot-width: calc(100% / 7);
  --task-width: 10px;
}

* {
  box-sizing: border-box;
}

.container {
  width: 100vw;
  height: 100vh;
  background-color: #99ccff;
  padding: 20px;
}

.header-row {
  display: grid;
  grid-template-columns: 50px repeat(7, 1fr);
}

.day-header,
.time-header {
  background-color: #4a90e2;
  color: #ffffff;
  z-index: 1;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: -1px;
  border-right: 1px solid #e0e0e0;
  margin-right: -1px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}

.day-header {
  font-size: 16px;
  font-weight: bold;
  height: 50px;
}

.day-header .day-number {
  color: #ffffff;
  border-radius: 40%;
  padding: 2px 2px;
  margin-bottom: 2px;
}

.current-day {
  background-color: #FFDD57; 
  color: #000;
}

.container-time-label {
  display: grid;
  grid-template-columns: 50px calc(100% - 50px);
  max-height: 80vh;
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-width: none;
}

                                      /* CALENDAR LAYOUT */
.calendar {
  display: grid;
  grid-template-columns: repeat(7, var(--time-slot-width));
  grid-template-rows: repeat(24, 1fr);
  position: relative;
  background-color: #ffffff;
}

.empty {
  background-color: #99ccff;
}

.time-header {
  font-size: 12px;
  height: 50px; 
} 

.time-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: -1px;
  border-right: 1px solid #e0e0e0;
  margin-right: -1px;
  height: 40px;
  position: relative;
}

                                /* TASK ELEMENT LAYOUT */
.task {
  position: absolute;
  background-color: #FFDD57;
  border-radius: 4px;
  text-align: center;
  z-index: 2;
  width: var(--time-slot-width);
  box-sizing: border-box; 
  border: 1px solid #e0e0e0;
  overflow: hidden; 
  padding: 2px; 
}

.title {
  font-size: 12px; 
  left: 10px;
  color: #333; 
  text-align: left;
}

.time {
  font-size: 10px; 
  left: 10px;
  top: 15px;
  color: #333; 
  text-align: left;
}

.description {
  font-size: 10px; 
  left: 10px;
  top: 15px;
  color: #333; 
  text-align: left;
  margin-top: 5px;
  padding: 8px;
}

.task:hover{
  cursor: grab;
}

.task.dragging {
  opacity: 0.6;
  transition: transform 0.2s ease, opacity 0.2s ease;
  z-index: 1000;
  cursor: grabbing;
}

.task {
  transition: transform 0.5s ease-out, opacity 0.2s ease-out;
  opacity: 1;
  transform: translateY(0);
}

.task.collapsing {
  opacity: 0;
}

                              /* REMOVE BUTTON STYLES */
.remove-btn {
  position: absolute;
  width: 18px;
  height: 18px;
  top: 5px;
  right: 5px;
  cursor: pointer;
  padding: 2px;
  background-color: #e63946;
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

                        /* RESIZE HANDLE STYLES */
.resize-handle {
  position: absolute;
  width: var(--task-width);
  height: var(--task-width);
  border-radius: 50%;
  border: solid black;
  background-color: black;
}

.resize-handle:hover {
  cursor: ns-resize;
}

.top-handle {
  top: calc(0% - ( var(--task-width) / 2));
  left: calc(50% - (var(--task-width) / 2));
}

.bottom-handle {
  top: calc(100% - (var(--task-width) / 2));
  left: calc(50% - (var(--task-width)/ 2));
}

                    /* RESIZE HANDLE && REMOVE BTN */
.remove-btn, .resize-handle {
  transform: scale(0);
  transition: transform 0.2s ease-in-out; 
}

.task:hover .resize-handle,
.task:hover .remove-btn {
  transform: scale(1);
}

.task.dragging .resize-handle,
.task.dragging .remove-btn {
  display: none;
}

                    /* FORM STYLES */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.form {
  background: #fff;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form label {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.form input[type="text"],
.form input[type="date"],
.form input[type="time"],
.form textarea {
  font-size: 14px;
  padding: 8px;
  margin-top: 5px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%;
  box-sizing: border-box;
}

.form textarea {
  resize: vertical;
  height: auto; 
}

.form button[type="submit"] {
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 14px;
  cursor: pointer;
  align-self: flex-end;
  transition: background-color 0.3s ease;
}

.form button[type="submit"]:hover {
  background-color: #0056b3;
}

.form .error-message {
  color: red;
  font-size: 12px;
  display: none; 
}

.form .duration-display {
  font-size: 12px;
  color: #666;
}

                            /* NAVIGATION BAR */
.navbar {
  display: flex;
  justify-content: space-between; 
  align-items: center;
  background-color: #4a90e2; 
  color: #ffffff;
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.navbar button {
  background-color: #ffffff; 
  color: #4a90e2;
  border: none;
  padding: 5px 10px; 
  border-radius: 4px;
  cursor: pointer; 
  font-size: 14px;
  transition: background-color 0.3s ease; 
}

.navbar button:hover {
  background-color: #e0e0e0;
}

.navbar .today-btn {
font-weight: bold;
}

.month-year-display {
  margin: 0 15px; 
  font-weight: bold;
  font-size: 1.2em;
  color: #ffffff;
  text-align: center; 
  flex: 1;
}

.navbar {
  justify-content: center; 
}

.navbar .month-year-display {
  margin: 0 30px;
}

.navbar > button {
  margin: 0 10px;
}

.accentuated {
  text-decoration: underline;
  color: #e0e0e0;
  font-weight: bold; 
}

                              /* PARAMS BUTTON NAVIGATION BAR */

                          /* DARK MODE TOGGLE SWITCH */
.switch { 
  position: relative;
  display: inline-block;
  width: 40px;  
  height: 20px; 
  margin-left: 10px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #FFDD57;
  transition: .4s;
  border-radius: 20px; 
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px; 
  left: 2px;    
  bottom: 2px;   
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #6200ea !important;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

                        /*  MODAL D'AFFICHAGE DES TASKS */
.task-list-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7); 
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10;
  backdrop-filter: blur(5px);
}

.task-list {
  background-color: #ffffff; 
  padding: 30px;
  border-radius: 12px;
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: fadeIn 0.3s ease;
  list-style: none;
}

.task-item {
  margin-bottom: 20px;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 10px;

}

.task-item:last-child {
  border-bottom: none;
}

.close-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: #ff4d4d;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.close-btn:hover {
  background-color: #ff1a1a;
}

.no-tasks-msg {
  background-color: #fff3cd; /* Soft yellow background */
  color: #856404; /* Dark yellow text */
  padding: 20px;
  border: 1px solid #ffeeba; /* Light yellow border */
  border-radius: 8px;
  text-align: center; 
  font-size: 18px;
  margin: 20px 0;
}

/* Animation for modal appearance */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

                            /* DARK MODE STYLES */
.dark-mode {
  background-color: #121212;
/*  color: #e0e0e0; */
}

.container.dark-mode {
  background-color: Black;
}

.navbar.dark-mode {
  background-color: #1f1f1f;
}

.header-row.dark-mode, 
.container-time-label.dark-mode {
  background-color: #1f1f1f;
}

.day-header.dark-mode {
  background-color: #1f1f1f;
}

.time-header.dark-mode {
  background-color: #1f1f1f;
}

.calendar.dark-mode {
  background-color: #1a1a1a;
}

.empty.dark-mode {
  background-color: Black;
}

button.dark-mode {
  background-color: #333;
  color: #e0e0e0;
}

button.dark-mode:hover {
  background-color: #444;
}

.switch input:checked + .slider {
  background-color: #444;
}

button.accentuated.dark-mode {
  background-color: #444;
  color: #fff;
}

.title.dark-mode,
.time.dark-mode,
.description.dark-mode {
  color: White !important;
}

.remove-btn.dark-mode {
   
}

.resize-handle.dark-mode {
  background-color: White;
  border: solid White;
}

.form.dark-mode {
  background-color: #1c1c1c;
  color: #e0e0e0;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.form.dark-mode input,
.form.dark-mode textarea {
  background-color: #333;
  color: #e0e0e0;
  border: 1px solid #444;
  padding: 10px;
  border-radius: 4px;
  width: 100%;
}

.form.dark-mode button {
  background-color: #6200ea;
  color: #fff;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.form.dark-mode button:hover {
  background-color: #3700b3;
}

.form.dark-mode .error-message {
  color: #ff5722;
  margin-top: 10px;
}

.task-list-modal.dark-mode{
  background-color: rgba(18, 18, 18, 0.9);
}

.task-list.dark-mode {
  background-color: #1e1e1e;
  padding: 30px;
  border-radius: 12px; 
  max-height: 80%;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); 
}

.task-item.dark-mode{
  margin-bottom: 20px;
  background-color: #2a2a2a; 
  color: #e0e0e0;
  padding: 10px;
  border-radius: 6px; 
}

.task-item:last-child.dark-mode{
  border-bottom: none;
}

.close-btn.dark-mode {
  background-color: #ff4d4d; 
  color: #ffffff;
  border: none;
  border-radius: 5px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.close-btn:hover.dark-mode {
  background-color: #ff1a1a;
}

.no-tasks-msg.dark-mode {
  background-color: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #444; 
}

.current-day.dark-mode {
  background-color: #6200ea;
  color: #e0e0e0;
}

</style>

    
<div class="container">

  <div class="navbar">
    <button class="prev-week-btn"><i class="fas fa-arrow-left"></i></button>
    <button class="next-week-btn"><i class="fas fa-arrow-right"></i></button>
    <button class="today-btn"><i class="fas fa-calendar-day"></i></button>

    <div class="month-year-display accentuated"></div>

    <button class="task-list-btn"><i class="fas fa-list"></i></button>

    <div class="parameters-container">
      <button class="parameters-btn">
        <i class="fas fa-cogs"></i>
        <span class="badge"></span>
      </button>
    </div>

    <button class="control-panel-btn"><i class="fas fa-tasks"></i></button>

    <label class="switch">
      <input type="checkbox" id="dark-mode-toggle">
      <span class="slider"></span>
    </label>
  </div>

  <div class="header-row">
    <div class="empty"></div>
    <div class="day-header accentuated">Mon</div>
    <div class="day-header">Tue</div>
    <div class="day-header">Wed</div>
    <div class="day-header">Thu</div>
    <div class="day-header">Fri</div>
    <div class="day-header">Sat</div>
    <div class="day-header">Sun</div>
  </div>

  <div class="container-time-label">
    <div class="time-label-col"></div>
    <div class="calendar"></div>
  </div>
</div>
    `;
  }
}

customElements.define("week-calendar", WeekDisplay);
