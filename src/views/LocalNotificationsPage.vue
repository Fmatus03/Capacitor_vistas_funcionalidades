<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Notificaciones locales</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-button expand="block" router-link="/notifications/quick" color="secondary">
        Abrir notificación inmediata
      </ion-button>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Permisos</ion-card-title>
          <ion-card-subtitle>Requeridos para mostrar notificaciones</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-item lines="none">
            <ion-label>
              <h2>{{ permissionStatusLabel }}</h2>
              <p v-if="permissionSuggestion">{{ permissionSuggestion }}</p>
            </ion-label>
            <ion-button fill="clear" slot="end" @click="refreshPermission">
              Refrescar
            </ion-button>
          </ion-item>
          <ion-button
            v-if="permissionStatus !== 'granted'"
            expand="block"
            color="primary"
            @click="requestPermission"
          >
            Solicitar permiso
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Programar notificación</ion-card-title>
          <ion-card-subtitle>Configura el contenido y el retraso</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-list lines="full">
            <ion-item>
              <ion-label position="stacked">Título</ion-label>
              <ion-input v-model="form.title" placeholder="Recordatorio" />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Mensaje</ion-label>
              <ion-textarea
                v-model="form.body"
                placeholder="Tu notificación se ha programado."
                auto-grow
              />
            </ion-item>
            <ion-item>
              <ion-label position="stacked">Retraso (segundos)</ion-label>
              <ion-input
                v-model="form.delaySeconds"
                type="number"
                inputmode="numeric"
                placeholder="0"
              />
            </ion-item>
            <ion-item lines="none">
              <ion-label>Permitir durante modo reposo</ion-label>
              <ion-toggle slot="end" v-model="form.allowWhileIdle" />
            </ion-item>
          </ion-list>

          <ion-button
            expand="block"
            :disabled="scheduling"
            @click="scheduleNotification"
          >
            {{ scheduling ? 'Programando…' : 'Programar notificación' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Notificaciones pendientes</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item lines="none">
            <ion-label>Hay {{ pendingNotifications.length }} pendiente(s).</ion-label>
            <ion-button fill="clear" slot="end" @click="loadPending">
              Actualizar
            </ion-button>
          </ion-item>

          <div v-if="pendingNotifications.length">
            <ion-list lines="full">
              <ion-item
                v-for="notification in pendingNotifications"
                :key="notification.id"
              >
                <ion-label>
                  <h3>{{ notification.title || 'Sin título' }}</h3>
                  <p>{{ describeSchedule(notification.schedule) }}</p>
                </ion-label>
                <ion-button
                  fill="clear"
                  color="danger"
                  slot="end"
                  @click="cancelNotification(notification.id)"
                >
                  Cancelar
                </ion-button>
              </ion-item>
            </ion-list>
            <ion-button
              expand="block"
              color="danger"
              fill="outline"
              @click="cancelAllPending"
            >
              Cancelar todas
            </ion-button>
          </div>
          <ion-text color="medium" v-else>
            No hay notificaciones programadas.
          </ion-text>
        </ion-card-content>
      </ion-card>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2500"
        @didDismiss="toastOpen = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonTextarea,
  IonTitle,
  IonToast,
  IonToolbar,
  IonToggle,
  IonText,
} from '@ionic/vue';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import {
  LocalNotifications,
  type PendingLocalNotificationSchema,
  type PermissionStatus,
  type Schedule,
} from '@capacitor/local-notifications';
import type { PluginListenerHandle } from '@capacitor/core';

const permissionStatus = ref<PermissionStatus['display']>('prompt');
const pendingNotifications = ref<PendingLocalNotificationSchema[]>([]);
const scheduling = ref(false);
const toastOpen = ref(false);
const toastMessage = ref('');
const listeners: PluginListenerHandle[] = [];

const form = reactive({
  title: 'Recordatorio de ejemplo',
  body: 'Esto es una notificación local programada desde Ionic.',
  delaySeconds: '5',
  allowWhileIdle: true,
});

const permissionStatusLabel = computed(() => {
  switch (permissionStatus.value) {
    case 'granted':
      return 'Permiso concedido';
    case 'denied':
      return 'Permiso denegado';
    case 'prompt-with-rationale':
      return 'Permiso pendiente (se requiere justificación)';
    case 'prompt':
    default:
      return 'Permiso pendiente';
  }
});

const permissionSuggestion = computed(() => {
  if (permissionStatus.value === 'granted') {
    return 'Ya puedes programar notificaciones locales.';
  }
  if (permissionStatus.value === 'denied') {
    return 'Ve a los ajustes del sistema para habilitar las notificaciones.';
  }
  return 'Solicita el permiso antes de programar notificaciones.';
});

const presentToast = (message: string) => {
  toastMessage.value = message;
  toastOpen.value = true;
};

const refreshPermission = async () => {
  try {
    const status = await LocalNotifications.checkPermissions();
    permissionStatus.value = status.display;
  } catch (error) {
    console.error('Error checking notification permission', error);
    presentToast('No se pudo verificar el estado del permiso.');
  }
};

const requestPermission = async () => {
  try {
    const status = await LocalNotifications.requestPermissions();
    permissionStatus.value = status.display;
    if (status.display === 'granted') {
      presentToast('Permiso concedido.');
    } else {
      presentToast('El permiso sigue pendiente.');
    }
  } catch (error) {
    console.error('Error requesting notification permission', error);
    presentToast('No se pudo solicitar el permiso.');
  }
};

const loadPending = async () => {
  try {
    const result = await LocalNotifications.getPending();
    pendingNotifications.value = result.notifications ?? [];
  } catch (error) {
    console.error('Error loading pending notifications', error);
    presentToast('No se pudo obtener la lista de notificaciones.');
  }
};

const scheduleNotification = async () => {
  if (permissionStatus.value !== 'granted') {
    presentToast('Debes conceder permisos antes de programar notificaciones.');
    return;
  }

  const parsedDelay = Number(form.delaySeconds);
  const delay = Number.isFinite(parsedDelay) && parsedDelay > 0 ? parsedDelay : 0;

  const notificationId = Math.floor(Date.now() / 1000); // Use seconds to stay within Android int range
  const scheduleConfig: Schedule | undefined = delay
    ? {
        at: new Date(Date.now() + delay * 1000),
        allowWhileIdle: form.allowWhileIdle,
      }
    : undefined;

  scheduling.value = true;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title: form.title.trim() || 'Recordatorio',
          body: form.body.trim() || 'Tu notificación se programó correctamente.',
          id: notificationId,
          schedule: scheduleConfig,
          actionTypeId: 'default_actions',
          extra: {
            createdAt: new Date().toISOString(),
            targetRoute: '/home',
          },
        },
      ],
    });

    if (delay) {
      const when = scheduleConfig?.at ?? new Date(Date.now() + delay * 1000);
      presentToast(`Notificación programada para ${when.toLocaleString()}.`);
    } else {
      presentToast('Notificación enviada inmediatamente.');
    }
    await loadPending();
  } catch (error) {
    console.error('Error scheduling notification', error);
    presentToast('No se pudo programar la notificación.');
  } finally {
    scheduling.value = false;
  }
};

