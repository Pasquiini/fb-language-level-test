import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Footer } from './shared/components/footer/footer.component';
import { Header } from './shared/components/header/header.component';

@Component({
  selector: 'app-root',
  imports: [
    Footer,
    Header,
    RouterOutlet,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'fb-language-level-test';
}
