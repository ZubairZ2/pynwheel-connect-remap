class MouseTracker {
  #position = { x: 0, y: 0 };
  #listeners = [];

  constructor() {
    document.addEventListener("mousemove", this.#handleMouseMove.bind(this));
  }

  #handleMouseMove(event) {
    this.update(event.screenX, event.screenY, event);
  }

  update(x, y, event) {
    this.#position = { x, y };
    this.#notify(event);
  }

  #notify(event) {
    for (const fn of this.#listeners) {
      fn({ ...this.#position, event });
    }
  }

  onChange(callback) {
    this.#listeners.push(callback);
  }

  getPosition() {
    return { ...this.#position };
  }
}
