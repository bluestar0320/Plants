import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';

const PHOTOS_DIR_NAME = 'plant-photos';
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;

const getPhotosDir = (): Directory => {
  const dir = new Directory(Paths.document, PHOTOS_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
};

/** Opens the photo library, then resizes/compresses the pick into permanent app storage. Returns null if the user cancels. */
export const pickAndSavePlantPhoto = async (): Promise<string | null> => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('사진 라이브러리 접근 권한이 필요해요.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const manipulated = await ImageManipulator.manipulate(result.assets[0].uri)
    .resize({ width: MAX_DIMENSION })
    .renderAsync();
  const saved = await manipulated.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  const destFile = new File(getPhotosDir(), `${Crypto.randomUUID()}.jpg`);
  await new File(saved.uri).move(destFile);
  return destFile.uri;
};

export const deletePlantPhoto = (uri?: string): void => {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // best-effort cleanup only
  }
};
