class WeekDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = this.getTemplate();
    this.currentDate = new Date();
    this.tasks = []; // Array to store task properties
  }

  connectedCallback() {
    this.renderTimeSlots();
    this.addEventListeners();
    this.updateDayHeaders(); // Update day headers on load
  }

  renderTimeSlots() {
    const calendar = this.shadowRoot.querySelector('.calendar');
    for (let hour = 0; hour < 24; hour++) {
      const timeLabel = document.createElement('div');
      timeLabel.classList.add('time-slot', 'time-header');
      timeLabel.textContent = `${hour}:00`;
      calendar.appendChild(timeLabel); // Add hour label first in the left column

      for (let day = 0; day < 7; day++) {
        const timeSlot = document.createElement('div');
        timeSlot.classList.add('time-slot');
        timeSlot.setAttribute('data-hour', hour);
        timeSlot.setAttribute('data-day', day);
        calendar.appendChild(timeSlot);
      }
    }
  }

  addEventListeners() {
    const timeSlots = this.shadowRoot.querySelectorAll('.time-slot:not(.time-header)');
    timeSlots.forEach(slot => {
      slot.addEventListener('click', this.handleTimeSlotClick.bind(this));
    });
  }

  handleTimeSlotClick(event) {
    const hour = event.currentTarget.getAttribute('data-hour');
    const day = event.currentTarget.getAttribute('data-day');

    const existingTask = event.currentTarget.querySelector('.task');
    if (!existingTask) {
      this.createTask(event.currentTarget, hour, day);
    }
  }

  createTask(slot, hour, day) {
    const task = document.createElement('div');
    task.classList.add('task');
    task.textContent = `Task at ${hour}:00`;

    // Add resize handles
    this.addResizeHandles(task);
    slot.appendChild(task);

    // Store task properties
    this.tasks.push(this.getTaskProperties(task, hour, day));
  }

  addResizeHandles(task) {
    const topHandle = this.createResizeHandle('top');
    const bottomHandle = this.createResizeHandle('bottom');
    task.appendChild(topHandle);
    task.appendChild(bottomHandle);

    // Add resize event listeners for handles
    this.addResizeEventListeners(topHandle, task, 'top');
    this.addResizeEventListeners(bottomHandle, task, 'bottom');
  }

  createResizeHandle(position) {
    const handle = document.createElement('div');
    handle.classList.add('resize-handle', position);
    return handle;
  }

  addResizeEventListeners(handle, task, position) {
    handle.addEventListener('mousedown', (e) => this.startResize(e, task, position));
  }


  startResize(e, task, position) {
    e.preventDefault();
    // initial vertical position of the mouse
    const initialY = e.clientY;
    const initialHeight = parseInt(getComputedStyle(task).height);
    const initialTop = task.offsetTop;

    const onMouseMove = (event) => {
      const deltaY = position === 'top' ? initialY - event.clientY : event.clientY - initialY;
      const newHeight = initialHeight + deltaY;

      if (newHeight > 20) { // Minimum height
        task.style.height = `${newHeight}px`;
        if (position === 'top') {
          task.style.top = `${initialTop - deltaY}px`;
        }
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  getTaskProperties(task, hour, day) {
    return {
      id: this.tasks.length,
      hour: hour,
      day: day,
      top: task.offsetTop,
      height: task.offsetHeight,
      content: task.textContent,
    };
  }

  updateDayHeaders() {
    const startOfWeek = this.getStartOfWeek(this.currentDate);
    const dayHeaders = this.shadowRoot.querySelectorAll('.day-header');

    dayHeaders.forEach((header, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);
      header.textContent = dayDate.toLocaleDateString('en-US', { weekday: 'long' });
    });
  }

  getStartOfWeek(date) {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  }

  goToToday() {
    this.currentDate = new Date();
    this.updateDayHeaders();
  }

  goToNextWeek() {
    this.currentDate.setDate(this.currentDate.getDate() + 7);
    this.updateDayHeaders();
  }

  goToPreviousWeek() {
    this.currentDate.setDate(this.currentDate.getDate() - 7);
    this.updateDayHeaders();
  }

  getTemplate() {
    return `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          font-family: "Fira Code", monospace;
          overflow: hidden;
        }

        .container {
          width: 100%;
          height: 100%;
          overflow: auto;
          background-color: #f9f9f9;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .calendar {
          display: grid;
          grid-template-columns: 50px repeat(7, 1fr);
          grid-template-rows: 50px repeat(24, 1fr);
          height: 100%;
          width: 100%;
          border: 1px solid #e0e0e0;
          position: relative;
          background-color: #ffffff;
        }

        .day-header,
        .time-header {
          position: sticky;
          background-color: #4a90e2;
          color: #ffffff;
          z-index: 1;
          border-bottom: 1px solid #e0e0e0;
          border-right: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .day-header {
          font-size: 16px;
          font-weight: bold;
          height: 50px;
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
          border-right: 1px solid #e0e0e0;
          height: 40px;
          cursor: pointer;
          position: relative;
        }

        .task {
          background-color: #ffdd57; /* Task background color */
          padding: 5px;
          border-radius: 4px;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          margin: 2px;
          text-align: center;
          z-index: 2;
          pointer-events: auto; /* Make tasks interactive */
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); /* Shadow for tasks */
          transition: background-color 0.3s; /* Smooth transition for tasks */
        }

        .task:hover {
          background-color: #ffd54f; /* Darker yellow on hover */
        }

        .resize-handle {
          display: none; /* Hide handles by default */
          width: 10px;
          height: 10px;
          background-color: #333;
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          cursor: ns-resize;
          border-radius: 50%; /* Make handles circular */
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2); /* Shadow for handles */
        }

        .task:hover .resize-handle {
          display: block; /* Show handles only when hovering over the task */
        }

        .resize-handle.top {
          top: -5px;
        }

        .resize-handle.bottom {
          bottom: -5px;
        }
      </style>
      <div class="container">
        <div class="calendar" style="grid-template-columns: 50px repeat(7, 1fr);">
          <div class="time-header"></div>
          <div class="day-header">Mon</div>
          <div class="day-header">Tue</div>
          <div class="day-header">Wed</div>
          <div class="day-header">Thu</div>
          <div class="day-header">Fri</div>
          <div class="day-header">Sat</div>
          <div class="day-header">Sun</div>
        </div>
      </div>

    `;
  }
}

customElements.define('week-calendar', WeekDisplay);

