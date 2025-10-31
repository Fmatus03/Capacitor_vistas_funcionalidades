import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { LocalNotifications } from '@capacitor/local-notifications';

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css';
import '@ionic/vue/css/float-elements.css';
import '@ionic/vue/css/text-alignment.css';
import '@ionic/vue/css/text-transformation.css';
import '@ionic/vue/css/flex-utils.css';
import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

const app = createApp(App)
  .use(IonicVue)
  .use(router);

router.isReady().then(async () => {
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: 'default_actions',
          actions: [
            { id: 'open', title: 'Abrir' },
            { id: 'snooze', title: 'Posponer 5 min' },
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error registering notification action types', error);
  }

  try {
    await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      async event => {
        const { actionId, notification } = event;
        const targetRoute = notification?.extra?.targetRoute;
        const resolvedRoute = typeof targetRoute === 'string' ? targetRoute : '/home';

        if (actionId === 'snooze') {
          try {
            const title = notification?.title ?? 'Recordatorio';
            const body = notification?.body ?? 'Te volveremos a avisar en 5 minutos.';
            const extra = notification?.extra ?? {};
            const snoozeAt = new Date(Date.now() + 5 * 60 * 1000);

            await LocalNotifications.schedule({
              notifications: [
                {
                  id: Math.floor(Date.now() / 1000),
                  title,
                  body,
                  schedule: { at: snoozeAt, allowWhileIdle: true },
                  extra: { ...extra, snoozedFrom: notification?.id },
                  actionTypeId: 'default_actions',
                },
              ],
            });
          } catch (scheduleError) {
            console.error('Error scheduling snoozed notification', scheduleError);
          }
          return;
        }

        // Default tap or custom "open" action navigates to the target route.
        const normalizedActionId = actionId ?? '';
        const defaultActionIds = [
          'open',
          'tap',
          'default',
          'defaultAction',
          'com.apple.UNNotificationDefaultActionIdentifier',
          '',
        ];

        if (defaultActionIds.includes(normalizedActionId)) {
          router.push(resolvedRoute).catch(() => undefined);
        }
      }
    );
  } catch (error) {
    console.error('Error registering notification action listener', error);
  }

  app.mount('#app');
});
