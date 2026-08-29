// @MX:NOTE: [AUTO] 200/20/7개는 과제 명시값, 4MB는 Vercel 요청 본문 4.5MB 한도 역산,
// 4100은 file-type이 권장하는 매직 넘버 샘플 크기다 (plan.md §2.3, §3 단계 1, §3.4).
export const MAX_CUSTOM_EXTENSIONS = 200;
export const MAX_EXTENSION_LENGTH = 20;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_FILENAME_BYTES = 255;
export const SNIFF_BYTES = 4100;

export const FIXED_EXTENSIONS = ['bat', 'cmd', 'com', 'cpl', 'exe', 'scr', 'js'] as const;
