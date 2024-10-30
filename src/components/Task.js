class Task {
  constructor(id, date, descrip, startTime, endTime) {
    this._id = id;
    this._date = date;
    this._description = descrip;
    // time is stored in minutes 0 => 1440
    this._startTime = startTime;
    this._endTime = endTime;
  }
  get taskId() { return this._id; }
  set taskId(id) { this._id = id; }

  get duration() { return this._endTime - this._startTime; }
  set duration(h) { this._height = h; }

  get startTime() { return this._startTime; }
  set startTime(st) { this._startTime = st; }

  get endTime() { return this._endTime; }
  set endTime(et) { this._endTime = et; }

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
  get date() { return this._date; };
  set date(d) { this._date = d; };
}
