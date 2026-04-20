import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./features/map/map.component').then(m => m.MapComponent),
  },
  {
    path: 'hazards',
    loadComponent: () =>
      import('./features/hazards/hazards.component').then(m => m.HazardsComponent),
  },
  {
    path: 'emergency',
    loadComponent: () =>
      import('./features/emergency/emergency.component').then(m => m.EmergencyComponent),
  },
  {
    path: 'community',
    loadComponent: () =>
      import('./features/community/community.component').then(m => m.CommunityComponent),
  },
  {
    path: 'fire',
    loadComponent: () =>
      import('./features/fire/fire.component').then(m => m.FireComponent),
  },
  {
    path: 'utilities',
    loadComponent: () =>
      import('./features/utilities/utilities.component').then(m => m.UtilitiesComponent),
  },
  {
    path: 'officials',
    loadComponent: () =>
      import('./features/officials/officials.component').then(m => m.OfficialsComponent),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then(m => m.SettingsComponent),
  },
  { path: '**', redirectTo: '' },
];
