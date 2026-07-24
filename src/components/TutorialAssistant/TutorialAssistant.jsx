import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WelcomeDialog } from './WelcomeDialog';
import { FloatingWindow } from './FloatingWindow';
import { AnimatedCursor } from './AnimatedCursor';
import { DemoOverlay } from './DemoOverlay';
import { getTutorialDefinition, tutorialDefinitions } from './tutorialSteps';
import {
  hasSeenWelcome,
  markWelcomeSeen,
  readTutorialProgress,
  resetTutorialProgress,
  saveTutorialProgress,
} from './tutorialStorage';

const TARGET_WAIT_TIMEOUT = 3000;

function removeHighlights() {
  document.querySelectorAll('.tutorial-highlight').forEach((element) => {
    element.classList.remove('tutorial-highlight');
  });
}

function waitForElement(selector, timeout = TARGET_WAIT_TIMEOUT) {
  return new Promise((resolve) => {
    const existingElement = document.querySelector(selector);
    if (existingElement) {
      resolve(existingElement);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

export function TutorialAssistant({
  autoStart = false,
  storageScope = 'guest',
  playAnimation = true,
}) {
  const [showWelcome, setShowWelcome] = useState(false);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const runIdRef = useRef(0);

  const definition = useMemo(
    () => getTutorialDefinition(currentPath),
    [currentPath],
  );
  const steps = definition?.steps || [];
  const currentStepData = steps[currentStep] || {};

  const stopPlayback = useCallback(() => {
    runIdRef.current += 1;
    setShowCursor(false);
    setIsPlaying(false);
    setCurrentTarget(null);
    removeHighlights();
  }, []);

  const persistProgress = useCallback((path, update) => {
    const selectedDefinition = getTutorialDefinition(path);
    if (!selectedDefinition) return;

    saveTutorialProgress(
      storageScope,
      selectedDefinition.id,
      selectedDefinition.version,
      update,
    );
  }, [storageScope]);

  const startTutorial = useCallback((path, options = {}) => {
    const selectedDefinition = getTutorialDefinition(path);
    if (!selectedDefinition) {
      console.warn(`Unknown tutorial path: ${path}`);
      return;
    }

    stopPlayback();
    const savedProgress = readTutorialProgress(
      storageScope,
      selectedDefinition.id,
      selectedDefinition.version,
    );
    const shouldResume = options.resume !== false
      && savedProgress?.status === 'in_progress';
    const savedStep = Number(savedProgress?.currentStep) || 0;
    const initialStep = shouldResume
      ? Math.min(savedStep, selectedDefinition.steps.length - 1)
      : 0;

    setCurrentPath(path);
    setCurrentStep(initialStep);
    setTargetMissing(false);
    setTutorialActive(true);
    setShowWelcome(false);
    persistProgress(path, {
      status: 'in_progress',
      currentStep: initialStep,
      startedAt: savedProgress?.startedAt || new Date().toISOString(),
    });
  }, [persistProgress, storageScope, stopPlayback]);

  const showWelcomeDialog = useCallback(() => {
    setShowWelcome(true);
    markWelcomeSeen(storageScope);
  }, [storageScope]);

  useEffect(() => {
    if (!autoStart || hasSeenWelcome(storageScope)) return undefined;

    const timer = window.setTimeout(showWelcomeDialog, 500);
    return () => window.clearTimeout(timer);
  }, [autoStart, showWelcomeDialog, storageScope]);

  useEffect(() => {
    if (!tutorialActive || !definition || !currentStepData.targetElement) {
      return undefined;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setTargetMissing(false);
    setShowCursor(false);
    setIsPlaying(false);
    removeHighlights();

    let cancelled = false;
    waitForElement(currentStepData.targetElement).then((element) => {
      if (cancelled || runIdRef.current !== runId) return;

      if (!element) {
        setTargetMissing(true);
        return;
      }

      element.classList.add('tutorial-highlight');
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!playAnimation || reduceMotion) return;

      setCurrentTarget(currentStepData.targetElement);
      setShowCursor(true);
      setIsPlaying(true);
    });

    return () => {
      cancelled = true;
      removeHighlights();
    };
  }, [currentStepData.targetElement, definition, playAnimation, tutorialActive]);

  useEffect(() => {
    if (!tutorialActive || !currentPath) return;

    persistProgress(currentPath, {
      status: 'in_progress',
      currentStep,
    });
  }, [currentPath, currentStep, persistProgress, tutorialActive]);

  const handleAnimationComplete = useCallback(() => {
    setShowCursor(false);
    setIsPlaying(false);
  }, []);

  const skipDemo = useCallback(() => {
    setShowCursor(false);
    setIsPlaying(false);
  }, []);

  const completeTutorial = useCallback(() => {
    if (currentPath) {
      persistProgress(currentPath, {
        status: 'completed',
        currentStep: Math.max(steps.length - 1, 0),
        completedAt: new Date().toISOString(),
      });
    }

    stopPlayback();
    setTutorialActive(false);
  }, [currentPath, persistProgress, steps.length, stopPlayback]);

  const skipTutorial = useCallback(() => {
    if (currentPath) {
      persistProgress(currentPath, {
        status: 'skipped',
        currentStep,
      });
    }

    stopPlayback();
    setTutorialActive(false);
  }, [currentPath, currentStep, persistProgress, stopPlayback]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      stopPlayback();
      setCurrentStep((previousStep) => previousStep + 1);
      return;
    }

    completeTutorial();
  }, [completeTutorial, currentStep, steps.length, stopPlayback]);

  const handlePrev = useCallback(() => {
    if (currentStep === 0) return;
    stopPlayback();
    setCurrentStep((previousStep) => previousStep - 1);
  }, [currentStep, stopPlayback]);

  const resetTutorials = useCallback(() => {
    stopPlayback();
    resetTutorialProgress(storageScope, tutorialDefinitions);
    setTutorialActive(false);
    setCurrentPath(null);
    setCurrentStep(0);
  }, [storageScope, stopPlayback]);

  useEffect(() => {
    window.tutorialAssistant = {
      start: startTutorial,
      showWelcome: showWelcomeDialog,
      reset: resetTutorials,
    };

    return () => {
      delete window.tutorialAssistant;
      stopPlayback();
    };
  }, [resetTutorials, showWelcomeDialog, startTutorial, stopPlayback]);

  useEffect(() => {
    if (!tutorialActive) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') skipTutorial();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [skipTutorial, tutorialActive]);

  return (
    <>
      {showWelcome && (
        <WelcomeDialog
          onClose={() => setShowWelcome(false)}
          onSelectPath={startTutorial}
        />
      )}

      {tutorialActive && definition && (
        <>
          <DemoOverlay
            isActive={isPlaying}
            message={currentStepData.description || '正在演示操作...'}
            onComplete={skipDemo}
          />

          {showCursor && currentTarget && (
            <AnimatedCursor
              key={`${currentPath}-${currentStep}`}
              targetElement={currentTarget}
              onAnimationComplete={handleAnimationComplete}
            />
          )}

          <FloatingWindow
            steps={steps}
            currentStep={currentStep}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={skipTutorial}
            isPlaying={isPlaying}
            targetMissing={targetMissing}
          />
        </>
      )}
    </>
  );
}
