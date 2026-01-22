import { useEffect, useRef } from 'react';

export const useAbortControllers = () => {
  const controllersRef = useRef<AbortController[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      controllersRef.current.forEach(controller => controller.abort());
      controllersRef.current = [];
    };
  }, []);

  const createController = () => {
    const controller = new AbortController();
    controllersRef.current.push(controller);
    return controller;
  };

  const releaseController = (controller: AbortController) => {
    controllersRef.current = controllersRef.current.filter(existing => existing !== controller);
  };

  return { createController, releaseController, isMountedRef };
};
