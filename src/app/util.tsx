export function getImageAspectRatio(src: string): Promise<number> {
    return new Promise((resolve) => {
      if (typeof window !== "undefined") {
        const img = new window.Image();
        img.src = src;
        img.onload = () => {
          resolve(img.naturalWidth / img.naturalHeight);
        };
      } else {
        resolve(1); // Default aspect ratio if window is not defined
      }
    });
}