class WeekDisplay extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = this.getTemplate();

        this.selectedColors = new Set();

        this.currentDate = this.getMonday();
        // initialise this.tasks avec les taches dans localstorage
        // this.tasks contient les taches
        this.tasks = this.loadTasksFromLocalStorage();

        // action control variables
        this.isResizing = false;
        this.isCreatingTask = false;
    }

    /**
     * connectedCallback goes with constructor
     * Runs automatically after constructor 
     */
    connectedCallback() {
        this.interactivity();
        this.populateWeekDates();
        this.renderTimeSlots();
        this.addCalendarListener();
        this.createAndResizeTask();
        this.renderTasks();
        this.addColorTagListeners();
        this.toggleDarkMode();
    }

    // DATE MANIPULATION FUNCITONS
    /**
     * Get last monday 
     * @returns lundi dernier
     */
    getMonday() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(today.setDate(diff));
    }

    /**
     * @param direction direction de navigation dans les dates
     * ensuite met a jour le calendrier
     * */
    changeWeek(direction) {
        this.currentDate.setDate(this.currentDate.getDate() + direction * 7);
        this.updateCalendar();
    }

    /**
     * permet de revenir sur semaine actuelle grace a la fonction 
     * this.getMonday qui retourne lundi derner
     */
    goToToday() {
        this.currentDate = this.getMonday();
        this.updateCalendar();
    }

    /**
     * met a jour le calendrier avec la nouvelle date 
     * choisie avec les boutons de navigation
     */
    updateCalendar() {
        this.renderTimeSlots();
        this.populateWeekDates();
        this.renderTasks();
    }

    // RENDERING FUNCITONS
    /**
     * active mode sombre
     * selectionne tout les elements concernes dans le DOM html
     * rajoute la classe dark-mode
     * le css est ecrit dans la fonction this.getTemplate() 
     */
    toggleDarkMode() {
        const elementsToToggle = this.shadowRoot.querySelectorAll(`
          
            .container, .calendar, .day-header, .time-header, .empty,  
      .navbar, .header-row, .container-time-label, button:not(.close-btn), 
      .current-day, .theme-switch-container, .color-tags-container,
      .help-btn
          
          `);
        elementsToToggle.forEach(el => el.classList.toggle("dark-mode"));
        this.renderTasks();
    }


    /**
     * teste si mode sombre est actuellement actif
     */
    isDarkModeOn() {
        const nav = this.shadowRoot.querySelector('.navbar');
        if (nav.classList.contains("dark-mode")) return true;
        else return false;
    }

    /**
     * cree le grid avec les cases du calendrier
     */
    renderTimeSlots() {
        const calendar = this.shadowRoot.querySelector('.calendar');
        const timeLabelCol = this.shadowRoot.querySelector('.time-label-col');
        const titleInfo = "Cliquez pour créer une tâche"

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
                timeSlot.setAttribute('title', titleInfo);
                calendar.appendChild(timeSlot);
            }
        }
        // afficher le mois et l'annee au nav bar
        const options = { year: 'numeric', month: 'long' };
        let formattedDate = this.currentDate.toLocaleDateString('fr-FR', options);
        const monthYearDisplay = this.shadowRoot.querySelector('.month-year-display');
        formattedDate = String(formattedDate).charAt(0).toUpperCase() + String(formattedDate).slice(1);
        monthYearDisplay.textContent = formattedDate;
    }

    /**
     * reprend les day headers (contenant le nom et la date des jours)
     * met les bonnes dates et les bons nom de jour
     */
    populateWeekDates() {
        const headerRow = this.shadowRoot.querySelector(".header-row");
        const dayHeaders = headerRow.querySelectorAll(".day-header");

        const dayOfWeek = this.currentDate.getDay();
        const monday = new Date(this.currentDate);
        monday.setDate(this.currentDate.getDate() - ((dayOfWeek + 6) % 7));

        const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        dayHeaders.forEach((dayHeader, index) => {
            const currentDay = new Date(monday);
            currentDay.setDate(monday.getDate() + index);

            const date = currentDay.toLocaleDateString("fr-FR");
            const dayName = dayNames[index];

            dayHeader.textContent = `${dayName} ${date}`;

            if (currentDay.getFullYear() === today.getFullYear() &&
                currentDay.getMonth() === today.getMonth() &&
                currentDay.getDate() === today.getDate()) {
                dayHeader.classList.add("current-day");
                dayHeader.textContent += " (Auj)";
            } else {
                dayHeader.classList.remove("current-day");
            }
        });
    }

    /**
     * Fonction essentielle au fonctionnement du calendrier
     * affiche les taches dans this.tasks
     * en fonction de la date, le jour, la duree
     * l'heure de debut et l'heure de fin
     */
    renderTasks() {
        const calendar = this.shadowRoot.querySelector(".calendar");
        const calWidth = calendar.clientWidth;
        const calHeight = calendar.clientHeight;

        const slotHeight = this.shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight;
        const startOfWeek = new Date(this.currentDate);
        startOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay() + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const filteredTasks = this.tasks.filter(task => {
            const taskDate = new Date(task.date);
            const isWithinWeek = taskDate >= startOfWeek && taskDate < endOfWeek;
            const isSelectedColor = this.selectedColors.size === 0 || this.selectedColors.has(task.color);
            return isWithinWeek && isSelectedColor;
        });

        filteredTasks.sort((a, b) => a.dayPosition - b.dayPosition || a.startTime - b.startTime);

        const collidingTasks = [];

        filteredTasks.forEach(task => {
            let collisionFound = false;
            for (let i = 0; i < collidingTasks.length; i++) {
                const group = collidingTasks[i];
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

        function isColliding(task1, task2) {
            return task1.startTime < task2.endTime && task2.startTime < task1.endTime;
        }

        let anyTaskMatches = false;
        const taskElements = calendar.querySelectorAll(".task");

        const tasksToRemove = new Set([...taskElements].map(el => el.getAttribute("data-id")));

        filteredTasks.forEach(task => {
            anyTaskMatches = true;
            tasksToRemove.delete(task.taskId);
        });

        taskElements.forEach(taskEl => {
            const taskId = taskEl.getAttribute("data-id");
            if (tasksToRemove.has(taskId)) {
                taskEl.classList.add("fade-out");
                taskEl.addEventListener('transitionend', () => {
                    taskEl.remove();
                });
            }
        });

        collidingTasks.forEach(group => {
            group.sort((a, b) => a.startTime - b.startTime);

            const columns = [];

            group.forEach(task => {
                let columnIndex = 0;
                while (columnIndex < columns.length && columns[columnIndex].some(t => isColliding(t, task))) {
                    columnIndex++;
                }

                if (!columns[columnIndex]) {
                    columns[columnIndex] = [];
                }

                columns[columnIndex].push(task);

                const taskEl = document.createElement("div");
                taskEl.classList.add("task");
                taskEl.setAttribute("data-id", task.taskId);
                taskEl.setAttribute("data-color", task.color);

                const left = (task.dayPosition * calWidth) / 7 + (columnIndex * calWidth) / (7 * columns.length);
                const top = Math.max(((task.startTime / 1440) * calHeight), 0);
                const width = calWidth / (7 * columns.length);

                taskEl.style.left = `${(left / calWidth) * 100}%`;
                taskEl.style.width = `${(width / calWidth) * 100}%`;
                taskEl.style.top = `${top}px`;
                taskEl.style.backgroundColor = task.color;

                const height = (task.duration / 60) * slotHeight;
                taskEl.style.height = `${height}px`;

                if (this.colorTagsUpdated && !anyTaskMatches) {
                    taskEl.classList.add("fade-in");
                }

                const title = document.createElement("div");
                title.classList.add('title');
                title.textContent = task.title;
                taskEl.appendChild(title);

                const time = document.createElement("div");
                time.classList.add("time");
                time.textContent = `${this.formatTime(task.startTime)} - ${this.formatTime(task.endTime)}`;
                taskEl.appendChild(time);

                const description = document.createElement("div");
                description.classList.add("description");
                description.textContent = task.description;
                taskEl.appendChild(description);

                let isDraggingOrResizing = false;

                taskEl.addEventListener('mousedown', () => {
                    isDraggingOrResizing = false;
                });

                taskEl.addEventListener('mousemove', () => {
                    isDraggingOrResizing = true;
                });

                taskEl.addEventListener('mouseup', (e) => {
                    if (!isDraggingOrResizing) {
                        if (!e.target.classList.contains("resize-handle") &&
                            !e.target.classList.contains("remove-btn")) {
                            this.showTaskForm(task, taskEl);
                        }
                    }
                    isDraggingOrResizing = false;
                });

                this.addResizeHandles(taskEl);
                this.addRemoveButton(taskEl);
                this.dragAndDrop(taskEl, task);

                calendar.appendChild(taskEl);
            });
        });

        this.colorTagsUpdated = false; // Reset flag after rendering tasks
    }


    // ADD EVENT LISTNERS FUNCTIONS
    /**
     * add listeners to nav bar colors
     */
    addColorTagListeners() {
        this.shadowRoot.querySelectorAll('.color-tags').forEach(tag => {
            tag.addEventListener('click', () => {
                const color = tag.getAttribute('data-color');

                if (this.selectedColors.has(color)) {
                    this.selectedColors.delete(color);
                    tag.classList.remove('selected');
                } else {
                    this.selectedColors.add(color);
                    tag.classList.add('selected');
                }

                this.colorTagsUpdated = true;
                this.renderTasks();
            });
        });
    }

    /**
     * Attaches event listensers to navigation bar
     * buttons and theme switcher
     */
    interactivity() {
        // Add event listeners to buttons 
        this.shadowRoot.querySelector('.prev-week-btn').
        addEventListener('click', () => this.changeWeek(-1));
        this.shadowRoot.querySelector('.today-btn').
        addEventListener('click', () => this.goToToday());
        this.shadowRoot.querySelector('.next-week-btn').
        addEventListener('click', () => this.changeWeek(1));
        this.shadowRoot.querySelector('#dark-mode-toggle').
        addEventListener('click', () => this.toggleDarkMode());
        this.shadowRoot.querySelector('.help-btn').
        addEventListener('click', () => this.toggleHelpWindow());

        /* TIME NAVIGATION */
        // next week
        const handleRightBtn = (event) => {
            if (event.key === 'ArrowRight') {
                this.changeWeek(1);

                const rightBtn = this.shadowRoot.querySelector('.next-week-btn');
                rightBtn.classList.add('button-hover'); // Hover effect

                rightBtn.classList.add('button-click');

                rightBtn.addEventListener('animationend', () => {
                    rightBtn.classList.remove('button-hover');
                    rightBtn.classList.remove('button-click');
                }, { once: true });
            }
        };
        document.addEventListener('keydown', handleRightBtn);

        // last week
        const handleLeftBtn = (event) => {
            if (event.key === 'ArrowLeft') {
                this.changeWeek(-1);

                const leftBtn = this.shadowRoot.querySelector('.prev-week-btn');
                leftBtn.classList.add('button-hover');

                // Trigger click animation
                leftBtn.classList.add('button-click');

                // Remove hover and click after animation finishes
                leftBtn.addEventListener('animationend', () => {
                    leftBtn.classList.remove('button-hover');
                    leftBtn.classList.remove('button-click');
                }, { once: true });
            }
        };
        document.addEventListener('keydown', handleLeftBtn);

        // this week
        const handleDownBtn = (event) => {
            if (event.key === 'ArrowDown') {
                this.goToToday();

                const downBtn = this.shadowRoot.querySelector('.today-btn');
                downBtn.classList.add('button-hover');

                // Trigger click animation
                downBtn.classList.add('button-click');

                // Remove hover and click after animation finishes
                downBtn.addEventListener('animationend', () => {
                    downBtn.classList.remove('button-hover');
                    downBtn.classList.remove('button-click');
                }, { once: true });
            }
        };
        document.addEventListener('keydown', handleDownBtn);

        const handleDarkModeShortcut = (event) => {
            if (event.key === 'i') {
                this.toggleDarkMode();
                const darkModeToggle = this.shadowRoot.querySelector("#dark-mode-toggle");
                const themeState = this.shadowRoot.querySelector(".theme-state");
                themeState.textContent = darkModeToggle.checked ? "Mode clair" : "Mode sombre";
                darkModeToggle.checked = !darkModeToggle.checked;
            }
        };
        document.addEventListener('keydown', handleDarkModeShortcut);

        const handleFilterSelection = (event) => {
            const colorCodes = [];
            const colorTags = this.shadowRoot.querySelectorAll(".color-tags");
            colorTags.forEach(tag => {
                colorCodes.push(tag.getAttribute("data-color"));
                tag.classList.remove("selected");
            });;
            switch (event.key) {
                case '1':
                    this.selectedColors.clear();
                    this.selectedColors.add(colorCodes[0]);
                    colorTags[0].classList.add("selected");
                    this.renderTasks();
                    break;
                case '2':
                    this.selectedColors.clear();
                    this.selectedColors.add(colorCodes[1]);
                    colorTags[1].classList.add("selected");
                    this.renderTasks();
                    break;
                case '3':
                    this.selectedColors.clear();
                    this.selectedColors.add(colorCodes[2]);
                    colorTags[2].classList.add("selected");
                    this.renderTasks();
                    break;
                case '4':
                    this.selectedColors.clear();
                    this.selectedColors.add(colorCodes[3]);
                    colorTags[3].classList.add("selected");
                    this.renderTasks();
                    break;
                case '5':
                    this.selectedColors.clear();
                    this.selectedColors.add(colorCodes[4]);
                    colorTags[4].classList.add("selected");
                    this.renderTasks();
                    break;
            }
        }
        document.addEventListener("keydown", handleFilterSelection);

        const handleHelpShortcut = (event) => {
            if (event.key === 'h') {
                const helpWin = this.shadowRoot.querySelector(".help-window");
                if (!helpWin) {
                    this.toggleHelpWindow();
                }
            }
        };
        document.addEventListener("keydown", handleHelpShortcut);
    }

    /**
     * shows a help window
     * how to use the app
     */
    toggleHelpWindow() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';

        let darkModeOn = this.isDarkModeOn() ? 'dark-mode' : 'light-mode';

        const help = document.createElement('div');
        help.className = `help-window ${darkModeOn}`;

        help.innerHTML = `
    <div class="help-header">
        <h2>Aide</h2>
        <button class="close-btn">✕</button>
    </div>
    <div class="help-content">
      <h3>Raccourcis</h3>
      <table>
          <thead>
              <tr>
                  <th>Raccourci</th>
                  <th>Action</th>
              </tr>
          </thead>
          <tbody>
              <tr>
                  <td><code>h</code></td>
                  <td>Ouvrir l'aide</td>
              </tr>
              <tr>
                  <td><code>i</code></td>
                  <td>Inverser les couleurs</td>
              </tr>
              <tr>
                  <td><i class="fas fa-arrow-left"></i></td>
                  <td>Afficher la semaine précédente</td>
              </tr>
              <tr>
                  <td><i class="fas fa-arrow-right"></i></td>
                  <td>Afficher la semaine suivante</td>
              </tr>
              <tr>
                  <td><i class="fas fa-arrow-down"></i></td>
                  <td>Afficher la semaine actuelle</td>
              </tr>

              </tr>
              <tr>
                  <td><code>Esc</code></td>
                  <td>Fermer la fenêtre || Annuler la création de tâche</td>
              </tr>
              <tr>
                  <td><code>1, 2, 3, 4, 5</code></td>
                  <td>Choisir une couleur pour la création de tâche ||
                      Trier les tâches par couleur</td>
              </tr>
          </tbody>
      </table>
    </div>

    `;

        const closeBtn = help.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        const closeOnOverlayClick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };

        const closeOnEscapeKey = (e) => {
            if (e.key === 'Escape' || e.key === "h") {
                overlay.remove();
            }
        };

        overlay.appendChild(help);
        this.shadowRoot.appendChild(overlay);

        setTimeout(() => {
            overlay.classList.add('show');
            help.classList.add('show');
        }, 10);

        overlay.addEventListener('click', closeOnOverlayClick);
        document.addEventListener('keydown', closeOnEscapeKey);

    }

    /**
     * execute createAndResizeTask when click sur calendrier (grid)
     */
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

    // LOCALSTORAGE FUNCTIONS
    /**
     * @returns liste des taches parse dans localstorage
     */
    loadTasksFromLocalStorage() {
        const storedJSON = JSON.parse(localStorage.getItem("tasks")) || [];
        return storedJSON.map(obj =>
            new Task(obj._id, new Date(obj._date), obj._title, obj._startTime,
                obj._endTime, obj._description, obj._color)
        );
    }

    /**
     * sauvegarde this.tasks dans localstorage format JSON
     */
    saveTasksToLocalStorage() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    }

    // TASK MANIPULATION FUNCTIONS
    /**
     * attache au calendrier 
     * cree tache onclick
     * while holding mouse, resize task upward/downward
     */
    createAndResizeTask() {
        const calendar = this.shadowRoot.querySelector(".calendar");
        let isDrawing = false;
        let startX, startY;
        let currentTask = null;
        let currentElement = null;
        let task;

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
            this.tasks = this.loadTasksFromLocalStorage();
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
            this.tasks = this.loadTasksFromLocalStorage();
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
                const taskTitle = "(untitled task)";
                const description = "";

                let selectedColor = "#FFFAC8"; // Default color

                if (this.selectedColors.size === 1) {
                    selectedColor = Array.from(this.selectedColors)[0]; // Only assign if there's exactly one color
                }

                task = new Task(taskId, taskDate, taskTitle, startTime, endTime, description, selectedColor);

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
                title.classList.add('title');
                title.textContent = task.title;
                taskEl.appendChild(title);

                const time = document.createElement("div");
                time.classList.add("time");
                time.textContent =
                    `${this.formatTime(task.startTime)} - ${this.formatTime(task.endTime)}`;
                taskEl.appendChild(time);

                if (this.selectedColors.size == 1 && selectedColor != null) {
                    taskEl.style.backgroundColor = selectedColor;
                } else {
                    taskEl.style.backgroundColor = "#FFFAC8";
                }

                this.addResizeHandles(taskEl);
                this.addRemoveButton(taskEl);
                this.dragAndDrop(taskEl, task);

                taskEl.addEventListener('click', (e) => {
                    if (!e.target.classList.contains("resize-handle") &&
                        !e.target.classList.contains("remove-btn") &&
                        !taskEl.classList.contains('dragging')) {
                        this.showTaskForm(task);
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
                this.tasks = this.loadTasksFromLocalStorage();
            }
        };

        calendar.addEventListener('mousedown', onMouseDown);
    }

    /**
     * drag tasks and drop them else where with mouse
     * @param {*} taskEl reference element html a modifer les prop top et height
     * @param {*} task   reference objet task, modifier les properties
     */
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
                // short click - do nothing
            } else if (isDragging) {
                const rect = taskEl.getBoundingClientRect();
                const calendarRect = calendar.getBoundingClientRect();

                if (rect.top < calendarRect.top) {
                    taskEl.style.top = `0px`;
                }

                if (rect.left < calendarRect.left || rect.left < 0) {
                    taskEl.style.left = '0px';
                } else if (rect.right > calendarRect.right) {
                    taskEl.style.left = `${calendar.clientWidth - taskEl.offsetWidth}px`;
                }

                let taskTop = taskEl.getBoundingClientRect().top - calendarRect.top;
                let startTime = Math.max(Math.floor((taskTop / calendar.clientHeight) * 1440), 0);
                startTime = Math.round(startTime / 15) * 15;

                if (startTime < 0) {
                    startTime = 0;
                }

                const dayWidth = calendar.clientWidth / 7;
                let clientX = e.clientX;

                if (clientX < 70) {
                    clientX = 70;
                } else if (clientX > calendar.clientWidth) {
                    clientX = calendar.clientWidth;
                }

                const dayIndex = Math.floor((clientX - calendarRect.left) / dayWidth);

                const newDate = new Date(this.currentDate);
                newDate.setDate(this.currentDate.getDate() + dayIndex);

                let endTime = startTime + task.duration;
                if (endTime > 1440) { // 1440 minutes = 24 hours
                    endTime = 1440;
                    startTime = endTime - task.duration;
                }

                taskObj.date = newDate;
                taskObj.startTime = startTime;
                taskObj.endTime = endTime;

                taskTop = (startTime / 1440) * calendar.clientHeight;
                taskEl.style.top = `${taskTop}px`;

                this.saveTasksToLocalStorage();
                this.tasks = this.loadTasksFromLocalStorage();
                this.renderTasks();
            }

            taskEl.classList.remove('dragging');
            isDragging = false;

            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onMouseDown = (e) => {
            const taskId = e.target.closest(".task").getAttribute("data-id");
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

    /**
     * 
     * @param {*} e evennement
     * @param {*} context soit resize ou create le calcul differe
     * @returns calcule et retourne la position x et y relatif a l'elemenet calendrier (grid)
     */
    calculatePosition(e, context) {
        const calendar = this.shadowRoot.querySelector(".calendar");
        const rect = calendar.getBoundingClientRect();

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

    /**
     * affiche un formulaire taches onclick
     * @param {*} task trouve la tache a modifier
     */
    showTaskForm(task) {
        if (this.isDragging) { return; }

        const overlay = document.createElement('div');
        overlay.className = 'overlay';

        let darkModeOn = this.isDarkModeOn() ? "dark-mode" : 'light-mode';

        const form = document.createElement('form');
        form.classList.add("form", `${darkModeOn}`);
        form.innerHTML = `
    <div class="form-close-button">✕</div>
    <label>Date: <input type="date" name="date" value="${this.formatDate(task.date)}" required></label>
    <label>Titre: <input type="text" name="title" value="${task.title}" required></label>
    <label>Heure debut: <input type="time" name="startTime" value="${this.convertMinutesToTime(task.startTime)}" required></label>
    <label>Heure fin: <input type="time" name="endTime" value="${this.convertMinutesToTime(task.endTime)}" required></label>
    <div class="duration-display"></div>
    <label>Description: <textarea name="description" rows="6" cols="60">${task.description}</textarea></label>
    <div>
      <p>Couleur Tache:</p>
      <ul class="color-tags-container ${darkModeOn}" style="display: flex; justify-content: center; align-items: center;">
        <li class="color-tags" data-color="#FFB3BA" style="background-color: #FFB3BA;"></li>
        <li class="color-tags" data-color="#B3E2CD" style="background-color: #B3E2CD;"></li>
        <li class="color-tags" data-color="#D4C4FB" style="background-color: #D4C4FB;"></li>
        <li class="color-tags" data-color="#FFFAC8" style="background-color: #FFFAC8;"></li>
        <li class="color-tags" data-color="#BAE1FF" style="background-color: #BAE1FF;"></li>
      </ul>
      <input type="hidden" name="color" id="color-input" value="${task.color}">
    </div>
    <button type="submit">Save</button>
    <div class="error-message"></div>
    `;

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.focus();

        const updateTimeDisplay = () => {
            const startTimeInput = form.querySelector('input[name="startTime"]');
            const endTimeInput = form.querySelector('input[name="endTime"]');
            const durationDisplay = form.querySelector('.duration-display');

            const startTime = this.convertTimeToMinutes(startTimeInput.value);
            let endTime = this.convertTimeToMinutes(endTimeInput.value);

            if (!endTimeInput.value) {
                endTime = 1440;
            }

            const duration = endTime - startTime;

            durationDisplay.textContent = duration > 0 ?
                `Durée : ${Math.floor(duration / 60)} heures ${duration % 60} minutes` :
                'Durée : 0 heures 0 minutes';

        };

        const colorInput = form.querySelector('#color-input');
        form.querySelectorAll(".color-tags").forEach(btn => {
            if (btn.getAttribute("data-color") === task.color) {
                btn.classList.add('selected');
            }
            btn.addEventListener('click', () => {
                form.querySelectorAll(".color-tags").forEach(el => el.classList.remove('selected'));
                btn.classList.add('selected');
                colorInput.value = btn.getAttribute("data-color");
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            const date = formData.get('date');
            const title = formData.get('title');
            const startTime = this.convertTimeToMinutes(formData.get('startTime'));
            let endTime = this.convertTimeToMinutes(formData.get('endTime'));
            const color = formData.get('color');
            const errorMessageElement = form.querySelector('.error-message');

            errorMessageElement.style.display = 'none';
            errorMessageElement.textContent = '';

            const selectedDate = new Date(date);
            if (isNaN(selectedDate.getTime())) {
                errorMessageElement.textContent = 'Veuillez sélectionner une date valide.';
                errorMessageElement.style.display = 'block';
                return;
            }

            if (startTime < 0 || startTime > 1440) {
                errorMessageElement.textContent = 'L\'heure de début doit être comprise entre 00:00 et 24:00.';
                errorMessageElement.style.display = 'block';
                return;
            }
            if (endTime < 0 || endTime > 1440) {
                errorMessageElement.textContent = 'L\'heure de fin doit être comprise entre 00:00 et 24:00.';
                errorMessageElement.style.display = 'block';
                return;
            }
            if (endTime <= startTime) {
                errorMessageElement.textContent = 'L\'heure de fin doit être supérieure à l\'heure de début.';
                errorMessageElement.style.display = 'block';
                return;
            }

            const taskIndex = this.tasks.findIndex(t => t.taskId == task.taskId);

            if (taskIndex > -1) {
                // met a jour les info si la tache existe
                this.tasks[taskIndex].title = title;
                this.tasks[taskIndex].date = selectedDate;
                this.tasks[taskIndex].description = formData.get('description');
                this.tasks[taskIndex].startTime = startTime;
                this.tasks[taskIndex].endTime = endTime;
                this.tasks[taskIndex].color = color;
            } else {
                // cree une nouvelle tache et push dans this.tasks
                task.title = title;
                task.date = selectedDate;
                task.description = formData.get('description');
                task.startTime = startTime;
                task.endTime = endTime;
                task.color = color;
                this.tasks.push(task);
            }

            this.saveTasksToLocalStorage();
            this.tasks = this.loadTasksFromLocalStorage();

            form.classList.add('close');
            setTimeout(() => {
                overlay.remove();
                this.renderTasks();
            }, 300);
        });

        const closeForm = (e) => {
            if (e.key === 'Escape' || e.target === overlay) {
                form.classList.add('close');
                setTimeout(() => {
                    overlay.remove();
                }, 300);
                document.removeEventListener('keydown', closeForm);
            }
        };

        const closeBtn = form.querySelector(".form-close-button");
        closeBtn.addEventListener("click", () => {
            form.classList.add('close');
            setTimeout(() => {
                overlay.remove();
                document.removeEventListener('keydown', closeForm);
            }, 300);
        });

        overlay.addEventListener('click', closeForm);

        document.addEventListener('keydown', closeForm);

        overlay.appendChild(form);
        this.shadowRoot.appendChild(overlay);

        setTimeout(() => {
            overlay.classList.add('show');
            form.classList.add('show');
        }, 10);

        updateTimeDisplay();
    }

    /**
     * ajoute btn de suppression a la tache
     * @param {*} taskEl reference elemnt html
     */
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
                this.tasks = this.loadTasksFromLocalStorage();

                this.renderTasks();
            }, { once: true });
        });

        taskEl.appendChild(removeBtn);
    }

    /**
     * Adds resizing handles to task html element
     * @param {*} taskEl ref elemnt html
     */
    addResizeHandles(taskEl) {
        const topHandle = document.createElement("div");
        const bottomHandle = document.createElement("div");

        let darkModeOn;
        if (this.isDarkModeOn()) darkModeOn = "dark-mode";

        topHandle.classList.add("resize-handle", "top-handle", `${darkModeOn}`);
        bottomHandle.classList.add("resize-handle", "bottom-handle", `${darkModeOn}`);

        topHandle.addEventListener("mousedown", (e) =>
            this.resize(e)
        );
        bottomHandle.addEventListener("mousedown", (e) =>
            this.resize(e)
        );

        taskEl.appendChild(topHandle);
        taskEl.appendChild(bottomHandle);
    }

    /**
     * allows for using resize handles to resize
     * the html elment
     * @param {*} e evennement
     */
    resize(e) {
        e.preventDefault();
        e.stopPropagation();
        this.isResizing = true;
        const direction = e.target.classList.contains("top-handle") ? "top" : "bottom";
        const taskEl = e.target.parentElement;
        const taskId = taskEl.getAttribute("data-id");
        this.tasks = this.loadTasksFromLocalStorage();
        const taskObj = this.tasks.find(t => t.taskId == taskId);
        const slotHeight = this.shadowRoot.querySelector(".time-slot:not(.time-header)").clientHeight;
        const minTaskHeight = slotHeight / 2; // Minimum task height is now 30 minutes
        const calHeight = this.shadowRoot.querySelector(".calendar").clientHeight;

        let initY = this.calculatePosition(e, "resize").y;
        let initialHeight = taskEl.offsetHeight;
        let initialTop = taskEl.offsetTop;
        let initialStartTime = taskObj.startTime;
        let initialEndTime = taskObj.endTime;

        const onMouseMove = (moveEvent) => {
            let currentY = this.calculatePosition(moveEvent, "resize").y;
            let heightChange = currentY - initY;
            let newHeight = initialHeight + heightChange;

            if (direction === "top") {
                newHeight = initialHeight - heightChange;
                let newTop = initialTop + heightChange;

                if (newHeight < minTaskHeight) {
                    newHeight = minTaskHeight;
                    newTop = initialTop + (initialHeight - minTaskHeight);
                }

                if (newTop + newHeight > initialTop + initialHeight) {
                    newTop = initialTop + initialHeight - minTaskHeight;
                    newHeight = minTaskHeight;
                }

                taskEl.style.top = `${newTop}px`;
                taskObj.startTime = initialStartTime + (heightChange / slotHeight) * 60;

            } else if (direction == "bottom") {
                if (newHeight < minTaskHeight) {
                    newHeight = minTaskHeight;
                }

                if (currentY >= calHeight) {
                    currentY = calHeight;
                }

                if (initialTop + newHeight < initialTop + minTaskHeight) {
                    newHeight = minTaskHeight;
                }

                taskObj.endTime = initialEndTime + (heightChange / slotHeight) * 60;
            }

            taskEl.style.height = `${newHeight}px`;
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (taskObj.endTime > 1440) taskObj.endTime = 1440;
            if (taskObj.startTime < 0) taskObj.startTime = 0;

            // Ensure minimum 30-minute duration
            if (taskObj.endTime - taskObj.startTime < 30) {
                if (direction === "top") {
                    taskObj.startTime = taskObj.endTime - 30;
                } else {
                    taskObj.endTime = taskObj.startTime + 30;
                }
            }

            this.saveTasksToLocalStorage();
            this.tasks = this.loadTasksFromLocalStorage();
            this.renderTasks();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    /**
     * dimensions des slots qui composent le grid du calendrier 
     * @returns {width, height}
     */
    getSlotDimensions() {
        const slot = this.shadowRoot.
        querySelector(".time-slot:not(.time-header)");
        return {
            width: slot.clientWidth,
            height: slot.clientHeight,
        };
    }

    // FORMATTING FUNCTIONS
    /**
     * formate la date pour rajouter a l'attribut value dans le form html
     * de this.ghowTaskForm();
     * @param {*} dateString 
     * @returns date formattee
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * @param {*} minutes 
     * @returns formatee en heure
     */
    convertMinutesToTime(minutes) {
        const hours = String(Math.floor(minutes / 60)).padStart(2, '0');
        const mins = String(minutes % 60).padStart(2, '0');
        return `${hours}:${mins}`;
    }

    /**
     * @param {*} time 
     * @returns calcule en minutes
     */
    convertTimeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }

    /**
     * @param {*} minutes 
     * @returns heure formatee
     */
    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    /**
     * @returns html de base pour le web componenet
     */
    getTemplate() {
        return `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap" rel="stylesheet">

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
  font-family: "Geist Mono", monospace;
  font-optical-sizing: auto;
  font-style: normal;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
  border: 1px solid White;
}

.day-header {
  font-size: 16px;
  font-weight: bold;
  height: 50px;
  min-width: 50px;
  overflow: hidden;
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
  max-height: calc(100vh - 150px);
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-width: none;
  border: 1px solid White;
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
  border: 1px solid White;
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
  min-width: 50px;
}

                                /* TASK ELEMENT LAYOUT */
.task {
  position: absolute;
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
  color: #333; 
  text-align: left;
}

.time {
  font-size: 10px; 
  color: #333; 
  text-align: left;
}

.description {
  font-size: 10px; 
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

.task {
  transition: opacity 0.5s ease-in-out;
}

.fade-in {
  opacity: 0;
  animation: fadeIn 0.5s forwards;
}

.fade-out {
  animation: fadeOut 0.5s forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}

                              /* REMOVE BUTTON STYLES */
.remove-btn {
  position: absolute;
  width: 15px;
  height: 15px;
  top: 6px;
  right: 6px;
  cursor: pointer;
  padding: 3px;
  background-color: #000000;
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
  width: 40%;
  height: 10px;
  border-radius: 5px;
  border: solid black;
  background-color: black;
  cursor: grab;
  transition: background-color 0.3s ease, border 0.3s ease !important; 
}

.resize-handle:hover {
  background-color: white; /* Change color to white */
  border: solid white; /* Change border to white */
  cursor: ns-resize;
}

.top-handle {
  top: calc(0% - ( var(--task-width) / 2));
  left: calc(50% - ( 40% / 2));
}

.bottom-handle {
  top: calc(100% - (var(--task-width) / 2));
  left: calc(50% - ( 40% / 2));
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
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.overlay.show {
  opacity: 1;
  pointer-events: all;
}

.form {
  background-color: #ffffff;
  padding: 20px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: relative;
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.form.show {
  opacity: 1;
  transform: scale(1);
}

.form.close {
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.form-close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 15px;
  height: 15px;
  cursor: pointer;
  background-color: #000000;
  color: #ffffff;
  border-radius: 50%;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  border: none;
}

/* General label styling */
.form label {
  display: flex;
  flex-direction: column;
  font-size: 14px;
  font-weight: bold;
  color: #333333;
}

/* Input and textarea styling */
.form input[type="text"],
.form input[type="date"],
.form input[type="time"],
.form textarea,
.form input[type="color"] {
  font-size: 14px;
  padding: 10px;
  margin-top: 5px;
  border: 1px solid #cccccc;
  border-radius: 5px;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.3s ease;
}

.form input[type="text"]:focus,
.form input[type="date"]:focus,
.form input[type="time"]:focus,
.form textarea:focus,
.form input[type="color"]:focus {
  border-color: #007bff;
  outline: none;
}

.form textarea {
  resize: vertical;
  height: auto;
}

.form button[type="submit"] {
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
  color: #ffffff;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.form button[type="submit"]:hover {
  background-color: #0056b3;
}

/* Duration display styling */
.duration-display {
  font-size: 14px;
  color: #666666;
}

/* Error message styling */
.error-message {
  color: #e63946;
  font-size: 14px;
  display: none;
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
  box-sizing: border-box;
  height: 50px;
  overflow: hidden;
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

.color-tags-container {
  display: flex;
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: #4a90e2; 
  padding: 5px 10px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  height: 35px;
}

.color-tags-label {
  color: #ffffff;
  font-weight: bold;
  margin-right: 10px;
  font-size: 14px;
}

.color-tags {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin: 0 5px;
  cursor: pointer;
  transition: transform 0.3s ease;
  border: 2px solid transparent; 
}

.color-tags:hover {
  transform: scale(1.2);
}

.color-tags.selected {
  transform: scale(0.7);
}

.theme-switch-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px; /* Space between the elements */
  font-size: 16px; 
  color: #ffffff;
  background-color: #4a90e2; 
  padding: 5px 10px;
  border-radius: 5px;
  height: 35px;
  width: 200px;
  margin-right: 10px;
}
.color-tags-container.dark-mode {
  background-color: #000000; 
}
.theme-switch-container.dark-mode {
  background-color: #000000; 
}

.theme-state {
  font-weight: bold;
  font-size: 1rem;
  transition: color 0.3s ease;
}

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

/* Hover effect */
.button-hover {
  animation: hoverAnimation 0.15s ease-out forwards;
}

/* Click effect */
.button-click {
  animation: clickAnimation 0.1s ease-out forwards;
}

@keyframes hoverAnimation {
  0% {
    transform: scale(1);
    background-color: #ddd;
  }
  100% {
    transform: scale(1.05); /* Slight scale to give hover effect */
    background-color: #ccc; /* Hover color */
  }
}

@keyframes clickAnimation {
  0% {
    transform: scale(1);
    background-color: #bbb;
  }
  50% {
    transform: scale(0.95);
    background-color: #aaa; /* Slight darkening effect */
  }
  100% {
    transform: scale(1);
    background-color: #bbb; /* Reset to initial color */
  }
}


                       
                            /* DARK MODE 

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
  border: 1px solid Grey;
}

.time-header.dark-mode {
  background-color: #1f1f1f;
  border: 1px solid Grey;
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

                                            /* HELP BUTTON */
.help-btn {
  position: fixed; 
  bottom: 20px;
  right: 20px;
  background-color: #4a90e2;
  color: white;
  font-size: 24px;
  height: 60px;
  width: 60px; 
  border-radius: 50%; 
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
  transition: background-color 0.3s, transform 0.2s; 
  z-index: 10;
}

.help-btn.dark-mode {
  background-color: #6200ea;  
}

.help-btn:hover {
  transform: scale(1.1);
  cursor: pointer;
}

.help-btn i {
  pointer-events: none;
}

/* HELP WINDOW */
/* General Styles for Help Window */
.help-window {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  width: 80%;
  max-width: 600px;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

/* Show the help window with a smooth animation */
.help-window.show {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

/* Dark Mode Styles */
.help-window.dark-mode {
  background-color: #333;
  color: white;
  border: 1px solid #555;
}

.help-window.dark-mode .help-header h2 {
  color: white;
}

.help-window.dark-mode .help-content table {
  background-color: #444;
}

.help-window.dark-mode .help-content table th,
.help-window.dark-mode .help-content table td {
  color: white;
  border: 1px solid #555;
}

.help-window.dark-mode .help-content table th {
  background-color: #555;
}

.help-window.dark-mode .help-content table tr:nth-child(even) {
  background-color: #555;
}

.help-window.dark-mode .close-btn {
  color: white;
}

/* Light Mode Styles */
.help-window {
  background-color: white;
  color: black;
  border: 1px solid #ddd;
}

.help-window .help-header h2 {
  color: black;
}

.help-window .help-content table {
  background-color: #fff;
}

.help-window .help-content table th,
.help-window .help-content table td {
  color: black;
  border: 1px solid #ddd;
}

.help-window .help-content table th {
  background-color: #f4f4f4;
}

.help-window .help-content table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.help-window .close-btn {
  color: black;
}

/* Help Window Header */
.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.help-header h2 {
  margin: 0;
}

/* Close Button */
.close-btn {
  background: none !important;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: inherit;
}

/* Help Content */
.help-content {
  margin-top: 20px;
}

.help-content table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;
}

.help-content table th,
.help-content table td {
  padding: 10px;
  border: 1px solid #ddd;
  text-align: left;
}

.help-content table th {
  background-color: #f4f4f4;
}

.help-content table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.help-content table code {
  padding: 2px 4px;
  border-radius: 4px;
}

/* Apply Dark Mode for Help Content when button toggles dark mode */
.help-content.dark-mode table {
  background-color: #444;
}

.help-content.dark-mode table th,
.help-content.dark-mode table td {
  color: white;
  border: 1px solid #555;
}

.help-content.dark-mode table th {
  background-color: #555;
}

.help-content.dark-mode table tr:nth-child(even) {
  background-color: #555;
}


</style>
    
<div class="container">

  <div class="navbar">

    <div class="theme-switch-container" title="switcher le theme couleur d'affichage">
      <div class="theme-state">Mode sombre</div>
      <label class="switch">
        <input type="checkbox" id="dark-mode-toggle" checked>
        <span class="slider"></span>
      </label>
    </div>

    <div title="filtrer les taches en fonction de la couleur">
      <ul class="color-tags-container">
        <li class="color-tags-label">Tags Couleurs</li>
        <li class="color-tags" data-color="#FFB3BA" style="background-color: #FFB3BA;" title="filtre rouge"></li>
        <li class="color-tags" data-color="#B3E2CD" style="background-color: #B3E2CD;" title="filtre vert"></li>
        <li class="color-tags" data-color="#D4C4FB" style="background-color: #D4C4FB;" title="filtre violet"></li>
        <li class="color-tags" data-color="#FFFAC8" style="background-color: #FFFAC8;" title="filtre jaune"></li>
        <li class="color-tags" data-color="#BAE1FF" style="background-color: #BAE1FF;" title="filtre bleu"></li>
      </ul>
    </div>

    <div class="month-year-display accentuated"></div>

    <button class="prev-week-btn" title="Afficher la semaine précédente"><i class="fas fa-arrow-left"></i></button>
    <button class="next-week-btn" title="Afficher la semaine suivante"><i class="fas fa-arrow-right"></i></button>
    <button class="today-btn" title="Revenir à la date actuelle"><i class="fas fa-calendar-day"></i></button>

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

  <div class="help-btn">
      <i class="fas fa-question-circle"></i>
  </div>

</div>
    `;
    }
}

customElements.define("week-calendar", WeekDisplay);