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
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-width: 380px;
  pointer-events: none;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.2rem;
  border-radius: 0;
  background: rgba(10, 10, 12, 0.95);
  backdrop-filter: blur(16px);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-left: 4px solid currentColor;
  color: #ffffff;
  font-family: 'Space Grotesk', 'Inter', sans-serif;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  box-shadow: 
    4px 4px 0 rgba(0, 0, 0, 0.6),
    0 8px 24px rgba(0, 0, 0, 0.4);
  max-width: 360px;
  word-wrap: break-word;
  pointer-events: auto;
  position: relative;
  overflow: hidden;
  transform: skewX(-1deg);
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex: 1;
  transform: skewX(1deg);
}

.notification-content i {
  font-size: 1rem;
  flex-shrink: 0;
}

.notification-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  padding: 0.3rem;
  transition: all 0.15s ease;
  margin-left: 0.5rem;
  transform: skewX(1deg);
}

.notification-close:hover {
  color: #fff;
  transform: skewX(1deg) scale(1.2);
}

.notification-success {
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: #2ecc71;
  background: linear-gradient(135deg, rgba(46, 204, 113, 0.12) 0%, rgba(10, 10, 12, 0.95) 60%);
  color: #5dfa96;
}

.notification-error {
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: #ff4757;
  background: linear-gradient(135deg, rgba(255, 71, 87, 0.15) 0%, rgba(10, 10, 12, 0.95) 60%);
  color: #ff6b7a;
}

.notification-warning {
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: #ffa502;
  background: linear-gradient(135deg, rgba(255, 165, 2, 0.12) 0%, rgba(10, 10, 12, 0.95) 60%);
  color: #ffbe44;
}

.notification-info {
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: #70a1ff;
  background: linear-gradient(135deg, rgba(112, 161, 255, 0.12) 0%, rgba(10, 10, 12, 0.95) 60%);
  color: #93b8ff;
}

/* Progress bar animation */
.notification::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: currentColor;
  opacity: 0.6;
  animation: notificationProgress 3s linear forwards;
}

@keyframes notificationProgress {
  from { width: 100%; }
  to { width: 0%; }
}

/* Transition animations */
.notification-enter-active {
  transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.notification-leave-active {
  transition: all 0.25s cubic-bezier(0.55, 0, 1, 0.45);
}

.notification-enter-from {
  transform: translateX(110%) skewX(-1deg);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(110%) skewX(-1deg);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .notification-container {
    top: 0.75rem;
    right: 0.75rem;
    left: 0.75rem;
    max-width: none;
  }

  .notification {
    padding: 0.7rem 1rem;
    font-size: 0.8rem;
    max-width: none;
    transform: none;
  }

  .notification-content,
  .notification-close {
    transform: none;
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
    font-size: 0.78rem;
  }
}
</style>