class WeekDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = this.getTemplate();
    this.currentDate = new Date();
    this.tasks = [];
    this.isResizing = false;
    this.isCreatingTask = false;
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

    for (let hour = 0; hour < 24; hour++) {
      // time labels
      const timeLabel = document.createElement('div');
      timeLabel.classList.add('time-slot', 'time-header');
      timeLabel.textContent = `${hour}:00`;
      timeLabelCol.appendChild(timeLabel);
      // time slots 
      for (let day = 0; day < 7; day++) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add("time-slot");
        timeSlot.setAttribute('data-hour', hour);
        timeSlot.setAttribute('data-day', day);
        calendar.appendChild(timeSlot);
      }
    }
  }
  // put numbers inside day-headers
  populateWeekDates() {
    const headerRow = this.shadowRoot.querySelector(".header-row");
    const dayHeaders = headerRow.querySelectorAll(".day-header");
    // get current date
    const today = new Date();
    const dayOfWeek = today.getDay();
    // find monday of the current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7)); // adj to monday
    // populate each day header with the current date
    dayHeaders.forEach((dayHeader, index) => {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + index); // loop over days
      const dayNumber = currentDay.getDate();
      dayHeader.appendChild(this.beautifyNumbers(dayNumber));
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
    this.tasks.sort((a, b) => a.dayPosition - b.dayPosition || a.startTime - b.startTime);

    // Array to hold arrays of tasks that collide on the same day
    const collidingTasks = [];

    // Find colliding tasks
    this.tasks.forEach(task => {
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
        const top = (task.startTime / 1440) * calHeight;
        const width = calWidth / (7 * columns.length);

        taskEl.style.left = `${(left / calWidth) * 100}%`;
        taskEl.style.width = `${(width / calWidth) * 100}%`;
        taskEl.style.top = `${top}px`;
        const height = (task.duration / 60) * slotHeight;
        taskEl.style.height = `${height}px`;

        // taskEl.textContent = `this is task`;

        taskEl.addEventListener('mousedown', (e) => {
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

        // const taskEl = document.createElement("div");
        // taskEl.classList.add("task");
        // taskEl.setAttribute("data-id", task.taskId);
        //
        // // Calculate task positions
        // const left = (task.dayPosition * calWidth) / 7 + (columnIndex * calWidth) / (7 * columns.length);
        // const top = (task.startTime / 1440) * calHeight;
        // const width = calWidth / (7 * columns.length);
        //
        // taskEl.style.left = `${(left / calWidth) * 100}%`;
        // taskEl.style.width = `${(width / calWidth) * 100}%`;
        // taskEl.style.top = `${top}px`;
        // const height = (task.duration / 60) * slotHeight;
        // taskEl.style.height = `${height}px`;
        //
        // // Create task header
        // const taskHeader = document.createElement("div");
        // taskHeader.classList.add("task-header");
        //
        // // Create and append title
        // const taskTitle = document.createElement("span");
        // taskTitle.classList.add("task-title");
        // taskTitle.textContent = task.title; // Use task's title
        // taskHeader.appendChild(taskTitle);
        //
        // // Create and append times
        // const taskTimes = document.createElement("div");
        // taskTimes.classList.add("task-times");
        //
        // // Start time
        // const taskStartTime = document.createElement("span");
        // taskStartTime.classList.add("task-start-time");
        // taskStartTime.textContent = `Start: ${this.formatTime(task.startTime)}`; // Format your time
        // taskTimes.appendChild(taskStartTime);
        //
        // // End time
        // const taskEndTime = document.createElement("span");
        // taskEndTime.classList.add("task-end-time");
        // taskEndTime.textContent = `End: ${this.formatTime(task.endTime)}`; // Format your time
        // taskTimes.appendChild(taskEndTime);
        //
        // // Duration
        // const taskDuration = document.createElement("span");
        // taskDuration.classList.add("task-duration");
        // taskDuration.textContent = `Duration: ${task.duration / 60} hour${task.duration / 60 > 1 ? 's' : ''}`; // Format duration
        // taskTimes.appendChild(taskDuration);
        //
        // // Append times to header
        // taskHeader.appendChild(taskTimes);
        //
        // // Append header to task element
        // taskEl.appendChild(taskHeader);
        //
        // // Add resize handles and remove button
        // this.addResizeHandles(taskEl);
        // this.addRemoveButton(taskEl);
        //
        // // Event listener for showing task form
        // taskEl.addEventListener('mousedown', (e) => {
        //   if (!e.target.classList.contains("resize-handle") &&
        //     !e.target.classList.contains("remove-btn")) {
        //     this.showTaskForm(task, taskEl);
        //   }
        // });
        //
        // // Append task element to calendar
        // calendar.appendChild(taskEl);
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
        const taskDate = new Date(monday);
        taskDate.setDate(monday.getDate() + dayIndex);

        const slotHeight = this.getSlotDimensions().height;
        const topProp = Math.round(y / slotHeight) * slotHeight;
        const totalMinutesDay = 1440;
        const startTime = Math.floor((topProp / calendar.clientHeight) * totalMinutesDay);
        const endTime = startTime + 60;
        const descrip = "this is task";
        console.log(this.tasks);
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

  showTaskForm(task, taskElement) {
    const form = document.createElement('form');
    form.innerHTML = `
      <label>Title: <input type="text" name="title" value="${task.title}"></label>
      <label>Start Time: <input type="number" name="startTime" value="${task.startTime}"></label>
      <label>End Time: <input type="number" name="endTime" value="${task.endTime}"></label>
      <button type="submit">Save</button>
    `;
    form.style.position = 'absolute';
    form.style.left = '50%';
    form.style.top = '50%';
    form.style.transform = 'translate(-50%, -50%)';
    form.style.backgroundColor = 'white';
    form.style.padding = '1rem';
    form.style.border = '1px solid #ccc';
    form.style.zIndex = 1000;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      task.title = formData.get('title');
      task.startTime = parseInt(formData.get('startTime'));
      task.endTime = parseInt(formData.get('endTime'));

      taskElement.textContent = task.title;
      const calendar = this.shadowRoot.querySelector(".calendar");
      const calendarHeight = calendar.clientHeight;
      const totalMinutesDay = 1440;

      taskElement.style.top = `${(task.startTime / totalMinutesDay) * calendarHeight}px`;
      taskElement.style.height = `${((task.endTime - task.startTime) / totalMinutesDay) * calendarHeight}px`;

      document.body.removeChild(form);
      this.renderTasks();
    });

    document.body.appendChild(form);
  }



  dragAndDrop(taskEl, task) {
    const calendar = this.shadowRoot.querySelector(".calendar");

    const onMouseMove = (e) => {
      const { x, y } = this.calculatePosition(e, "drag");
      // Use x to handle horizontal movement within the day column
      taskEl.style.left = `${x - offsetX}px`; // Adjust left using x
      // console.log(clampedDayIndex);
      taskEl.style.top = `${y - offsetY}px`; // Update vertical position

      // Optionally add a class for visual feedback during dragging
      taskEl.classList.add('dragging');
    };

    const onMouseUp = (e) => {
      // Get the task element's current position
      const rect = taskEl.getBoundingClientRect();
      const taskTop = rect.top - calendar.getBoundingClientRect().top;

      // Calculate new start time based on the task's top position
      let startTime = Math.floor((taskTop / calendar.clientHeight) * 1440);

      // Round to the nearest quarter hour (15 minutes)
      startTime = Math.round(startTime / 15) * 15;

      // Calculate the day column from the mouse X position
      const calendarRect = calendar.getBoundingClientRect();
      const dayWidth = calendar.clientWidth / 7; // Assuming a 7-day calendar
      const dayIndex = Math.floor((e.clientX - calendarRect.left) / dayWidth); // Determine which day was clicked

      // Calculate the end time based on the task duration
      const endTime = startTime + task.duration;

      // Update the task's date and times
      const monday = new Date(this.getMonday());
      const newDate = new Date(monday);
      newDate.setDate(monday.getDate() + dayIndex); // Calculate new date based on dayIndex

      task.date = newDate;
      task.startTime = startTime;
      task.endTime = endTime;

      // Clean up event listeners
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Re-render tasks to apply the changes
      this.renderTasks();
    };



    let offsetX, offsetY;
    const onMouseDown = (e) => {
      // Get the bounding rectangle of the task element
      const taskRect = taskEl.getBoundingClientRect();

      // Calculate the offset from the mouse position to the task element
      offsetX = e.clientX - taskRect.left; // Horizontal offset
      offsetY = e.clientY - taskRect.top;  // Vertical offset

      // Add mousemove and mouseup event listeners
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
      slotIndex = e.clientY - rect.top; // Time row
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
      x = e.clientX - rect.left; // Time column 
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
          background-color: #f9f9f9f9;
          border-radius: 8px;
        }
        .container-time-label {
          display: grid;
          grid-template-columns: 50px calc(100% - 50px);
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
          aligh-items: center;
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
          position: absolute;
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
          right: 5px; /* Use right to make placement easier */
          cursor: pointer;
          padding: 2px;
          background-color: #e63946; /* Contrasting color */
          color: #fff;
          border-radius: 50%;
          font-size: 14px; /* Adjust font size */
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
        .task:hover .resize-handle {
          transform: scale(1);
        }
        .task.dragging {
          transform: scale(1.1);
          opacity: 0.6;
          transition: transform 0.2s ease, opacity 0.2s ease;
          z-index: 1000;
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
        /* Container for start and end times */
        .task-time-container {
          display: flex;
          justify-content: space-between;
          padding: 0 8px;
          font-size: 12px;
          color: #333;
        }

        /* Start time styling */
        .start-time {
          font-weight: bold;
          color: #4caf50;
        }

        /* End time styling */
        .end-time {
          font-weight: bold;
          color: #f44336;
        }

      </style>

      <div class="container">

        <div class="header-row">
          <div class="empty"></div>
          <div class="day-header">mon</div>
          <div class="day-header">Tue</div>
          <div class="day-header">Wed</div>
          <div class="day-header">Thu</div>
          <div class="day-header">Fri</div>
          <div class="day-header">Sat</div>
          <div class="day-header">Sun</div>
        </div>

       <div class="container-time-label">
          <div class="time-label-col"> </div>
          <div class="calendar"> </div>
       </div>

      </div>
    `;
  }
}

customElements.define("week-calendar", WeekDisplay);
