<template>
  <div class="notification-container">
    <transition-group name="notification" tag="div">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        :class="[
          'notification',
          `notification-${notification.type}`
        ]"
      >
        <div class="notification-content">
          <i :class="getNotificationIcon(notification.type)"></i>
          <span>{{ notification.message }}</span>
        </div>
        <button 
          class="notification-close"
          @click="removeNotification(notification.id)"
          title="Fechar"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
// Props
const props = defineProps({
  notifications: Array
})

// Methods
const getNotificationIcon = (type) => {
  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    warning: 'fas fa-exclamation-triangle',
    info: 'fas fa-info-circle'
  }
  return icons[type] || icons.info
}

const removeNotification = (id) => {
  // Find and remove the notification from the array
  const index = props.notifications.findIndex(n => n.id === id)
  if (index > -1) {
    props.notifications.splice(index, 1)
  }
}
</script>

<style scoped>
.notification-container {
  position: fixed;
  top: 2rem;
  right: 2rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 400px;
  pointer-events: none;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-radius: 15px;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  max-width: 350px;
  word-wrap: break-word;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.notification-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.3s ease;
  margin-left: 0.5rem;
}

.notification-close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.notification-success {
  border-color: rgba(46, 204, 113, 0.5);
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.2), rgba(39, 174, 96, 0.2));
  color: #2ecc71;
}

.notification-error {
  border-color: rgba(231, 76, 60, 0.5);
  background: linear-gradient(135deg, rgba(231, 76, 60, 0.2), rgba(192, 57, 43, 0.2));
  color: #e74c3c;
}

.notification-warning {
  border-color: rgba(241, 196, 15, 0.5);
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(243, 156, 18, 0.2));
  color: #f1c40f;
}

.notification-info {
  border-color: rgba(52, 152, 219, 0.5);
  background: linear-gradient(135deg, rgba(52, 152, 219, 0.2), rgba(41, 128, 185, 0.2));
  color: #3498db;
}

/* Progress bar animation */
.notification::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  animation: notificationProgress 3s linear forwards;
}

@keyframes notificationProgress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* Transition animations */
.notification-enter-active {
  transition: all 0.5s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}

/* Responsive Design */
@media (max-width: 768px) {
  .notification-container {
    top: 1rem;
    right: 1rem;
    left: 1rem;
    max-width: none;
  }

  .notification {
    padding: 0.8rem 1rem;
    font-size: 0.8rem;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .notification-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }

  .notification {
    padding: 0.6rem 0.8rem;
    border-radius: 10px;
  }

  .notification-content {
    gap: 0.3rem;
  }
}
</style> 