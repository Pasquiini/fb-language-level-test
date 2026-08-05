import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

import { RouterLink } from '@angular/router';

import { WHATSAPP_CONFIG } from '../../../../app/core/constants/app.constants';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  readonly currentYear = new Date().getFullYear();

  readonly instagramUrl =
    'https://www.instagram.com/fblanguagecenter';

  readonly whatsappUrl =
    `${WHATSAPP_CONFIG.baseUrl}/${WHATSAPP_CONFIG.phoneNumber}`;
}
