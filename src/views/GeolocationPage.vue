
<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Geolocalización</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Estado de permisos</ion-card-title>
          <ion-card-subtitle>Requeridos para obtener la ubicación</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-item lines="none">
            <ion-label>
              <h2>{{ permissionLabel }}</h2>
              <p>{{ permissionDetail }}</p>
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
          <ion-card-title>Ubicación actual</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" :disabled="loadingCurrent" @click="getCurrentLocation">
            {{ loadingCurrent ? 'Obteniendo…' : 'Obtener ubicación actual' }}
          </ion-button>
          <ion-text color="medium" v-if="!currentPosition">
            Pulsa el botón para obtener la ubicación actual.
          </ion-text>
          <ion-list v-else lines="full">
            <ion-item>
              <ion-label>Latitud</ion-label>
              <ion-note slot="end">{{ currentPosition.coords.latitude.toFixed(6) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Longitud</ion-label>
              <ion-note slot="end">{{ currentPosition.coords.longitude.toFixed(6) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Precisión</ion-label>
              <ion-note slot="end">{{ currentPosition.coords.accuracy.toFixed(2) }} m</ion-note>
            </ion-item>
            <ion-item v-if="currentPosition.coords.altitude !== null">
              <ion-label>Altitud</ion-label>
              <ion-note slot="end">{{ currentPosition.coords.altitude?.toFixed(2) }} m</ion-note>
            </ion-item>
            <ion-item v-if="currentPosition.coords.speed !== null">
              <ion-label>Velocidad</ion-label>
              <ion-note slot="end">{{ (currentPosition.coords.speed ?? 0).toFixed(2) }} m/s</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Timestamp</ion-label>
              <ion-note slot="end">{{ formatDate(currentPosition.timestamp) }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Seguimiento en vivo</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item lines="none">
            <ion-label>Activar seguimiento</ion-label>
            <ion-toggle slot="end" :checked="watching" @ionChange="toggleWatch" />
          </ion-item>
          <ion-text color="medium" v-if="watching && !watchPosition">
            Esperando actualizaciones…
          </ion-text>
          <ion-list v-if="watchPosition" lines="full">
            <ion-item>
              <ion-label>Latitud</ion-label>
              <ion-note slot="end">{{ watchPosition.coords.latitude.toFixed(6) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Longitud</ion-label>
              <ion-note slot="end">{{ watchPosition.coords.longitude.toFixed(6) }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Precisión</ion-label>
              <ion-note slot="end">{{ watchPosition.coords.accuracy.toFixed(2) }} m</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Timestamp</ion-label>
              <ion-note slot="end">{{ formatDate(watchPosition.timestamp) }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2600"
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
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToggle,
  IonToolbar,
} from '@ionic/vue';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  Geolocation,
  type Position,
  type PermissionStatus,
  type CallbackID,
} from '@capacitor/geolocation';
//NECESARIO AÑADIR ESTO AL ANDROIDMANIFEST.XML
//<!-- Geolocation Plugin -->
//<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
//<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
//<uses-feature android:name="android.hardware.location.gps" />

const permissionStatus = ref<PermissionStatus['location']>('prompt');
const loadingCurrent = ref(false);
const currentPosition = ref<Position | null>(null);
const watching = ref(false);
const watchPosition = ref<Position | null>(null);
const watchId = ref<CallbackID | null>(null);
const toastOpen = ref(false);
const toastMessage = ref('');

const presentToast = (message: string) => {
  toastMessage.value = message;
  toastOpen.value = true;
};

const permissionLabel = computed(() => {
  switch (permissionStatus.value) {
    case 'granted':
      return 'Permiso concedido';
    case 'denied':
      return 'Permiso denegado';
    case 'prompt-with-rationale':
      return 'Permiso requerido con justificación';
    case 'prompt':
    default:
      return 'Permiso pendiente';
  }
});

const permissionDetail = computed(() => {
  switch (permissionStatus.value) {
    case 'granted':
      return 'Puedes solicitar la ubicación actual o activar el seguimiento en vivo.';
    case 'denied':
      return 'Habilita la ubicación desde los ajustes del sistema para usar esta funcionalidad.';
    case 'prompt-with-rationale':
      return 'Se recomienda explicar al usuario por qué necesitas acceso a la ubicación.';
    case 'prompt':
    default:
      return 'Solicita el permiso para obtener la ubicación del dispositivo.';
  }
});

const refreshPermission = async () => {
  try {
    const status = await Geolocation.checkPermissions();
    permissionStatus.value = status.location;
  } catch (error) {
    console.error('Error revisando permisos de geolocalización', error);
    presentToast('No se pudo verificar el estado de los permisos.');
  }
};

const requestPermission = async () => {
  try {
    const status = await Geolocation.requestPermissions();
    permissionStatus.value = status.location;
    if (status.location === 'granted') {
      presentToast('Permiso de ubicación concedido.');
    } else {
      presentToast('Debes conceder el permiso para continuar.');
    }
  } catch (error) {
    console.error('Error solicitando permisos de geolocalización', error);
    presentToast('No se pudo solicitar el permiso de ubicación.');
  }
};

const getCurrentLocation = async () => {
  if (permissionStatus.value !== 'granted') {
    presentToast('Debes conceder permisos antes de obtener la ubicación.');
    return;
  }

  loadingCurrent.value = true;
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    currentPosition.value = position;
    presentToast('Ubicación obtenida correctamente.');
  } catch (error: any) {
    console.error('Error obteniendo la ubicación actual', error);
    presentToast(error?.message ?? 'No se pudo obtener la ubicación.');
  } finally {
    loadingCurrent.value = false;
  }
};

const startWatch = async () => {
  if (permissionStatus.value !== 'granted') {
    presentToast('Concede permisos antes de activar el seguimiento.');
    watching.value = false;
    return;
  }

  try {
    const id = await Geolocation.watchPosition(
      { enableHighAccuracy: true, minimumUpdateInterval: 100 },
      (position, error) => {
        if (error) {
          console.error('Error en seguimiento de ubicación', error);
          presentToast('Error obteniendo actualizaciones de ubicación.');
          return;
        }
        if (position) {
          watchPosition.value = position;
        }
      }
    );
    watchId.value = id;
    presentToast('Seguimiento activado.');
  } catch (error) {
    console.error('Error iniciando seguimiento de ubicación', error);
    presentToast('No se pudo iniciar el seguimiento.');
    watching.value = false;
  }
};

const stopWatch = async () => {
  if (!watchId.value) {
    watching.value = false;
    watchPosition.value = null;
    return;
  }

  try {
    await Geolocation.clearWatch({ id: watchId.value });
    watchId.value = null;
    watchPosition.value = null;
    presentToast('Seguimiento detenido.');
  } catch (error) {
    console.error('Error deteniendo seguimiento de ubicación', error);
    presentToast('No se pudo detener el seguimiento.');
  } finally {
    watching.value = false;
  }
};

const toggleWatch = async (event: CustomEvent) => {
  const enabled = Boolean(event.detail?.checked);
  watching.value = enabled;

  if (enabled) {
    await startWatch();
  } else {
    await stopWatch();
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString();
};

onMounted(async () => {
  await refreshPermission();
});

onUnmounted(async () => {
  if (watchId.value) {
    await Geolocation.clearWatch({ id: watchId.value });
  }
});
</script>

<style scoped>
ion-card + ion-card {
  margin-top: 16px;
}

ion-note {
  font-family: monospace;
}
</style>
