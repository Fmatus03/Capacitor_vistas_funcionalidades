<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Grabadora de voz</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Estado del dispositivo</ion-card-title>
          <ion-card-subtitle>Compatibilidad y permisos</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content class="status-grid">
          <ion-badge :color="capabilityBadgeColor">{{ capabilityLabel }}</ion-badge>
          <ion-badge :color="permissionBadgeColor">{{ permissionLabel }}</ion-badge>
          <ion-badge :color="statusBadgeColor">{{ statusLabel }}</ion-badge>
          <ion-note class="status-note">
            {{ statusHint }}
          </ion-note>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Controles</ion-card-title>
          <ion-card-subtitle>Gestiona la sesión de grabación</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="controls">
            <ion-button expand="block" color="primary" :disabled="actionBusy" @click="startRecording">
              Iniciar grabación
            </ion-button>
            <ion-button expand="block" color="warning" :disabled="!canPause || actionBusy" @click="pauseRecording">
              Pausar
            </ion-button>
            <ion-button expand="block" color="tertiary" :disabled="!canResume || actionBusy" @click="resumeRecording">
              Reanudar
            </ion-button>
            <ion-button expand="block" color="success" :disabled="!canStop || actionBusy" @click="stopRecording">
              Detener y guardar
            </ion-button>
            <ion-button expand="block" fill="outline" :disabled="actionBusy" @click="requestPermissions">
              Solicitar permiso de micrófono
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>Grabaciones</ion-card-title>
          <ion-card-subtitle>Reproduce o elimina grabaciones locales</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-list v-if="recordings.length">
            <ion-item v-for="item in recordings" :key="item.id">
              <ion-label>
                <h2>{{ item.name }}</h2>
                <p>Duración: {{ formatDuration(item.durationMs) }}</p>
                <p>Creada: {{ item.createdAt }}</p>
              </ion-label>
              <audio :src="item.dataUrl" controls preload="metadata"></audio>
              <ion-button slot="end" color="danger" fill="clear" @click="removeRecording(item.id)">
                <ion-icon slot="icon-only" :icon="trash" />
              </ion-button>
            </ion-item>
          </ion-list>
          <ion-text v-else color="medium">
            Aún no hay grabaciones guardadas.
          </ion-text>
        </ion-card-content>
      </ion-card>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2200"
        :color="toastColor"
        @did-dismiss="toastOpen = false"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar
} from '@ionic/vue';
import { trash } from 'ionicons/icons';
import {
  RecordingStatus,
  VoiceRecorder,
  type RecordingData
} from 'capacitor-voice-recorder';

// Registro básico de una grabación en memoria.
interface RecordingEntry {
  id: number;
  dataUrl: string;
  durationMs: number;
  mimeType: string;
  createdAt: string;
  name: string;
}

const recordings = reactive<RecordingEntry[]>([]);
const permissionGranted = ref<boolean | null>(null);
const capabilityAvailable = ref<boolean | null>(null);
const currentStatus = ref<typeof RecordingStatus[keyof typeof RecordingStatus]>(RecordingStatus.NONE);
const actionBusy = ref(false);
const toastOpen = ref(false);
const toastMessage = ref('');
const toastColor = ref<'success' | 'warning' | 'danger' | 'medium'>('medium');

// Etiquetas derivadas para la UI.
const capabilityLabel = computed(() => {
  if (capabilityAvailable.value === true) return 'Dispositivo listo para grabar';
  if (capabilityAvailable.value === false) return 'No disponible para grabar';
  return 'Compatibilidad desconocida';
});

const permissionLabel = computed(() => {
  if (permissionGranted.value === true) return 'Permiso concedido';
  if (permissionGranted.value === false) return 'Permiso pendiente';
  return 'Permiso sin verificar';
});

const statusLabel = computed(() => {
  switch (currentStatus.value) {
    case RecordingStatus.RECORDING:
      return 'Grabando';
    case RecordingStatus.PAUSED:
      return 'Pausado';
    default:
      return 'Inactivo';
  }
});

const capabilityBadgeColor = computed(() => (capabilityAvailable.value ? 'success' : 'danger'));
const permissionBadgeColor = computed(() => (permissionGranted.value ? 'success' : 'warning'));
const statusBadgeColor = computed(() => {
  if (currentStatus.value === RecordingStatus.RECORDING) return 'success';
  if (currentStatus.value === RecordingStatus.PAUSED) return 'warning';
  return 'medium';
});

const statusHint = computed(() => {
  if (!capabilityAvailable.value) {
    return 'El dispositivo o navegador no permite grabar audio.';
  }
  if (!permissionGranted.value) {
    return 'Concede permiso al micrófono antes de iniciar una grabación.';
  }
  if (currentStatus.value === RecordingStatus.RECORDING) {
    return 'La grabación está en curso, puedes pausar o detener para guardarla.';
  }
  if (currentStatus.value === RecordingStatus.PAUSED) {
    return 'La grabación está pausada, puedes reanudar o finalizar.';
  }
  return 'Presiona “Iniciar grabación” para comenzar.';
});

// Estados derivados para validar acciones.
const canPause = computed(() => currentStatus.value === RecordingStatus.RECORDING);
const canResume = computed(() => currentStatus.value === RecordingStatus.PAUSED);
const canStop = computed(() => currentStatus.value !== RecordingStatus.NONE);

