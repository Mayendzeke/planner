import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

type ViewerErrorBoundaryProps = { children: ReactNode; onRetry: () => void };
type ViewerErrorBoundaryState = { hasError: boolean };

class ViewerErrorBoundary extends Component<ViewerErrorBoundaryProps, ViewerErrorBoundaryState> {
  state: ViewerErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ViewerErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("StudySpace PowerPoint preview could not render this file.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="library-viewer-unsupported" role="alert">
          <strong>This presentation could not be rendered here.</strong>
          <p>The file may contain damaged or unsupported content. Your original is still available from the Download button.</p>
          <button type="button" className="primary-button" onClick={this.props.onRetry}>Retry preview</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PowerPointDocumentViewer({ file }: { file: Blob }) {
  const [retryKey, setRetryKey] = useState(0);
  const [hasDegradedSlides, setHasDegradedSlides] = useState(false);

  return (
    <div className="library-powerpoint-viewer" aria-label="PowerPoint presentation viewer">
      <div className="library-preview-note">
        <span aria-hidden="true">▣</span>
        <span>Use the slide thumbnails, navigation, search and zoom tools to explore your presentation. Choose Landscape full screen for a larger reading canvas.</span>
      </div>
      {hasDegradedSlides && (
        <div className="library-powerpoint-warning" role="status">
          Some advanced effects or embedded objects may look different in a browser. The original PowerPoint remains available to download.
        </div>
      )}
      <div className="library-powerpoint-viewer-stage">
        <ViewerErrorBoundary key={retryKey} onRetry={() => { setHasDegradedSlides(false); setRetryKey(value => value + 1); }}>
          <ReactPptxViewer
            source={file}
            mode="continuous"
            defaultZoom="fit-page"
            showThumbnails
            showToolbar
            onWarning={(warning) => {
              if (warning.code === "degraded-rendering") setHasDegradedSlides(true);
            }}
          />
        </ViewerErrorBoundary>
      </div>
    </div>
  );
}
