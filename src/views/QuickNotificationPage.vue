<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Notificación inmediata</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-text color="primary">
        <h2>Probando notificaciones</h2>
        <p>Al abrir esta vista se dispara una notificación local inmediata.</p>
      </ion-text>

      <ion-card v-if="lastAttempt">
        <ion-card-header>
          <ion-card-title>Estado reciente</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{{ lastAttempt }}</p>
        </ion-card-content>
      </ion-card>

      <ion-button expand="block" fill="outline" @click="sendNow">
        Repetir notificación
      </ion-button>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2200"
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
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue';
import { onMounted, ref } from 'vue';
import { LocalNotifications } from '@capacitor/local-notifications';

const toastOpen = ref(false);
const toastMessage = ref('');
const lastAttempt = ref<string | null>(null);

const presentToast = (message: string) => {
  toastMessage.value = message;
  toastOpen.value = true;
};

const notifyPermissionIssue = () => {
  const message = 'Permisos no concedidos. Habilítalos para recibir la notificación.';
  lastAttempt.value = message;
  presentToast(message);
};

const sendNow = async () => {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') {
      notifyPermissionIssue();
      return;
    }

    const id = Math.floor(Date.now() / 1000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id,
          title: 'Notificación inmediata',
          body: 'Esta alerta se disparó al entrar en la pantalla.',
          actionTypeId: 'default_actions',
          extra: {
            triggeredFrom: 'QuickNotificationPage',
            at: new Date().toISOString(),
            targetRoute: '/home',
          },
        },
      ],
    });

    const message = `Notificación enviada (ID ${id}).`;
    lastAttempt.value = message;
    presentToast(message);
  } catch (error) {
    console.error('Immediate notification error', error);
    const message = 'No se pudo enviar la notificación.';
    lastAttempt.value = message;
    presentToast(message);
  }
};

onMounted(() => {
  sendNow();
});
</script>

<style scoped>
ion-text h2 {
  margin-bottom: 8px;
}

ion-card {
  margin-top: 24px;
}
</style>
