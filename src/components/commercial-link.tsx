"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function CommercialLink({
  campaignId,
  placementId,
  className,
  children,
}: {
  campaignId: string;
  placementId: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && !sent) {
        timer = setTimeout(() => {
          sent = true;
          const payload = JSON.stringify({
            campaignId: campaignId.toLowerCase(),
            placementId: placementId.toLowerCase(),
            eventId: crypto.randomUUID().toLowerCase(),
            path: window.location.pathname,
          });
          if (!navigator.sendBeacon?.("/api/events/impression", new Blob([payload], { type: "application/json" }))) {
            void fetch("/api/events/impression", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: payload,
              keepalive: true,
            });
          }
          observer.disconnect();
        }, 1_000);
      } else if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    }, { threshold: [0.5] });
    observer.observe(element);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [campaignId, placementId]);

  const campaign = encodeURIComponent(campaignId.toLowerCase());
  const placement = encodeURIComponent(placementId.toLowerCase());
  return (
    <a ref={ref} href={`/go/${campaign}?p=${placement}`} rel="sponsored nofollow" className={className}>
      {children}
    </a>
  );
}
