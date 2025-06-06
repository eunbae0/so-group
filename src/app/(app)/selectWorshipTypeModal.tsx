import { VStack } from '#/components/ui/vstack';
import { Text } from '@/shared/components/text';
import { Pressable, TextInput, Alert } from 'react-native';
import { HStack } from '#/components/ui/hstack';
import { Icon } from '#/components/ui/icon';
import { Plus, Trash, X, Edit2, Check } from 'lucide-react-native';
import { router } from 'expo-router';
import { useWorshipStore } from '@/store/worship';
import { Box } from '#/components/ui/box';
import { Divider } from '#/components/ui/divider';
import { Button, ButtonText } from '@/components/common/button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from '@/components/common/keyboard-view/KeyboardAvoidingView';
import { useState, useEffect } from 'react';
import {
	fetchUserWorshipTypes,
	createUserWorshipType,
	updateUserWorshipType,
	deleteUserWorshipType,
} from '@/api/worship-types';
import { Spinner } from '@/components/common/spinner';
import { v4 as uuidv4 } from 'uuid';
import type {
	ClientWorshipType,
	CreateWorshipTypeInput,
	UpdateWorshipTypeInput,
} from '@/api/worship-types/types';
import { ModalHeader } from '@/shared/components/modal-header/ModalHeader';
import { isAndroid } from '@/shared/utils/platform';
import { KeyboardAwareScrollView } from '@/shared/components/KeyboardAwareScrollView';

