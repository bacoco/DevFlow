import {NavigationContainerRef} from '@react-navigation/native';
import {createRef} from 'react';

export const navigationRef = createRef<NavigationContainerRef<any>>();

class NavigationService {
  navigate(name: string, params?: any) {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate(name, params);
    } else {
      console.warn('Navigation not ready, queuing navigation action');
      // Queue the navigation action for when the navigator is ready
      setTimeout(() => {
        if (navigationRef.current?.isReady()) {
          navigationRef.current.navigate(name, params);
        }
      }, 100);
    }
  }

  goBack() {
    if (navigationRef.current?.isReady() && navigationRef.current.canGoBack()) {
      navigationRef.current.goBack();
    }
  }

  reset(state: any) {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.reset(state);
    }
  }

  getCurrentRoute() {
    if (navigationRef.current?.isReady()) {
      return navigationRef.current.getCurrentRoute();
    }
    return null;
  }
}

export const navigationService = new NavigationService();