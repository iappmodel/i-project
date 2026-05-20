import { useStudioController } from "./studioStore";
import "./studio.css";
import { StudioShell } from "./components/StudioShell";
import { RuntimeFeedProvider } from "./feed/RuntimeFeedContext";

export type StudioScreenProps = {
  onBack?: () => void;
};

/**
 * Stage 1 Studio route: mock project, reducer-driven UI, no Magic layer.
 */
export function StudioScreen({ onBack }: StudioScreenProps) {
  const studio = useStudioController();
  return (
    <div className="ist-root ist-studio-app">
      <RuntimeFeedProvider>
        <StudioShell studio={studio} onBack={onBack} />
      </RuntimeFeedProvider>
    </div>
  );
}
