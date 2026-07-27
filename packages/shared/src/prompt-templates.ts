/** Universal operator prompts — position-based, no model name in template body (Appendix B / Creatr revisions). */

export const UNIVERSAL_IMAGE_PROMPT_V2 = `Create a photorealistic 9:16 vertical source frame.

Input image roles by position:
1. Face — model identity reference (face, hair, skin tone, likeness).
2. Face — model identity reference (face, hair, skin tone, likeness).
3. Face — model identity reference (face, hair, skin tone, likeness).
4. Body — exact source first frame from Instagram reel {{source_reel_shortcode}}: pose, clothing, background, framing, lighting, camera angle, and visible text.

Rules:
- Replace only the person identity using the face likeness from images 1–3.
- Preserve the exact pose, body angle, hand position, camera angle, crop, and composition from image 4.
- Preserve the clothing, background, lighting, visible objects, and on-screen text from image 4.
- Do not remove, rewrite, blur, translate, or reposition any text.
- Use the hair colour, hair style, skin tone, and facial likeness from images 1–3.
- Do not add tattoos, logos, jewellery, props, people, or extra text.
- Output must be a vertical 9:16 image suitable as the starting frame for motion-control video.
{{run_instruction_block}}`;

export const UNIVERSAL_VIDEO_PROMPT_V2 = `Animate the supplied generated character image using the source Instagram video as motion control.

Rules:
- Preserve the generated character identity exactly.
- Follow the source video movement, timing, framing, camera motion, and body motion.
- Keep the original reel audio on the finished video.
- Preserve visible text exactly; do not remove, rewrite, blur, translate, or reposition it.
- Keep the outfit, background, lighting, and composition consistent with the supplied generated image.
- Output must remain vertical 9:16 for the full video.
- Do not introduce new people, objects, logos, or text.
{{run_instruction_block}}`;

/**
 * CrossPost creator prompts (v3): identity-swap remix for reposting.
 * Removes source on-screen captions/watermarks rather than preserving them.
 */
export const UNIVERSAL_IMAGE_PROMPT_V3 = `Create a photorealistic 9:16 vertical remixed source frame for social reposting.

Input image roles by position:
1. Face — the creator's identity reference (face, hair, skin tone, likeness). MUST be a real human face photo.
2. Face — the creator's identity reference (face, hair, skin tone, likeness).
3. Face — the creator's identity reference (face, hair, skin tone, likeness).
4. Body — source first frame from reel {{source_reel_shortcode}}: pose, clothing, background, framing, lighting, camera angle.

Rules:
- Completely replace the person in image 4 with the identity from images 1–3. The output face, hair, and skin must clearly match images 1–3, not the original person.
- Preserve the exact pose, body angle, hand position, camera angle, crop, and composition from image 4.
- Preserve clothing, background, and lighting from image 4.
- REMOVE all on-screen text, captions, stickers, emojis, watermarks, handles, logos, and UI overlays from image 4. Output a clean frame with no text.
- Do not add new text, logos, tattoos, jewellery, props, or people.
- Output must be vertical 9:16 and suitable as the starting frame for motion-control video.
{{run_instruction_block}}`;

export const UNIVERSAL_VIDEO_PROMPT_V3 = `Animate the supplied generated character image using the source Instagram video as motion control.

Rules:
- Preserve the generated character identity exactly for the full clip — do not drift back to the original source person.
- Follow the source video movement, timing, framing, camera motion, and body motion.
- Keep the original reel audio on the finished video.
- Do NOT reproduce source captions, stickers, watermarks, handles, or UI text. Keep the frame clean of overlays.
- Keep the outfit, background, lighting, and composition consistent with the supplied generated image.
- Output must remain vertical 9:16 for the full video.
- Do not introduce new people, objects, logos, or text.
{{run_instruction_block}}`;