const cancelNotification = async (id: number) => {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id }],
    });
    presentToast(`Notificación ${id} cancelada.`);
    await loadPending();
  } catch (error) {
    console.error('Error canceling notification', error);
    presentToast('No se pudo cancelar la notificación.');
  }
};

const cancelAllPending = async () => {
  if (!pendingNotifications.value.length) {
    presentToast('No hay notificaciones para cancelar.');
    return;
  }

  try {
    const descriptors = pendingNotifications.value.map(notification => ({ id: notification.id }));
    await LocalNotifications.cancel({ notifications: descriptors });
    presentToast('Todas las notificaciones pendientes fueron canceladas.');
    await loadPending();
  } catch (error) {
    console.error('Error canceling all notifications', error);
    presentToast('No se pudieron cancelar todas las notificaciones.');
  }
};

const describeSchedule = (schedule?: Schedule) => {
  if (!schedule) {
    return 'Se mostrará de inmediato.';
  }

  if (schedule.at) {
    const at = typeof schedule.at === 'string' ? new Date(schedule.at) : schedule.at;
    return `Programada para ${at.toLocaleString()}.`;
  }

  if (schedule.every) {
    return `Se repetirá cada ${schedule.every}.`;
  }

  if (schedule.on) {
    return 'Programación personalizada con reglas específicas.';
  }

  return 'Programación personalizada.';
};

onMounted(async () => {
  await refreshPermission();
  await loadPending();

  try {
    const receivedHandle = await LocalNotifications.addListener(
      'localNotificationReceived',
      notification => {
        presentToast(`Notificación recibida: ${notification.title ?? notification.id}`);
        loadPending();
      }
    );
    listeners.push(receivedHandle);

    const actionHandle = await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      () => {
        loadPending();
      }
    );
    listeners.push(actionHandle);
  } catch (error) {
    console.error('Error registering notification listeners', error);
  }
});

onUnmounted(() => {
  listeners.forEach(listener => listener.remove());
});
</script>

<style scoped>
ion-card + ion-card {
  margin-top: 16px;
}

ion-text {
  display: block;
  margin-top: 8px;
}
</style>
