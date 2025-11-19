import { useEffect } from 'react';
import { UpdateInfo } from 'electron-updater';
import useUtilStore from '@renderer/store/utilStore';

interface CheckingForUpdatesProps {
  onUpdatesFound: (update: UpdateInfo) => void;
  onNoUpdatesFound: () => void;
  onError: (title: string, message: string) => void;
}

const CheckingForUpdates = ({
  onUpdatesFound,
  onNoUpdatesFound,
  onError
}: CheckingForUpdatesProps) => {
  const [os] = useUtilStore((state) => [state.platform]);

  useEffect(() => {
    if (os === 'darwin') {
      checkIsTrustedAccessibility().catch((error: unknown) => {
        onError('Unknown Error!', 'An unknown error occurred while checking for updates.');
        console.error('Error checking for updates: ', error);
      });
    } else {
      checkForUpdates();
    }
  }, []);

  const checkIsTrustedAccessibility = async () => {
    try {
      const isTrusted = await window.api.isTrustedAccessibility();
      if (isTrusted) {
        checkForUpdates();
      } else {
        onError(
          'System Permissions Error!',
          "Check NeoRadar's permissions and restart the client. If the issue persists restart your device."
        );
      }
    } catch (error) {
      onError('Unknown Error!', 'An unknown error occurred while checking for updates.');
      console.error('Error checking for updates: ', error);
    }
  };

  const checkForUpdates = () => {
    try {
      window.api.updater.checkForUpdates().catch((error: unknown) => {
        onError('Unknown Error!', 'An unknown error occurred while checking for updates.');
        console.error('Error checking for updates: ', error);
      });
      window.api.updater
        .onUpdateAvailable()
        .then((update) => {
          console.log('Update found: ', update);
          onUpdatesFound(update);
        })
        .catch(() => {
          onNoUpdatesFound();
        });

      window.api.updater
        .onUpdateNotAvailable()
        .then(() => {
          onNoUpdatesFound();
        })
        .catch(() => {
          onNoUpdatesFound();
        });
    } catch (error) {
      onNoUpdatesFound();
      console.error('Error checking for updates: ', error);
    }
  };

  return null;
};

export default CheckingForUpdates;
