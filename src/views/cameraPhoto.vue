<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Cámara</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-card>
        <ion-card-header>
          <ion-card-title>Capturar fotografía</ion-card-title>
          <ion-card-subtitle>Usa la cámara o selecciona desde la galería</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <ion-button expand="block" :disabled="takingPhoto" @click="takePhoto">
            {{ takingPhoto ? 'Abriendo cámara…' : 'Tomar foto' }}
          </ion-button>
          <ion-button expand="block" fill="outline" :disabled="takingPhoto" @click="pickFromGallery">
            Elegir desde galería
          </ion-button>
          <ion-item lines="none">
            <ion-label>Guardar en galería</ion-label>
            <ion-toggle
              slot="end"
              :checked="saveToGallery"
              @ionChange="onToggleSave"
            />
          </ion-item>
          <ion-text color="medium" class="hint">
            Requiere permisos de almacenamiento en Android &lt;= 12. En Android 13+ se maneja con el Photo Picker.
          </ion-text>
          <ion-text color="medium" v-if="!photo">
            Aún no has seleccionado una imagen.
          </ion-text>
        </ion-card-content>
      </ion-card>

      <ion-card v-if="photo">
        <ion-card-header>
          <ion-card-title>Resultado</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-img :src="photo.webPath" alt="Foto capturada" />
          <ion-list inset lines="none">
            <ion-item>
              <ion-label>Formato</ion-label>
              <ion-note slot="end">{{ photo.format?.toUpperCase() ?? 'JPEG' }}</ion-note>
            </ion-item>
            <ion-item v-if="photo.exif">
              <ion-label>EXIF disponible</ion-label>
              <ion-note slot="end">Sí</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Guardada en galería</ion-label>
              <ion-note slot="end">{{ photo.saved ? 'Sí' : 'No' }}</ion-note>
            </ion-item>
          </ion-list>
        </ion-card-content>
      </ion-card>

      <ion-toast
        :is-open="toastOpen"
        :message="toastMessage"
        :duration="2800"
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
  IonImg,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
  IonToggle,
} from '@ionic/vue';
import { ref } from 'vue';
import {
  Camera,
  CameraResultType,
  CameraSource,
  type Photo,
} from '@capacitor/camera';
//Si se quiere usar el selector de fotos en Android 13 o superior, es necesario añadir esto al AndroidManifest.xml
/*<!-- Trigger Google Play services to install the backported photo picker module. -->
<!--suppress AndroidDomInspection -->
<service android:name="com.google.android.gms.metadata.ModuleDependencies"
    android:enabled="false"
    android:exported="false"
    tools:ignore="MissingClass">
    <intent-filter>
        <action android:name="com.google.android.gms.metadata.MODULE_DEPENDENCIES" />
    </intent-filter>
    <meta-data android:name="photopicker_activity:0:required" android:value="" />
</service>
*/
//Si se quiere guardar las fotos en la galería, es necesario añadir esto al AndroidManifest.xml
/*
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
 */
/*
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29"/>
 */
const photo = ref<Photo | null>(null);
const takingPhoto = ref(false);
const toastOpen = ref(false);
const toastMessage = ref('');
const saveToGallery = ref(false);

const presentToast = (message: string) => {
  toastMessage.value = message;
  toastOpen.value = true;
};

const handlePhotoResult = (result: Photo) => {
  photo.value = result;
  presentToast('Imagen lista.');
};

const takePhoto = async () => {
  takingPhoto.value = true;
  try {
    const result = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      saveToGallery: saveToGallery.value,
    });
    handlePhotoResult(result);
  } catch (error: any) {
    if (error?.message !== 'User cancelled photos app') {
      console.error('Error tomando foto', error);
      presentToast(error?.message ?? 'No se pudo obtener la foto.');
    }
  } finally {
    takingPhoto.value = false;
  }
};

const pickFromGallery = async () => {
  try {
    const result = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
      saveToGallery: saveToGallery.value,
    });
    handlePhotoResult(result);
  } catch (error: any) {
    if (error?.message !== 'User cancelled photos app') {
      console.error('Error seleccionando foto', error);
      presentToast(error?.message ?? 'No se pudo seleccionar la imagen.');
    }
  }
};

const onToggleSave = (event: CustomEvent) => {
  saveToGallery.value = Boolean(event.detail?.checked);
};
</script>

<style scoped>
ion-card + ion-card {
  margin-top: 16px;
}

ion-img {
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.hint {
  display: block;
  margin-top: 8px;
}
</style>