export default function selectedWorshipTypeModal() {
	const isPresented = router.canGoBack();
	const { top, bottom } = useSafeAreaInsets();

	// Local state for worship types management
	const [worshipTypes, setWorshipTypes] = useState<ClientWorshipType[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [newWorshipTypeName, setNewWorshipTypeName] = useState('');
	const [editWorshipTypeName, setEditWorshipTypeName] = useState('');
	const [editingWorshipType, setEditingWorshipType] =
		useState<ClientWorshipType | null>(null);

	// Store for global state
	const { setWorshipTypes: updateGlobalWorshipTypes } = useWorshipStore();

	// Fetch worship types when component mounts
	useEffect(() => {
		loadWorshipTypes();
	}, []);

	// Load worship types from API
	const loadWorshipTypes = async () => {
		try {
			setIsLoading(true);
			const types = await fetchUserWorshipTypes();
			setWorshipTypes(types);
		} catch (error) {
			Alert.alert('오류', '예배 종류를 불러오는 중 오류가 발생했어요.');
			console.error('Failed to fetch worship types:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Add a new worship type
	const handleAddWorshipType = async () => {
		if (!newWorshipTypeName.trim()) {
			return;
		}

		try {
			const newWorshipType: CreateWorshipTypeInput = {
				id: uuidv4(),
				name: newWorshipTypeName.trim(),
			};

			await createUserWorshipType(newWorshipType);

			// Add to local state
			const updatedWorshipTypes = [
				...worshipTypes,
				{ id: newWorshipType.id, name: newWorshipType.name },
			];
			setWorshipTypes(updatedWorshipTypes);

			// Update global state
			updateGlobalWorshipTypes(updatedWorshipTypes);

			setNewWorshipTypeName('');
		} catch (error) {
			Alert.alert('오류', '예배 종류를 추가하는 중 오류가 발생했어요.');
			console.error('Failed to add worship type:', error);
		}
	};

	// Start editing a worship type
	const startEditingWorshipType = (worshipType: ClientWorshipType) => {
		setEditingWorshipType(worshipType);
		setEditWorshipTypeName(worshipType.name);
	};

	// Update a worship type
	const handleUpdateWorshipType = async () => {
		if (!editingWorshipType || !editWorshipTypeName.trim()) {
			return;
		}

		try {
			const updateInput: UpdateWorshipTypeInput = {
				name: editWorshipTypeName.trim(),
			};

			await updateUserWorshipType(editingWorshipType.id, updateInput);

			// Update in local state
			const updatedWorshipTypes = worshipTypes.map((type) =>
				type.id === editingWorshipType.id
					? { ...type, name: editWorshipTypeName.trim() }
					: type,
			);
			setWorshipTypes(updatedWorshipTypes);

			// Update global state
			updateGlobalWorshipTypes(updatedWorshipTypes);

			setEditWorshipTypeName('');
			setEditingWorshipType(null);
		} catch (error) {
			Alert.alert('오류', '예배 종류를 수정하는 중 오류가 발생했어요.');
			console.error('Failed to update worship type:', error);
		}
	};

	// Delete a worship type
	const handleDeleteWorshipType = async (worshipType: ClientWorshipType) => {
		// Show confirmation alert
		Alert.alert(
			`"${worshipType.name}"를 삭제할까요?`,
			'',
			[
				{
					text: '취소',
					style: 'cancel',
				},
				{
					text: '삭제',
					style: 'destructive',
					onPress: async () => {
						try {
							await deleteUserWorshipType(worshipType.id);

							// Remove from local state
							const updatedWorshipTypes = worshipTypes.filter(
								(type) => type.id !== worshipType.id,
							);
							setWorshipTypes(updatedWorshipTypes);

							// Update global state
							updateGlobalWorshipTypes(updatedWorshipTypes);

							// If we were editing this worship type, cancel editing
							if (editingWorshipType?.id === worshipType.id) {
								setEditingWorshipType(null);
								setNewWorshipTypeName('');
							}
						} catch (error) {
							Alert.alert('오류', '예배 종류를 삭제하는 중 오류가 발생했어요.');
							console.error('Failed to delete worship type:', error);
						}
					},
				},
			],
			{ cancelable: true },
		);
	};

	// Cancel editing
	const cancelEditing = () => {
		setEditingWorshipType(null);
		setNewWorshipTypeName('');
	};

	return (
		<KeyboardAvoidingView>
			<VStack
				className="w-full h-full gap-4"
				style={{ paddingTop: isAndroid ? top + 20 : 0 }}
			>
				<ModalHeader title="예배 종류" onBackPress={() => router.back()} />
				<VStack className="w-full flex-1 px-6 py-6">
					{isLoading ? (
						<VStack className="flex-1 justify-center items-center">
							<Spinner size="large" />
							<Text className="mt-4">예배 종류를 불러오는 중...</Text>
						</VStack>
					) : (
						<KeyboardAwareScrollView>
							<VStack space="4xl">
								{worshipTypes.map((worshipType) => (
									<VStack space="lg" key={worshipType.id}>
										<HStack className="w-full items-center justify-between">
											<HStack space="lg" className="items-center flex-1">
												<Box className="rounded-full w-2 h-2 bg-background-400" />
												{editingWorshipType?.id === worshipType.id ? (
													<TextInput
														placeholder={'예배 종류 수정하기'}
														className="flex-1 text-[18px]"
														value={editWorshipTypeName}
														onChangeText={setEditWorshipTypeName}
														autoFocus
													/>
												) : (
													<Text className="text-[18px] flex-1">
														{worshipType.name}
													</Text>
												)}
											</HStack>
											<HStack space="md">
												{editingWorshipType?.id === worshipType.id ? (
													<Pressable onPress={handleUpdateWorshipType}>
														<Icon
															as={Check}
															size="lg"
															className="color-primary-500"
														/>
													</Pressable>
												) : (
													<>
														<Pressable
															onPress={() =>
																startEditingWorshipType(worshipType)
															}
														>
															<Icon as={Edit2} size="lg" />
														</Pressable>
														<Pressable
															onPress={() =>
																handleDeleteWorshipType(worshipType)
															}
														>
															<Icon as={Trash} size="lg" />
														</Pressable>
													</>
												)}
											</HStack>
										</HStack>
										<Divider />
									</VStack>
								))}

								<HStack className="w-full items-center justify-between">
									<HStack space="lg" className="flex-1 items-center">
										<Box className="rounded-full w-2 h-2 bg-background-400" />
										<TextInput
											placeholder={'예배 종류 추가하기'}
											className="flex-1 text-[18px] border-b-[1px] border-background-300 pb-2 text-typography-500 font-pretendard-Medium"
											value={newWorshipTypeName}
											onChangeText={setNewWorshipTypeName}
										/>
									</HStack>
									<Pressable onPress={handleAddWorshipType}>
										<Icon as={Plus} size="lg" />
									</Pressable>
								</HStack>
							</VStack>
						</KeyboardAwareScrollView>
					)}
				</VStack>

				<Box style={{ marginBottom: bottom + 12 }}>
					<Button
						size="lg"
						className="mx-6 mb-6"
						rounded
						onPress={() => router.back()}
					>
						<ButtonText>완료</ButtonText>
					</Button>
				</Box>
			</VStack>
		</KeyboardAvoidingView>
	);
}
