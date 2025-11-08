// 📁 src/utils/useLazyImage.js
import { useEffect, useState, useRef } from "react";

/**
 * Lightweight IntersectionObserver-based image lazy loader.
 * Returns { visible, ref } → attach ref to <img>.
 */
export const useLazyImage = () => {
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setVisible(true);
              observer.disconnect();
            }
          });
        },
        { rootMargin: "200px" } // start loading a bit before visible
      );
      observer.observe(node);
      return () => observer.disconnect();
    } else {
      // fallback: always load
      setVisible(true);
    }
  }, []);

  return { visible, ref };
};
