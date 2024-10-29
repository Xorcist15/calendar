class WeekDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = this.getTemplate();
    this.currentDate = new Date();
    this.tasks = [];
    this.isResizing = false;
  }
  connectedCallback() {
    this.renderTimeSlots();
    this.addCalendarListener();
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
  }

  renderTasks() {
    // TODO: i still need to add the logic to solve collisions in rendering
    const calendar = this.shadowRoot.querySelector(".calendar");
    const calWidth = calendar.clientWidth;
    const calHeight = calendar.clientHeight;
    calendar.querySelectorAll(".task").forEach(taskEl => taskEl.remove());
    const slotHeight = this.
      shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight;

    this.tasks.forEach(task => {
      const taskEl = document.createElement("div");
      taskEl.classList.add("task");

      taskEl.setAttribute("data-id", task.taskId);

      const left = (task.dayPosition * calWidth) / 7;
      const top = (task.startTime / 1440) * calHeight;
      const width = (calWidth / 7);

      taskEl.style.left = `${(left / calWidth) * 100}%`;
      taskEl.style.top = `${top}px`;
      taskEl.style.width = `${(width / calWidth) * 100}%`;
      const height = (task.duration / 60) * slotHeight;
      console.log(task.duration);
      taskEl.style.height = `${height}px`;

      taskEl.textContent = `this is task`;

      // Add resize handles to the task element
      this.addResizeHandles(taskEl);
      this.addRemoveButton(taskEl);
      this.addStartEndTimes(taskEl, task);
      calendar.appendChild(taskEl);
    });
  }

  formatMinutesAsTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  addStartEndTimes(taskEl, task) {
    const container = document.createElement("div");
    const start = document.createElement("div");
    const end = document.createElement("div");

    start.textContent = this.formatMinutesAsTime(task.startTime);
    end.textContent = this.formatMinutesAsTime(task.endTime);

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
    removeBtn.addEventListener("click", () => {
      taskEl.remove();
      this.tasks = this.tasks.filter(task =>
        task.taskId !== taskEl.getAttribute("data-id")
      );
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
    this.isResizing = true;
    const direction = e.target.classList.contains("top-handle") ? "top" : "bottom";
    const taskEl = e.target.parentElement;
    const taskId = taskEl.getAttribute("data-id");
    const taskObj = this.tasks.find(t => t.taskId == taskId);
    const slotHeight = this.
      shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight;
    const minTaskHeight = this.
      shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight / 4;

    let initY = this.calculatePosition(e, "resize").y;
    let initialHeight = taskEl.offsetHeight;
    let initialTop = taskEl.offsetTop;
    let initialStartTime = taskObj.startTime;
    let initialEndTime = taskObj.endTime;

    // Event listener for mousemove to update the height
    const onMouseMove = (moveEvent) => {
      const currentY = this.calculatePosition(moveEvent, "resize").y;
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
        }
        // Calculate new end time based on the bottom handle movement
        taskObj.endTime = initialEndTime + (heightChange / slotHeight) * 60;
        console.log(newHeight);
      }

      taskEl.style.height = `${newHeight}px`;
      taskObj.height = newHeight;
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

    if (context === "resize") {
      slotIndex = e.clientY - rect.top; // Time row
      y = Math.floor(slotIndex / a) * a;
      if (y >= calendar.clientHeight) {
        y = calendar.clientHeight;
      } else if (y < 0) {
        y = 0;
      }
    } else if (context === "create") {
      slotIndex = Math.floor((e.clientY - rect.top) / height);
      y = slotIndex * height;
    }
    return { x, y, dayIndex };
  }

  addCalendarListener() {
    const calendar = this.shadowRoot.querySelector(".calendar");
    calendar.addEventListener("click", (e) => {
      if (this.isResizing) {
        console.log("hello resize");
        this.isResizing = false;
        return;
      } else {
        const clickedElement = e.target;
        if (!clickedElement.classList.contains("task") &&
          !clickedElement.classList.contains("resize-handle")) {
          this.createTask(e);
        }
      }
    });
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
          /* border-bottom: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0; */
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
          transform: scale(1); /* Scale up on hover */
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
