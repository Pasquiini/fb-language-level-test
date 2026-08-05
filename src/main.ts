import { bootstrapApplication } from '@angular/platform-browser';
import 'bootstrap';

import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((error: unknown) => {
  console.error('Unable to start the application:', error);
});
