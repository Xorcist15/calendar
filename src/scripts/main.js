// HTML Elements used
// const dropdownDisplaySelector = document.getElementById("display-selector");
const btnCurrentDay = document.getElementById("button-today");
const btnPrev = document.getElementById("button-previous");
const btnNext = document.getElementById("button-next");
const planningCalendar = document.getElementById("planning-calendar");

// Global state to track the current display type
let currentDisplayType = 'day'; // Default display type

// Initialize the currentDate variable to today's date
let currentDate = new Date();

// Event listeners for buttons
btnCurrentDay.addEventListener('click', goToToday);
btnPrev.addEventListener('click', () => navigate('prev'));
btnNext.addEventListener('click', () => navigate('next'));

// Event listener for dropdown to change display
// dropdownDisplaySelector.addEventListener('change', changeDisplay);

// Function to change display based on dropdown selection
// function changeDisplay() {
//   // const selectedValue = dropdownDisplaySelector.value;
//   switch (selectedValue) {
//     case '1':
//       currentDisplayType = 'day';
//       break;
//     case '2':
//       currentDisplayType = 'week';
//       break;
//     case '3':
//       currentDisplayType = 'month';
//       break;
//     case '4':
//       currentDisplayType = 'year';
//       break;
//     default:
//       return; // Early return if no valid display type
//   }
//
//   // Empty content of planning calendar
//   planningCalendar.replaceChildren();
//
//   // Create and append the new calendar
//   const newCalendar = document.createElement(`${currentDisplayType}-calendar`);
//   planningCalendar.appendChild(newCalendar);
//
//   console.log(`${currentDisplayType} display`);
// }

// Central navigation function
function navigate(direction) {
  const weekCalendar = document.querySelector('week-calendar');
  switch (currentDisplayType) {
    case 'day':
      direction === 'next' ? goToNextDay() : goToPreviousDay();
      break;
    case 'week':
      direction === 'next' ? weekCalendar.goToNextWeek() : weekCalendar.goToPreviousWeek();
      break;
    case 'month':
      direction === 'next' ? goToNextMonth() : goToPreviousMonth();
      break;
    case 'year':
      direction === 'next' ? goToNextYear() : goToPreviousYear();
      break;
  }
}

// Example navigation functions for different display types
function goToToday() {
  currentDate = new Date(); // Reset the date to today
  updateDayHeader(currentDate);

  const weekCalendar = document.querySelector('week-calendar');
  if (weekCalendar) {
    weekCalendar.goToToday();
  }
}

function goToNextDay() {
  currentDate.setDate(currentDate.getDate() + 1); // Go to the next day
  updateDayHeader(currentDate);
}

function goToPreviousDay() {
  currentDate.setDate(currentDate.getDate() - 1); // Go to the previous day
  updateDayHeader(currentDate);
}

function goToNextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1); // Go to the next month
  updateDayHeader(currentDate);
}

function goToPreviousMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1); // Go to the previous month
  updateDayHeader(currentDate);
}

function goToNextYear() {
  currentDate.setFullYear(currentDate.getFullYear() + 1); // Go to the next year
  updateDayHeader(currentDate);
}

function goToPreviousYear() {
  currentDate.setFullYear(currentDate.getFullYear() - 1); // Go to the previous year
  updateDayHeader(currentDate);
}

// Function to update the day header
function updateDayHeader(date) {
  const dayDisplay = document.querySelector("day-calendar");
  if (dayDisplay) {
    const dayHeader = dayDisplay.shadowRoot.querySelector(".day-header");
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString(undefined, options);
    dayHeader.textContent = formattedDate;
    console.log("set date:", formattedDate);
  }
}

// Initialize the display to today's date on page load
document.addEventListener('DOMContentLoaded', () => {
  updateDayHeader(currentDate);
  const weekCalendar = document.querySelector('week-calendar');
  if (weekCalendar) {
    // weekCalendar.goToToday();
  }
});