// Muestra un mensaje breve reutilizable.
const openToast = (message: string, color: 'success' | 'warning' | 'danger' | 'medium' = 'medium') => {
  toastMessage.value = message;
  toastColor.value = color;
  toastOpen.value = true;
};

// Solicita permisos de micrófono si aún no se otorgaron.
const requestPermissions = async () => {
  try {
    actionBusy.value = true;
    const { value } = await VoiceRecorder.requestAudioRecordingPermission();
    permissionGranted.value = value;
    openToast(value ? 'Permisos concedidos.' : 'El permiso fue rechazado.', value ? 'success' : 'warning');
  } catch (error) {
    console.error('Error solicitando permisos', error);
    openToast('Error al solicitar permisos.', 'danger');
  } finally {
    actionBusy.value = false;
  }
};

// Ejecuta una verificación completa de estado (permiso, compatibilidad y sesión).
const refreshStatus = async () => {
  try {
    const capability = await VoiceRecorder.canDeviceVoiceRecord();
    capabilityAvailable.value = capability.value;
  } catch (error) {
    console.warn('No se pudo verificar la compatibilidad.', error);
    capabilityAvailable.value = false;
  }

  try {
    const permission = await VoiceRecorder.hasAudioRecordingPermission();
    permissionGranted.value = permission.value;
  } catch (error) {
    console.warn('No se pudo verificar el permiso.', error);
    permissionGranted.value = null;
  }

  try {
    const { status } = await VoiceRecorder.getCurrentStatus();
    currentStatus.value = status;
  } catch (error) {
    console.warn('No se pudo leer el estado actual.', error);
    currentStatus.value = RecordingStatus.NONE;
  }
};

// Inicia una grabación nueva.
const startRecording = async () => {
  if (!capabilityAvailable.value) {
    openToast('El dispositivo no puede grabar audio.', 'danger');
    return;
  }
  if (!permissionGranted.value) {
    await requestPermissions();
    if (!permissionGranted.value) {
      return;
    }
  }

  try {
    actionBusy.value = true;
    const response = await VoiceRecorder.startRecording();
    if (response.value) {
      currentStatus.value = RecordingStatus.RECORDING;
      openToast('Grabación iniciada.', 'success');
    }
  } catch (error) {
    console.error('No se pudo iniciar la grabación', error);
    openToast('Error al iniciar la grabación.', 'danger');
  } finally {
    actionBusy.value = false;
  }
};

// Pausa la grabación activa.
const pauseRecording = async () => {
  if (!canPause.value) return;
  try {
    actionBusy.value = true;
    const response = await VoiceRecorder.pauseRecording();
    if (response.value) {
      currentStatus.value = RecordingStatus.PAUSED;
      openToast('Grabación pausada.', 'medium');
    }
  } catch (error) {
    console.error('No se pudo pausar la grabación', error);
    openToast('Error al pausar la grabación.', 'danger');
  } finally {
    actionBusy.value = false;
  }
};

// Reanuda una sesión en pausa.
const resumeRecording = async () => {
  if (!canResume.value) return;
  try {
    actionBusy.value = true;
    const response = await VoiceRecorder.resumeRecording();
    if (response.value) {
      currentStatus.value = RecordingStatus.RECORDING;
      openToast('Grabación reanudada.', 'success');
    }
  } catch (error) {
    console.error('No se pudo reanudar la grabación', error);
    openToast('Error al reanudar la grabación.', 'danger');
  } finally {
    actionBusy.value = false;
  }
};

// Detiene la grabación y guarda el resultado en memoria.
const stopRecording = async () => {
  if (!canStop.value) return;
  try {
    actionBusy.value = true;
    const { value } = await VoiceRecorder.stopRecording();
    persistRecording(value);
    currentStatus.value = RecordingStatus.NONE;
    openToast('Grabación guardada.', 'success');
  } catch (error) {
    console.error('No se pudo detener la grabación', error);
    openToast('Error al detener la grabación.', 'danger');
  } finally {
    actionBusy.value = false;
  }
};

// Guarda la grabación en una lista local para reproducciones posteriores.
const persistRecording = (result: RecordingData['value']) => {
  const dataBase64 = result.recordDataBase64?.trim();
  const mimeType = result.mimeType || 'audio/aac';

  let dataUrl: string | undefined;
  if (dataBase64) {
    dataUrl = `data:${mimeType};base64,${dataBase64}`;
  }

  if (!dataUrl && result.path) {
    dataUrl = result.path;
  }

  if (!dataUrl) {
    openToast('No se pudo obtener la grabación resultante.', 'danger');
    return;
  }

  recordings.unshift({
    id: Date.now(),
    dataUrl,
    durationMs: result.msDuration,
    mimeType,
    createdAt: new Date().toLocaleString(),
    name: `Grabación ${recordings.length + 1}`
  });
};

// Elimina una grabación de la lista temporal.
const removeRecording = (id: number) => {
  const index = recordings.findIndex(entry => entry.id === id);
  if (index === -1) return;
  recordings.splice(index, 1);
};

// Formatea la duración para un despliegue legible en mm:ss.
const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

onMounted(() => {
  refreshStatus();
});
</script>

<style scoped>
.status-grid {
  display: grid;
  gap: 0.5rem;
  align-items: flex-start;
}

.status-note {
  white-space: pre-wrap;
}

.controls {
  display: grid;
  gap: 0.75rem;
}

audio {
  width: 160px;
}
</style>
