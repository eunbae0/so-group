import { isIOS } from '@/shared/utils/platform';
import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

export class FirestoreMessagingService {
	private static instance: FirestoreMessagingService | null = null;

	public static getInstance(): FirestoreMessagingService {
		if (!FirestoreMessagingService.instance) {
			FirestoreMessagingService.instance = new FirestoreMessagingService();
		}
		return FirestoreMessagingService.instance;
	}

	private constructor() {}

	async getHasPermission(): Promise<boolean> {
		return (
			(await messaging().hasPermission()) ===
			messaging.AuthorizationStatus.AUTHORIZED
		);
	}

	async requestUserPermission(): Promise<boolean> {
		switch (Platform.OS) {
			case 'ios': {
				const authStatus = await messaging().requestPermission();
				return (
					authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
					authStatus === messaging.AuthorizationStatus.PROVISIONAL
				);
			}
			case 'android': {
				const permissionStatus = await PermissionsAndroid.request(
					PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
				);
				return permissionStatus === PermissionsAndroid.RESULTS.GRANTED;
			}
			default: {
				return false;
			}
		}
	}

	async getToken(): Promise<string> {
		if (isIOS && !messaging().isDeviceRegisteredForRemoteMessages) {
			await messaging().registerDeviceForRemoteMessages();
		}
		return await messaging()
			.getToken()
			.then((token) => token);
	}
}

// 싱글톤 인스턴스를 export하는 함수
export const getMessagingService = (): FirestoreMessagingService => {
	return FirestoreMessagingService.getInstance();
};
