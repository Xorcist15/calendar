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
    // Add event listeners
    this.shadowRoot.querySelector('.prev-week-btn').addEventListener('click', () => this.changeWeek(-1));
    this.shadowRoot.querySelector('.today-btn').addEventListener('click', () => this.goToToday());
    this.shadowRoot.querySelector('.next-week-btn').addEventListener('click', () => this.changeWeek(1));
  }

  getMonday(date) {
    const day = date.getDay(); // Get current day (0-6, Sunday-Saturday)
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust if today is Sunday
    return new Date(date.setDate(diff)); // Set the date to Monday
  }

  changeWeek(direction) {
    this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
    this.updateCalendar();
  }

  goToToday() {
    this.currentDate = new Date();
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
  }

  // create calendar grid
  renderTimeSlots() {
    const calendar = this.shadowRoot.querySelector('.calendar');
    const timeLabelCol = this.shadowRoot.querySelector('.time-label-col');

    // Clear existing time slots before populating new ones
    const currentTimeSlots = calendar.querySelectorAll(".time-slot");
    currentTimeSlots.forEach(cts => cts.remove());

    // Clear existing time labels before adding new ones
    const currentTimeLabels = timeLabelCol.querySelectorAll('.time-header');
    currentTimeLabels.forEach(ctl => ctl.remove());

    for (let hour = 0; hour < 24; hour++) {
      // Create and add time labels
      const timeLabel = document.createElement('div');
      timeLabel.classList.add('time-slot', 'time-header');
      timeLabel.textContent = `${hour}:00`;
      timeLabelCol.appendChild(timeLabel);

      // Create and add time slots for each day
      for (let day = 0; day < 7; day++) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add("time-slot");
        timeSlot.setAttribute('data-hour', hour);
        timeSlot.setAttribute('data-day', day);
        calendar.appendChild(timeSlot);
      }
    }
    // Get the month and year
    const options = { year: 'numeric', month: 'long' }; // Format options
    const formattedDate = this.currentDate.toLocaleDateString('en-US', options);
    const monthYearDisplay = this.shadowRoot.querySelector('.month-year-display');
    monthYearDisplay.textContent = formattedDate;

  }


  // put numbers inside day-headers
  populateWeekDates() {
    const headerRow = this.shadowRoot.querySelector(".header-row");
    const dayHeaders = headerRow.querySelectorAll(".day-header");

    // Find Monday of the current week based on this.currentDate
    const dayOfWeek = this.currentDate.getDay();
    const monday = new Date(this.currentDate);
    monday.setDate(this.currentDate.getDate() - ((dayOfWeek + 6) % 7));

    // Array of day names
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Populate each day header with the current date and day name
    dayHeaders.forEach((dayHeader, index) => {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + index); // Loop over days
      const dayNumber = currentDay.getDate();
      const dayName = dayNames[index]; // Get the name of the day from the array

      // Combine day name and date
      dayHeader.textContent = `${dayName} ${dayNumber}`;
    });
  }




  // beautify numbers in day-headers
  beautifyNumbers(n) {
    const dateNumber = document.createElement("div");
    dateNumber.classList.add("day-number");
    dateNumber.textContent = n;
    return dateNumber;
  }
  // Creates a new task based on click position on calendar
  createTask(e) {
    const { y, dayIndex } = this.calculatePosition(e, "create");
    const calendar = this.shadowRoot.querySelector(".calendar");
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    const taskDate = new Date(monday);
    taskDate.setDate(monday.getDate() + dayIndex);

    const slotHeight = this.getSlotDimensions().height;
    const topProp = Math.round(y / slotHeight) * slotHeight;
    const totalMinutesDay = 1440;
    const startTime = Math.floor((topProp / calendar.clientHeight) * totalMinutesDay);
    const endTime = startTime + 60;
    const descrip = "This a task";
    const taskId = Date.now() + Math.random();

    const task = new Task(taskId, taskDate, descrip, startTime, endTime);
    this.tasks.push(task);
    this.renderTasks();
    return task;
  }

  renderTasks() {
    const calendar = this.shadowRoot.querySelector(".calendar");
    const calWidth = calendar.clientWidth;
    const calHeight = calendar.clientHeight;
    calendar.querySelectorAll(".task").forEach(taskEl => taskEl.remove());
    const slotHeight = this.shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight;

    // Sort tasks by dayPosition and startTime
    const startOfWeek = new Date(this.currentDate);
    startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay() + 1); // Get the Monday of the current week

    // Filter tasks that belong to the current week
    const filteredTasks = this.tasks.filter(task => {
      const taskDate = new Date(task.date);
      return taskDate >= startOfWeek && taskDate < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000); // Next Monday
    });

    // Sort filtered tasks by dayPosition and startTime
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

        const taskEl = document.createElement("div");
        taskEl.classList.add("task");
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

        taskEl.textContent = task.title;

        taskEl.addEventListener('click', (e) => {
          if (!e.target.classList.contains("resize-handle") &&
            !e.target.classList.contains("remove-btn")) {
            this.showTaskForm(task, taskEl);
          }
        });

        // Add resize handles to the task element
        this.addResizeHandles(taskEl);
        this.addRemoveButton(taskEl);
        this.addStartEndTimes(taskEl, task);
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

      // Calculate current mouse position relative to the calendar
      const currentY = this.calculatePosition(e, "resize").y;

      // Calculate new height and top position for the task element
      let newHeight, newTop;
      if (currentY >= startY) {
        // Resizing downwards
        newHeight = Math.max(currentY - startY, minHeight);
        newTop = startY;
      } else {
        // Resizing upwards
        newHeight = Math.max(startY - currentY, minHeight);
        newTop = startY - newHeight;  // Adjust top position when resizing upwards
      }
      currentElement.style.height = `${newHeight}px`;
      currentElement.style.top = `${newTop}px`;

      // Update task times based on new height and top position
      const task = this.tasks.find(task => task.taskId == currentElement.getAttribute("data-id"));
      if (task) {
        // Calculate new start time based on new top position
        const newStartTime = Math.floor((newTop / calendar.offsetHeight) * totalMinutesDay);
        // Calculate new end time based on new height
        const newEndTime = newStartTime + Math.floor((newHeight / calendar.offsetHeight) * totalMinutesDay);

        // Ensure the times do not exceed the day's total minutes and respect minimum duration
        task.startTime = Math.max(newStartTime, 0);
        task.endTime = Math.min(newEndTime, totalMinutesDay);
        if (task.endTime - task.startTime < minMinutes) {
          task.endTime = task.startTime + minMinutes;
        }
      }
    };

    const onMouseUp = () => {
      if (!isDrawing) return;

      isDrawing = false;
      this.isCreatingTask = false;
      this.renderTasks();

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      this.showTaskForm(currentTask, currentElement);
    };

    const onMouseDown = (e) => {
      e.preventDefault();
      if (this.isCreatingTask || this.isResizing) return;

      const clickedTask = e.target.closest(".task");

      if (!clickedTask &&
        !e.target.classList.contains("resize-handle") &&
        !e.target.classList.contains("remove-btn")) {
        this.isCreatingTask = true;
        isDrawing = true;

        // Calculate task properties
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
        const descrip = "this is task";
        const taskId = Date.now() + Math.random();

        const task = new Task(taskId, taskDate, descrip, startTime, endTime);
        this.tasks.push(task);

        // Render task element
        const taskEl = document.createElement("div");
        taskEl.classList.add("task");
        taskEl.setAttribute("data-id", task.taskId);

        const calWidth = calendar.clientWidth;
        const calHeight = calendar.clientHeight;

        // Calculate task positions
        const left = (dayIndex * calWidth) / 7;
        const top = (startTime / totalMinutesDay) * calHeight;
        const width = calWidth / 7;

        taskEl.style.left = `${(left / calWidth) * 100}%`;
        taskEl.style.width = `${(width / calWidth) * 100}%`;
        taskEl.style.top = `${top}px`;
        const height = (endTime - startTime) / 60 * slotHeight;
        taskEl.style.height = `${height}px`;

        taskEl.textContent = descrip;

        this.addResizeHandles(taskEl);
        this.addRemoveButton(taskEl);
        this.addStartEndTimes(taskEl, task);
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

        // Start resizing if the user drags the mouse
        calendar.addEventListener('mousemove', onMouseMove);
        calendar.addEventListener('mouseup', onMouseUp);
      }
    };
    calendar.addEventListener('mousedown', onMouseDown);
  }



  // showTaskForm(task, taskElement) {
  //   if (this.isDragging) { return; }
  //
  //   // Create the overlay
  //   const overlay = document.createElement('div');
  //   overlay.className = 'overlay'; // Apply overlay class
  //
  //   // Create the form
  //   const form = document.createElement('form');
  //   form.className = 'form'; // Apply form class
  //   form.innerHTML = `
  //     <label>Date: <input type="date" name="date" value="${this.formatDate(task.date)}"></label>
  //     <label>Title: <input type="text" name="title" value="${task.title}"></label>
  //     <label>Start Time: <input type="time" name="startTime" value="${this.convertMinutesToTime(task.startTime)}"></label>
  //     <label>End Time: <input type="time" name="endTime" value="${this.convertMinutesToTime(task.endTime)}"></label>
  //     <div class="duration-display"></div>
  //     <label>Description: <textarea name="description" rows="6" cols="60">${task.description}</textarea></label>
  //     <button type="submit">Save</button>
  //     <div class="error-message"></div>
  //   `;
  //
  //   // Focus on the submit button
  //   const submitButton = form.querySelector('button[type="submit"]');
  //   submitButton.focus();
  //
  //   // Function to update time display and duration
  //   const updateTimeDisplay = () => {
  //     const startTimeInput = form.querySelector('input[name="startTime"]');
  //     const endTimeInput = form.querySelector('input[name="endTime"]');
  //     const durationDisplay = form.querySelector('.duration-display');
  //
  //     const startTime = this.convertTimeToMinutes(startTimeInput.value);
  //     let endTime = this.convertTimeToMinutes(endTimeInput.value);
  //
  //     // If endTime is null or empty, set it to 1440 minutes (24:00)
  //     if (!endTimeInput.value) {
  //       endTime = 1440;
  //       endTimeInput.value = this.convertMinutesToTime(endTime);
  //     }
  //
  //     // Calculate duration
  //     const duration = endTime - startTime;
  //
  //     // Update duration display
  //     durationDisplay.textContent = duration > 0
  //       ? `Duration: ${Math.floor(duration / 60)} hours ${duration % 60} minutes`
  //       : 'Duration: 0 hours 0 minutes';
  //   };
  //
  //   // Event listeners for input changes to update time display and duration
  //   form.querySelector('input[name="startTime"]').addEventListener('input', updateTimeDisplay);
  //   form.querySelector('input[name="endTime"]').addEventListener('input', updateTimeDisplay);
  //
  //   // Handle form submission
  //   form.addEventListener('submit', (e) => {
  //     e.preventDefault();
  //
  //     const formData = new FormData(form);
  //     const date = formData.get('date'); // Get the date value
  //     const title = formData.get('title');
  //     const startTime = this.convertTimeToMinutes(formData.get('startTime'));
  //     let endTime = this.convertTimeToMinutes(formData.get('endTime'));
  //     const errorMessageElement = form.querySelector('.error-message');
  //
  //     // Clear previous error message
  //     errorMessageElement.style.display = 'none';
  //     errorMessageElement.textContent = '';
  //
  //     // If endTime is null or empty, set it to 1440 minutes (24:00)
  //     if (!formData.get('endTime')) {
  //       endTime = 1440;
  //     }
  //
  //     // Validation checks
  //     if (startTime < 0 || startTime > 1440) {
  //       errorMessageElement.textContent = 'Start time must be between 00:00 and 24:00.';
  //       errorMessageElement.style.display = 'block';
  //       return;
  //     }
  //     if (endTime < 0 || endTime > 1440) {
  //       errorMessageElement.textContent = 'End time must be between 00:00 and 24:00.';
  //       errorMessageElement.style.display = 'block';
  //       return;
  //     }
  //     if (endTime <= startTime) {
  //       errorMessageElement.textContent = 'End time must be greater than start time.';
  //       errorMessageElement.style.display = 'block';
  //       return;
  //     }
  //
  //     // Update task
  //     task.title = title;
  //     task.date = date; // Update date
  //     task.description = formData.get('description');
  //     task.startTime = startTime;
  //     task.endTime = endTime;
  //
  //     // Render the task in the correct day
  //     this.updateTaskElement(task, taskElement);
  //
  //     // Clean up
  //     overlay.remove(); // Remove the overlay
  //     this.renderTasks(); // Re-render tasks
  //   });
  //
  //   // Close the form on Escape key press
  //   const closeForm = (e) => {
  //     if (e.key === 'Escape') {
  //       overlay.remove(); // Remove the overlay
  //       document.removeEventListener('keydown', closeForm); // Clean up the event listener
  //     }
  //   };
  //
  //   // Add event listener for Escape key
  //   document.addEventListener('keydown', closeForm);
  //
  //   // Append the form to the overlay
  //   overlay.appendChild(form);
  //
  //   // Append the overlay to the shadow root
  //   this.shadowRoot.appendChild(overlay);
  //
  //   // Initial update of the time display and duration
  //   updateTimeDisplay();
  // }
  //
  // // Helper function to format the date to 'YYYY-MM-DD'
  // formatDate(dateString) {
  //   const date = new Date(dateString);
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  //   const day = String(date.getDate()).padStart(2, '0');
  //   return `${year}-${month}-${day}`;
  // }
  //
  // // Update task element position and height in the calendar
  // updateTaskElement(task, taskElement) {
  //   const calendar = this.shadowRoot.querySelector(".calendar");
  //   const calendarHeight = calendar.clientHeight;
  //   const totalMinutesDay = 1440;
  //
  //   // Calculate the position based on the date and times
  //   taskElement.textContent = task.title;
  //   const taskDate = new Date(task.date);
  //   const taskStartMinutes = (taskDate.getTime() / 60000) % totalMinutesDay + task.startTime; // Combine date with start time
  //   const taskEndMinutes = (taskDate.getTime() / 60000) % totalMinutesDay + task.endTime;
  //
  //   taskElement.style.top = `${(taskStartMinutes / totalMinutesDay) * calendarHeight}px`;
  //   taskElement.style.height = `${((taskEndMinutes - taskStartMinutes) / totalMinutesDay) * calendarHeight}px`;
  // }


  showTaskForm(task, taskElement) {
    if (this.isDragging) { return; }

    // Create the overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay'; // Apply overlay class

    // Create the form
    const form = document.createElement('form');
    form.className = 'form'; // Apply form class
    form.innerHTML = `
      <label>Date: <input type="date" name="date" value="${this.formatDate(task.date)}"></label>
      <label>Title: <input type="text" name="title" value="${task.title}"></label>
      <label>Start Time: <input type="time" name="startTime" value="${this.convertMinutesToTime(task.startTime)}"></label>
      <label>End Time: <input type="time" name="endTime" value="${this.convertMinutesToTime(task.endTime)}"></label>
      <div class="duration-display"></div>
      <label>Description: <textarea name="description" rows="6" cols="60">${task.description}</textarea></label>
      <button type="submit">Save</button>
      <div class="error-message"></div>
    `;

    // Focus on the submit button
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.focus();

    // Function to update time display and duration
    const updateTimeDisplay = () => {
      const startTimeInput = form.querySelector('input[name="startTime"]');
      const endTimeInput = form.querySelector('input[name="endTime"]');
      const durationDisplay = form.querySelector('.duration-display');

      const startTime = this.convertTimeToMinutes(startTimeInput.value);
      let endTime = this.convertTimeToMinutes(endTimeInput.value);

      // If endTime is null or empty, set it to 1440 minutes (24:00)
      if (!endTimeInput.value) {
        endTime = 1440;
        endTimeInput.value = this.convertMinutesToTime(endTime);
      }

      // Calculate duration
      const duration = endTime - startTime;

      // Update duration display
      durationDisplay.textContent = duration > 0
        ? `Duration: ${Math.floor(duration / 60)} hours ${duration % 60} minutes`
        : 'Duration: 0 hours 0 minutes';
    };

    // Event listeners for input changes to update time display and duration
    form.querySelector('input[name="startTime"]').addEventListener('input', updateTimeDisplay);
    form.querySelector('input[name="endTime"]').addEventListener('input', updateTimeDisplay);

    // Handle date input change
    const dateInput = form.querySelector('input[name="date"]');
    dateInput.addEventListener('input', (event) => {
      const selectedDate = new Date(event.target.value);
      const currentStartTime = this.convertMinutesToTime(task.startTime);
      const currentEndTime = this.convertMinutesToTime(task.endTime);

      // Create new Date objects combining the selected date with the current start and end times
      const currentStartDateTime = new Date(selectedDate);
      currentStartDateTime.setHours(currentStartTime.split(':')[0]);
      currentStartDateTime.setMinutes(currentStartTime.split(':')[1]);

      const currentEndDateTime = new Date(selectedDate);
      currentEndDateTime.setHours(currentEndTime.split(':')[0]);
      currentEndDateTime.setMinutes(currentEndTime.split(':')[1]);

      // Update task start time and end time correctly
      task.startTime = currentStartDateTime.getHours() * 60 + currentStartDateTime.getMinutes();
      task.endTime = currentEndDateTime.getHours() * 60 + currentEndDateTime.getMinutes();


      // Update the display of the times in the form
      form.querySelector('input[name="startTime"]').value = this.convertMinutesToTime(task.startTime);
      form.querySelector('input[name="endTime"]').value = this.convertMinutesToTime(task.endTime);

      updateTimeDisplay(); // Update duration display after changing the date
    });


    // Handle form submission
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const date = formData.get('date'); // Get the date value
      const title = formData.get('title');
      const startTime = this.convertTimeToMinutes(formData.get('startTime'));
      let endTime = this.convertTimeToMinutes(formData.get('endTime'));
      const errorMessageElement = form.querySelector('.error-message');

      // Clear previous error message
      errorMessageElement.style.display = 'none';
      errorMessageElement.textContent = '';

      // If endTime is null or empty, set it to 1440 minutes (24:00)
      if (!formData.get('endTime')) {
        endTime = 1440;
      }

      // Validation checks
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

      // Update task
      task.title = title;
      task.date = date; // Update date
      task.description = formData.get('description');

      // Render the task in the correct day
      this.updateTaskElement(task, taskElement);

      // Clean up
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

  // Update task element position and height in the calendar
  updateTaskElement(task, taskElement) {
    const calendar = this.shadowRoot.querySelector(".calendar");
    const calendarHeight = calendar.clientHeight;
    const totalMinutesDay = 1440;

    // Calculate the position based on the date and times
    taskElement.textContent = task.title;
    const taskDate = new Date(task.date);
    const taskStartMinutes = (taskDate.getTime() / 60000) % totalMinutesDay + task.startTime; // Combine date with start time
    const taskEndMinutes = (taskDate.getTime() / 60000) % totalMinutesDay + task.endTime;

    taskElement.style.top = `${(taskStartMinutes / totalMinutesDay) * calendarHeight}px`;
    taskElement.style.height = `${((taskEndMinutes - taskStartMinutes) / totalMinutesDay) * calendarHeight}px`;
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

      if (clickDuration < 200) { // If the mouse was down for less than 200ms, consider it a click
        // Handle click event (open showTaskForm or whatever you need)
      } else if (isDragging) {
        const rect = taskEl.getBoundingClientRect();
        const calendarRect = calendar.getBoundingClientRect();

        // Ensure the task is within the bounds of the calendar
        if (rect.top < calendarRect.top) {
          taskEl.style.top = `0px`;
        }

        if (rect.left < calendarRect.left) {
          taskEl.style.left = '0px';
        } else if (rect.right > calendarRect.right) {
          taskEl.style.left = `${calendar.clientWidth - taskEl.offsetWidth}px`;
        }

        // Calculate the correct top property relative to the calendar
        let taskTop = taskEl.getBoundingClientRect().top - calendarRect.top;
        let startTime = Math.max(Math.floor((taskTop / calendar.clientHeight) * 1440, 0));
        startTime = Math.round(startTime / 15) * 15;

        // Ensure startTime is not negative
        if (startTime < 0) {
          startTime = 0;
        }

        const dayWidth = calendar.clientWidth / 7;
        const dayIndex = Math.floor((e.clientX - calendarRect.left) / dayWidth);

        // Adjust startTime to ensure the task's endTime is midnight if it exceeds the calendar's bottom
        let endTime = startTime + task.duration;
        if (endTime > 1440) { // 1440 minutes = 24 hours
          endTime = 1440;
          startTime = endTime - task.duration;
        }

        const monday = new Date(this.getMonday());
        const newDate = new Date(monday);
        newDate.setDate(monday.getDate() + dayIndex);

        task.date = newDate;
        task.startTime = startTime;
        task.endTime = endTime;

        // Update taskEl's top position
        taskTop = (startTime / 1440) * calendar.clientHeight;
        taskEl.style.top = `${taskTop}px`;

        this.renderTasks();
      }

      taskEl.classList.remove('dragging');
      isDragging = false;

      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };



    const onMouseDown = (e) => {
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


  // Helper function to get the Monday of the current week
  getMonday() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(today.setDate(diff));
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
        y = calendar.clientHeight - 100;
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

  addStartEndTimes(taskEl, task) {
    const container = document.createElement("div");
    const start = document.createElement("div");
    const end = document.createElement("div");

    start.textContent = this.formatTime(task.startTime);
    end.textContent = this.formatTime(task.endTime);

    end.classList.add("end-time");
    start.classList.add("start-time");
    container.classList.add("task-time-container");

    container.appendChild(start);
    container.appendChild(end);
    taskEl.appendChild(container);
  }

  addRemoveButton(taskEl) {
    const removeBtn = document.createElement("div");
    removeBtn.classList.add("remove-btn");
    removeBtn.textContent = "✕";

    removeBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const taskId = taskEl.getAttribute("data-id");
      this.tasks = this.tasks.filter(task => task.taskId != taskId);
      this.renderTasks();
    });

    taskEl.appendChild(removeBtn);
  }

  addResizeHandles(taskEl) {
    const topHandle = document.createElement("div");
    const bottomHandle = document.createElement("div");

    topHandle.classList.add("resize-handle", "top-handle");
    bottomHandle.classList.add("resize-handle", "bottom-handle");

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
    };

    // Event listener for mouseup to stop resizing
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

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


  getTemplate() {
    return `
  <style>
    :host {
      display: block;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      overflow: hidden;
      margin: 0;
      padding: 0;
      --time-slot-width: calc(100% / 7);
      --task-width: 10px;
    }
    * {
      box-sizing: border-box;
    }
    .container {
      width: 100%;
      height: 100%;
      overflow: auto;
      border-radius: 8px;
      overflow-x: hidden;
    }

    .container-time-label {
    display: grid;
      grid-template-columns: 50px calc(100% - 50px);
      max-height: 80vh; /* Set your desired maximum height */
      overflow-y: auto; /* Enable vertical scrolling */
      overflow-x: hidden; /* Prevent horizontal scrolling */
    }

    .calendar {
      display: grid;
      grid-template-columns: repeat(7, var(--time-slot-width));
      grid-template-rows: repeat(24, 1fr);
      position: relative;
      background-color: #ffffff;
    }
    .time-label-col {}
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
    .remove-btn, .resize-handle {
      transform: scale(0);
      transition: transform 0.2s ease-in-out; 
    }
    .task:hover .resize-handle,
    .task:hover .remove-btn {
      transform: scale(1);
    }
    .task:hover{
      cursor: grab;
    }
    .task.dragging {
      transform: scale(1.1);
      opacity: 0.6;
      transition: transform 0.2s ease, opacity 0.2s ease;
      z-index: 1000;
      cursor: grabbing;
    }
    .task.dragging .resize-handle,
    .task.dragging .remove-btn {
      display: none;
    }
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
    .task-time-container {
      display: flex;
      justify-content: space-between;
      padding: 0 8px;
      font-size: 12px;
      color: #333;
    }
    .start-time {
      font-weight: bold;
      color: #4caf50;
    }
    .end-time {
      font-weight: bold;
      color: #f44336;
    }

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
    height: auto; /* Let it adjust based on content */
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
    display: none; /* Initially hidden */
}

.form .duration-display {
    font-size: 12px;
    color: #666;
}



.navbar {
  display: flex;
  justify-content: space-between; /* Distribute space between items */
  align-items: center;
  background-color: #4a90e2; /* Navbar background color */
  color: #ffffff; /* Text color */
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 10px;
}

.navbar button {
  background-color: #ffffff; /* Button background color */
  color: #4a90e2; /* Button text color */
  border: none; /* No border */
  padding: 5px 10px; /* Padding for buttons */
  border-radius: 4px; /* Rounded corners for buttons */
  cursor: pointer; /* Pointer on hover */
  font-size: 14px; /* Font size for buttons */
  transition: background-color 0.3s ease; /* Smooth background change on hover */
}

.navbar button:hover {
  background-color: #e0e0e0; /* Button background on hover */
}

.navbar .today-btn {
  font-weight: bold; /* Bold styling for the Today button */
}

.month-year-display {
  margin: 0 15px; /* Horizontal margin to space out from buttons */
  font-weight: bold; /* Bold text for emphasis */
  font-size: 1.2em; /* Slightly larger font size */
  color: #ffffff; /* Text color to match navbar */
  text-align: center; /* Center the month/year display */
  flex: 1; /* Allow it to grow and take available space */
}

/* New styles to align buttons in the center */
.navbar {
  justify-content: center; /* Center all items */
}

.navbar .month-year-display {
  margin: 0 30px; /* Increased margin for more space */
}

/* Additional styles to ensure buttons are not pushed to the sides */
.navbar > button {
  margin: 0 10px; /* Equal margin on buttons to space them out */
}

.accentuated {
    text-decoration: underline;
    color: #e0e0e0; /* Example accent color (blue) */
    font-weight: bold; /* Make the text bold */
}




  </style>

  <div class="container">
    <div class="navbar">
      <button class="prev-week-btn">Previous Week</button>
      <div class="month-year-display accentuated"></div> 
      <button class="today-btn">Today</button>
      <button class="next-week-btn">Next Week</button>
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
