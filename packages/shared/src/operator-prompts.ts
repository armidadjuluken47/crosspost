/** Emman operator prompts — position-based (images 1–3 face, 4 body, 5 clothing). */

export const OPERATOR_IMAGE_PROMPT = `Use the first, second, and third images for the face, hair, and skin tone.
Literally just do a "Face Swap" for this one.
DO NOT CHANGE THE ANGLE AND THE POSING IN THE FOURTH PHOTO THAT WILL BE USED AS HER BODY.
DO NOT CHANGE ANYTHING IN THE FIFTH PHOTO THAT WILL BE USED AS THE CLOTHING.
DO NOT SHOW ANY TATTOOS.
DO NOT ALTER THE BACKGROUND.
MAKE SURE THAT THE HAIR AND HAIR COLOR IS FROM THE FIRST, SECOND AND THIRD PICTURE.
DO NOT REMOVE THE TEXT.
{{run_instruction_block}}`;

export const OPERATOR_VIDEO_PROMPT = `Make sure that the lip syncing is accurate.
Do not remove or alter texts if there are any. Make sure that it stays untouched and above all elements.
For the armpits, make sure that they are clean, smooth, and without hair.
Aspect Ratio should be 9:16 or 1080 x 1920 pixels.
{{run_instruction_block}}`;
