import React, { useEffect, useMemo, useRef } from "react";
import {
  driveImageDisplayUrl,
  driveImageFallbackSrcList,
} from "../../utils/entradasDriveImage";

export default function EntradasDriveCoverImage({
  url,
  alt = "",
  className = "block h-auto max-h-80 w-full object-contain",
  wrapperClassName = "",
}) {
  const src = useMemo(() => driveImageDisplayUrl(url), [url]);
  const fallbackIdx = useRef(0);
  const fallbacks = useMemo(() => driveImageFallbackSrcList(url), [url]);

  useEffect(() => {
    fallbackIdx.current = 0;
  }, [url, src]);

  if (!src) return null;

  const onError = (event) => {
    const img = event.currentTarget;
    const next = fallbacks[fallbackIdx.current];
    if (next && img.src !== next) {
      img.src = next;
      fallbackIdx.current += 1;
      return;
    }
    img.style.display = "none";
  };

  return (
    <div className={wrapperClassName}>
      <img
        src={src}
        alt={alt}
        className={className}
        referrerPolicy="no-referrer"
        onError={onError}
      />
    </div>
  );
}
