import { useEffect, useRef } from "react";
import { fromLonLat } from "ol/proj";

export default function FlyToControl({ center, mapInstance }) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!mapInstance || !center) return;

    const view = mapInstance.getView();
    const target = fromLonLat([center.lng, center.lat]);

    const zoomOutLevel = 11;
    const zoomInLevel = 13;
    if (isFirstRender.current) {
      view.setCenter(target);
      isFirstRender.current = false;
      return;
    }
    view.animate({ zoom: zoomOutLevel, duration: 2000 }, () => {
      view.animate({ center: target, duration: 5000 }, () => {
        view.animate({ zoom: zoomInLevel, duration: 2000 });
      });
    });
  }, [center, mapInstance]);

  return null;
}
