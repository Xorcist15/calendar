class Task {
  constructor(id, date, title, startTime, endTime, description, color) {
    this._id = id;
    this._date = date;
    this._title = title;
    // time is stored in minutes 0 => 1440
    this._startTime = startTime;
    this._endTime = endTime;
    this._description = description;
    // if color is undefined, set to defautl color
    if(color == null) {
      this._color = "#FFFAC8";
    } else {
      this._color = color;
    }
  }

  get taskId() { return this._id; }
  set taskId(id) { this._id = id; }

  get date() { return this._date; };
  set date(d) { this._date = d; };

  get title() { return this._title; }
  set title(t) { this._title = t; }

  get startTime() { return this._startTime; }
  set startTime(st) { this._startTime = st; }

  get endTime() { return this._endTime; }
  set endTime(et) { this._endTime = et; }

  get description() { return this._description; }
  set description(d) { this._description = d; }

  get color() { return this._color; }
  set color(c) { this._color = c; }

  get duration() { return this._endTime - this._startTime; }

  /**
   * returns day position based on day
   */
  get dayPosition() {
    const dayMap = {
      "Monday": 0,
      "Tuesday": 1,
      "Wednesday": 2,
      "Thursday": 3,
      "Friday": 4,
      "Saturday": 5,
      "Sunday": 6,
    };
    const dayName = this
      ._date.toLocaleString("en-US", { weekday: "long" });
    return dayMap[dayName];
  }
}
