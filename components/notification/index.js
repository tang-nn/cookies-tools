class NotificationSystem {
  constructor() {
    this.container = document.createElement("div");
    this.container.id = "notification-root";
    document.body.appendChild(this.container);
  }

  show(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <svg class="icon" width="32" height="32" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
      <span>${message}</span>
    `;

    notification.style.animation = "notify 5s forwards";
    this.container.appendChild(notification);

    notification.addEventListener("animationend", () => {
      notification.remove();
    });
  }
}

export const notification = new NotificationSystem();
