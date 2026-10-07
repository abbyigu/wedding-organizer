// Shared bits for videos on venues and Inspiration ideas.
export const MAX_VIDEO_MB = 50;

export const isTikTok = (url: string) => /(^|\/\/|\.)tiktok\.com/i.test(url);
// A full TikTok link carries the video's number; short links (vm.tiktok.com/...) don't until they're followed.
export const tiktokId = (url: string) => url.match(/\/video\/(\d{8,25})/)?.[1] ?? null;
export const tiktokEmbed = (id: string) => `https://www.tiktok.com/embed/v2/${id}`;

export const safeName = (name: string) => name.replace(/[^\w.\-]+/g, "_");

export function uploadMessage(message: string): string {
  return /exceed|too large|size/i.test(message) ? `That video is too large. Uploads are limited to about ${MAX_VIDEO_MB} MB, so trim it or share it as a link instead.` : `Couldn't upload that (${message}).`;
}
